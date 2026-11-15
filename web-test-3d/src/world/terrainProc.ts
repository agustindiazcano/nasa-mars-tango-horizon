import {
  BASE_ORIGIN,
  CURIOSITY_TRAVERSE as SHARED_CURIOSITY_TRAVERSE,
  FISSION_COORD,
  MISSION_SITES,
  MISSION_SITES_BY_ID,
} from "@th/shared";
import * as THREE from "three";
import { TerrainLoader } from "./terrainLoader";
import { mulberry32, terrainFromThermalClass, type RouteGrid } from "../core/physics";
import type { LayerId } from "../core/types";
import {
  DEFAULT_HYDRATION_META,
  decodeHydrationByte,
  decodeHydrationUncByte,
  decodeSlopeByte,
  decodeSvfByte,
  decodeThermalClassByte,
  fetchGrayscalePng,
  fillLayerRgba,
  hydrationRgb,
  parseHydrationMeta,
  parseHydrationSites,
  type DanMeasurement,
  type HydrationMeta,
  type HydrationSitesData,
  type LayerRenderInput,
  type RenderLayerId,
} from "./terrainRasters";

export interface TerrainMeta {
  product_id: string;
  size_m: number;
  height_px: number;
  z_min_m: number;
  z_max_m: number;
  center_lon_e: number;
  center_lat: number;
  slope_max_deg?: number;
}

export interface ScienceStation {
  id: string;
  name: string;
  x: number;
  z: number;
  hydrationIndex: number;
}

export const SCIENCE_STATIONS: ScienceStation[] = MISSION_SITES.map((s) => ({
  id: s.id,
  name: s.name,
  x: s.x,
  z: s.z,
  hydrationIndex: s.weh,
}));

export const CURIOSITY_TRAVERSE: { x: number; z: number; sol: number }[] = SHARED_CURIOSITY_TRAVERSE.map((p) => ({
  x: p.x,
  z: p.z,
  sol: p.sol,
}));

export class TerrainProc {
  readonly sizeM = 4000;
  readonly gridN = 256;
  readonly mesh: THREE.Mesh;
  readonly markersGroup = new THREE.Group();
  meta: TerrainMeta = {
    product_id: "PROC_GALE_BOXWORK_256 (Fallback)",
    size_m: 4000,
    height_px: 256,
    z_min_m: -42,
    z_max_m: 118,
    center_lon_e: 137.4,
    center_lat: -4.745,
    slope_max_deg: 45,
  };

  realRastersLoaded = false;
  realOpticalLoaded = false;
  hydrationUncMode = false;
  hydrationMeta: HydrationMeta = { ...DEFAULT_HYDRATION_META };
  hydrationSites: HydrationSitesData | null = null;
  danPoints: DanMeasurement[] = [];

  private h = new Float32Array(256 * 256);
  private layerN = 256;
  private slopeField = new Float32Array(256 * 256);
  private svfField = new Float32Array(256 * 256);
  private thermalField = new Uint8Array(256 * 256);
  private hydrationField = new Float32Array(256 * 256);
  private hydrationUncField = new Float32Array(256 * 256);
  private textures: Record<LayerId, THREE.DataTexture>;
  private hydrationUncTexture: THREE.DataTexture;
  private realOptical: THREE.Texture | null = null;
  private activeLayer: LayerId = "optical";
  private material: THREE.MeshStandardMaterial;
  private routeLine: THREE.Line | null = null;
  private beaconsGroup = new THREE.Group();
  private sceneRef: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.sceneRef = scene;
    this.generateProceduralFields();

    const geo = new THREE.PlaneGeometry(this.sizeM, this.sizeM, this.gridN - 1, this.gridN - 1);
    geo.rotateX(-Math.PI / 2);
    this.applyHeightsToGeometry(geo);

    this.textures = {
      optical: this.buildLayerTexture("optical"),
      slope: this.buildLayerTexture("slope"),
      thermal: this.buildLayerTexture("thermal"),
      radiation: this.buildLayerTexture("radiation"),
      hydration: this.buildLayerTexture("hydration"),
    };
    this.hydrationUncTexture = this.buildLayerTexture("hydration_unc");

