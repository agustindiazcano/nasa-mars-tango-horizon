import type {
  DonkiAlert,
  EnvironmentSnapshot,
  EnvTelemetrySample,
} from "../types/mission.js";
import { surfaceDensity } from "./atmosphere.js";
import { C } from "./constants.js";
import { doseRate } from "./dose.js";
import { solarPowerW } from "./solar.js";
import {
  decide,
  ENV_LIMITS,
  type EnvLimits,
  type EvaPlan,
  type Maneuver,
  type StormForecast,
} from "./stormDecision.js";

export type EnvironmentalManeuver = Maneuver | "seek_shelter" | "deploy_beacons";

export interface EnvGradients {
  sample_count: number;
  span_s: number;
  dp_dt_pa_h: number;
  diurnal_air_swing_k: number;
  dtau_dt_per_h: number;
  dwind_dt_ms_h: number;
  ddose_dt_ugy_h2: number;
  air_density_kg_m3: number;
}

export interface FlightEnvelopeStatus {
  flyable: boolean;
  tau_ok: boolean;
  wind_ok: boolean;
  density_ok: boolean;
  air_density_kg_m3: number;
  reasons: string[];
}

export interface EnvRiskInput {
  env: EnvironmentSnapshot;
  env_window?: EnvTelemetrySample[];
  storm_forecast?: StormForecast[];
  base_battery_wh?: number;
  donki_alert?: DonkiAlert;
  plan?: Partial<EvaPlan>;
  svf?: number;
  limits?: Partial<EnvLimits>;
}

export interface EnvironmentalRiskAssessment {
  verdict: "go" | "go_with_changes" | "no_go";
  gradients: EnvGradients;
  time_to_storm_onset_s: number | null;
  visibility_abort_eta_s: number | null;
  time_to_zero_solar_margin_s: number | null;
  battery_autonomy_s: number | null;
  projected_eva_dose_ugy: number;
  solar_power_w: number;
  power_margin_w: number;
  flight_envelope: FlightEnvelopeStatus;
  recommended_maneuvers: EnvironmentalManeuver[];
  limits: EnvLimits;
}

const DEFAULT_SOLAR_AREA_M2 = 400;
const DEFAULT_SOLAR_EFFICIENCY = 0.22;
const DEFAULT_SOLAR_DEMAND_W = 18000;
const DEFAULT_BASE_BATTERY_WH = 420000;
const DEFAULT_SUN_ELEV_DEG = 45;
const DEFAULT_EVA_DURATION_S = 7200;
const DEFAULT_RETURN_S = 1500;

