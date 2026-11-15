import { decide, directTransmission, ENV_LIMITS, type Decision, type StormForecast } from "@th/shared";
import { apiUrl } from "../api";

/** One replayed sol with the observed opacity (when measured). */
export interface ReplayRow {
  sol: number;
  observed_tau: number | null;
}

export interface StormForecastData {
  forecast_sol: number;
  forecast_note: string;
  storm_level: number;
  forecast: StormForecast[];
  replay: ReplayRow[];
  /** Held-out coverage of the nominal 80 % interval per horizon (1..3), when the file reports it. */
  coverage80: Array<number | null>;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartModel {
  observed: ChartPoint[];
  median: ChartPoint[];
  /** Polygon: q90 left to right, then q10 right to left. */
  band: ChartPoint[];
  stormY: number;
  /** x position of the forecast origin (last observed sol). */
  originX: number;
  yMax: number;
  ticks: Array<{ x: number; label: string }>;
}

const OBSERVED_WINDOW_SOLS = 10;

/** Validates the JSON produced by tools/storm and returns the fields the HUD needs. */
export function parseStormForecast(raw: unknown): StormForecastData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.forecast) || !Array.isArray(r.replay_my34)) return null;
  const forecast: StormForecast[] = [];
  for (const f of r.forecast as Array<Record<string, unknown>>) {
    const { horizonSol, q10, q50, q90 } = f;
    if (![horizonSol, q10, q50, q90].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
    forecast.push({ horizonSol: horizonSol as number, q10: q10 as number, q50: q50 as number, q90: q90 as number });
  }
  if (forecast.length === 0) return null;
  forecast.sort((a, b) => a.horizonSol - b.horizonSol);
  const replay: ReplayRow[] = (r.replay_my34 as Array<Record<string, unknown>>)
    .filter((row) => typeof row.sol === "number")
    .map((row) => ({
      sol: row.sol as number,
      observed_tau: typeof row.observed_tau === "number" && Number.isFinite(row.observed_tau) ? row.observed_tau : null,
    }));
  const horizons =
    (r.validation as { horizons?: Record<string, { interval_80_coverage?: number }> } | undefined)?.horizons ?? {};
  const coverage80 = [1, 2, 3].map((h) => {
    const c = horizons[String(h)]?.interval_80_coverage;
    return typeof c === "number" ? c : null;
  });
  return {
    forecast_sol: typeof r.forecast_sol === "number" ? r.forecast_sol : (replay[replay.length - 1]?.sol ?? 0),
    forecast_note: typeof r.forecast_note === "string" ? r.forecast_note : "",
    storm_level: typeof r.storm_level === "number" ? r.storm_level : ENV_LIMITS.tauVisibility,
    forecast,
    replay,
    coverage80,
  };
}

export async function fetchStormForecast(): Promise<StormForecastData | null> {
  try {
    const res = await fetch(apiUrl("/data/env/storm_forecast.json"));
    if (!res.ok) return null;
    return parseStormForecast(await res.json());
  } catch {
    return null;
  }
}

/** Design assumptions shared with the server `evaluate_eva_weather` tool. */
export const EVA_ASSUMPTIONS = {
  durationS: 120 * 60,
  returnToShelterS: 25 * 60,
  solarAreaM2: 400,
  solarEfficiency: 0.22,
  toaWm2: 590,
  demandW: 18000,
  mu: 0.7,
};

/** Chance-constrained EVA verdict at the pessimistic (q90) end of the forecast. */
export function stormVerdict(data: StormForecastData, currentTau?: number): Decision {
  const a = EVA_ASSUMPTIONS;
  const peakW = a.solarAreaM2 * a.toaWm2 * a.solarEfficiency;
  return decide(
    data.forecast,
    { durationS: a.durationS, returnToShelterS: a.returnToShelterS },
    ENV_LIMITS,
    (tau) => peakW * directTransmission(tau, a.mu),
    a.demandW,
    undefined,
    currentTau,
  );
}

