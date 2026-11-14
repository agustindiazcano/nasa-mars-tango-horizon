import type { Grid } from "../route.js";

export interface DStarLiteResult {
  path: number[];
  totalCost: number;
  distanceM: number;
  expansions: number;
  algorithm: "D* Lite";
}

type Key = [number, number];

function lessKey(a: Key, b: Key): boolean {
  if (a[0] < b[0] - 1e-11) return true;
  if (a[0] > b[0] + 1e-11) return false;
  return a[1] < b[1] - 1e-11;
}

class KeyMinHeap {
  private items: { node: number; k1: number; k2: number; ver: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  peek(): { node: number; k1: number; k2: number; ver: number } | undefined {
    return this.items[0];
  }

  push(node: number, k: Key, ver: number): void {
    let i = this.items.length;
    this.items.push({ node, k1: k[0], k2: k[1], ver });
    while (i > 0) {
      const m = (i - 1) >> 1;
      const cur = this.items[i];
      const par = this.items[m];
      if (!lessKey([cur.k1, cur.k2], [par.k1, par.k2])) break;
      this.items[i] = par;
      this.items[m] = cur;
      i = m;
    }
  }

  pop(): { node: number; k1: number; k2: number; ver: number } {
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length) {
      this.items[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (
          l < this.items.length &&
          lessKey(
            [this.items[l].k1, this.items[l].k2],
            [this.items[m].k1, this.items[m].k2],
          )
        ) {
          m = l;
        }
        if (
          r < this.items.length &&
          lessKey(
            [this.items[r].k1, this.items[r].k2],
            [this.items[m].k1, this.items[m].k2],
          )
        ) {
          m = r;
        }
        if (m === i) break;
        const tmp = this.items[i];
        this.items[i] = this.items[m];
        this.items[m] = tmp;
        i = m;
      }
    }
    return top;
  }
}

/**
 * Incremental D* Lite planner (Koenig & Likhachev, 2002) over an 8-connected 2.5D terrain grid.
 * Supports dynamic obstacle/cost updates with local repair instead of replanning from scratch.
 */
export class DStarLite {
  private readonly size: number;
  private readonly gScore: Float64Array;
  private readonly rhs: Float64Array;
  private readonly cellScale: Float64Array;
  private readonly version: Int32Array;
  private readonly inQueue: Uint8Array;
  private readonly heap = new KeyMinHeap();
  private km = 0;
  private currentStart: number;
  private readonly maxSlopeDeg: number;
  private expansions = 0;

  constructor(
    private readonly grid: Grid,
    start: number,
    readonly goal: number,
    maxSlopeDeg = 25,
  ) {
    this.size = grid.n * grid.n;
    this.currentStart = start;
    this.maxSlopeDeg = maxSlopeDeg;
    this.gScore = new Float64Array(this.size).fill(Infinity);
    this.rhs = new Float64Array(this.size).fill(Infinity);
    this.cellScale = new Float64Array(this.size).fill(1);
    this.version = new Int32Array(this.size);
    this.inQueue = new Uint8Array(this.size);

    this.rhs[goal] = 0;
    this.insert(goal, this.calculateKey(goal));
  }

  private heuristic(a: number, b: number): number {
    const n = this.grid.n;
    return (
      Math.hypot((a % n) - (b % n), ((a / n) | 0) - ((b / n) | 0)) *
      this.grid.cellM
    );
  }

  private calculateKey(u: number): Key {
    const m = Math.min(this.gScore[u], this.rhs[u]);
    return [m + this.heuristic(this.currentStart, u) + this.km, m];
  }

  private insert(u: number, k: Key): void {
    this.version[u]++;
    this.inQueue[u] = 1;
    this.heap.push(u, k, this.version[u]);
  }

  private remove(u: number): void {
    this.version[u]++;
    this.inQueue[u] = 0;
  }

  private popValid(): { node: number; key: Key } | null {
    while (this.heap.size) {
      const top = this.heap.peek()!;
      if (!this.inQueue[top.node] || top.ver !== this.version[top.node]) {
        this.heap.pop();
        continue;
      }
      this.heap.pop();
      this.inQueue[top.node] = 0;
      return { node: top.node, key: [top.k1, top.k2] };
    }
    return null;
  }

