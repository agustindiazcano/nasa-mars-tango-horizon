import { BASE_ORIGIN } from "@th/shared";

/**
 * Script of scene `U1` (helmet UI tour and voice demo). The player astronaut walks to the manipulator rover while the
 * camera looks around; everything is a function of the scene time, so each take is identical.
 */

export interface Pt {
  x: number;
  y: number;
  z: number;
}

const B = BASE_ORIGIN;

/** Where the walk starts and ends (world metres). */
export const U1_WALK_FROM = { x: B.x - 14, z: B.z + 30 } as const;
export const U1_WALK_TO = { x: B.x + 22, z: B.z + 39 } as const;
export const U1_WALK_S = 36;
/** The second astronaut waits ahead of the player, a little to the left of the path, and faces the player. */
export const U1_CREW4 = { x: B.x - 1, z: B.z + 35 } as const;
/** Rover that the voice order sends to the rock (`T2`), and the rock it lifts. */
export const U1_ROCK_ID = "T2";
export const U1_ROCK_ORDER_S = 14;
export const U1_DRONE_ORDER_S = 21;
export const U1_DRONE_ARRIVE_S = 31;
export const U1_ROVER2_ORDER_S = 27;

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

/** Player position and heading (rad, atan2(dx, dz) convention of the crew placement) at scene time `t`. */
export function u1Walker(t: number): { x: number; z: number; yaw: number; walking: boolean } {
  const u = smooth(t / U1_WALK_S);
  const x = U1_WALK_FROM.x + (U1_WALK_TO.x - U1_WALK_FROM.x) * u;
  const z = U1_WALK_FROM.z + (U1_WALK_TO.z - U1_WALK_FROM.z) * u;
  return { x, z, yaw: Math.atan2(U1_WALK_TO.x - U1_WALK_FROM.x, U1_WALK_TO.z - U1_WALK_FROM.z), walking: t > 0 && t < U1_WALK_S };
}

/** Keyframes of the gaze: who or what the camera looks at, with the time the look settles. */
export type GazeKey = { atS: number; at: "crew-4" | "sky" | "rover-3" | "drone-1" | "rover-2" };

export const U1_GAZE: readonly GazeKey[] = [
  { atS: 0, at: "crew-4" },
  { atS: 4.2, at: "crew-4" },
  { atS: 6.2, at: "sky" },
  { atS: 10.4, at: "sky" },
  { atS: 12.6, at: "rover-3" },
  { atS: 25.5, at: "rover-3" },
  { atS: 27.5, at: "drone-1" },
  { atS: 34, at: "drone-1" },
  { atS: 36.5, at: "rover-3" },
  { atS: 99, at: "rover-3" },
];

/** World point of the gaze at `t`; `pos` resolves the moving entities and `player` is the walker position. */
export function u1Gaze(t: number, player: Pt, pos: (id: string) => Pt | null): Pt {
  const point = (at: GazeKey["at"]): Pt => {
    if (at === "sky") {
      // Up and ahead of the walk direction, about 30 degrees above the horizon.
      const dx = U1_WALK_TO.x - U1_WALK_FROM.x;
      const dz = U1_WALK_TO.z - U1_WALK_FROM.z;
      const n = Math.hypot(dx, dz) || 1;
      return { x: player.x + (dx / n) * 60 - (dz / n) * 25, y: player.y + 1.7 + 42, z: player.z + (dz / n) * 60 + (dx / n) * 25 };
    }
    const p = pos(at) ?? { x: player.x + 10, y: player.y, z: player.z };
    return { x: p.x, y: p.y + (at === "crew-4" ? 1.6 : at === "drone-1" ? 0 : 0.8), z: p.z };
  };
  let i = 0;
  while (i + 1 < U1_GAZE.length && U1_GAZE[i + 1].atS <= t) i++;
  const a = U1_GAZE[i];
  const b = U1_GAZE[Math.min(i + 1, U1_GAZE.length - 1)];
  const pa = point(a.at);
  if (a === b || a.at === b.at) return pa;
  const u = smooth((t - a.atS) / Math.max(1e-6, b.atS - a.atS));
  const pb = point(b.at);
  return { x: pa.x + (pb.x - pa.x) * u, y: pa.y + (pb.y - pa.y) * u, z: pa.z + (pb.z - pa.z) * u };
}

/** Drone-1 flight for the "come to me" order: from its start toward a hover point ahead of the player. */
export function u1Drone(t: number, start: { x: number; z: number }, player: { x: number; z: number }): { x: number; z: number; altM: number; flying: boolean } {
  const dx = U1_WALK_TO.x - U1_WALK_FROM.x;
  const dz = U1_WALK_TO.z - U1_WALK_FROM.z;
  const n = Math.hypot(dx, dz) || 1;
  const hover = { x: player.x + (dx / n) * 9 - (dz / n) * 4, z: player.z + (dz / n) * 9 + (dx / n) * 4 };
  const u = smooth((t - U1_DRONE_ORDER_S) / (U1_DRONE_ARRIVE_S - U1_DRONE_ORDER_S));
  return { x: start.x + (hover.x - start.x) * u, z: start.z + (hover.z - start.z) * u, altM: 14 - 5 * u, flying: t >= U1_DRONE_ORDER_S };
}