/**
 * Maps the forecast to chart coordinates in the unit square (x 0..1 left to right, y 0..1 top to bottom).
 * The x axis covers the last observed sols and the forecast horizons; y is dust opacity.
 */
export function buildChartModel(data: StormForecastData): ChartModel {
  const observedRows = data.replay
    .filter(
      (r) =>
        r.observed_tau !== null && r.sol <= data.forecast_sol && r.sol > data.forecast_sol - OBSERVED_WINDOW_SOLS,
    )
    .sort((a, b) => a.sol - b.sol);
  const maxH = Math.max(...data.forecast.map((f) => f.horizonSol));
  const firstSol = data.forecast_sol - OBSERVED_WINDOW_SOLS + 1;
  const lastSol = data.forecast_sol + maxH;
  const span = lastSol - firstSol;
  const yMax =
    Math.max(
      data.storm_level * 1.25,
      ...data.forecast.map((f) => f.q90),
      ...observedRows.map((r) => r.observed_tau as number),
    ) * 1.1;
  const px = (sol: number) => (sol - firstSol) / span;
  const py = (tau: number) => 1 - tau / yMax;

  const observed = observedRows.map((r) => ({ x: px(r.sol), y: py(r.observed_tau as number) }));
  const median = data.forecast.map((f) => ({ x: px(data.forecast_sol + f.horizonSol), y: py(f.q50) }));
  const upper = data.forecast.map((f) => ({ x: px(data.forecast_sol + f.horizonSol), y: py(f.q90) }));
  const lower = data.forecast.map((f) => ({ x: px(data.forecast_sol + f.horizonSol), y: py(f.q10) })).reverse();
  const ticks = [
    { x: px(data.forecast_sol), label: `${data.forecast_sol}` },
    ...data.forecast.map((f) => ({ x: px(data.forecast_sol + f.horizonSol), label: `+${f.horizonSol}` })),
  ];
  return {
    observed,
    median,
    band: [...upper, ...lower],
    stormY: py(data.storm_level),
    originX: px(data.forecast_sol),
    yMax,
    ticks,
  };
}

const AMBER = "#ffb36b";
const BAND = "rgba(255, 179, 107, 0.22)";
const STORM = "#ff4d5e";
const INK = "rgba(243, 236, 227, 0.7)";

/** Draws the fan chart: observed dots, median line, q10-q90 band and the storm-level line. */
export function drawStormChart(canvas: HTMLCanvasElement, model: ChartModel): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = { l: 24, r: 8, t: 6, b: 16 };
  const X = (x: number) => pad.l + x * (w - pad.l - pad.r);
  const Y = (y: number) => pad.t + y * (h - pad.t - pad.b);
  ctx.clearRect(0, 0, w, h);
  ctx.font = "9px monospace";
  ctx.lineWidth = 1;

  ctx.fillStyle = INK;
  ctx.textAlign = "right";
  for (const tau of [0, Math.round(model.yMax / 2), Math.round(model.yMax)]) {
    ctx.fillText(String(tau), pad.l - 3, Y(1 - tau / model.yMax) + 3);
  }

  ctx.strokeStyle = STORM;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(X(0), Y(model.stormY));
  ctx.lineTo(X(1), Y(model.stormY));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(X(model.originX), pad.t);
  ctx.lineTo(X(model.originX), h - pad.b);
  ctx.stroke();

  if (model.band.length > 2) {
    ctx.fillStyle = BAND;
    ctx.beginPath();
    model.band.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.closePath();
    ctx.fill();
  }

  const line = [...model.observed.slice(-1), ...model.median];
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  line.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
  ctx.stroke();

  ctx.fillStyle = "#f3ece3";
  for (const p of model.observed) {
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  for (const tk of model.ticks) ctx.fillText(tk.label, X(tk.x), h - 4);
}
