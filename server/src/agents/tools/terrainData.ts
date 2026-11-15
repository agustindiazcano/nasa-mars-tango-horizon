import { createHash } from "node:crypto";
import { normalizeTerrainMetadata, READY_TERRAIN, TERRAIN_HEIGHT_SHA256, TERRAIN_META_SHA256 } from "@th/shared";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { planRoute, terrainFromThermalClass, type Grid } from "@th/shared";
import type { MissionContext, StormForecastPoint } from "../types.js";

export interface TerrainMeta {
  product_id: string;
  size_m: number;
  height_px: number;
  z_min_m: number;
  z_max_m: number;
  slope_max_deg: number;
  /** Planetocentric latitude of the scene center (deg, north positive). */
  center_lat: number;
  /** IAU 2000 east longitude of the scene center (deg). */
  center_lon_e: number;
  synthetic?: boolean;
}

// Center of the shipped HiRISE DTM window (web/public/data/terrain/meta.json): lower Mount Sharp, Gale Crater.
const DEFAULT_CENTER_LAT_DEG = -4.745;
const DEFAULT_CENTER_LON_E_DEG = 137.4;

export interface HydrationMeta {
  weh_min: number;
  weh_max: number;
  interval_width_max: number;
  validation?: Record<string, unknown>;
}

export interface VeinIndexEntry {
  waypoint_id?: string;
  image: string;
  vein_probability: number;
  peak: { u: number; v: number; score: number };
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Pure-Node PNG decoder for 8-bit / 16-bit non-interlaced grayscale, RGB, GA, and RGBA PNGs.
 * Returns the first channel (grayscale luminance / R) as an 8-bit Uint8Array of length width * height.
 */
export function decodePng(buf: Buffer): { width: number; height: number; data: Uint8Array } {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;

    if (type === "IHDR") {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
      interlace = buf[dataStart + 12];
    } else if (type === "IDAT") {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!width || !height) throw new Error("PNG missing IHDR");
  if (interlace !== 0) throw new Error("Interlaced PNG is not supported");
  if (bitDepth !== 8 && bitDepth !== 16) throw new Error(`Unsupported PNG bitDepth=${bitDepth}`);

  const channelsByColorType: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByColorType[colorType];
  if (!channels) throw new Error(`Unsupported PNG colorType=${colorType}`);

  const bytesPerSample = bitDepth / 8;
  const bpp = channels * bytesPerSample;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idatChunks));
  if (raw.length < height * (stride + 1)) {
    throw new Error("Truncated PNG IDAT stream");
  }

  const unfiltered = new Uint8Array(height * stride);
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const inRow = y * (stride + 1);
    const filter = raw[inRow];
    const outRow = y * stride;

    for (let x = 0; x < stride; x++) {
      const val = raw[inRow + 1 + x];
      const left = x >= bpp ? unfiltered[outRow + x - bpp] : 0;
      const up = y > 0 ? unfiltered[outRow - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? unfiltered[outRow - stride + x - bpp] : 0;

      let recon = val;
      if (filter === 1) recon = (val + left) & 0xff;
      else if (filter === 2) recon = (val + up) & 0xff;
      else if (filter === 3) recon = (val + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paethPredictor(left, up, upLeft)) & 0xff;

      unfiltered[outRow + x] = recon;
    }

    for (let px = 0; px < width; px++) {
      out[y * width + px] = unfiltered[outRow + px * bpp];
    }
  }

  return { width, height, data: out };
}

function findDataRoot(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../../../web/public/data"),
    path.resolve(here, "../../../../web/dist/data"),
    path.resolve(here, "../../../../../web/public/data"),
    path.resolve(here, "../../../../../web/dist/data"),
    path.resolve(process.cwd(), "web/public/data"),
    path.resolve(process.cwd(), "web/dist/data"),
    path.resolve(process.cwd(), "../web/public/data"),
    path.resolve(process.cwd(), "../web/dist/data"),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, "terrain/meta.json")) && existsSync(path.join(dir, "terrain/height_2048.u16"))) {
      return dir;
    }
  }
  return null;
}

