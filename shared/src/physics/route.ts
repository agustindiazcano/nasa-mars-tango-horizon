import { metabolicRateW, o2KgPerHour } from "./metabolic.js";

export interface Grid {
  n: number;
  cellM: number;
  z: Float32Array;       // elevation, length n*n, m
  terrain: Float32Array; // Pandolf terrain factor, length n*n
  doseRel: Float32Array; // sky view factor 0..1, length n*n
}

export interface RouteOpts {
  bodyKg: number;
  loadKg: number;
  speed: number;
  maxSlopeDeg: number;
  doseWeight: number;
}

export interface RouteResult {
  path: number[];
  distanceM: number;
  timeS: number;
  energyJ: number;
  o2Kg: number;
  meanSvf: number;
}

export interface AstarEdge {
  from: number;
  to: number;
  dx: number;
  dy: number;
  distM: number;
  riseM: number;
  slopeDeg: number;
}

export interface AstarResult {
  path: number[];
  totalCost: number;
  distanceM: number;
}

/**
 * Reusable 8-connected grid A* engine with pluggable edge cost and admissible heuristic.
 * Returning `Infinity` from `edgeCost` marks an edge impassable.
 */
export function astarGrid(
  g: Grid,
  start: number,
  goal: number,
  edgeCost: (edge: AstarEdge) => number,
  heuristic: (idx: number, goalIdx: number) => number,
): AstarResult | null {
  const { n, cellM } = g;
  const size = n * n;
  if (start < 0 || start >= size || goal < 0 || goal >= size) return null;

  const open = new MinHeap();
  const came = new Int32Array(size).fill(-1);
  const gs = new Float64Array(size).fill(Infinity);
  const closed = new Uint8Array(size);

  gs[start] = 0;
  open.push(start, heuristic(start, goal));

  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cx = cur % n;
    const cy = (cur / n) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const nb = y * n + x;
        if (closed[nb]) continue;

        const distM = Math.hypot(dx, dy) * cellM;
        const riseM = g.z[nb] - g.z[cur];
        const slopeDeg = (Math.atan2(Math.abs(riseM), distM) * 180) / Math.PI;
        const cost = edgeCost({
          from: cur,
          to: nb,
          dx,
          dy,
          distM,
          riseM,
          slopeDeg,
        });
        if (!Number.isFinite(cost) || cost < 0) continue;

        const tentative = gs[cur] + cost;
        if (tentative < gs[nb]) {
          gs[nb] = tentative;
          came[nb] = cur;
          open.push(nb, tentative + heuristic(nb, goal));
        }
      }
    }
  }

  if (came[goal] < 0 && goal !== start) return null;

  const path: number[] = [];
  for (let i = goal; i !== -1; i = came[i]) path.push(i);
  path.reverse();

  let distanceM = 0;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1];
    const b = path[k];
    distanceM +=
      Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
  }

  return { path, totalCost: gs[goal], distanceM };
}

/**
 * 8-direction A* route planner for an EVA astronaut.
 * Edge cost = metabolic energy of segment * (1 + doseWeight * SVF).
 */
export function planRoute(
  g: Grid,
  start: number,
  goal: number,
  o: RouteOpts,
): RouteResult | null {
  const { n, cellM } = g;
  const gx = goal % n;
  const gy = (goal / n) | 0;
  const flatW = metabolicRateW({ ...o, gradePct: 0, terrain: 1 });
  const maxTan = Math.tan((o.maxSlopeDeg * Math.PI) / 180);

  const solved = astarGrid(
    g,
    start,
    goal,
    (e) => {
      if (Math.abs(e.riseM) / e.distM > maxTan) return Infinity;
      const W = metabolicRateW({
        ...o,
        gradePct: (e.riseM / e.distM) * 100,
        terrain: g.terrain[e.to],
      });
      return ((W * e.distM) / o.speed) * (1 + o.doseWeight * g.doseRel[e.to]);
    },
    (i) =>
      (Math.hypot((i % n) - gx, ((i / n) | 0) - gy) * cellM * flatW) / o.speed,
  );

  if (!solved) return null;
  const { path, distanceM } = solved;

  let energyJ = 0;
  let svf = 0;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1];
    const b = path[k];
    const d =
      Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
    const W = metabolicRateW({
      ...o,
      gradePct: ((g.z[b] - g.z[a]) / d) * 100,
      terrain: g.terrain[b],
    });
    energyJ += (W * d) / o.speed;
    svf += g.doseRel[b];
  }
  const timeS = distanceM / o.speed;
  return {
    path,
    distanceM,
    timeS,
    energyJ,
    o2Kg: o2KgPerHour(energyJ / Math.max(timeS, 1)) * (timeS / 3600),
    meanSvf: svf / Math.max(path.length - 1, 1),
  };
}

export class MinHeap {
  private k: number[] = [];
  private p: number[] = [];

  get size(): number {
    return this.k.length;
  }

  push(key: number, pri: number): void {
    let i = this.k.length;
    this.k.push(key);
    this.p.push(pri);
    while (i > 0) {
      const m = (i - 1) >> 1;
      if (this.p[m] <= this.p[i]) break;
      this.swap(i, m);
      i = m;
    }
  }

  pop(): number {
    const top = this.k[0];
    const lk = this.k.pop()!;
    const lp = this.p.pop()!;
    if (this.k.length) {
      this.k[0] = lk;
      this.p[0] = lp;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.k[a], this.k[b]] = [this.k[b], this.k[a]];
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
  }
}