/** Ordinary least-squares slope dy/dx where x is elapsed time in hours. */
function olsSlopePerHour(xsHours: number[], ys: number[]): number {
  const n = xsHours.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xsHours[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xsHours[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }
  if (den <= 1e-12) return 0;
  return num / den;
}

function finiteOr(v: number | undefined, fallback: number): number {
  return v !== undefined && Number.isFinite(v) ? v : fallback;
}

/**
 * Computes rolling environmental gradients (pressure tide rate, diurnal air temperature swing,
 * optical depth ramp, wind shear rate, radiation dose slope, and surface air density).
 */
export function computeEnvGradients(
  window: EnvTelemetrySample[],
  current?: EnvironmentSnapshot,
): EnvGradients {
  const valid = window
    .filter(
      (s) =>
        Number.isFinite(s.t_s) &&
        Number.isFinite(s.pressure_pa) &&
        Number.isFinite(s.air_temp_k) &&
        s.air_temp_k > 0 &&
        Number.isFinite(s.tau) &&
        Number.isFinite(s.wind_ms) &&
        Number.isFinite(s.dose_rate_ugy_h),
    )
    .slice()
    .sort((a, b) => a.t_s - b.t_s);

  const latest = valid[valid.length - 1];
  const p = current && Number.isFinite(current.pressure_pa) ? current.pressure_pa : (latest?.pressure_pa ?? 750);
  const t = current && Number.isFinite(current.air_temp_k) && current.air_temp_k > 0
    ? current.air_temp_k
    : (latest?.air_temp_k ?? 220);
  const airDensity = surfaceDensity(p, t);

  if (valid.length < 2) {
    return {
      sample_count: valid.length,
      span_s: 0,
      dp_dt_pa_h: 0,
      diurnal_air_swing_k: 0,
      dtau_dt_per_h: 0,
      dwind_dt_ms_h: 0,
      ddose_dt_ugy_h2: 0,
      air_density_kg_m3: Number(airDensity.toFixed(5)),
    };
  }

  const t0 = valid[0].t_s;
  const spanS = valid[valid.length - 1].t_s - t0;
  const xsHours = valid.map((s) => (s.t_s - t0) / 3600);

  let minT = Infinity;
  let maxT = -Infinity;
  for (const s of valid) {
    if (s.air_temp_k < minT) minT = s.air_temp_k;
    if (s.air_temp_k > maxT) maxT = s.air_temp_k;
  }

  return {
    sample_count: valid.length,
    span_s: Number(spanS.toFixed(2)),
    dp_dt_pa_h: Number(olsSlopePerHour(xsHours, valid.map((s) => s.pressure_pa)).toFixed(4)),
    diurnal_air_swing_k: Number((maxT - minT).toFixed(3)),
    dtau_dt_per_h: Number(olsSlopePerHour(xsHours, valid.map((s) => s.tau)).toFixed(5)),
    dwind_dt_ms_h: Number(olsSlopePerHour(xsHours, valid.map((s) => s.wind_ms)).toFixed(4)),
    ddose_dt_ugy_h2: Number(olsSlopePerHour(xsHours, valid.map((s) => s.dose_rate_ugy_h)).toFixed(4)),
    air_density_kg_m3: Number(airDensity.toFixed(5)),
  };
}

/** Evaluates aircraft flight envelope against unified dust opacity, wind, and air density limits. */
export function evaluateFlightEnvelope(
  env: Pick<EnvironmentSnapshot, "tau" | "wind_ms" | "pressure_pa" | "air_temp_k">,
  limits: EnvLimits = ENV_LIMITS,
): FlightEnvelopeStatus {
  const airDensity = surfaceDensity(env.pressure_pa, env.air_temp_k);
  const tauOk = env.tau < limits.tauDroneGrounding;
  const windOk = env.wind_ms < limits.maxFlightWindMs;
  const densityOk = airDensity >= limits.minFlightDensityKgM3;
  const reasons: string[] = [];

  if (!tauOk) {
    reasons.push(`tau=${env.tau.toFixed(2)} >= ${limits.tauDroneGrounding}`);
  }
  if (!windOk) {
    reasons.push(`wind=${env.wind_ms.toFixed(1)} m/s >= ${limits.maxFlightWindMs} m/s`);
  }
  if (!densityOk) {
    reasons.push(`density=${airDensity.toFixed(4)} kg/m^3 < ${limits.minFlightDensityKgM3} kg/m^3`);
  }

  return {
    flyable: tauOk && windOk && densityOk,
    tau_ok: tauOk,
    wind_ok: windOk,
    density_ok: densityOk,
    air_density_kg_m3: Number(airDensity.toFixed(5)),
    reasons,
  };
}

function estimateTauThresholdEtaS(
  currentTau: number,
  targetTau: number,
  dtauPerH: number,
  forecast: StormForecast[] | undefined,
): number | null {
  if (currentTau >= targetTau) return 0;
  if (dtauPerH > 1e-6) {
    return Math.round(((targetTau - currentTau) / dtauPerH) * 3600);
  }
  if (forecast && forecast.length > 0) {
    const today = forecast.find((f) => f.horizonSol === 1) ?? forecast[0];
    if (today.q90 > targetTau && today.q90 > currentTau) {
      return Math.round(((targetTau - currentTau) / (today.q90 - currentTau)) * C.mars_sol_s.value);
    }
  }
  return null;
}

/**
 * Deterministic predictive environmental risk assessment combining live rolling telemetry gradients,
 * direct-beam solar margin, battery autonomy, projected EVA radiation dose, and aircraft envelope.
 */
export function predictEnvironmentalRisk(input: EnvRiskInput): EnvironmentalRiskAssessment {
  const limits: EnvLimits = { ...ENV_LIMITS, ...input.limits };
  const window = input.env_window ?? [];
  const gradients = computeEnvGradients(window, input.env);
  const latestWindowSample = window.length > 0 ? window[window.length - 1] : undefined;

  const tau = Math.max(0, finiteOr(input.env.tau, 0.5));
  const windMs = Math.max(0, finiteOr(input.env.wind_ms, 0));
  const doseRateUgyH = Math.max(0, finiteOr(input.env.dose_rate_ugy_h, 10));
  const sunElevDeg = finiteOr(input.env.sun_elev_deg ?? latestWindowSample?.sun_elev_deg, DEFAULT_SUN_ELEV_DEG);
  const mu = sunElevDeg <= 0 ? 0 : Math.sin((Math.min(90, sunElevDeg) * Math.PI) / 180);

  const areaM2 = Math.max(0, finiteOr(input.env.solar_area_m2, DEFAULT_SOLAR_AREA_M2));
  const efficiency = Math.max(0, finiteOr(input.env.solar_efficiency, DEFAULT_SOLAR_EFFICIENCY));
  const demandW = Math.max(0, finiteOr(input.env.solar_demand_w, DEFAULT_SOLAR_DEMAND_W));
  const batteryWh = Math.max(0, finiteOr(input.base_battery_wh, DEFAULT_BASE_BATTERY_WH));

  const solarPower = solarPowerW(tau, mu, areaM2, efficiency);
  const powerMarginW = solarPower - demandW;
  const peakUnattenuatedW = C.mars_solar_toa.value * areaM2 * efficiency;

  let timeToZeroSolarMarginS: number | null = null;
  if (powerMarginW <= 0) {
    timeToZeroSolarMarginS = 0;
  } else if (mu > 0 && demandW > 0 && peakUnattenuatedW > demandW) {
    const tauZero = mu * Math.log(peakUnattenuatedW / demandW);
    timeToZeroSolarMarginS = estimateTauThresholdEtaS(tau, tauZero, gradients.dtau_dt_per_h, input.storm_forecast);
  }

  const netDeficitW = demandW - solarPower;
  const batteryAutonomyS =
    netDeficitW > 0 ? Math.round((batteryWh / netDeficitW) * 3600) : null;

  const timeToStormOnsetS = estimateTauThresholdEtaS(
    tau,
    limits.tauVisibility,
    gradients.dtau_dt_per_h,
    input.storm_forecast,
  );
  const visibilityAbortEtaS = estimateTauThresholdEtaS(
    tau,
    limits.tauAbort,
    gradients.dtau_dt_per_h,
    input.storm_forecast,
  );

  const plan: EvaPlan = {
    durationS: Math.max(0, finiteOr(input.plan?.durationS, DEFAULT_EVA_DURATION_S)),
    returnToShelterS: Math.max(0, finiteOr(input.plan?.returnToShelterS, DEFAULT_RETURN_S)),
  };
  const totalEvaH = (plan.durationS + plan.returnToShelterS) / 3600;
  const svf = Math.max(0, Math.min(1, finiteOr(input.svf, 1.0)));
  const doseSlope = gradients.ddose_dt_ugy_h2 > 0 || !input.donki_alert?.active_sep ? gradients.ddose_dt_ugy_h2 : 0;
  const meanProjectedRate = Math.max(0, doseRateUgyH + 0.5 * doseSlope * totalEvaH);
  const projectedEvaDoseUgy = Number((doseRate(meanProjectedRate, svf) * totalEvaH).toFixed(2));

  const flightEnvelope = evaluateFlightEnvelope(
    {
      tau,
      wind_ms: windMs,
      pressure_pa: finiteOr(input.env.pressure_pa, 750),
      air_temp_k: finiteOr(input.env.air_temp_k, 220),
    },
    limits,
  );

  const maneuvers = new Set<EnvironmentalManeuver>();
  if (input.storm_forecast && input.storm_forecast.length > 0) {
    const fcDecision = decide(
      input.storm_forecast,
      plan,
      limits,
      (t) => solarPowerW(t, mu, areaM2, efficiency),
      demandW,
      C.mars_sol_s.value,
      tau,
    );
    for (const m of fcDecision.maneuvers) maneuvers.add(m);
  }

  if (visibilityAbortEtaS !== null && visibilityAbortEtaS <= plan.returnToShelterS) {
    maneuvers.add("postpone");
    maneuvers.add("deploy_beacons");
  } else if (
    timeToStormOnsetS !== null &&
    timeToStormOnsetS <= plan.durationS + plan.returnToShelterS
  ) {
    if (plan.returnToShelterS < timeToStormOnsetS) {
      maneuvers.add("shorten_eva");
      maneuvers.add("preposition_rover");
      maneuvers.add("deploy_beacons");
    } else {
      maneuvers.add("postpone");
    }
  }

  if (!flightEnvelope.flyable) {
    maneuvers.add("recall_aircraft");
  }

  if (
    powerMarginW < limits.minPowerMarginW ||
    (timeToZeroSolarMarginS !== null && timeToZeroSolarMarginS <= plan.durationS)
  ) {
    maneuvers.add("charge_batteries");
    maneuvers.add("switch_to_fission");
  }

  if (
    doseRateUgyH >= limits.sepDoseAbortUgyH ||
    (input.donki_alert?.active_sep && gradients.ddose_dt_ugy_h2 > 0)
  ) {
    maneuvers.add("seek_shelter");
    maneuvers.add("postpone");
  } else if (doseRateUgyH >= limits.sepDoseWarnUgyH || input.donki_alert?.active_sep) {
    maneuvers.add("shorten_eva");
    maneuvers.add("seek_shelter");
  }

  const verdict: "go" | "go_with_changes" | "no_go" = maneuvers.has("postpone")
    ? "no_go"
    : maneuvers.size > 0
      ? "go_with_changes"
      : "go";

  return {
    verdict,
    gradients,
    time_to_storm_onset_s: timeToStormOnsetS,
    visibility_abort_eta_s: visibilityAbortEtaS,
    time_to_zero_solar_margin_s: timeToZeroSolarMarginS,
    battery_autonomy_s: batteryAutonomyS,
    projected_eva_dose_ugy: projectedEvaDoseUgy,
    solar_power_w: Number(solarPower.toFixed(1)),
    power_margin_w: Number(powerMarginW.toFixed(1)),
    flight_envelope: flightEnvelope,
    recommended_maneuvers: Array.from(maneuvers),
    limits,
  };
}
