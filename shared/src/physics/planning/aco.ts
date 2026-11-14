import type { StationOrderOpts, StationPoint } from "./stationOrder.js";

export interface AcoOpts extends StationOrderOpts {
  ants?: number;
  iterations?: number;
  alpha?: number;
  beta?: number;
  evaporation?: number;
  seed?: number;
}

export interface AcoOrderResult {
  order: string[];
  indices: number[];
  totalCost: number;
  algorithm: "Ant Colony Optimization (Seeded)";
}

/**
 * Deterministic seeded Ant Colony Optimization (ACO) for station ordering.
 * Uses a fixed-seed LCG PRNG (never `Math.random()`) so every run is reproducible.
 * Can be benchmarked directly against `orderStationsExact` on small station sets.
 */
export function orderStationsACO(
  stations: StationPoint[],
  opts: AcoOpts = {},
): AcoOrderResult {
  const n = stations.length;
  if (n === 0) {
    return {
      order: [],
      indices: [],
      totalCost: 0,
      algorithm: "Ant Colony Optimization (Seeded)",
    };
  }
  if (n === 1) {
    const startCost = opts.startToStation
      ? opts.startToStation[0]
      : opts.start
        ? Math.hypot(stations[0].x - opts.start.x, stations[0].z - opts.start.z)
        : 0;
    const endCost = opts.returnToStart
      ? opts.stationToStart
        ? opts.stationToStart[0]
        : opts.start
          ? Math.hypot(opts.start.x - stations[0].x, opts.start.z - stations[0].z)
          : 0
      : 0;
    return {
      order: [stations[0].id],
      indices: [0],
      totalCost: startCost + endCost,
      algorithm: "Ant Colony Optimization (Seeded)",
    };
  }

  const ants = opts.ants ?? Math.max(12, n * 3);
  const iterations = opts.iterations ?? 40;
  const alpha = opts.alpha ?? 1.0;
  const beta = opts.beta ?? 3.0;
  const rho = opts.evaporation ?? 0.4;
  let state = (opts.seed ?? 1) >>> 0;
  const rnd = () =>
    ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);

  const dist: number[][] =
    opts.costMatrix ??
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j
          ? 0
          : Math.hypot(stations[j].x - stations[i].x, stations[j].z - stations[i].z),
      ),
    );

  const startCosts: number[] =
    opts.startToStation ??
    (opts.start
      ? stations.map((s) => Math.hypot(s.x - opts.start!.x, s.z - opts.start!.z))
      : new Array(n).fill(0));

  const endCosts: number[] = opts.returnToStart
    ? opts.stationToStart ??
      (opts.start
        ? stations.map((s) => Math.hypot(opts.start!.x - s.x, opts.start!.z - s.z))
        : new Array(n).fill(0))
    : new Array(n).fill(0);

  const tau0 = 1.0;
  const startTau = new Float64Array(n).fill(tau0);
  const pher: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(tau0),
  );

  let bestIndices: number[] = [];
  let bestCost = Infinity;

  const tourCost = (tour: number[]): number => {
    let c = startCosts[tour[0]];
    for (let i = 1; i < tour.length; i++) {
      c += dist[tour[i - 1]][tour[i]];
    }
    if (opts.returnToStart) {
      c +=
        !opts.start && tour.length > 1
          ? dist[tour[tour.length - 1]][tour[0]]
          : endCosts[tour[tour.length - 1]];
    }
    return c;
  };

  const choose = (weights: number[]): number => {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return 0;
    let r = rnd() * sum;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  for (let it = 0; it < iterations; it++) {
    const antTours: { tour: number[]; cost: number }[] = [];

    for (let a = 0; a < ants; a++) {
      const visited = new Uint8Array(n);
      let first: number;
      if (!opts.start && opts.returnToStart) {
        first = 0;
      } else if (opts.start) {
        const w0 = stations.map((_, j) => {
          const eta = 1 / Math.max(startCosts[j], 1e-6);
          return startTau[j] ** alpha * eta ** beta;
        });
        first = choose(w0);
      } else {
        first = a % n;
      }

      const tour = [first];
      visited[first] = 1;

      while (tour.length < n) {
        const cur = tour[tour.length - 1];
        const candidates: number[] = [];
        const weights: number[] = [];
        for (let nxt = 0; nxt < n; nxt++) {
          if (visited[nxt]) continue;
          candidates.push(nxt);
          const eta = 1 / Math.max(dist[cur][nxt], 1e-6);
          weights.push(pher[cur][nxt] ** alpha * eta ** beta);
        }
        const pick = candidates[choose(weights)];
        visited[pick] = 1;
        tour.push(pick);
      }

      const cost = tourCost(tour);
      antTours.push({ tour, cost });
      if (cost < bestCost) {
        bestCost = cost;
        bestIndices = [...tour];
      }
    }

    // Evaporate pheromones
    for (let i = 0; i < n; i++) {
      startTau[i] *= 1 - rho;
      for (let j = 0; j < n; j++) {
        pher[i][j] *= 1 - rho;
      }
    }

    // Deposit pheromones (ant system + elitist boost from best-so-far)
    const scale = Number.isFinite(bestCost) && bestCost > 0 ? bestCost : 1;
    for (const { tour, cost } of antTours) {
      const dep = scale / Math.max(cost, 1e-6);
      startTau[tour[0]] += dep;
      for (let i = 1; i < tour.length; i++) {
        pher[tour[i - 1]][tour[i]] += dep;
      }
    }
    if (bestIndices.length === n) {
      const eliteDep = (2 * scale) / Math.max(bestCost, 1e-6);
      startTau[bestIndices[0]] += eliteDep;
      for (let i = 1; i < bestIndices.length; i++) {
        pher[bestIndices[i - 1]][bestIndices[i]] += eliteDep;
      }
    }
  }

  return {
    order: bestIndices.map((i) => stations[i].id),
    indices: bestIndices,
    totalCost: bestCost,
    algorithm: "Ant Colony Optimization (Seeded)",
  };
}
