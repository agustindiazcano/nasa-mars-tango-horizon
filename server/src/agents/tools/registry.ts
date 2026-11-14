import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  decide,
  directTransmission,
  leakTimeline,
  metabolicRateW,
  o2KgPerHour,
  surfaceDensity,
  type EvaPlan,
  type Limits,
  type StormForecast,
} from "@th/shared";
import type { MissionContext, ToolDef } from "../types.js";
import {
  detectVeinsAt,
  getStormForecastData,
  heightAt,
  hydrationAt,
  rankSampleSites,
  routeBetween,
  slopeAt,
  svfAt,
  thermalClassAt,
} from "./terrainData.js";

export interface DocChunk {
  doc: string;
  page: number;
  text: string;
  score?: number;
}

type SearchDocsFn = (query: string, k?: number) => DocChunk[];
let cachedSearchDocs: SearchDocsFn | null | undefined;

/** Dynamically imports ./knowledge.js when available so pre-merge builds never fail. */
export async function safeSearchDocs(query: string, k = 3): Promise<DocChunk[]> {
  if (cachedSearchDocs === undefined) {
    try {
      const modPath = "./knowledge.js";
      const mod = (await import(modPath)) as { searchDocs?: SearchDocsFn };
      cachedSearchDocs = typeof mod.searchDocs === "function" ? mod.searchDocs : null;
    } catch {
      cachedSearchDocs = null;
    }
  }
  if (!cachedSearchDocs) {
    return [
      {
        doc: "NASA-STD-3001-fallback",
        page: 1,
        text: "Knowledge corpus is not mounted yet; refer to standard EVA pressure (29.6 kPa) and O2 partial pressure thresholds.",
      },
    ];
  }
  return cachedSearchDocs(query, k);
}

const STORM_LIMITS: Limits = {
  tauVisibility: 2.5,     // design assumption: optical opacity threshold for safe EVA navigation
  tauDroneGrounding: 1.8, // design assumption: opacity threshold grounding drones and glider
  minPowerMarginW: 500,   // design assumption: minimum solar generation margin above base demand
};

const xz = {
  x: z.number().describe("Metres east of the scene center"),
  z: z.number().describe("Metres south of the scene center"),
};

const def = <S extends z.ZodTypeAny>(t: ToolDef<S>) => t as unknown as ToolDef;

