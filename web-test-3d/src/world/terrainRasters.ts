import { mulberry32 } from "../core/physics";
import type { LayerId } from "../core/types";

export type RenderLayerId = LayerId | "hydration_unc";

export interface HydrationValidationMetrics {
  n_points?: number;
  n_spatial_blocks?: number;
  block_m?: number;
  r2_blocked_cv?: number;
  spearman_blocked_cv?: number;
  mae_model?: number;
  mae_baseline_mean?: number;
}

export interface HydrationMeta {
  weh_min: number;
  weh_max: number;
  interval_width_max: number;
  target_name?: string;
  target_label?: string;
  units?: string;
  signal_tier?: string;
  validation?: HydrationValidationMetrics;
}

export interface DanMeasurement {
  sol: number;
  lon: number;
  lat: number;
  x: number;
  z: number;
  u: number;
  v: number;
  in_scene: boolean;
  hydration_index: number;
  hydration_err: number;
  duration_s: number;
}

export interface HydrationSitesData {
  product_id: string;
  signal_tier: string;
  target_label: string;
  units: string;
  note: string;
  scene_size_m: number;
  dan_in_scene: DanMeasurement[];
  total_measurements: number;
}

export interface GrayscaleRaster {
  width: number;
  height: number;
  data: Uint8Array;
}

export const DEFAULT_HYDRATION_META: HydrationMeta = {
  weh_min: 1.0,
  weh_max: 9.5,
  interval_width_max: 2.0,
  target_name: "thermal_epithermal_net_ratio",
  target_label: "Relative Hydrogen Indicator (DAN passive CTN/CETN net ratio)",
  units: "dimensionless ratio (not absolute wt% H2O)",
  signal_tier: "fallback",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clampByte(b: number): number {
  return clamp(Math.round(b), 0, 255);
}

/** Parses and validates hydration_meta.json from the hydration pipeline. */
export function parseHydrationMeta(raw: unknown): HydrationMeta {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid hydration_meta.json payload");
  }
  const obj = raw as Record<string, unknown>;
  const wehMin = Number(obj.weh_min);
  const wehMax = Number(obj.weh_max);
  const widthMax = Number(obj.interval_width_max);
  if (
    !Number.isFinite(wehMin) ||
    !Number.isFinite(wehMax) ||
    !Number.isFinite(widthMax) ||
    wehMax <= wehMin ||
    widthMax <= 0
  ) {
    throw new Error("Invalid hydration_meta.json numeric bounds");
  }
  const valRaw =
    obj.validation && typeof obj.validation === "object"
      ? (obj.validation as Record<string, unknown>)
      : undefined;
  return {
    weh_min: wehMin,
    weh_max: wehMax,
    interval_width_max: widthMax,
    target_name: typeof obj.target_name === "string" ? obj.target_name : DEFAULT_HYDRATION_META.target_name,
    target_label: typeof obj.target_label === "string" ? obj.target_label : DEFAULT_HYDRATION_META.target_label,
    units: typeof obj.units === "string" ? obj.units : DEFAULT_HYDRATION_META.units,
    signal_tier: typeof obj.signal_tier === "string" ? obj.signal_tier : "validated",
    validation: valRaw
      ? {
          n_points: typeof valRaw.n_points === "number" ? valRaw.n_points : undefined,
          n_spatial_blocks: typeof valRaw.n_spatial_blocks === "number" ? valRaw.n_spatial_blocks : undefined,
          block_m: typeof valRaw.block_m === "number" ? valRaw.block_m : undefined,
          r2_blocked_cv: typeof valRaw.r2_blocked_cv === "number" ? valRaw.r2_blocked_cv : undefined,
          spearman_blocked_cv:
            typeof valRaw.spearman_blocked_cv === "number" ? valRaw.spearman_blocked_cv : undefined,
          mae_model: typeof valRaw.mae_model === "number" ? valRaw.mae_model : undefined,
          mae_baseline_mean: typeof valRaw.mae_baseline_mean === "number" ? valRaw.mae_baseline_mean : undefined,
        }
      : undefined,
  };
}

