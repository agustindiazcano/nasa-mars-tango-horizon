import { C } from "./constants.js";
import { co2LitersPerMin, o2KgPerHour } from "./metabolic.js";
import { alveolarPO2, dPdt } from "./suitLeak.js";

/** Real-time EVA simulation suit telemetry state (SI units). */
export interface SimSuitTelemetry {
  o2_primary_kg: number;
  o2_primary_cap_kg: number;
  o2_reserve_kg: number;
  o2_reserve_cap_kg: number;
  suit_pressure_pa: number;
  pao2_pa: number;
  co2_pa: number;
  battery_wh: number;
  battery_cap_wh: number;
  coolant_l: number;
  coolant_cap_l: number;
  metabolic_w: number;
  heart_rate_bpm: number;
  fan_rpm: number;
  body_temp_c: number;
  cumulative_dose_ugy: number;
}

/**
 * Advances real-time EVA suit telemetry by `dt` seconds using choked orifice
 * leak dynamics, Pandolf O2/CO2 metabolism, PLSS power/coolant draw, and radiation dose.
 */
export function stepSuitTelemetry(
  suit: SimSuitTelemetry,
  dt: number,
  metabolicW: number,
  leakDiameterM: number,
  doseRateUgyH: number,
  svf: number,
  fanDegraded = false,
): SimSuitTelemetry {
  const o2RateKgS = o2KgPerHour(metabolicW) / 3600;
  let o2Prim = suit.o2_primary_kg;
  let o2Res = suit.o2_reserve_kg;
  let pressure = suit.suit_pressure_pa;

  if (leakDiameterM > 0) {
    // Regulator feeds up to 0.0005 kg/s from reserve while reserve lasts; orifice leak drains pressure.
    const maxRegKgS = 0.0005;
    const desiredMakeup = pressure < C.suit_p_nominal.value ? maxRegKgS : o2RateKgS;
    let makeup = 0;
    if (o2Res > 0) {
      makeup = Math.min(desiredMakeup, o2Res / Math.max(dt, 1e-3));
      o2Res = Math.max(0, o2Res - makeup * dt);
    } else if (o2Prim > 0) {
      makeup = Math.min(o2RateKgS, o2Prim / Math.max(dt, 1e-3));
      o2Prim = Math.max(0, o2Prim - makeup * dt);
    }
    const slope = dPdt(pressure, leakDiameterM, makeup, o2RateKgS, 293);
    pressure = Math.max(750, Math.min(C.suit_p_nominal.value, pressure + slope * dt));
  } else {
    if (o2Prim > 0) {
      o2Prim = Math.max(0, o2Prim - o2RateKgS * dt);
    } else if (o2Res > 0) {
      o2Res = Math.max(0, o2Res - o2RateKgS * dt);
    }
    if (pressure < C.suit_p_nominal.value) {
      pressure = Math.min(C.suit_p_nominal.value, pressure + 250 * dt);
    }
  }

  const co2ProdKgS = (co2LitersPerMin(metabolicW) / 60) * 0.001977;
  const scrubRate = fanDegraded ? 0.55 : 1.02;
  const co2Delta = co2ProdKgS * (1 - scrubRate) * 28000 * dt;
  const co2Pa = Math.max(120, Math.min(3500, suit.co2_pa + co2Delta + (fanDegraded ? 18 * dt : -8 * dt)));

  const suitPowerW = 135 + (metabolicW - 180) * 0.15;
  const batteryWh = Math.max(0, suit.battery_wh - (suitPowerW * dt) / 3600);
  const coolantL = Math.max(0, suit.coolant_l - metabolicW * 0.000012 * dt);
  const targetHr = 68 + (metabolicW - 110) * 0.18 + (leakDiameterM > 0 ? 35 : 0);
  const hr = suit.heart_rate_bpm + (targetHr - suit.heart_rate_bpm) * Math.min(1, dt * 1.5);
  const targetFan = fanDegraded ? 18200 : 28400;
  const fanRpm = suit.fan_rpm + (targetFan - suit.fan_rpm) * Math.min(1, dt * 2.0);
  const dose = suit.cumulative_dose_ugy + (doseRateUgyH * svf * dt) / 3600;

  return {
    ...suit,
    o2_primary_kg: o2Prim,
    o2_reserve_kg: o2Res,
    suit_pressure_pa: pressure,
    pao2_pa: Math.max(0, alveolarPO2(pressure)),
    co2_pa: co2Pa,
    battery_wh: batteryWh,
    coolant_l: coolantL,
    metabolic_w: metabolicW,
    heart_rate_bpm: hr,
    fan_rpm: fanRpm,
    body_temp_c: 36.8 + Math.max(0, (metabolicW - 220) * 0.002),
    cumulative_dose_ugy: dose,
  };
}
