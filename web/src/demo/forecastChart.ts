import type { Decision } from "@th/shared";
import type { ChartModel, ChartPoint } from "../hud/stormForecast";

/**
 * Animated take of the Storm Nowcaster fan chart for the storm alert slide: axes, the observed opacity dots, the
 * median forecast line growing to the right, the q10-q90 band opening, the storm threshold line and the Go/No-Go
 * stamp. Pure drawing from `t` seconds after the item starts (the same `t` always gives the same frame).
 */

const AMBER = "#ffb36b";
const BAND = "rgba(255, 179, 107, 0.26)";
const STORM = "#ff4d5e";
const INK = "rgba(243, 236, 227, 0.85)";

/** Seconds at which each stage of the chart starts. */
export const FORECAST_TIMING = { axes: 0, observed: 0.6, median: 3, band: 4.2, stamp: 6.2 } as const;

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const ease = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);

/** Points of a polyline up to the fraction `u` of its length (the last segment is cut). */
export function partialLine(points: readonly ChartPoint[], u: number): ChartPoint[] {
  if (points.length < 2 || u >= 1) return points.slice();
  if (u <= 0) return points.slice(0, 1);
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lens.push(l);
    total += l;
  }
  let left = u * total;
  const out: ChartPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (left >= lens[i - 1]) {
      out.push(points[i]);
      left -= lens[i - 1];
    } else {
      const k = lens[i - 1] > 0 ? left / lens[i - 1] : 0;
      out.push({ x: points[i - 1].x + (points[i].x - points[i - 1].x) * k, y: points[i - 1].y + (points[i].y - points[i - 1].y) * k });
      break;
    }
  }
  return out;
}

const VERDICT_LABEL: Record<Decision["verdict"], { text: string; color: string }> = {
  go: { text: "GO", color: "#5fe39a" },
  go_with_changes: { text: "GO WITH CHANGES", color: "#ffb800" },
  no_go: { text: "NO-GO", color: STORM },
};

export function drawForecastAnimated(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  model: ChartModel,
  verdict: Decision["verdict"],
  t: number,
): void {
  const pad = { l: 56, r: 24, t: 20, b: 54 };
  const X = (x: number) => pad.l + x * (w - pad.l - pad.r);
  const Y = (y: number) => pad.t + y * (h - pad.t - pad.b);
  ctx.clearRect(0, 0, w, h);
  ctx.font = "600 17px Rajdhani, sans-serif";
  ctx.lineWidth = 1;

  // Axes and opacity labels
  ctx.globalAlpha = ease(t / 0.6);
  ctx.fillStyle = INK;
  ctx.textAlign = "right";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  for (const tau of [0, Math.round(model.yMax / 2), Math.round(model.yMax)]) {
    const y = Y(1 - tau / model.yMax);
    ctx.fillText(String(tau), pad.l - 8, y + 5);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("dust opacity (tau)", 0, 0);
  ctx.restore();
  ctx.textAlign = "center";
  for (const tk of model.ticks) ctx.fillText(tk.label, X(tk.x), h - 28);
  ctx.fillText("sol (observed, then forecast horizon)", (pad.l + w - pad.r) / 2, h - 6);

  // Forecast origin
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(X(model.originX), pad.t);
  ctx.lineTo(X(model.originX), h - pad.b);
  ctx.stroke();
  ctx.setLineDash([]);

  // Storm threshold line, drawn left to right
  const stormU = ease((t - 0.4) / 1.2);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = STORM;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(X(0), Y(model.stormY));
  ctx.lineTo(X(stormU), Y(model.stormY));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = STORM;
  ctx.textAlign = "left";
  if (stormU > 0.9) ctx.fillText("storm level", X(0) + 6, Y(model.stormY) - 7);

  // q10-q90 band opens from the origin to the right
  const bandU = ease((t - FORECAST_TIMING.band) / 1.8);
  if (bandU > 0 && model.band.length > 2) {
    const n = model.band.length / 2;
    const upper = model.band.slice(0, n);
    const lower = model.band.slice(n).reverse();
    const cutU = partialLine(upper, bandU);
    const cutL = partialLine(lower, bandU);
    ctx.fillStyle = BAND;
    ctx.beginPath();
    [...cutU, ...cutL.reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.closePath();
    ctx.fill();
  }

  // Observed dots appear one after another
  ctx.fillStyle = "#f3ece3";
  model.observed.forEach((p, i) => {
    const a = clamp01((t - FORECAST_TIMING.observed - i * 0.22) / 0.3);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 3 + 3 * (1 - a), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Median forecast line grows from the last observation
  const medU = ease((t - FORECAST_TIMING.median) / 2.2);
  if (medU > 0) {
    const line = [...model.observed.slice(-1), ...model.median];
    const part = partialLine(line, medU);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    part.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.stroke();
    const tip = part[part.length - 1];
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(X(tip.x), Y(tip.y), 6 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Verdict stamp
  const stampA = ease((t - FORECAST_TIMING.stamp) / 0.5);
  if (stampA > 0) {
    const v = VERDICT_LABEL[verdict];
    ctx.save();
    ctx.globalAlpha = stampA;
    ctx.translate(w - pad.r - 8, pad.t + 36);
    ctx.rotate(-0.06);
    ctx.scale(1 + (1 - stampA) * 0.5, 1 + (1 - stampA) * 0.5);
    ctx.font = "700 34px Rajdhani, sans-serif";
    const tw = ctx.measureText(v.text).width;
    ctx.strokeStyle = v.color;
    ctx.fillStyle = v.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-tw - 14, -30, tw + 24, 44);
    ctx.textAlign = "right";
    ctx.fillText(v.text, -2, 3);
    ctx.restore();
  }
}
