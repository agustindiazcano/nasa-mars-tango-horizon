import { describe, it, expect } from "vitest";
import { astarGrid, type Grid } from "../route.js";
import {
  planVehicleRoute,
  planRescueRoute,
  hungarianAssign,
  planDroneLattice,
  planLawnmowerCoverage,
  orderStationsExact,
  DStarLite,
  bayesianSearch2D,
  orderStationsACO,
} from "../planning/index.js";

function makeGrid(n: number, cellM = 10): Grid {
  return {
    n,
    cellM,
    z: new Float32Array(n * n).fill(0),
    terrain: new Float32Array(n * n).fill(1.1),
    doseRel: new Float32Array(n * n).fill(0.5),
  };
}

function bruteForce4x4(cost: number[][]): { perm: number[]; total: number } {
  let bestTotal = Infinity;
  let bestPerm: number[] = [];
  const p = [0, 1, 2, 3];
  const permute = (l: number) => {
    if (l === 4) {
      const sum = cost[0][p[0]] + cost[1][p[1]] + cost[2][p[2]] + cost[3][p[3]];
      if (sum < bestTotal) {
        bestTotal = sum;
        bestPerm = [...p];
      }
      return;
    }
    for (let i = l; i < 4; i++) {
      [p[l], p[i]] = [p[i], p[l]];
      permute(l + 1);
      [p[l], p[i]] = [p[i], p[l]];
    }
  };
  permute(0);
  return { perm: bestPerm, total: bestTotal };
}

describe("per-vehicle A* and time-optimal rescue planners", () => {
  it("rover_crew blocks Class 0 loose sand while rescue rover can traverse moderate terrain", () => {
    const g = makeGrid(7, 10);
    // Wall of Class 0 loose sand across y=3 except x=6
    for (let x = 0; x < 6; x++) g.terrain[3 * 7 + x] = 2.1;

    const crewRoute = planVehicleRoute(g, 0, 6 * 7 + 0, "rover_crew");
    expect(crewRoute).not.toBeNull();
    expect(crewRoute!.path).toContain(3 * 7 + 6);
    expect(crewRoute!.algorithm).toContain("Crew Rover");

    const rescueRoute = planRescueRoute(g, 0, 6 * 7 + 0);
    expect(rescueRoute).not.toBeNull();
    expect(rescueRoute!.algorithm).toBe("Time-Optimal Rescue A*");
    // Time-optimal rescue detours around slow loose sand if firm detour is faster
    expect(rescueRoute!.timeS).toBeLessThan(200);
  });

  it("vehicle route enforces vehicle-specific slope limit", () => {
    const g = makeGrid(5, 10);
    // 5.3 m step: cardinal slope atan2(5.3, 10) = 27.9 deg; diagonal slope atan2(5.3, 14.14) = 20.55 deg
    for (let x = 0; x < 5; x++) g.z[2 * 5 + x] = 5.3;
    for (let y = 3; y < 5; y++) for (let x = 0; x < 5; x++) g.z[y * 5 + x] = 5.3;

    // rover_cargo max slope = 18 deg -> blocked even diagonally (20.55 deg > 18 deg)
    expect(planVehicleRoute(g, 0, 24, "rover_cargo")).toBeNull();
    // rescue max slope = 25 deg -> succeeds via diagonal step (20.55 deg <= 25 deg)
    const res = planVehicleRoute(g, 0, 24, "rescue");
    expect(res).not.toBeNull();
    expect(res!.maxSlopeDeg).toBeLessThanOrEqual(25.1);
  });
});

