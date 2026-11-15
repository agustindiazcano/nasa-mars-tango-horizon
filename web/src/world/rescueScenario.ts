import * as THREE from "three";
import {
  AIRCRAFT_GROUNDING_TAU,
  ASTRONAUT_START,
  BASE_MODULE_FOOTPRINTS,
  BASE_ORIGIN,
  CREW4_START,
  CREW_ROSTER,
  findCrew,
  initialCrewSnapshots,
  fleetStartPos,
  RESCUE_PIT,
  RESCUE_SITE,
  t as tr,
} from "@th/shared";
import type { CrewLocation, CrewSnapshot, CrewStatus } from "@th/shared";
import {
  RESCUE_POSE_STOWED,
  RESCUE_SKILL_DURATION_S,
  rescuePoseFor,
  type RescuePose,
  type RescueSkillId,
} from "./rescueRobotProc";

/** Fixed simulation tick: the same elapsed time always produces the same state. */
export const RESCUE_TICK_S = 1 / 30;
export const RESCUE_DURATION_S = 180;

/** Overwatch geometry (user requirement: near the crew, never on top of it). */
export const DRONE_STANDOFF_M = 25;
export const DRONE_ORBIT_RADIUS_M = 34;
export const DRONE_ALTITUDE_M: Readonly<Record<"drone-1" | "drone-2", number>> = { "drone-1": 22, "drone-2": 28 };

export type RescueEventLevel = "info" | "warn" | "crit";

export interface RescueEvent {
  tS: number;
  id: string;
  text: string;
  level: RescueEventLevel;
  source: string;
}

interface EventSpec {
  tS: number;
  id: string;
  level: RescueEventLevel;
  source: string;
}

export type CrewViewPose = "idle" | "walk" | "lying" | "hidden";

export interface RescueUnitView {
  x: number;
  z: number;
  yaw: number;
}

export interface RescueCrewView extends RescueUnitView {
  pose: CrewViewPose;
  location: CrewLocation;
  status: CrewStatus;
  unit_id?: string;
  /** Offset above the terrain height (negative inside the pit). */
  yOffset: number;
  inPit: boolean;
  visible: boolean;
}

/** Complete scripted state at one instant; a pure function of the elapsed time. */
export interface RescueView {
  tS: number;
  phase: "traverse" | "casualty" | "storm_response" | "recovery" | "return";
  tau: number;
  windMs: number;
  sunElevDeg: number;
  units: Record<"rover-1" | "rescue-1" | "rescue-bot-1" | "drone-1" | "drone-2", RescueUnitView>;
  droneAltM: Record<"drone-1" | "drone-2", number>;
  dronesGrounded: boolean;
  crew: Record<"crew-2" | "crew-3", RescueCrewView>;
  robot: { stowed: boolean; pose: RescuePose; skill: RescueSkillId | null; progress01: number };
  rampOpen01: number;
}

// --- timeline (scenario seconds) ---------------------------------------------------------------------------------
const T_FAULT = 50;
const T_FALL = 55;
const T_FALL_END = 57;
const T_STORM = 60;
const T_RESCUE_GO = 64;
const T_DRONE_GO = 68;
const T_DRONE_CLIMB_END = 72;
const T_DRONE_STATION = 104;
const T_RESCUE_ARRIVE = 130;
const T_RAMP_OPEN = 130;
const T_ROBOT_GO = 132;
const T_ROBOT_RIM = 138;
const T_DESCEND = 140;
const T_SECURE = T_DESCEND + RESCUE_SKILL_DURATION_S.descend;
const T_WINCH = T_SECURE + RESCUE_SKILL_DURATION_S.secure;
const T_DRAG = T_WINCH + RESCUE_SKILL_DURATION_S.winch;
const T_DRAG_END = 172;
const T_RAMP_CLOSE = 174;
const T_DEPART = 176;

