import { C } from "./constants.js";

/** Surface atmospheric density (kg/m^3) from REMS pressure (Pa) and temperature (K). */
export const surfaceDensity = (pPa: number, tK: number): number =>
  pPa / (C.R_mars_atm.value * tK);

/** Exponential atmospheric density at height hM (m) above local ground. */
export const densityAt = (rho0: number, hM: number): number =>
  rho0 * Math.exp(-hM / C.scale_height.value);

/**
 * Logarithmic wind shear profile (m/s).
 * @param hM Height above local ground (m).
 * @param refSpeed Reference wind speed at refH (m/s).
 * @param refH Reference sensor height (m, default 1.6 m REMS boom).
 * @param z0 Surface roughness length (m, default 0.01 m rocky plain; design assumption).
 */
export function windAt(
  hM: number,
  refSpeed: number,
  refH = 1.6,
  z0: number = C.z0_rocky_plain.value,
): number {
  if (hM <= z0) return 0;
  return (refSpeed * Math.log(hM / z0)) / Math.log(refH / z0);
}

/** Direct-beam solar transmission exp(-tau / mu) for opacity tau and cosine of zenith angle mu. */
export const directTransmission = (tau: number, mu: number): number =>
  mu <= 0 ? 0 : Math.exp(-Math.max(0, tau) / mu);
