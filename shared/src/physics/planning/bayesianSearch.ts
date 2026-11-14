export interface SearchCandidate {
  x: number;
  z: number;
}

export interface BayesianSearchOpts {
  candidates: SearchCandidate[];
  evaluate: (x: number, z: number) => number;
  budget: number;
  lengthScaleM?: number;
  noiseVar?: number;
  kappa?: number;
}

export interface BayesianSample {
  x: number;
  z: number;
  value: number;
  ucb: number;
}

export interface BayesianSearchResult {
  best: { x: number; z: number; value: number };
  history: BayesianSample[];
  evaluations: number;
  algorithm: "Bayesian Search (GP-UCB)";
}

function choleskySolve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      L[i][j] =
        i === j ? Math.sqrt(Math.max(sum, 1e-12)) : sum / L[j][j];
    }
  }
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
    y[i] = sum / L[i][i];
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
    x[i] = sum / L[i][i];
  }
  return x;
}

function choleskyLowerSolve(L: number[][], v: number[]): number[] {
  const n = L.length;
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = v[i];
    for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
    y[i] = sum / L[i][i];
  }
  return y;
}

/**
 * Deterministic Gaussian-Process Upper Confidence Bound (GP-UCB) Bayesian search
 * over a discrete set of 2D candidate coordinates to maximize an unknown spatial field
 * (e.g., mineral hydration signal or beacon RSSI).
 */
export function bayesianSearch2D(
  opts: BayesianSearchOpts,
): BayesianSearchResult {
  const { candidates, evaluate } = opts;
  if (candidates.length === 0) {
    throw new Error("bayesianSearch2D requires at least one candidate");
  }
  const budget = Math.max(1, Math.min(opts.budget, candidates.length));
  const ls = opts.lengthScaleM ?? 25;
  const noise = opts.noiseVar ?? 1e-4;
  const kappa = opts.kappa ?? 2.0;

  const kernel = (a: SearchCandidate, b: SearchCandidate) => {
    const d2 = (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
    return Math.exp(-d2 / (2 * ls * ls));
  };

  const tested = new Set<number>();
  const obsIdx: number[] = [];
  const obsY: number[] = [];
  const history: BayesianSample[] = [];

  // Deterministic initial sample: candidate closest to centroid of search domain
  let cx = 0;
  let cz = 0;
  for (const c of candidates) {
    cx += c.x;
    cz += c.z;
  }
  cx /= candidates.length;
  cz /= candidates.length;

  let firstIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const d = Math.hypot(candidates[i].x - cx, candidates[i].z - cz);
    if (d < bestDist) {
      bestDist = d;
      firstIdx = i;
    }
  }

  const record = (idx: number, ucb: number) => {
    tested.add(idx);
    const c = candidates[idx];
    const value = evaluate(c.x, c.z);
    obsIdx.push(idx);
    obsY.push(value);
    history.push({ x: c.x, z: c.z, value, ucb });
  };

  record(firstIdx, Infinity);

  while (obsIdx.length < budget) {
    const m = obsIdx.length;
    const meanY = obsY.reduce((a, b) => a + b, 0) / m;
    const yCentered = obsY.map((v) => v - meanY);

    const K: number[][] = Array.from({ length: m }, (_, i) =>
      Array.from({ length: m }, (_, j) => {
        const base = kernel(candidates[obsIdx[i]], candidates[obsIdx[j]]);
        return i === j ? base + noise : base;
      }),
    );
    const alpha = choleskySolve(K, yCentered);

    // Cholesky factor L of K for predictive variance
    const L: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    for (let i = 0; i < m; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = K[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        L[i][j] =
          i === j ? Math.sqrt(Math.max(sum, 1e-12)) : sum / L[j][j];
      }
    }

    let nextIdx = -1;
    let bestUcb = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      if (tested.has(i)) continue;
      const kVec = obsIdx.map((oi) => kernel(candidates[i], candidates[oi]));
      let mu = meanY;
      for (let j = 0; j < m; j++) mu += kVec[j] * alpha[j];
      const v = choleskyLowerSolve(L, kVec);
      const varPost = Math.max(
        0,
        1 - v.reduce((acc, val) => acc + val * val, 0),
      );
      const ucb = mu + kappa * Math.sqrt(varPost);
      if (ucb > bestUcb) {
        bestUcb = ucb;
        nextIdx = i;
      }
    }
    if (nextIdx < 0) break;
    record(nextIdx, bestUcb);
  }

  let best = history[0];
  for (const h of history) {
    if (h.value > best.value) best = h;
  }

  return {
    best: { x: best.x, z: best.z, value: best.value },
    history,
    evaluations: history.length,
    algorithm: "Bayesian Search (GP-UCB)",
  };
}