const GRID_N = 256;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

interface LoadedTerrain {
  dataRoot: string | null;
  meta: TerrainMeta;
  heightPx: number;
  heightsM: Float32Array;
  mapN: number;
  slopeDeg: Float32Array;
  svf: Float32Array;
  thermalClass: Uint8Array;
  hydrationWeh: Float32Array;
  hydrationUnc: Float32Array;
  hydrationFromFiles: boolean;
  hydrationMeta: HydrationMeta;
  veinsIndex: { validation?: Record<string, unknown>; images: VeinIndexEntry[] } | null;
  stormForecast: StormForecastPoint[] | null;
  grid: Grid;
}

function buildSyntheticTerrain(): LoadedTerrain {
  const sizeM = 4000;
  const heightPx = 256;
  const mapN = 256;
  const heightsM = new Float32Array(heightPx * heightPx);
  const slopeDeg = new Float32Array(mapN * mapN);
  const svf = new Float32Array(mapN * mapN);
  const thermalClass = new Uint8Array(mapN * mapN);
  const hydrationWeh = new Float32Array(mapN * mapN);
  const hydrationUnc = new Float32Array(mapN * mapN);

  const cellM = sizeM / mapN;
  let zMin = Infinity;
  let zMax = -Infinity;

  // Deterministic Gale Crater-like floor with Aeolis Mons foothills toward +X/+Z and a steep ridge at (-900, 800)
  for (let r = 0; r < heightPx; r++) {
    const z = ((r + 0.5) / heightPx - 0.5) * sizeM;
    for (let c = 0; c < heightPx; c++) {
      const x = ((c + 0.5) / heightPx - 0.5) * sizeM;
      const ridge1 = 75 * Math.exp(-(((x + 900) ** 2 + (z - 800) ** 2) / (100 * 100)));
      const mound = 58 * Math.exp(-(((x - 1250) ** 2 + (z - 1200) ** 2) / (650 * 650)));
      const crater = -14 * Math.exp(-(((x + 420) ** 2 + (z + 380) ** 2) / (180 * 180)));
      const undulation = 4.5 * Math.sin(x / 320) * Math.cos(z / 290) + 2.0 * Math.sin((x + z) / 140);
      const h = -4490 + mound + ridge1 + crater + undulation;
      heightsM[r * heightPx + c] = h;
      if (h < zMin) zMin = h;
      if (h > zMax) zMax = h;
    }
  }

  for (let r = 0; r < mapN; r++) {
    const z = ((r + 0.5) / mapN - 0.5) * sizeM;
    for (let c = 0; c < mapN; c++) {
      const x = ((c + 0.5) / mapN - 0.5) * sizeM;
      const idx = r * mapN + c;
      const r0 = Math.max(0, r - 1);
      const r1 = Math.min(mapN - 1, r + 1);
      const c0 = Math.max(0, c - 1);
      const c1 = Math.min(mapN - 1, c + 1);
      const dzdx = (heightsM[r * mapN + c1] - heightsM[r * mapN + c0]) / ((c1 - c0 || 1) * cellM);
      const dzdz = (heightsM[r1 * mapN + c] - heightsM[r0 * mapN + c]) / ((r1 - r0 || 1) * cellM);
      const sl = (Math.atan(Math.hypot(dzdx, dzdz)) * 180) / Math.PI;
      slopeDeg[idx] = sl;
      svf[idx] = clamp(0.96 - sl * 0.008, 0.55, 0.99);
      thermalClass[idx] = sl > 12 ? 2 : (Math.sin(x / 250) + Math.cos(z / 250)) > 0.3 ? 1 : 0;
      hydrationWeh[idx] = clamp(
        3.4 + 2.1 * Math.exp(-(((x - 480) ** 2 + (z - 320) ** 2) / (450 * 450))) - sl * 0.04,
        1.2,
        6.8,
      );
      hydrationUnc[idx] = clamp(0.45 + 0.03 * sl, 0.35, 1.8);
    }
  }

  const grid = buildRoutingGrid(sizeM, heightsM, heightPx, svf, thermalClass, mapN);

  return {
    dataRoot: null,
    meta: {
      product_id: "synthetic-gale-fallback",
      size_m: sizeM,
      height_px: heightPx,
      z_min_m: zMin,
      z_max_m: zMax,
      slope_max_deg: 45,
      center_lat: DEFAULT_CENTER_LAT_DEG,
      center_lon_e: DEFAULT_CENTER_LON_E_DEG,
      synthetic: true,
    },
    heightPx,
    heightsM,
    mapN,
    slopeDeg,
    svf,
    thermalClass,
    hydrationWeh,
    hydrationUnc,
    hydrationFromFiles: false,
    hydrationMeta: { weh_min: 1.2, weh_max: 6.8, interval_width_max: 1.8 },
    veinsIndex: null,
    stormForecast: null,
    grid,
  };
}

