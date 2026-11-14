import { C } from "./constants.js";

export interface WalkInput {
  bodyKg: number;   // astronaut body mass, kg
  loadKg: number;   // suit + tools + samples mass, kg
  speed: number;    // horizontal walking speed, m/s
  gradePct: number; // slope grade in %, negative for downhill
  terrain: number;  // Pandolf terrain factor: 1.0 firm ... 2.1 loose sand
  g?: number;       // local gravity, m/s^2 (defaults to Mars gravity)
}

/**
 * Metabolic rate in Watts using Pandolf et al. (1977) with the Santee et al. (2001)
 * downhill correction factor.
 *
 * Design assumption: weight-bearing terms are scaled by g / g_earth. No experimental
 * validation exists for 0.38 g in a pressurized Mars EVA suit; the Santee downhill
 * correction is calibrated for 1 g terrestrial walking and scaled by the same ratio.
 */
export function metabolicRateW(i: WalkInput): number {
  const k = (i.g ?? C.g_mars.value) / C.g_earth.value;
  const W = i.bodyKg;
  const L = i.loadKg;
  const v = i.speed;
  const G = i.gradePct;
  const n = i.terrain;

  const standing = 1.5 * W; // unscaled: resting metabolic rate does not depend on supported weight
  const loadTerm = 2.0 * (W + L) * (L / W) ** 2 * k;
  const move = n * (W + L) * k * (1.5 * v * v + 0.35 * v * Math.max(G, 0));
  let M = standing + loadTerm + move;

  if (G < 0 && v > 0) {
    // Santee et al. (2001) downhill correction factor CF subtracted from the base Pandolf prediction
    const cf =
      n *
      ((G * (W + L) * k * v) / 3.5 -
        ((W + L) * k * (G + 6) ** 2) / W +
        (25 - v * v));
    M = standing + loadTerm + n * (W + L) * k * (1.5 * v * v + 0.35 * v * G) - cf;
  }

  return Math.max(M, standing);
}

/** Oxygen volumetric uptake at STPD in L/min for a metabolic rate in Watts. */
export const o2LitersPerMin = (watts: number): number =>
  (watts * 60) / C.o2_energy.value;

/** Oxygen mass consumption in kg/h for a metabolic rate in Watts. */
export const o2KgPerHour = (watts: number): number =>
  (o2LitersPerMin(watts) * 60 * C.o2_density.value) / 1000;

/** CO2 production at STPD in L/min using the assumed mixed-diet RQ. */
export const co2LitersPerMin = (watts: number): number =>
  o2LitersPerMin(watts) * C.rq.value;

/**
 * Qualitative THEMIS night-IR thermal class (0 = loose/cold, 1 = intermediate, 2 = bedrock/warm)
 * mapped to Pandolf terrain resistance factor. Design assumption.
 */
export const terrainFromThermalClass = (c: 0 | 1 | 2): number =>
  [2.1, 1.5, 1.1][c];