/** Parses hydration_sites.json and extracts all valid in-scene MSL DAN measurements. */
export function parseHydrationSites(raw: unknown): HydrationSitesData {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid hydration_sites.json payload");
  }
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.dan_measurements) ? obj.dan_measurements : null;
  if (!list) {
    throw new Error("hydration_sites.json missing dan_measurements array");
  }
  const danInScene: DanMeasurement[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;
    if (d.in_scene !== true) continue;
    const x = Number(d.x);
    const z = Number(d.z);
    const lon = Number(d.lon);
    const lat = Number(d.lat);
    const sol = Number(d.sol);
    const hydrationIndex = Number(d.hydration_index ?? d.weh);
    const hydrationErr = Number(d.hydration_err ?? d.weh_err ?? 0);
    if (![x, z, lon, lat, sol, hydrationIndex].every(Number.isFinite)) continue;
    danInScene.push({
      sol,
      lon,
      lat,
      x,
      z,
      u: Number.isFinite(Number(d.u)) ? Number(d.u) : 0.5,
      v: Number.isFinite(Number(d.v)) ? Number(d.v) : 0.5,
      in_scene: true,
      hydration_index: hydrationIndex,
      hydration_err: Number.isFinite(hydrationErr) ? hydrationErr : 0,
      duration_s: Number.isFinite(Number(d.duration_s)) ? Number(d.duration_s) : 0,
    });
  }
  return {
    product_id: typeof obj.product_id === "string" ? obj.product_id : "tango-horizon-hydration-v1",
    signal_tier: typeof obj.signal_tier === "string" ? obj.signal_tier : "validated",
    target_label:
      typeof obj.target_label === "string"
        ? obj.target_label
        : "Relative Hydrogen Indicator (DAN passive CTN/CETN net ratio)",
    units:
      typeof obj.units === "string" ? obj.units : "dimensionless ratio (not absolute wt% H2O)",
    note: typeof obj.note === "string" ? obj.note : "",
    scene_size_m: Number.isFinite(Number(obj.scene_size_m)) ? Number(obj.scene_size_m) : 4000,
    dan_in_scene: danInScene,
    total_measurements: list.length,
  };
}

