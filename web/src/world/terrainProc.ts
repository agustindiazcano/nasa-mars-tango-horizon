import {
  BASE_ORIGIN,
  CURIOSITY_TRAVERSE as SHARED_CURIOSITY_TRAVERSE,
  FISSION_COORD,
  MISSION_SITES,
  MISSION_SITES_BY_ID,
} from "@th/shared";
import * as THREE from "three";
import { TerrainLoader } from "./terrainLoader";
import { mulberry32, terrainFromThermalClass, type RouteGrid } from "@th/shared";
import type { LayerId } from "@th/shared";
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

interface TerrainChunk {
  readonly index: number;
  readonly cx: number;
  readonly cz: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly mesh: THREE.Mesh;
  seg: number;
  readonly cached: Map<number, THREE.BufferGeometry>;
}

interface LodCacheEntry {
  chunk: TerrainChunk;
  seg: number;
  geo: THREE.BufferGeometry;
  lastUsed: number;
}

export interface TerrainLodStats {
  chunks: number;
  heightGridN: number;
  nearChunkSeg: number;
  maxChunkSeg: number;
  minChunkSeg: number;
  effectiveVertexGridN: number;
  cachedGeometries: number;
}

export class TerrainProc {
  readonly sizeM = 4000;
  readonly gridN = 256;
  readonly chunksPerSide = 8;
  readonly mesh = new THREE.Group();
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

  private heightN = 256;
  private elevationMidM = 0;
  private h = new Float32Array(256 * 256);
  private hGrid = new Float32Array(256 * 256);
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
  private detailNormalMap: THREE.DataTexture | null = null;
  private regolithDetailMap: THREE.DataTexture;
  private uIsOptical = { value: 1.0 };
  private material: THREE.MeshStandardMaterial;
  private routeLine: THREE.Line | null = null;
  private beaconsGroup = new THREE.Group();
  private sceneRef: THREE.Scene;
  private chunks: TerrainChunk[] = [];
  private lodLru = new Map<string, LodCacheEntry>();
  private lodTick = 0;
  private lastCamX = 0;
  private lastCamZ = 0;

  get heightGridN(): number {
    return this.heightN;
  }

  get midElevationM(): number {
    return this.elevationMidM;
  }

  constructor(scene: THREE.Scene) {
    this.sceneRef = scene;
    this.mesh.name = "terrain-lod";
    this.generateProceduralFields();

    this.textures = {
      optical: this.buildLayerTexture("optical"),
      slope: this.buildLayerTexture("slope"),
      thermal: this.buildLayerTexture("thermal"),
      radiation: this.buildLayerTexture("radiation"),
      hydration: this.buildLayerTexture("hydration"),
    };
    this.hydrationUncTexture = this.buildLayerTexture("hydration_unc");
    this.regolithDetailMap = this.buildRegolithDetailMap();

    this.material = new THREE.MeshStandardMaterial({
      map: this.textures.optical,
      roughness: 0.96,
      metalness: 0,
      normalScale: new THREE.Vector2(0.55, 0.55),
    });
    this.attachRegolithShader();

    this.initChunks();
    this.updateLod(0, 0, true);
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
    const total = srcN * srcN;
    const full = new Float32Array(total);
    for (let k = 0; k < total; k++) {
      full[k] = meta.z_min_m + (raw[k] / 65535) * span - mid;
    }
    this.h = full;
    this.heightN = srcN;
    this.elevationMidM = mid;
    this.syncHeightGrid();
    this.meta = { ...meta };
    if (!this.realRastersLoaded) {
      this.recomputeDerivedFields();
      this.refreshTextures();
    }
    this.clearLodCache();
    this.updateLod(this.lastCamX, this.lastCamZ, true);
    this.refreshNormalMap();
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
    // UVs match PlaneGeometry rotated -90 deg: north (negative z) maps to v=1.
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
    this.uIsOptical.value = layer === "optical" ? 1.0 : 0.0;
    this.material.map =
      layer === "optical" && this.realOptical ? this.realOptical : this.getLayerTexture(layer);
    this.material.needsUpdate = true;
  }

