/**
 * NASA SUITS telemetry schema and SI mission suit state types.
 *
 * Raw NASA SUITS fields and units come directly from NASA SUITS-Techteam/TSS_2024
 * (`public/json_data/TELEMETRY.json`, `DCU.json`, `UIA.json`, `ERROR.json`, `IMU.json`,
 * `ROVER.json`, `COMM.json`, `SPEC.json`, and `server_data.h`).
 * Normalized SI fields (`o2_primary_kg`, `suit_pressure_pa`, etc.) are used by the
 * deterministic physics core (`@th/shared`) and backend agents.
 */

/** Raw per-astronaut life-support telemetry from NASA SUITS TSS_2024 (`TELEMETRY.json`). */
export interface SuitsRawTelemetry {
  /** Remaining battery time (seconds, nominal max 21,600 s = 6 h). */
  batt_time_left: number;
  /** Primary O2 storage remaining (% of tank fill, 0-100). */
  oxy_pri_storage: number;
  /** Secondary/reserve O2 storage remaining (% of tank fill, 0-100). */
  oxy_sec_storage: number;
  /** Primary O2 tank pressure (psi, nominal max 3,000 psi). */
  oxy_pri_pressure: number;
  /** Secondary O2 tank pressure (psi, nominal max 3,000 psi). */
  oxy_sec_pressure: number;
  /** Estimated O2 time remaining (seconds, nominal max 10,800 s = 3 h). */
  oxy_time_left: number;
  /** Crew heart rate (beats per minute, resting ~90 bpm, EVA ~140 bpm). */
  heart_rate: number;
  /** Oxygen consumption rate (psi/min in TSS simulation). */
  oxy_consumption: number;
  /** Carbon dioxide production rate (psi/min in TSS simulation). */
  co2_production: number;
  /** Suit oxygen partial pressure (psi, hab ~3.07 psi, EVA ~4.0-4.3 psi). */
  suit_pressure_oxy: number;
  /** Suit CO2 partial pressure (psi, nominal ~0.001-0.0059 psi). */
  suit_pressure_co2: number;
  /** Suit inert/other gas partial pressure (psi, ~11.55 psi in hab, 0 psi in EVA). */
  suit_pressure_other: number;
  /** Total suit internal pressure (psi, ~14.63 psi in hab, ~4.3 psi in EVA). */
  suit_pressure_total: number;
  /** Primary ventilation fan speed (rpm, nominal 30,000 rpm, fault ~5,000 rpm). */
  fan_pri_rpm: number;
  /** Secondary ventilation fan speed (rpm, nominal 30,000 rpm). */
  fan_sec_rpm: number;
  /** Helmet CO2 partial pressure (psi). */
  helmet_pressure_co2: number;
  /** CO2 scrubber canister A saturation (% or fraction 0-100). */
  scrubber_a_co2_storage: number;
  /** CO2 scrubber canister B saturation (% or fraction 0-100). */
  scrubber_b_co2_storage: number;
  /** Suit internal thermal/coolant temperature (deg F, nominal 65-70 F). */
  temperature: number;
  /** Liquid coolant reserve (mL or % fill in TSS). */
  coolant_ml: number;
  /** Coolant loop gas pressure (psi). */
  coolant_gas_pressure: number;
  /** Coolant loop liquid pressure (psi, nominal 500 psi). */
  coolant_liquid_pressure: number;
}

/** Display & Control Unit (DCU) switch states from NASA SUITS TSS_2024 (`DCU.json`). */
export interface SuitsDcuState {
  batt: boolean;
  oxy: boolean;
  comm: boolean;
  fan: boolean;
  pump: boolean;
  co2: boolean;
}

/** Umbilical Interface Assembly (UIA) panel switches from NASA SUITS TSS_2024 (`UIA.json`). */
export interface SuitsUiaState {
  eva1_power: boolean;
  eva1_oxy: boolean;
  eva1_water_supply: boolean;
  eva1_water_waste: boolean;
  eva2_power: boolean;
  eva2_oxy: boolean;
  eva2_water_supply: boolean;
  eva2_water_waste: boolean;
  oxy_vent: boolean;
  depress: boolean;
}

/** Suit subsystem fault flags from NASA SUITS TSS_2024 (`ERROR.json`). */
export interface SuitsErrorFlags {
  fan_error: boolean;
  oxy_error: boolean;
  pump_error: boolean;
  power_error?: boolean;
}

/** Crew Inertial Measurement Unit state from NASA SUITS TSS_2024 (`IMU.json`). */
export interface SuitsImuState {
  /** Local East position (m). */
  posx: number;
  /** Local North position (m). */
  posy: number;
  /** Heading azimuth (deg). */
  heading: number;
}

/** Normalized SI physics & agent suit telemetry merged with NASA SUITS raw fields. */
export interface SuitTelemetry extends SuitsRawTelemetry {
  /** Elapsed EVA mission time (s). */
  eva_time: number;
  /** Primary O2 mass remaining (kg). */
  o2_primary_kg: number;
  /** Reserve O2 mass remaining (kg). */
  o2_reserve_kg: number;
  /** Total internal suit pressure (Pa; nominal 29,600 Pa = 4.3 psi). */
  suit_pressure_pa: number;
  /** Suit internal O2 partial pressure (Pa). */
  suit_o2_pa: number;
  /** Suit CO2 partial pressure (Pa). */
  suit_co2_pa: number;
  /** Helmet CO2 partial pressure (Pa). */
  helmet_co2_pa: number;
  /** Remaining battery energy (Wh). */
  battery_wh: number;
  /** Active battery capacity fraction (0-1). */
  battery_pct: number;
  /** Coolant mass remaining (kg). */
  coolant_kg: number;
  /** Coolant/suit internal temperature (K). */
  suit_temp_k: number;
  /** Metabolic rate (W) from Pandolf model. */
  metabolic_w: number;
  /** Active CO2 scrubber channel ("A" | "B"). */
  active_scrubber: "A" | "B";
  /** Active ventilation fan ("pri" | "sec"). */
  active_fan: "pri" | "sec";
  /** DCU switch states. */
  dcu?: SuitsDcuState;
  /** Suit subsystem fault flags. */
  error?: SuitsErrorFlags;
}

export const SUITS_FIELD_UNITS: Record<keyof SuitsRawTelemetry, string> = {
  batt_time_left: "s",
  oxy_pri_storage: "%",
  oxy_sec_storage: "%",
  oxy_pri_pressure: "psi",
  oxy_sec_pressure: "psi",
  oxy_time_left: "s",
  heart_rate: "bpm",
  oxy_consumption: "psi/min",
  co2_production: "psi/min",
  suit_pressure_oxy: "psi",
  suit_pressure_co2: "psi",
  suit_pressure_other: "psi",
  suit_pressure_total: "psi",
  fan_pri_rpm: "rpm",
  fan_sec_rpm: "rpm",
  helmet_pressure_co2: "psi",
  scrubber_a_co2_storage: "%",
  scrubber_b_co2_storage: "%",
  temperature: "degF",
  coolant_ml: "mL",
  coolant_gas_pressure: "psi",
  coolant_liquid_pressure: "psi",
};
