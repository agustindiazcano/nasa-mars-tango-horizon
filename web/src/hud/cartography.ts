/**
 * NASA/USGS-style planetary map of the Gale Crater scene: hypsometric tint, hillshade, contours, graticule,
 * scale bar, north arrow, title block, legend and labelled symbols. The static layer is rendered once into an
 * offscreen canvas; only the dynamic symbols (fleet, drones, crew, route, astronaut) are redrawn per update.
 * All numeric helpers are pure and unit-tested; the canvas code is a thin consumer of them.
 */
import {
  BASE_ORIGIN,
  LAUNCH_SITE_COORD,
  MISSION_SITES,
  RESCUE_PIT,
  RESCUE_SITE,
  type CrewSnapshot,
  type UnitSnapshot,
} from "@th/shared";

// ---------------------------------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------------------------------

export type Rgb = [number, number, number];

/** Hypsometric stops (t in 0..1 of the elevation range): low basin blue-green, plains tan, slopes brown, peaks pale. */
const HYPSO_STOPS: Array<{ t: number; c: Rgb }> = [
  { t: 0.0, c: [60, 94, 120] },
  { t: 0.16, c: [96, 140, 126] },
  { t: 0.34, c: [168, 178, 120] },
  { t: 0.52, c: [222, 200, 130] },
  { t: 0.7, c: [205, 150, 96] },
  { t: 0.86, c: [160, 100, 74] },
  { t: 1.0, c: [236, 226, 214] },
];

/** Hypsometric tint for a normalized elevation (clamped to 0..1). */
export function hypsometricColor(t: number): Rgb {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < HYPSO_STOPS.length; i++) {
    const a = HYPSO_STOPS[i - 1];
    const b = HYPSO_STOPS[i];
    if (x <= b.t) {
      const k = (x - a.t) / (b.t - a.t);
      return [
        Math.round(a.c[0] + (b.c[0] - a.c[0]) * k),
        Math.round(a.c[1] + (b.c[1] - a.c[1]) * k),
        Math.round(a.c[2] + (b.c[2] - a.c[2]) * k),
      ];
    }
  }
  return HYPSO_STOPS[HYPSO_STOPS.length - 1].c;
}

/**
 * Hillshade (0..1) at an interior grid cell from a row-major height grid (metres). Rows grow toward south (+z),
 * columns toward east (+x). Azimuth is clockwise from north, altitude in degrees above the horizon.
 */
export function hillshadeAt(
  grid: ArrayLike<number>,
  n: number,
  col: number,
  row: number,
  cellM: number,
  azimuthDeg = 315,
  altitudeDeg = 40,
  zFactor = 1.6,
): number {
  const c0 = Math.max(0, col - 1);
  const c1 = Math.min(n - 1, col + 1);
  const r0 = Math.max(0, row - 1);
  const r1 = Math.min(n - 1, row + 1);
  const dzdx = ((grid[row * n + c1] - grid[row * n + c0]) / ((c1 - c0) * cellM)) * zFactor;
  // North is up, rows grow south: the northward slope is minus the row gradient.
  const dzdy = (-(grid[r1 * n + col] - grid[r0 * n + col]) / ((r1 - r0) * cellM)) * zFactor;
  const slope = Math.atan(Math.hypot(dzdx, dzdy));
  const aspect = Math.atan2(dzdy, -dzdx);
  const az = ((360 - azimuthDeg + 90) * Math.PI) / 180;
  const zen = ((90 - altitudeDeg) * Math.PI) / 180;
  const s = Math.cos(zen) * Math.cos(slope) + Math.sin(zen) * Math.sin(slope) * Math.cos(az - aspect);
  return Math.min(1, Math.max(0, s));
}

/** Contour levels (metres) at multiples of `interval` inside [min, max]. */
export function contourLevels(min: number, max: number, interval: number): number[] {
  const out: number[] = [];
  const first = Math.ceil(min / interval) * interval;
  for (let v = first; v <= max + 1e-9; v += interval) out.push(Math.round(v * 1e6) / 1e6 + 0);
  return out;
}