const TAU_BASE = 0.48;
const TAU_PEAK = 6;
const T_TAU_RAMP_END = 160;

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const smooth = (u: number) => {
  const k = clamp01(u);
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Dust opacity timeline: nominal until the storm onset, then a cubic rise to a design peak of 6. */
export function rescueTauAt(tS: number): number {
  if (tS <= T_STORM) return TAU_BASE;
  const u = seg(tS, T_STORM, T_TAU_RAMP_END);
  return TAU_BASE + (TAU_PEAK - TAU_BASE) * u * u * u;
}

/** First scenario time on the fixed tick grid at which tau reaches the aircraft grounding limit. */
export const DRONE_GROUNDING_T_S = (() => {
  for (let k = 0; k <= RESCUE_DURATION_S / RESCUE_TICK_S; k++) {
    if (rescueTauAt(k * RESCUE_TICK_S) >= AIRCRAFT_GROUNDING_TAU) return k * RESCUE_TICK_S;
  }
  return RESCUE_DURATION_S;
})();

// --- geometry -----------------------------------------------------------------------------------------------------
const P = { x: RESCUE_SITE.x, z: RESCUE_SITE.z };
const toBase = (() => {
  const dx = BASE_ORIGIN.x - P.x;
  const dz = BASE_ORIGIN.z - P.z;
  const d = Math.hypot(dx, dz);
  return { x: dx / d, z: dz / d };
})();
const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);
const at = (o: { x: number; z: number }, d: { x: number; z: number }, m: number) => ({ x: o.x + d.x * m, z: o.z + d.z * m });
const neg = (d: { x: number; z: number }) => ({ x: -d.x, z: -d.z });

const ROVER1 = { x: P.x - 26, z: P.z + 14 };
const toRover = (() => {
  const dx = ROVER1.x - P.x;
  const dz = ROVER1.z - P.z;
  const d = Math.hypot(dx, dz);
  return { x: dx / d, z: dz / d };
})();
const PARK = at(P, toBase, 18);
const BAY = at(PARK, neg(toBase), 1.9);
const RIM_ROBOT = at(P, toBase, 2.9);
const DRAG_END = at(PARK, neg(toBase), 4.2);
const PIT_FLOOR_XZ = at(P, toBase, 1.0);
const CREW2_RIM = at(P, toRover, 5.5);
const CREW2_BOARD = at(PARK, neg(toBase), 3.0);
const FORWARD_TO_PIT = neg(toBase);
const YAW_TO_PIT = yawOf(FORWARD_TO_PIT.x, FORWARD_TO_PIT.z);
const YAW_TO_BASE = yawOf(toBase.x, toBase.z);
const THETA_BASE = Math.atan2(toBase.z, toBase.x);
const ORBIT_OMEGA = 0.03;
const ORBIT_PHASE: Record<"drone-1" | "drone-2", number> = {
  "drone-1": THETA_BASE + Math.PI / 2,
  "drone-2": THETA_BASE - Math.PI / 2,
};
const orbitPoint = (phi: number) => ({
  x: P.x + DRONE_ORBIT_RADIUS_M * Math.cos(phi),
  z: P.z + DRONE_ORBIT_RADIUS_M * Math.sin(phi),
});

const CREW3_WALK_R = 9;
const crew3Circle = (t: number) => {
  const a = Math.atan2(toRover.z, toRover.x) + 0.12 * t;
  return { x: P.x + CREW3_WALK_R * Math.cos(a), z: P.z + CREW3_WALK_R * Math.sin(a), a };
};

