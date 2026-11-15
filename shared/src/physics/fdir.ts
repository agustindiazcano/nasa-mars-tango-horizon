import type {
  FaultCode,
  FaultSeverity,
  FleetUnitHealth,
  FleetWindowSample,
  PowerIsruWindowSample,
  SuitWindowSample,
} from "../types/mission.js";

export const MAX_FDIR_WINDOW_SAMPLES = 90;
export const MAX_RUL_S = 86_400; // 24 h upper clamp for remaining useful life
const PREDICTIVE_RUL_WARN_S = 3_600; // 1 h horizon triggers predictive degraded warning

export const CANONICAL_FAULT_CODES: readonly FaultCode[] = [
  "PLSS-FAN-01",
  "PLSS-SCRUB-01",
  "PLSS-COOL-01",
  "RVR-MOB-01",
  "RVR-THM-01",
  "ARM-TORQ-01",
  "HAB-PWR-01",
  "ISRU-MOX-01",
] as const;

export type FdirScope = "suit" | "fleet" | "power_isru" | "all";
export type IsolationActionKind = "switch_redundant" | "derate" | "safe_halt" | "quarantine";

export interface FdirContext {
  met_s?: number;
  suit?: Record<string, number>;
  suit_window?: SuitWindowSample[];
  fleet?: Array<{ id: string; kind: string; battery: number; busy?: boolean }>;
  fleet_health?: Record<string, FleetUnitHealth>;
  fleet_windows?: Record<string, FleetWindowSample[]>;
  power_isru_window?: PowerIsruWindowSample[];
}

export interface ChannelMetric {
  channel: string;
  latest: number;
  unit: string;
  samples: number;
  slope_per_s: number;
  z_score: number;
  rul_s: number | null;
  status: FaultSeverity;
}

export interface FaultFinding {
  fault_code: FaultCode;
  target_type: "suit" | "fleet" | "hab_power" | "isru";
  target_id: string;
  subsystem: string;
  severity: FaultSeverity;
  signature: string;
  rul_s: number | null;
  slope_per_s: number;
  z_score: number;
  recommended_action: IsolationActionKind;
  summary: string;
  channels: ChannelMetric[];
}

export interface ComponentHealthReport {
  scope: FdirScope;
  unit_id?: string;
  overall_severity: FaultSeverity;
  faults: FaultFinding[];
  active_fault_codes: FaultCode[];
  metrics: Record<string, ChannelMetric[]>;
}

interface ChannelSpec {
  channel: string;
  unit: string;
  direction: "lower" | "upper";
  nominalMean: number;
  nominalStd: number;
  degraded: number;
  crit: number;
  minSlopeMag: number;
}