describe("Hungarian assignment against brute-force 4x4", () => {
  it("matches exact brute-force optimum on 25 seeded random 4x4 matrices", () => {
    let s = 42;
    const rnd = () =>
      ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);

    for (let trial = 0; trial < 25; trial++) {
      const mat = Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => Math.round(rnd() * 1000) / 10),
      );
      const exact = bruteForce4x4(mat);
      const hung = hungarianAssign(mat);
      expect(hung.totalCost).toBeCloseTo(exact.total, 6);
      expect(new Set(hung.assignments).size).toBe(4);
      const checkSum = hung.assignments.reduce((a, col, row) => a + mat[row][col], 0);
      expect(checkSum).toBeCloseTo(exact.total, 6);
    }
  });

  it("handles rectangular matrices and Infinity blocked pairs", () => {
    const rect = [
      [10, 2, 8, 9],
      [3, 9, 4, 7],
      [9, 8, 1, 5],
    ];
    const r = hungarianAssign(rect);
    expect(r.assignments).toEqual([1, 0, 2]);
    expect(r.totalCost).toBe(6);

    const blocked = [
      [Infinity, 5],
      [4, 1],
    ];
    const b = hungarianAssign(blocked);
    expect(b.assignments).toEqual([1, 0]);
    expect(b.totalCost).toBe(9);
  });
});

describe("drone 3D lattice with terrain clearance", () => {
  it("climbs over a tall ridge while maintaining minimum AGL clearance", () => {
    const g = makeGrid(7, 20);
    for (let x = 0; x < 7; x++) g.z[3 * 7 + x] = 45;

    const res = planDroneLattice(g, 3, 6 * 7 + 3, {
      minClearanceM: 12,
      speedMs: 10,
      altitudeStepM: 15,
    });
    expect(res).not.toBeNull();
    expect(res!.minClearanceActualM).toBeGreaterThanOrEqual(12);
    expect(res!.climbM).toBeGreaterThan(0);
    expect(res!.algorithm).toBe("Drone 3D Clearance Lattice A*");
  });
});

describe("lawnmower coverage planner", () => {
  it("covers bounding box with boustrophedon sweeps at requested swath", () => {
    const res = planLawnmowerCoverage({
      minX: 0,
      maxX: 100,
      minZ: 0,
      maxZ: 60,
      swathM: 20,
    });
    expect(res.numSweeps).toBe(3);
    expect(res.waypoints.length).toBe(6);
    expect(res.areaM2).toBe(6000);
    // Alternating X endpoints: sweep 0 goes 0->100, sweep 1 goes 100->0, sweep 2 goes 0->100
    expect(res.waypoints[0].x).toBeCloseTo(0, 6);
    expect(res.waypoints[1].x).toBeCloseTo(100, 6);
    expect(res.waypoints[2].x).toBeCloseTo(100, 6);
    expect(res.waypoints[3].x).toBeCloseTo(0, 6);
    expect(res.totalDistanceM).toBeCloseTo(100 + 20 + 100 + 20 + 100, 5);
  });
});

describe("exact station ordering (Held-Karp)", () => {
  it("matches brute-force permutation enumeration on 5 stations", () => {
    const stations = [
      { id: "S1", x: 10, z: 0 },
      { id: "S2", x: 80, z: 5 },
      { id: "S3", x: 90, z: 75 },
      { id: "S4", x: 45, z: 40 },
      { id: "S5", x: 5, z: 85 },
    ];
    const start = { x: 0, z: 0 };

    const exact = orderStationsExact(stations, { start, returnToStart: true });

    // Brute-force check over all 5! = 120 permutations
    let bfBest = Infinity;
    const idx = [0, 1, 2, 3, 4];
    const runBf = (l: number) => {
      if (l === 5) {
        let d = Math.hypot(stations[idx[0]].x - start.x, stations[idx[0]].z - start.z);
        for (let i = 1; i < 5; i++) {
          d += Math.hypot(
            stations[idx[i]].x - stations[idx[i - 1]].x,
            stations[idx[i]].z - stations[idx[i - 1]].z,
          );
        }
        d += Math.hypot(start.x - stations[idx[4]].x, start.z - stations[idx[4]].z);
        if (d < bfBest) bfBest = d;
        return;
      }
      for (let i = l; i < 5; i++) {
        [idx[l], idx[i]] = [idx[i], idx[l]];
        runBf(l + 1);
        [idx[l], idx[i]] = [idx[i], idx[l]];
      }
    };
    runBf(0);

    expect(exact.totalCost).toBeCloseTo(bfBest, 6);
    expect(exact.indices.length).toBe(5);
    expect(new Set(exact.order).size).toBe(5);
  });
});

