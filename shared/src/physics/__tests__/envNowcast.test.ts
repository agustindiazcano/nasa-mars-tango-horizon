import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeEnvGradients,
  evaluateFlightEnvelope,
  predictEnvironmentalRisk,
} from "../envNowcast.js";
import { DEFAULT_STORM_LIMITS, ENV_LIMITS } from "../stormDecision.js";
import type { EnvTelemetrySample } from "../../types/mission.js";

interface RemsStormJson {
  hours: number[];
  tau: number[];
  pressure_pa: number[];
  air_temp_k: number[];
  ground_temp_k: number[];
}

function loadRemsStormWindow(startIdx: number, endIdx: number): EnvTelemetrySample[] {
  const filePath = path.resolve(process.cwd(), "web/public/data/env/rems_storm2018.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as RemsStormJson;
  const out: EnvTelemetrySample[] = [];
  for (let i = startIdx; i < endIdx && i < raw.hours.length; i++) {
    out.push({
      t_s: raw.hours[i] * 3600,
      pressure_pa: raw.pressure_pa[i],
      air_temp_k: raw.air_temp_k[i],
      ground_temp_k: raw.ground_temp_k[i],
      tau: raw.tau[i],
      wind_ms: 8.5,
      dose_rate_ugy_h: 11.2,
      sun_elev_deg: 45,
    });
  }
  return out;
}

describe("ENV_LIMITS single source of truth", () => {
  it("exposes unified environmental thresholds shared with DEFAULT_STORM_LIMITS", () => {
    expect(DEFAULT_STORM_LIMITS).toBe(ENV_LIMITS);
    expect(ENV_LIMITS.tauVisibility).toBe(1.5);
    expect(ENV_LIMITS.tauAbort).toBe(2.5);
    expect(ENV_LIMITS.tauDroneGrounding).toBe(1.8);
    expect(ENV_LIMITS.maxFlightWindMs).toBe(15);
    expect(ENV_LIMITS.minFlightDensityKgM3).toBe(0.012);
    expect(ENV_LIMITS.minPowerMarginW).toBe(500);
    expect(ENV_LIMITS.sepDoseWarnUgyH).toBe(25);
    expect(ENV_LIMITS.sepDoseAbortUgyH).toBe(80);
  });
});

describe("computeEnvGradients and 2018 REMS storm nowcast", () => {
  it("computes positive dtau_dt_per_h and finite storm ETAs on the 2018 REMS storm ramp", () => {
    // Hours 96..108 of rems_storm2018.json: tau climbs from 0.858 toward 1.448 before crossing 1.5
    const window = loadRemsStormWindow(96, 109);
    const latest = window[window.length - 1];
    const grad = computeEnvGradients(window);

    expect(grad.sample_count).toBe(13);
    expect(grad.dtau_dt_per_h).toBeGreaterThan(0.04);
    expect(grad.diurnal_air_swing_k).toBeGreaterThan(20);
    expect(grad.air_density_kg_m3).toBeGreaterThan(0.012);

    const risk = predictEnvironmentalRisk({
      env: {
        pressure_pa: latest.pressure_pa,
        air_temp_k: latest.air_temp_k,
        tau: latest.tau,
        wind_ms: latest.wind_ms,
        dose_rate_ugy_h: latest.dose_rate_ugy_h,
        sun_elev_deg: 45,
      },
      env_window: window,
      base_battery_wh: 420000,
      plan: { durationS: 7200, returnToShelterS: 1500 },
    });

    expect(risk.gradients.dtau_dt_per_h).toBeGreaterThan(0);
    expect(risk.time_to_storm_onset_s).not.toBeNull();
    expect(risk.time_to_storm_onset_s!).toBeGreaterThan(0);
    expect(risk.time_to_storm_onset_s!).toBeLessThan(7200);
    expect(risk.visibility_abort_eta_s).not.toBeNull();
    expect(risk.visibility_abort_eta_s!).toBeGreaterThan(risk.time_to_storm_onset_s!);
    expect(risk.recommended_maneuvers).toContain("shorten_eva");
    expect(risk.recommended_maneuvers).toContain("deploy_beacons");
    expect(risk.verdict).toBe("go_with_changes");
  });

  it("drops solar power margin and battery_autonomy_s as optical depth tau rises", () => {
    const baseInput = {
      env: {
        pressure_pa: 750,
        air_temp_k: 220,
        tau: 0.4,
        wind_ms: 5,
        dose_rate_ugy_h: 10,
        sun_elev_deg: 45,
        solar_area_m2: 400,
        solar_efficiency: 0.22,
        solar_demand_w: 18000,
      },
      base_battery_wh: 420000,
    };

    const clearRisk = predictEnvironmentalRisk(baseInput);
    const moderateStorm = predictEnvironmentalRisk({
      ...baseInput,
      env: { ...baseInput.env, tau: 1.5 },
    });
    const heavyStorm = predictEnvironmentalRisk({
      ...baseInput,
      env: { ...baseInput.env, tau: 3.2 },
    });

    expect(clearRisk.power_margin_w).toBeGreaterThan(0);
    expect(clearRisk.battery_autonomy_s).toBeNull();
    expect(moderateStorm.power_margin_w).toBeLessThan(0);
    expect(moderateStorm.time_to_zero_solar_margin_s).toBe(0);
    expect(moderateStorm.battery_autonomy_s).not.toBeNull();
    expect(heavyStorm.battery_autonomy_s).not.toBeNull();
    expect(heavyStorm.battery_autonomy_s!).toBeLessThan(moderateStorm.battery_autonomy_s!);
    expect(heavyStorm.recommended_maneuvers).toContain("charge_batteries");
    expect(heavyStorm.recommended_maneuvers).toContain("switch_to_fission");
  });

  it("computes rising RAD slope, projected EVA dose with SVF shielding, and aircraft envelope limits", () => {
    const sepWindow: EnvTelemetrySample[] = [
      { t_s: 0, pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 20, sun_elev_deg: 45 },
      { t_s: 1800, pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 40, sun_elev_deg: 45 },
      { t_s: 3600, pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 60, sun_elev_deg: 45 },
    ];

    const openRisk = predictEnvironmentalRisk({
      env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 60 },
      env_window: sepWindow,
      donki_alert: { active_sep: true, wsa_enlil_mars_arrival_h: 2.5, source_id: "DONKI-SEP-TEST" },
      plan: { durationS: 3600, returnToShelterS: 0 },
      svf: 1.0,
    });
    const shelteredRisk = predictEnvironmentalRisk({
      env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 60 },
      env_window: sepWindow,
      donki_alert: { active_sep: true, wsa_enlil_mars_arrival_h: 2.5, source_id: "DONKI-SEP-TEST" },
      plan: { durationS: 3600, returnToShelterS: 0 },
      svf: 0.35,
    });

    expect(openRisk.gradients.ddose_dt_ugy_h2).toBeCloseTo(40, 2);
    expect(openRisk.projected_eva_dose_ugy).toBeCloseTo(80, 1);
    expect(shelteredRisk.projected_eva_dose_ugy).toBeLessThan(openRisk.projected_eva_dose_ugy);
    expect(openRisk.verdict).toBe("no_go");
    expect(openRisk.recommended_maneuvers).toContain("seek_shelter");

    const thinAir = evaluateFlightEnvelope({
      tau: 0.4,
      wind_ms: 5,
      pressure_pa: 500,
      air_temp_k: 260,
    });
    expect(thinAir.flyable).toBe(false);
    expect(thinAir.density_ok).toBe(false);
  });
});
