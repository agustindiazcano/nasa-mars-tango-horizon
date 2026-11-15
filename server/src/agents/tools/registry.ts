import { z } from "zod";
import {
  crewOf,
  DRONE_CREW_STANDOFF_M,
  MAX_SLOPE,
  OVERWATCH_ALT_MAX_M,
  OVERWATCH_ALT_MIN_M,
  OVERWATCH_RADIUS_MAX_M,
  OVERWATCH_RADIUS_MIN_M,
  UNIT_ACTION_IDS,
} from "../unitCapabilities.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  aimDelivery,
  BASE_ORIGIN,
  decide,
  directTransmission,
  ENV_LIMITS,
  CREW_ROSTER,
  evaluateComponentHealth,
  findCrew,
  evaluateCrewBiomed,
  LAUNCHER_PRIMARY_COORD,
  leakTimeline,
  metabolicRateW,
  o2KgPerHour,
  predictEnvironmentalRisk,
  surfaceDensity,
  type EvaPlan,
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
  nearestSafePoint,
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
  fault_codes?: string[];
  score?: number;
}

type SearchDocsFn = (query: string, k?: number, faultCodes?: string[]) => DocChunk[];
let cachedSearchDocs: SearchDocsFn | null | undefined;

/** Dynamically imports ./knowledge.js when available so pre-merge builds never fail. */
export async function safeSearchDocs(query: string, k = 3, faultCodes?: string[]): Promise<DocChunk[]> {
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
  return cachedSearchDocs(query, k, faultCodes);
}

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
      const astroSlope = slopeAt(ctx.astronaut.x, ctx.astronaut.z);
      const unitMaxSlope = unit ? MAX_SLOPE[unit.kind] : 20;
      const safeRendezvous =
        unitMaxSlope !== undefined && astroSlope > unitMaxSlope
          ? nearestSafePoint(ctx.astronaut.x, ctx.astronaut.z, unitMaxSlope)
          : undefined;
      return {
        localization_mode:
          "Mars GNSS-Denied Stack: USGS HiRISE 1 m/px Map-Relative Localization (MRL) + IEEE 802.15.4z UWB 6.5 GHz ToF Mesh + Visual-Inertial Odometry (VIO) + 3D Flash LiDAR (532/905 nm)",
        cartography_product: terrainMeta.product_id,
        astronaut: {
          x: Number(ctx.astronaut.x.toFixed(1)),
          z: Number(ctx.astronaut.z.toFixed(1)),
          elevation_m: heightAt(ctx.astronaut.x, ctx.astronaut.z),
          slope_deg: astroSlope,
          sky_view_factor: svfAt(ctx.astronaut.x, ctx.astronaut.z),
          thermal_class: thermalClassAt(ctx.astronaut.x, ctx.astronaut.z),
          ...worldToPlanetocentric(ctx.astronaut.x, ctx.astronaut.z),
          ...(safeRendezvous ? { safe_rendezvous: safeRendezvous } : {}),
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
      if (unit && (unit.kind === "drone" || unit.kind === "glider")) {
        const distM = Number(Math.hypot(a.to_x - from.x, a.to_z - from.z).toFixed(1));
        const airSpeed = 11.0;
        return {
          reachable: true,
          aerial: true,
          altitude_m: 14,
          distance_m: distM,
          time_min: Number((distM / airSpeed / 60).toFixed(2)),
          points: [
            { x: Number(from.x.toFixed(1)), z: Number(from.z.toFixed(1)) },
            { x: Number(a.to_x.toFixed(1)), z: Number(a.to_z.toFixed(1)) },
          ],
        };
      }
      const maxSlope = unit ? (MAX_SLOPE[unit.kind] ?? 25) : 25;
      const res = routeBetween(from, { x: a.to_x, z: a.to_z }, a.speed_ms, ctx, maxSlope);
      const goalSlope = slopeAt(a.to_x, a.to_z);
      if (!res.reachable || goalSlope > maxSlope) {
        const safe = nearestSafePoint(a.to_x, a.to_z, maxSlope);
        if (safe.adjusted && safe.slope_deg <= maxSlope) {
          const safeRoute = routeBetween(from, { x: safe.x, z: safe.z }, a.speed_ms, ctx, maxSlope);
          return {
            ...res,
            goal_slope_deg: goalSlope,
            max_slope_deg: maxSlope,
            safe_destination: safe,
            ...(safeRoute.reachable ? { safe_route: safeRoute } : {}),
          };
        }
      }
      return res;
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
  def({
    name: "evaluate_component_health",
    server: "suit",
    effect: false,
    schema: z.object({
      scope: z.enum(["suit", "fleet", "power_isru", "all"]).default("all").describe("FDIR subsystem scope to evaluate"),
      unit_id: z.string().optional().describe("Optional fleet unit ID when inspecting a single fleet asset"),
    }),
    description:
      "Deterministic FDIR/RUL prognostics: computes linear slopes, z-score residuals, clamped RUL (s), severity (nominal|degraded|critical), and canonical fault codes (PLSS-*, RVR-*, ARM-*, HAB-*, ISRU-*).",
    run: (a, ctx, caller) => {
      if (caller.startsWith("ROBOT.")) {
        const ownId = caller.slice("ROBOT.".length);
        if (a.unit_id && a.unit_id !== ownId) {
          return { error: `ROBOT.${ownId} may only inspect unit_id "${ownId}"` };
        }
        return evaluateComponentHealth(ctx, "fleet", ownId);
      }
      return evaluateComponentHealth(ctx, a.scope, a.unit_id);
    },
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
      const decision = decide(fc, plan, ENV_LIMITS, powerAt, demandW, undefined, ctx.env.tau);
      return {
        ...decision,
        current_tau: ctx.env.tau,
        worst_q90_tau: Math.max(...fc.map((f) => f.q90)),
        limits: ENV_LIMITS,
        limits_source: "design_assumption",
      };
    },
  }),
  def({
    name: "evaluate_environmental_risk",
    server: "environment",
    effect: false,
    schema: z.object({
      duration_min: z.number().min(5).max(600).default(120).describe("Planned remaining EVA duration in minutes"),
      return_to_shelter_min: z.number().min(1).max(240).default(25).describe("Estimated return-to-shelter transit time in minutes"),
      svf: z.number().min(0).max(1).default(1).describe("Local sky-view factor (0..1) for terrain radiation shielding"),
    }),
    description:
      "Computes predictive environmental gradients (dp/dt, dtau/dt, dwind/dt, d(dose)/dt), storm onset and visibility abort ETAs, solar margin/battery autonomy, projected EVA radiation dose, aircraft flight envelope, and recommended maneuvers.",
    run: (a, ctx) =>
      predictEnvironmentalRisk({
        env: ctx.env,
        env_window: ctx.env_window,
        storm_forecast: ctx.storm_forecast?.length ? ctx.storm_forecast : getStormForecastData().forecast,
        base_battery_wh: ctx.base_battery_wh,
        donki_alert: ctx.donki_alert,
        plan: {
          durationS: a.duration_min * 60,
          returnToShelterS: a.return_to_shelter_min * 60,
        },
        svf: a.svf,
      }),
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
    description:
      "Proposes sending a fleet unit to a target coordinate with a task. When dispatching a ground unit to the astronaut's position on a steep slope, automatically resolves the nearest slope-safe rendezvous point within 25 m if available.",
    run: (a, ctx, caller) => {
      const unit = ctx.fleet.find((u) => u.id === a.unit_id);
      const maxSlope = unit ? MAX_SLOPE[unit.kind] : undefined;
      let targetX = a.x;
      let targetZ = a.z;
      const nearAstronaut = Math.hypot(a.x - ctx.astronaut.x, a.z - ctx.astronaut.z) <= 5;
      if (maxSlope !== undefined && nearAstronaut && slopeAt(a.x, a.z) > maxSlope) {
        const safe = nearestSafePoint(ctx.astronaut.x, ctx.astronaut.z, maxSlope);
        const offsetM = Math.hypot(safe.x - ctx.astronaut.x, safe.z - ctx.astronaut.z);
        if (safe.slope_deg <= maxSlope && offsetM <= 25) {
          targetX = safe.x;
          targetZ = safe.z;
        }
      }
      return {
        type: "dispatch",
        args: { ...a, x: targetX, z: targetZ },
        proposedBy: caller,
      };
    },
  }),
  def({
    name: "calculate_pod_launch",
    server: "fleet",
    effect: false,
    schema: z.object({
      target_x: z.number().optional().describe("Requested X coordinate in metres east (defaults to astronaut position)"),
      target_z: z.number().optional().describe("Requested Z coordinate in metres south (defaults to astronaut position)"),
      payload: z.enum(["o2", "battery", "patch_kit", "full_life_support"]).default("full_life_support"),
    }),
    description:
      "Computes RK4 ballistic launch parameters for the 8.0 kg life-support pod (COPV O2, LiOH scrubber, 200 Wh battery, patch kit) from the base launcher, automatically shifting inside-keep-out (<15 m) requests to a safe ~22 m slope-safe landing point.",
    run: (a, ctx) => {
      const reqX = a.target_x ?? ctx.astronaut.x;
      const reqZ = a.target_z ?? ctx.astronaut.z;
      let safeX = reqX;
      let safeZ = reqZ;
      let shifted = false;
      const reqDist = Math.hypot(reqX - ctx.astronaut.x, reqZ - ctx.astronaut.z);
      if (reqDist < 15 || slopeAt(reqX, reqZ) > 18) {
        shifted = reqDist < 15 || slopeAt(reqX, reqZ) > 18;
        let bestX = ctx.astronaut.x + 22;
        let bestZ = ctx.astronaut.z;
        let bestSlope = slopeAt(bestX, bestZ);
        for (const r of [22, 26, 32]) {
          for (let k = 0; k < 16; k++) {
            const ang = (2 * Math.PI * k) / 16;
            const cx = reqX + r * Math.cos(ang);
            const cz = reqZ + r * Math.sin(ang);
            const dCrew = Math.hypot(cx - ctx.astronaut.x, cz - ctx.astronaut.z);
            if (dCrew < 17) continue;
            const sl = slopeAt(cx, cz);
            if (sl < bestSlope) {
              bestSlope = sl;
              bestX = cx;
              bestZ = cz;
            }
          }
          if (bestSlope <= 12) break;
        }
        safeX = bestX;
        safeZ = bestZ;
      }

      const lx = LAUNCHER_PRIMARY_COORD.x;
      const lz = LAUNCHER_PRIMARY_COORD.z;
      const ly = heightAt(lx, lz) + 6;
      const targetElev = heightAt(safeX, safeZ);
      const windDirRad = ((ctx.env.wind_dir_deg ?? 0) * Math.PI) / 180;
      const aimed = aimDelivery(
        [lx, lz, ly],
        [safeX, safeZ, targetElev],
        Math.PI / 4,
        { massKg: 8.0, cdA: 0.025 },
        { cdA: 18.0, deployBelowM: 140, inflateS: 1.0 },
        {
          rho0: surfaceDensity(ctx.env.pressure_pa, ctx.env.air_temp_k),
          windRef: ctx.env.wind_ms,
          windDirRad,
          groundZ: heightAt,
        },
      );
      const distCrew = Math.hypot(safeX - ctx.astronaut.x, safeZ - ctx.astronaut.z);
      return {
        launcher_x: lx,
        launcher_z: lz,
        requested_x: Number(reqX.toFixed(1)),
        requested_z: Number(reqZ.toFixed(1)),
        safe_target_x: Number(safeX.toFixed(1)),
        safe_target_z: Number(safeZ.toFixed(1)),
        distance_from_astronaut_m: Number(distCrew.toFixed(1)),
        keepout_radius_m: 15,
        shifted_for_keepout: shifted,
        terrain_slope_deg: Number(slopeAt(safeX, safeZ).toFixed(1)),
        payload: a.payload,
        mass_kg: 8.0,
        contents: "4.0 kg O2 COPV (1.0 kg usable O2), 1.2 kg LiOH scrubber, 1.0 kg 200 Wh battery, 0.35 kg patch kit, 1.45 kg chute",
        reachable: Boolean(aimed),
        elevation_deg: 45,
        muzzle_speed_ms: aimed ? Number(Math.hypot(...aimed.v0).toFixed(1)) : null,
        flight_time_s: aimed ? Number(aimed.delivery.flightTimeS.toFixed(1)) : null,
        impact_x: aimed ? Number(aimed.delivery.impact[0].toFixed(1)) : Number(safeX.toFixed(1)),
        impact_z: aimed ? Number(aimed.delivery.impact[1].toFixed(1)) : Number(safeZ.toFixed(1)),
        impact_speed_ms: aimed ? Number(aimed.delivery.impactSpeed.toFixed(1)) : null,
        max_height_m: aimed ? Number(aimed.delivery.maxHeightM.toFixed(0)) : null,
        requires_confirmation: ctx.leak_diameter_m <= 0,
      };
    },
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
      to_x: z.number().default(BASE_ORIGIN.x).describe("Shelter or rover destination X coordinate in metres east"),
      to_z: z.number().default(BASE_ORIGIN.z).describe("Shelter or rover destination Z coordinate in metres south"),
      mode: z
        .enum(["auto", "drone_drop", "ballistic_canister"])
        .default("auto")
        .describe(`Deployment mode: drone_drop when tau < ${ENV_LIMITS.tauDroneGrounding}, or ballistic_canister when dust/wind grounds aircraft`),
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
          ? ctx.env.tau < ENV_LIMITS.tauDroneGrounding &&
            ctx.env.wind_ms < ENV_LIMITS.maxFlightWindMs &&
            surfaceDensity(ctx.env.pressure_pa, ctx.env.air_temp_k) >= ENV_LIMITS.minFlightDensityKgM3 &&
            drone
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
      unit_id: z.enum(["rover-3", "manip-1"]).default("rover-3"),
      skill: z.enum(["handover", "sample", "drill", "photograph"]),
      target_id: z.string().describe("ID of a target marker visible in the camera frame, or 'astronaut'"),
      item: z.enum(["hammer", "sample_tube", "patch_kit", "o2_bottle"]).optional(),
    }),
    description: "Runs an arm skill on a visible target with rover-3 (legacy alias manip-1). The rover drives into reach first if needed.",
    run: (a, ctx, caller) => {
      const resolvedId =
        ctx.fleet.find((u) => u.id === a.unit_id)?.id ??
        ctx.fleet.find((u) => u.kind === "manipulator")?.id ??
        a.unit_id;
      return { type: "arm_skill", args: { ...a, unit_id: resolvedId }, proposedBy: caller };
    },
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
  def({
    name: "isolate_component",
    server: "fleet",
    effect: true,
    schema: z.object({
      target_type: z.enum(["suit", "fleet", "hab_power", "isru"]).describe("Target system domain"),
      target_id: z.string().min(1).max(40).describe("Target asset ID ('suit', fleet unit ID, 'hab_power', or 'isru')"),
      subsystem: z.string().min(1).max(60).describe("Faulted subsystem (e.g. 'ventilation_fan', 'co2_scrubber', 'wheel_drive', 'arm_drill')"),
      fault_code: z.string().min(1).max(32).describe("Canonical fault code verified by evaluate_component_health"),
      action: z.enum(["switch_redundant", "derate", "safe_halt", "quarantine"]).describe("FDIR isolation or mitigation action"),
    }),
    description:
      "Proposes hardware FDIR mitigation (switch_redundant, derate, safe_halt, quarantine) for a fault corroborated by evaluate_component_health; vetted by GUARDIAN.",
    run: (a, _c, caller) => ({ type: "isolate_component", args: a, proposedBy: caller }),
  }),
  def({
    name: "get_crew_status",
    server: "fleet",
    effect: false,
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe("Optional crew callsign or id in any spelling ('Sotelo', 'díaz cano', 'crew-3'); omit to list everyone"),
      where: z
        .enum(["base", "expedition", "all"])
        .default("all")
        .describe("base = currently at the base; expedition = assigned to the science expedition; all = everyone"),
    }),
    description:
      "The four astronauts by callsign (DIAZ-CANO, SALERNO, SOTELO, YACONIS): assignment (base | science_expedition), location (base | traverse | in_pit | rescue_vehicle | in_rover), status (nominal | incapacitated | evacuating | recovering), x, z, distance to the base, the fleet unit each rides in, and terrain slope. Always refer to people by callsign.",
    run: (a, ctx) => {
      const asked = a.name ? findCrew(a.name) : null;
      if (a.name && !asked) return { error: `Unknown crew member "${a.name}"`, roster: CREW_ROSTER.map((m) => m.name) };
      const rows = crewOf(ctx)
        .filter((c) => !asked || c.id === asked.id)
        .filter((c) => (a.where === "base" ? c.location === "base" : a.where === "expedition" ? c.assignment === "science_expedition" : true))
        .map((c) => ({
          name: c.name,
          id: c.id,
          assignment: c.assignment,
          location: c.location,
          status: c.status,
          x: Number(c.x.toFixed(1)),
          z: Number(c.z.toFixed(1)),
          distance_to_base_m: Number(Math.hypot(c.x - BASE_ORIGIN.x, c.z - BASE_ORIGIN.z).toFixed(1)),
          ...(c.unit_id ? { rides_in: c.unit_id } : {}),
          slope_deg: slopeAt(c.x, c.z),
        }));
      return { rescue_active: ctx.rescue_active === true, count: rows.length, crew: rows };
    },
  }),
  def({
    name: "dispatch_overwatch",
    server: "fleet",
    effect: true,
    schema: z.object({
      unit_id: z.string().default("drone-1").describe("Drone unit id ('drone-1' or 'drone-2')"),
      target_id: z.string().optional().describe("Crew callsign or id to watch (e.g. 'YACONIS'); the drone orbits it, never on top of it"),
      x: z.number().optional().describe("Orbit center X when no target_id is given"),
      z: z.number().optional().describe("Orbit center Z when no target_id is given"),
      radius_m: z
        .number()
        .min(OVERWATCH_RADIUS_MIN_M)
        .max(OVERWATCH_RADIUS_MAX_M)
        .default(34)
        .describe(`Orbit radius around the target (${OVERWATCH_RADIUS_MIN_M}-${OVERWATCH_RADIUS_MAX_M} m)`),
      altitude_m: z
        .number()
        .min(OVERWATCH_ALT_MIN_M)
        .max(OVERWATCH_ALT_MAX_M)
        .default(25)
        .describe(`Altitude above local terrain (${OVERWATCH_ALT_MIN_M}-${OVERWATCH_ALT_MAX_M} m)`),
    }),
    description: `Sends an overwatch drone to orbit a crew member or a point at ${OVERWATCH_RADIUS_MIN_M}-${OVERWATCH_RADIUS_MAX_M} m radius and ${OVERWATCH_ALT_MIN_M}-${OVERWATCH_ALT_MAX_M} m altitude, always at least ${DRONE_CREW_STANDOFF_M} m horizontally from every crew member; drone-1 and drone-2 take opposite sides. The tool picks the orbit entry waypoint; GUARDIAN re-checks it.`,
    run: (a, ctx, caller) => {
      const crew = crewOf(ctx);
      const targetId = a.target_id ? findCrew(a.target_id)?.id : undefined;
      const target = targetId ? crew.find((c) => c.id === targetId) : undefined;
      const cx = target?.x ?? a.x ?? ctx.astronaut.x;
      const cz = target?.z ?? a.z ?? ctx.astronaut.z;
      const baseBearing = a.unit_id === "drone-2" ? 180 : 0;
      let waypoint = { x: cx, z: cz };
      let bearing = baseBearing;
      for (let k = 0; k < 24; k++) {
        const b = baseBearing + k * 15;
        const rad = (b * Math.PI) / 180;
        const wp = { x: cx + a.radius_m * Math.cos(rad), z: cz + a.radius_m * Math.sin(rad) };
        waypoint = wp;
        bearing = b % 360;
        if (crew.every((c) => Math.hypot(wp.x - c.x, wp.z - c.z) >= DRONE_CREW_STANDOFF_M)) break;
      }
      return {
        type: "dispatch_overwatch",
        args: {
          unit_id: a.unit_id,
          ...(target ? { target_id: target.id, target_name: target.name } : {}),
          center_x: Number(cx.toFixed(1)),
          center_z: Number(cz.toFixed(1)),
          radius_m: a.radius_m,
          altitude_m: a.altitude_m,
          bearing_deg: bearing,
          x: Number(waypoint.x.toFixed(1)),
          z: Number(waypoint.z.toFixed(1)),
          task: "overwatch",
        },
        proposedBy: caller,
      };
    },
  }),
  def({
    name: "deploy_rescue_robot",
    server: "fleet",
    effect: true,
    schema: z.object({
      unit_id: z.string().default("rescue-bot-1").describe("Rescue robot unit id"),
      target_id: z.string().default("YACONIS").describe("Callsign or id of the casualty"),
    }),
    description:
      "Deploys the rescue robot from its carrier rescue-1 to the casualty (winch arm, tether and stretcher). GUARDIAN requires the carrier within 40 m of the casualty and human confirmation before the robot approaches an injured crew member.",
    run: (a, ctx, caller) => {
      const member = findCrew(a.target_id);
      const target = member ? crewOf(ctx).find((c) => c.id === member.id) : undefined;
      return {
        type: "deploy_rescue_robot",
        args: {
          unit_id: a.unit_id,
          carrier_id: "rescue-1",
          target_id: member?.id ?? a.target_id,
          ...(member ? { target_name: member.name } : {}),
          ...(target ? { x: Number(target.x.toFixed(1)), z: Number(target.z.toFixed(1)) } : {}),
        },
        proposedBy: caller,
      };
    },
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
      panel: z.enum(["map", "fleet", "agents", "health", "provenance", "base", "sessions", "menu", "none"]),
    }),
    description: "Opens or closes a helmet HUD panel or the central quick menu ('menu').",
    run: (a, _c, caller) => ({ type: "open_panel", args: a, proposedBy: caller }),
  }),
  def({
    name: "set_lang",
    server: "hud",
    effect: true,
    schema: z.object({
      lang: z.enum(["es", "en", "fr", "de", "it"]).describe("Target UI/voice/TTS language code"),
    }),
    description: "Switches the mission UI, voice recognition (ASR), and radio TTS language.",
    run: (a, _c, caller) => ({ type: "set_lang", args: a, proposedBy: caller }),
  }),
  def({
    name: "set_hud_visible",
    server: "hud",
    effect: true,
    schema: z.object({
      visible: z.boolean().describe("True to show the VR helmet visor HUD panels, false to hide them for an unobstructed 3D view"),
    }),
    description: "Shows or hides the VR helmet visor HUD overlay panels.",
    run: (a, _c, caller) => ({ type: "set_hud_visible", args: a, proposedBy: caller }),
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
  def({
    name: "capture_vision",
    server: "hud",
    effect: true,
    schema: z.object({
      unit_id: z
        .enum(["astronaut", "rover-1", "rover-2", "rover-3", "rescue-1", "drone-1", "drone-2"])
        .default("astronaut")
        .describe("Camera source ID ('astronaut' for helmet visor POV, or a fleet unit ID)"),
      question: z.string().max(200).optional().describe("Crew question about the camera frame"),
    }),
    description:
      "Triggers live 3D onboard camera frame capture and vision inspection from the astronaut helmet visor ('astronaut') or any fleet unit ('rover-1'..'rover-3', 'rescue-1', 'drone-1'..'drone-2').",
    run: (a, _c, caller) => ({ type: "capture_vision", args: a, proposedBy: caller }),
  }),

  // --- mcp-knowledge -----------------------------------------------------
  def({
    name: "search_docs",
    server: "knowledge",
    effect: false,
    schema: z.object({
      query: z.string().describe("Search query in English (the corpus is English; translate the crew's words first)"),
      k: z.number().int().min(1).max(5).default(3),
      fault_codes: z
        .array(z.string().min(1).max(32))
        .max(8)
        .optional()
        .describe("Optional canonical FDIR fault codes (e.g. ['PLSS-FAN-01']) to pre-filter SOP chunks"),
    }),
    description: "Searches the NASA/JPL corpus (NASA-STD-3001, OCHMO, AMCL, MEDPRAT, SUITS, FDIR SOPs) and returns chunks with document and page.",
    run: (a) => safeSearchDocs(a.query, a.k, a.fault_codes),
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