const SEVERITY_RANK: Record<FaultSeverity, number> = {
  nominal: 0,
  degraded: 1,
  critical: 2,
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function maxSeverity(a: FaultSeverity, b: FaultSeverity): FaultSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function minRul(values: Array<number | null>): number | null {
  let best: number | null = null;
  for (const v of values) {
    if (v === null) continue;
    if (best === null || v < best) best = v;
  }
  return best;
}

/**
 * Computes linear least-squares slope, nominal-baseline z-score, and clamped RUL
 * for a single telemetry channel. Returns null if no finite samples exist.
 */
function analyzeChannel(
  rawPoints: Array<{ t: number; v: number | undefined }>,
  spec: ChannelSpec,
): ChannelMetric | null {
  const valid = rawPoints
    .filter((p): p is { t: number; v: number } => Number.isFinite(p.t) && typeof p.v === "number" && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t)
    .slice(-MAX_FDIR_WINDOW_SAMPLES);

  if (valid.length === 0) return null;

  let slope = 0;
  if (valid.length >= 2) {
    let sumT = 0;
    let sumV = 0;
    for (const p of valid) {
      sumT += p.t;
      sumV += p.v;
    }
    const meanT = sumT / valid.length;
    const meanV = sumV / valid.length;
    let sTT = 0;
    let sTV = 0;
    for (const p of valid) {
      const dt = p.t - meanT;
      sTT += dt * dt;
      sTV += dt * (p.v - meanV);
    }
    if (sTT > 0) slope = sTV / sTT;
  }

  const latest = valid[valid.length - 1].v;
  // Nominal-baseline z-score keeps fault detection stable even for short ramp windows.
  const zScore = (latest - spec.nominalMean) / spec.nominalStd;

  let breached = false;
  let degrading = false;
  let rulS: number | null = null;

  if (spec.direction === "lower") {
    breached = latest <= spec.crit;
    if (breached) {
      rulS = 0;
    } else if (slope < -spec.minSlopeMag) {
      rulS = Number(clamp((latest - spec.crit) / -slope, 0, MAX_RUL_S).toFixed(1));
    }
    degrading =
      latest <= spec.degraded ||
      (rulS !== null && rulS <= PREDICTIVE_RUL_WARN_S && zScore <= -2.0);
  } else {
    breached = latest >= spec.crit;
    if (breached) {
      rulS = 0;
    } else if (slope > spec.minSlopeMag) {
      rulS = Number(clamp((spec.crit - latest) / slope, 0, MAX_RUL_S).toFixed(1));
    }
    degrading =
      latest >= spec.degraded ||
      (rulS !== null && rulS <= PREDICTIVE_RUL_WARN_S && zScore >= 2.0);
  }

  const status: FaultSeverity = breached ? "critical" : degrading ? "degraded" : "nominal";

  return {
    channel: spec.channel,
    latest: Number(latest.toFixed(4)),
    unit: spec.unit,
    samples: valid.length,
    slope_per_s: Number(slope.toFixed(6)),
    z_score: Number(zScore.toFixed(2)),
    rul_s: rulS,
    status,
  };
}

function buildSeriesFromWindow<T extends { t_s: number }>(
  window: T[] | undefined,
  pick: (s: T) => number | undefined,
  fallbackValue: number | undefined,
  metS: number,
): Array<{ t: number; v: number | undefined }> {
  if (Array.isArray(window) && window.length > 0) {
    const pts = window
      .filter((s) => s && typeof s === "object" && Number.isFinite(s.t_s))
      .map((s) => ({ t: s.t_s, v: pick(s) }))
      .filter((p) => typeof p.v === "number" && Number.isFinite(p.v));
    if (pts.length > 0) return pts;
  }
  if (typeof fallbackValue === "number" && Number.isFinite(fallbackValue)) {
    return [{ t: metS, v: fallbackValue }];
  }
  return [];
}

function evaluateSuit(ctx: FdirContext): { faults: FaultFinding[]; metrics: ChannelMetric[] } {
  const metS = Number.isFinite(ctx.met_s) ? (ctx.met_s as number) : 0;
  const w = ctx.suit_window;
  const s = ctx.suit ?? {};
  const metrics: ChannelMetric[] = [];
  const faults: FaultFinding[] = [];

  const activeFan = s.active_fan === 2 ? "sec" : "pri";
  const fanField = activeFan === "sec" ? "fan_sec_rpm" : "fan_pri_rpm";
  const fanRpm = analyzeChannel(
    buildSeriesFromWindow(
      w,
      (x) => (activeFan === "sec" ? x.fan_sec_rpm : x.fan_pri_rpm),
      s[fanField] ?? (activeFan === "pri" ? s.fan_rpm : undefined),
      metS,
    ),
    {
      channel: fanField,
      unit: "rpm",
      direction: "lower",
      nominalMean: 30_000,
      nominalStd: 500,
      degraded: 26_000,
      crit: 18_000,
      minSlopeMag: 0.05,
    },
  );
  if (fanRpm) metrics.push(fanRpm);

  const fanDeltaP = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.fan_delta_p_pa, s.fan_delta_p_pa, metS),
    {
      channel: "fan_delta_p_pa",
      unit: "Pa",
      direction: "lower",
      nominalMean: 900,
      nominalStd: 40,
      degraded: 650,
      crit: 400,
      minSlopeMag: 0.01,
    },
  );
  if (fanDeltaP) metrics.push(fanDeltaP);

  const helmetCo2 = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.helmet_co2_pa, s.helmet_co2_pa, metS),
    {
      channel: "helmet_co2_pa",
      unit: "Pa",
      direction: "upper",
      nominalMean: 350,
      nominalStd: 80,
      degraded: 700,
      crit: 1500,
      minSlopeMag: 0.05,
    },
  );
  if (helmetCo2) metrics.push(helmetCo2);

  // Isolate PLSS-FAN-01 from scrubber saturation using fan speed and delta-P.
  const fanChannels = [fanRpm, fanDeltaP].filter((c): c is ChannelMetric => c !== null);
  const fanFaulted = fanChannels.filter((c) => c.status !== "nominal");
  if (fanFaulted.length > 0) {
    const primary = fanRpm && fanRpm.status !== "nominal" ? fanRpm : fanFaulted[0];
    const sev = fanFaulted.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(fanFaulted.map((c) => c.rul_s));
    const involved = helmetCo2 ? [...fanChannels, helmetCo2] : fanChannels;
    faults.push({
      fault_code: "PLSS-FAN-01",
      target_type: "suit",
      target_id: "suit",
      subsystem: "ventilation_fan",
      severity: sev,
      signature: fanRpm && fanRpm.latest <= 18_000 ? "fan_stall" : "fan_degradation",
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: sev === "critical" ? "switch_redundant" : "derate",
      summary: `PLSS ${activeFan} fan ${primary.latest} ${primary.unit} (slope ${primary.slope_per_s}/s, RUL ${rulS ?? "n/a"} s)`,
      channels: involved,
    });
  }

  const activeScrubber = s.active_scrubber === 2 ? "B" : "A";
  const scrubField = activeScrubber === "B" ? "scrubber_b_co2_storage" : "scrubber_a_co2_storage";
  const scrubFallback =
    activeScrubber === "B"
      ? s.scrubber_b_co2_storage
      : (s.scrubber_a_co2_storage ?? s.scrubber_a_co2_storage_pct);
  const scrubSat = analyzeChannel(
    buildSeriesFromWindow(
      w,
      (x) => (activeScrubber === "B" ? x.scrubber_b_co2_storage : x.scrubber_a_co2_storage),
      scrubFallback,
      metS,
    ),
    {
      channel: scrubField,
      unit: "%",
      direction: "upper",
      nominalMean: 30,
      nominalStd: 15,
      degraded: 75,
      crit: 95,
      minSlopeMag: 0.001,
    },
  );
  if (scrubSat) metrics.push(scrubSat);

  const suitCo2 = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.suit_co2_pa, s.suit_co2_pa ?? s.co2_pa, metS),
    {
      channel: "suit_co2_pa",
      unit: "Pa",
      direction: "upper",
      nominalMean: 350,
      nominalStd: 80,
      degraded: 600,
      crit: 1333,
      minSlopeMag: 0.05,
    },
  );
  if (suitCo2) metrics.push(suitCo2);

  // Only attribute rising suit_co2_pa to PLSS-SCRUB-01 when scrubber is loading or fan is nominal.
  const fanHealthy = !fanRpm || fanRpm.status === "nominal";
  const scrubEvidence = scrubSat && (scrubSat.status !== "nominal" || scrubSat.latest >= 55 || scrubSat.slope_per_s > 0.005);
  const scrubActiveChannels: ChannelMetric[] = [];
  if (scrubSat && scrubSat.status !== "nominal") scrubActiveChannels.push(scrubSat);
  if (suitCo2 && suitCo2.status !== "nominal" && (scrubEvidence || fanHealthy)) {
    scrubActiveChannels.push(suitCo2);
  }
  if (scrubActiveChannels.length > 0) {
    const primary = scrubSat && scrubSat.status !== "nominal" ? scrubSat : scrubActiveChannels[0];
    const sev = scrubActiveChannels.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(scrubActiveChannels.map((c) => c.rul_s));
    const allScrub = [scrubSat, suitCo2].filter((c): c is ChannelMetric => c !== null);
    faults.push({
      fault_code: "PLSS-SCRUB-01",
      target_type: "suit",
      target_id: "suit",
      subsystem: "co2_scrubber",
      severity: sev,
      signature: scrubSat && scrubSat.latest >= 95 ? "scrubber_saturated" : "scrubber_breakthrough",
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: sev === "critical" ? "switch_redundant" : "derate",
      summary: `PLSS scrubber ${activeScrubber} ${primary.channel}=${primary.latest} ${primary.unit} (slope ${primary.slope_per_s}/s)`,
      channels: allScrub,
    });
  }

  const coolantPress = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.coolant_liquid_pressure, s.coolant_liquid_pressure, metS),
    {
      channel: "coolant_liquid_pressure",
      unit: "psi",
      direction: "lower",
      nominalMean: 500,
      nominalStd: 20,
      degraded: 350,
      crit: 250,
      minSlopeMag: 0.01,
    },
  );
  if (coolantPress) metrics.push(coolantPress);

  const coolantSeries = buildSeriesFromWindow(w, (x) => x.coolant_ml, s.coolant_ml, metS);
  const coolantMean = coolantSeries[0] && (coolantSeries[0].v ?? 0) > 2000 ? 4500 : 1000;
  const coolantVol = analyzeChannel(coolantSeries, {
    channel: "coolant_ml",
    unit: "mL",
    direction: "lower",
    nominalMean: coolantMean,
    nominalStd: 100,
    degraded: 400,
    crit: 200,
    minSlopeMag: 0.02,
  });
  if (coolantVol) metrics.push(coolantVol);

  const suitTemp = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.suit_temp_k, s.suit_temp_k, metS),
    {
      channel: "suit_temp_k",
      unit: "K",
      direction: "upper",
      nominalMean: 293,
      nominalStd: 2,
      degraded: 301,
      crit: 306,
      minSlopeMag: 0.001,
    },
  );
  if (suitTemp) metrics.push(suitTemp);

  const battTemp = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.battery_temp_c, s.battery_temp_c, metS),
    {
      channel: "battery_temp_c",
      unit: "C",
      direction: "upper",
      nominalMean: 25,
      nominalStd: 4,
      degraded: 42,
      crit: 52,
      minSlopeMag: 0.002,
    },
  );
  if (battTemp) metrics.push(battTemp);

  const coolChannels = [coolantPress, coolantVol, suitTemp, battTemp].filter((c): c is ChannelMetric => c !== null);
  const coolFaulted = coolChannels.filter((c) => c.status !== "nominal");
  if (coolFaulted.length > 0) {
    const primary = coolFaulted[0];
    const sev = coolFaulted.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(coolFaulted.map((c) => c.rul_s));
    faults.push({
      fault_code: "PLSS-COOL-01",
      target_type: "suit",
      target_id: "suit",
      subsystem: "coolant_loop",
      severity: sev,
      signature: coolantVol?.status !== "nominal" || coolantPress?.status !== "nominal" ? "coolant_loss" : "thermal_rise",
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: sev === "critical" ? "safe_halt" : "derate",
      summary: `PLSS coolant/thermal ${primary.channel}=${primary.latest} ${primary.unit} (slope ${primary.slope_per_s}/s)`,
      channels: coolChannels,
    });
  }

  return { faults, metrics };
}

