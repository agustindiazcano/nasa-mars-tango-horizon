/**
 * Casson bio-twin: deterministic blood-rheology and hypercapnia estimate from suit telemetry.
 *
 * Casson constitutive law (shear stress tau vs shear rate gamma_dot):
 *
 *   sqrt(tau) = sqrt(tau_y) + sqrt(eta_c * gamma_dot)
 *
 * so the apparent viscosity is
 *
 *   eta_app = tau / gamma_dot = ( sqrt(tau_y / gamma_dot) + sqrt(eta_c) )^2
 *
 * tau_y = yield stress (Pa), eta_c = Casson viscosity (Pa s).
 *
 * Parametrisation (design assumptions, not clinical data):
 *   - tau_y = 0.005 Pa * (Hct / 0.40)^3 * (1 + 0.01 * max(0, PaCO2 - 40))
 *     (red-cell aggregation grows with Hct; acidosis from hypercapnia raises it)
 *   - eta_c = eta_plasma / (1 - Hct)^2.5, eta_plasma = 1.1 mPa s
 *   - Hct = 0.45 + 0.004 * EVA_hours * (metabolic_W / 250)   (sweat haemoconcentration)
 *   - PaCO2 [mmHg] = 40 + 0.9 * helmet pCO2 [mmHg]            (inspired CO2 shifts arterial CO2)
 */

export const PA_PER_MMHG = 133.322;
export const PLASMA_VISCOSITY_PA_S = 0.0011;
export const BASE_HEMATOCRIT = 0.45;
export const BASE_PACO2_MMHG = 40;

export type CassonStatus = "ok" | "warn" | "crit";

export interface CassonInput {
  /** Helmet CO2 partial pressure (Pa). */
  helmetCo2Pa: number;
  /** Metabolic rate (W). */
  metabolicW: number;
  /** Elapsed EVA time (s). */
  evaTimeS: number;
}

export interface CassonTwin {
  hematocrit: number;
  paco2Mmhg: number;
  yieldStressPa: number;
  cassonViscosityPaS: number;
  /** Apparent viscosity (Pa s) at gamma_dot = 100 1/s (arterioles). */
  viscosityHighShearPaS: number;
  /** Apparent viscosity (Pa s) at gamma_dot = 1 1/s (venules / slow flow). */
  viscosityLowShearPaS: number;
  /** High-shear viscosity relative to the baseline (Hct 0.45, PaCO2 40). */
  relativeViscosity: number;
  status: CassonStatus;
}

/** Casson apparent viscosity tau / gamma_dot (Pa s); gamma_dot must be > 0. */
export function cassonApparentViscosity(yieldStressPa: number, cassonViscosityPaS: number, shearRate: number): number {
  if (!(shearRate > 0)) throw new RangeError("shearRate must be > 0");
  const r = Math.sqrt(yieldStressPa / shearRate) + Math.sqrt(cassonViscosityPaS);
  return r * r;
}

/** Shear stress tau (Pa) from the Casson law. */
export function cassonShearStress(yieldStressPa: number, cassonViscosityPaS: number, shearRate: number): number {
  const r = Math.sqrt(yieldStressPa) + Math.sqrt(cassonViscosityPaS * Math.max(0, shearRate));
  return r * r;
}

function rheology(hct: number, paco2: number): { tauY: number; etaC: number } {
  const tauY = 0.005 * Math.pow(hct / 0.4, 3) * (1 + 0.01 * Math.max(0, paco2 - BASE_PACO2_MMHG));
  const etaC = PLASMA_VISCOSITY_PA_S / Math.pow(1 - hct, 2.5);
  return { tauY, etaC };
}

export function estimateCassonTwin(input: CassonInput): CassonTwin {
  const hours = Math.max(0, input.evaTimeS) / 3600;
  const hematocrit = Math.min(0.65, BASE_HEMATOCRIT + 0.004 * hours * (Math.max(0, input.metabolicW) / 250));
  const paco2Mmhg = BASE_PACO2_MMHG + 0.9 * (Math.max(0, input.helmetCo2Pa) / PA_PER_MMHG);
  const { tauY, etaC } = rheology(hematocrit, paco2Mmhg);
  const hi = cassonApparentViscosity(tauY, etaC, 100);
  const lo = cassonApparentViscosity(tauY, etaC, 1);
  const base = rheology(BASE_HEMATOCRIT, BASE_PACO2_MMHG);
  const baseHi = cassonApparentViscosity(base.tauY, base.etaC, 100);
  const status: CassonStatus = paco2Mmhg >= 55 ? "crit" : paco2Mmhg >= 45 ? "warn" : "ok";
  return {
    hematocrit,
    paco2Mmhg,
    yieldStressPa: tauY,
    cassonViscosityPaS: etaC,
    viscosityHighShearPaS: hi,
    viscosityLowShearPaS: lo,
    relativeViscosity: hi / baseHi,
    status,
  };
}
