import { C } from "./constants.js";
import { co2LitersPerMin, o2KgPerHour } from "./metabolic.js";
import { dPdt, leakMassFlow } from "./suitLeak.js";

export type SuitMode = "nominal" | "eva" | "emergency" | "standby";

/**
 * Suit life-support state compatible with NASA SUITS telemetry and agent tools.
 * All physical quantities use SI units (kg, Pa, Wh, L, W, s).
 */
export interface SuitState {
  o2_primary_kg: number;
  o2_reserve_kg: number;
  suit_pressure_pa: number;
  co2_pa: number;
  battery_wh: number;
  coolant_l: number;
  metabolic_w: number;
  mode: SuitMode;
  elapsed_s: number;
  o2_primary_pct: number;
  o2_reserve_pct: number;
  battery_pct: number;
  coolant_pct: number;
}

export interface SuitStepInput {
  metabolicW: number;
  leakDiameterM: number;
  mode?: SuitMode;
  dtS?: number;
  tempK?: number;
  maxRegulatorKgS?: number;
  ambientPa?: number;
}

const MODE_AVIONICS_W: Record<SuitMode, number> = {
  standby: 20,
  nominal: 45,
  eva: 55,
  emergency: 75,
};

// Standard enthalpy of water sublimation at ~273-293 K (J/kg) and density (1 kg/L)
const WATER_SUBLIMATION_J_PER_L = 2_830_000;
// Nominal CO2 scrubber clearance rate in Pa/s equivalent at ~400 Pa steady state
const SCRUBBER_BASE_PA_PER_S = 2.5;
// CO2 molar conversion factor in suit free volume (R_co2 = 188.92 J/(kg K), rho_co2 ~ 1.977 g/L at STP)
const CO2_MASS_PER_LITER_KG = 0.001977;
const R_CO2 = 188.92;

/** Initializes a nominal EVA suit state with full consumables. */
export function createInitialSuitState(
  overrides: Partial<SuitState> = {},
): SuitState {
  const base: SuitState = {
    o2_primary_kg: C.suit_o2_primary_kg.value,
    o2_reserve_kg: C.suit_o2_reserve_kg.value,
    suit_pressure_pa: C.suit_p_nominal.value,
    co2_pa: 350,
    battery_wh: C.suit_battery_wh.value,
    coolant_l: C.suit_coolant_l.value,
    metabolic_w: 250,
    mode: "eva",
    elapsed_s: 0,
    o2_primary_pct: 100,
    o2_reserve_pct: 100,
    battery_pct: 100,
    coolant_pct: 100,
    ...overrides,
  };
  return withPercentages(base);
}

function withPercentages(s: SuitState): SuitState {
  return {
    ...s,
    o2_primary_pct: Math.max(
      0,
      Math.min(100, (s.o2_primary_kg / C.suit_o2_primary_kg.value) * 100),
    ),
    o2_reserve_pct: Math.max(
      0,
      Math.min(100, (s.o2_reserve_kg / C.suit_o2_reserve_kg.value) * 100),
    ),
    battery_pct: Math.max(
      0,
      Math.min(100, (s.battery_wh / C.suit_battery_wh.value) * 100),
    ),
    coolant_pct: Math.max(
      0,
      Math.min(100, (s.coolant_l / C.suit_coolant_l.value) * 100),
    ),
  };
}

/**
 * Fixed-step integrator (default 1 Hz) advancing primary O2, reserve O2, suit pressure,
 * CO2 partial pressure, battery energy, and coolant reserve.
 */