function buildRoutingGrid(
  sizeM: number,
  heightsM: Float32Array,
  heightPx: number,
  svf: Float32Array,
  thermalClass: Uint8Array,
  mapN: number,
): Grid {
  const z = new Float32Array(GRID_N * GRID_N);
  const terrain = new Float32Array(GRID_N * GRID_N);
  const doseRel = new Float32Array(GRID_N * GRID_N);

  for (let r = 0; r < GRID_N; r++) {
    const v = (r + 0.5) / GRID_N;
    const hr = clamp(Math.floor(v * heightPx), 0, heightPx - 1);
    const mr = clamp(Math.floor(v * mapN), 0, mapN - 1);
    for (let c = 0; c < GRID_N; c++) {
      const u = (c + 0.5) / GRID_N;
      const hc = clamp(Math.floor(u * heightPx), 0, heightPx - 1);
      const mc = clamp(Math.floor(u * mapN), 0, mapN - 1);
      const idx = r * GRID_N + c;
      const mIdx = mr * mapN + mc;
      z[idx] = heightsM[hr * heightPx + hc];
      doseRel[idx] = svf[mIdx];
      const tc = thermalClass[mIdx];
      const cls = (tc <= 2 ? tc : tc < 85 ? 0 : tc < 170 ? 1 : 2) as 0 | 1 | 2;
      terrain[idx] = terrainFromThermalClass(cls);
    }
  }

  return { n: GRID_N, cellM: sizeM / GRID_N, z, terrain, doseRel };
}

