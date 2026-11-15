/**
 * Canonical Mars Base Alpha coordinates, fleet/target offsets, and Gale Crater
 * MSL DAN science sites derived from `web/public/data/terrain/hydration_sites.json`.
 *
 * The HiRISE DEM center `(0, 0)` (-4.745 deg, 137.4 deg E) stays the fixed
 * geographic anchor; `BASE_ORIGIN` sits on a verified `<5 deg` flat plain
 * northeast of Aeolis Mons foothills, keeping every base module and start
 * footprint within safe landing and construction slope limits.
 */

export interface Coord2D {
  x: number;
  z: number;
}

export interface BaseModuleFootprint {
  id: string;
  offsetX: number;
  offsetZ: number;
  widthM: number;
  depthM: number;
}

export interface ManipTargetSpec {
  id: "T1" | "T2" | "T3";
  kind: "sulfate_vein" | "basalt_rock" | "regolith_patch";
  offsetX: number;
  offsetZ: number;
  x: number;
  z: number;
}

export type MissionSiteId = "S1" | "S2" | "S3" | "S4";

export interface MissionSite {
  id: MissionSiteId;
  number: 1 | 2 | 3 | 4;
  name: string;
  danIndex: number;
  sol: number;
  x: number;
  z: number;
  lon: number;
  lat: number;
  weh: number;
  wehErr: number;
  durationS: number;
  evidenceKind: "dan_measurement";
}

export interface CuriosityTraversePoint {
  danIndex: number;
  sol: number;
  x: number;
  z: number;
  lon: number;
  lat: number;
  weh: number;
}

/** Flat (<4.8 deg even at 1.95 m/px on real HiRISE DEM) site for Mars Base Alpha (`hab-1` center). */
export const BASE_ORIGIN = {
  x: 210,
  z: -495,
  label: "Mars Base Alpha",
} as const;

export const AIRLOCK_OFFSET: Readonly<Coord2D> = { x: -9, z: 0 };

/** Primary EVA airlock world coordinate (`hab-1` west hatch). */
export const AIRLOCK_COORD: Readonly<Coord2D> = {
  x: BASE_ORIGIN.x + AIRLOCK_OFFSET.x,
  z: BASE_ORIGIN.z + AIRLOCK_OFFSET.z,
};

/** Initial EVA astronaut spawn coordinate near the habitat airlock. */
export const ASTRONAUT_START: Readonly<Coord2D> = {
  x: BASE_ORIGIN.x + 28,
  z: BASE_ORIGIN.z + 36,
};

export const FISSION_OFFSET: Readonly<Coord2D> = { x: 220, z: -40 };

/** 40 kWe Fission Surface Power unit with 100 m keep-out radius. */
export const FISSION_COORD: Readonly<Coord2D> = {
  x: BASE_ORIGIN.x + FISSION_OFFSET.x,
  z: BASE_ORIGIN.z + FISSION_OFFSET.z,
};

/** Idle position of the second base astronaut (`crew-4`) beside `hab-1`. */
export const CREW4_START: Readonly<Coord2D> = { x: BASE_ORIGIN.x + 8, z: BASE_ORIGIN.z + 7 };

export const LAUNCHER_PRIMARY_OFFSET: Readonly<Coord2D> = { x: 55, z: 24 };

export const LAUNCHER_PRIMARY_COORD: Readonly<Coord2D> = {
  x: BASE_ORIGIN.x + LAUNCHER_PRIMARY_OFFSET.x,
  z: BASE_ORIGIN.z + LAUNCHER_PRIMARY_OFFSET.z,
};

/**
 * Starship-class launch complex center (world m). About 1.1 km east-south-east of `BASE_ORIGIN`, chosen on the
 * real HiRISE DEM as a <7 deg, <7 m relief area within a 70 m radius with line of sight to the base.
 */
export const LAUNCH_SITE_COORD: Readonly<Coord2D> = { x: 1202, z: -1022 };

