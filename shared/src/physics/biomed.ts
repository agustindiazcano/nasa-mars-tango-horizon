import { metabolicRateW } from "./metabolic.js";
import { alveolarPO2 } from "./suitLeak.js";
import type {
  AstronautSnapshot,
  CrewProfile,
  CrewProfilePrivacyMode,
  VitalsSample,
} from "../types/mission.js";

/** Non-negotiable population physiological limits anchored to NASA-STD-3001 & OCHMO briefs. */
export const BIOMED_STANDARDS = {
  co2_nominal_pa: 533, // 4.0 mmHg indefinite limit (NASA-STD-3001_Vol2_RevE p.112)
  co2_warn_pa: 800, // 6.0 mmHg cognitive impairment onset (OCHMO-TB-004_CO2_Hypercapnia p.1)
  co2_crit_pa: 2000, // 15.0 mmHg Do Not Exceed (NASA-STD-3001_Vol2_RevE p.112)
  core_temp_baseline_c: 37.0,
  core_temp_elevated_c: 37.6,
  core_temp_warn_c: 38.0,
  core_temp_crit_c: 39.0,
  psi_elevated: 4.0,
  psi_warn: 7.0,
  psi_crit: 9.0,
  spo2_nominal_pct: 96.0,
  spo2_warn_pct: 94.0,
  spo2_crit_pct: 90.0,
  hr_resting_bpm: 70,
  hr_max_bpm: 185,
  hr_elevated_bpm: 120,
  hr_warn_bpm: 155,
  hr_crit_bpm: 175,
  cardiac_drift_elevated_bpm_per_w: 0.38,
  cardiac_drift_warn_bpm_per_w: 0.45,
  cardiac_drift_crit_bpm_per_w: 0.60,
  metabolic_sustained_max_w: 581, // 500 kcal/h (NASA-STD-3001_Vol2_RevE p.112)
} as const;

export const BIOMED_ADVISORY_NOTICE =
  "Decision support advisory only; not a medical diagnosis.";

export const BIOMED_CITATIONS = [
  { doc: "NASA-STD-3001_Vol2_RevE", page: 112, topic: "Spacesuit PICO2 and sustained workload limits" },
  { doc: "NASA-STD-3001_Vol2_RevE", page: 45, topic: "Oxygen partial pressure and alveolar hypoxia" },
  { doc: "NASA-STD-3001_Vol1_RevB", page: 19, topic: "EVA physiological monitoring and thermal/fluid strain" },
  { doc: "OCHMO-TB-004_CO2_Hypercapnia", page: 1, topic: "Hypercapnia cognitive thresholds and countermeasures" },
] as const;

export type BiomedAlertLevel = "green" | "amber" | "red";
export type BiomedSubscore = 0 | 1 | 2 | 3;

export interface BiomedInput {
  met_s?: number;
  astronaut: Pick<AstronautSnapshot, "body_kg" | "load_kg" | "speed">;
  suit: Record<string, number>;
  crew_profile?: CrewProfile;
  vitals_window?: VitalsSample[];
}

export interface AxisTrend {
  current: number;
  slope_per_min: number;
  warn_threshold: number;
  crit_threshold: number;
  time_to_breach_s: number | null;
  subscore: BiomedSubscore;
}