    this.material = new THREE.MeshStandardMaterial({
      map: this.textures.optical,
      roughness: 0.94,
      metalness: 0.04,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.buildMarkers();
    scene.add(this.markersGroup);
  }

  readonly loader = new TerrainLoader();
  private committed = false;
  get loadError(): string {
    return this.loader.error;
  }

  async tryLoadRealDem(base = "/data/terrain", report?: (message: string) => void): Promise<boolean> {
    const asset = await this.loader.load(base, report);
    if (!asset) return false;
    if (this.committed) return true;
    const { meta, raw } = asset;
    const srcN = meta.height_px;
    const mid = (meta.z_min_m + meta.z_max_m) / 2;
    const span = meta.z_max_m - meta.z_min_m;
    const n = this.gridN;
    for (let j = 0; j < n; j++) {
      const sj = Math.min(srcN - 1, Math.round((j / (n - 1)) * (srcN - 1)));
      for (let i = 0; i < n; i++) {
        const si = Math.min(srcN - 1, Math.round((i / (n - 1)) * (srcN - 1)));
        const val = meta.z_min_m + (raw[sj * srcN + si] / 65535) * span - mid;
        this.h[j * n + i] = val;
      }
    }
    this.meta = { ...meta, height_px: n, product_id: `${meta.product_id} (256-sampled)` };
    if (!this.realRastersLoaded) {
      this.recomputeDerivedFields();
      this.refreshTextures();
    }
    this.applyHeightsToGeometry(this.mesh.geometry);
    this.clearMarkersGroup();
    this.buildMarkers();
    this.committed = true;
    return true;
  }

  async loadOptical(base = "/data/terrain"): Promise<void> {
    const signal = AbortSignal.any([
      this.loader.signal ?? new AbortController().signal,
      AbortSignal.timeout(60000),
    ]);
    const response = await fetch(`${base}/ortho_4096.webp`, { signal });
    if (!response.ok) throw new Error(`Orthoimage HTTP ${response.status}`);
    const url = URL.createObjectURL(await response.blob());
    try {
      this.realOptical = await new THREE.TextureLoader().loadAsync(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    signal.throwIfAborted();
    this.realOptical.colorSpace = THREE.SRGBColorSpace;
    this.realOpticalLoaded = true;
    // PlaneGeometry rotated -90 degrees maps north (negative z) to v=1.
    this.setLayer(this.activeLayer);
  }

  /** Loads static 1024x1024 scientific rasters, hydration metadata, and in-scene DAN stations. */
  async loadRealRasters(base = "/data/terrain"): Promise<{ rastersOk: boolean; danCount: number }> {
    const signal = AbortSignal.any([
      this.loader.signal ?? new AbortController().signal,
      AbortSignal.timeout(60000),
    ]);

    const fetchJson = async (name: string): Promise<unknown> => {
      const res = await fetch(`${base}/${name}`, { signal });
      if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
      return res.json();
    };

    const [slopeRes, svfRes, thermalRes, hydRes, hydUncRes, hydMetaRes, sitesRes] =
      await Promise.allSettled([
        fetchGrayscalePng(`${base}/slope_1024.png`, signal),
        fetchGrayscalePng(`${base}/svf_1024.png`, signal),
        fetchGrayscalePng(`${base}/thermal_class.png`, signal),
        fetchGrayscalePng(`${base}/hydration_1024.png`, signal),
        fetchGrayscalePng(`${base}/hydration_unc_1024.png`, signal),
        fetchJson("hydration_meta.json"),
        fetchJson("hydration_sites.json"),
      ]);

    let rastersOk = false;
    if (
      slopeRes.status === "fulfilled" &&
      svfRes.status === "fulfilled" &&
      thermalRes.status === "fulfilled" &&
      hydRes.status === "fulfilled" &&
      hydUncRes.status === "fulfilled" &&
      hydMetaRes.status === "fulfilled"
    ) {
      const slopePng = slopeRes.value;
      const svfPng = svfRes.value;
      const thermalPng = thermalRes.value;
      const hydPng = hydRes.value;
      const hydUncPng = hydUncRes.value;
      const n = slopePng.width;
      const sameDim = [slopePng, svfPng, thermalPng, hydPng, hydUncPng].every(
        (r) => r.width === n && r.height === n,
      );
      if (sameDim && n >= 2) {
        const hydMeta = parseHydrationMeta(hydMetaRes.value);
        const slopeMax = this.meta.slope_max_deg ?? 45;
        const count = n * n;
        const nextSlope = new Float32Array(count);
        const nextSvf = new Float32Array(count);
        const nextThermal = new Uint8Array(count);
        const nextHyd = new Float32Array(count);
        const nextHydUnc = new Float32Array(count);

        for (let i = 0; i < count; i++) {
          nextSlope[i] = decodeSlopeByte(slopePng.data[i], slopeMax);
          nextSvf[i] = decodeSvfByte(svfPng.data[i]);
          nextThermal[i] = decodeThermalClassByte(thermalPng.data[i]);
          nextHyd[i] = decodeHydrationByte(hydPng.data[i], hydMeta);
          nextHydUnc[i] = decodeHydrationUncByte(hydUncPng.data[i], hydMeta);
        }

        this.layerN = n;
        this.slopeField = nextSlope;
        this.svfField = nextSvf;
        this.thermalField = nextThermal;
        this.hydrationField = nextHyd;
        this.hydrationUncField = nextHydUnc;
        this.hydrationMeta = hydMeta;
        this.realRastersLoaded = true;
        this.rebuildLayerTextures();
        this.setLayer(this.activeLayer);
        rastersOk = true;
      }
    }

    let danCount = 0;
    if (sitesRes.status === "fulfilled") {
      try {
        const parsed = parseHydrationSites(sitesRes.value);
        this.hydrationSites = parsed;
        this.danPoints = parsed.dan_in_scene;
        danCount = this.danPoints.length;
        this.clearMarkersGroup();
        this.buildMarkers();
      } catch {
        // Keep existing markers if hydration_sites.json fails validation
      }
    }

    return { rastersOk, danCount };
  }

  getOpticalImage(): CanvasImageSource | null {
    return (this.realOptical?.image as CanvasImageSource | undefined) ?? null;
  }

  setHydrationUncMode(enabled: boolean): void {
    this.hydrationUncMode = enabled;
    if (this.activeLayer === "hydration") {
      this.setLayer("hydration");
    }
  }

  setLayer(layer: LayerId): void {
    this.activeLayer = layer;
    this.material.map =
      layer === "optical" && this.realOptical ? this.realOptical : this.getLayerTexture(layer);
    this.material.needsUpdate = true;
  }

  getLayerTexture(layer: LayerId): THREE.DataTexture {
    if (layer === "hydration" && this.hydrationUncMode) {
      return this.hydrationUncTexture;
    }
    return this.textures[layer];
  }

  heightAt(x: number, z: number): number {
    return this.sampleField(this.h, this.gridN, x, z);
  }

  slopeAt(x: number, z: number, d = 4): number {
    if (this.realRastersLoaded) {
      return this.sampleField(this.slopeField, this.layerN, x, z);
    }
    const gx = (this.heightAt(x + d, z) - this.heightAt(x - d, z)) / (2 * d);
    const gz = (this.heightAt(x, z + d) - this.heightAt(x, z - d)) / (2 * d);
    return THREE.MathUtils.radToDeg(Math.atan(Math.hypot(gx, gz)));
  }

  svfAt(x: number, z: number): number {
    return this.sampleField(this.svfField, this.layerN, x, z);
  }

  thermalClassAt(x: number, z: number): 0 | 1 | 2 {
    const n = this.layerN;
    const i = THREE.MathUtils.clamp(Math.round((x / this.sizeM + 0.5) * (n - 1)), 0, n - 1);
    const j = THREE.MathUtils.clamp(Math.round((z / this.sizeM + 0.5) * (n - 1)), 0, n - 1);
    return (this.thermalField[j * n + i] as 0 | 1 | 2) ?? 1;
  }

  hydrationAt(x: number, z: number): number {
    return this.sampleField(this.hydrationField, this.layerN, x, z);
  }

  hydrationUncAt(x: number, z: number): number {
    return this.sampleField(this.hydrationUncField, this.layerN, x, z);
  }

  toLonLat(x: number, z: number): { lon: number; lat: number } {
    const mPerDeg = (Math.PI / 180) * 3396190;
    const lat = this.meta.center_lat - z / mPerDeg;
    const lon =
      this.meta.center_lon_e + x / (mPerDeg * Math.cos(THREE.MathUtils.degToRad(this.meta.center_lat)));
    return { lon, lat };
  }

  worldToCell(x: number, z: number): number {
    const n = this.gridN;
    const i = THREE.MathUtils.clamp(Math.round((x / this.sizeM + 0.5) * (n - 1)), 0, n - 1);
    const j = THREE.MathUtils.clamp(Math.round((z / this.sizeM + 0.5) * (n - 1)), 0, n - 1);
    return j * n + i;
  }

  cellToWorld(idx: number): { x: number; z: number } {
    const n = this.gridN;
    const i = idx % n;
    const j = (idx / n) | 0;
    return {
      x: (i / (n - 1) - 0.5) * this.sizeM,
      z: (j / (n - 1) - 0.5) * this.sizeM,
    };
  }

  buildRouteGrid(): RouteGrid {
    const n = this.gridN;
    const ln = this.layerN;
    const terrain = new Float32Array(n * n);
    const doseRel = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      const lj = Math.min(ln - 1, Math.round((j / (n - 1)) * (ln - 1)));
      for (let i = 0; i < n; i++) {
        const li = Math.min(ln - 1, Math.round((i / (n - 1)) * (ln - 1)));
        const k = j * n + i;
        const lk = lj * ln + li;
        terrain[k] = terrainFromThermalClass((this.thermalField[lk] as 0 | 1 | 2) ?? 1);
        doseRel[k] = this.svfField[lk];
      }
    }
    return {
      n,
      cellM: this.sizeM / (n - 1),
      z: this.h,
      terrain,
      doseRel,
    };
  }

  setRoute(points: { x: number; z: number }[]): void {
    if (this.routeLine) {
      this.sceneRef.remove(this.routeLine);
      this.routeLine.geometry.dispose();
      this.routeLine = null;
    }
    if (points.length < 2) return;
    const vecs = points.map((p) => new THREE.Vector3(p.x, this.heightAt(p.x, p.z) + 0.65, p.z));
    const geo = new THREE.BufferGeometry().setFromPoints(vecs);
    const mat = new THREE.LineBasicMaterial({ color: 0x35e0ff });
    this.routeLine = new THREE.Line(geo, mat);
    this.sceneRef.add(this.routeLine);
  }

  setBeacons(beacons: { id: string; x: number; z: number }[]): void {
    this.sceneRef.remove(this.beaconsGroup);
    this.beaconsGroup = new THREE.Group();
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      const y = this.heightAt(b.x, b.z);
      const puck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: 0x1b2430, emissive: 0x00e5ff, emissiveIntensity: 0.9 }),
      );
      puck.position.set(b.x, y + 0.15, b.z);
      this.beaconsGroup.add(puck);

