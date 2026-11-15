import type { TerrainIdentity } from "@th/shared";
export type LayerId = "optical" | "slope" | "thermal" | "radiation" | "hydration";
export type PanelId = "map" | "fleet" | "agents" | "health" | "provenance" | "base" | "none";
export type AlertLevel = "ok" | "warn" | "crit";
export type UnitKind = "rover_crew" | "rover_science" | "rescue" | "drone" | "manipulator";
export type ArmSkillId = "handover" | "sample" | "drill" | "photograph";

export interface SuitTelemetry {
  o2_primary_kg: number;
  o2_primary_cap_kg: number;
  o2_reserve_kg: number;
  o2_reserve_cap_kg: number;
  suit_pressure_pa: number;
  pao2_pa: number;
  co2_pa: number;
  battery_wh: number;
  battery_cap_wh: number;
  coolant_l: number;
  coolant_cap_l: number;
  metabolic_w: number;
  heart_rate_bpm: number;
  fan_rpm: number;
  body_temp_c: number;
  cumulative_dose_ugy: number;
}

export interface EnvState {
  sol: number;
  ls_deg: number;
  ltst_hours: number;
  data_category?: "design" | "observation" | "derived";
  radiation_quantity?: "absorbed_dose_silicon";
  pressure_pa: number;
  air_temp_k: number;
  ground_temp_k: number;
  tau: number;
  wind_ms: number;
  wind_dir_rad: number;
  dose_rate_ugy_h: number;
  sun_elev_deg: number;
  earth_light_time_s: number;
  storm_source: string;
  rad_source: string;
}

export interface UnitSnapshot {
  id: string;
  kind: UnitKind;
  x: number;
  z: number;
  battery: number;
  busy: boolean;
  task: string | null;
}

export interface Verdict {
  decision: "allow" | "deny" | "ask_human";
  reason: string;
  by: "rules" | "judge";
}

export interface Action {
  type: string;
  args: Record<string, unknown>;
  proposedBy: string;
  verdict?: Verdict;
}

export interface TraceEvent {
  t: number;
  agent: string;
  kind: "delegate" | "tool" | "verdict" | "say";
  detail: unknown;
}

export interface MissionContext {
  terrain?: TerrainIdentity;
  lang: string;
  met_s: number;
  astronaut: {
    x: number;
    z: number;
    speed: number;
    load_kg: number;
    body_kg: number;
  };
  suit: Record<string, number>;
  env: {
    data_category?: "design" | "observation" | "derived";
    radiation_quantity?: "absorbed_dose_silicon";
    storm_source?: string;
    rad_source?: string;
    pressure_pa: number;
    air_temp_k: number;
    tau: number;
    wind_ms: number;
    dose_rate_ugy_h: number;
  };
  fleet: {
    id: string;
    kind: string;
    x: number;
    z: number;
    battery: number;
    busy: boolean;
  }[];
  hud: {
    layer: string;
    panel: string | null;
  };
  leak_diameter_m: number;
  /** True once the O2 pod has been launched for the current leak. */
  emergency_response_active?: boolean;
}

export interface HudAlert {
  id: string;
  level: "info" | "warn" | "crit";
  text: string;
  source?: string;
  ts: number;
}

export interface SampleRecord {
  id: string;
  label: string;
  x: number;
  z: number;
  met_s: number;
  mass_kg: number;
  hydration_pct: number;
}

export interface RouteDisplay {
  points: { x: number; z: number }[];
  distanceM: number;
  timeS: number;
  o2Kg: number;
  meanSvf: number;
  algorithm: string;
}

export interface PodTelemetry {
  active: boolean;
  flightTimeS: number;
  elapsedS: number;
  impactX: number;
  impactZ: number;
  impactSpeed: number;
  chuteDeployed: boolean;
  ellipseAlongM: number;
  ellipseCrossM: number;
  windDriftM: number;
}