function loadTerrainFromDisk(): LoadedTerrain {
  const root = findDataRoot();
  if (!root) return buildSyntheticTerrain();

  try {
    const metaBytes = readFileSync(path.join(root, "terrain/meta.json"));
    if (createHash("sha256").update(normalizeTerrainMetadata(metaBytes.toString("utf8"))).digest("hex") !== TERRAIN_META_SHA256) throw new Error("Terrain metadata identity mismatch");
    const metaRaw = JSON.parse(metaBytes.toString("utf8")) as Partial<TerrainMeta>;
    const sizeM = metaRaw.size_m ?? 4000;
    const heightPx = metaRaw.height_px ?? 2048;
    const zMin = metaRaw.z_min_m ?? -4520;
    const zMax = metaRaw.z_max_m ?? -4380;
    const slopeMax = metaRaw.slope_max_deg ?? 45;

    const u16Buf = readFileSync(path.join(root, "terrain/height_2048.u16"));
    const expectedCount = heightPx * heightPx;
    if (u16Buf.length !== expectedCount * 2 || createHash("sha256").update(u16Buf).digest("hex") !== TERRAIN_HEIGHT_SHA256) throw new Error("Terrain height identity mismatch");
    const heightsM = new Float32Array(expectedCount);
    const span = zMax - zMin;
    for (let i = 0; i < expectedCount && i * 2 + 1 < u16Buf.length; i++) {
      heightsM[i] = zMin + (u16Buf.readUInt16LE(i * 2) / 65535) * span;
    }

    const slopePath = path.join(root, "terrain/slope_1024.png");
    const svfPath = path.join(root, "terrain/svf_1024.png");
    if (!existsSync(slopePath) || !existsSync(svfPath)) {
      return buildSyntheticTerrain();
    }

    const slopePng = decodePng(readFileSync(slopePath));
    const svfPng = decodePng(readFileSync(svfPath));
    const mapN = slopePng.width;
    const slopeDeg = new Float32Array(mapN * mapN);
    const svf = new Float32Array(mapN * mapN);
    for (let i = 0; i < mapN * mapN; i++) {
      slopeDeg[i] = (slopePng.data[i] / 255) * slopeMax;
      svf[i] = (svfPng.data[i] ?? 230) / 255;
    }

    let thermalClass: Uint8Array = new Uint8Array(mapN * mapN).fill(1);
    const thermalPath = path.join(root, "terrain/thermal_class.png");
    if (existsSync(thermalPath)) {
      try {
        const tPng = decodePng(readFileSync(thermalPath));
        if (tPng.width === mapN && tPng.height === mapN) {
          thermalClass = tPng.data;
        }
      } catch {
        // Keep default medium thermal class if thermal_class.png cannot be decoded
      }
    }

    const hydrationMetaPath = path.join(root, "terrain/hydration_meta.json");
    const hydrationPngPath = path.join(root, "terrain/hydration_1024.png");
    const hydrationUncPath = path.join(root, "terrain/hydration_unc_1024.png");
    const hydrationWeh = new Float32Array(mapN * mapN);
    const hydrationUnc = new Float32Array(mapN * mapN);
    let hydrationFromFiles = false;
    let hydrationMeta: HydrationMeta = { weh_min: 1.5, weh_max: 6.5, interval_width_max: 1.5 };

    if (existsSync(hydrationPngPath) && existsSync(hydrationUncPath) && existsSync(hydrationMetaPath)) {
      try {
        hydrationMeta = JSON.parse(readFileSync(hydrationMetaPath, "utf8")) as HydrationMeta;
        const hPng = decodePng(readFileSync(hydrationPngPath));
        const uPng = decodePng(readFileSync(hydrationUncPath));
        const hSpan = hydrationMeta.weh_max - hydrationMeta.weh_min;
        for (let i = 0; i < mapN * mapN; i++) {
          hydrationWeh[i] = hydrationMeta.weh_min + (hPng.data[i] / 255) * hSpan;
          hydrationUnc[i] = (uPng.data[i] / 255) * hydrationMeta.interval_width_max;
        }
        hydrationFromFiles = true;
      } catch {
        hydrationFromFiles = false;
      }
    }

    if (!hydrationFromFiles) {
      for (let r = 0; r < mapN; r++) {
        const z = ((r + 0.5) / mapN - 0.5) * sizeM;
        for (let c = 0; c < mapN; c++) {
          const x = ((c + 0.5) / mapN - 0.5) * sizeM;
          const idx = r * mapN + c;
          const sl = slopeDeg[idx];
          hydrationWeh[idx] = clamp(
            3.2 + 2.2 * Math.exp(-(((x - 480) ** 2 + (z - 320) ** 2) / (450 * 450))) - sl * 0.04,
            1.2,
            6.5,
          );
          hydrationUnc[idx] = clamp(0.45 + 0.025 * sl, 0.35, 1.5);
        }
      }
    }

    let veinsIndex: LoadedTerrain["veinsIndex"] = null;
    const veinsPath = path.join(root, "veins/index.json");
    if (existsSync(veinsPath)) {
      try {
        veinsIndex = JSON.parse(readFileSync(veinsPath, "utf8"));
      } catch {
        veinsIndex = null;
      }
    }

    let stormForecast: StormForecastPoint[] | null = null;
    const stormPath = path.join(root, "env/storm_forecast.json");
    if (existsSync(stormPath)) {
      try {
        const rawStorm = JSON.parse(readFileSync(stormPath, "utf8"));
        if (Array.isArray(rawStorm?.forecast)) stormForecast = rawStorm.forecast;
        else if (Array.isArray(rawStorm?.horizons)) stormForecast = rawStorm.horizons;
        else if (Array.isArray(rawStorm)) stormForecast = rawStorm;
      } catch {
        stormForecast = null;
      }
    }

    const grid = buildRoutingGrid(sizeM, heightsM, heightPx, svf, thermalClass, mapN);

    return {
      dataRoot: root,
      meta: {
        product_id: metaRaw.product_id ?? "usgs-hirise-dtm",
        size_m: sizeM,
        height_px: heightPx,
        z_min_m: zMin,
        z_max_m: zMax,
        slope_max_deg: slopeMax,
        center_lat: Number.isFinite(metaRaw.center_lat) ? (metaRaw.center_lat as number) : DEFAULT_CENTER_LAT_DEG,
        center_lon_e: Number.isFinite(metaRaw.center_lon_e) ? (metaRaw.center_lon_e as number) : DEFAULT_CENTER_LON_E_DEG,
        synthetic: false,
      },
      heightPx,
      heightsM,
      mapN,
      slopeDeg,
      svf,
      thermalClass,
      hydrationWeh,
      hydrationUnc,
      hydrationFromFiles,
      hydrationMeta,
      veinsIndex,
      stormForecast,
      grid,
    };
  } catch {
    return buildSyntheticTerrain();
  }
}