/** Formats a dimensionless hydration index value without percentage or wt% units. */
export function formatHydrationIndex(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(digits)} (index)`;
}

export function decodeSlopeByte(byte: number, slopeMaxDeg = 45): number {
  return (clampByte(byte) / 255) * slopeMaxDeg;
}

export function decodeSvfByte(byte: number): number {
  return clampByte(byte) / 255;
}

export function decodeThermalClassByte(byte: number): 0 | 1 | 2 {
  const b = clampByte(byte);
  if (b <= 2) return b as 0 | 1 | 2;
  if (b < 85) return 0;
  if (b < 170) return 1;
  return 2;
}

export function decodeHydrationByte(byte: number, meta: HydrationMeta): number {
  return meta.weh_min + (clampByte(byte) / 255) * (meta.weh_max - meta.weh_min);
}

export function decodeHydrationUncByte(byte: number, meta: HydrationMeta): number {
  return (clampByte(byte) / 255) * meta.interval_width_max;
}

export function hydrationRgb(
  value: number,
  minVal: number,
  maxVal: number,
): [number, number, number] {
  const span = Math.max(maxVal - minVal, 1e-6);
  const t = clamp((value - minVal) / span, 0, 1);
  return [
    Math.round(155 * (1 - t) + 25 * t),
    Math.round(100 * (1 - t) + 215 * t),
    Math.round(68 * (1 - t) + 255 * t),
  ];
}

export function hydrationUncRgb(value: number, maxWidth: number): [number, number, number] {
  const t = clamp(value / Math.max(maxWidth, 1e-6), 0, 1);
  return [
    Math.round(32 + t * 218),
    Math.round(48 + (1 - Math.abs(t - 0.5) * 2) * 90),
    Math.round(115 + (1 - t) * 110),
  ];
}

export interface LayerRenderInput {
  n: number;
  slopeDeg: Float32Array;
  svf: Float32Array;
  thermal: Uint8Array;
  hydration: Float32Array;
  hydrationUnc: Float32Array;
  hydrationMin: number;
  hydrationMax: number;
  hydrationUncMax: number;
  heightM: Float32Array;
  heightGridN: number;
  realRasters: boolean;
}

/** Populates an RGBA byte buffer for a terrain scientific layer at resolution input.n x input.n. */
export function fillLayerRgba(layer: RenderLayerId, input: LayerRenderInput, data: Uint8Array): void {
  const n = input.n;
  const rnd = mulberry32(9911);
  const hn = input.heightGridN;

  for (let j = 0; j < n; j++) {
    const hj = Math.min(hn - 1, Math.round((j / Math.max(1, n - 1)) * (hn - 1)));
    for (let i = 0; i < n; i++) {
      const idx = j * n + i;
      const hi = Math.min(hn - 1, Math.round((i / Math.max(1, n - 1)) * (hn - 1)));
      const slopeDeg = input.slopeDeg[idx];
      const tc = input.thermal[idx];
      const svf = input.svf[idx];
      const hyd = input.hydration[idx];
      const hydUnc = input.hydrationUnc[idx];
      const grain = input.realRasters ? 0 : (rnd() - 0.5) * 18;

      let R = 180;
      let G = 108;
      let B = 68;

      if (layer === "optical") {
        const rock = tc === 2 ? -22 : tc === 0 ? 14 : 0;
        const elev = input.heightM[hj * hn + hi] ?? 0;
        const hShade = clamp((elev + 20) * 0.45, -18, 32);
        const optGrain = (rnd() - 0.5) * 18;
        R = 178 + rock + hShade + optGrain;
        G = 105 + rock * 0.7 + hShade * 0.65 + optGrain * 0.7;
        B = 64 + rock * 0.5 + hShade * 0.4 + optGrain * 0.5;
      } else if (layer === "slope") {
        if (slopeDeg < 8) {
          R = 38;
          G = 185;
          B = 110;
        } else if (slopeDeg < 18) {
          R = 230;
          G = 195;
          B = 45;
        } else if (slopeDeg < 26) {
          R = 245;
          G = 120;
          B = 35;
        } else {
          R = 235;
          G = 42;
          B = 75;
        }
        R += grain * 0.4;
        G += grain * 0.4;
      } else if (layer === "thermal") {
        if (tc === 0) {
          R = 48;
          G = 105;
          B = 200;
        } else if (tc === 1) {
          R = 215;
          G = 155;
          B = 60;
        } else {
          R = 245;
          G = 78;
          B = 45;
        }
      } else if (layer === "radiation") {
        const t = clamp((svf - 0.5) / 0.5, 0, 1);
        R = 35 + t * 215;
        G = 215 - t * 145;
        B = 225 - t * 35;
      } else if (layer === "hydration") {
        [R, G, B] = hydrationRgb(hyd, input.hydrationMin, input.hydrationMax);
      } else if (layer === "hydration_unc") {
        [R, G, B] = hydrationUncRgb(hydUnc, input.hydrationUncMax);
      }

      const p = idx * 4;
      data[p] = clamp(R, 0, 255);
      data[p + 1] = clamp(G, 0, 255);
      data[p + 2] = clamp(B, 0, 255);
      data[p + 3] = 255;
    }
  }
}

/** Fetches and decodes an 8-bit grayscale PNG raster in the browser via Canvas2D. */
export async function fetchGrayscalePng(url: string, signal?: AbortSignal): Promise<GrayscaleRaster> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("2D canvas context unavailable for PNG raster decode");
    ctx.drawImage(bitmap, 0, 0);
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const out = new Uint8Array(width * height);
    for (let i = 0; i < out.length; i++) {
      out[i] = rgba[i * 4];
    }
    return { width, height, data: out };
  } finally {
    bitmap.close();
  }
}
