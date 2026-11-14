import { astarGrid, type Grid } from "../route.js";
import { metabolicRateW } from "../metabolic.js";

export type VehicleKind =
  | "astronaut"
  | "rover_crew"
  | "rover_science"
  | "rover_cargo"
  | "scout"
  | "rescue"
  | "manipulator"
  | "drone"
  | "glider";

export interface VehicleCostProfile {
  kind: VehicleKind;
  speedMs: number;
  maxSlopeDeg: number;
  looseSoilPenalty: number; // multiplier on Class 0 loose sand (terrain >= 2.0)
  blockLooseSoil: boolean;   // if true, Class 0 loose sand is impassable
  doseWeight: number;
  algorithm: string;
}

/**
 * Kinematic 2.5D vehicle profiles aligned with FLEET specs and GUARDIAN slope limits.
 */
export const VEHICLE_PROFILES: Record<VehicleKind, VehicleCostProfile> = {
  astronaut: {
    kind: "astronaut",
    speedMs: 1.0,
    maxSlopeDeg: 30,
    looseSoilPenalty: 2.1,
    blockLooseSoil: false,
    doseWeight: 1.0,
    algorithm: "A* (Astronaut Metabolic+SVF)",
  },
  rover_crew: {
    kind: "rover_crew",
    speedMs: 2.5,
    maxSlopeDeg: 20,
    looseSoilPenalty: 3.0,
    blockLooseSoil: true,
    doseWeight: 0,
    algorithm: "A* (Crew Rover)",
  },
  rover_science: {
    kind: "rover_science",
    speedMs: 0.8,
    maxSlopeDeg: 25,
    looseSoilPenalty: 1.8,
    blockLooseSoil: false,
    doseWeight: 0,
    algorithm: "A* (Science Rover)",
  },
  rover_cargo: {
    kind: "rover_cargo",
    speedMs: 1.5,
    maxSlopeDeg: 18,
    looseSoilPenalty: 3.5,
    blockLooseSoil: true,
    doseWeight: 0,
    algorithm: "A* (Cargo Rover)",
  },
  scout: {
    kind: "scout",
    speedMs: 0.6,
    maxSlopeDeg: 28,
    looseSoilPenalty: 1.4,
    blockLooseSoil: false,
    doseWeight: 0,
    algorithm: "A* (Scout)",
  },
  rescue: {
    kind: "rescue",
    speedMs: 3.0,
    maxSlopeDeg: 25,
    looseSoilPenalty: 1.6,
    blockLooseSoil: false,
    doseWeight: 0,
    algorithm: "A* (Rescue Rover)",
  },
  manipulator: {
    kind: "manipulator",
    speedMs: 1.2,
    maxSlopeDeg: 20,
    looseSoilPenalty: 2.5,
    blockLooseSoil: true,
    doseWeight: 0,
    algorithm: "A* (Manipulator Rover)",
  },
  drone: {
    kind: "drone",
    speedMs: 10.0,
    maxSlopeDeg: 90,
    looseSoilPenalty: 1.0,
    blockLooseSoil: false,
    doseWeight: 0,
    algorithm: "A* (Drone 2.5D)",
  },
  glider: {
    kind: "glider",
    speedMs: 30.0,
    maxSlopeDeg: 90,
    looseSoilPenalty: 1.0,
    blockLooseSoil: false,
    doseWeight: 0,
    algorithm: "A* (Glider 2.5D)",
  },
};

export interface VehicleRouteResult {
  kind: VehicleKind;
  path: number[];
  distanceM: number;
  timeS: number;
  totalCost: number;
  maxSlopeDeg: number;
  meanSvf: number;
  algorithm: string;
}

/**
 * Computes a 2.5D terrain-surface route for a specific vehicle kind, reusing the
 * pluggable A* engine in `route.ts`.
 */