      // Vertical solid-state 505 nm cyan / 615 nm red-orange laser-LED beam (no flame)
      const beamColor = i % 2 === 0 ? 0x00f0ff : 0xff5e2b;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.28, 16, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: beamColor,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        }),
      );
      beam.position.set(b.x, y + 8, b.z);
      this.beaconsGroup.add(beam);

      // UWB 6.5 GHz ground ranging ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.1, 24),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(b.x, y + 0.08, b.z);
      this.beaconsGroup.add(ring);
    }
    this.sceneRef.add(this.beaconsGroup);
  }

  private sampleField(arr: Float32Array, n: number, x: number, z: number): number {
    const u = THREE.MathUtils.clamp((x / this.sizeM + 0.5) * (n - 1), 0, n - 1.001);
    const v = THREE.MathUtils.clamp((z / this.sizeM + 0.5) * (n - 1), 0, n - 1.001);
    const i = u | 0;
    const j = v | 0;
    const fu = u - i;
    const fv = v - j;
    const k = j * n + i;
    return (
      (arr[k] * (1 - fu) + arr[k + 1] * fu) * (1 - fv) +
      (arr[k + n] * (1 - fu) + arr[k + n + 1] * fu) * fv
    );
  }

  private generateProceduralFields(): void {
    const n = this.gridN;
    const rnd = mulberry32(4207);
    const phaseA = rnd() * 6.28;
    const phaseB = rnd() * 6.28;

    for (let j = 0; j < n; j++) {
      const z = (j / (n - 1) - 0.5) * this.sizeM;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * this.sizeM;
        const rCenter = Math.hypot(x - BASE_ORIGIN.x, z - BASE_ORIGIN.z);

        const broadSlope = x * 0.009 + z * 0.011 + Math.max(0, (rCenter - 950) * 0.045);
        const bx1 = Math.abs(Math.sin(x * 0.012 + z * 0.008 + phaseA));
        const bx2 = Math.abs(Math.sin(x * -0.007 + z * 0.013 + phaseB));
        const boxwork =
          (1 - Math.min(bx1, 0.55) / 0.55) * 6.5 + (1 - Math.min(bx2, 0.5) / 0.5) * 4.8;

        const crater1 = -16 * Math.exp(-((x + 280) ** 2 + (z - 230) ** 2) / 135 ** 2);
        const crater2 = -11 * Math.exp(-((x - 360) ** 2 + (z + 290) ** 2) / 95 ** 2);
        const ridgeHill = 28 * Math.exp(-((x - 210) ** 2 + (z - 150) ** 2) / 150 ** 2);
        const micro = Math.sin(x * 0.075) * Math.cos(z * 0.075) * 0.8 + (rnd() - 0.5) * 0.35;

        let elev = broadSlope + boxwork + crater1 + crater2 + ridgeHill + micro;

        // Flatten a safe <3 deg engineering pad around BASE_ORIGIN radius 110 m
        const padBlend = THREE.MathUtils.smoothstep(rCenter, 80, 170);
        elev = elev * padBlend + 1.2 * (1 - padBlend);

        // Keep fission reactor pad at FISSION_COORD walkable as well
        const rFission = Math.hypot(x - FISSION_COORD.x, z - FISSION_COORD.z);
        const fisBlend = THREE.MathUtils.smoothstep(rFission, 18, 45);
        elev = elev * fisBlend + 3.0 * (1 - fisBlend);

        this.h[j * n + i] = elev;
      }
    }
    this.recomputeDerivedFields();
  }

  private recomputeDerivedFields(): void {
    const n = this.gridN;
    this.layerN = n;
    this.slopeField = new Float32Array(n * n);
    this.svfField = new Float32Array(n * n);
    this.thermalField = new Uint8Array(n * n);
    this.hydrationField = new Float32Array(n * n);
    this.hydrationUncField = new Float32Array(n * n);

    const cellM = this.sizeM / (n - 1);
    for (let j = 0; j < n; j++) {
      const z = (j / (n - 1) - 0.5) * this.sizeM;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * this.sizeM;
        const idx = j * n + i;
        const l = this.h[j * n + Math.max(0, i - 1)];
        const r = this.h[j * n + Math.min(n - 1, i + 1)];
        const u = this.h[Math.max(0, j - 1) * n + i];
        const d = this.h[Math.min(n - 1, j + 1) * n + i];
        const slopeDeg = THREE.MathUtils.radToDeg(
          Math.atan(Math.hypot((r - l) / (2 * cellM), (d - u) / (2 * cellM))),
        );
        this.slopeField[idx] = slopeDeg;

        const meanNb = (l + r + u + d) * 0.25;
        const convexity = this.h[idx] - meanNb;
        this.svfField[idx] = THREE.MathUtils.clamp(
          0.88 - Math.max(0, -convexity) * 0.14 - slopeDeg * 0.008,
          0.42,
          0.99,
        );

        if (slopeDeg > 11 || convexity > 0.12) this.thermalField[idx] = 2;
        else if (slopeDeg > 4) this.thermalField[idx] = 1;
        else this.thermalField[idx] = 0;

        // Procedural fallback hydration index (dimensionless) peaks in boxwork troughs and near S2/S3
        const s2 = MISSION_SITES_BY_ID.S2;
        const s3 = MISSION_SITES_BY_ID.S3;
        const s2Boost = 5.5 * Math.exp(-((x - s2.x) ** 2 + (z - s2.z) ** 2) / (90 ** 2));
        const s3Boost = 7.2 * Math.exp(-((x - s3.x) ** 2 + (z - s3.z) ** 2) / (105 ** 2));
        const trough = Math.max(0, -convexity) * 4.0;
        this.hydrationField[idx] = THREE.MathUtils.clamp(1.2 + trough + s2Boost + s3Boost, 0.5, 11.0);
        this.hydrationUncField[idx] = THREE.MathUtils.clamp(0.45 + 0.025 * slopeDeg, 0.35, 1.8);
      }
    }
  }

  private applyHeightsToGeometry(geo: THREE.BufferGeometry): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const n = this.gridN;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        pos.setY(j * n + i, this.h[j * n + i]);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  private getRenderInput(): LayerRenderInput {
    return {
      n: this.layerN,
      slopeDeg: this.slopeField,
      svf: this.svfField,
      thermal: this.thermalField,
      hydration: this.hydrationField,
      hydrationUnc: this.hydrationUncField,
      hydrationMin: this.hydrationMeta.weh_min,
      hydrationMax: this.hydrationMeta.weh_max,
      hydrationUncMax: this.hydrationMeta.interval_width_max,
      heightM: this.h,
      heightGridN: this.gridN,
      realRasters: this.realRastersLoaded,
    };
  }

  private buildLayerTexture(layer: RenderLayerId): THREE.DataTexture {
    const n = this.layerN;
    const data = new Uint8Array(n * n * 4);
    fillLayerRgba(layer, this.getRenderInput(), data);
    const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    // PlaneGeometry rotated -90 deg maps north (row 0, z=-sizeM/2) to uv.y=1.
    tex.flipY = true;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  private rebuildLayerTextures(): void {
    for (const layer of ["optical", "slope", "thermal", "radiation", "hydration"] as LayerId[]) {
      this.textures[layer].dispose();
      this.textures[layer] = this.buildLayerTexture(layer);
    }
    this.hydrationUncTexture.dispose();
    this.hydrationUncTexture = this.buildLayerTexture("hydration_unc");
  }

  private refreshTextures(): void {
    const input = this.getRenderInput();
    for (const layer of ["optical", "slope", "thermal", "radiation", "hydration"] as LayerId[]) {
      const tex = this.textures[layer];
      fillLayerRgba(layer, input, tex.image.data as Uint8Array);
      tex.needsUpdate = true;
    }
    fillLayerRgba("hydration_unc", input, this.hydrationUncTexture.image.data as Uint8Array);
    this.hydrationUncTexture.needsUpdate = true;
  }

  private clearMarkersGroup(): void {
    this.markersGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m?.dispose();
      }
    });
    this.markersGroup.clear();
  }

  private buildMarkers(): void {
    for (const st of SCIENCE_STATIONS) {
      const y = this.heightAt(st.x, st.z);
      const g = new THREE.Group();
      g.position.set(st.x, y, st.z);
      g.name = `station:${st.id}`;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x35e0ff, emissive: 0x0b4858 }),
      );
      pole.position.y = 2.25;
      g.add(pole);

      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.75, 0),
        new THREE.MeshStandardMaterial({ color: 0x35e0ff, emissive: 0x168ca8 }),
      );
      diamond.position.y = 5.0;
      g.add(diamond);

      const label = makeSpriteLabel(`${st.id}: ${st.name}`, "#35e0ff");
      label.position.y = 6.6;
      g.add(label);
      this.markersGroup.add(g);
    }

    const pts = CURIOSITY_TRAVERSE.map(
      (w) => new THREE.Vector3(w.x, this.heightAt(w.x, w.z) + 0.45, w.z),
    );
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineDashedMaterial({ color: 0xffb800, dashSize: 6, gapSize: 4 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    this.markersGroup.add(line);

    // Real MSL DAN passive neutron measurement stations inside the 4x4 km scene (377 points)
    if (this.danPoints.length > 0) {
      const count = this.danPoints.length;
      const discGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.45, 14);
      const discMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      const discMesh = new THREE.InstancedMesh(discGeo, discMat, count);
      discMesh.name = "dan-stations-fill";

      const ringGeo = new THREE.RingGeometry(3.4, 4.9, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xe6faff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, count);
      ringMesh.name = "dan-stations-ring";

      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const minIdx = this.hydrationMeta.weh_min;
      const maxIdx = this.hydrationMeta.weh_max;

      for (let i = 0; i < count; i++) {
        const d = this.danPoints[i];
        const y = this.heightAt(d.x, d.z);
        dummy.position.set(d.x, y + 0.35, d.z);
        dummy.updateMatrix();
        discMesh.setMatrixAt(i, dummy.matrix);

        const [r, g, b] = hydrationRgb(d.hydration_index, minIdx, maxIdx);
        color.setRGB(r / 255, g / 255, b / 255);
        discMesh.setColorAt(i, color);

        dummy.position.set(d.x, y + 0.6, d.z);
        dummy.updateMatrix();
        ringMesh.setMatrixAt(i, dummy.matrix);
      }

      discMesh.instanceMatrix.needsUpdate = true;
      if (discMesh.instanceColor) discMesh.instanceColor.needsUpdate = true;
      ringMesh.instanceMatrix.needsUpdate = true;
      this.markersGroup.add(discMesh);
      this.markersGroup.add(ringMesh);
    }
  }
}

export function makeSpriteLabel(text: string, color = "#35e0ff"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(6, 14, 24, 0.78)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 80, 14);
  ctx.fill();
  ctx.stroke();
  ctx.font = "bold 30px ui-monospace, Consolas, monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 49);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(9.5, 1.8, 1);
  return sprite;
}