/** True when the contour at `level` is an index contour (multiple of `indexInterval`). */
export function isIndexContour(level: number, indexInterval: number): boolean {
  return Math.abs(level / indexInterval - Math.round(level / indexInterval)) < 1e-9;
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Marching squares: line segments (in grid coordinates) of the iso-line `level` over a row-major n by n grid. */
export function contourSegments(grid: ArrayLike<number>, n: number, level: number): Segment[] {
  const out: Segment[] = [];
  const lerpT = (a: number, b: number) => (level - a) / (b - a);
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const a = grid[r * n + c]; // top-left
      const b = grid[r * n + c + 1]; // top-right
      const d = grid[(r + 1) * n + c]; // bottom-left
      const e = grid[(r + 1) * n + c + 1]; // bottom-right
      let mask = 0;
      if (a >= level) mask |= 1;
      if (b >= level) mask |= 2;
      if (e >= level) mask |= 4;
      if (d >= level) mask |= 8;
      if (mask === 0 || mask === 15) continue;
      const top = { x: c + lerpT(a, b), y: r };
      const right = { x: c + 1, y: r + lerpT(b, e) };
      const bottom = { x: c + lerpT(d, e), y: r + 1 };
      const left = { x: c, y: r + lerpT(a, d) };
      const seg = (p: { x: number; y: number }, q: { x: number; y: number }) =>
        out.push({ x0: p.x, y0: p.y, x1: q.x, y1: q.y });
      switch (mask) {
        case 1:
        case 14:
          seg(left, top);
          break;
        case 2:
        case 13:
          seg(top, right);
          break;
        case 3:
        case 12:
          seg(left, right);
          break;
        case 4:
        case 11:
          seg(right, bottom);
          break;
        case 6:
        case 9:
          seg(top, bottom);
          break;
        case 7:
        case 8:
          seg(left, bottom);
          break;
        case 5: // saddle
          seg(left, top);
          seg(right, bottom);
          break;
        case 10: // saddle
          seg(top, right);
          seg(left, bottom);
          break;
      }
    }
  }
  return out;
}