  /**
   * Builds a tileable 512x512 regolith detail texture from periodic value-noise fBm plus scattered pebbles.
   * Channels: RG = tangent normal xy, B = height, A = albedo variation (grain and pebble tone).
   */
  private buildRegolithDetailMap(): THREE.DataTexture {
    const n = 512;
    const rnd = mulberry32(90417);
    const height = new Float32Array(n * n);
    const tone = new Float32Array(n * n).fill(0.5);

    const addNoise = (target: Float32Array, period: number, amp: number, ridged: boolean): void => {
      const lattice = new Float32Array(period * period);
      for (let k = 0; k < lattice.length; k++) lattice[k] = rnd();
      const scale = period / n;
      for (let y = 0; y < n; y++) {
        const fy = y * scale;
        const y0 = Math.floor(fy);
        const ty = fy - y0;
        const sy = ty * ty * (3 - 2 * ty);
        const ya = (y0 % period) * period;
        const yb = ((y0 + 1) % period) * period;
        for (let x = 0; x < n; x++) {
          const fx = x * scale;
          const x0 = Math.floor(fx);
          const tx = fx - x0;
          const sx = tx * tx * (3 - 2 * tx);
          const xa = x0 % period;
          const xb = (x0 + 1) % period;
          const top = lattice[ya + xa] * (1 - sx) + lattice[ya + xb] * sx;
          const bot = lattice[yb + xa] * (1 - sx) + lattice[yb + xb] * sx;
          let v = top * (1 - sy) + bot * sy;
          if (ridged) v = 1 - Math.abs(v * 2 - 1);
          target[y * n + x] += (v - 0.5) * amp;
        }
      }
    };

    // Broad undulation, ridged crusts, then fine grain
    addNoise(height, 4, 0.5, false);
    addNoise(height, 8, 0.34, false);
    addNoise(height, 16, 0.22, true);
    addNoise(height, 32, 0.14, false);
    addNoise(height, 64, 0.09, true);
    addNoise(height, 128, 0.06, false);
    addNoise(height, 256, 0.04, false);

    addNoise(tone, 6, 0.42, false);
    addNoise(tone, 24, 0.24, false);
    addNoise(tone, 96, 0.2, false);
    addNoise(tone, 256, 0.22, false);

    // Pebbles and clasts: domes with a power-law size distribution, each with its own tone
    const pebbles = 1500;
    for (let k = 0; k < pebbles; k++) {
      const cx = rnd() * n;
      const cy = rnd() * n;
      const r = 1.6 + Math.pow(rnd(), 5) * 15;
      const lift = 0.1 + r * 0.03;
      const pebbleTone = 0.26 + rnd() * 0.5;
      const squash = 0.7 + rnd() * 0.6;
      const ang = rnd() * Math.PI;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const ext = Math.ceil(r * 1.5);
      for (let dy = -ext; dy <= ext; dy++) {
        for (let dx = -ext; dx <= ext; dx++) {
          const u = (dx * ca + dy * sa) / squash;
          const v = (-dx * sa + dy * ca) * squash;
          const d = Math.hypot(u, v) / r;
          if (d >= 1) continue;
          const px = (((Math.round(cx) + dx) % n) + n) % n;
          const py = (((Math.round(cy) + dy) % n) + n) % n;
          const idx = py * n + px;
          const dome = Math.sqrt(1 - d * d);
          height[idx] = Math.max(height[idx], height[idx] * 0.35 + lift * dome);
          const edge = Math.min(1, (1 - d) * 4);
          tone[idx] = tone[idx] * (1 - edge) + pebbleTone * edge;
        }
      }
    }

    let hMin = Infinity;
    let hMax = -Infinity;
    for (let k = 0; k < height.length; k++) {
      if (height[k] < hMin) hMin = height[k];
      if (height[k] > hMax) hMax = height[k];
    }
    const hSpan = hMax - hMin || 1;

    const rgba = new Uint8Array(n * n * 4);
    const amp = 46;
    for (let y = 0; y < n; y++) {
      const ym = (y - 1 + n) % n;
      const yp = (y + 1) % n;
      for (let x = 0; x < n; x++) {
        const xm = (x - 1 + n) % n;
        const xp = (x + 1) % n;
        const dhdx = ((height[y * n + xp] - height[y * n + xm]) / hSpan) * amp;
        const dhdy = ((height[yp * n + x] - height[ym * n + x]) / hSpan) * amp;
        const inv = 1 / Math.hypot(dhdx, dhdy, 1);
        const p = (y * n + x) * 4;
        rgba[p] = Math.round((-dhdx * inv * 0.5 + 0.5) * 255);
        rgba[p + 1] = Math.round((-dhdy * inv * 0.5 + 0.5) * 255);
        rgba[p + 2] = Math.round(((height[y * n + x] - hMin) / hSpan) * 255);
        rgba[p + 3] = Math.round(THREE.MathUtils.clamp(tone[y * n + x], 0, 1) * 255);
      }
    }

    const tex = new THREE.DataTexture(rgba, n, n, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Shades the optical layer as Martian regolith: the grayscale HiRISE orthoimage drives albedo through a
   * dust/basalt/bedrock palette, and a multi-scale detail texture adds grain, pebbles and micro-relief
   * below the orthoimage resolution. Analytical layers bypass all of it (uIsOptical = 0).
   */
  private attachRegolithShader(): void {
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uDetailMap = { value: this.regolithDetailMap };
      shader.uniforms.uIsOptical = this.uIsOptical;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `
          #include <common>
          varying vec3 vMarsWorldPos;
          varying vec3 vMarsWorldNorm;
          `,
        )
        .replace(
          "#include <worldpos_vertex>",
          /* glsl */ `
          #include <worldpos_vertex>
          vMarsWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vMarsWorldNorm = normalize(mat3(modelMatrix) * objectNormal);
          `,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          /* glsl */ `
          #include <common>
          uniform sampler2D uDetailMap;
          uniform float uIsOptical;
          varying vec3 vMarsWorldPos;
          varying vec3 vMarsWorldNorm;
          // Rotations between detail scales hide the tile grid
          const mat2 MARS_ROT_B = mat2(0.7986, -0.6018, 0.6018, 0.7986);
          const mat2 MARS_ROT_C = mat2(0.3584, 0.9336, -0.9336, 0.3584);
          const mat2 MARS_ROT_D = mat2(-0.4695, 0.8829, -0.8829, -0.4695);
          `,
        )
        .replace(
          "#include <map_fragment>",
          /* glsl */ `
          vec2 marsDetailN = vec2(0.0);
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D(map, vMapUv);
            if (uIsOptical > 0.5) {
              vec2 marsWp = vMarsWorldPos.xz;
              float marsDist = length(vMarsWorldPos - cameraPosition);
              float wNear = smoothstep(42.0, 3.0, marsDist);
              float wMid = smoothstep(380.0, 24.0, marsDist);

              vec4 dA = texture2D(uDetailMap, marsWp * 0.61);
              vec4 dB = texture2D(uDetailMap, MARS_ROT_B * marsWp * 0.217 + 0.37);
              vec4 dC = texture2D(uDetailMap, MARS_ROT_C * marsWp * 0.047 + 0.71);
              vec4 dD = texture2D(uDetailMap, MARS_ROT_D * marsWp * 0.0083 + 0.13);

              // Perceptual luminance of the HiRISE RED-band orthoimage
              float lumLin = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
              float lum = pow(max(lumLin, 0.0), 0.4545);
              float sat = max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b)) -
                          min(sampledDiffuseColor.r, min(sampledDiffuseColor.g, sampledDiffuseColor.b));

              // Linear-space albedo anchors approximating Curiosity Mastcam natural-color scenes
              vec3 basaltSand = vec3(0.075, 0.056, 0.046);
              vec3 dustyRegolith = vec3(0.470, 0.245, 0.125);
              vec3 greyRegolith = vec3(0.370, 0.255, 0.180);
              vec3 paleBedrock = vec3(0.860, 0.585, 0.375);

              // Chroma varies with large-scale noise, not with luminance, so the result is not a gradient map
              float dustiness = smoothstep(0.30, 0.70, dD.a * 0.65 + dC.a * 0.35);
              vec3 midTone = mix(greyRegolith, dustyRegolith, dustiness);
              vec3 marsAlbedo = mix(basaltSand, midTone, smoothstep(0.04, 0.52, lum));
              marsAlbedo = mix(marsAlbedo, paleBedrock, smoothstep(0.50, 0.97, lum));

              float slopeFactor = clamp((1.0 - clamp(vMarsWorldNorm.y, 0.0, 1.0)) * 3.2, 0.0, 1.0);
              marsAlbedo = mix(marsAlbedo, marsAlbedo * vec3(0.72, 0.74, 0.80), slopeFactor * 0.5);

              // Grain, pebble tone and cavity shading below ortho resolution
              float grain = (dA.a - 0.5) * 0.55 * wNear + (dB.a - 0.5) * 0.42 * wMid * (1.0 - 0.35 * wNear);
              float patchTone = (dC.a - 0.5) * 0.26 + (dD.b - 0.5) * 0.16;
              float cavity = mix(1.0, 0.70 + 0.46 * dA.b, wNear) * mix(1.0, 0.82 + 0.30 * dB.b, wMid);
              marsAlbedo *= max(0.0, 1.0 + grain + patchTone) * cavity;

              // Non-grayscale procedural fallback keeps part of its own color
              vec3 baseOpt = mix(marsAlbedo, sampledDiffuseColor.rgb * cavity, clamp(sat * 1.4, 0.0, 0.45));
              diffuseColor.rgb *= baseOpt;

              // World-space xz normal perturbation, rotated back from each detail scale
              vec2 nA = dA.rg * 2.0 - 1.0;
              vec2 nB = (dB.rg * 2.0 - 1.0) * MARS_ROT_B;
              vec2 nC = (dC.rg * 2.0 - 1.0) * MARS_ROT_C;
              marsDetailN = nA * 0.50 * wNear + nB * 0.34 * wMid + nC * 0.14;
            } else {
              diffuseColor *= sampledDiffuseColor;
            }
          #endif
          `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          /* glsl */ `
          #include <normal_fragment_maps>
          normal = normalize(normal - (viewMatrix * vec4(marsDetailN.x, 0.0, marsDetailN.y, 0.0)).xyz);
          `,
        );
    };
  }