function evaluateFleetUnit(
  unitId: string,
  unitKind: string,
  ctx: FdirContext,
): { faults: FaultFinding[]; metrics: ChannelMetric[] } {
  const metS = Number.isFinite(ctx.met_s) ? (ctx.met_s as number) : 0;
  const health = ctx.fleet_health?.[unitId];
  const win = ctx.fleet_windows?.[unitId];
  const metrics: ChannelMetric[] = [];
  const faults: FaultFinding[] = [];

  const isManip = unitKind === "manipulator" || unitId === "manip-1";

  const slip = analyzeChannel(
    buildSeriesFromWindow(win, (x) => x.slip_ratio, health?.slip_ratio, metS),
    {
      channel: "slip_ratio",
      unit: "-",
      direction: "upper",
      nominalMean: 0.08,
      nominalStd: 0.05,
      degraded: 0.35,
      crit: 0.6,
      minSlopeMag: 0.0002,
    },
  );
  if (slip) metrics.push(slip);

  const motorCurrent = analyzeChannel(
    buildSeriesFromWindow(win, (x) => x.motor_current_a, health?.motor_current_a, metS),
    {
      channel: "motor_current_a",
      unit: "A",
      direction: "upper",
      nominalMean: 4.5,
      nominalStd: 1.5,
      degraded: 12.0,
      crit: 18.0,
      minSlopeMag: 0.005,
    },
  );
  if (motorCurrent) metrics.push(motorCurrent);

  const actuatorTemp = analyzeChannel(
    buildSeriesFromWindow(win, (x) => x.actuator_temp_c, health?.actuator_temp_c, metS),
    {
      channel: "actuator_temp_c",
      unit: "C",
      direction: "upper",
      nominalMean: 30,
      nominalStd: 8,
      degraded: 65,
      crit: 85,
      minSlopeMag: 0.005,
    },
  );
  if (actuatorTemp) metrics.push(actuatorTemp);

  const drillTorque = analyzeChannel(
    buildSeriesFromWindow(win, (x) => x.drill_torque_nm, health?.drill_torque_nm, metS),
    {
      channel: "drill_torque_nm",
      unit: "Nm",
      direction: "upper",
      nominalMean: 12,
      nominalStd: 4,
      degraded: 30,
      crit: 45,
      minSlopeMag: 0.01,
    },
  );
  if (drillTorque) metrics.push(drillTorque);

  // Isolate manipulator arm torque/overcurrent faults from rover wheel drive mobility faults.
  const torqueFault = drillTorque && drillTorque.status !== "nominal";
  const armCurrentCoupled =
    isManip &&
    motorCurrent &&
    motorCurrent.status !== "nominal" &&
    (!slip || slip.status === "nominal") &&
    (torqueFault || (drillTorque !== null && drillTorque.latest >= 20) || !slip);

  if (torqueFault || armCurrentCoupled) {
    const active = [drillTorque, armCurrentCoupled ? motorCurrent : null].filter(
      (c): c is ChannelMetric => c !== null && c.status !== "nominal",
    );
    const primary = drillTorque && drillTorque.status !== "nominal" ? drillTorque : active[0];
    const sev = active.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(active.map((c) => c.rul_s));
    faults.push({
      fault_code: "ARM-TORQ-01",
      target_type: "fleet",
      target_id: unitId,
      subsystem: "arm_drill",
      severity: sev,
      signature: torqueFault ? "arm_overtorque" : "arm_overcurrent",
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: sev === "critical" ? "safe_halt" : "derate",
      summary: `${unitId} arm ${primary.channel}=${primary.latest} ${primary.unit} (slope ${primary.slope_per_s}/s)`,
      channels: [drillTorque, motorCurrent].filter((c): c is ChannelMetric => c !== null),
    });
  }

  const slipFault = slip && slip.status !== "nominal";
  const driveCurrentFault =
    motorCurrent &&
    motorCurrent.status !== "nominal" &&
    !armCurrentCoupled &&
    (!torqueFault || Boolean(slipFault));

  if (slipFault || driveCurrentFault) {
    const active = [slipFault ? slip : null, driveCurrentFault ? motorCurrent : null].filter(
      (c): c is ChannelMetric => c !== null,
    );
    const sev = active.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(active.map((c) => c.rul_s));
    const primary = slipFault ? slip! : motorCurrent!;
    let signature = "mobility_combined";
    if (slipFault && !driveCurrentFault) {
      signature = "wheel_sinkage";
    } else if (driveCurrentFault && (!slip || slip.latest < 0.2)) {
      signature = "wheel_stall";
    }
    faults.push({
      fault_code: "RVR-MOB-01",
      target_type: "fleet",
      target_id: unitId,
      subsystem: "wheel_drive",
      severity: sev,
      signature,
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: sev === "critical" ? "safe_halt" : "derate",
      summary: `${unitId} mobility (${signature}): ${primary.channel}=${primary.latest} ${primary.unit}`,
      channels: [slip, motorCurrent].filter((c): c is ChannelMetric => c !== null),
    });
  }

  if (actuatorTemp && actuatorTemp.status !== "nominal") {
    faults.push({
      fault_code: "RVR-THM-01",
      target_type: "fleet",
      target_id: unitId,
      subsystem: "actuator_thermal",
      severity: actuatorTemp.status,
      signature: "actuator_overtemp",
      rul_s: actuatorTemp.rul_s,
      slope_per_s: actuatorTemp.slope_per_s,
      z_score: actuatorTemp.z_score,
      recommended_action: actuatorTemp.status === "critical" ? "safe_halt" : "derate",
      summary: `${unitId} actuator_temp_c=${actuatorTemp.latest} C (slope ${actuatorTemp.slope_per_s}/s)`,
      channels: [actuatorTemp],
    });
  }

  return { faults, metrics };
}

