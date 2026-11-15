import { describe, expect, it } from "vitest";
import {
  evaluateComponentHealth,
  MAX_RUL_S,
  type FdirContext,
} from "../fdir.js";

function baseCtx(overrides: Partial<FdirContext> = {}): FdirContext {
  return {
    met_s: 600,
    suit: {
      fan_pri_rpm: 30_000,
      scrubber_a_co2_storage: 25,
      suit_co2_pa: 350,
      coolant_liquid_pressure: 500,
      suit_temp_k: 293,
    },
    fleet: [
      { id: "rover-1", kind: "rover_crew", battery: 0.85 },
      { id: "manip-1", kind: "manipulator", battery: 0.9 },
    ],
    ...overrides,
  };
}

describe("FDIR deterministic health & RUL engine", () => {
  it("returns nominal and null RUL on clean non-degrading telemetry", () => {
    const ctx = baseCtx({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 30_000, scrubber_a_co2_storage: 24, suit_co2_pa: 340 },
        { t_s: 60, fan_pri_rpm: 30_050, scrubber_a_co2_storage: 24, suit_co2_pa: 345 },
        { t_s: 120, fan_pri_rpm: 30_000, scrubber_a_co2_storage: 24, suit_co2_pa: 340 },
      ],
    });
    const report = evaluateComponentHealth(ctx, "suit");
    expect(report.overall_severity).toBe("nominal");
    expect(report.faults).toHaveLength(0);
    const fan = report.metrics.suit?.find((m) => m.channel === "fan_pri_rpm");
    expect(fan?.slope_per_s).toBe(0);
    expect(fan?.rul_s).toBeNull();
  });

  it("computes exact linear slope, negative z-score, and RUL for degrading PLSS fan while isolating PLSS-FAN-01 from PLSS-SCRUB-01", () => {
    // Drops 10 rpm/s from 30,000 to 25,000 over 500 s -> RUL to 18,000 rpm = 700 s.
    const ctx = baseCtx({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 30_000, scrubber_a_co2_storage: 28, helmet_co2_pa: 580, suit_co2_pa: 420 },
        { t_s: 250, fan_pri_rpm: 27_500, scrubber_a_co2_storage: 28, helmet_co2_pa: 640, suit_co2_pa: 450 },
        { t_s: 500, fan_pri_rpm: 25_000, scrubber_a_co2_storage: 28, helmet_co2_pa: 710, suit_co2_pa: 480 },
      ],
    });
    const report = evaluateComponentHealth(ctx, "suit");
    expect(report.overall_severity).toBe("degraded");
    expect(report.active_fault_codes).toEqual(["PLSS-FAN-01"]);

    const fanFault = report.faults[0];
    expect(fanFault.slope_per_s).toBeCloseTo(-10, 4);
    expect(fanFault.z_score).toBeCloseTo(-10, 1);
    expect(fanFault.rul_s).toBeCloseTo(700, 1);
    expect(report.active_fault_codes).not.toContain("PLSS-SCRUB-01");
  });

  it("isolates PLSS-SCRUB-01 from PLSS-FAN-01 when scrubber saturates under nominal fan RPM", () => {
    const ctx = baseCtx({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 30_000, scrubber_a_co2_storage: 80, suit_co2_pa: 700 },
        { t_s: 100, fan_pri_rpm: 29_950, scrubber_a_co2_storage: 90, suit_co2_pa: 1050 },
        { t_s: 200, fan_pri_rpm: 30_000, scrubber_a_co2_storage: 96, suit_co2_pa: 1400 },
      ],
    });
    const report = evaluateComponentHealth(ctx, "suit");
    expect(report.overall_severity).toBe("critical");
    expect(report.active_fault_codes).toEqual(["PLSS-SCRUB-01"]);
    expect(report.faults[0].rul_s).toBe(0);
    expect(report.faults[0].recommended_action).toBe("switch_redundant");
  });

  it("clamps slow-drift RUL to MAX_RUL_S and breached thresholds to 0", () => {
    // Very slow drop of 0.06 rpm/s from 29,900 -> raw RUL ~198,333 s -> clamped to MAX_RUL_S (86,400 s).
    const slowCtx = baseCtx({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 29_960 },
        { t_s: 1000, fan_pri_rpm: 29_900 },
      ],
    });
    const slowReport = evaluateComponentHealth(slowCtx, "suit");
    const slowMetric = slowReport.metrics.suit?.find((m) => m.channel === "fan_pri_rpm");
    expect(slowMetric?.rul_s).toBe(MAX_RUL_S);
    expect(slowMetric?.status).toBe("nominal");

    // Critical coolant loss below 200 mL clamps rul_s to 0.
    const breachCtx = baseCtx({
      suit_window: [
        { t_s: 0, coolant_ml: 350, coolant_liquid_pressure: 340 },
        { t_s: 100, coolant_ml: 180, coolant_liquid_pressure: 220 },
      ],
    });
    const breachReport = evaluateComponentHealth(breachCtx, "suit");
    expect(breachReport.active_fault_codes).toContain("PLSS-COOL-01");
    const coolFault = breachReport.faults.find((f) => f.fault_code === "PLSS-COOL-01");
    expect(coolFault?.severity).toBe("critical");
    expect(coolFault?.rul_s).toBe(0);
  });

  it("distinguishes RVR-MOB-01 wheel sinkage vs wheel stall and isolates ARM-TORQ-01", () => {
    const sinkageCtx = baseCtx({
      fleet_windows: {
        "rover-1": [
          { t_s: 0, slip_ratio: 0.25, motor_current_a: 5.0, actuator_temp_c: 32 },
          { t_s: 60, slip_ratio: 0.45, motor_current_a: 5.5, actuator_temp_c: 34 },
          { t_s: 120, slip_ratio: 0.65, motor_current_a: 6.0, actuator_temp_c: 35 },
        ],
      },
    });
    const sinkage = evaluateComponentHealth(sinkageCtx, "fleet", "rover-1");
    expect(sinkage.active_fault_codes).toEqual(["RVR-MOB-01"]);
    expect(sinkage.faults[0].signature).toBe("wheel_sinkage");
    expect(sinkage.faults[0].severity).toBe("critical");

    const stallCtx = baseCtx({
      fleet_windows: {
        "rover-1": [
          { t_s: 0, slip_ratio: 0.05, motor_current_a: 10.0, actuator_temp_c: 35 },
          { t_s: 60, slip_ratio: 0.04, motor_current_a: 15.0, actuator_temp_c: 35 },
          { t_s: 120, slip_ratio: 0.03, motor_current_a: 19.5, actuator_temp_c: 36 },
        ],
      },
    });
    const stall = evaluateComponentHealth(stallCtx, "fleet", "rover-1");
    expect(stall.active_fault_codes).toEqual(["RVR-MOB-01"]);
    expect(stall.faults[0].signature).toBe("wheel_stall");

    const manipCtx = baseCtx({
      fleet_health: {
        "manip-1": { drill_torque_nm: 48, motor_current_a: 19, actuator_temp_c: 88 },
      },
    });
    const manip = evaluateComponentHealth(manipCtx, "fleet", "manip-1");
    expect(manip.active_fault_codes).toContain("ARM-TORQ-01");
    expect(manip.active_fault_codes).toContain("RVR-THM-01");
    expect(manip.active_fault_codes).not.toContain("RVR-MOB-01");
  });

  it("flags predictive degraded warning from slope + z-score before static degraded threshold", () => {
    // Still above 26,000 rpm static degraded floor, but z = -6 and RUL = 900 s (< 3600 s).
    const ctx = baseCtx({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 30_000 },
        { t_s: 150, fan_pri_rpm: 28_500 },
        { t_s: 300, fan_pri_rpm: 27_000 },
      ],
    });
    const report = evaluateComponentHealth(ctx, "suit");
    expect(report.overall_severity).toBe("degraded");
    expect(report.active_fault_codes).toEqual(["PLSS-FAN-01"]);
    expect(report.faults[0].rul_s).toBeCloseTo(900, 1);
  });

  it("evaluates HAB-PWR-01 and ISRU-MOX-01 from power_isru_window", () => {
    const ctx = baseCtx({
      power_isru_window: [
        { t_s: 0, solar_dust_factor: 0.6, hab_bus_v: 26.2, moxie_compressor_a: 7.5, moxie_soxe_asr: 1.2 },
        { t_s: 120, solar_dust_factor: 0.48, hab_bus_v: 25.1, moxie_compressor_a: 12.4, moxie_soxe_asr: 1.7 },
      ],
    });
    const report = evaluateComponentHealth(ctx, "power_isru");
    expect(report.active_fault_codes).toContain("HAB-PWR-01");
    expect(report.active_fault_codes).toContain("ISRU-MOX-01");
    expect(report.faults.find((f) => f.fault_code === "ISRU-MOX-01")?.severity).toBe("critical");
  });
});
