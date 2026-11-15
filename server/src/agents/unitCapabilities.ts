import { CREW_ROSTER } from "@th/shared";
import type { CrewSnapshot, MissionContext } from "./types.js";

/** Overwatch drones hold at least this horizontal distance from every crew member (design assumption). */
export const DRONE_CREW_STANDOFF_M = 25;
/** Overwatch altitude band above local terrain and orbit radius band around the target (design assumptions). */
export const OVERWATCH_ALT_MIN_M = 20;
export const OVERWATCH_ALT_MAX_M = 30;
export const OVERWATCH_RADIUS_MIN_M = 25;
export const OVERWATCH_RADIUS_MAX_M = 40;
/** The rescue robot is deployed only while its carrier is within this distance of the casualty. */
export const RESCUE_ROBOT_MAX_CARRIER_DIST_M = 40;

/** Crew positions from the snapshot; falls back to the astronaut as `crew-1` when the client sent none. */
export function crewOf(ctx: MissionContext): CrewSnapshot[] {
  if (ctx.crew?.length) return ctx.crew;
  return [
    {
      id: "crew-1",
      name: "DIAZ-CANO",
      assignment: "base",
      x: ctx.astronaut.x,
      z: ctx.astronaut.z,
      location: "base",
      status: "nominal",
    },
  ];
}

const CREW_ROLE: Record<string, string> = {
  "crew.role.eva_lead": "EVA lead, player astronaut",
  "crew.role.base_ops": "base operations",
  "crew.role.driver": "expedition driver",
  "crew.role.geologist": "expedition geologist",
};

/**
 * Roster block for every agent system prompt: the four astronauts by callsign with their live location and status.
 * Agents and spoken replies must name people by callsign, never as "crew-3" or "astronaut 3".
 */
export function crewBrief(ctx?: MissionContext): string {
  const live = new Map((ctx?.crew ?? []).map((c) => [c.id, c]));
  const people = CREW_ROSTER.map((m) => {
    const c = live.get(m.id);
    const now = c ? `, now ${c.location}, ${c.status}` : "";
    return `${m.name} (${CREW_ROLE[m.roleKey] ?? m.roleKey}; assigned to ${m.assignment === "base" ? "the base" : "the science expedition"}${now})`;
  });
  return `Crew in operation: ${people.join("; ")}. Refer to people by callsign only (DIAZ-CANO, SALERNO, SOTELO, YACONIS), never by index or "crew-N". Use get_crew_status for live positions.`;
}

/**
 * Catalog of actions a fleet unit can perform on voice orders.
 * Single source of truth for the `unit_action` tool, GUARDIAN capability checks and ROBOT.<id> prompts.
 * `goto` (dispatch) and the manip-1 arm skills (arm_skill) are separate tools and listed here for the prompts only.
 */
export const UNIT_ACTION_IDS = [
  "takeoff",
  "land",
  "photograph_area",
  "hover_overwatch",
  "follow_astronaut",
  "return_to_base",
  "survey_area",
  "hold_position",
  "relay_comms",
  "deliver_supplies",
] as const;

export type UnitActionId = (typeof UNIT_ACTION_IDS)[number];

const ALL = ["rover_crew", "rover_science", "rover_cargo", "scout", "rescue", "drone", "glider", "manipulator", "robot", "rescue_robot"];
const FLYERS = ["drone", "glider"];

export const MAX_SLOPE: Record<string, number> = {
  rover_crew: 20,
  rover_science: 25,
  rover_cargo: 18,
  scout: 28,
  rescue: 25,
  manipulator: 22,
  robot: 25,
  rescue_robot: 20,
};

export interface UnitActionSpec {
  /** Unit kinds allowed to run the action. */
  kinds: string[];
  /** Needs aircraft-flyable dust opacity (tau < 1.8) and 15% battery. */
  flight: boolean;
  description: string;
  example: string;
}

export const UNIT_ACTIONS: Record<UnitActionId, UnitActionSpec> = {
  takeoff: {
    kinds: FLYERS,
    flight: true,
    description: "Lift off and climb to altitude_m (default 14 m, max 40 m).",
    example: "Drone uno, despegá",
  },
  land: {
    kinds: FLYERS,
    flight: false,
    description: "Descend and land at the current position.",
    example: "Drone uno, aterrizá",
  },
  photograph_area: {
    kinds: ["drone", "glider", "scout", "rover_science"],
    flight: false,
    description: "Go to (x, z) or ~60 m toward heading (north|east|south|west) and capture a photo.",
    example: "Drone uno, fotografiá la zona al este",
  },
  hover_overwatch: {
    kinds: FLYERS,
    flight: true,
    description: "Station above the astronaut and watch the surroundings.",
    example: "Drone, vigilá desde arriba",
  },
  follow_astronaut: {
    kinds: ALL,
    flight: false,
    description: "Move to the astronaut and keep a 5 m stand-off.",
    example: "Rover, seguime",
  },
  return_to_base: {
    kinds: ALL,
    flight: false,
    description: "Return to the base at the scene center.",
    example: "Scout, volvé a la base",
  },
  survey_area: {
    kinds: ["rover_science", "scout", "drone", "glider"],
    flight: false,
    description: "Survey the area around (x, z).",
    example: "Rover dos, relevá la zona del norte",
  },
  hold_position: {
    kinds: ALL,
    flight: false,
    description: "Stop and hold the current position.",
    example: "Rover uno, quedate ahí",
  },
  relay_comms: {
    kinds: ["rover_crew", "rover_science", "drone", "glider"],
    flight: false,
    description: "Move to (x, z) and act as a UWB / radio relay node.",
    example: "Drone, hacé de repetidor en esa loma",
  },
  deliver_supplies: {
    kinds: ["rover_cargo", "rescue", "rover_crew"],
    flight: false,
    description: "Carry supplies (O2 bottle, tools) to the astronaut and stop at a 5 m stand-off.",
    example: "Rescue uno, traeme oxígeno",
  },
};

export function capabilitiesFor(kind: string): UnitActionId[] {
  return UNIT_ACTION_IDS.filter((id) => UNIT_ACTIONS[id].kinds.includes(kind));
}

/** Prompt block listing what a unit of this kind can do and which tool to call. */
export function capabilityPrompt(unitId: string, kind: string): string {
  const list = capabilitiesFor(kind)
    .map((id) => `- ${id}: ${UNIT_ACTIONS[id].description} (e.g. "${UNIT_ACTIONS[id].example}")`)
    .join("\n");
  return `Actions you can run with the unit_action tool (unit_id "${unitId}"):\n${list}\nTo drive to explicit coordinates use dispatch (task goto). Map the spoken order to the closest action and call the tool once; if no action fits, say so.`;
}
