import type { UnitKind } from "./mission.js";

/** Terrain overlay layers rendered on the 3D surface and 2D minimap. */
export type LayerId = "optical" | "slope" | "thermal" | "radiation" | "hydration";

/** HUD panels toggleable by menu, pointer, or voice actions. */
export type PanelId =
  | "map"
  | "fleet"
  | "agents"
  | "health"
  | "provenance"
  | "base"
  | "sessions"
  | "menu"
  | "none";

export type AlertLevel = "ok" | "warn" | "crit";

export type ArmSkillId = "handover" | "sample" | "drill" | "photograph";

/** Full client-side Martian environmental simulation state. */
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

/** Fleet unit state tracked by the client viewer and serialized into MissionContext. */
export interface UnitSnapshot {
  id: string;
  kind: UnitKind;
  x: number;
  z: number;
  battery: number;
  busy: boolean;
  task: string | null;
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
  hydration_index: number;
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