/**
 * Crew rescue scenario site (world m): center of the designed pit. About 1.66 km from `BASE_ORIGIN`, found by a DEM scan
 * for a patch with <1.3 m relief and <5 deg slope within 35 m that is reachable from the base over <=18 deg terrain.
 */
export const RESCUE_SITE: Readonly<Coord2D> = { x: 1420, z: 648 };

/**
 * Designed pit at `RESCUE_SITE` (no real pit exists in the HiRISE DEM), design assumption: a 10 m wide, 4 m deep
 * hole with a 4 m wide access ramp (27 deg) on the side that faces the base, so a ground robot can drive in and out.
 */
export const RESCUE_PIT = { depthM: 4, radiusM: 5, rampSlopeDeg: 27, rampHalfWidthM: 2 } as const;

/** Unit vector (x, z) from `RESCUE_SITE` toward `BASE_ORIGIN`: the direction of the pit access ramp. */
export const RESCUE_PIT_AXIS: Readonly<Coord2D> = (() => {
  const dx = BASE_ORIGIN.x - RESCUE_SITE.x;
  const dz = BASE_ORIGIN.z - RESCUE_SITE.z;
  const d = Math.hypot(dx, dz);
  return { x: dx / d, z: dz / d };
})();

/**
 * Height (m, relative to the terrain surface) of the pit floor or access ramp at a world point:
 * 0 outside the hole, -depth on the floor, a linear slope inside the ramp lane.
 */
export function pitSurfaceOffsetAt(x: number, z: number): number {
  const { depthM, radiusM, rampSlopeDeg, rampHalfWidthM } = RESCUE_PIT;
  const dx = x - RESCUE_SITE.x;
  const dz = z - RESCUE_SITE.z;
  if (Math.hypot(dx, dz) >= radiusM) return 0;
  const s = dx * RESCUE_PIT_AXIS.x + dz * RESCUE_PIT_AXIS.z;
  const w = -dx * RESCUE_PIT_AXIS.z + dz * RESCUE_PIT_AXIS.x;
  if (Math.abs(w) > rampHalfWidthM) return -depthM;
  const tan = Math.tan((rampSlopeDeg * Math.PI) / 180);
  const sTop = Math.sqrt(radiusM * radiusM - rampHalfWidthM * rampHalfWidthM);
  if (s >= sTop) return 0;
  return Math.max(-depthM, -(sTop - s) * tan);
}

/** Nominal footprint dimensions (m) and offsets relative to `BASE_ORIGIN` for all 16 base modules. */
export const BASE_MODULE_FOOTPRINTS: readonly BaseModuleFootprint[] = [
  { id: "hab-1", offsetX: 0, offsetZ: 0, widthM: 12, depthM: 9 },
  { id: "airlock", offsetX: -9, offsetZ: 0, widthM: 4.5, depthM: 4 },
  { id: "compute", offsetX: 10, offsetZ: 0, widthM: 4, depthM: 4 },
  { id: "lab", offsetX: 0, offsetZ: 12, widthM: 8, depthM: 6 },
  { id: "med", offsetX: 10, offsetZ: 12, widthM: 5, depthM: 4.5 },
  { id: "greenhouse", offsetX: -14, offsetZ: -12, widthM: 13, depthM: 6 },
  { id: "eclss", offsetX: 10, offsetZ: -10, widthM: 5.5, depthM: 4.5 },
  { id: "isru", offsetX: 26, offsetZ: 0, widthM: 7, depthM: 5 },
  { id: "solar", offsetX: 0, offsetZ: -40, widthM: 48, depthM: 22 },
  { id: "battery", offsetX: 20, offsetZ: -24, widthM: 6, depthM: 4 },
  { id: "fission", offsetX: 220, offsetZ: -40, widthM: 5, depthM: 5 },
  { id: "garage", offsetX: -26, offsetZ: 12, widthM: 11, depthM: 9 },
  { id: "comms", offsetX: 24, offsetZ: 18, widthM: 3, depthM: 3 },
  { id: "launcher-1", offsetX: 55, offsetZ: 24, widthM: 4, depthM: 4 },
  { id: "launcher-2", offsetX: 65, offsetZ: 24, widthM: 4, depthM: 4 },
  { id: "shelter", offsetX: -7, offsetZ: 7, widthM: 5, depthM: 4 },
];