export function stepSuitState(
  prev: SuitState,
  input: SuitStepInput,
): SuitState {
  const dt = Math.max(0, input.dtS ?? 1);
  if (dt === 0) return prev;

  const mode = input.mode ?? prev.mode;
  const tempK = input.tempK ?? 293;
  const ambientPa = input.ambientPa ?? 750;
  const metabolicW = Math.max(0, input.metabolicW);
  const leakDiameterM = Math.max(0, input.leakDiameterM);
  const maxRegKgS = input.maxRegulatorKgS ?? 0.00012; // 0.12 g/s SOP regulator cap (design assumption)

  // 1. Metabolic O2 consumption (kg/s) and leak flow (kg/s)
  const metabolicKgS = o2KgPerHour(metabolicW) / 3600;
  const leakKgS = leakMassFlow(prev.suit_pressure_pa, leakDiameterM, tempK);

  // Target regulator makeup attempts to replace metabolic O2 + leak loss up to regulator cap
  const pDeficit = Math.max(0, C.suit_p_nominal.value - prev.suit_pressure_pa);
  const pressurizeDemandKgS =
    (pDeficit * C.suit_volume.value) / (C.R_o2.value * tempK * Math.max(dt, 1));
  const desiredMakeupKgS = Math.min(
    maxRegKgS,
    metabolicKgS + leakKgS + pressurizeDemandKgS,
  );

  // Draw from primary O2 first; switch to reserve O2 if primary depleted or in emergency leak
  let primaryO2 = prev.o2_primary_kg;
  let reserveO2 = prev.o2_reserve_kg;
  const neededO2Kg = desiredMakeupKgS * dt;
  let suppliedO2Kg = 0;

  if (mode === "emergency" && leakDiameterM > 0) {
    const fromReserve = Math.min(reserveO2, neededO2Kg);
    reserveO2 -= fromReserve;
    suppliedO2Kg += fromReserve;
    if (suppliedO2Kg < neededO2Kg) {
      const fromPrimary = Math.min(primaryO2, neededO2Kg - suppliedO2Kg);
      primaryO2 -= fromPrimary;
      suppliedO2Kg += fromPrimary;
    }
  } else {
    const fromPrimary = Math.min(primaryO2, neededO2Kg);
    primaryO2 -= fromPrimary;
    suppliedO2Kg += fromPrimary;
    if (suppliedO2Kg < neededO2Kg) {
      const fromReserve = Math.min(reserveO2, neededO2Kg - suppliedO2Kg);
      reserveO2 -= fromReserve;
      suppliedO2Kg += fromReserve;
    }
  }

  const actualMakeupKgS = suppliedO2Kg / dt;

  // 2. Suit pressure integration using 2-step midpoint (RK2) for accuracy at 1 Hz
  const p1 = prev.suit_pressure_pa;
  const k1 = dPdt(p1, leakDiameterM, actualMakeupKgS, metabolicKgS, tempK);
  const pMid = Math.max(ambientPa, p1 + k1 * (dt * 0.5));
  const k2 = dPdt(pMid, leakDiameterM, actualMakeupKgS, metabolicKgS, tempK);
  const nextPressure = Math.max(ambientPa, p1 + k2 * dt);

  // 3. CO2 partial pressure balance: metabolic production vs powered scrubber removal
  const co2LPerS = co2LitersPerMin(metabolicW) / 60;
  const co2KgS = co2LPerS * CO2_MASS_PER_LITER_KG;
  const co2GenPaS = (co2KgS * R_CO2 * tempK) / C.suit_volume.value;
  const scrubberActive = prev.battery_wh > 0 && mode !== "standby";
  const scrubberRate = scrubberActive
    ? SCRUBBER_BASE_PA_PER_S * (prev.co2_pa / 350)
    : 0;
  const nextCo2 = Math.max(100, prev.co2_pa + (co2GenPaS - scrubberRate) * dt);

  // 4. Battery drain (Wh)
  const avionicsW = MODE_AVIONICS_W[mode];
  const coolingElecW = metabolicW * 0.08;
  const totalElecW = avionicsW + coolingElecW;
  const nextBattery = Math.max(0, prev.battery_wh - (totalElecW * dt) / 3600);

  // 5. Coolant sublimator water consumption (L)
  const heatLoadW = prev.coolant_l > 0 ? metabolicW + avionicsW : 0;
  const nextCoolant = Math.max(
    0,
    prev.coolant_l - (heatLoadW * dt) / WATER_SUBLIMATION_J_PER_L,
  );

  return withPercentages({
    o2_primary_kg: primaryO2,
    o2_reserve_kg: reserveO2,
    suit_pressure_pa: nextPressure,
    co2_pa: nextCo2,
    battery_wh: nextBattery,
    coolant_l: nextCoolant,
    metabolic_w: metabolicW,
    mode,
    elapsed_s: prev.elapsed_s + dt,
    o2_primary_pct: 0,
    o2_reserve_pct: 0,
    battery_pct: 0,
    coolant_pct: 0,
  });
}