  getLayerTexture(layer: LayerId): THREE.DataTexture {
    if (layer === "hydration" && this.hydrationUncMode) {
      return this.hydrationUncTexture;
    }
    return this.textures[layer];
  }

  heightAt(x: number, z: number): number {
    const n = this.heightN;
    const u = THREE.MathUtils.clamp(x / this.sizeM + 0.5, 0, 1);
    const v = THREE.MathUtils.clamp(z / this.sizeM + 0.5, 0, 1);
    const fx = u * (n - 1);
    const fy = v * (n - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(n - 1, x0 + 1);
    const y1 = Math.min(n - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const h00 = this.h[y0 * n + x0];
    const h10 = this.h[y0 * n + x1];
    const h01 = this.h[y1 * n + x0];
    const h11 = this.h[y1 * n + x1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
  }

  absoluteHeightAt(x: number, z: number): number {
    return this.heightAt(x, z) + this.elevationMidM;
  }

  slopeAt(x: number, z: number, d = 2): number {
    if (this.realRastersLoaded) {
      return this.sampleField(this.slopeField, this.layerN, x, z);
    }
    const gx = (this.heightAt(x + d, z) - this.heightAt(x - d, z)) / (2 * d);
    const gz = (this.heightAt(x, z + d) - this.heightAt(x, z - d)) / (2 * d);
    return THREE.MathUtils.radToDeg(Math.atan(Math.hypot(gx, gz)));
  }

  updateLod(camX: number, camZ: number, immediate = false): void {
    this.lastCamX = camX;
    this.lastCamZ = camZ;
    this.lodTick += 1;

    if (this.heightN <= 256) {
      for (const chunk of this.chunks) {
        if (chunk.seg !== 32 || !chunk.mesh.geometry || chunk.mesh.geometry.attributes.position === undefined) {
          this.assignChunkLod(chunk, 32);
        }
      }
      return;
    }

    let upgradesThisFrame = 0;
    const maxUpgradesPerFrame = immediate ? this.chunks.length : 2;

    for (const chunk of this.chunks) {
      const dist = this.distanceToChunk(chunk, camX, camZ);
      const targetSeg = this.targetSegForDistance(dist, chunk.seg);
      if (targetSeg === chunk.seg) {
        this.touchLodEntry(chunk, chunk.seg);
        continue;
      }
      const isUpgrade = targetSeg > chunk.seg;
      const alreadyCached = chunk.cached.has(targetSeg);
      if (isUpgrade && !alreadyCached && !immediate) {
        if (upgradesThisFrame >= maxUpgradesPerFrame) {
          this.touchLodEntry(chunk, chunk.seg);
          continue;
        }
        upgradesThisFrame += 1;
      }
      this.assignChunkLod(chunk, targetSeg);
    }

    this.evictLodCache();
  }

  getLodStats(): TerrainLodStats {
    let nearChunkSeg = 0;
    let maxChunkSeg = 0;
    let minChunkSeg = Number.POSITIVE_INFINITY;
    for (const chunk of this.chunks) {
      if (chunk.seg > maxChunkSeg) maxChunkSeg = chunk.seg;
      if (chunk.seg < minChunkSeg) minChunkSeg = chunk.seg;
      if (this.distanceToChunk(chunk, this.lastCamX, this.lastCamZ) <= 350 && chunk.seg > nearChunkSeg) {
        nearChunkSeg = chunk.seg;
      }
    }
    if (minChunkSeg === Number.POSITIVE_INFINITY) minChunkSeg = 0;
    return {
      chunks: this.chunks.length,
      heightGridN: this.heightN,
      nearChunkSeg: nearChunkSeg || maxChunkSeg,
      maxChunkSeg,
      minChunkSeg,
      effectiveVertexGridN: this.chunksPerSide * (nearChunkSeg || maxChunkSeg),
      cachedGeometries: this.lodLru.size,
    };
  }

  dispose(): void {
    this.clearLodCache();
    for (const chunk of this.chunks) {
      chunk.mesh.geometry.dispose();
    }
    for (const tex of Object.values(this.textures)) tex.dispose();
    this.hydrationUncTexture.dispose();
    this.regolithDetailMap.dispose();
    this.realOptical?.dispose();
    this.detailNormalMap?.dispose();
    this.material.dispose();
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
      z: this.hGrid,
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
      puck.position.set(b.x, y + 0.125, b.z);
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
        this.hGrid[j * n + i] = elev;
      }
    }
    this.heightN = n;
    this.elevationMidM = 0;
    this.recomputeDerivedFields();
  }

  private syncHeightGrid(): void {
    const gn = this.gridN;
    for (let j = 0; j < gn; j++) {
      const wz = (j / (gn - 1) - 0.5) * this.sizeM;
      for (let i = 0; i < gn; i++) {
        const wx = (i / (gn - 1) - 0.5) * this.sizeM;
        this.hGrid[j * gn + i] = this.heightAt(wx, wz);
      }
    }
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
        const l = this.hGrid[j * n + Math.max(0, i - 1)];
        const r = this.hGrid[j * n + Math.min(n - 1, i + 1)];
        const u = this.hGrid[Math.max(0, j - 1) * n + i];
        const d = this.hGrid[Math.min(n - 1, j + 1) * n + i];
        const slopeDeg = THREE.MathUtils.radToDeg(
          Math.atan(Math.hypot((r - l) / (2 * cellM), (d - u) / (2 * cellM))),
        );
        this.slopeField[idx] = slopeDeg;

        const meanNb = (l + r + u + d) * 0.25;
        const convexity = this.hGrid[idx] - meanNb;
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

  private initChunks(): void {
    const perSide = this.chunksPerSide;
    const chunkSize = this.sizeM / perSide;
    const half = this.sizeM * 0.5;
    for (let cz = 0; cz < perSide; cz++) {
      for (let cx = 0; cx < perSide; cx++) {
        const index = cz * perSide + cx;
        const minX = -half + cx * chunkSize;
        const maxX = minX + chunkSize;
        const minZ = -half + cz * chunkSize;
        const maxZ = minZ + chunkSize;
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
        mesh.name = `terrain-chunk:${cx},${cz}`;
        mesh.receiveShadow = true;
        this.mesh.add(mesh);
        this.chunks.push({
          index,
          cx,
          cz,
          minX,
          maxX,
          minZ,
          maxZ,
          mesh,
          seg: 0,
          cached: new Map(),
        });
      }
    }
  }

  private distanceToChunk(chunk: TerrainChunk, x: number, z: number): number {
    const dx = x < chunk.minX ? chunk.minX - x : x > chunk.maxX ? x - chunk.maxX : 0;
    const dz = z < chunk.minZ ? chunk.minZ - z : z > chunk.maxZ ? z - chunk.maxZ : 0;
    return Math.hypot(dx, dz);
  }

  private targetSegForDistance(dist: number, currentSeg: number): number {
    // Hysteresis bands prevent rapid LOD thrashing near chunk borders.
    if (dist <= 350 || (currentSeg === 256 && dist <= 410)) return 256;
    if (dist <= 1050 || (currentSeg === 128 && dist <= 1150)) return 128;
    return 48;
  }

  private lodCacheKey(chunk: TerrainChunk, seg: number): string {
    return `${chunk.index}:${seg}`;
  }

  private touchLodEntry(chunk: TerrainChunk, seg: number): void {
    const key = this.lodCacheKey(chunk, seg);
    const entry = this.lodLru.get(key);
    if (entry) entry.lastUsed = this.lodTick;
  }

  private assignChunkLod(chunk: TerrainChunk, seg: number): void {
    let geo = chunk.cached.get(seg);
    if (!geo) {
      geo = this.buildChunkGeometry(chunk, seg);
      chunk.cached.set(seg, geo);
      this.lodLru.set(this.lodCacheKey(chunk, seg), {
        chunk,
        seg,
        geo,
        lastUsed: this.lodTick,
      });
    } else {
      this.touchLodEntry(chunk, seg);
    }
    chunk.mesh.geometry = geo;
    chunk.seg = seg;
  }

  private evictLodCache(): void {
    const maxHigh = 12;
    const maxMid = 24;
    const evictTier = (segTier: number, limit: number): void => {
      const entries = Array.from(this.lodLru.values())
        .filter((e) => e.seg === segTier && e.chunk.mesh.geometry !== e.geo)
        .sort((a, b) => a.lastUsed - b.lastUsed);
      const activeCount = Array.from(this.lodLru.values()).filter((e) => e.seg === segTier).length;
      let excess = activeCount - limit;
      for (const entry of entries) {
        if (excess <= 0) break;
        entry.chunk.cached.delete(entry.seg);
        this.lodLru.delete(this.lodCacheKey(entry.chunk, entry.seg));
        entry.geo.dispose();
        excess -= 1;
      }
    };
    evictTier(256, maxHigh);
    evictTier(128, maxMid);
  }

  private clearLodCache(): void {
    for (const entry of this.lodLru.values()) {
      entry.geo.dispose();
    }
    this.lodLru.clear();
    for (const chunk of this.chunks) {
      chunk.cached.clear();
      chunk.seg = 0;
    }
  }

  private buildChunkGeometry(chunk: TerrainChunk, seg: number): THREE.BufferGeometry {
    const cols = seg + 1;
    const topVerts = cols * cols;
    const skirtVerts = cols * 4;
    const totalVerts = topVerts + skirtVerts;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);

    const chunkW = chunk.maxX - chunk.minX;
    const chunkD = chunk.maxZ - chunk.minZ;
    const eps = Math.max(0.5, this.sizeM / (this.heightN - 1));
    const skirtDropM = 4.0;

    for (let j = 0; j < cols; j++) {
      const tz = j / seg;
      const wz = chunk.minZ + tz * chunkD;
      const v = 1 - (wz / this.sizeM + 0.5);
      for (let i = 0; i < cols; i++) {
        const tx = i / seg;
        const wx = chunk.minX + tx * chunkW;
        const u = wx / this.sizeM + 0.5;
        const wy = this.heightAt(wx, wz);

        const dhdx = (this.heightAt(wx + eps, wz) - this.heightAt(wx - eps, wz)) / (2 * eps);
        const dhdz = (this.heightAt(wx, wz + eps) - this.heightAt(wx, wz - eps)) / (2 * eps);
        const invLen = 1 / Math.hypot(dhdx, 1, dhdz);

        const k = j * cols + i;
        const p3 = k * 3;
        positions[p3] = wx;
        positions[p3 + 1] = wy;
        positions[p3 + 2] = wz;
        normals[p3] = -dhdx * invLen;
        normals[p3 + 1] = invLen;
        normals[p3 + 2] = -dhdz * invLen;
        const p2 = k * 2;
        uvs[p2] = u;
        uvs[p2 + 1] = v;
      }
    }

    const writeSkirtEdge = (
      offset: number,
      topIndexAt: (s: number) => number,
    ): void => {
      for (let s = 0; s < cols; s++) {
        const src = topIndexAt(s);
        const dst = offset + s;
        positions[dst * 3] = positions[src * 3];
        positions[dst * 3 + 1] = positions[src * 3 + 1] - skirtDropM;
        positions[dst * 3 + 2] = positions[src * 3 + 2];
        normals[dst * 3] = normals[src * 3];
        normals[dst * 3 + 1] = normals[src * 3 + 1];
        normals[dst * 3 + 2] = normals[src * 3 + 2];
        uvs[dst * 2] = uvs[src * 2];
        uvs[dst * 2 + 1] = uvs[src * 2 + 1];
      }
    };

    const northOff = topVerts;
    const southOff = northOff + cols;
    const westOff = southOff + cols;
    const eastOff = westOff + cols;
    writeSkirtEdge(northOff, (s) => s);
    writeSkirtEdge(southOff, (s) => seg * cols + s);
    writeSkirtEdge(westOff, (s) => s * cols);
    writeSkirtEdge(eastOff, (s) => s * cols + seg);

    const topTriCount = seg * seg * 2;
    const skirtTriCount = seg * 4 * 2;
    const indexCount = (topTriCount + skirtTriCount) * 3;
    const indices = totalVerts > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

    let ptr = 0;
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices[ptr++] = a;
        indices[ptr++] = c;
        indices[ptr++] = b;
        indices[ptr++] = b;
        indices[ptr++] = c;
        indices[ptr++] = d;
      }
    }