const state: LoadedTerrain = loadTerrainFromDisk();

export const terrainIdentity = { ...READY_TERRAIN, status: state.meta.synthetic ? "error" as const : "ready" as const };
export const meta: TerrainMeta = state.meta;
export const grid: Grid = state.grid;

function worldToNorm(x: number, z: number): { u: number; v: number } {
  const half = state.meta.size_m / 2;
  return {
    u: clamp((x + half) / state.meta.size_m, 0, 1),
    v: clamp((z + half) / state.meta.size_m, 0, 1),
  };
}

function sampleFloatBilinear(arr: Float32Array, n: number, x: number, z: number): number {
  const { u, v } = worldToNorm(x, z);
  const fx = u * (n - 1);
  const fy = v * (n - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(n - 1, x0 + 1);
  const y1 = Math.min(n - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const v00 = arr[y0 * n + x0];
  const v10 = arr[y0 * n + x1];
  const v01 = arr[y1 * n + x0];
  const v11 = arr[y1 * n + x1];
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

/** Converts world (x, z) meters to the 256x256 routing grid cell index. */
export function cellOf(x: number, z: number): number {
  const { u, v } = worldToNorm(x, z);
  const col = clamp(Math.floor(u * (GRID_N - 1)), 0, GRID_N - 1);
  const row = clamp(Math.floor(v * (GRID_N - 1)), 0, GRID_N - 1);
  return row * GRID_N + col;
}

export function heightAt(x: number, z: number): number {
  return Number(sampleFloatBilinear(state.heightsM, state.heightPx, x, z).toFixed(2));
}

export function slopeAt(x: number, z: number): number {
  return Number(sampleFloatBilinear(state.slopeDeg, state.mapN, x, z).toFixed(2));
}

/**
 * Returns (x, z) if its slope is within maxSlopeDeg; otherwise searches outward
 * in 15 m rings on the HiRISE DTM to find the nearest safe rover rendezvous point.
 */
export function nearestSafePoint(
  x: number,
  z: number,
  maxSlopeDeg = 20,
): { x: number; z: number; slope_deg: number; adjusted: boolean } {
  const s0 = slopeAt(x, z);
  if (s0 <= maxSlopeDeg) {
    return { x: Math.round(x), z: Math.round(z), slope_deg: s0, adjusted: false };
  }
  const half = state.meta.size_m / 2 - 20;
  let best = { x: Math.round(x), z: Math.round(z), slope_deg: s0, adjusted: true };
  for (let r = 15; r <= 600; r += 15) {
    for (let k = 0; k < 16; k++) {
      const ang = (2 * Math.PI * k) / 16;
      const cx = clamp(Math.round(x + r * Math.cos(ang)), -half, half);
      const cz = clamp(Math.round(z + r * Math.sin(ang)), -half, half);
      const sl = slopeAt(cx, cz);
      if (sl < best.slope_deg) {
        best = { x: cx, z: cz, slope_deg: sl, adjusted: true };
      }
      if (sl <= maxSlopeDeg) {
        return { x: cx, z: cz, slope_deg: sl, adjusted: true };
      }
    }
  }
  return best;
}

export function svfAt(x: number, z: number): number {
  return Number(sampleFloatBilinear(state.svf, state.mapN, x, z).toFixed(3));
}

export function thermalClassAt(x: number, z: number): 0 | 1 | 2 {
  const { u, v } = worldToNorm(x, z);
  const col = clamp(Math.floor(u * (state.mapN - 1)), 0, state.mapN - 1);
  const row = clamp(Math.floor(v * (state.mapN - 1)), 0, state.mapN - 1);
  const raw = state.thermalClass[row * state.mapN + col];
  if (raw <= 2) return raw as 0 | 1 | 2;
  return raw < 85 ? 0 : raw < 170 ? 1 : 2;
}

const MARS_RADIUS_M = 3_396_190;

/**
 * Converts local tangent-plane coordinates (x east, z south in metres) into
 * IAU Mars 2000 planetocentric latitude and east longitude (degrees).
 * The origin is the center of the loaded DTM window (terrain/meta.json), so the result matches the cartography.
 */
export function worldToPlanetocentric(x: number, z: number): { lat_deg: number; lon_e_deg: number } {
  const mPerDegLat = (Math.PI / 180) * MARS_RADIUS_M;
  const { center_lat, center_lon_e } = state.meta;
  const mPerDegLon = mPerDegLat * Math.cos((center_lat * Math.PI) / 180);
  return {
    lat_deg: Number((center_lat - z / mPerDegLat).toFixed(6)),
    lon_e_deg: Number((center_lon_e + x / mPerDegLon).toFixed(6)),
  };
}

export interface LidarSectorScan {
  sector: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
  azimuth_deg: number;
  elevation_15m: number;
  elevation_30m: number;
  elevation_60m: number;
  max_slope_deg: number;
  thermal_class: 0 | 1 | 2;
  traversable: boolean;
}

/**
 * Simulates an onboard 360-deg 3D Flash LiDAR + HiRISE DTM hazard scan around (x, z)
 * across 8 octants out to 60 m range.
 */
export function lidarScanAt(x: number, z: number, maxSlopeDeg = 22): {
  origin: { x: number; z: number; elevation_m: number; slope_deg: number; lat_deg: number; lon_e_deg: number };
  range_m: number;
  sectors: LidarSectorScan[];
} {
  const dirs: { sector: LidarSectorScan["sector"]; az: number; dx: number; dz: number }[] = [
    { sector: "N", az: 0, dx: 0, dz: -1 },
    { sector: "NE", az: 45, dx: Math.SQRT1_2, dz: -Math.SQRT1_2 },
    { sector: "E", az: 90, dx: 1, dz: 0 },
    { sector: "SE", az: 135, dx: Math.SQRT1_2, dz: Math.SQRT1_2 },
    { sector: "S", az: 180, dx: 0, dz: 1 },
    { sector: "SW", az: 225, dx: -Math.SQRT1_2, dz: Math.SQRT1_2 },
    { sector: "W", az: 270, dx: -1, dz: 0 },
    { sector: "NW", az: 315, dx: -Math.SQRT1_2, dz: -Math.SQRT1_2 },
  ];
  const sectors: LidarSectorScan[] = dirs.map((d) => {
    const p15 = { x: x + d.dx * 15, z: z + d.dz * 15 };
    const p30 = { x: x + d.dx * 30, z: z + d.dz * 30 };
    const p60 = { x: x + d.dx * 60, z: z + d.dz * 60 };
    const s15 = slopeAt(p15.x, p15.z);
    const s30 = slopeAt(p30.x, p30.z);
    const s60 = slopeAt(p60.x, p60.z);
    const maxSlope = Number(Math.max(s15, s30, s60).toFixed(1));
    const tc = thermalClassAt(p30.x, p30.z);
    return {
      sector: d.sector,
      azimuth_deg: d.az,
      elevation_15m: heightAt(p15.x, p15.z),
      elevation_30m: heightAt(p30.x, p30.z),
      elevation_60m: heightAt(p60.x, p60.z),
      max_slope_deg: maxSlope,
      thermal_class: tc,
      traversable: maxSlope <= maxSlopeDeg && tc > 0,
    };
  });
  return {
    origin: {
      x: Number(x.toFixed(1)),
      z: Number(z.toFixed(1)),
      elevation_m: heightAt(x, z),
      slope_deg: slopeAt(x, z),
      ...worldToPlanetocentric(x, z),
    },
    range_m: 60,
    sectors,
  };
}

export function hydrationAt(x: number, z: number) {
  return {
    hydration_index: Number(sampleFloatBilinear(state.hydrationWeh, state.mapN, x, z).toFixed(2)),
    uncertainty_index: Number(sampleFloatBilinear(state.hydrationUnc, state.mapN, x, z).toFixed(2)),
    slope_deg: slopeAt(x, z),
    source: state.hydrationFromFiles ? "hydration_model_v1" : "synthetic_fallback",
  };
}

export function rankSampleSites(k = 3, fromX = 0, fromZ = 0) {
  const limit = clamp(Math.round(k), 1, 10);
  const candidates: {
    x: number;
    z: number;
    distance_m: number;
    hydration_index: number;
    uncertainty_index: number;
    slope_deg: number;
    sky_view_factor: number;
    score: number;
  }[] = [];

  const stepM = 75;
  const maxDist = 1500;
  for (let dx = -maxDist; dx <= maxDist; dx += stepM) {
    for (let dz = -maxDist; dz <= maxDist; dz += stepM) {
      const dist = Math.hypot(dx, dz);
      if (dist < 40 || dist > maxDist) continue;
      const x = fromX + dx;
      const z = fromZ + dz;
      const half = state.meta.size_m / 2 - 20;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      const sl = slopeAt(x, z);
      if (sl > 20) continue;
      const hyd = hydrationAt(x, z);
      const svf = svfAt(x, z);
      const score = hyd.hydration_index - 0.5 * hyd.uncertainty_index - 0.02 * sl;
      candidates.push({
        x: Math.round(x),
        z: Math.round(z),
        distance_m: Math.round(dist),
        hydration_index: hyd.hydration_index,
        uncertainty_index: hyd.uncertainty_index,
        slope_deg: sl,
        sky_view_factor: svf,
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const picked: typeof candidates = [];
  for (const c of candidates) {
    if (picked.every((p) => Math.hypot(p.x - c.x, p.z - c.z) >= 150)) {
      picked.push(c);
      if (picked.length >= limit) break;
    }
  }

  return {
    sites: picked.map((s, i) => ({
      rank: i + 1,
      x: s.x,
      z: s.z,
      distance_m: s.distance_m,
      hydration_index: s.hydration_index,
      uncertainty_index: s.uncertainty_index,
      slope_deg: s.slope_deg,
      sky_view_factor: s.sky_view_factor,
    })),
    source: state.hydrationFromFiles ? "hydration_model_v1" : "synthetic_fallback",
    note: "Estimated hydration index (dimensionless passive neutron ratio), not calibrated water abundance.",
  };
}

export function detectVeinsAt(waypointId: string) {
  const key = waypointId.trim().toLowerCase();
  const images = state.veinsIndex?.images ?? [];
  const match =
    images.find((img) => img.waypoint_id?.toLowerCase() === key || img.image.toLowerCase().includes(key)) ??
    images[0];

  if (match) {
    return {
      waypoint_id: waypointId,
      image: match.image,
      vein_probability: match.vein_probability,
      peak: match.peak,
      classification: match.vein_probability >= 0.7 ? "vein_candidate" : "low_probability",
      note: "Visual vein candidate signature only; mineral identity requires spectrometer confirmation (ChemCam heritage).",
      source: "dinov2_veins_v1",
    };
  }

  // Deterministic fallback when veins/index.json is not yet on disk
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const prob = Number((0.68 + ((hash % 24) / 100)).toFixed(3));
  return {
    waypoint_id: waypointId,
    image: `${waypointId || "wp-1"}.jpg`,
    vein_probability: prob,
    peak: { u: 0.54, v: 0.48, score: prob },
    classification: "vein_candidate",
    note: "Visual vein candidate signature only; mineral identity requires spectrometer confirmation (ChemCam heritage).",
    source: "fallback_untrained",
  };
}

export function getStormForecastData(): {
  forecast: StormForecastPoint[];
  source: string;
  disclaimer: string;
} {
  if (state.stormForecast?.length) {
    return {
      forecast: state.stormForecast,
      source: "historical_rems_storm_nowcaster_sol_2079",
      disclaimer: "Historical prediction initialized at sol 2079; not a current mission forecast. Does not model global storm physics.",
    };
  }
  return {
    forecast: [
      { horizonSol: 1, q10: 0.55, q50: 0.78, q90: 1.15 },
      { horizonSol: 2, q10: 0.72, q50: 1.25, q90: 2.15 },
      { horizonSol: 3, q10: 0.88, q50: 1.65, q90: 2.75 },
    ],
    source: "design_forecast_fallback",
    disclaimer: "Synthetic design forecast; not an observed or current NASA forecast.",
  };
}

export function routeBetween(
  from: { x: number; z: number },
  to: { x: number; z: number },
  speedMs: number,
  ctx: MissionContext,
) {
  const start = cellOf(from.x, from.z);
  const goal = cellOf(to.x, to.z);
  const res = planRoute(state.grid, start, goal, {
    bodyKg: ctx.astronaut.body_kg,
    loadKg: ctx.astronaut.load_kg,
    speed: speedMs,
    maxSlopeDeg: 25,
    doseWeight: 0.5,
  });

  if (!res) {
    return {
      reachable: false,
      error: "No traversable route found within the 25 deg slope limit.",
    };
  }

  const half = state.meta.size_m / 2;
  const points = res.path.map((idx) => {
    const col = idx % GRID_N;
    const row = Math.floor(idx / GRID_N);
    return {
      x: Number((((col + 0.5) / GRID_N) * state.meta.size_m - half).toFixed(1)),
      z: Number((((row + 0.5) / GRID_N) * state.meta.size_m - half).toFixed(1)),
    };
  });
  if (points.length >= 1) {
    points[0] = { x: Number(from.x.toFixed(1)), z: Number(from.z.toFixed(1)) };
    points[points.length - 1] = { x: Number(to.x.toFixed(1)), z: Number(to.z.toFixed(1)) };
  }

  return {
    reachable: true,
    distance_m: Number(res.distanceM.toFixed(1)),
    time_min: Number((res.timeS / 60).toFixed(2)),
    energy_kj: Number((res.energyJ / 1000).toFixed(1)),
    o2_kg: Number(res.o2Kg.toFixed(4)),
    mean_sky_view_factor: Number(res.meanSvf.toFixed(3)),
    dose_ugy: Number((ctx.env.dose_rate_ugy_h * (res.timeS / 3600) * res.meanSvf).toFixed(2)),
    points,
  };
}