describe("advanced planners: D* Lite, Bayesian Search, and ACO", () => {
  it("D* Lite matches A* optimal cost initially and after dynamic cell blockage", () => {
    const g = makeGrid(8, 10);
    const start = 0;
    const goal = 7 * 8 + 7;

    const dstar = new DStarLite(g, start, goal, 25);
    const initialDstar = dstar.plan()!;
    const initialAstar = astarGrid(
      g,
      start,
      goal,
      (e) => e.distM * g.terrain[e.to],
      (idx) =>
        Math.hypot((idx % 8) - 7, ((idx / 8) | 0) - 7) * 10,
    )!;
    expect(initialDstar.totalCost).toBeCloseTo(initialAstar.totalCost, 5);

    // Block a cell on the initial shortest path (diagonal cell (3,3) -> idx 27)
    const blockedCell = 3 * 8 + 3;
    dstar.setCellScale(blockedCell, Infinity);
    const replanned = dstar.plan()!;
    expect(replanned.path).not.toContain(blockedCell);

    const freshAstar = astarGrid(
      g,
      start,
      goal,
      (e) => (e.to === blockedCell ? Infinity : e.distM * g.terrain[e.to]),
      (idx) =>
        Math.hypot((idx % 8) - 7, ((idx / 8) | 0) - 7) * 10,
    )!;
    expect(replanned.totalCost).toBeCloseTo(freshAstar.totalCost, 5);
  });

  it("Bayesian GP-UCB search deterministically locates spatial peak within budget", () => {
    const candidates: { x: number; z: number }[] = [];
    for (let x = -50; x <= 50; x += 10) {
      for (let z = -50; z <= 50; z += 10) {
        candidates.push({ x, z });
      }
    }
    const truePeak = { x: 30, z: -20 };
    const evaluate = (x: number, z: number) =>
      Math.exp(-((x - truePeak.x) ** 2 + (z - truePeak.z) ** 2) / 600) +
      0.2 * Math.exp(-((x + 30) ** 2 + (z - 30) ** 2) / 500);

    const run1 = bayesianSearch2D({
      candidates,
      evaluate,
      budget: 25,
      lengthScaleM: 22,
      kappa: 2.0,
    });
    const run2 = bayesianSearch2D({
      candidates,
      evaluate,
      budget: 25,
      lengthScaleM: 22,
      kappa: 2.0,
    });

    expect(run1.history).toEqual(run2.history);
    expect(run1.best.value).toBeGreaterThan(0.95);
    expect(Math.hypot(run1.best.x - truePeak.x, run1.best.z - truePeak.z)).toBeLessThanOrEqual(10);
  });

  it("Seeded ACO matches or stays within 5% of exact Held-Karp station ordering", () => {
    const stations = [
      { id: "S1", x: 0, z: 0 },
      { id: "S2", x: 100, z: 0 },
      { id: "S3", x: 100, z: 80 },
      { id: "S4", x: 60, z: 110 },
      { id: "S5", x: 0, z: 80 },
      { id: "S6", x: 50, z: 40 },
    ];
    const exact = orderStationsExact(stations, { returnToStart: true });
    const aco = orderStationsACO(stations, {
      returnToStart: true,
      ants: 20,
      iterations: 45,
      seed: 1,
    });
    const acoRepeat = orderStationsACO(stations, {
      returnToStart: true,
      ants: 20,
      iterations: 45,
      seed: 1,
    });
    expect(aco.indices).toEqual(acoRepeat.indices);
    const gap = (aco.totalCost - exact.totalCost) / exact.totalCost;
    expect(gap).toBeGreaterThanOrEqual(-1e-9);
    expect(gap).toBeLessThanOrEqual(0.05);
  });
});