export const TOOLS: ToolDef[] = [
  // --- mcp-terrain -------------------------------------------------------
  def({
    name: "get_terrain_at",
    server: "terrain",
    effect: false,
    schema: z.object(xz),
    description: "Elevation (m), slope (deg), sky view factor (0..1), and thermal class (0..2) at a point.",
    run: (a) => ({
      elevation_m: heightAt(a.x, a.z),
      slope_deg: slopeAt(a.x, a.z),
      sky_view_factor: svfAt(a.x, a.z),
      thermal_class: thermalClassAt(a.x, a.z),
    }),
  }),
  def({
    name: "plan_route",
    server: "terrain",
    effect: false,
    schema: z.object({
      to_x: z.number().describe("Destination X coordinate in metres east"),
      to_z: z.number().describe("Destination Z coordinate in metres south"),
      speed_ms: z.number().min(0.2).max(1.6).default(1.0).describe("Walking speed in m/s"),
    }),
    description: "Walking A* route from astronaut position minimizing metabolic energy and radiation exposure.",
    run: (a, ctx) => routeBetween(ctx.astronaut, { x: a.to_x, z: a.to_z }, a.speed_ms, ctx),
  }),
  def({
    name: "get_hydration_at",
    server: "terrain",
    effect: false,
    schema: z.object(xz),
    description: "Predicted near-surface bound mineral hydration (WEH wt%) and uncertainty at a point.",
    run: (a) => hydrationAt(a.x, a.z),
  }),
  def({
    name: "rank_sample_sites",
    server: "terrain",
    effect: false,
    schema: z.object({
      k: z.number().int().min(1).max(10).default(3).describe("Number of top candidate sites to return"),
    }),
    description: "Ranks top k sampling sites within 1.5 km with high predicted hydration, low uncertainty, and <=20 deg slope.",
    run: (a, ctx) => rankSampleSites(a.k, ctx.astronaut.x, ctx.astronaut.z),
  }),
  def({
    name: "detect_veins",
    server: "terrain",
    effect: false,
    schema: z.object({
      waypoint_id: z.string().describe("Curiosity traverse waypoint or image identifier"),
    }),
    description: "Returns mineral-vein candidate probability and peak image coordinates from the DINOv2 vein detector.",
    run: (a) => detectVeinsAt(a.waypoint_id),
  }),

  // --- mcp-suit ----------------------------------------------------------
  def({
    name: "get_suit_telemetry",
    server: "suit",
    effect: false,
    schema: z.object({}),
    description: "Current EVA suit telemetry using NASA SUITS schema field names.",
    run: (_a, ctx) => ctx.suit,
  }),
  def({
    name: "get_consumables_margin",
    server: "suit",
    effect: false,
    schema: z.object({
      metabolic_w: z.number().optional().describe("Optional override metabolic rate in watts"),
    }),
    description: "Remaining primary O2 hours at the specified or current Pandolf metabolic rate.",
    run: (a, ctx) => {
      const w =
        a.metabolic_w ??
        metabolicRateW({
          bodyKg: ctx.astronaut.body_kg,
          loadKg: ctx.astronaut.load_kg,
          speed: ctx.astronaut.speed,
          gradePct: 0,
          terrain: 1.3,
        });
      const kgH = o2KgPerHour(w);
      const o2PrimaryKg = ctx.suit.o2_primary_kg ?? 0;
      return {
        metabolic_w: Number(w.toFixed(1)),
        o2_use_kg_h: Number(kgH.toFixed(4)),
        o2_primary_kg: Number(o2PrimaryKg.toFixed(3)),
        hours_left: kgH > 0 ? Number((o2PrimaryKg / kgH).toFixed(2)) : 0,
      };
    },
  }),
  def({
    name: "time_to_hypoxia",
    server: "suit",
    effect: false,
    schema: z.object({}),
    description: "Given active suit leak diameter, computes seconds to cognitive impairment, unconsciousness, and Armstrong limit.",
    run: (_a, ctx) =>
      ctx.leak_diameter_m > 0
        ? leakTimeline(ctx.suit.suit_pressure_pa ?? 29600, ctx.leak_diameter_m)
        : { leak: false },
  }),

  // --- mcp-environment ---------------------------------------------------
  def({
    name: "get_environment",
    server: "environment",
    effect: false,
    schema: z.object({}),
    description: "Surface pressure, air temperature, dust opacity tau, wind speed, radiation dose rate, and air density (REMS & RAD).",
    run: (_a, ctx) => ({
      ...ctx.env,
      air_density_kg_m3: Number(surfaceDensity(ctx.env.pressure_pa, ctx.env.air_temp_k).toFixed(5)),
    }),
  }),
  def({
    name: "get_storm_forecast",
    server: "environment",
    effect: false,
    schema: z.object({}),
    description: "Returns 1-to-3 sol probabilistic dust opacity forecast quantiles (q10, q50, q90) from REMS thermal tides.",
    run: (_a, ctx) => {
      if (ctx.storm_forecast?.length) {
        return {
          forecast: ctx.storm_forecast,
          source: "context_storm_nowcaster",
          disclaimer: "Short-range statistical nowcast at Gale Crater only.",
        };
      }
      return getStormForecastData();
    },
  }),
  def({
    name: "evaluate_eva_weather",
    server: "environment",
    effect: false,
    schema: z.object({
      duration_min: z.number().min(5).max(600).default(120).describe("Planned remaining EVA duration in minutes"),
      return_to_shelter_min: z.number().min(1).max(240).default(25).describe("Estimated return-to-shelter transit time in minutes"),
    }),
    description: "Evaluates EVA go/no-go against the 90th-percentile dust forecast, visibility threshold, aircraft grounding, and base solar margin.",
    run: (a, ctx) => {
      const fc: StormForecast[] = ctx.storm_forecast?.length
        ? ctx.storm_forecast
        : getStormForecastData().forecast;
      const plan: EvaPlan = {
        durationS: a.duration_min * 60,
        returnToShelterS: a.return_to_shelter_min * 60,
      };
      const peakSolarW = (ctx.env.solar_area_m2 ?? 400) * 590 * (ctx.env.solar_efficiency ?? 0.22);
      const demandW = ctx.env.solar_demand_w ?? 18000;
      const powerAt = (tau: number) => peakSolarW * directTransmission(tau, 0.7);
      const decision = decide(fc, plan, STORM_LIMITS, powerAt, demandW);
      return {
        ...decision,
        worst_q90_tau: Math.max(...fc.map((f) => f.q90)),
        limits: STORM_LIMITS,
        limits_source: "design_assumption",
      };
    },
  }),

  // --- mcp-fleet ---------------------------------------------------------
  def({
    name: "list_units",
    server: "fleet",
    effect: false,
    schema: z.object({}),
    description: "Lists all fleet units with position, battery fraction, kind, and busy state.",
    run: (_a, ctx) => ctx.fleet,
  }),
  def({
    name: "dispatch",
    server: "fleet",
    effect: true,
    schema: z.object({
      unit_id: z.string().describe("Fleet unit identifier"),
      ...xz,
      task: z.enum(["goto", "rescue", "survey", "relay", "sample"]),
    }),
    description: "Proposes sending a fleet unit to a target coordinate with a task.",
    run: (a, _c, caller) => ({ type: "dispatch", args: a, proposedBy: caller }),
  }),
  def({
    name: "launch_pod",
    server: "fleet",
    effect: true,
    schema: z.object({
      target_x: z.number().describe("Target X coordinate in metres east"),
      target_z: z.number().describe("Target Z coordinate in metres south"),
      payload: z.enum(["o2", "battery", "patch_kit"]),
    }),
    description: "Proposes launching a ballistic life-support pod from the base tower to a target coordinate.",
    run: (a, _c, caller) => ({ type: "launch_pod", args: a, proposedBy: caller }),
  }),
  def({
    name: "arm_skill",
    server: "fleet",
    effect: true,
    schema: z.object({
      unit_id: z.literal("manip-1"),
      skill: z.enum(["handover", "sample", "drill", "photograph"]),
      target_id: z.string().describe("ID of a target marker visible in the camera frame, or 'astronaut'"),
      item: z.enum(["hammer", "sample_tube", "patch_kit", "o2_bottle"]).optional(),
    }),
    description: "Runs an arm skill on a visible target with manip-1. The rover drives into reach first if needed.",
    run: (a, _c, caller) => ({ type: "arm_skill", args: a, proposedBy: caller }),
  }),

  // --- mcp-hud -----------------------------------------------------------
  def({
    name: "set_layer",
    server: "hud",
    effect: true,
    schema: z.object({
      layer: z.enum(["optical", "slope", "thermal", "radiation", "hydration"]),
    }),
    description: "Switches the 3D terrain overlay layer.",
    run: (a, _c, caller) => ({ type: "set_layer", args: a, proposedBy: caller }),
  }),
  def({
    name: "open_panel",
    server: "hud",
    effect: true,
    schema: z.object({
      panel: z.enum(["map", "fleet", "agents", "health", "provenance", "none"]),
    }),
    description: "Opens or closes a helmet HUD panel.",
    run: (a, _c, caller) => ({ type: "open_panel", args: a, proposedBy: caller }),
  }),
  def({
    name: "show_route",
    server: "hud",
    effect: true,
    schema: z.object({
      to_x: z.number().describe("Route destination X in metres east"),
      to_z: z.number().describe("Route destination Z in metres south"),
    }),
    description: "Draws the planned EVA route on the 3D terrain.",
    run: (a, _c, caller) => ({ type: "show_route", args: a, proposedBy: caller }),
  }),
  def({
    name: "show_alert",
    server: "hud",
    effect: true,
    schema: z.object({
      level: z.enum(["info", "warn", "crit"]),
      text: z.string().max(140),
      source: z.string().optional(),
    }),
    description: "Displays an alert on the helmet HUD, with a document citation when applicable.",
    run: (a, _c, caller) => ({ type: "show_alert", args: a, proposedBy: caller }),
  }),

  // --- mcp-knowledge -----------------------------------------------------
  def({
    name: "search_docs",
    server: "knowledge",
    effect: false,
    schema: z.object({
      query: z.string().describe("Search query for NASA standards and medical/operations documents"),
      k: z.number().int().min(1).max(5).default(3),
    }),
    description: "Searches the NASA corpus (NASA-STD-3001, OCHMO, AMCL, MEDPRAT, SUITS) and returns chunks with document and page.",
    run: (a) => safeSearchDocs(a.query, a.k),
  }),
];

export const toolsFor = (names: string[]) => TOOLS.filter((t) => names.includes(t.name));

export const asOpenAI = (tools: ToolDef[]) =>
  tools.map((t) => {
    const raw = zodToJsonSchema(t.schema, { target: "openApi3" }) as Record<string, unknown>;
    const { $schema: _ignored, ...parameters } = raw;
    return {
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters,
      },
    };
  });
