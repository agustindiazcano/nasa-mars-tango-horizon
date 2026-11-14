export interface StationPoint {
  id: string;
  x: number;
  z: number;
}

export interface StationOrderOpts {
  start?: { x: number; z: number };
  returnToStart?: boolean;
  costMatrix?: number[][];       // pairwise station-to-station costs (n x n)
  startToStation?: number[];     // optional costs from `start` to each station
  stationToStart?: number[];     // optional costs from each station back to `start`
}

export interface StationOrderResult {
  order: string[];
  indices: number[];
  totalCost: number;
  algorithm: "Exact Station Ordering (Held-Karp)";
}

/**
 * Exact Held-Karp dynamic programming solver (O(n^2 * 2^n)) for optimal station ordering.
 * Finds the global minimum-cost order visiting all stations once, with optional start depot
 * and optional return-to-start closure.
 */
export function orderStationsExact(
  stations: StationPoint[],
  opts: StationOrderOpts = {},
): StationOrderResult {
  const n = stations.length;
  if (n === 0) {
    return {
      order: [],
      indices: [],
      totalCost: 0,
      algorithm: "Exact Station Ordering (Held-Karp)",
    };
  }
  if (n > 18) {
    throw new Error(`orderStationsExact supports at most 18 stations (got ${n})`);
  }

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

  if (n === 1) {
    const cost = startCosts[0] + (opts.returnToStart ? endCosts[0] : 0);
    return {
      order: [stations[0].id],
      indices: [0],
      totalCost: cost,
      algorithm: "Exact Station Ordering (Held-Karp)",
    };
  }

  // If no explicit start is given and returnToStart is true, fix station 0 as tour anchor
  if (!opts.start && opts.returnToStart) {
    const subMaskCount = 1 << n;
    const dp = new Float64Array(subMaskCount * n).fill(Infinity);
    const parent = new Int32Array(subMaskCount * n).fill(-1);
    dp[1 * n + 0] = 0;

    for (let mask = 1; mask < subMaskCount; mask++) {
      if ((mask & 1) === 0) continue;
      for (let last = 0; last < n; last++) {
        if ((mask & (1 << last)) === 0) continue;
        const cur = dp[mask * n + last];
        if (!Number.isFinite(cur)) continue;
        for (let next = 1; next < n; next++) {
          if (mask & (1 << next)) continue;
          const nMask = mask | (1 << next);
          const nCost = cur + dist[last][next];
          const slot = nMask * n + next;
          if (nCost < dp[slot]) {
            dp[slot] = nCost;
            parent[slot] = last;
          }
        }
      }
    }

    const full = subMaskCount - 1;
    let bestCost = Infinity;
    let bestLast = -1;
    for (let last = 1; last < n; last++) {
      const c = dp[full * n + last] + dist[last][0];
      if (c < bestCost) {
        bestCost = c;
        bestLast = last;
      }
    }

    const indices: number[] = [];
    let mask = full;
    let cur = bestLast;
    while (cur !== -1) {
      indices.push(cur);
      const prev = parent[mask * n + cur];
      mask ^= 1 << cur;
      cur = prev;
    }
    indices.reverse();
    return {
      order: indices.map((i) => stations[i].id),
      indices,
      totalCost: bestCost,
      algorithm: "Exact Station Ordering (Held-Karp)",
    };
  }

  // General case: free start among stations (startCosts = 0) or fixed external start
  const maskCount = 1 << n;
  const dp = new Float64Array(maskCount * n).fill(Infinity);
  const parent = new Int32Array(maskCount * n).fill(-1);

  for (let i = 0; i < n; i++) {
    dp[(1 << i) * n + i] = startCosts[i];
  }

  for (let mask = 1; mask < maskCount; mask++) {
    for (let last = 0; last < n; last++) {
      if ((mask & (1 << last)) === 0) continue;
      const cur = dp[mask * n + last];
      if (!Number.isFinite(cur)) continue;
      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue;
        const nMask = mask | (1 << next);
        const nCost = cur + dist[last][next];
        const slot = nMask * n + next;
        if (nCost < dp[slot]) {
          dp[slot] = nCost;
          parent[slot] = last;
        }
      }
    }
  }

  const full = maskCount - 1;
  let bestCost = Infinity;
  let bestLast = 0;
  for (let last = 0; last < n; last++) {
    const c = dp[full * n + last] + endCosts[last];
    if (c < bestCost) {
      bestCost = c;
      bestLast = last;
    }
  }

  const indices: number[] = [];
  let mask = full;
  let cur = bestLast;
  while (cur !== -1) {
    indices.push(cur);
    const prev = parent[mask * n + cur];
    mask ^= 1 << cur;
    cur = prev;
  }
  indices.reverse();

  return {
    order: indices.map((i) => stations[i].id),
    indices,
    totalCost: bestCost,
    algorithm: "Exact Station Ordering (Held-Karp)",
  };
}