function computeView(t: number): RescueView {
  const tau = rescueTauAt(t);
  const stormU = clamp01((tau - TAU_BASE) / (TAU_PEAK - TAU_BASE));
  const grounded = t >= DRONE_GROUNDING_T_S;
  const tl = Math.min(t, DRONE_GROUNDING_T_S);

  // rover-1: parked at the traverse site (the scenario starts on site; the fault only stops EVA support)
  const rover1: RescueUnitView = { x: ROVER1.x, z: ROVER1.z, yaw: yawOf(P.x - ROVER1.x, P.z - ROVER1.z) };

  // rescue-1: base -> parking spot facing the pit, turns its rear bay to the pit, later drives back toward the base
  const r1Start = fleetStartPos("rescue-1");
  const driveYaw = yawOf(PARK.x - r1Start.x, PARK.z - r1Start.z);
  let rescue1: RescueUnitView;
  if (t < T_RESCUE_GO) {
    rescue1 = { x: r1Start.x, z: r1Start.z, yaw: driveYaw };
  } else if (t < T_RESCUE_ARRIVE - 4) {
    const u = smooth(seg(t, T_RESCUE_GO, T_RESCUE_ARRIVE - 4));
    rescue1 = { x: lerp(r1Start.x, PARK.x, u), z: lerp(r1Start.z, PARK.z, u), yaw: driveYaw };
  } else if (t < T_DEPART) {
    const turn = smooth(seg(t, T_RESCUE_ARRIVE - 4, T_RESCUE_ARRIVE));
    rescue1 = { x: PARK.x, z: PARK.z, yaw: driveYaw + Math.PI * turn };
  } else {
    const u = smooth(seg(t, T_DEPART, RESCUE_DURATION_S));
    const away = at(PARK, toBase, 40 * u);
    rescue1 = { x: away.x, z: away.z, yaw: YAW_TO_BASE };
  }

  // rescue-bot-1
  let robot: RescueUnitView;
  let stowed = false;
  const skill: RescueSkillId | null =
    t >= T_DESCEND && t < T_SECURE ? "descend" : t >= T_SECURE && t < T_WINCH ? "secure" : t >= T_WINCH && t < T_DRAG ? "winch" : null;
  let skillStart = 0;
  if (skill === "descend") skillStart = T_DESCEND;
  else if (skill === "secure") skillStart = T_SECURE;
  else if (skill === "winch") skillStart = T_WINCH;
  const progress01 = skill ? seg(t, skillStart, skillStart + RESCUE_SKILL_DURATION_S[skill]) : 0;
  let pose: RescuePose;
  if (t < T_ROBOT_GO) {
    stowed = true;
    robot = { x: BAY.x, z: BAY.z, yaw: rescue1.yaw };
    pose = RESCUE_POSE_STOWED;
  } else if (t < T_ROBOT_RIM) {
    const u = seg(t, T_ROBOT_GO, T_ROBOT_RIM);
    robot = { x: lerp(BAY.x, RIM_ROBOT.x, u), z: lerp(BAY.z, RIM_ROBOT.z, u), yaw: YAW_TO_PIT };
    pose = RESCUE_POSE_STOWED;
  } else if (t < T_DRAG) {
    const turn = smooth(seg(t, T_ROBOT_RIM, T_DESCEND));
    robot = { x: RIM_ROBOT.x, z: RIM_ROBOT.z, yaw: YAW_TO_PIT + Math.PI * turn };
    pose = skill ? rescuePoseFor(skill, progress01, RESCUE_PIT.depthM) : RESCUE_POSE_STOWED;
  } else if (t < T_DRAG_END) {
    const u = seg(t, T_DRAG, T_DRAG_END);
    robot = { x: lerp(RIM_ROBOT.x, DRAG_END.x, u), z: lerp(RIM_ROBOT.z, DRAG_END.z, u), yaw: YAW_TO_BASE };
    pose = rescuePoseFor("winch", 1, RESCUE_PIT.depthM);
  } else if (t < T_RAMP_CLOSE) {
    robot = { x: DRAG_END.x, z: DRAG_END.z, yaw: YAW_TO_BASE };
    pose = rescuePoseFor("winch", 1, RESCUE_PIT.depthM);
  } else {
    stowed = true;
    robot = { x: rescue1.x, z: rescue1.z, yaw: rescue1.yaw };
    pose = RESCUE_POSE_STOWED;
  }
  const rampOpen01 =
    t < T_RAMP_OPEN ? 0 : t < T_RAMP_OPEN + 2 ? seg(t, T_RAMP_OPEN, T_RAMP_OPEN + 2) : t < T_RAMP_CLOSE ? 1 : 1 - seg(t, T_RAMP_CLOSE, T_RAMP_CLOSE + 2);

  // drones
  const droneIds = ["drone-1", "drone-2"] as const;
  const drones = {} as Record<(typeof droneIds)[number], RescueUnitView>;
  const droneAlt = {} as Record<(typeof droneIds)[number], number>;
  for (const id of droneIds) {
    const s = fleetStartPos(id);
    const entry = orbitPoint(ORBIT_PHASE[id]);
    let x: number;
    let z: number;
    if (t < T_DRONE_GO) {
      x = s.x;
      z = s.z;
    } else if (t < T_DRONE_STATION) {
      const u = smooth(seg(t, T_DRONE_GO, T_DRONE_STATION));
      x = lerp(s.x, entry.x, u);
      z = lerp(s.z, entry.z, u);
    } else {
      const p = orbitPoint(ORBIT_PHASE[id] + ORBIT_OMEGA * (tl - T_DRONE_STATION));
      x = p.x;
      z = p.z;
    }
    const ahead = t >= T_DRONE_STATION && !grounded ? orbitPoint(ORBIT_PHASE[id] + ORBIT_OMEGA * (tl - T_DRONE_STATION) + 0.05) : { x: P.x, z: P.z };
    drones[id] = { x, z, yaw: yawOf(ahead.x - x, ahead.z - z) };
    const cruise = DRONE_ALTITUDE_M[id];
    droneAlt[id] =
      t < T_DRONE_GO
        ? 14
        : !grounded
          ? lerp(14, cruise, smooth(seg(t, T_DRONE_GO, T_DRONE_CLIMB_END)))
          : lerp(cruise, 0.35, smooth(seg(t, DRONE_GROUNDING_T_S, DRONE_GROUNDING_T_S + 4)));
  }

  // crew-2 (driver): works near rover-1, goes to the pit rim after the fall, then boards rescue-1
  const c2a = 0.5 * t;
  let crew2: RescueCrewView;
  if (t < T_FALL) {
    const x = ROVER1.x + 3 * Math.cos(c2a);
    const z = ROVER1.z + 3 * Math.sin(c2a);
    crew2 = { x, z, yaw: yawOf(-Math.sin(c2a), Math.cos(c2a)), pose: "walk", location: "traverse", status: "nominal", yOffset: 0, inPit: false, visible: true };
  } else if (t < 70) {
    const u = smooth(seg(t, T_FALL, 70));
    const from = { x: ROVER1.x + 3 * Math.cos(0.5 * T_FALL), z: ROVER1.z + 3 * Math.sin(0.5 * T_FALL) };
    crew2 = {
      x: lerp(from.x, CREW2_RIM.x, u),
      z: lerp(from.z, CREW2_RIM.z, u),
      yaw: yawOf(P.x - from.x, P.z - from.z),
      pose: u < 1 ? "walk" : "idle",
      location: "traverse", status: "nominal",
      yOffset: 0,
      inPit: false,
      visible: true,
    };
  } else if (t < T_DRAG - 2) {
    crew2 = { x: CREW2_RIM.x, z: CREW2_RIM.z, yaw: yawOf(P.x - CREW2_RIM.x, P.z - CREW2_RIM.z), pose: "idle", location: "traverse", status: "nominal", yOffset: 0, inPit: false, visible: true };
  } else if (t < T_DRAG_END) {
    const u = seg(t, T_DRAG - 2, T_DRAG_END);
    crew2 = {
      x: lerp(CREW2_RIM.x, CREW2_BOARD.x, u),
      z: lerp(CREW2_RIM.z, CREW2_BOARD.z, u),
      yaw: yawOf(CREW2_BOARD.x - CREW2_RIM.x, CREW2_BOARD.z - CREW2_RIM.z),
      pose: "walk",
      location: "traverse", status: "nominal",
      yOffset: 0,
      inPit: false,
      visible: true,
    };
  } else {
    crew2 = { x: rescue1.x, z: rescue1.z, yaw: rescue1.yaw, pose: "hidden", location: "rescue_vehicle", status: "evacuating", unit_id: "rescue-1", yOffset: 0, inPit: false, visible: false };
  }

  // crew-3 (geologist): walks the rim, falls into the pit, is raised on the stretcher and dragged to rescue-1
  const c3 = crew3Circle(Math.min(t, T_FAULT));
  const c3Rim = at(P, { x: Math.cos(c3.a), z: Math.sin(c3.a) }, 2.2);
  let crew3: RescueCrewView;
  if (t < T_FAULT) {
    const c = crew3Circle(t);
    crew3 = { x: c.x, z: c.z, yaw: yawOf(-Math.sin(c.a), Math.cos(c.a)), pose: "walk", location: "traverse", status: "nominal", yOffset: 0, inPit: false, visible: true };
  } else if (t < T_FALL) {
    const u = smooth(seg(t, T_FAULT, T_FALL));
    crew3 = {
      x: lerp(c3.x, c3Rim.x, u),
      z: lerp(c3.z, c3Rim.z, u),
      yaw: yawOf(P.x - c3.x, P.z - c3.z),
      pose: "walk",
      location: "traverse", status: "nominal",
      yOffset: 0,
      inPit: false,
      visible: true,
    };
  } else if (t < T_WINCH) {
    const u = smooth(seg(t, T_FALL, T_FALL_END));
    crew3 = {
      x: lerp(c3Rim.x, PIT_FLOOR_XZ.x, u),
      z: lerp(c3Rim.z, PIT_FLOOR_XZ.z, u),
      yaw: YAW_TO_BASE,
      pose: "lying",
      location: (u >= 1) ? "in_pit" : "traverse", status: t < (T_WINCH + T_DRAG) / 2 ? "incapacitated" : "evacuating",
      yOffset: -RESCUE_PIT.depthM * u,
      inPit: u >= 1,
      visible: true,
    };
  } else if (t < T_DRAG) {
    const u = smooth(seg(t, T_WINCH, T_DRAG));
    crew3 = {
      x: PIT_FLOOR_XZ.x,
      z: PIT_FLOOR_XZ.z,
      yaw: YAW_TO_BASE,
      pose: "lying",
      location: (u < 0.5) ? "in_pit" : "traverse", status: t < (T_WINCH + T_DRAG) / 2 ? "incapacitated" : "evacuating",
      yOffset: lerp(-RESCUE_PIT.depthM, 0.35, u),
      inPit: u < 0.5,
      visible: true,
    };
  } else if (t < T_DRAG_END) {
    const trail = at(robot, neg(toBase), 1.9);
    crew3 = { x: trail.x, z: trail.z, yaw: YAW_TO_BASE, pose: "lying", location: "traverse", status: t < (T_WINCH + T_DRAG) / 2 ? "incapacitated" : "evacuating", yOffset: 0.35, inPit: false, visible: true };
  } else {
    crew3 = { x: rescue1.x, z: rescue1.z, yaw: rescue1.yaw, pose: "hidden", location: "rescue_vehicle", status: "evacuating", unit_id: "rescue-1", yOffset: 0, inPit: false, visible: false };
  }

  const phase: RescueView["phase"] =
    t < T_FALL ? "traverse" : t < T_STORM ? "casualty" : t < T_RESCUE_ARRIVE ? "storm_response" : t < T_DEPART ? "recovery" : "return";

  return {
    tS: t,
    phase,
    tau,
    windMs: 5.2 + stormU * 21,
    sunElevDeg: 54 - stormU * 18,
    units: { "rover-1": rover1, "rescue-1": rescue1, "rescue-bot-1": robot, "drone-1": drones["drone-1"], "drone-2": drones["drone-2"] },
    droneAltM: droneAlt,
    dronesGrounded: grounded,
    crew: { "crew-2": crew2, "crew-3": crew3 },
    robot: { stowed, pose, skill, progress01 },
    rampOpen01,
  };
}

