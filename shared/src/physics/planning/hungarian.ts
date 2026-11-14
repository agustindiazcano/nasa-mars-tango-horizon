export interface HungarianResult {
  assignments: number[]; // assignments[row] = assigned column index, or -1 if unassigned
  totalCost: number;
  algorithm: "Hungarian (Kuhn-Munkres)";
}

const INF_PENALTY = 1e12;

/**
 * Exact O(n^3) Hungarian (Kuhn-Munkres / Jonker-Volgenant potential) minimum-cost
 * bipartite assignment solver.
 *
 * Supports square and rectangular matrices and finite or Infinity (forbidden) entries.
 * When rows > cols, excess rows receive -1. When rows <= cols, every row gets a unique column.
 */
export function hungarianAssign(costMatrix: number[][]): HungarianResult {
  const rows = costMatrix.length;
  if (rows === 0) {
    return {
      assignments: [],
      totalCost: 0,
      algorithm: "Hungarian (Kuhn-Munkres)",
    };
  }
  const cols = costMatrix[0].length;
  if (cols === 0) {
    return {
      assignments: new Array(rows).fill(-1),
      totalCost: 0,
      algorithm: "Hungarian (Kuhn-Munkres)",
    };
  }

  const dim = Math.max(rows, cols);
  // Pad to square dim x dim matrix; dummy rows/cols have zero cost so unassigned rows match them
  const a: number[][] = Array.from({ length: dim + 1 }, (_, i) =>
    Array.from({ length: dim + 1 }, (_, j) => {
      if (i === 0 || j === 0) return 0;
      const r = i - 1;
      const c = j - 1;
      if (r < rows && c < cols) {
        const v = costMatrix[r][c];
        return Number.isFinite(v) ? v : INF_PENALTY;
      }
      return 0;
    }),
  );

  const u = new Float64Array(dim + 1);
  const v = new Float64Array(dim + 1);
  const p = new Int32Array(dim + 1);
  const way = new Int32Array(dim + 1);

  for (let i = 1; i <= dim; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(dim + 1).fill(Infinity);
    const used = new Uint8Array(dim + 1);

    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= dim; j++) {
        if (!used[j]) {
          const cur = a[i0][j] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= dim; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignments = new Array<number>(rows).fill(-1);
  for (let j = 1; j <= dim; j++) {
    const r = p[j] - 1;
    const c = j - 1;
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      if (Number.isFinite(costMatrix[r][c])) {
        assignments[r] = c;
      }
    }
  }

  let totalCost = 0;
  for (let r = 0; r < rows; r++) {
    const c = assignments[r];
    if (c >= 0) {
      totalCost += costMatrix[r][c];
    } else if (rows <= cols) {
      // No feasible assignment existed without using a forbidden Infinity edge
      totalCost = Infinity;
    }
  }

  return {
    assignments,
    totalCost,
    algorithm: "Hungarian (Kuhn-Munkres)",
  };
}
