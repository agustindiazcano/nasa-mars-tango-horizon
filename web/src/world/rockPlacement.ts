import {
  ASTRONAUT_START,
  BASE_MODULE_FOOTPRINTS,
  BASE_ORIGIN,
  FISSION_COORD,
  FLEET_START_OFFSETS,
  LAUNCHER_PRIMARY_COORD,
  LAUNCH_SITE_COORD,
  MANIP_TARGETS,
  BASE_ANNEXES,
  BASE_TUBES,
  MISSION_SITES,
  RESCUE_PIT_AXIS,
  RESCUE_SITE,
  fleetStartPos,
} from "@th/shared";
import { mulberry32 } from "./noise";

export type RockTier = "small" | "medium" | "large";

export interface RockPlacement {
  x: number;
  z: number;
  /** Per-axis scale in metres (the unit rock geometry has radius 1). */
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
  tiltX: number;
  tiltZ: number;
  variant: number;
  /** 0 = gray basalt, 1 = rust-dusted. */
  tint: number;
  tier: RockTier;
  /** Cluster id for boulders placed on purpose, null for scattered rocks. */
  cluster: string | null;
}

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export interface BoulderCluster {
  id: string;
  x: number;
  z: number;
  radius: number;
  count: number;
}

export const TIER_SIZE_M: Record<RockTier, [number, number]> = {
  small: [0.12, 0.5],
  medium: [0.5, 1.4],
  large: [1.6, 5],
};

export const TIER_VARIANTS: Record<RockTier, number> = { small: 3, medium: 3, large: 4 };

const MAX_SLOPE_DEG = { scatter: 30, boulder: 24 };