const EVENT_SPECS: EventSpec[] = [
  { tS: 0, id: "start", level: "info", source: "BASE" },
  { tS: T_FAULT, id: "rover_fault", level: "crit", source: "MAINTENANCE" },
  { tS: 52, id: "diagnosis", level: "warn", source: "MAINTENANCE" },
  { tS: T_FALL, id: "crew3_fall", level: "crit", source: "SUIT.HEALTH" },
  { tS: 58, id: "crew3_vitals", level: "crit", source: "SUIT.HEALTH" },
  { tS: T_STORM, id: "storm_onset", level: "warn", source: "WEATHER-RAD" },
  { tS: 62, id: "base_decision", level: "info", source: "BASE" },
  { tS: T_RESCUE_GO, id: "rescue1_dispatch", level: "info", source: "GUARDIAN" },
  { tS: 66, id: "ask_human", level: "warn", source: "BASE" },
  { tS: T_DRONE_GO, id: "drones_launch", level: "info", source: "GUARDIAN" },
  { tS: T_DRONE_STATION, id: "drones_on_station", level: "info", source: "SCIENCE" },
  { tS: DRONE_GROUNDING_T_S, id: "drones_grounded", level: "warn", source: "WEATHER-RAD" },
  { tS: T_RESCUE_ARRIVE, id: "rescue1_arrive", level: "info", source: "GUARDIAN" },
  { tS: T_RAMP_OPEN, id: "ramp_open", level: "info", source: "ROBOT.rescue-bot-1" },
  { tS: T_ROBOT_GO, id: "robot_deploy", level: "info", source: "ROBOT.rescue-bot-1" },
  { tS: T_DESCEND, id: "robot_descend", level: "info", source: "ROBOT.rescue-bot-1" },
  { tS: T_SECURE, id: "robot_secure", level: "info", source: "ROBOT.rescue-bot-1" },
  { tS: T_WINCH, id: "robot_winch", level: "info", source: "ROBOT.rescue-bot-1" },
  { tS: T_DRAG, id: "robot_drag", level: "info", source: "ROBOT.rescue-bot-1" },
  { tS: T_DRAG_END, id: "crew_boarded", level: "info", source: "BASE" },
  { tS: T_DEPART, id: "convoy_departure", level: "info", source: "BASE" },
  { tS: RESCUE_DURATION_S, id: "scenario_end", level: "info", source: "BASE" },
];
EVENT_SPECS.sort((a, b) => a.tS - b.tS);