/** Rounds `x` up to a "nice" 1, 2 or 5 times a power of ten. */
export function niceNumber(x: number): number {
  if (x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / p;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * p;
}

/** Graticule tick values (degrees) inside [min, max] with a nice step giving about `target` ticks. */
export function graticuleTicks(min: number, max: number, target = 5): { step: number; values: number[] } {
  const step = niceNumber((max - min) / Math.max(1, target));
  const values: number[] = [];
  const first = Math.ceil(min / step - 1e-9) * step;
  for (let v = first; v <= max + 1e-9; v += step) values.push(Math.round(v / step) * step);
  return { step, values };
}

/** Longest nice scale-bar length (m, 1/2/5 x 10^k) that fits in `maxPx` at `metersPerPx`. */
export function scaleBarMeters(metersPerPx: number, maxPx: number): number {
  const maxM = metersPerPx * maxPx;
  const p = Math.pow(10, Math.floor(Math.log10(maxM)));
  for (const f of [5, 2, 1]) if (f * p <= maxM) return f * p;
  return p / 2;
}

/** Formats a latitude (degrees, south negative) as `4.7450 S`. */
export function formatLatitude(lat: number, decimals = 4): string {
  return `${Math.abs(lat).toFixed(decimals)}° ${lat < 0 ? "S" : "N"}`;
}

/** Formats an east longitude as `137.4000 E`. */
export function formatLongitude(lon: number, decimals = 4): string {
  return `${Math.abs(lon).toFixed(decimals)}° ${lon < 0 ? "W" : "E"}`;
}

/** Nominal print scale denominator at 96 dpi for a map drawn at `metersPerPx`. */
export function nominalScaleDenominator(metersPerPx: number): number {
  return Math.round(metersPerPx / 0.000264583 / 100) * 100;
}

/** Linear projection between world metres (x east, z south) and map pixels inside a square neatline. */
export class MapProjection {
  constructor(
    readonly sizeM: number,
    readonly originPx: { x: number; y: number },
    readonly mapPx: number,
  ) {}
  get metersPerPx(): number {
    return this.sizeM / this.mapPx;
  }
  toPx(x: number, z: number): { x: number; y: number } {
    return {
      x: this.originPx.x + (x / this.sizeM + 0.5) * this.mapPx,
      y: this.originPx.y + (z / this.sizeM + 0.5) * this.mapPx,
    };
  }
  toWorld(px: number, py: number): { x: number; z: number } {
    return {
      x: ((px - this.originPx.x) / this.mapPx - 0.5) * this.sizeM,
      z: ((py - this.originPx.y) / this.mapPx - 0.5) * this.sizeM,
    };
  }
}

export type SymbolKind =
  | "base"
  | "launch"
  | "rescue"
  | "station"
  | "unit"
  | "drone"
  | "crew"
  | "astronaut";

export interface MapSymbol {
  id: string;
  kind: SymbolKind;
  label: string;
  x: number;
  z: number;
  color: string;
}

export interface MapDynamicInput {
  fleet: ReadonlyArray<Pick<UnitSnapshot, "id" | "kind" | "x" | "z">>;
  crew: ReadonlyArray<Pick<CrewSnapshot, "name" | "x" | "z" | "status">>;
  astronaut: { x: number; z: number };
}

export const CREW_STATUS_COLOR: Record<string, string> = {
  nominal: "#1c7a3a",
  recovering: "#b7860b",
  incapacitated: "#c1121f",
  evacuating: "#c1121f",
};

/** Fixed places: base, launch complex, rescue site and pit, science stations S1 to S4. */
export function staticSymbols(): MapSymbol[] {
  return [
    { id: "base", kind: "base", label: "BASE", x: BASE_ORIGIN.x, z: BASE_ORIGIN.z, color: "#1d1d1d" },
    { id: "launch", kind: "launch", label: "LAUNCH COMPLEX", x: LAUNCH_SITE_COORD.x, z: LAUNCH_SITE_COORD.z, color: "#b5360c" },
    { id: "rescue", kind: "rescue", label: `RESCUE SITE / PIT ${RESCUE_PIT.depthM} m`, x: RESCUE_SITE.x, z: RESCUE_SITE.z, color: "#c1121f" },
    ...MISSION_SITES.map<MapSymbol>((s) => ({ id: s.id, kind: "station", label: s.id, x: s.x, z: s.z, color: "#0b4f9c" })),
  ];
}

/** Moving symbols: fleet units, drones, the four crew members by callsign and the player astronaut. */
export function dynamicSymbols(input: MapDynamicInput): MapSymbol[] {
  const out: MapSymbol[] = [];
  for (const u of input.fleet) {
    const drone = u.kind === "drone";
    out.push({ id: u.id, kind: drone ? "drone" : "unit", label: u.id, x: u.x, z: u.z, color: drone ? "#5b2a86" : "#7a4a00" });
  }
  for (const c of input.crew) {
    out.push({ id: c.name, kind: "crew", label: c.name, x: c.x, z: c.z, color: CREW_STATUS_COLOR[c.status] ?? "#c1121f" });
  }
  out.push({ id: "astronaut", kind: "astronaut", label: "YOU", x: input.astronaut.x, z: input.astronaut.z, color: "#00778b" });
  return out;
}

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Greedy label placement: each label tries the right side of its anchor, then left, above and below, with growing
 * offsets, and takes the first position that does not overlap a placed label or the map neatline. Returns top-left
 * boxes in the same order as the input.
 */
export function placeLabels(
  anchors: ReadonlyArray<{ x: number; y: number; w: number; h: number }>,
  bounds: LabelBox,
  gap = 6,
): LabelBox[] {
  const placed: LabelBox[] = [];
  const overlaps = (a: LabelBox, b: LabelBox) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const inside = (b: LabelBox) =>
    b.x >= bounds.x && b.y >= bounds.y && b.x + b.w <= bounds.x + bounds.w && b.y + b.h <= bounds.y + bounds.h;
  for (const a of anchors) {
    let chosen: LabelBox | null = null;
    for (let ring = 0; ring < 6 && !chosen; ring++) {
      const d = gap + ring * (a.h + 1);
      const candidates: LabelBox[] = [
        { x: a.x + d, y: a.y - a.h / 2 - ring * 2, w: a.w, h: a.h },
        { x: a.x - d - a.w, y: a.y - a.h / 2 - ring * 2, w: a.w, h: a.h },
        { x: a.x - a.w / 2, y: a.y - d - a.h, w: a.w, h: a.h },
        { x: a.x - a.w / 2, y: a.y + d, w: a.w, h: a.h },
        { x: a.x + d, y: a.y + ring * (a.h + 1), w: a.w, h: a.h },
        { x: a.x - d - a.w, y: a.y + ring * (a.h + 1), w: a.w, h: a.h },
      ];
      chosen = candidates.find((b) => inside(b) && !placed.some((p) => overlaps(b, p))) ?? null;
    }
    placed.push(chosen ?? { x: a.x + gap, y: a.y - a.h / 2, w: a.w, h: a.h });
  }
  return placed;
}

// ---------------------------------------------------------------------------------------------------------------------
// Canvas renderer
// ---------------------------------------------------------------------------------------------------------------------

export interface CartographyTerrain {
  readonly sizeM: number;
  readonly meta: {
    product_id: string;
    size_m: number;
    height_px: number;
    z_min_m: number;
    z_max_m: number;
    center_lat: number;
    center_lon_e: number;
  };
  readonly midElevationM: number;
  readonly realRastersLoaded: boolean;
  heightAt(x: number, z: number): number;
  toLonLat(x: number, z: number): { lon: number; lat: number };
}

export interface CartographyRoute {
  algorithm: string;
  points: ReadonlyArray<{ x: number; z: number }>;
}

/** A route chosen by one agent: drawn as a coloured line with an entry in the map legend. */
export interface AgentRoute {
  label: string;
  color: string;
  points: ReadonlyArray<{ x: number; z: number }>;
  dashed?: boolean;
}

export const MAP_WIDTH = 1240;
export const MAP_HEIGHT = 780;
const NEATLINE = { x: 56, y: 40, size: 700 };
const SIDEBAR_X = NEATLINE.x + NEATLINE.size + 48;
const CONTOUR_M = 25;
const INDEX_CONTOUR_M = 100;
const INK = "#1b1b1b";
const PAPER = "#f4efe4";
const FONT = "Rajdhani, 'IBM Plex Mono', 'Segoe UI', sans-serif";
const MONO = "'IBM Plex Mono', Consolas, monospace";

/** Square map area (neatline plus a small margin) in canvas pixels, for crops that show the map without the sidebar. */
export const MAP_CROP = { x: 40, y: 24, size: 732 };

export class CartographyRenderer {
  readonly projection: MapProjection;
  private staticLayer: HTMLCanvasElement | null = null;
  private staticKey = "";

  constructor(private readonly terrain: CartographyTerrain) {
    this.projection = new MapProjection(terrain.sizeM, { x: NEATLINE.x, y: NEATLINE.y }, NEATLINE.size);
  }

  /** Renders (or reuses) the cached base map and draws the dynamic layer on `ctx`. */
  /** Multiplies symbol, label and route-legend sizes (above 1 for slides that are read from a distance). */
  labelScale = 1;

  draw(ctx: CanvasRenderingContext2D, input: MapDynamicInput, route: CartographyRoute | null, agentRoutes: readonly AgentRoute[] = []): void {
    const key = `${this.terrain.meta.product_id}|${this.terrain.realRastersLoaded}`;
    if (!this.staticLayer || this.staticKey !== key) {
      this.staticLayer = this.renderStatic();
      this.staticKey = key;
    }
    ctx.drawImage(this.staticLayer, 0, 0);
    this.drawDynamic(ctx, input, route, agentRoutes);
  }

  private renderStatic(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    const n = NEATLINE.size;
    const mpp = this.projection.metersPerPx;
    const abs = new Float32Array(n * n);
    let lo = Infinity;
    let hi = -Infinity;
    for (let r = 0; r < n; r++) {
      const z = ((r + 0.5) / n - 0.5) * this.terrain.sizeM;
      for (let c = 0; c < n; c++) {
        const x = ((c + 0.5) / n - 0.5) * this.terrain.sizeM;
        const h = this.terrain.heightAt(x, z) + this.terrain.midElevationM;
        abs[r * n + c] = h;
        if (h < lo) lo = h;
        if (h > hi) hi = h;
      }
    }
    // Light smoothing for contours and shading (the DEM is noisy at pixel scale).
    const smooth = new Float32Array(n * n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        let s = 0;
        let k = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = Math.min(n - 1, Math.max(0, r + dr));
            const cc = Math.min(n - 1, Math.max(0, c + dc));
            s += abs[rr * n + cc];
            k++;
          }
        }
        smooth[r * n + c] = s / k;
      }
    }

    const img = ctx.createImageData(n, n);
    const span = Math.max(1, hi - lo);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const [cr, cg, cb] = hypsometricColor((smooth[r * n + c] - lo) / span);
        const shade = hillshadeAt(smooth, n, c, r, mpp, 315, 38, 2.6);
        const k = 0.42 + shade * 1.0;
        const o = (r * n + c) * 4;
        img.data[o] = Math.min(255, cr * k);
        img.data[o + 1] = Math.min(255, cg * k);
        img.data[o + 2] = Math.min(255, cb * k);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, NEATLINE.x, NEATLINE.y);

    // Contours.
    ctx.save();
    ctx.beginPath();
    ctx.rect(NEATLINE.x, NEATLINE.y, n, n);
    ctx.clip();
    const levels = contourLevels(lo, hi, CONTOUR_M);
    const indexLabels: Array<{ x: number; y: number; level: number }> = [];
    for (const level of levels) {
      const index = isIndexContour(level, INDEX_CONTOUR_M);
      const segs = contourSegments(smooth, n, level);
      ctx.strokeStyle = index ? "rgba(70,38,20,0.9)" : "rgba(90,52,30,0.55)";
      ctx.lineWidth = index ? 1.1 : 0.55;
      ctx.beginPath();
      for (const s of segs) {
        ctx.moveTo(NEATLINE.x + s.x0, NEATLINE.y + s.y0);
        ctx.lineTo(NEATLINE.x + s.x1, NEATLINE.y + s.y1);
      }
      ctx.stroke();
      if (index && segs.length > 0) {
        // Label a few well separated segments of each index contour.
        let last: { x: number; y: number } | null = null;
        let count = 0;
        for (let i = 0; i < segs.length && count < 3; i += 7) {
          const s = segs[i];
          if (s.x0 < 30 || s.y0 < 20 || s.x0 > n - 30 || s.y0 > n - 20) continue;
          if (last && Math.hypot(s.x0 - last.x, s.y0 - last.y) < 220) continue;
          indexLabels.push({ x: NEATLINE.x + s.x0, y: NEATLINE.y + s.y0, level });
          last = { x: s.x0, y: s.y0 };
          count++;
        }
      }
    }
    ctx.font = `600 10px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const l of indexLabels) {
      const text = `${Math.round(l.level)}`;
      const w = ctx.measureText(text).width + 4;
      ctx.fillStyle = "rgba(244,239,228,0.85)";
      ctx.fillRect(l.x - w / 2, l.y - 6, w, 12);
      ctx.fillStyle = "rgb(70,38,20)";
      ctx.fillText(text, l.x, l.y);
    }
    ctx.restore();

    this.drawGraticule(ctx);
    this.drawSidebar(ctx, lo, hi);
    return canvas;
  }

  private drawGraticule(ctx: CanvasRenderingContext2D): void {
    const t = this.terrain;
    const half = t.sizeM / 2;
    const nw = t.toLonLat(-half, -half);
    const se = t.toLonLat(half, half);
    const lons = graticuleTicks(nw.lon, se.lon, 5);
    const lats = graticuleTicks(se.lat, nw.lat, 5);
    const x0 = NEATLINE.x;
    const y0 = NEATLINE.y;
    const n = NEATLINE.size;
    const px = (lon: number) => x0 + ((lon - nw.lon) / (se.lon - nw.lon)) * n;
    const py = (lat: number) => y0 + ((nw.lat - lat) / (nw.lat - se.lat)) * n;

    ctx.save();
    ctx.strokeStyle = "rgba(20,20,20,0.45)";
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (const lon of lons.values) {
      ctx.moveTo(px(lon), y0);
      ctx.lineTo(px(lon), y0 + n);
    }
    for (const lat of lats.values) {
      ctx.moveTo(x0, py(lat));
      ctx.lineTo(x0 + n, py(lat));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Neatline with a thin double frame and tick marks.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x0, y0, n, n);
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x0 - 5, y0 - 5, n + 10, n + 10);
    ctx.fillStyle = INK;
    ctx.font = `500 11px ${MONO}`;
    const decimals = lons.step < 0.001 ? 4 : lons.step < 0.01 ? 3 : 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const lon of lons.values) {
      ctx.beginPath();
      ctx.moveTo(px(lon), y0 + n);
      ctx.lineTo(px(lon), y0 + n + 5);
      ctx.moveTo(px(lon), y0);
      ctx.lineTo(px(lon), y0 - 5);
      ctx.stroke();
      ctx.fillText(formatLongitude(lon, decimals), px(lon), y0 + n + 9);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const lat of lats.values) {
      ctx.beginPath();
      ctx.moveTo(x0, py(lat));
      ctx.lineTo(x0 - 5, py(lat));
      ctx.moveTo(x0 + n, py(lat));
      ctx.lineTo(x0 + n + 5, py(lat));
      ctx.stroke();
      ctx.fillText(formatLatitude(lat, decimals), x0 - 9, py(lat));
    }
    ctx.restore();
  }

  private drawSidebar(ctx: CanvasRenderingContext2D, lo: number, hi: number): void {
    const t = this.terrain;
    const x = SIDEBAR_X;
    const w = MAP_WIDTH - x - 28;
    let y = NEATLINE.y;
    ctx.save();
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Title block.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x, y, w, 112);
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText("Gale Crater, Mars - HiRISE DTM", x + 12, y + 10);
    ctx.font = `500 12px ${MONO}`;
    ctx.fillText(`Product: ${t.meta.product_id}`, x + 12, y + 42);
    ctx.fillText(`${t.meta.size_m} m x ${t.meta.size_m} m, ${t.meta.height_px} px DEM`, x + 12, y + 60);
    ctx.fillText(
      `Center ${formatLatitude(t.meta.center_lat, 3)}, ${formatLongitude(t.meta.center_lon_e, 3)}`,
      x + 12,
      y + 78,
    );
    ctx.fillText(`Hillshade az 315 / alt 40; relief ${Math.round(lo)} to ${Math.round(hi)} m`, x + 12, y + 94);
    y += 128;

    // Hypsometric legend.
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText("ELEVATION (m, areoid datum)", x, y);
    y += 20;
    const barW = w - 20;
    for (let i = 0; i < barW; i++) {
      const [r, g, b] = hypsometricColor(i / (barW - 1));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + i, y, 1, 14);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, barW, 14);
    ctx.fillStyle = INK;
    ctx.font = `500 11px ${MONO}`;
    for (let k = 0; k <= 4; k++) {
      const v = lo + ((hi - lo) * k) / 4;
      ctx.textAlign = k === 0 ? "left" : k === 4 ? "right" : "center";
      ctx.fillText(`${Math.round(v)}`, x + (barW * k) / 4, y + 18);
    }
    ctx.textAlign = "left";
    y += 44;
    ctx.fillText(`Contour interval ${CONTOUR_M} m; index contours every ${INDEX_CONTOUR_M} m (labeled)`, x, y);
    y += 28;

    // Symbol legend.
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText("SYMBOLS", x, y);
    y += 20;
    const rows: Array<{ kind: SymbolKind; color: string; text: string }> = [
      { kind: "base", color: "#1d1d1d", text: "Base" },
      { kind: "launch", color: "#b5360c", text: "Launch complex" },
      { kind: "rescue", color: "#c1121f", text: "Rescue site and pit" },
      { kind: "station", color: "#0b4f9c", text: "Science station S1-S4" },
      { kind: "unit", color: "#7a4a00", text: "Fleet unit" },
      { kind: "drone", color: "#5b2a86", text: "Drone" },
      { kind: "crew", color: "#1c7a3a", text: "Crew (green nominal, amber recovering, red injured)" },
      { kind: "astronaut", color: "#00778b", text: "You" },
    ];
    ctx.font = `500 12px ${MONO}`;
    for (const row of rows) {
      drawSymbol(ctx, row.kind, row.color, x + 9, y + 7, 1);
      ctx.fillStyle = INK;
      ctx.fillText(row.text, x + 26, y);
      y += 20;
    }
    ctx.strokeStyle = "#0a6f86";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x + 18, y + 7);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText("Active route", x + 26, y);

    // Scale bar and scale text, bottom of the sidebar.
    const mpp = this.projection.metersPerPx;
    const barM = scaleBarMeters(mpp, 240);
    const barPx = barM / mpp;
    const by = NEATLINE.y + NEATLINE.size - 60;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText("SCALE", x, by - 24);
    ctx.font = `500 11px ${MONO}`;
    ctx.fillText(`1:${nominalScaleDenominator(mpp).toLocaleString("en-US")} at 96 dpi; ${mpp.toFixed(2)} m per px`, x + 70, by - 22);
    ctx.fillStyle = INK;
    const seg = barPx / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? INK : PAPER;
      ctx.fillRect(x + i * seg, by, seg, 8);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, by, barPx, 8);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.fillText("0", x, by + 12);
    ctx.fillText(`${barM / 2 >= 1000 ? barM / 2000 : barM / 2}${barM / 2 >= 1000 ? " km" : ""}`, x + barPx / 2, by + 12);
    ctx.fillText(barM >= 1000 ? `${barM / 1000} km` : `${barM} m`, x + barPx, by + 12);

    // North arrow.
    const ax = x + w - 36;
    const ay = by - 34;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 22);
    ctx.lineTo(ax + 9, ay + 14);
    ctx.lineTo(ax, ay + 7);
    ctx.lineTo(ax - 9, ay + 14);
    ctx.closePath();
    ctx.fill();
    ctx.font = `700 15px ${FONT}`;
    ctx.textBaseline = "bottom";
    ctx.fillText("N", ax, ay - 24);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `500 10px ${MONO}`;
    ctx.fillStyle = "#4a4a4a";
    ctx.fillText("Data: NASA/USGS HiRISE DTM, MSL DAN, design sites.", x, NEATLINE.y + NEATLINE.size + 8);
    ctx.fillText("Local tangent plane projection, north up.", x, NEATLINE.y + NEATLINE.size + 22);
    ctx.restore();
  }

  private drawDynamic(ctx: CanvasRenderingContext2D, input: MapDynamicInput, route: CartographyRoute | null, agentRoutes: readonly AgentRoute[] = []): void {
    const proj = this.projection;
    const ks = this.labelScale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(NEATLINE.x - 2, NEATLINE.y - 2, NEATLINE.size + 4, NEATLINE.size + 4);
    ctx.clip();

    if (route && route.points.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 4.6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      route.points.forEach((p, i) => {
        const pt = proj.toPx(p.x, p.z);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.strokeStyle = "#0a6f86";
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // Routes chosen by the agents, one colour each, with a legend in the top-left corner of the map.
    agentRoutes.forEach((r) => {
      if (r.points.length < 2) return;
      ctx.setLineDash(r.dashed ? [9, 6] : []);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 4.2 * ks;
      ctx.beginPath();
      r.points.forEach((p, i) => {
        const pt = proj.toPx(p.x, p.z);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.6 * ks;
      ctx.stroke();
    });
    ctx.setLineDash([]);
    if (agentRoutes.length > 0) {
      ctx.font = `700 ${12 * ks}px ${MONO}`;
      const w = Math.max(...agentRoutes.map((r) => ctx.measureText(r.label).width)) + 44 * ks;
      const h = agentRoutes.length * 18 * ks + 10 * ks;
      ctx.fillStyle = "rgba(246,239,225,0.92)";
      ctx.fillRect(NEATLINE.x + 8, NEATLINE.y + 8, w, h);
      ctx.strokeStyle = "rgba(40,30,20,0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(NEATLINE.x + 8, NEATLINE.y + 8, w, h);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      agentRoutes.forEach((r, i) => {
        const y = NEATLINE.y + 8 + 14 * ks + i * 18 * ks;
        ctx.setLineDash(r.dashed ? [6, 4] : []);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3 * ks;
        ctx.beginPath();
        ctx.moveTo(NEATLINE.x + 16, y);
        ctx.lineTo(NEATLINE.x + 38 * ks, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#1d1d1d";
        ctx.fillText(r.label, NEATLINE.x + 44 * ks, y);
      });
    }

    const symbols = [...staticSymbols(), ...dynamicSymbols(input)];
    // Pit outline ring at the rescue site, to scale.
    const rp = proj.toPx(RESCUE_SITE.x, RESCUE_SITE.z);
    ctx.strokeStyle = "#c1121f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, Math.max(6, 18 / proj.metersPerPx), 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = `600 ${11 * ks}px ${MONO}`;
    const anchors = symbols.map((s) => {
      const p = proj.toPx(s.x, s.z);
      return { x: p.x, y: p.y, w: ctx.measureText(s.label).width + 6, h: 14 * ks };
    });
    const boxes = placeLabels(anchors, { x: NEATLINE.x + 2, y: NEATLINE.y + 2, w: NEATLINE.size - 4, h: NEATLINE.size - 4 });
    symbols.forEach((s, i) => {
      const a = anchors[i];
      drawSymbol(ctx, s.kind, s.color, a.x, a.y, 1.15 * ks);
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    symbols.forEach((s, i) => {
      const b = boxes[i];
      const a = anchors[i];
      // Leader line when the label was pushed away from its symbol.
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      if (Math.hypot(cx - a.x, cy - a.y) > 26) {
        ctx.strokeStyle = "rgba(20,20,20,0.6)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x < a.x ? b.x + b.w : b.x, cy);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(244,239,228,0.82)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = s.kind === "crew" || s.kind === "astronaut" ? s.color : INK;
      ctx.fillText(s.label, b.x + 3, b.y + b.h / 2 + 0.5);
    });
    ctx.restore();
  }
}

/** Draws one cartographic symbol centred at (x, y). */
export function drawSymbol(ctx: CanvasRenderingContext2D, kind: SymbolKind, color: string, x: number, y: number, k: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = color;
  ctx.beginPath();
  switch (kind) {
    case "base":
      ctx.rect(-5, -5, 10, 10);
      break;
    case "launch":
      ctx.moveTo(0, -7);
      ctx.lineTo(6, 5);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      break;
    case "rescue":
      ctx.rect(-2.2, -6.5, 4.4, 13);
      ctx.rect(-6.5, -2.2, 13, 4.4);
      break;
    case "station":
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      break;
    case "unit":
      ctx.rect(-4, -4, 8, 8);
      ctx.rotate(0);
      break;
    case "drone":
      ctx.moveTo(0, -6);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      break;
    case "crew":
      ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
      break;
    case "astronaut":
      for (let i = 0; i < 5; i++) {
        const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const a2 = a1 + Math.PI / 5;
        ctx.lineTo(Math.cos(a1) * 7, Math.sin(a1) * 7);
        ctx.lineTo(Math.cos(a2) * 3, Math.sin(a2) * 3);
      }
      ctx.closePath();
      break;
  }
  if (kind === "station") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}
