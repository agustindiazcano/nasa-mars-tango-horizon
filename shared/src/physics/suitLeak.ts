import { C } from "./constants.js";

const crit = (g: number): number =>
  (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)));

/**
 * Checks whether orifice flow is choked (sonic, Ma = 1).
 * Requires ambient-to-suit pressure ratio below the critical isentropic ratio.
 */
export function isChoked(
  pSuit: number,
  pAmbient: number,
  gamma: number = C.gamma_o2.value,
): boolean {
  if (pSuit <= 0) return false;
  return pAmbient / pSuit < (2 / (gamma + 1)) ** (gamma / (gamma - 1));
}

/** Choked orifice mass flow rate in kg/s. */
export function leakMassFlow(
  pSuit: number,
  holeDiameterM: number,
  tempK = 293,
): number {
  if (pSuit <= 0 || holeDiameterM <= 0) return 0;
  const A = (Math.PI / 4) * holeDiameterM ** 2;
  const g = C.gamma_o2.value;
  return (
    C.discharge_cd.value *
    A *
    pSuit *
    Math.sqrt(g / (C.R_o2.value * tempK)) *
    crit(g)
  );
}

/**
 * Isothermal suit dP/dt in Pa/s.
 * @param makeupKgS Regulator O2 make-up mass flow (kg/s).
 * @param metabolicKgS Astronaut O2 consumption (kg/s).
 */
export function dPdt(
  pSuit: number,
  holeDiameterM: number,
  makeupKgS: number,
  metabolicKgS: number,
  tempK = 293,
): number {
  const out = leakMassFlow(pSuit, holeDiameterM, tempK) + metabolicKgS;
  return ((C.R_o2.value * tempK) / C.suit_volume.value) * (makeupKgS - out);
}

/**
 * Analytical time in seconds to depressurize from p0 to pTarget
 * with zero make-up flow and zero metabolic consumption.
 */
export function timeToPressure(
  p0: number,
  pTarget: number,
  holeDiameterM: number,
  tempK = 293,
): number {
  if (pTarget >= p0) return 0;
  if (holeDiameterM <= 0 || pTarget <= 0) return Infinity;
  const A = (Math.PI / 4) * holeDiameterM ** 2;
  const g = C.gamma_o2.value;
  const tau =
    C.suit_volume.value /
    (C.discharge_cd.value * A * Math.sqrt(g * C.R_o2.value * tempK) * crit(g));
  return tau * Math.log(p0 / pTarget);
}

/** Alveolar O2 partial pressure (Pa) breathing 100% O2: PAO2 = P_suit - PH2O - PaCO2. */
export const alveolarPO2 = (pSuit: number): number =>
  pSuit - C.p_h2o_alv.value - C.p_co2_alv.value;

/** Suit total pressure (Pa) at which alveolar PAO2 reaches the given threshold. */
export const suitPressureForPAO2 = (pao2: number): number =>
  pao2 + C.p_h2o_alv.value + C.p_co2_alv.value;

export interface LeakTimeline {
  toImpairedS: number;
  toCriticalS: number;
  toArmstrongS: number;
}

/** Remaining seconds to cognitive impairment, critical hypoxia, and Armstrong limit. */
export function leakTimeline(
  p0: number,
  holeDiameterM: number,
  tempK = 293,
): LeakTimeline {
  return {
    toImpairedS: timeToPressure(
      p0,
      suitPressureForPAO2(C.pao2_impaired.value),
      holeDiameterM,
      tempK,
    ),
    toCriticalS: timeToPressure(
      p0,
      suitPressureForPAO2(C.pao2_critical.value),
      holeDiameterM,
      tempK,
    ),
    toArmstrongS: timeToPressure(p0, C.p_armstrong.value, holeDiameterM, tempK),
  };
}
