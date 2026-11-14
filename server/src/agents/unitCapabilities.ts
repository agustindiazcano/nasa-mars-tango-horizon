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

const ALL = ["rover_crew", "rover_science", "rover_cargo", "scout", "rescue", "drone", "glider", "manipulator"];
const FLYERS = ["drone", "glider"];

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