export function planVehicleRoute(
  g: Grid,
  start: number,
  goal: number,
  kind: VehicleKind,
  overrides: Partial<VehicleCostProfile> = {},
): VehicleRouteResult | null {
  const p = { ...VEHICLE_PROFILES[kind], ...overrides };
  const { n, cellM } = g;
  const gx = goal % n;
  const gy = (goal / n) | 0;

  const flatAstronautW =
    kind === "astronaut"
      ? metabolicRateW({
          bodyKg: 78,
          loadKg: 65,
          speed: p.speedMs,
          gradePct: 0,
          terrain: 1,
        })
      : 1;

  const solved = astarGrid(
    g,
    start,
    goal,
    (e) => {
      if (e.slopeDeg > p.maxSlopeDeg) return Infinity;
      const tFactor = g.terrain[e.to];
      const isLoose = tFactor >= 2.0;
      if (p.blockLooseSoil && isLoose) return Infinity;

      if (kind === "astronaut") {
        const W = metabolicRateW({
          bodyKg: 78,
          loadKg: 65,
          speed: p.speedMs,
          gradePct: (e.riseM / e.distM) * 100,
          terrain: tFactor,
        });
        return (
          ((W * e.distM) / p.speedMs) * (1 + p.doseWeight * g.doseRel[e.to])
        );
      }

      const terrainMult = isLoose
        ? p.looseSoilPenalty
        : 1 + 0.35 * Math.max(0, tFactor - 1);
      const slopeMult =
        p.maxSlopeDeg < 89
          ? 1 + 0.5 * (e.slopeDeg / p.maxSlopeDeg) ** 2
          : 1;
      const dt = e.distM / p.speedMs;
      return dt * terrainMult * slopeMult;
    },
    (idx) => {
      const d = Math.hypot((idx % n) - gx, ((idx / n) | 0) - gy) * cellM;
      if (kind === "astronaut") return (d * flatAstronautW) / p.speedMs;
      return d / p.speedMs;
    },
  );

  if (!solved) return null;

  let maxSlopeDeg = 0;
  let svfSum = 0;
  for (let k = 1; k < solved.path.length; k++) {
    const a = solved.path[k - 1];
    const b = solved.path[k];
    const d =
      Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
    const slope = (Math.atan2(Math.abs(g.z[b] - g.z[a]), d) * 180) / Math.PI;
    if (slope > maxSlopeDeg) maxSlopeDeg = slope;
    svfSum += g.doseRel[b];
  }

  return {
    kind,
    path: solved.path,
    distanceM: solved.distanceM,
    timeS: solved.distanceM / p.speedMs,
    totalCost: solved.totalCost,
    maxSlopeDeg,
    meanSvf: svfSum / Math.max(solved.path.length - 1, 1),
    algorithm: p.algorithm,
  };
}

export interface RescueRouteOpts {
  speedMs?: number;
  maxSlopeDeg?: number;
  slopeSlowdown?: number;
  terrainSlowdown?: number;
  doseTieBreak?: number;
}

export interface RescueRouteResult {
  path: number[];
  distanceM: number;
  timeS: number;
  totalCost: number;
  maxSlopeDeg: number;
  meanSvf: number;
  algorithm: "Time-Optimal Rescue A*";
}

/**
 * Time-optimal rescue planner reusing the pluggable A* engine.
 * Models effective traverse speed degradation from slope and regolith resistance so
 * the rescue unit picks the fastest safe trajectory rather than shortest Euclidean line.
 */
export function planRescueRoute(
  g: Grid,
  start: number,
  goal: number,
  opts: RescueRouteOpts = {},
): RescueRouteResult | null {
  const speedMs = opts.speedMs ?? 3.0;
  const maxSlopeDeg = opts.maxSlopeDeg ?? 25;
  const slopeSlowdown = opts.slopeSlowdown ?? 0.6;
  const terrainSlowdown = opts.terrainSlowdown ?? 0.8;
  const doseTieBreak = opts.doseTieBreak ?? 0.02;

  const { n, cellM } = g;
  const gx = goal % n;
  const gy = (goal / n) | 0;

  const edgeTime = (slopeDeg: number, terrainVal: number, distM: number) => {
    const tPenalty = 1 + terrainSlowdown * Math.max(0, terrainVal - 1);
    const sPenalty = 1 + slopeSlowdown * (slopeDeg / maxSlopeDeg);
    const effSpeed = speedMs / (tPenalty * sPenalty);
    return distM / effSpeed;
  };

  const solved = astarGrid(
    g,
    start,
    goal,
    (e) => {
      if (e.slopeDeg > maxSlopeDeg) return Infinity;
      const dt = edgeTime(e.slopeDeg, g.terrain[e.to], e.distM);
      return dt * (1 + doseTieBreak * g.doseRel[e.to]);
    },
    (idx) =>
      (Math.hypot((idx % n) - gx, ((idx / n) | 0) - gy) * cellM) / speedMs,
  );

  if (!solved) return null;

  let timeS = 0;
  let maxSlope = 0;
  let svfSum = 0;
  for (let k = 1; k < solved.path.length; k++) {
    const a = solved.path[k - 1];
    const b = solved.path[k];
    const d =
      Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
    const slope = (Math.atan2(Math.abs(g.z[b] - g.z[a]), d) * 180) / Math.PI;
    if (slope > maxSlope) maxSlope = slope;
    timeS += edgeTime(slope, g.terrain[b], d);
    svfSum += g.doseRel[b];
  }

  return {
    path: solved.path,
    distanceM: solved.distanceM,
    timeS,
    totalCost: solved.totalCost,
    maxSlopeDeg: maxSlope,
    meanSvf: svfSum / Math.max(solved.path.length - 1, 1),
    algorithm: "Time-Optimal Rescue A*",
  };
}