function evaluatePowerAndIsru(ctx: FdirContext): {
  faults: FaultFinding[];
  habMetrics: ChannelMetric[];
  isruMetrics: ChannelMetric[];
} {
  const w = ctx.power_isru_window;
  const metS = Number.isFinite(ctx.met_s) ? (ctx.met_s as number) : 0;
  const faults: FaultFinding[] = [];
  const habMetrics: ChannelMetric[] = [];
  const isruMetrics: ChannelMetric[] = [];

  if (!Array.isArray(w) || w.length === 0) {
    return { faults, habMetrics, isruMetrics };
  }

  const dustFactor = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.solar_dust_factor, undefined, metS),
    {
      channel: "solar_dust_factor",
      unit: "-",
      direction: "lower",
      nominalMean: 0.9,
      nominalStd: 0.05,
      degraded: 0.55,
      crit: 0.3,
      minSlopeMag: 0.00001,
    },
  );
  if (dustFactor) habMetrics.push(dustFactor);

  const busV = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.hab_bus_v, undefined, metS),
    {
      channel: "hab_bus_v",
      unit: "V",
      direction: "lower",
      nominalMean: 28.0,
      nominalStd: 0.5,
      degraded: 25.5,
      crit: 24.0,
      minSlopeMag: 0.0005,
    },
  );
  if (busV) habMetrics.push(busV);

  const habBattTemp = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.hab_battery_temp_c, undefined, metS),
    {
      channel: "hab_battery_temp_c",
      unit: "C",
      direction: "upper",
      nominalMean: 22,
      nominalStd: 4,
      degraded: 42,
      crit: 52,
      minSlopeMag: 0.002,
    },
  );
  if (habBattTemp) habMetrics.push(habBattTemp);

  const habFaulted = habMetrics.filter((c) => c.status !== "nominal");
  if (habFaulted.length > 0) {
    const primary = habFaulted[0];
    const sev = habFaulted.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(habFaulted.map((c) => c.rul_s));
    faults.push({
      fault_code: "HAB-PWR-01",
      target_type: "hab_power",
      target_id: "hab_power",
      subsystem: "solar_bus",
      severity: sev,
      signature: dustFactor?.status !== "nominal" ? "solar_dust_fouling" : "bus_battery_fault",
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: habBattTemp?.status === "critical" ? "safe_halt" : "derate",
      summary: `Habitat power ${primary.channel}=${primary.latest} ${primary.unit} (RUL ${rulS ?? "n/a"} s)`,
      channels: habMetrics,
    });
  }

  const moxieComp = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.moxie_compressor_a, undefined, metS),
    {
      channel: "moxie_compressor_a",
      unit: "A",
      direction: "upper",
      nominalMean: 4.5,
      nominalStd: 0.8,
      degraded: 8.5,
      crit: 12.0,
      minSlopeMag: 0.002,
    },
  );
  if (moxieComp) isruMetrics.push(moxieComp);

  const moxieAsr = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.moxie_soxe_asr, undefined, metS),
    {
      channel: "moxie_soxe_asr",
      unit: "ohm*cm2",
      direction: "upper",
      nominalMean: 0.65,
      nominalStd: 0.1,
      degraded: 1.5,
      crit: 2.2,
      minSlopeMag: 0.0003,
    },
  );
  if (moxieAsr) isruMetrics.push(moxieAsr);

  const moxieO2 = analyzeChannel(
    buildSeriesFromWindow(w, (x) => x.moxie_o2_rate_g_h, undefined, metS),
    {
      channel: "moxie_o2_rate_g_h",
      unit: "g/h",
      direction: "lower",
      nominalMean: 8.0,
      nominalStd: 1.0,
      degraded: 4.5,
      crit: 2.0,
      minSlopeMag: 0.001,
    },
  );
  if (moxieO2) isruMetrics.push(moxieO2);

  const isruFaulted = isruMetrics.filter((c) => c.status !== "nominal");
  if (isruFaulted.length > 0) {
    const primary = isruFaulted[0];
    const sev = isruFaulted.reduce<FaultSeverity>((acc, c) => maxSeverity(acc, c.status), "nominal");
    const rulS = minRul(isruFaulted.map((c) => c.rul_s));
    faults.push({
      fault_code: "ISRU-MOX-01",
      target_type: "isru",
      target_id: "isru",
      subsystem: "moxie_soxe",
      severity: sev,
      signature: moxieComp?.status !== "nominal" ? "compressor_overcurrent" : "soxe_degradation",
      rul_s: rulS,
      slope_per_s: primary.slope_per_s,
      z_score: primary.z_score,
      recommended_action: sev === "critical" ? "safe_halt" : "derate",
      summary: `MOXIE ISRU ${primary.channel}=${primary.latest} ${primary.unit} (RUL ${rulS ?? "n/a"} s)`,
      channels: isruMetrics,
    });
  }

  return { faults, habMetrics, isruMetrics };
}