    const addSkirtQuads = (
      topIndexAt: (s: number) => number,
      skirtOffset: number,
      flip: boolean,
    ): void => {
      for (let s = 0; s < seg; s++) {
        const t0 = topIndexAt(s);
        const t1 = topIndexAt(s + 1);
        const b0 = skirtOffset + s;
        const b1 = skirtOffset + s + 1;
        if (!flip) {
          indices[ptr++] = t0;
          indices[ptr++] = b0;
          indices[ptr++] = t1;
          indices[ptr++] = t1;
          indices[ptr++] = b0;
          indices[ptr++] = b1;
        } else {
          indices[ptr++] = t0;
          indices[ptr++] = t1;
          indices[ptr++] = b0;
          indices[ptr++] = t1;
          indices[ptr++] = b1;
          indices[ptr++] = b0;
        }
      }
    };

    // Outward winding for vertical edge skirts around chunk perimeter
    addSkirtQuads((s) => s, northOff, false);
    addSkirtQuads((s) => seg * cols + s, southOff, true);
    addSkirtQuads((s) => s * cols, westOff, true);
    addSkirtQuads((s) => s * cols + seg, eastOff, false);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }

  private refreshNormalMap(): void {
    const n = this.heightN;
    if (n <= 256) return;
    const cellM = this.sizeM / (n - 1);
    const bytes = new Uint8Array(n * n * 4);
    for (let j = 0; j < n; j++) {
      // Flip row vertically so flipY=false DataTexture aligns row n-1-j with v=1 (north, j=0).
      const imgJ = n - 1 - j;
      const jm = Math.max(0, j - 1);
      const jp = Math.min(n - 1, j + 1);
      const dz = (jp - jm) * cellM;
      for (let i = 0; i < n; i++) {
        const im = Math.max(0, i - 1);
        const ip = Math.min(n - 1, i + 1);
        const dx = (ip - im) * cellM;
        const dhdx = (this.h[j * n + ip] - this.h[j * n + im]) / dx;
        const dhdz = (this.h[jp * n + i] - this.h[jm * n + i]) / dz;
        const inv = 1 / Math.hypot(dhdx, dhdz, 1);
        const nx = -dhdx * inv;
        const ny = dhdz * inv;
        const nz = inv;
        const p = (imgJ * n + i) * 4;
        bytes[p] = Math.round((nx * 0.5 + 0.5) * 255);
        bytes[p + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        bytes[p + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        bytes[p + 3] = 255;
      }
    }
    this.detailNormalMap?.dispose();
    const tex = new THREE.DataTexture(bytes, n, n, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    this.detailNormalMap = tex;
    this.material.normalMap = tex;
    this.material.needsUpdate = true;
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
      heightM: this.hGrid,
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
