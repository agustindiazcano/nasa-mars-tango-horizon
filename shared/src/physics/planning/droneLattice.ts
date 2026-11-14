import { MinHeap, type Grid } from "../route.js";

export interface DroneLatticeOpts {
  minClearanceM?: number;
  speedMs?: number;
  climbPenalty?: number;
  altitudeStepM?: number;
  maxHeadroomM?: number;
  altitudeLevelsM?: number[];
}

export interface DroneWaypoint {
  idx: number;
  xM: number;
  zM: number;
  altitudeM: number;
  aglM: number;
}

export interface DroneLatticeResult {
  path: DroneWaypoint[];
  distanceM: number;
  timeS: number;
  climbM: number;
  minClearanceActualM: number;
  algorithm: "Drone 3D Clearance Lattice A*";
}

/**
 * Plans a 3D flight path on a (grid cell, altitude layer) lattice, enforcing at least
 * `minClearanceM` above local terrain at every node and midpoint of every edge.
 *
 * Reuses the `MinHeap` priority queue from `route.ts`.
 */
export function planDroneLattice(
  g: Grid,
  start: number,
  goal: number,
  opts: DroneLatticeOpts = {},
): DroneLatticeResult | null {
  const minClearanceM = opts.minClearanceM ?? 12;
  const speedMs = opts.speedMs ?? 10;
  const climbPenalty = opts.climbPenalty ?? 0.5; // extra seconds equivalent per meter climbed
  const stepM = opts.altitudeStepM ?? 15;
  const headroomM = opts.maxHeadroomM ?? 60;

  const { n, cellM } = g;
  const cells = n * n;
  if (start < 0 || start >= cells || goal < 0 || goal >= cells) return null;

  let levels = opts.altitudeLevelsM;
  if (!levels || levels.length === 0) {
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < cells; i++) {
      if (g.z[i] < minZ) minZ = g.z[i];
      if (g.z[i] > maxZ) maxZ = g.z[i];
    }
    const low = Math.ceil(minZ + minClearanceM);
    const high = Math.ceil(maxZ + minClearanceM + headroomM);
    levels = [];
    for (let a = low; a <= high; a += stepM) levels.push(a);
    if (levels[levels.length - 1] < maxZ + minClearanceM) {
      levels.push(Math.ceil(maxZ + minClearanceM + stepM));
    }
  }

  const L = levels.length;
  const totalStates = cells * L;
  const encode = (cell: number, layer: number) => cell * L + layer;

  const startLayer = levels.findIndex((a) => a - g.z[start] >= minClearanceM);
  const goalLayer = levels.findIndex((a) => a - g.z[goal] >= minClearanceM);
  if (startLayer < 0 || goalLayer < 0) return null;

  const startState = encode(start, startLayer);
  const goalState = encode(goal, goalLayer);

  const gx = goal % n;
  const gy = (goal / n) | 0;
  const gz = levels[goalLayer];

  const heuristic = (cell: number, layer: number): number => {
    const dx = ((cell % n) - gx) * cellM;
    const dy = (((cell / n) | 0) - gy) * cellM;
    const dz = levels[layer] - gz;
    return Math.hypot(dx, dy, dz) / speedMs;
  };

  const open = new MinHeap();
  const gs = new Float64Array(totalStates).fill(Infinity);
  const came = new Int32Array(totalStates).fill(-1);
  const closed = new Uint8Array(totalStates);

  gs[startState] = 0;
  open.push(startState, heuristic(start, startLayer));

  let reachedGoal = -1;
  while (open.size) {
    const cur = open.pop();
    if (cur === goalState) {
      reachedGoal = cur;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;

    const cell = (cur / L) | 0;
    const layer = cur % L;
    const cx = cell % n;
    const cy = (cell / n) | 0;
    const altCur = levels[layer];

    // Transitions: 8 horizontal neighbors (at same, -1, or +1 altitude layer) + pure vertical layer shift
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const nCell = ny * n + nx;
        const horiz = Math.hypot(dx, dy) * cellM;

        for (let dl = -1; dl <= 1; dl++) {
          if (!dx && !dy && !dl) continue;
          const nLayer = layer + dl;
          if (nLayer < 0 || nLayer >= L) continue;
          const altNext = levels[nLayer];

          // Enforce terrain clearance at destination node and along the midpoint of the edge
          if (altNext - g.z[nCell] < minClearanceM) continue;
          const midAlt = 0.5 * (altCur + altNext);
          const ridgeZ = Math.max(g.z[cell], g.z[nCell]);
          if (midAlt - ridgeZ < minClearanceM) continue;

          const nState = encode(nCell, nLayer);
          if (closed[nState]) continue;

          const dz = altNext - altCur;
          const dist3D = Math.hypot(horiz, dz);
          const edgeCost = dist3D / speedMs + Math.max(0, dz) * climbPenalty;
          const tentative = gs[cur] + edgeCost;
          if (tentative < gs[nState]) {
            gs[nState] = tentative;
            came[nState] = cur;
            open.push(nState, tentative + heuristic(nCell, nLayer));
          }
        }
      }
    }
  }

  if (reachedGoal < 0 && startState !== goalState) return null;

  const states: number[] = [];
  for (let s = reachedGoal >= 0 ? reachedGoal : startState; s !== -1; s = came[s]) {
    states.push(s);
  }
  states.reverse();

  const half = (n * cellM) / 2;
  const path: DroneWaypoint[] = states.map((s) => {
    const idx = (s / L) | 0;
    const layer = s % L;
    const altitudeM = levels![layer];
    return {
      idx,
      xM: (idx % n) * cellM - half + cellM / 2,
      zM: ((idx / n) | 0) * cellM - half + cellM / 2,
      altitudeM,
      aglM: altitudeM - g.z[idx],
    };
  });

  let distanceM = 0;
  let climbM = 0;
  let minClearanceActualM = Infinity;
  for (let i = 0; i < path.length; i++) {
    if (path[i].aglM < minClearanceActualM) minClearanceActualM = path[i].aglM;
    if (i > 0) {
      const a = path[i - 1];
      const b = path[i];
      const dz = b.altitudeM - a.altitudeM;
      distanceM += Math.hypot(b.xM - a.xM, b.zM - a.zM, dz);
      if (dz > 0) climbM += dz;
    }
  }

  return {
    path,
    distanceM,
    timeS: distanceM / speedMs,
    climbM,
    minClearanceActualM,
    algorithm: "Drone 3D Clearance Lattice A*",
  };
}