/** Places that must stay clear: base modules, spawn, fleet starts, fission unit, launch complex, stations, targets. */
export function defaultExclusions(): Circle[] {
  const out: Circle[] = [
    { x: ASTRONAUT_START.x, z: ASTRONAUT_START.z, r: 16 },
    { x: FISSION_COORD.x, z: FISSION_COORD.z, r: 110 },
    { x: LAUNCHER_PRIMARY_COORD.x, z: LAUNCHER_PRIMARY_COORD.z, r: 24 },
    { x: LAUNCH_SITE_COORD.x, z: LAUNCH_SITE_COORD.z, r: 115 },
  ];
  // Base modules: one circle per footprint plus a walkway margin (the fission unit and launchers have their own).
  for (const m of BASE_MODULE_FOOTPRINTS) {
    if (m.id === "fission" || m.id.startsWith("launcher")) continue;
    out.push({ x: BASE_ORIGIN.x + m.offsetX, z: BASE_ORIGIN.z + m.offsetZ, r: Math.max(m.widthM, m.depthM) * 0.6 + 5 });
  }
  for (const a of BASE_ANNEXES) out.push({ x: BASE_ORIGIN.x + a.offsetX, z: BASE_ORIGIN.z + a.offsetZ, r: a.radiusM + 4 });
  for (const t of BASE_TUBES) out.push({ x: BASE_ORIGIN.x + t.offsetX, z: BASE_ORIGIN.z + t.offsetZ, r: t.lenM / 2 + 3 });
  for (const id of Object.keys(FLEET_START_OFFSETS)) {
    const p = fleetStartPos(id);
    out.push({ x: p.x, z: p.z, r: 14 });
  }
  for (const s of MISSION_SITES) out.push({ x: s.x, z: s.z, r: 14 });
  for (const t of MANIP_TARGETS) out.push({ x: t.x, z: t.z, r: 9 });
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Boulder fields placed on purpose around the map (world metres). */
export function defaultClusters(): BoulderCluster[] {
  const road = (t: number) => ({
    x: lerp(BASE_ORIGIN.x, LAUNCH_SITE_COORD.x, t),
    z: lerp(BASE_ORIGIN.z, LAUNCH_SITE_COORD.z, t),
  });
  const a = road(0.33);
  const b = road(0.68);
  return [
    { id: "spawn-view", x: BASE_ORIGIN.x + 18, z: BASE_ORIGIN.z + 30, radius: 9, count: 3 },
    { id: "base-garden", x: BASE_ORIGIN.x - 150, z: BASE_ORIGIN.z - 125, radius: 42, count: 8 },
    { id: "east-ridge", x: BASE_ORIGIN.x + 190, z: BASE_ORIGIN.z + 140, radius: 38, count: 7 },
    { id: "spawn-outcrop", x: ASTRONAUT_START.x + 70, z: ASTRONAUT_START.z + 55, radius: 24, count: 5 },
    { id: "launch-road-a", x: a.x + 40, z: a.z - 30, radius: 48, count: 7 },
    { id: "launch-road-b", x: b.x - 30, z: b.z + 40, radius: 48, count: 7 },
    { id: "launch-backdrop", x: LAUNCH_SITE_COORD.x - 170, z: LAUNCH_SITE_COORD.z + 150, radius: 42, count: 7 },
    { id: "north-field", x: BASE_ORIGIN.x - 40, z: BASE_ORIGIN.z - 420, radius: 60, count: 9 },
  ];
}

/**
 * Boulder field around the rescue pit rim (two lobes, uphill and downhill of the ramp side) and the keep-clear circles
 * that protect the pit, the ramp approach and the rescue vehicle parking spot (18 m from the pit toward the base).
 */
export function rescuePitRockOptions(): { clusters: BoulderCluster[]; exclusions: Circle[] } {
  const c = RESCUE_SITE;
  const ax = RESCUE_PIT_AXIS;
  const park = { x: c.x + ax.x * 18, z: c.z + ax.z * 18 };
  return {
    clusters: [
      { id: "rescue-rim-a", x: c.x - ax.z * 16 - ax.x * 6, z: c.z + ax.x * 16 - ax.z * 6, radius: 14, count: 8 },
      { id: "rescue-rim-b", x: c.x + ax.z * 15 - ax.x * 9, z: c.z - ax.x * 15 - ax.z * 9, radius: 13, count: 7 },
      { id: "rescue-rim-far", x: c.x - ax.x * 22, z: c.z - ax.z * 22, radius: 12, count: 6 },
    ],
    exclusions: [
      { x: c.x, z: c.z, r: 11 },
      { x: c.x + ax.x * 9, z: c.z + ax.z * 9, r: 6 },
      { x: park.x, z: park.z, r: 9 },
    ],
  };
}

export interface PlanOptions {
  halfSizeM: number;
  heightAt(x: number, z: number): number;
  slopeAt(x: number, z: number): number;
  seed?: number;
  exclusions?: Circle[];
  clusters?: BoulderCluster[];
  counts?: { small: number; medium: number; slopeBoulders: number };
}

function blocked(x: number, z: number, margin: number, ex: Circle[]): boolean {
  for (const c of ex) {
    if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return true;
  }
  return false;
}

/** Deterministic rock layout. The same options always produce the same list. */
export function planRocks(opts: PlanOptions): RockPlacement[] {
  const rnd = mulberry32(opts.seed ?? 2026);
  const ex = opts.exclusions ?? defaultExclusions();
  const clusters = opts.clusters ?? defaultClusters();
  const counts = opts.counts ?? { small: 4500, medium: 1000, slopeBoulders: 10 };
  const half = opts.halfSizeM - 30;
  const out: RockPlacement[] = [];

  const sizeIn = (tier: RockTier, bias = 2): number => {
    const [lo, hi] = TIER_SIZE_M[tier];
    return lo * Math.pow(hi / lo, Math.pow(rnd(), bias));
  };

  const make = (tier: RockTier, x: number, z: number, cluster: string | null, sizeM: number): RockPlacement => {
    const flat = 0.7 + rnd() * 0.45;
    return {
      x,
      z,
      sx: sizeM * (0.85 + rnd() * 0.5),
      sy: sizeM * flat,
      sz: sizeM * (0.85 + rnd() * 0.5),
      rotY: rnd() * Math.PI * 2,
      tiltX: (rnd() - 0.5) * 0.35,
      tiltZ: (rnd() - 0.5) * 0.35,
      variant: Math.floor(rnd() * TIER_VARIANTS[tier]),
      tint: rnd(),
      tier,
      cluster,
    };
  };

  // Scattered small and medium rocks: denser around the base, sparse over the rest of the map.
  const scatter = (tier: "small" | "medium", total: number) => {
    let placed = 0;
    let guard = 0;
    while (placed < total && guard++ < total * 30) {
      // Three density rings: dense around the base, medium out to 600 m, sparse over the whole map.
      const ring = rnd();
      const nearBase = ring < 0.8;
      const ang = rnd() * Math.PI * 2;
      let dist: number;
      if (ring < 0.55) dist = 12 + Math.sqrt(rnd()) * 170;
      else if (nearBase) dist = 180 + Math.sqrt(rnd()) * 420;
      else dist = Math.pow(rnd(), 0.6) * half * 1.3;
      const x = (nearBase ? BASE_ORIGIN.x : 0) + Math.cos(ang) * dist;
      const z = (nearBase ? BASE_ORIGIN.z : 0) + Math.sin(ang) * dist;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      if (blocked(x, z, 1, ex)) continue;
      if (opts.slopeAt(x, z) > MAX_SLOPE_DEG.scatter) continue;
      out.push(make(tier, x, z, null, sizeIn(tier)));
      placed++;
    }
  };
  scatter("small", counts.small);
  scatter("medium", counts.medium);

  // Boulder fields: large rocks with a few medium ones around them.
  for (const c of clusters) {
    let placed = 0;
    let guard = 0;
    while (placed < c.count && guard++ < c.count * 40) {
      const ang = rnd() * Math.PI * 2;
      const dist = Math.sqrt(rnd()) * c.radius;
      const x = c.x + Math.cos(ang) * dist;
      const z = c.z + Math.sin(ang) * dist;
      if (Math.abs(x) > half || Math.abs(z) > half) continue;
      if (blocked(x, z, 3, ex)) continue;
      if (opts.slopeAt(x, z) > MAX_SLOPE_DEG.boulder) continue;
      const tier: RockTier = rnd() < 0.72 ? "large" : "medium";
      const size = tier === "large" ? sizeIn("large", 1.4) : sizeIn("medium", 0.8);
      out.push(make(tier, x, z, c.id, size));
      placed++;
    }
  }

  // Isolated boulders on the steepest ground (talus-like), found on a coarse grid.
  const steep: Array<{ x: number; z: number; s: number }> = [];
  for (let gx = -half; gx <= half; gx += 60) {
    for (let gz = -half; gz <= half; gz += 60) {
      if (blocked(gx, gz, 3, ex)) continue;
      const s = opts.slopeAt(gx, gz);
      if (s >= 10 && s <= MAX_SLOPE_DEG.boulder) steep.push({ x: gx, z: gz, s });
    }
  }
  steep.sort((p, q) => q.s - p.s || p.x - q.x || p.z - q.z);
  const step = Math.max(1, Math.floor(steep.length / Math.max(1, counts.slopeBoulders)));
  for (let i = 0, n = 0; i < steep.length && n < counts.slopeBoulders; i += step, n++) {
    out.push(make("large", steep[i].x, steep[i].z, "slope", sizeIn("large", 1.1)));
  }

  return out;
}