  private peekValidKey(): Key | null {
    while (this.heap.size) {
      const top = this.heap.peek()!;
      if (!this.inQueue[top.node] || top.ver !== this.version[top.node]) {
        this.heap.pop();
        continue;
      }
      return [top.k1, top.k2];
    }
    return null;
  }

  private edgeCost(from: number, to: number): number {
    const scale = this.cellScale[to];
    if (!Number.isFinite(scale)) return Infinity;
    const { n, cellM, z, terrain } = this.grid;
    const d =
      Math.hypot((to % n) - (from % n), ((to / n) | 0) - ((from / n) | 0)) *
      cellM;
    const rise = z[to] - z[from];
    const slopeDeg = (Math.atan2(Math.abs(rise), d) * 180) / Math.PI;
    if (slopeDeg > this.maxSlopeDeg) return Infinity;
    return d * terrain[to] * scale;
  }

  private neighbors(u: number): number[] {
    const n = this.grid.n;
    const cx = u % n;
    const cy = (u / n) | 0;
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n) {
          out.push(ny * n + nx);
        }
      }
    }
    return out;
  }

  private updateVertex(u: number): void {
    if (u !== this.goal) {
      let best = Infinity;
      for (const s of this.neighbors(u)) {
        const c = this.edgeCost(u, s) + this.gScore[s];
        if (c < best) best = c;
      }
      this.rhs[u] = best;
    }
    this.remove(u);
    if (this.gScore[u] !== this.rhs[u]) {
      this.insert(u, this.calculateKey(u));
    }
  }

  private computeShortestPath(): void {
    this.expansions = 0;
    while (true) {
      const topKey = this.peekValidKey();
      const startKey = this.calculateKey(this.currentStart);
      if (
        !topKey ||
        (!lessKey(topKey, startKey) &&
          this.rhs[this.currentStart] === this.gScore[this.currentStart])
      ) {
        break;
      }
      const popped = this.popValid();
      if (!popped) break;
      const u = popped.node;
      const kOld = popped.key;
      const kNew = this.calculateKey(u);
      this.expansions++;

      if (lessKey(kOld, kNew)) {
        this.insert(u, kNew);
      } else if (this.gScore[u] > this.rhs[u]) {
        this.gScore[u] = this.rhs[u];
        for (const s of this.neighbors(u)) this.updateVertex(s);
      } else {
        this.gScore[u] = Infinity;
        this.updateVertex(u);
        for (const s of this.neighbors(u)) this.updateVertex(s);
      }
    }
  }

  /** Updates the traversal cost multiplier of a cell (`Infinity` blocks it) and notifies D* Lite. */
  setCellScale(cellIdx: number, scale: number, nextStart?: number): void {
    if (nextStart !== undefined && nextStart !== this.currentStart) {
      this.km += this.heuristic(this.currentStart, nextStart);
      this.currentStart = nextStart;
    }
    this.cellScale[cellIdx] = scale;
    this.updateVertex(cellIdx);
    for (const s of this.neighbors(cellIdx)) {
      this.updateVertex(s);
    }
  }

  /** Computes or incrementally repairs the shortest path from `start` to `goal`. */
  plan(start?: number): DStarLiteResult | null {
    if (start !== undefined && start !== this.currentStart) {
      this.km += this.heuristic(this.currentStart, start);
      this.currentStart = start;
    }
    this.computeShortestPath();

    if (!Number.isFinite(this.gScore[this.currentStart])) return null;

    const path: number[] = [this.currentStart];
    const visited = new Set<number>([this.currentStart]);
    let cur = this.currentStart;
    while (cur !== this.goal) {
      let bestNext = -1;
      let bestVal = Infinity;
      for (const s of this.neighbors(cur)) {
        const val = this.edgeCost(cur, s) + this.gScore[s];
        if (val < bestVal) {
          bestVal = val;
          bestNext = s;
        }
      }
      if (bestNext < 0 || !Number.isFinite(bestVal) || visited.has(bestNext)) {
        return null;
      }
      visited.add(bestNext);
      path.push(bestNext);
      cur = bestNext;
    }

    const n = this.grid.n;
    const cellM = this.grid.cellM;
    let distanceM = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      distanceM +=
        Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
    }

    return {
      path,
      totalCost: this.gScore[this.currentStart],
      distanceM,
      expansions: this.expansions,
      algorithm: "D* Lite",
    };
  }
}