/** Fleet spawn offsets relative to `BASE_ORIGIN`. */
export const FLEET_START_OFFSETS: Readonly<Record<string, Readonly<Coord2D>>> = {
  "rover-1": { x: -30, z: 24 },
  "rover-2": { x: 62, z: 48 },
  "rover-3": { x: 34, z: 42 },
  "rescue-1": { x: -16, z: 24 },
  "rescue-bot-1": { x: -16, z: 24 },
  "drone-1": { x: 40, z: -30 },
  "drone-2": { x: -60, z: 55 },
  // Legacy alias kept for backward compatibility with existing tests/snapshots
  "manip-1": { x: 34, z: 42 },
};

/** Resolve a fleet unit's initial world coordinate from `BASE_ORIGIN`. */
export function fleetStartPos(unitId: string): Coord2D {
  const off = FLEET_START_OFFSETS[unitId] ?? { x: 0, z: 0 };
  return { x: BASE_ORIGIN.x + off.x, z: BASE_ORIGIN.z + off.z };
}

/** Manipulator arm inspection targets positioned adjacent to `rover-3` (formerly `manip-1`). */
export const MANIP_TARGETS: readonly ManipTargetSpec[] = [
  {
    id: "T1",
    kind: "sulfate_vein",
    offsetX: 37.5,
    offsetZ: 45.0,
    x: BASE_ORIGIN.x + 37.5,
    z: BASE_ORIGIN.z + 45.0,
  },
  {
    id: "T2",
    kind: "basalt_rock",
    offsetX: 32.0,
    offsetZ: 46.5,
    x: BASE_ORIGIN.x + 32.0,
    z: BASE_ORIGIN.z + 46.5,
  },
  {
    id: "T3",
    kind: "regolith_patch",
    offsetX: 36.2,
    offsetZ: 39.2,
    x: BASE_ORIGIN.x + 36.2,
    z: BASE_ORIGIN.z + 39.2,
  },
];

/**
 * Canonical S1-S4 science stations derived from `in_scene: true` MSL Curiosity
 * DAN active neutron spectrometer measurements in `web/public/data/terrain/hydration_sites.json`.
 */
export const MISSION_SITES: readonly MissionSite[] = [
  {
    id: "S1",
    number: 1,
    name: "DAN Sol 2956 (Noria Approach)",
    danIndex: 1561,
    sol: 2956,
    x: -469.8,
    z: -680.4,
    lon: 137.392075,
    lat: -4.733521,
    weh: 4.439,
    wehErr: 0.012,
    durationS: 270196,
    evidenceKind: "dan_measurement",
  },
  {
    id: "S2",
    number: 2,
    name: "DAN Sol 2309 (Glen Torridon)",
    danIndex: 1376,
    sol: 2309,
    x: -1350.7,
    z: -865.6,
    lon: 137.377212,
    lat: -4.730397,
    weh: 5.187,
    wehErr: 0.077,
    durationS: 9617,
    evidenceKind: "dan_measurement",
  },
  {
    id: "S3",
    number: 3,
    name: "DAN Sol 2654 (Pediment Margin)",
    danIndex: 1478,
    sol: 2654,
    x: -1325.4,
    z: -519.1,
    lon: 137.37764,
    lat: -4.736242,
    weh: 3.662,
    wehErr: 0.05,
    durationS: 12414,
    evidenceKind: "dan_measurement",
  },
  {
    id: "S4",
    number: 4,
    name: "DAN Sol 1891 (Vera Rubin Ridge)",
    danIndex: 1256,
    sol: 1891,
    x: -1690.7,
    z: -931.6,
    lon: 137.371477,
    lat: -4.729283,
    weh: 2.703,
    wehErr: 0.005,
    durationS: 651204,
    evidenceKind: "dan_measurement",
  },
];

