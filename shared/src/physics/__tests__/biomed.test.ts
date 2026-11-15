import { describe, expect, it } from "vitest";
import {
  BIOMED_ADVISORY_NOTICE,
  BIOMED_STANDARDS,
  computePsi,
  evaluateCrewBiomed,
  type BiomedInput,
} from "../biomed.js";

function makeBaseInput(overrides: Partial<BiomedInput> = {}): BiomedInput {
  return {
    met_s: 1200,
    astronaut: { body_kg: 78, load_kg: 65, speed: 0.8 },
    suit: {
      suit_pressure_pa: 29600,
      suit_co2_pa: 380,
      heart_rate: 95,
      metabolic_w: 260,
      core_temp_c: 37.0,
      spo2_pct: 98,
    },
    ...overrides,
  };
}

describe("evaluateCrewBiomed", () => {
  it("is deterministic and independent of vitals_window ordering", () => {
    const samples = [
      { t_s: 100, co2_pa: 390, core_temp_c: 37.02, spo2_pct: 98.2, heart_rate_bpm: 98, metabolic_w: 260 },
      { t_s: 160, co2_pa: 395, core_temp_c: 37.03, spo2_pct: 98.1, heart_rate_bpm: 99, metabolic_w: 260 },
      { t_s: 220, co2_pa: 392, core_temp_c: 37.02, spo2_pct: 98.2, heart_rate_bpm: 98, metabolic_w: 260 },
    ];
    const a = evaluateCrewBiomed(makeBaseInput({ vitals_window: samples }));
    const b = evaluateCrewBiomed(makeBaseInput({ vitals_window: [samples[2], samples[0], samples[1]] }));
    expect(a).toEqual(b);
    expect(a.advisory_notice).toBe(BIOMED_ADVISORY_NOTICE);
    expect(a.citations.length).toBeGreaterThanOrEqual(3);
    expect(a.ews_level).toBe("green");
  });

  it("computes rising CO2 slope, time_to_breach_s, and red alert within 300 s of 2000 Pa breach", () => {
    // Slope = 5 Pa/s (300 Pa/min). Current at t=120 is 1100 Pa -> (2000 - 1100) / 5 = 180 s
    const samples = [
      { t_s: 0, co2_pa: 500, spo2_pct: 98, core_temp_c: 37.0, heart_rate_bpm: 105, metabolic_w: 300 },
      { t_s: 60, co2_pa: 800, spo2_pct: 98, core_temp_c: 37.0, heart_rate_bpm: 105, metabolic_w: 300 },
      { t_s: 120, co2_pa: 1100, spo2_pct: 98, core_temp_c: 37.0, heart_rate_bpm: 105, metabolic_w: 300 },
    ];
    const res = evaluateCrewBiomed(makeBaseInput({ vitals_window: samples }));
    expect(res.co2.slope_per_min).toBeCloseTo(300, 1);
    expect(res.co2.time_to_breach_s).toBeCloseTo(180, 1);
    expect(res.co2.subscore).toBe(2);
    expect(res.ews_level).toBe("red");
    expect(res.min_time_to_breach_s).toBeCloseTo(180, 1);
  });

  it("computes PSI and thermal strain trajectory accurately", () => {
    const psi = computePsi(38.25, 145, 37.0, 70, 185);
    // 5*(1.25/2.5) + 5*(75/115) = 2.5 + 3.26087 = 5.76
    expect(psi).toBeCloseTo(5.76, 2);

    const samples = [
      { t_s: 0, core_temp_c: 37.4, heart_rate_bpm: 120, metabolic_w: 350, spo2_pct: 98, co2_pa: 400 },
      { t_s: 300, core_temp_c: 37.8, heart_rate_bpm: 138, metabolic_w: 350, spo2_pct: 98, co2_pa: 400 },
      { t_s: 600, core_temp_c: 38.2, heart_rate_bpm: 156, metabolic_w: 350, spo2_pct: 98, co2_pa: 400 },
    ];
    const res = evaluateCrewBiomed(makeBaseInput({ vitals_window: samples }));
    expect(res.thermal.slope_per_min).toBeCloseTo(0.08, 3);
    expect(res.thermal.psi).toBeGreaterThan(6.0);
    expect(res.thermal.time_to_breach_s).toBeGreaterThan(0);
    expect(res.thermal.subscore).toBe(2);
    expect(["amber", "red"]).toContain(res.ews_level);
  });

  it("tracks hypoxia SpO2 descent and falls back to alveolar PO2 estimate when spo2_pct is absent", () => {
    // Slope = -0.01 %/s (-0.6 %/min); current 93% -> (93 - 90) / 0.01 = 300 s
    const samples = [
      { t_s: 0, spo2_pct: 95, co2_pa: 400, core_temp_c: 37.0, heart_rate_bpm: 100, metabolic_w: 260 },
      { t_s: 100, spo2_pct: 94, co2_pa: 400, core_temp_c: 37.0, heart_rate_bpm: 100, metabolic_w: 260 },
      { t_s: 200, spo2_pct: 93, co2_pa: 400, core_temp_c: 37.0, heart_rate_bpm: 100, metabolic_w: 260 },
    ];
    const res = evaluateCrewBiomed(makeBaseInput({ vitals_window: samples }));
    expect(res.hypoxia.slope_per_min).toBeCloseTo(-0.6, 2);
    expect(res.hypoxia.time_to_breach_s).toBeCloseTo(300, 1);
    expect(res.hypoxia.subscore).toBe(2);
    expect(res.ews_level).toBe("red");

    const lowPressure = evaluateCrewBiomed({
      astronaut: { body_kg: 78, load_kg: 65, speed: 0 },
      suit: { suit_pressure_pa: 15500 },
    });
    expect(lowPressure.hypoxia.current).toBeLessThan(80);
    expect(lowPressure.hypoxia.subscore).toBe(3);
    expect(lowPressure.ews_level).toBe("red");
  });

  it("detects cardiac drift (HR / metabolic_w) elevation at constant workload", () => {
    const samples = [
      { t_s: 0, heart_rate_bpm: 105, metabolic_w: 280, co2_pa: 400, core_temp_c: 37.2, spo2_pct: 98 },
      { t_s: 300, heart_rate_bpm: 120, metabolic_w: 280, co2_pa: 400, core_temp_c: 37.3, spo2_pct: 98 },
      { t_s: 600, heart_rate_bpm: 135, metabolic_w: 280, co2_pa: 400, core_temp_c: 37.4, spo2_pct: 98 },
    ];
    const res = evaluateCrewBiomed(makeBaseInput({ vitals_window: samples }));
    expect(res.cardiac.cardiac_drift_bpm_per_w).toBeCloseTo(135 / 280, 3);
    expect(res.cardiac.cardiac_drift_slope_per_min).toBeGreaterThan(0);
    expect(res.cardiac.subscore).toBe(2);
    expect(res.ews_level).toBe("amber");
  });

  it("triggers warn earlier with tighter personal baselines and ignores them in standards_only mode", () => {
    const borderlineWindow = [
      { t_s: 0, co2_pa: 640, spo2_pct: 95.5, core_temp_c: 37.75, heart_rate_bpm: 110, metabolic_w: 300 },
      { t_s: 60, co2_pa: 660, spo2_pct: 95.4, core_temp_c: 37.78, heart_rate_bpm: 112, metabolic_w: 300 },
    ];

    const standardsRes = evaluateCrewBiomed(
      makeBaseInput({
        vitals_window: borderlineWindow,
        crew_profile: {
          privacy_mode: "standards_only",
          personal_co2_warn_pa: 620,
          personal_spo2_warn_pct: 96,
          personal_core_temp_warn_c: 37.7,
        },
      }),
    );
    expect(standardsRes.personal_baselines_applied).toBe(false);
    expect(standardsRes.co2.warn_threshold).toBe(BIOMED_STANDARDS.co2_warn_pa);
    expect(standardsRes.ews_level).toBe("green");

    const personalRes = evaluateCrewBiomed(
      makeBaseInput({
        vitals_window: borderlineWindow,
        crew_profile: {
          privacy_mode: "anonymized_baselines",
          personal_co2_warn_pa: 620,
          personal_spo2_warn_pct: 96,
          personal_core_temp_warn_c: 37.7,
        },
      }),
    );
    expect(personalRes.personal_baselines_applied).toBe(true);
    expect(personalRes.co2.warn_threshold).toBe(620);
    expect(personalRes.hypoxia.warn_threshold).toBe(96);
    expect(personalRes.thermal.warn_threshold).toBe(37.7);
    expect(personalRes.co2.subscore).toBe(2);
    expect(personalRes.hypoxia.subscore).toBe(2);
    expect(personalRes.thermal.subscore).toBe(2);
    expect(personalRes.ews_level).toBe("amber");
  });

  it("clamps any attempt to loosen personal thresholds past NASA-STD-3001 bounds", () => {
    const res = evaluateCrewBiomed(
      makeBaseInput({
        crew_profile: {
          privacy_mode: "anonymized_baselines",
          resting_hr_bpm: 65,
          max_hr_bpm: 205,
          hr_delta_sigma: 4.5,
          personal_co2_warn_pa: 1800,
          personal_core_temp_warn_c: 39.2,
          personal_psi_warn: 8.8,
          personal_spo2_warn_pct: 84,
        },
      }),
    );

    expect(res.co2.warn_threshold).toBe(BIOMED_STANDARDS.co2_warn_pa);
    expect(res.thermal.warn_threshold).toBe(BIOMED_STANDARDS.core_temp_warn_c);
    expect(res.thermal.psi_warn_threshold).toBe(BIOMED_STANDARDS.psi_warn);
    expect(res.hypoxia.warn_threshold).toBe(BIOMED_STANDARDS.spo2_warn_pct);
    expect(res.cardiac.hr_warn_threshold).toBeLessThanOrEqual(BIOMED_STANDARDS.hr_warn_bpm);
    expect(res.clamped_fields).toEqual(
      expect.arrayContaining([
        "personal_co2_warn_pa",
        "personal_core_temp_warn_c",
        "personal_psi_warn",
        "personal_spo2_warn_pct",
        "hr_delta_sigma",
        "hr_warn_bpm",
      ]),
    );
  });
});
