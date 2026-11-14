import type { Lang } from "../i18n/index.js";

/** Fleet unit archetypes supported across terrain, flight, and manipulation tasks. */
export type UnitKind =
  | "rover_crew"
  | "rover_science"
  | "rover_cargo"
  | "scout"
  | "rescue"
  | "drone"
  | "glider"
  | "manipulator";

/** Terrain visualization layers rendered in the 3D viewer and minimap. */
export type HudLayer = "optical" | "slope" | "thermal" | "radiation" | "hydration";

/** HUD panels toggleable by pointer, menu, or voice agent. */
export type HudPanel =
  | "map"
  | "layers"
  | "fleet"
  | "agents"
  | "health"
  | "base"
  | "provenance"
  | "language"
  | "none";

export interface AstronautSnapshot {
  x: number;
  z: number;
  speed: number;
  load_kg: number;
  body_kg: number;
  yaw?: number;
  grade_pct?: number;
}

export interface EnvironmentSnapshot {
  pressure_pa: number;
  air_temp_k: number;
  ground_temp_k?: number;
  tau: number;
  wind_ms: number;
  wind_dir_deg?: number;
  dose_rate_ugy_h: number;
  cumulative_dose_ugy?: number;
  sol?: number;
  lst_h?: number;
}

export interface FleetUnitSnapshot {
  id: string;
  kind: UnitKind | (string & {});
  x: number;
  z: number;
  battery: number;
  busy: boolean;
  task?: string | null;
}

export interface HudSnapshot {
  layer: HudLayer | (string & {});
  panel: HudPanel | (string & {}) | null;
}

/**
 * Stateless mission state snapshot sent from the browser to backend agents
 * on every `/api/agent/*` request. The browser remains the single source of truth.
 */
export interface MissionContext {
  lang: Lang;
  met_s: number;
  astronaut: AstronautSnapshot;
  suit: Record<string, number>;
  env: EnvironmentSnapshot;
  fleet: FleetUnitSnapshot[];
  hud: HudSnapshot;
  leak_diameter_m: number;
}

export type VerdictDecision = "allow" | "deny" | "ask_human";
export type VerdictBy = "rules" | "judge";

export interface Verdict {
  decision: VerdictDecision;
  reason: string;
  by: VerdictBy;
  reasonKey?: string;
  reasonParams?: Record<string, string | number>;
}

export type ActionType =
  | "dispatch"
  | "launch_pod"
  | "arm_skill"
  | "set_layer"
  | "open_panel"
  | "show_route"
  | "show_alert"
  | "highlight";

/** Proposed effect action. Applied by the browser only after GUARDIAN approval. */
export interface Action {
  type: ActionType | (string & {});
  args: Record<string, unknown>;
  proposedBy: string;
  verdict?: Verdict;
}

export type TraceEventKind = "delegate" | "tool" | "verdict" | "say";

export interface TraceEvent {
  t: number;
  agent: string;
  kind: TraceEventKind;
  detail: unknown;
}

export interface AgentVoiceResponse {
  speech: string;
  actions: Action[];
  trace: TraceEvent[];
  route: string[];
}

export interface AgentRunResponse {
  speech: string;
  actions: Action[];
  trace: TraceEvent[];
}

export interface AgentVisionResponse {
  speech: string;
  injection: boolean;
}
