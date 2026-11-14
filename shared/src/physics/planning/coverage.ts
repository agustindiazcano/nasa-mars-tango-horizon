export interface LawnmowerOpts {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  swathM: number;
  angleRad?: number;
  startFromMaxX?: boolean;
  startFromMaxZ?: boolean;
}

export interface CoverageWaypoint {
  x: number;
  z: number;
}

export interface LawnmowerResult {
  waypoints: CoverageWaypoint[];
  totalDistanceM: number;
  numSweeps: number;
  areaM2: number;
  algorithm: "Boustrophedon Lawnmower Coverage";
}

/**
 * Generates deterministic boustrophedon (back-and-forth) lawnmower coverage
 * waypoints across a rectangular survey region with track spacing `swathM`.
 */
export function planLawnmowerCoverage(opts: LawnmowerOpts): LawnmowerResult {
  const { minX, maxX, minZ, maxZ } = opts;
  const swathM = Math.max(opts.swathM, 0.5);
  const angle = opts.angleRad ?? 0;

  const loX = Math.min(minX, maxX);
  const hiX = Math.max(minX, maxX);
  const loZ = Math.min(minZ, maxZ);
  const hiZ = Math.max(minZ, maxZ);
  const width = hiX - loX;
  const depth = hiZ - loZ;

  const cx = (loX + hiX) / 2;
  const cz = (loZ + hiZ) / 2;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Rotate bounding box corners into sweep frame to guarantee full coverage when rotated
  const halfW = (Math.abs(width * cosA) + Math.abs(depth * sinA)) / 2;
  const halfD = (Math.abs(width * sinA) + Math.abs(depth * cosA)) / 2;

  const numSweeps = Math.max(1, Math.ceil((2 * halfD) / swathM));
  const spacing = numSweeps === 1 ? 0 : (2 * halfD - swathM) / Math.max(numSweeps - 1, 1);
  const startOffset = numSweeps === 1 ? 0 : -halfD + swathM / 2;

  const toWorld = (u: number, v: number): CoverageWaypoint => ({
    x: cx + u * cosA - v * sinA,
    z: cz + u * sinA + v * cosA,
  });

  const waypoints: CoverageWaypoint[] = [];
  for (let s = 0; s < numSweeps; s++) {
    const rawIdx = opts.startFromMaxZ ? numSweeps - 1 - s : s;
    const v = startOffset + rawIdx * spacing;
    const forward = (s % 2 === 0) !== Boolean(opts.startFromMaxX);
    const u0 = forward ? -halfW : halfW;
    const u1 = forward ? halfW : -halfW;
    waypoints.push(toWorld(u0, v), toWorld(u1, v));
  }

  let totalDistanceM = 0;
  for (let i = 1; i < waypoints.length; i++) {
    totalDistanceM += Math.hypot(
      waypoints[i].x - waypoints[i - 1].x,
      waypoints[i].z - waypoints[i - 1].z,
    );
  }

  return {
    waypoints,
    totalDistanceM,
    numSweeps,
    areaM2: width * depth,
    algorithm: "Boustrophedon Lawnmower Coverage",
  };
}
