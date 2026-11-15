import { AIRCRAFT_GROUNDING_TAU, BASE_ORIGIN, LAUNCHER_PRIMARY_COORD, RESCUE_SITE, fleetStartPos } from "@th/shared";

/**
 * Scripted narration of the orchestrator agent for the rescue video. No model is called: every line is a
 * translated template filled with values computed from the deterministic scenario (distances, ETAs, coordinates).
 * Lines are keyed to scenario events (id plus a delay), so re-timing the scenario moves the narration with it.
 */

export interface NarrationLine {
  /** Scenario time (s) at which the line is said. */
  tS: number;
  id: string;
  /** Speaking agent, as shown in the chat (`BASE`, `WEATHER-RAD`, `ROBOT.rescue-bot-1`, ...). */
  agent: string;
  text: string;
}

export interface XZ {
  x: number;
  z: number;
}

/** Everything the narration needs from the scenario, so it can be tested with a stub. */
export interface NarrationCtx {
  /** Scenario time (s) of an event, or null when the event does not exist. */
  eventT(id: string): number | null;
  /** World position of an entity (`YACONIS`, `rescue-1`, ...) at scenario time `tS`. */
  pos(id: string, tS: number): XZ | null;
  /** Dust opacity at scenario time `tS`. */
  tau(tS: number): number;
  /** Formats a world point as latitude/longitude text. */
  coords(x: number, z: number): string;
  /** Drone standoff distance from any crew member (m). */
  standoffM: number;
}

type Params = Record<string, string | number>;

interface Spec {
  id: string;
  agent: string;
  after: string;
  delayS?: number;
  params?: (c: NarrationCtx, t: number) => Params;
}

const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
const km = (m: number) => (m / 1000).toFixed(1);
const FALLBACK: XZ = { x: RESCUE_SITE.x, z: RESCUE_SITE.z };
/** Cruise speed of rescue-1 (m/s, same as `FLEET_SPECS`) used for the return ETA. */
const RESCUE1_SPEED_MS = 5.5;
/** Designed impact offset of the life-support pod from the casualty (m); the pod keep-out is 15 m. */
const POD_IMPACT_OFFSET_M = 32;