export interface RescueScenarioDeps {
  /** Terrain height (m) at a world point; entity y coordinates are built on it. */
  heightAt: (x: number, z: number) => number;
  /** Position of the player astronaut (`crew-1`); defaults to `ASTRONAUT_START`. */
  getCrew1?: () => { x: number; z: number };
  /** Called once per event when it fires during normal stepping (not during `seekTo`). */
  onEvent?: (event: RescueEvent) => void;
}

/**
 * Scripted crew rescue scenario (plan 22): 180 s, deterministic and seekable. Everything the scene shows is a pure
 * function of the elapsed time, advanced in fixed 1/30 s ticks, so `seekTo(t)` always reproduces the same state.
 */
export class RescueScenario {
  readonly durationS = RESCUE_DURATION_S;
  private ticks = 0;
  private tickAcc = 0;
  private _running = false;
  private fired: RescueEvent[] = [];
  private nextEvent = 0;
  private silent = false;
  private started = false;

  constructor(private deps: RescueScenarioDeps) {}

  get elapsedS(): number {
    return this.ticks * RESCUE_TICK_S;
  }

  get running(): boolean {
    return this._running;
  }

  /** Events already fired, oldest first. */
  get events(): RescueEvent[] {
    return [...this.fired];
  }

  /** Scripted state at the current elapsed time. */
  get view(): RescueView {
    return computeView(this.elapsedS);
  }