export interface BiomedEvaluation {
  advisory_notice: string;
  privacy_mode: CrewProfilePrivacyMode;
  personal_baselines_applied: boolean;
  clamped_fields: string[];
  samples_analyzed: number;
  window_span_s: number;
  ews_total: number;
  ews_level: BiomedAlertLevel;
  ews_subscores: {
    co2: BiomedSubscore;
    thermal: BiomedSubscore;
    hypoxia: BiomedSubscore;
    cardiac: BiomedSubscore;
  };
  min_time_to_breach_s: number | null;
  co2: AxisTrend;
  thermal: AxisTrend & {
    psi: number;
    psi_slope_per_min: number;
    psi_warn_threshold: number;
    psi_crit_threshold: number;
    psi_time_to_breach_s: number | null;
  };
  hypoxia: AxisTrend;
  cardiac: {
    heart_rate_bpm: number;
    metabolic_w: number;
    cardiac_drift_bpm_per_w: number;
    cardiac_drift_slope_per_min: number;
    hr_slope_per_min: number;
    hr_reserve_pct: number;
    hr_warn_threshold: number;
    hr_crit_threshold: number;
    drift_warn_threshold: number;
    drift_crit_threshold: number;
    time_to_breach_s: number | null;
    subscore: BiomedSubscore;
  };
  citations: typeof BIOMED_CITATIONS;
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

const round = (v: number, digits = 3): number => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const isFiniteNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * Computes Physiological Strain Index (Moran et al., 1998) on a 0..10 scale
 * from core temperature (deg C) and heart rate (bpm).
 */
export function computePsi(
  coreTempC: number,
  heartRateBpm: number,
  baselineCoreTempC: number = BIOMED_STANDARDS.core_temp_baseline_c,
  restingHrBpm: number = BIOMED_STANDARDS.hr_resting_bpm,
  maxHrBpm: number = BIOMED_STANDARDS.hr_max_bpm,
): number {
  const tDenom = Math.max(0.5, 39.5 - baselineCoreTempC);
  const hrDenom = Math.max(20, maxHrBpm - restingHrBpm);
  const raw =
    5 * ((coreTempC - baselineCoreTempC) / tDenom) +
    5 * ((heartRateBpm - restingHrBpm) / hrDenom);
  return clamp(raw, 0, 10);
}

/**
 * Estimates arterial SpO2 (%) from alveolar PO2 using the Hill/Severinghaus
 * oxyhemoglobin dissociation approximation when direct pulse-oximetry is absent.
 */
function estimateSpo2FromSuitPressure(suitPressurePa: number): number {
  const pao2Pa = Math.max(0, alveolarPO2(suitPressurePa));
  const pao2MmHg = pao2Pa / 133.322;
  if (pao2MmHg <= 0) return 0;
  const n = 2.7;
  const p50 = 26.8;
  return clamp(100 * (pao2MmHg ** n / (pao2MmHg ** n + p50 ** n)), 0, 100);
}

/** Ordinary least-squares linear slope in units per second over (t_s, value) points. */
function linearSlopePerSec(points: readonly { t: number; v: number }[]): number {
  if (points.length < 2) return 0;
  let sumT = 0;
  let sumV = 0;
  for (const p of points) {
    sumT += p.t;
    sumV += p.v;
  }
  const meanT = sumT / points.length;
  const meanV = sumV / points.length;
  let num = 0;
  let den = 0;
  for (const p of points) {
    const dt = p.t - meanT;
    num += dt * (p.v - meanV);
    den += dt * dt;
  }
  if (den <= 1e-9) return 0;
  return num / den;
}

function timeToUpperBreachS(
  current: number,
  threshold: number,
  slopePerSec: number,
): number | null {
  if (current >= threshold) return 0;
  if (slopePerSec <= 1e-6) return null;
  return round((threshold - current) / slopePerSec, 1);
}

function timeToLowerBreachS(
  current: number,
  threshold: number,
  slopePerSec: number,
): number | null {
  if (current <= threshold) return 0;
  if (slopePerSec >= -1e-6) return null;
  return round((current - threshold) / -slopePerSec, 1);
}

function minFiniteTime(...times: (number | null)[]): number | null {
  let best: number | null = null;
  for (const t of times) {
    if (t === null || !Number.isFinite(t)) continue;
    if (best === null || t < best) best = t;
  }
  return best;
}

function readSuitCo2Pa(suit: Record<string, number>): number {
  if (isFiniteNum(suit.helmet_co2_pa)) return suit.helmet_co2_pa;
  if (isFiniteNum(suit.suit_co2_pa)) return suit.suit_co2_pa;
  if (isFiniteNum(suit.co2_pa)) return suit.co2_pa;
  if (isFiniteNum(suit.helmet_pressure_co2)) return suit.helmet_pressure_co2 * 6894.757;
  if (isFiniteNum(suit.suit_pressure_co2)) return suit.suit_pressure_co2 * 6894.757;
  return 350;
}

/**
 * Evaluates deterministic EVA biomedical trends, time-to-breach, PSI, cardiac drift,
 * and space-adapted composite Early Warning Score with two-tier NASA-STD-3001 clamping.
 */
export function evaluateCrewBiomed(ctx: BiomedInput): BiomedEvaluation {
  const profile = ctx.crew_profile;
  const privacyMode: CrewProfilePrivacyMode =
    profile?.privacy_mode === "anonymized_baselines"
      ? "anonymized_baselines"
      : "standards_only";
  const usePersonal = privacyMode === "anonymized_baselines" && profile !== undefined;
  const clampedFields: string[] = [];

  const restingHr = usePersonal && isFiniteNum(profile.resting_hr_bpm)
    ? clamp(profile.resting_hr_bpm, 40, 100)
    : BIOMED_STANDARDS.hr_resting_bpm;
  const maxHr = usePersonal && isFiniteNum(profile.max_hr_bpm)
    ? clamp(profile.max_hr_bpm, Math.max(140, restingHr + 40), 220)
    : BIOMED_STANDARDS.hr_max_bpm;
  const baseCoreTemp = usePersonal && isFiniteNum(profile.baseline_core_temp_c)
    ? clamp(profile.baseline_core_temp_c, 36.0, 37.5)
    : BIOMED_STANDARDS.core_temp_baseline_c;

  let co2Warn: number = BIOMED_STANDARDS.co2_warn_pa;
  if (usePersonal && isFiniteNum(profile.personal_co2_warn_pa)) {
    if (profile.personal_co2_warn_pa > BIOMED_STANDARDS.co2_warn_pa) {
      clampedFields.push("personal_co2_warn_pa");
    }
    co2Warn = clamp(profile.personal_co2_warn_pa, 200, BIOMED_STANDARDS.co2_warn_pa);
  }

  let coreTempWarn: number = BIOMED_STANDARDS.core_temp_warn_c;
  if (usePersonal && isFiniteNum(profile.personal_core_temp_warn_c)) {
    if (profile.personal_core_temp_warn_c > BIOMED_STANDARDS.core_temp_warn_c) {
      clampedFields.push("personal_core_temp_warn_c");
    }
    coreTempWarn = clamp(profile.personal_core_temp_warn_c, 36.5, BIOMED_STANDARDS.core_temp_warn_c);
  }

  let psiWarn: number = BIOMED_STANDARDS.psi_warn;
  if (usePersonal && isFiniteNum(profile.personal_psi_warn)) {
    if (profile.personal_psi_warn > BIOMED_STANDARDS.psi_warn) {
      clampedFields.push("personal_psi_warn");
    }
    psiWarn = clamp(profile.personal_psi_warn, 2.0, BIOMED_STANDARDS.psi_warn);
  }
  if (usePersonal && isFiniteNum(profile.heat_strain_index) && profile.heat_strain_index > 0) {
    const heatAdjusted = clamp(
      BIOMED_STANDARDS.psi_warn - profile.heat_strain_index * 0.25,
      4.0,
      BIOMED_STANDARDS.psi_warn,
    );
    psiWarn = Math.min(psiWarn, heatAdjusted);
  }

  let spo2Warn: number = BIOMED_STANDARDS.spo2_warn_pct;
  if (usePersonal && isFiniteNum(profile.personal_spo2_warn_pct)) {
    if (profile.personal_spo2_warn_pct < BIOMED_STANDARDS.spo2_warn_pct) {
      clampedFields.push("personal_spo2_warn_pct");
    }
    spo2Warn = clamp(profile.personal_spo2_warn_pct, BIOMED_STANDARDS.spo2_warn_pct, 99.5);
  }

  let hrWarn: number = BIOMED_STANDARDS.hr_warn_bpm;
  if (usePersonal && (isFiniteNum(profile.hr_delta_sigma) || isFiniteNum(profile.max_hr_bpm))) {
    const rawSigma = isFiniteNum(profile.hr_delta_sigma) ? profile.hr_delta_sigma : 2.1;
    if (rawSigma > 2.5) {
      clampedFields.push("hr_delta_sigma");
    }
    const sigmaFactor = clamp(rawSigma / 2.5, 0.65, 1.0);
    const candidateHrWarn = restingHr + 0.8 * (maxHr - restingHr) * sigmaFactor;
    if (candidateHrWarn > BIOMED_STANDARDS.hr_warn_bpm) {
      clampedFields.push("hr_warn_bpm");
    }
    hrWarn = clamp(candidateHrWarn, restingHr + 25, BIOMED_STANDARDS.hr_warn_bpm);
  }

  const fallbackMetabolic = isFiniteNum(ctx.suit.metabolic_w)
    ? Math.max(100, ctx.suit.metabolic_w)
    : metabolicRateW({
        bodyKg: ctx.astronaut.body_kg,
        loadKg: ctx.astronaut.load_kg,
        speed: ctx.astronaut.speed,
        gradePct: 0,
        terrain: 1.3,
      });
  const fallbackSuitPressure = isFiniteNum(ctx.suit.suit_pressure_pa)
    ? ctx.suit.suit_pressure_pa
    : 29600;
  const fallbackCo2 = readSuitCo2Pa(ctx.suit);
  const fallbackCoreTemp = isFiniteNum(ctx.suit.core_temp_c) ? ctx.suit.core_temp_c : baseCoreTemp;
  const fallbackSpo2 = isFiniteNum(ctx.suit.spo2_pct)
    ? clamp(ctx.suit.spo2_pct, 0, 100)
    : estimateSpo2FromSuitPressure(fallbackSuitPressure);
  const fallbackHr = isFiniteNum(ctx.suit.heart_rate)
    ? ctx.suit.heart_rate
    : isFiniteNum(ctx.suit.heart_rate_bpm)
      ? ctx.suit.heart_rate_bpm
      : restingHr + 20;

  const sortedWindow = Array.isArray(ctx.vitals_window)
    ? [...ctx.vitals_window]
        .filter((s) => s && isFiniteNum(s.t_s))
        .sort((a, b) => a.t_s - b.t_s)
    : [];

  const latest = sortedWindow.at(-1);
  const windowSpanS =
    sortedWindow.length >= 2
      ? round(sortedWindow[sortedWindow.length - 1].t_s - sortedWindow[0].t_s, 1)
      : 0;

  const currentCo2 = isFiniteNum(latest?.co2_pa) ? latest.co2_pa : fallbackCo2;
  const currentCoreTemp = isFiniteNum(latest?.core_temp_c) ? latest.core_temp_c : fallbackCoreTemp;
  const currentSuitP = isFiniteNum(latest?.suit_pressure_pa)
    ? latest.suit_pressure_pa
    : fallbackSuitPressure;
  const currentSpo2 = isFiniteNum(latest?.spo2_pct)
    ? clamp(latest.spo2_pct, 0, 100)
    : isFiniteNum(ctx.suit.spo2_pct)
      ? clamp(ctx.suit.spo2_pct, 0, 100)
      : estimateSpo2FromSuitPressure(currentSuitP);
  const currentHr = isFiniteNum(latest?.heart_rate_bpm) ? latest.heart_rate_bpm : fallbackHr;
  const currentMetabolic = isFiniteNum(latest?.metabolic_w)
    ? Math.max(100, latest.metabolic_w)
    : fallbackMetabolic;

  const co2Points = sortedWindow
    .filter((s): s is VitalsSample & { co2_pa: number } => isFiniteNum(s.co2_pa))
    .map((s) => ({ t: s.t_s, v: s.co2_pa }));
  const tempPoints = sortedWindow
    .filter((s): s is VitalsSample & { core_temp_c: number } => isFiniteNum(s.core_temp_c))
    .map((s) => ({ t: s.t_s, v: s.core_temp_c }));
  const spo2Points = sortedWindow
    .filter((s): s is VitalsSample & { spo2_pct: number } => isFiniteNum(s.spo2_pct))
    .map((s) => ({ t: s.t_s, v: s.spo2_pct }));
  const hrPoints = sortedWindow
    .filter((s): s is VitalsSample & { heart_rate_bpm: number } => isFiniteNum(s.heart_rate_bpm))
    .map((s) => ({ t: s.t_s, v: s.heart_rate_bpm }));

  const psiPoints = sortedWindow
    .filter((s) => isFiniteNum(s.core_temp_c) || isFiniteNum(s.heart_rate_bpm))
    .map((s) => ({
      t: s.t_s,
      v: computePsi(
        isFiniteNum(s.core_temp_c) ? s.core_temp_c : currentCoreTemp,
        isFiniteNum(s.heart_rate_bpm) ? s.heart_rate_bpm : currentHr,
        baseCoreTemp,
        restingHr,
        maxHr,
      ),
    }));

  const driftPoints = sortedWindow
    .filter((s): s is VitalsSample & { heart_rate_bpm: number } => isFiniteNum(s.heart_rate_bpm))
    .map((s) => {
      const mw = isFiniteNum(s.metabolic_w) ? Math.max(100, s.metabolic_w) : currentMetabolic;
      return { t: s.t_s, v: s.heart_rate_bpm / mw };
    });

  const co2SlopeS = linearSlopePerSec(co2Points);
  const tempSlopeS = linearSlopePerSec(tempPoints);
  const psiSlopeS = linearSlopePerSec(psiPoints);
  const spo2SlopeS = linearSlopePerSec(spo2Points);
  const hrSlopeS = linearSlopePerSec(hrPoints);
  const driftSlopeS = linearSlopePerSec(driftPoints);

  const currentPsi = computePsi(currentCoreTemp, currentHr, baseCoreTemp, restingHr, maxHr);
  const currentDrift = currentHr / Math.max(100, currentMetabolic);
  const hrReservePct = clamp(
    ((currentHr - restingHr) / Math.max(20, maxHr - restingHr)) * 100,
    0,
    100,
  );

  // Subscores (0..3)
  const co2Subscore: BiomedSubscore =
    currentCo2 >= BIOMED_STANDARDS.co2_crit_pa
      ? 3
      : currentCo2 >= co2Warn
        ? 2
        : currentCo2 > BIOMED_STANDARDS.co2_nominal_pa
          ? 1
          : 0;

  const tempSub: BiomedSubscore =
    currentCoreTemp >= BIOMED_STANDARDS.core_temp_crit_c
      ? 3
      : currentCoreTemp >= coreTempWarn
        ? 2
        : currentCoreTemp >= BIOMED_STANDARDS.core_temp_elevated_c
          ? 1
          : 0;
  const psiSub: BiomedSubscore =
    currentPsi >= BIOMED_STANDARDS.psi_crit
      ? 3
      : currentPsi >= psiWarn
        ? 2
        : currentPsi >= BIOMED_STANDARDS.psi_elevated
          ? 1
          : 0;
  const thermalSubscore = Math.max(tempSub, psiSub) as BiomedSubscore;

  const hypoxiaSubscore: BiomedSubscore =
    currentSpo2 < BIOMED_STANDARDS.spo2_crit_pct
      ? 3
      : currentSpo2 < spo2Warn
        ? 2
        : currentSpo2 < BIOMED_STANDARDS.spo2_nominal_pct
          ? 1
          : 0;

  const cardiacSubscore: BiomedSubscore =
    currentHr >= BIOMED_STANDARDS.hr_crit_bpm ||
    currentDrift >= BIOMED_STANDARDS.cardiac_drift_crit_bpm_per_w ||
    hrReservePct >= 95
      ? 3
      : currentHr >= hrWarn ||
          currentDrift >= BIOMED_STANDARDS.cardiac_drift_warn_bpm_per_w
        ? 2
        : currentHr >= BIOMED_STANDARDS.hr_elevated_bpm ||
            currentDrift >= BIOMED_STANDARDS.cardiac_drift_elevated_bpm_per_w
          ? 1
          : 0;

  const co2BreachS = timeToUpperBreachS(currentCo2, BIOMED_STANDARDS.co2_crit_pa, co2SlopeS);
  const tempBreachS = timeToUpperBreachS(
    currentCoreTemp,
    BIOMED_STANDARDS.core_temp_crit_c,
    tempSlopeS,
  );
  const psiBreachS = timeToUpperBreachS(currentPsi, BIOMED_STANDARDS.psi_crit, psiSlopeS);
  const thermalBreachS = minFiniteTime(tempBreachS, psiBreachS);
  const hypoxiaBreachS = timeToLowerBreachS(
    currentSpo2,
    BIOMED_STANDARDS.spo2_crit_pct,
    spo2SlopeS,
  );
  const hrBreachS = timeToUpperBreachS(currentHr, BIOMED_STANDARDS.hr_crit_bpm, hrSlopeS);
  const driftBreachS = timeToUpperBreachS(
    currentDrift,
    BIOMED_STANDARDS.cardiac_drift_crit_bpm_per_w,
    driftSlopeS,
  );
  const cardiacBreachS = minFiniteTime(hrBreachS, driftBreachS);

  const minTimeToBreachS = minFiniteTime(
    co2BreachS,
    thermalBreachS,
    hypoxiaBreachS,
    cardiacBreachS,
  );

  const ewsTotal = co2Subscore + thermalSubscore + hypoxiaSubscore + cardiacSubscore;
  const maxSub = Math.max(co2Subscore, thermalSubscore, hypoxiaSubscore, cardiacSubscore);

  const ewsLevel: BiomedAlertLevel =
    maxSub >= 3 ||
    ewsTotal >= 7 ||
    (minTimeToBreachS !== null && minTimeToBreachS <= 300)
      ? "red"
      : maxSub >= 2 ||
          ewsTotal >= 4 ||
          (minTimeToBreachS !== null && minTimeToBreachS <= 900)
        ? "amber"
        : "green";

  return {
    advisory_notice: BIOMED_ADVISORY_NOTICE,
    privacy_mode: privacyMode,
    personal_baselines_applied: usePersonal,
    clamped_fields: clampedFields,
    samples_analyzed: sortedWindow.length,
    window_span_s: windowSpanS,
    ews_total: ewsTotal,
    ews_level: ewsLevel,
    ews_subscores: {
      co2: co2Subscore,
      thermal: thermalSubscore,
      hypoxia: hypoxiaSubscore,
      cardiac: cardiacSubscore,
    },
    min_time_to_breach_s: minTimeToBreachS,
    co2: {
      current: round(currentCo2, 1),
      slope_per_min: round(co2SlopeS * 60, 2),
      warn_threshold: round(co2Warn, 1),
      crit_threshold: BIOMED_STANDARDS.co2_crit_pa,
      time_to_breach_s: co2BreachS,
      subscore: co2Subscore,
    },
    thermal: {
      current: round(currentCoreTemp, 2),
      slope_per_min: round(tempSlopeS * 60, 4),
      warn_threshold: round(coreTempWarn, 2),
      crit_threshold: BIOMED_STANDARDS.core_temp_crit_c,
      time_to_breach_s: thermalBreachS,
      subscore: thermalSubscore,
      psi: round(currentPsi, 2),
      psi_slope_per_min: round(psiSlopeS * 60, 3),
      psi_warn_threshold: round(psiWarn, 2),
      psi_crit_threshold: BIOMED_STANDARDS.psi_crit,
      psi_time_to_breach_s: psiBreachS,
    },
    hypoxia: {
      current: round(currentSpo2, 2),
      slope_per_min: round(spo2SlopeS * 60, 3),
      warn_threshold: round(spo2Warn, 2),
      crit_threshold: BIOMED_STANDARDS.spo2_crit_pct,
      time_to_breach_s: hypoxiaBreachS,
      subscore: hypoxiaSubscore,
    },
    cardiac: {
      heart_rate_bpm: round(currentHr, 1),
      metabolic_w: round(currentMetabolic, 1),
      cardiac_drift_bpm_per_w: round(currentDrift, 4),
      cardiac_drift_slope_per_min: round(driftSlopeS * 60, 5),
      hr_slope_per_min: round(hrSlopeS * 60, 2),
      hr_reserve_pct: round(hrReservePct, 1),
      hr_warn_threshold: round(hrWarn, 1),
      hr_crit_threshold: BIOMED_STANDARDS.hr_crit_bpm,
      drift_warn_threshold: BIOMED_STANDARDS.cardiac_drift_warn_bpm_per_w,
      drift_crit_threshold: BIOMED_STANDARDS.cardiac_drift_crit_bpm_per_w,
      time_to_breach_s: cardiacBreachS,
      subscore: cardiacSubscore,
    },
    citations: BIOMED_CITATIONS,
  };
}
