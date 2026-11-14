import { C } from "./constants.js";
import { directTransmission } from "./atmosphere.js";

export interface SolarPanelInput {
  tau: number;             // atmospheric dust optical depth
  mu: number;              // cosine of solar zenith angle (sin(solarElevation))
  areaM2: number;          // photovoltaic array area, m^2
  efficiency: number;      // cell conversion efficiency (0..1)
  toaIrradianceW?: number; // top-of-atmosphere irradiance, W/m^2
}

export interface SolarPowerEstimate {
  powerW: number;
  model: "direct_beam_only";
  label: string;
}

/**
 * Direct-beam solar array output in Watts:
 *   P = I_TOA * exp(-tau / mu) * area * efficiency
 *
 * Direct beam alone underestimates available power under dusty skies because
 * diffuse forward-scattered skylight is omitted. Marked explicitly as "direct beam only".
 */
export function solarPowerW(
  tau: number,
  mu: number,
  areaM2: number,
  efficiency: number,
  toaIrradianceW: number = C.mars_solar_toa.value,
): number {
  if (mu <= 0 || areaM2 <= 0 || efficiency <= 0) return 0;
  return (
    toaIrradianceW *
    directTransmission(tau, mu) *
    areaM2 *
    efficiency
  );
}

/** Structured solar power calculation returning explicit model provenance label. */
export function estimateSolarPower(input: SolarPanelInput): SolarPowerEstimate {
  return {
    powerW: solarPowerW(
      input.tau,
      input.mu,
      input.areaM2,
      input.efficiency,
      input.toaIrradianceW ?? C.mars_solar_toa.value,
    ),
    model: "direct_beam_only",
    label: "direct beam only",
  };
}
