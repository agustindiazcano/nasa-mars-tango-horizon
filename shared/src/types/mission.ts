import type { TerrainIdentity } from "../terrainContract.js";
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
  | "manipulator"
  | "robot"
  | "rescue_robot";

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
  | "menu"
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
  data_category?: "design" | "observation" | "derived";
  radiation_quantity?: "absorbed_dose_silicon";
  storm_source?: string;
  rad_source?: string;
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
  sun_elev_deg?: number;
  solar_demand_w?: number;
  solar_area_m2?: number;
  solar_efficiency?: number;
}

/** Single bounded environmental telemetry sample in the rolling history window (max 48). */
export interface EnvTelemetrySample {
  t_s: number;
  sol?: number;
  lst_h?: number;
  pressure_pa: number;
  air_temp_k: number;
  ground_temp_k?: number;
  tau: number;
  wind_ms: number;
  dose_rate_ugy_h: number;
  sun_elev_deg?: number;
}

/** Cached CCMC DONKI / WSA-Enlil space-weather alert state. */
export interface DonkiAlert {
  active_sep: boolean;
  wsa_enlil_mars_arrival_h?: number;
  source_id?: string;
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

export type CrewStatus = "active" | "idle" | "injured" | "boarded";

/** Position and status of one crew member (`crew-1`..`crew-4`) in the mission snapshot. */
export interface CrewSnapshot {
  id: string;
  x: number;
  z: number;
  status: CrewStatus;
  /** True while the crew member lies at the bottom of the rescue pit. */
  in_pit?: boolean;
}

export interface HudSnapshot {
  layer: HudLayer | (string & {});
  panel: HudPanel | (string & {}) | null;
}

/** Consent flag controlling whether anonymized personal physiological baselines are active. */
export type CrewProfilePrivacyMode = "anonymized_baselines" | "standards_only";

/**
 * Privacy-bounded astronaut physiological baseline/delta profile.
 * Contains strictly anonymized numeric parameters (never PII or raw EMR text).
 */
export interface CrewProfile {
  privacy_mode: CrewProfilePrivacyMode;
  resting_hr_bpm?: number;
  max_hr_bpm?: number;
  hr_delta_sigma?: number;
  baseline_core_temp_c?: number;
  baseline_spo2_pct?: number;
  personal_co2_warn_pa?: number;
  personal_core_temp_warn_c?: number;
  personal_spo2_warn_pct?: number;
  personal_psi_warn?: number;
  heat_strain_index?: number;
  dcs_prebreathe_min?: number;
}

/** Single timestamped sample in the sliding EVA biomedical telemetry window. */
export interface VitalsSample {
  t_s: number;
  co2_pa?: number;
  core_temp_c?: number;
  spo2_pct?: number;
  heart_rate_bpm?: number;
  metabolic_w?: number;
  suit_pressure_pa?: number;
}

export type FaultCode =
  | "PLSS-FAN-01"
  | "PLSS-SCRUB-01"
  | "PLSS-COOL-01"
  | "RVR-MOB-01"
  | "RVR-THM-01"
  | "ARM-TORQ-01"
  | "HAB-PWR-01"
  | "ISRU-MOX-01";

export type FaultSeverity = "nominal" | "degraded" | "critical";

export interface SuitWindowSample {
  t_s: number;
  fan_pri_rpm?: number;
  fan_sec_rpm?: number;
  fan_delta_p_pa?: number;
  scrubber_a_co2_storage?: number;
  scrubber_b_co2_storage?: number;
  suit_co2_pa?: number;
  helmet_co2_pa?: number;
  coolant_ml?: number;
  coolant_liquid_pressure?: number;
  coolant_gas_pressure?: number;
  suit_temp_k?: number;
  battery_temp_c?: number;
}

export interface FleetUnitHealth {
  motor_current_a?: number;
  actuator_temp_c?: number;
  slip_ratio?: number;
  drill_torque_nm?: number;
  isolated?: boolean;
  fault_codes?: string[];
}

export interface FleetWindowSample {
  t_s: number;
  motor_current_a?: number;
  actuator_temp_c?: number;
  slip_ratio?: number;
  drill_torque_nm?: number;
  battery?: number;
}

export interface PowerIsruWindowSample {
  t_s: number;
  solar_dust_factor?: number;
  hab_bus_v?: number;
  hab_battery_temp_c?: number;
  moxie_compressor_a?: number;
  moxie_soxe_asr?: number;
  moxie_o2_rate_g_h?: number;
}

/**
 * Stateless mission state snapshot sent from the browser to backend agents
 * on every `/api/agent/*` request. The browser remains the single source of truth.
 */
export interface MissionContext {
  terrain?: TerrainIdentity;
  lang: Lang | (string & {});
  met_s: number;
  astronaut: AstronautSnapshot;
  suit: Record<string, number>;
  env: EnvironmentSnapshot;
  /** Rolling environmental telemetry window (max 48 samples). */
  env_window?: EnvTelemetrySample[];
  /** Base energy storage reserve in Wh. */
  base_battery_wh?: number;
  /** Cached DONKI / WSA-Enlil solar energetic particle alert state. */
  donki_alert?: DonkiAlert;
  fleet: FleetUnitSnapshot[];
  /** Crew positions; the drone standoff rule in GUARDIAN uses them. */
  crew?: CrewSnapshot[];
  /** True while the crew rescue scenario runs; enables the drone standoff rule for implicit targets. */
  rescue_active?: boolean;
  hud: HudSnapshot;
  leak_diameter_m: number;
  /** True once the O2 pod has been launched for the current leak. */
  emergency_response_active?: boolean;
  /** Optional anonymized physiological baselines (never PII/EMR text). */
  crew_profile?: CrewProfile;
  /** Optional sliding window of recent physiological samples for trend prediction. */
  vitals_window?: VitalsSample[];
  /** Bounded sliding window (<= 90 samples) of PLSS suit component telemetry. */
  suit_window?: SuitWindowSample[];
  /** Latest hardware health snapshot per fleet unit ID. */
  fleet_health?: Record<string, FleetUnitHealth>;
  /** Bounded sliding window (<= 90 samples) per fleet unit ID. */
  fleet_windows?: Record<string, FleetWindowSample[]>;
  /** Bounded sliding window (<= 90 samples) of habitat power & MOXIE ISRU telemetry. */
  power_isru_window?: PowerIsruWindowSample[];
}

export type VerdictDecision = "allow" | "deny" | "ask_human";
export type VerdictBy = "rules" | "judge" | "voting";

export interface Verdict {
  decision: VerdictDecision;
  reason: string;
  by: VerdictBy;
  reasonKey?: string;
  reasonParams?: Record<string, string | number>;
}

export type VoteDecision = VerdictDecision;

export interface VoterResult {
  voter: string;
  model: string;
  provider: "vertex" | "gemini" | "meta";
  vote: VoteDecision | null;
  confidence: number | null;
  rationale: string;
  latency_ms: number;
  status: "ok" | "timeout" | "error";
  error?: string;
}

export interface VotingTally {
  allow: number;
  deny: number;
  ask_human: number;
  valid: number;
}

export type VotingConsensus =
  | "unanimous"
  | "majority"
  | "asymmetric_safety_override"
  | "split"
  | "degraded_unanimous"
  | "degraded_split"
  | "quorum_failed";

export interface VotingTraceDetail {
  actionType: string;
  triggers: string[];
  voters: VoterResult[];
  tally: VotingTally;
  consensus: VotingConsensus;
  finalDecision: VoteDecision;
  reason: string;
  latency_ms: number;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export type ActionType =
  | "dispatch"
  | "launch_pod"
  | "deploy_beacons"
  | "arm_skill"
  | "isolate_component"
  | "set_layer"
  | "open_panel"
  | "show_route"
  | "show_alert"
  | "highlight"
  | "dispatch_overwatch"
  | "deploy_rescue_robot";

/** Proposed effect action. Applied by the browser only after GUARDIAN approval. */
export interface Action {
  type: ActionType | (string & {});
  args: Record<string, unknown>;
  proposedBy: string;
  verdict?: Verdict;
}

export type TraceEventKind = "delegate" | "tool" | "verdict" | "voting" | "say";

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
