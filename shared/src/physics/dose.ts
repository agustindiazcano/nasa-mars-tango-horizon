import { C } from "./constants.js";

/**
 * Geometric approximation of radiation dose rate under terrain horizon shielding:
 *   doseRate(baseRate, svf) = baseRate * svf
 *
 * NOTE: This is a purely geometric sky-view-factor approximation. It overstates
 * shielding against high-energy galactic cosmic rays (GCRs), which penetrate
 * substantial rock overburden and produce secondary neutrons in regolith.
 *
 * @param baseRate Unobstructed surface dose rate (e.g., uSv/h or uGy/h).
 * @param svf Sky view factor in [0, 1].
 */
export function doseRate(baseRate: number, svf: number): number {
  const clampedSvf = Math.max(0, Math.min(1, svf));
  return baseRate * clampedSvf;
}

/**
 * Radiation dose rate including Martian regolith secondary neutron albedo backscatter:
 *   baseRate * (svf + beta * (1 - svf))
 * Still a geometric/albedo approximation; overstates shielding against primary GCRs.
 */
export function doseRateWithAlbedo(
  baseRate: number,
  svf: number,
  beta = C.rad_albedo_beta.value,
): number {
  const clampedSvf = Math.max(0, Math.min(1, svf));
  return baseRate * (clampedSvf + beta * (1 - clampedSvf));
}

export interface DoseSegment {
  svf: number;
  dtS: number;
}

export interface RouteDoseSummary {
  timeS: number;
  meanSvf: number;
}

/**
 * Integrates cumulative radiation dose along a route.
 * Assumes `ratePerHour` is in dose-per-hour (e.g., uSv/h or uGy/h) and returns dose
 * in the corresponding cumulative unit (e.g., uSv or uGy).
 */
export function cumulativeDose(
  route: RouteDoseSummary | DoseSegment[],
  ratePerHour: number,
): number {
  if (Array.isArray(route)) {
    let total = 0;
    for (const seg of route) {
      total += (doseRate(ratePerHour, seg.svf) * Math.max(0, seg.dtS)) / 3600;
    }
    return total;
  }
  return (doseRate(ratePerHour, route.meanSvf) * Math.max(0, route.timeS)) / 3600;
}