  start(): void {
    this.reset();
    this.started = true;
    this._running = true;
    this.fireDue();
  }

  pause(): void {
    this._running = false;
  }

  resume(): void {
    if (this.ticks < this.durationS / RESCUE_TICK_S) this._running = true;
  }

  reset(): void {
    this.ticks = 0;
    this.tickAcc = 0;
    this._running = false;
    this.fired = [];
    this.nextEvent = 0;
    this.started = false;
  }

  /** Advances the scenario by `dt` seconds (rounded down to whole 1/30 s ticks; the remainder carries over). */
  step(dt: number): void {
    if (!this._running || dt <= 0) return;
    this.tickAcc += dt / RESCUE_TICK_S;
    const whole = Math.floor(this.tickAcc + 1e-6);
    this.tickAcc -= whole;
    const maxTicks = Math.round(this.durationS / RESCUE_TICK_S);
    this.ticks = Math.min(maxTicks, this.ticks + whole);
    this.fireDue();
    if (this.ticks >= maxTicks) this._running = false;
  }

  /** Jumps to scenario time `tS`: resets, then replays fixed ticks, so the same `tS` always gives the same state. */
  seekTo(tS: number): void {
    const wasRunning = this._running;
    const target = Math.round(Math.min(this.durationS, Math.max(0, tS)) / RESCUE_TICK_S);
    this.reset();
    this.started = true;
    this.silent = true;
    this._running = true;
    this.fireDue();
    for (let k = 0; k < target; k++) this.step(RESCUE_TICK_S);
    this.silent = false;
    this._running = wasRunning && this.ticks < Math.round(this.durationS / RESCUE_TICK_S);
  }

