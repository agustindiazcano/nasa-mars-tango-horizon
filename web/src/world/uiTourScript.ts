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
export const U1_WALK_TO = { x: B.x + 26, z: B.z + 40.5 } as const;
export const U1_WALK_S = 26;
/** The second astronaut waits ahead of the player, a little to the left of the path, and faces the player. */
export const U1_CREW4 = { x: B.x - 1, z: B.z + 35 } as const;
/** Rover that the voice order sends to the rock (`T2`), and the rock it lifts. */
export const U1_ROCK_ID = "T2";
export const U1_ROCK_ORDER_S = 13;
export const U1_DRONE_ORDER_S = 21;
export const U1_DRONE_ARRIVE_S = 31;
export const U1_ROVER2_ORDER_S = 28;
/** Where rover-2 waits at the start of the scene and where the "come closer" order sends it. */
export const U1_ROVER2_WAIT = { x: B.x + 50, z: B.z + 36 } as const;
export const U1_ROVER2_GOAL = { x: B.x + 31, z: B.z + 35 } as const;

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

export interface Circle {
  x: number;
  z: number;
  r: number;
}

/**
 * Side-steps a point on the straight walk line around every circle it is inside. The point slides sideways along the
 * circle (never jumps across it), on the side where the line already runs, so the path stays continuous.
 */
export function pushOut(x: number, z: number, avoid: readonly Circle[]): { x: number; z: number } {
  const dx = U1_WALK_TO.x - U1_WALK_FROM.x;
  const dz = U1_WALK_TO.z - U1_WALK_FROM.z;
  const n = Math.hypot(dx, dz) || 1;
  const dir = { x: dx / n, z: dz / n };
  const perp = { x: -dir.z, z: dir.x };
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of avoid) {
      const rx = px - c.x;
      const rz = pz - c.z;
      if (Math.hypot(rx, rz) >= c.r) continue;
      const along = rx * dir.x + rz * dir.z;
      // Side of the straight line relative to the circle centre (decided once per circle from the line itself).
      const lineSide = (U1_WALK_FROM.x - c.x) * perp.x + (U1_WALK_FROM.z - c.z) * perp.z >= 0 ? 1 : -1;
      const lat = Math.sqrt(Math.max(0, c.r * c.r - along * along)) * lineSide;
      px = c.x + dir.x * along + perp.x * lat;
      pz = c.z + dir.z * along + perp.z * lat;
    }
  }
  return { x: px, z: pz };
}

/**
 * Player position and heading (rad, atan2(dx, dz) convention of the crew placement) at scene time `t`.
 * `avoid` lists rocks (with the body margin included) that the path must not enter.
 */
export function u1Walker(t: number, avoid: readonly Circle[] = []): { x: number; z: number; yaw: number; walking: boolean } {
  const u = smooth(t / U1_WALK_S);
  const p = pushOut(
    U1_WALK_FROM.x + (U1_WALK_TO.x - U1_WALK_FROM.x) * u,
    U1_WALK_FROM.z + (U1_WALK_TO.z - U1_WALK_FROM.z) * u,
    avoid,
  );
  const x = p.x;
  const z = p.z;
  return { x, z, yaw: Math.atan2(U1_WALK_TO.x - U1_WALK_FROM.x, U1_WALK_TO.z - U1_WALK_FROM.z), walking: t > 0 && t < U1_WALK_S };
}

/** Keyframes of the gaze: who or what the camera looks at, with the time the look settles. */
export type GazeKey = { atS: number; at: "crew-4" | "sky" | "rover-3" | "drone-1" | "rover-2" };

/** A scripted spoken order as the HUD shows it: typed transcript, agent trace, answer. */
export interface U1Order {
  atS: number;
  text: string;
  route: string[];
  trace: { agent: string; kind: "delegate" | "tool" | "verdict" | "say"; detail: Record<string, unknown> }[];
  answer: string;
}