export const MISSION_SITES_BY_ID: Readonly<Record<MissionSiteId, MissionSite>> = {
  S1: MISSION_SITES[0],
  S2: MISSION_SITES[1],
  S3: MISSION_SITES[2],
  S4: MISSION_SITES[3],
};

/** Look up a canonical `MISSION_SITES` entry by site number (1..4) or id (`"S1"`..`"S4"`). */
export function getMissionSite(idOrNum: number | string): MissionSite {
  if (typeof idOrNum === "number") {
    const found = MISSION_SITES.find((s) => s.number === idOrNum);
    if (found) return found;
  } else {
    const key = idOrNum.toUpperCase() as MissionSiteId;
    if (key in MISSION_SITES_BY_ID) return MISSION_SITES_BY_ID[key];
  }
  return MISSION_SITES_BY_ID.S2;
}

/**
 * Chronological Curiosity traverse waypoints sampled from real `in_scene: true`
 * `dan_measurements` (indices 1189..1566, Sol 1753..2958) inside the 4x4 km HiRISE tile.
 */
export const CURIOSITY_TRAVERSE: readonly CuriosityTraversePoint[] = [
  { danIndex: 1189, sol: 1753, x: -1995, z: -1370.5, lon: 137.366344, lat: -4.721879, weh: 3.467 },
  { danIndex: 1221, sol: 1819, x: -1790.4, z: -1192.6, lon: 137.369794, lat: -4.724881, weh: 3.772 },
  { danIndex: 1253, sol: 1889, x: -1697.2, z: -951.6, lon: 137.371368, lat: -4.728946, weh: 2.919 },
  { danIndex: 1256, sol: 1891, x: -1690.7, z: -931.6, lon: 137.371477, lat: -4.729283, weh: 2.703 },
  { danIndex: 1284, sol: 2004, x: -1358.6, z: -1109.6, lon: 137.37708, lat: -4.72628, weh: 3.1 },
  { danIndex: 1315, sol: 2044, x: -1517.5, z: -1134.1, lon: 137.374399, lat: -4.725867, weh: 3.627 },
  { danIndex: 1347, sol: 2156, x: -1477.9, z: -1084.8, lon: 137.375067, lat: -4.726698, weh: 3.633 },
  { danIndex: 1376, sol: 2309, x: -1350.7, z: -865.6, lon: 137.377212, lat: -4.730397, weh: 5.187 },
  { danIndex: 1378, sol: 2311, x: -1335.4, z: -869, lon: 137.377471, lat: -4.730339, weh: 4.757 },
  { danIndex: 1409, sol: 2420, x: -1192.1, z: -1027.5, lon: 137.379889, lat: -4.727666, weh: 4.939 },
  { danIndex: 1441, sol: 2481, x: -1157.2, z: -804.3, lon: 137.380478, lat: -4.73143, weh: 4.526 },
  { danIndex: 1472, sol: 2616, x: -1322.6, z: -567.1, lon: 137.377687, lat: -4.735433, weh: 3.52 },
  { danIndex: 1478, sol: 2654, x: -1325.4, z: -519.1, lon: 137.37764, lat: -4.736242, weh: 3.662 },
  { danIndex: 1503, sol: 2781, x: -1214.1, z: -514.3, lon: 137.379517, lat: -4.736324, weh: 3.816 },
  { danIndex: 1535, sol: 2898, x: -652.5, z: -811, lon: 137.388992, lat: -4.731318, weh: 4.777 },
  { danIndex: 1561, sol: 2956, x: -469.8, z: -680.4, lon: 137.392075, lat: -4.733521, weh: 4.439 },
  { danIndex: 1566, sol: 2958, x: -426.9, z: -654.8, lon: 137.392797, lat: -4.733953, weh: 3.781 },
];