  /** World position of an entity, or null for an unknown id. `y` is terrain height plus altitude or pit offset. */
  getEntityPosition(rawId: string): THREE.Vector3 | null {
    // Crew entities accept both ids ("crew-3") and callsigns ("YACONIS").
    const id = findCrew(rawId)?.id ?? rawId;
    const v = this.view;
    const h = (x: number, z: number) => this.deps.heightAt(x, z);
    const ground = (x: number, z: number, dy = 0) => new THREE.Vector3(x, h(x, z) + dy, z);
    switch (id) {
      case "base":
        return ground(BASE_ORIGIN.x, BASE_ORIGIN.z);
      case "compute": {
        const m = BASE_MODULE_FOOTPRINTS.find((f) => f.id === "compute");
        return ground(BASE_ORIGIN.x + (m?.offsetX ?? 10), BASE_ORIGIN.z + (m?.offsetZ ?? 0));
      }
      case "pit":
      case "rescue-site":
        return ground(RESCUE_SITE.x, RESCUE_SITE.z);
      case "crew-1": {
        const p = this.deps.getCrew1?.() ?? ASTRONAUT_START;
        return ground(p.x, p.z);
      }
      case "crew-2":
      case "crew-3": {
        const c = v.crew[id];
        return ground(c.x, c.z, c.yOffset);
      }
      case "crew-4":
        return ground(CREW4_START.x, CREW4_START.z);
      case "rover-1":
      case "rescue-1":
      case "rescue-bot-1": {
        const u = v.units[id];
        return ground(u.x, u.z, id === "rescue-bot-1" && v.robot.stowed ? 0.5 : 0);
      }
      case "rover-2":
      case "rover-3": {
        const s = fleetStartPos(id);
        return ground(s.x, s.z);
      }
      case "drone-1":
      case "drone-2": {
        const u = v.units[id];
        return ground(u.x, u.z, v.droneAltM[id]);
      }
      default:
        return null;
    }
  }

  /**
   * The four astronauts by callsign (roster order): position, location and status at the current time.
   * Before `start()` the expedition crew rides in `rover-1` at its base position.
   */
  getCrewSnapshots(): CrewSnapshot[] {
    const crew1 = this.deps.getCrew1?.() ?? ASTRONAUT_START;
    const rover = fleetStartPos("rover-1");
    const v = this.view;
    const base = initialCrewSnapshots(BASE_ORIGIN, rover);
    return CREW_ROSTER.map((m) => {
      const init = base.find((c) => c.id === m.id)!;
      if (m.id === "crew-1") return { ...init, x: crew1.x, z: crew1.z };
      if (m.id === "crew-4") return { ...init, x: CREW4_START.x, z: CREW4_START.z };
      if (!this.started) return init;
      const c = v.crew[m.id as "crew-2" | "crew-3"];
      return {
        id: m.id,
        name: m.name,
        assignment: m.assignment,
        x: c.x,
        z: c.z,
        location: c.location,
        status: c.status,
        ...(c.unit_id ? { unit_id: c.unit_id } : {}),
      };
    });
  }

  private fireDue(): void {
    const t = this.elapsedS + 1e-9;
    while (this.nextEvent < EVENT_SPECS.length && EVENT_SPECS[this.nextEvent].tS <= t) {
      const spec = EVENT_SPECS[this.nextEvent++];
      const ev: RescueEvent = {
        tS: spec.tS,
        id: spec.id,
        text: tr(`rescue.ev.${spec.id}`),
        level: spec.level,
        source: spec.source,
      };
      this.fired.push(ev);
      if (!this.silent) this.deps.onEvent?.(ev);
    }
  }
}

/** All scripted event ids in firing order (for tests and the scene panel). */
export function rescueEventIds(): string[] {
  return EVENT_SPECS.map((e) => e.id);
}