const TYPE_CPS = 26;

/** Seconds the crew line takes to type out. */
export const u1TypeS = (text: string): number => text.length / TYPE_CPS;
export const U1_TYPE_CPS = TYPE_CPS;

const delegate = (agent: string, to: string) => ({ agent, kind: "delegate" as const, detail: { to } });
const allow = (reason: string) => ({ agent: "GUARDIAN", kind: "verdict" as const, detail: { decision: "allow", reason, by: "rules" } });

export const U1_ORDERS: readonly U1Order[] = [
  {
    atS: 12.5,
    text: "Hands, pick up the dark basalt rock.",
    route: ["SUIT.VOICE-EXEC", "BASE", "ROBOT.rover-3"],
    trace: [
      delegate("SUIT.VOICE-EXEC", "BASE"),
      delegate("BASE", "ROBOT.rover-3"),
      { agent: "ROBOT.rover-3", kind: "tool", detail: { tool: "arm_skill", args: { skill: "sample", target_id: "T2" } } },
      allow("Crew farther than 2 m from the arm"),
    ],
    answer: "ROBOT.rover-3 executing sample on T2.",
  },
  {
    atS: 20.5,
    text: "Drone one, come to my position.",
    route: ["SUIT.VOICE-EXEC", "BASE", "ROBOT.drone-1"],
    trace: [
      delegate("SUIT.VOICE-EXEC", "BASE"),
      delegate("BASE", "ROBOT.drone-1"),
      { agent: "ROBOT.drone-1", kind: "tool", detail: { tool: "unit_action", args: { action: "follow_astronaut" } } },
      allow("Flight path and keep-out checked"),
    ],
    answer: "drone-1 taking off to your position.",
  },
  {
    atS: 27,
    text: "Rover two, move closer.",
    route: ["SUIT.VOICE-EXEC", "BASE", "ROBOT.rover-2"],
    trace: [
      delegate("SUIT.VOICE-EXEC", "BASE"),
      delegate("BASE", "ROBOT.rover-2"),
      { agent: "ROBOT.rover-2", kind: "tool", detail: { tool: "dispatch_unit", args: { unit_id: "rover-2", task: "goto" } } },
      allow("Route slope under the vehicle limit"),
    ],
    answer: "rover-2 driving to your position.",
  },
  {
    atS: 33.5,
    text: "Base, what is the air pressure outside?",
    route: ["SUIT.VOICE-EXEC", "BASE", "WEATHER-RAD"],
    trace: [
      delegate("SUIT.VOICE-EXEC", "BASE"),
      delegate("BASE", "WEATHER-RAD"),
      { agent: "WEATHER-RAD", kind: "tool", detail: { tool: "get_environment" } },
    ],
    answer: "About 7 hectopascals today, under 1 percent of Earth sea level.",
  },
  {
    atS: 39.5,
    text: "How is my suit?",
    route: ["SUIT.VOICE-EXEC", "BASE", "SUIT.HEALTH"],
    trace: [
      delegate("SUIT.VOICE-EXEC", "BASE"),
      delegate("BASE", "SUIT.HEALTH"),
      { agent: "SUIT.HEALTH", kind: "tool", detail: { tool: "get_suit_status" } },
    ],
    answer: "Oxygen, pressure and CO2 are nominal. No fault on the fan or the battery.",
  },
];

export const U1_GAZE: readonly GazeKey[] = [
  { atS: 0, at: "crew-4" },
  { atS: 4.2, at: "crew-4" },
  { atS: 6.2, at: "sky" },
  { atS: 10.4, at: "sky" },
  { atS: 12, at: "rover-3" },
  { atS: 25, at: "rover-3" },
  { atS: 26.5, at: "drone-1" },
  { atS: 31, at: "drone-1" },
  { atS: 33, at: "rover-2" },
  { atS: 40, at: "rover-2" },
  { atS: 42, at: "rover-3" },
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