/**
 * Deterministic aerospace FDIR and Remaining Useful Life (RUL) evaluator.
 * Computes least-squares slopes, nominal z-score residuals, clamped RUL, and
 * canonical fault codes across suit PLSS, fleet mobility/thermal/arm, and hab/ISRU.
 */
export function evaluateComponentHealth(
  ctx: FdirContext,
  scope: FdirScope = "all",
  unitId?: string,
): ComponentHealthReport {
  const faults: FaultFinding[] = [];
  const metrics: Record<string, ChannelMetric[]> = {};

  if (scope === "suit" || scope === "all") {
    const res = evaluateSuit(ctx);
    faults.push(...res.faults);
    if (res.metrics.length > 0) metrics.suit = res.metrics;
  }

  if (scope === "fleet" || scope === "all") {
    const fleetKindMap = new Map<string, string>();
    for (const u of ctx.fleet ?? []) fleetKindMap.set(u.id, u.kind);
    for (const id of Object.keys(ctx.fleet_health ?? {})) {
      if (!fleetKindMap.has(id)) fleetKindMap.set(id, id === "manip-1" ? "manipulator" : "rover_crew");
    }
    for (const id of Object.keys(ctx.fleet_windows ?? {})) {
      if (!fleetKindMap.has(id)) fleetKindMap.set(id, id === "manip-1" ? "manipulator" : "rover_crew");
    }

    const targetIds = unitId
      ? [unitId].filter((id) => fleetKindMap.has(id))
      : Array.from(fleetKindMap.keys());

    for (const id of targetIds) {
      const res = evaluateFleetUnit(id, fleetKindMap.get(id) ?? "rover_crew", ctx);
      faults.push(...res.faults);
      if (res.metrics.length > 0) metrics[id] = res.metrics;
    }
  }

  if (scope === "power_isru" || scope === "all") {
    const res = evaluatePowerAndIsru(ctx);
    faults.push(...res.faults);
    if (res.habMetrics.length > 0) metrics.hab_power = res.habMetrics;
    if (res.isruMetrics.length > 0) metrics.isru = res.isruMetrics;
  }

  faults.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const overall_severity = faults.reduce<FaultSeverity>(
    (acc, f) => maxSeverity(acc, f.severity),
    "nominal",
  );
  const active_fault_codes = Array.from(new Set(faults.map((f) => f.fault_code)));

  return {
    scope,
    ...(unitId ? { unit_id: unitId } : {}),
    overall_severity,
    faults,
    active_fault_codes,
    metrics,
  };
}
