import * as THREE from "three";
import { validateTerrain } from "./terrainValidation";
import { mulberry32, terrainFromThermalClass, type RouteGrid } from "../core/physics";
import type { LayerId } from "../core/types";

export interface TerrainMeta {
  product_id: string;
  size_m: number;
  height_px: number;
  z_min_m: number;
  z_max_m: number;
  center_lon_e: number;
  center_lat: number;
}

export interface ScienceStation {
  id: string;
  name: string;
  x: number;
  z: number;
  hydrationPct: number;
}

export const SCIENCE_STATIONS: ScienceStation[] = [
  { id: "S1", name: "Bradbury Regolith", x: 110, z: -70, hydrationPct: 2.1 },
  { id: "S2", name: "Boxwork Ridge Alpha", x: 180, z: 120, hydrationPct: 6.8 },
  { id: "S3", name: "Sulfate Vein Trough", x: -165, z: 145, hydrationPct: 8.4 },
  { id: "S4", name: "Aeolis Mons Foothill", x: 290, z: -210, hydrationPct: 4.5 },
];

export const CURIOSITY_TRAVERSE: { x: number; z: number; sol: number }[] = [
  { x: -320, z: -260, sol: 120 },
  { x: -210, z: -150, sol: 680 },
  { x: -110, z: -40, sol: 1450 },
  { x: 45, z: 65, sol: 2450 },
  { x: 180, z: 120, sol: 3580 },
  { x: 310, z: 220, sol: 4120 },
];

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
    center_lon_e: 137.4417,
    center_lat: -4.5895,
  };

  private h = new Float32Array(256 * 256);
  private svf = new Float32Array(256 * 256);
  private thermal = new Uint8Array(256 * 256);
  private hydration = new Float32Array(256 * 256);
  private textures: Record<LayerId, THREE.DataTexture>;
  private realOptical: THREE.Texture | null = null;
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

  loadError = "";

  /** Each asset has a 60 s deadline. Startup retries three times, then requires manual retry. */
  async tryLoadRealDem(base = "/data/terrain"): Promise<boolean> {
    try {
      const metaRes = await fetch(`${base}/meta.json`, { signal: AbortSignal.timeout(60000) });
      if (!metaRes.ok) throw new Error(`Metadata HTTP ${metaRes.status}`);
      const meta = (await metaRes.json()) as TerrainMeta;
      validateTerrain(meta, this.sizeM);
      const u16Res = await fetch(`${base}/height_2048.u16`, { signal: AbortSignal.timeout(60000) });
      if (!u16Res.ok) throw new Error(`Height HTTP ${u16Res.status}`);
      const raw = new Uint16Array(await u16Res.arrayBuffer());
      const srcN = meta.height_px;
      if (raw.length !== srcN * srcN) throw new Error("Incorrect DEM byte length");
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
      this.recomputeDerivedFields();
      this.applyHeightsToGeometry(this.mesh.geometry);
      this.refreshTextures();
      this.markersGroup.clear();
      this.buildMarkers();
      return true;
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  async loadOptical(): Promise<void> {
    const response = await fetch("/data/terrain/ortho_4096.webp", { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Orthoimage HTTP ${response.status}`);
    const url = URL.createObjectURL(await response.blob());
    try { this.realOptical = await new THREE.TextureLoader().loadAsync(url); }
    finally { URL.revokeObjectURL(url); }
    this.realOptical.colorSpace = THREE.SRGBColorSpace;
    // PlaneGeometry rotated -90 degrees maps north (negative z) to v=1.
    this.setLayer("optical");
  }

  setLayer(layer: LayerId): void {
    this.material.map = layer === "optical" && this.realOptical ? this.realOptical : this.textures[layer];
    this.material.needsUpdate = true;
  }

  getLayerTexture(layer: LayerId): THREE.DataTexture {
    return this.textures[layer];
  }

  heightAt(x: number, z: number): number {
    const n = this.gridN;
    const u = THREE.MathUtils.clamp((x / this.sizeM + 0.5) * (n - 1), 0, n - 1.001);
    const v = THREE.MathUtils.clamp((z / this.sizeM + 0.5) * (n - 1), 0, n - 1.001);
    const i = u | 0;
    const j = v | 0;
    const fu = u - i;
    const fv = v - j;
    const k = j * n + i;
    return (
      (this.h[k] * (1 - fu) + this.h[k + 1] * fu) * (1 - fv) +
      (this.h[k + n] * (1 - fu) + this.h[k + n + 1] * fu) * fv
    );
  }

  slopeAt(x: number, z: number, d = 4): number {
    const gx = (this.heightAt(x + d, z) - this.heightAt(x - d, z)) / (2 * d);
    const gz = (this.heightAt(x, z + d) - this.heightAt(x, z - d)) / (2 * d);
    return THREE.MathUtils.radToDeg(Math.atan(Math.hypot(gx, gz)));
  }

  svfAt(x: number, z: number): number {
    return this.sampleField(this.svf, x, z);
  }

  thermalClassAt(x: number, z: number): 0 | 1 | 2 {
    const n = this.gridN;
    const i = THREE.MathUtils.clamp(Math.round((x / this.sizeM + 0.5) * (n - 1)), 0, n - 1);
    const j = THREE.MathUtils.clamp(Math.round((z / this.sizeM + 0.5) * (n - 1)), 0, n - 1);
    return (this.thermal[j * n + i] as 0 | 1 | 2) ?? 1;
  }

  hydrationAt(x: number, z: number): number {
    return this.sampleField(this.hydration, x, z);
  }

  toLonLat(x: number, z: number): { lon: number; lat: number } {
    const mPerDeg = (Math.PI / 180) * 3396190;
    const lat = this.meta.center_lat - z / mPerDeg;
    const lon = this.meta.center_lon_e + x / (mPerDeg * Math.cos(THREE.MathUtils.degToRad(this.meta.center_lat)));
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
    const terrain = new Float32Array(n * n);
    for (let k = 0; k < n * n; k++) {
      terrain[k] = terrainFromThermalClass((this.thermal[k] as 0 | 1 | 2) ?? 1);
    }
    return {
      n,
      cellM: this.sizeM / (n - 1),
      z: this.h,
      terrain,
      doseRel: this.svf,
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

  private sampleField(arr: Float32Array, x: number, z: number): number {
    const n = this.gridN;
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
    const cellM = this.sizeM / (n - 1);

    // Precompute deterministic ridge angles for boxwork geology.
    const phaseA = rnd() * 6.28;
    const phaseB = rnd() * 6.28;

    for (let j = 0; j < n; j++) {
      const z = (j / (n - 1) - 0.5) * this.sizeM;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * this.sizeM;
        const rCenter = Math.hypot(x, z);

        // Gently rolling Gale floor + Mount Sharp foothill rise toward SE + crater rim far out
        const broadSlope = (x * 0.009 + z * 0.011) + Math.max(0, (rCenter - 950) * 0.045);
        // Boxwork intersecting ridges (sharp mineralized fractures)
        const bx1 = Math.abs(Math.sin(x * 0.012 + z * 0.008 + phaseA));
        const bx2 = Math.abs(Math.sin(x * -0.007 + z * 0.013 + phaseB));
        const boxwork = (1 - Math.min(bx1, 0.55) / 0.55) * 6.5 + (1 - Math.min(bx2, 0.5) / 0.5) * 4.8;

        // Crater depressions
        const crater1 = -16 * Math.exp(-((x + 280) ** 2 + (z - 230) ** 2) / (135 ** 2));
        const crater2 = -11 * Math.exp(-((x - 360) ** 2 + (z + 290) ** 2) / (95 ** 2));
        const ridgeHill = 28 * Math.exp(-((x - 210) ** 2 + (z - 150) ** 2) / (150 ** 2));
        const micro = Math.sin(x * 0.075) * Math.cos(z * 0.075) * 0.8 + (rnd() - 0.5) * 0.35;

        let elev = broadSlope + boxwork + crater1 + crater2 + ridgeHill + micro;

        // Flatten a safe <3 deg engineering pad around the base origin (0,0) radius 110 m
        const padBlend = THREE.MathUtils.smoothstep(rCenter, 80, 170);
        elev = elev * padBlend + 1.2 * (1 - padBlend);

        // Keep fission reactor pad at (220, -40) walkable as well
        const rFission = Math.hypot(x - 220, z + 40);
        const fisBlend = THREE.MathUtils.smoothstep(rFission, 18, 45);
        elev = elev * fisBlend + 3.0 * (1 - fisBlend);

        this.h[j * n + i] = elev;
      }
    }
    void cellM;
    this.recomputeDerivedFields();
  }

  private recomputeDerivedFields(): void {
    const n = this.gridN;
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
        const slopeDeg = THREE.MathUtils.radToDeg(Math.atan(Math.hypot((r - l) / (2 * cellM), (d - u) / (2 * cellM))));

        // Local concavity / ridge height relative to neighbors approximates Sky View Factor (0.45 .. 0.99)
        const meanNb = (l + r + u + d) * 0.25;
        const convexity = this.h[idx] - meanNb;
        this.svf[idx] = THREE.MathUtils.clamp(0.88 - Math.max(0, -convexity) * 0.14 - slopeDeg * 0.008, 0.42, 0.99);

        // Thermal inertia class: 0 = loose dust (flat low-lying), 1 = mixed regolith, 2 = exposed bedrock/ridges
        if (slopeDeg > 11 || convexity > 0.12) this.thermal[idx] = 2;
        else if (slopeDeg > 4) this.thermal[idx] = 1;
        else this.thermal[idx] = 0;

        // Hydration wt% peaks in boxwork troughs and near S2/S3
        const s2Boost = 5.5 * Math.exp(-((x - 180) ** 2 + (z - 120) ** 2) / (90 ** 2));
        const s3Boost = 7.2 * Math.exp(-((x + 165) ** 2 + (z - 145) ** 2) / (105 ** 2));
        const trough = Math.max(0, -convexity) * 4.0;
        this.hydration[idx] = THREE.MathUtils.clamp(1.2 + trough + s2Boost + s3Boost, 0.5, 11.0);
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

  private buildLayerTexture(layer: LayerId): THREE.DataTexture {
    const n = this.gridN;
    const data = new Uint8Array(n * n * 4);
    this.fillLayerBytes(layer, data);
    const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  private refreshTextures(): void {
    for (const layer of ["optical", "slope", "thermal", "radiation", "hydration"] as LayerId[]) {
      const tex = this.textures[layer];
      this.fillLayerBytes(layer, tex.image.data as Uint8Array);
      tex.needsUpdate = true;
    }
  }

  private fillLayerBytes(layer: LayerId, data: Uint8Array): void {
    const n = this.gridN;
    const cellM = this.sizeM / (n - 1);
    const rnd = mulberry32(9911);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        const l = this.h[j * n + Math.max(0, i - 1)];
        const r = this.h[j * n + Math.min(n - 1, i + 1)];
        const u = this.h[Math.max(0, j - 1) * n + i];
        const d = this.h[Math.min(n - 1, j + 1) * n + i];
        const slopeDeg = THREE.MathUtils.radToDeg(Math.atan(Math.hypot((r - l) / (2 * cellM), (d - u) / (2 * cellM))));
        const tc = this.thermal[idx];
        const svf = this.svf[idx];
        const hyd = this.hydration[idx];
        const grain = (rnd() - 0.5) * 18;

        let R = 180;
        let G = 108;
        let B = 68;

        if (layer === "optical") {
          const rock = tc === 2 ? -22 : tc === 0 ? 14 : 0;
          const hShade = THREE.MathUtils.clamp((this.h[idx] + 20) * 0.45, -18, 32);
          R = 178 + rock + hShade + grain;
          G = 105 + rock * 0.7 + hShade * 0.65 + grain * 0.7;
          B = 64 + rock * 0.5 + hShade * 0.4 + grain * 0.5;
        } else if (layer === "slope") {
          if (slopeDeg < 8) {
            R = 38; G = 185; B = 110;
          } else if (slopeDeg < 18) {
            R = 230; G = 195; B = 45;
          } else if (slopeDeg < 26) {
            R = 245; G = 120; B = 35;
          } else {
            R = 235; G = 42; B = 75;
          }
          R += grain * 0.4;
          G += grain * 0.4;
        } else if (layer === "thermal") {
          if (tc === 0) { R = 48; G = 105; B = 200; }
          else if (tc === 1) { R = 215; G = 155; B = 60; }
          else { R = 245; G = 78; B = 45; }
        } else if (layer === "radiation") {
          const t = THREE.MathUtils.clamp((svf - 0.45) / 0.54, 0, 1);
          R = 35 + t * 215;
          G = 215 - t * 145;
          B = 225 - t * 35;
        } else if (layer === "hydration") {
          const t = THREE.MathUtils.clamp((hyd - 1.0) / 8.5, 0, 1);
          R = 155 * (1 - t) + 25 * t;
          G = 100 * (1 - t) + 215 * t;
          B = 68 * (1 - t) + 255 * t;
        }

        const p = idx * 4;
        data[p] = THREE.MathUtils.clamp(R, 0, 255);
        data[p + 1] = THREE.MathUtils.clamp(G, 0, 255);
        data[p + 2] = THREE.MathUtils.clamp(B, 0, 255);
        data[p + 3] = 255;
      }
    }
  }

  private buildMarkers(): void {
    // Science stations S1..S4
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

    // Curiosity traverse polyline
    const pts = CURIOSITY_TRAVERSE.map((w) => new THREE.Vector3(w.x, this.heightAt(w.x, w.z) + 0.45, w.z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineDashedMaterial({ color: 0xffb800, dashSize: 6, gapSize: 4 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    this.markersGroup.add(line);
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
