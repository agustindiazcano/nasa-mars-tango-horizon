import type {
  CrewProfile,
  TerrainIdentity,
  VitalsSample,
} from "@th/shared";
import type { z } from "zod";

export type Lang = "en" | "es" | "fr" | "de" | "it";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const LANG_MAP: Record<string, Lang> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  es: "es",
  "es-ar": "es",
  "es-es": "es",
  "es-us": "es",
  "es-419": "es",
  fr: "fr",
  "fr-fr": "fr",
  de: "de",
  "de-de": "de",
  it: "it",
  "it-it": "it",
};

/** Normalizes short language codes and BCP-47 locales into supported Lang values. */
export function normalizeLang(raw?: string): Lang {
  if (!raw) return "en";
  const key = raw.trim().toLowerCase();
  return LANG_MAP[key] ?? LANG_MAP[key.split("-")[0]] ?? "en";
}

export interface FleetUnitSnapshot {
  id: string;
  kind: string;
  x: number;
  z: number;
  battery: number;
  busy: boolean;
}

export interface VisionTargetMarker {
  id: string;
  kind: string;
  distance_m: number;
  x?: number;
  z?: number;
}

export interface StormForecastPoint {
  horizonSol: number;
  q10: number;
  q50: number;
  q90: number;
}

export interface MissionContext {
  terrain?: TerrainIdentity;
  lang: Lang;
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
    pressure_pa: number;
    air_temp_k: number;
    tau: number;
    wind_ms: number;
    dose_rate_ugy_h: number;
    solar_demand_w?: number;
    solar_area_m2?: number;
    solar_efficiency?: number;
  };
  fleet: FleetUnitSnapshot[];
  hud: {
    layer: string;
    panel: string | null;
  };
  leak_diameter_m: number;
  /** True once the O2 pod has been launched for the current leak; stops the server from repeating the emergency protocol. */
  emergency_response_active?: boolean;
  targets?: VisionTargetMarker[];
  storm_forecast?: StormForecastPoint[];
  /** Privacy-bounded anonymized physiological baselines (never PII/EMR text). */
  crew_profile?: CrewProfile;
  /** Sliding time-series window of recent physiological samples. */
  vitals_window?: VitalsSample[];
}

export interface Verdict {
  decision: "allow" | "deny" | "ask_human";
  reason: string;
  reasonKey?: string;
  reasonParams?: Record<string, string | number>;
  by: "rules" | "judge";
}

/** Effect action proposed by an agent; applied by the browser only if GUARDIAN approves. */
export interface Action {
  type: string;
  args: Record<string, unknown>;
  proposedBy: string;
  verdict?: Verdict;
}

export type ToolServerName = "terrain" | "environment" | "suit" | "fleet" | "hud" | "knowledge";

export interface ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  server: ToolServerName;
  description: string;
  schema: S;
  /** True when the tool produces an Action object that must pass GUARDIAN review. */
  effect: boolean;
  run(args: z.infer<S>, ctx: MissionContext, caller: string): Promise<unknown> | unknown;
}

export interface TraceEvent {
  t: number;
  agent: string;
  kind: "delegate" | "tool" | "verdict" | "say";
  detail: unknown;
}