export const NARRATION: readonly Spec[] = [
  {
    id: "rover_fault",
    agent: "MAINTENANCE",
    after: "rover_fault",
    delayS: 1,
    params: (c) => ({ dist_km: km(dist(BASE_ORIGIN, c.pos("rover-1", c.eventT("rover_fault") ?? 0) ?? FALLBACK)) }),
  },
  { id: "crew3_fall", agent: "SUIT.HEALTH", after: "crew3_fall", delayS: 1 },
  {
    id: "storm_onset",
    agent: "WEATHER-RAD",
    after: "storm_onset",
    delayS: 1,
    params: (c, t) => ({ tau_a: c.tau(t).toFixed(1), tau_b: c.tau(180).toFixed(1) }),
  },
  {
    id: "base_decision",
    agent: "BASE",
    after: "base_decision",
    delayS: 0.5,
    params: (c, t) => {
      const s = c.pos("SOTELO", t) ?? FALLBACK;
      const y = c.pos("YACONIS", t) ?? FALLBACK;
      return { coords_sotelo: c.coords(s.x, s.z), coords_yaconis: c.coords(y.x, y.z) };
    },
  },
  {
    id: "rescue1_dispatch",
    agent: "BASE",
    after: "rescue1_dispatch",
    delayS: 0.5,
    params: (c) => {
      const go = c.eventT("rescue1_dispatch") ?? 0;
      const arrive = c.eventT("rescue1_arrive") ?? go;
      const from = fleetStartPos("rescue-1");
      const site = c.pos("pit", go) ?? FALLBACK;
      return { dist_km: km(dist(from, site)), eta_s: Math.round(arrive - go) };
    },
  },
  {
    id: "pod_trajectory",
    agent: "BASE",
    after: "rescue1_dispatch",
    delayS: 2.5,
    params: (c, t) => {
      const y = c.pos("YACONIS", t) ?? FALLBACK;
      return { pod_km: km(dist(LAUNCHER_PRIMARY_COORD, y)), impact_m: POD_IMPACT_OFFSET_M, coords_yaconis: c.coords(y.x, y.z) };
    },
  },
  { id: "ask_human", agent: "BASE", after: "ask_human", delayS: 0.5 },
  {
    id: "drones_launch",
    agent: "BASE",
    after: "drones_launch",
    delayS: 0.5,
    params: (c) => {
      const go = c.eventT("drones_launch") ?? 0;
      const st = c.eventT("drones_on_station") ?? go;
      return { eta_s: Math.round(st - go), standoff_m: c.standoffM };
    },
  },
  { id: "drones_on_station", agent: "SCIENCE", after: "drones_on_station", delayS: 0.5 },
  { id: "drones_grounded", agent: "WEATHER-RAD", after: "drones_grounded", delayS: 0.5, params: () => ({ tau_limit: AIRCRAFT_GROUNDING_TAU }) },
  {
    id: "rescue1_arrive",
    agent: "BASE",
    after: "rescue1_arrive",
    delayS: 0.5,
    params: (c, t) => {
      const r = c.pos("rescue-1", t);
      const p = c.pos("pit", t);
      return { gap_m: r && p ? Math.round(dist(r, p)) : 0 };
    },
  },
  {
    id: "robot_deploy",
    agent: "BASE",
    after: "robot_deploy",
    delayS: 0.5,
    params: (c) => {
      const go = c.eventT("robot_deploy") ?? 0;
      const reach = c.eventT("robot_secure") ?? go;
      return { robot_eta_s: Math.round(reach - go) };
    },
  },
  { id: "robot_descend", agent: "ROBOT.rescue-bot-1", after: "robot_descend", delayS: 0.5 },
  { id: "robot_secure", agent: "ROBOT.rescue-bot-1", after: "robot_secure", delayS: 0.5 },
  {
    id: "robot_drag",
    agent: "ROBOT.rescue-bot-1",
    after: "robot_drag",
    delayS: 0.5,
    params: (c, t) => {
      const r = c.pos("rescue-bot-1", t);
      const v = c.pos("rescue-1", t);
      return { drag_m: r && v ? Math.round(dist(r, v)) : 0 };
    },
  },
  { id: "crew_boarded", agent: "BASE", after: "crew_boarded", delayS: 0.5 },
  {
    id: "convoy_departure",
    agent: "BASE",
    after: "convoy_departure",
    delayS: 0.5,
    params: (c, t) => {
      const from = c.pos("rescue-1", t) ?? FALLBACK;
      return { base_eta_min: Math.max(1, Math.ceil(dist(from, BASE_ORIGIN) / RESCUE1_SPEED_MS / 60)), dist_km: km(dist(from, BASE_ORIGIN)) };
    },
  },
];

/** Builds the narration lines (sorted by time) with the given translator. Specs whose anchor event is missing are skipped. */
export function buildNarration(ctx: NarrationCtx, tr: (key: string, params: Params) => string): NarrationLine[] {
  const lines: NarrationLine[] = [];
  for (const s of NARRATION) {
    const base = ctx.eventT(s.after);
    if (base === null) continue;
    const tS = base + (s.delayS ?? 0);
    lines.push({ tS, id: s.id, agent: s.agent, text: tr(`narr.${s.id}`, s.params ? s.params(ctx, tS) : {}) });
  }
  return lines.sort((a, b) => a.tS - b.tS || a.id.localeCompare(b.id));
}

export interface NarrationSink {
  /** Adds a line to the chat. */
  push(line: NarrationLine): void;
  /** Removes every line (used when the scenario restarts or seeks backwards). */
  clear(): void;
}

/**
 * Feeds the narration to a chat while the scenario clock advances. Going backwards (restart or seek) clears the
 * chat and refills it with every line already due, so a take that starts mid-script shows what was said before.
 */
export class NarrationFeeder {
  private next = 0;
  private lastT = 0;

  constructor(
    private lines: NarrationLine[],
    private sink: NarrationSink,
  ) {}

  setLines(lines: NarrationLine[]): void {
    this.lines = lines;
    this.next = 0;
    this.lastT = 0;
    this.sink.clear();
  }

  /** Call every frame with the scenario's elapsed time and whether the scenario is active. */
  sync(elapsedS: number, active: boolean): void {
    if (!active) {
      if (this.next > 0) {
        this.sink.clear();
        this.next = 0;
      }
      this.lastT = 0;
      return;
    }
    if (elapsedS < this.lastT - 1e-6) {
      this.sink.clear();
      this.next = 0;
    }
    this.lastT = elapsedS;
    while (this.next < this.lines.length && this.lines[this.next].tS <= elapsedS + 1e-6) {
      this.sink.push(this.lines[this.next++]);
    }
  }
}
