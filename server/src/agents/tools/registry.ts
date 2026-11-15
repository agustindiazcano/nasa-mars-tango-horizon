import { z } from "zod";
import { UNIT_ACTION_IDS } from "../unitCapabilities.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  decide,
  directTransmission,
  evaluateCrewBiomed,
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
  lidarScanAt,
  meta as terrainMeta,
  rankSampleSites,
  routeBetween,
  slopeAt,
  svfAt,
  thermalClassAt,
  worldToPlanetocentric,
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
    description: "Elevation (m), slope (deg), sky view factor (0..1), thermal class (0..2), and Mars IAU-2000 (lat, lon_E) at a point.",
    run: (a) => ({
      elevation_m: heightAt(a.x, a.z),
      slope_deg: slopeAt(a.x, a.z),
      sky_view_factor: svfAt(a.x, a.z),
      thermal_class: thermalClassAt(a.x, a.z),
      ...worldToPlanetocentric(a.x, a.z),
    }),
  }),
  def({
    name: "get_localization_and_lidar",
    server: "terrain",
    effect: false,
    schema: z.object({
      unit_id: z
        .string()
        .optional()
        .describe("Optional fleet unit ID (e.g. 'rover-2') to center the 360-deg 3D LiDAR scan on; defaults to astronaut position"),
    }),
    description:
      "Mars GNSS-denied geolocation & 3D Flash LiDAR scan: returns IAU-2000 planetocentric (lat, lon_E) and local (x, z, elev) coordinates of the astronaut and all fleet units (via HiRISE 1 m/px Map-Relative Localization + 6.5 GHz UWB Time-of-Flight mesh + VIO), plus an 8-sector 60 m 3D LiDAR slope/hazard scan.",
    run: (a, ctx) => {
      const unit = a.unit_id ? ctx.fleet.find((u) => u.id === a.unit_id) : undefined;
      const scanX = unit ? unit.x : ctx.astronaut.x;
      const scanZ = unit ? unit.z : ctx.astronaut.z;
      return {
        localization_mode:
          "Mars GNSS-Denied Stack: USGS HiRISE 1 m/px Map-Relative Localization (MRL) + IEEE 802.15.4z UWB 6.5 GHz ToF Mesh + Visual-Inertial Odometry (VIO) + 3D Flash LiDAR (532/905 nm)",
        cartography_product: terrainMeta.product_id,
        astronaut: {
          x: Number(ctx.astronaut.x.toFixed(1)),
          z: Number(ctx.astronaut.z.toFixed(1)),
          elevation_m: heightAt(ctx.astronaut.x, ctx.astronaut.z),
          slope_deg: slopeAt(ctx.astronaut.x, ctx.astronaut.z),
          sky_view_factor: svfAt(ctx.astronaut.x, ctx.astronaut.z),
          thermal_class: thermalClassAt(ctx.astronaut.x, ctx.astronaut.z),
          ...worldToPlanetocentric(ctx.astronaut.x, ctx.astronaut.z),
        },
        fleet: ctx.fleet.map((u) => {
          const dx = ctx.astronaut.x - u.x;
          const dz = ctx.astronaut.z - u.z;
          const distM = Number(Math.hypot(dx, dz).toFixed(1));
          const bearingDeg = Number((((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360).toFixed(1));
          return {
            id: u.id,
            kind: u.kind,
            x: Number(u.x.toFixed(1)),
            z: Number(u.z.toFixed(1)),
            elevation_m: heightAt(u.x, u.z),
            slope_deg: slopeAt(u.x, u.z),
            thermal_class: thermalClassAt(u.x, u.z),
            ...worldToPlanetocentric(u.x, u.z),
            distance_to_astronaut_m: distM,
            bearing_to_astronaut_deg: bearingDeg,
            battery: u.battery,
            busy: u.busy,
          };
        }),
        lidar_scan: lidarScanAt(scanX, scanZ),
      };
    },
  }),
  def({
    name: "plan_route",
    server: "terrain",
    effect: false,
    schema: z.object({
      from_x: z.number().optional().describe("Optional origin X coordinate in metres east (defaults to astronaut X or unit X)"),
      from_z: z.number().optional().describe("Optional origin Z coordinate in metres south (defaults to astronaut Z or unit Z)"),
      unit_id: z.string().optional().describe("Optional fleet unit ID whose position is used as route origin"),
      to_x: z.number().describe("Destination X coordinate in metres east"),
      to_z: z.number().describe("Destination Z coordinate in metres south"),
      speed_ms: z.number().min(0.2).max(3.0).default(1.0).describe("Traversal speed in m/s"),
    }),
    description: "A* route over HiRISE 1 m/px DTM + THEMIS thermal inertia map from astronaut or a fleet unit to (to_x, to_z).",
    run: (a, ctx) => {
      const unit = a.unit_id ? ctx.fleet.find((u) => u.id === a.unit_id) : undefined;
      const from = {
        x: a.from_x ?? (unit ? unit.x : ctx.astronaut.x),
        z: a.from_z ?? (unit ? unit.z : ctx.astronaut.z),
      };
      return routeBetween(from, { x: a.to_x, z: a.to_z }, a.speed_ms, ctx);
    },
  }),
  def({
    name: "get_hydration_at",
    server: "terrain",
    effect: false,
    schema: z.object(xz),
    description: "Estimated hydration index (dimensionless passive neutron ratio) and uncertainty at a point; not calibrated water abundance.",
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
  def({
    name: "evaluate_crew_biomed",
    server: "suit",
    effect: false,
    schema: z.object({}),
    description:
      "Evaluates deterministic EVA biomedical trends (CO2 hypercapnia, core temp/PSI, SpO2 hypoxia, cardiac drift), time-to-breach, composite Early Warning Score (green/amber/red), and NASA-STD-3001 vs personal baseline thresholds. Decision support advisory only.",
    run: (_a, ctx) => evaluateCrewBiomed(ctx),
  }),

  // --- mcp-environment ---------------------------------------------------
  def({
    name: "get_environment",
    server: "environment",
    effect: false,
    schema: z.object({}),
    description: "Mission surface pressure, temperature, opacity, wind, absorbed dose rate and density. Respect data_category and source fields: design values are not NASA observations.",
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
          source: "mission_context_forecast",
          disclaimer: "Mission context prediction; source epoch is not verified. Do not attribute it to current NASA observations.",
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
    description: "Evaluates EVA go/no-go against the current dust opacity and the 90th-percentile forecast: visibility threshold, aircraft grounding, and base solar margin.",
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
      const decision = decide(fc, plan, STORM_LIMITS, powerAt, demandW, undefined, ctx.env.tau);
      return {
        ...decision,
        current_tau: ctx.env.tau,
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
      payload: z.enum(["o2", "battery", "patch_kit", "full_life_support"]).default("full_life_support"),
    }),
    description:
      "Proposes launching an 8.0 kg ballistic life-support pod from the base tower (4.0 kg high-pressure O2 COPV with 1.0 kg breathable O2 gas, 1.2 kg LiOH CO2 scrubber cartridge, 1.0 kg 200 Wh thermal battery, 0.35 kg self-sealing patch kit, 1.45 kg aeroshell + 18 m^2 parachute).",
    run: (a, _c, caller) => ({
      type: "launch_pod",
      args: {
        ...a,
        mass_kg: 8.0,
        breakdown_kg: {
          o2_copv_total_kg: 4.0,
          o2_usable_gas_kg: 1.0,
          co2_scrubber_lioh_kg: 1.2,
          battery_thermal_pack_kg: 1.0,
          suit_breach_patch_kit_kg: 0.35,
          aeroshell_chute_beacon_kg: 1.45,
        },
        chute_cda_m2: 18.0,
      },
      proposedBy: caller,
    }),
  }),
  def({
    name: "deploy_beacons",
    server: "fleet",
    effect: true,
    schema: z.object({
      to_x: z.number().default(0).describe("Shelter or rover destination X coordinate in metres east"),
      to_z: z.number().default(0).describe("Shelter or rover destination Z coordinate in metres south"),
      mode: z
        .enum(["auto", "drone_drop", "ballistic_canister"])
        .default("auto")
        .describe("Deployment mode: drone_drop when tau < 1.8, or ballistic_canister when dust/wind grounds aircraft"),
      spacing_m: z.number().min(25).max(100).default(50).describe("Spacing in metres between breadcrumb beacons"),
    }),
    description:
      "Deploys a trail of non-pyrotechnic solid-state LED/laser (505 nm cyan + 615 nm red-orange + 850 nm NIR, 1.5 Hz) and UWB (6.5 GHz IEEE 802.15.4z + 880 Hz audio homing) breadcrumb beacons (0.25 kg each) along the A* return route to guide a blinded or HUD-degraded astronaut to shelter.",
    run: (a, ctx, caller) => {
      const route = routeBetween(ctx.astronaut, { x: a.to_x, z: a.to_z }, 1.0, ctx);
      const rawPts =
        route.reachable && route.points?.length
          ? route.points
          : [
              { x: Math.round(ctx.astronaut.x), z: Math.round(ctx.astronaut.z) },
              { x: Math.round(a.to_x), z: Math.round(a.to_z) },
            ];
      const beacons: { id: string; x: number; z: number }[] = [];
      let accum = 0;
      for (let i = 0; i < rawPts.length; i++) {
        if (i === 0) {
          const dx0 = rawPts[rawPts.length - 1].x - rawPts[0].x;
          const dz0 = rawPts[rawPts.length - 1].z - rawPts[0].z;
          const d0 = Math.hypot(dx0, dz0) || 1;
          beacons.push({
            id: "BCN-1",
            x: Math.round(rawPts[0].x + (dx0 / d0) * 18),
            z: Math.round(rawPts[0].z + (dz0 / d0) * 18),
          });
          continue;
        }
        const seg = Math.hypot(rawPts[i].x - rawPts[i - 1].x, rawPts[i].z - rawPts[i - 1].z);
        accum += seg;
        if (accum >= a.spacing_m && beacons.length < 10) {
          accum = 0;
          beacons.push({
            id: `BCN-${beacons.length + 1}`,
            x: Math.round(rawPts[i].x),
            z: Math.round(rawPts[i].z),
          });
        }
      }
      if (beacons.length < 2) {
        beacons.push({ id: `BCN-${beacons.length + 1}`, x: Math.round(a.to_x), z: Math.round(a.to_z) });
      }
      const drone = ctx.fleet.find((u) => u.kind === "drone" && u.battery >= 0.2);
      const resolvedMode =
        a.mode === "auto"
          ? ctx.env.tau < 1.8 && drone
            ? "drone_drop"
            : "ballistic_canister"
          : a.mode;
      const puckMassKg = 0.25;
      const totalPayloadKg = Number((beacons.length * puckMassKg).toFixed(2));
      return {
        type: "deploy_beacons",
        args: {
          to_x: a.to_x,
          to_z: a.to_z,
          mode: resolvedMode,
          unit_id: resolvedMode === "drone_drop" ? (drone?.id ?? "drone-1") : "launcher-1",
          pyrotechnic: false,
          beacons,
          puck_mass_kg: puckMassKg,
          total_payload_kg: totalPayloadKg,
          canister_total_kg: resolvedMode === "ballistic_canister" ? 8.0 : totalPayloadKg,
          optical_spec: "Solid-state dual-LED/laser strobe 505 nm cyan + 615 nm red-orange + 850 nm NIR at 1.5 Hz (75 cd, RTCM 13200.0 eVDSD)",
          rf_spec: "IEEE 802.15.4z UWB 6.5 GHz ToF ranging (<0.2 m) + 400 MHz UHF mesh + 880 Hz ILS audio homing",
        },
        proposedBy: caller,
      };
    },
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

  def({
    name: "unit_action",
    server: "fleet",
    effect: true,
    schema: z.object({
      unit_id: z.string().describe("Fleet unit identifier"),
      action: z.enum(UNIT_ACTION_IDS),
      x: z.number().optional().describe("Target metres east of scene center, when the action needs a place"),
      z: z.number().optional().describe("Target metres south of scene center, when the action needs a place"),
      heading: z.enum(["north", "east", "south", "west"]).optional().describe("Direction for photograph_area or survey_area"),
      altitude_m: z.number().min(5).max(40).optional().describe("Flight altitude for takeoff"),
    }),
    description:
      "Runs a unit capability: takeoff, land, photograph_area, hover_overwatch, follow_astronaut, return_to_base, survey_area, hold_position, relay_comms, deliver_supplies. Each unit kind supports a subset; GUARDIAN rejects unsupported ones.",
    run: (a, _c, caller) => ({ type: "unit_action", args: a, proposedBy: caller }),
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
      query: z.string().describe("Search query in English (the corpus is English; translate the crew's words first)"),
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
