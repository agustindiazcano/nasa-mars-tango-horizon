/**
 * Physical constants and documented design assumptions for AEGIS-MARS / Tango Horizon.
 * Every constant carries its authoritative source; `assumption: true` marks an
 * engineering design choice shown as such in the provenance panel.
 */
export interface Const {
  value: number;
  unit: string;
  source: string;
  assumption?: boolean;
}

export const C = {
  g_mars: {
    value: 3.711,
    unit: "m/s^2",
    source: "NASA Mars Fact Sheet (NSSDCA)",
  },
  g_earth: {
    value: 9.80665,
    unit: "m/s^2",
    source: "CODATA",
  },
  R_o2: {
    value: 259.84,
    unit: "J/(kg K)",
    source: "Universal gas constant / O2 molar mass",
  },
  R_mars_atm: {
    value: 191.8,
    unit: "J/(kg K)",
    source: "NASA Mars Fact Sheet, mean molar mass 43.34 g/mol",
  },
  gamma_o2: {
    value: 1.4,
    unit: "-",
    source: "Ideal diatomic gas",
  },
  scale_height: {
    value: 11100,
    unit: "m",
    source: "NASA Mars Fact Sheet",
  },
  o2_energy: {
    value: 20100,
    unit: "J/L",
    source: "Caloric equivalent of O2 at RQ ~0.85",
  },
  o2_density: {
    value: 1.429,
    unit: "g/L",
    source: "O2 density at 0 C and 1 atm (STP)",
  },
  rq: {
    value: 0.85,
    unit: "-",
    source: "Mixed diet respiratory quotient",
    assumption: true,
  },
  p_armstrong: {
    value: 6270,
    unit: "Pa",
    source: "Water vapor pressure at 37 C (47 mmHg)",
  },
  p_h2o_alv: {
    value: 6270,
    unit: "Pa",
    source: "Alveolar water vapor pressure at 37 C",
  },
  p_co2_alv: {
    value: 5330,
    unit: "Pa",
    source: "Normal alveolar PaCO2 (40 mmHg)",
  },
  pao2_impaired: {
    value: 8000,
    unit: "Pa",
    source: "PAO2 ~60 mmHg: onset of cognitive impairment",
    assumption: true,
  },
  pao2_critical: {
    value: 4000,
    unit: "Pa",
    source: "PAO2 ~30 mmHg: loss of consciousness",
    assumption: true,
  },
  suit_p_nominal: {
    value: 29600,
    unit: "Pa",
    source: "4.3 psi, nominal NASA EVA suit pressure (NASA-STD-3001)",
  },
  suit_volume: {
    value: 0.135,
    unit: "m^3",
    source: "Free gas volume inside pressurized suit",
    assumption: true,
  },
  suit_mass: {
    value: 65,
    unit: "kg",
    source: "Martian surface EVA suit mass",
    assumption: true,
  },
  discharge_cd: {
    value: 0.62,
    unit: "-",
    source: "Sharp-edged orifice discharge coefficient",
  },
  mars_solar_toa: {
    value: 589.2,
    unit: "W/m^2",
    source: "NASA Mars Fact Sheet (mean solar irradiance at 1.524 AU)",
  },
  mars_sol_s: {
    value: 88775,
    unit: "s",
    source: "NASA Mars Fact Sheet (mean Martian solar day)",
  },
  rad_gcr_baseline: {
    value: 27.0,
    unit: "uSv/h",
    source: "MSL RAD quiet-time surface dose equivalent rate (Hassler et al., 2014)",
  },
  rad_albedo_beta: {
    value: 0.09,
    unit: "-",
    source: "Martian regolith secondary albedo backscatter factor",
    assumption: true,
  },
  z0_rocky_plain: {
    value: 0.01,
    unit: "m",
    source: "Aerodynamic roughness length for rocky Martian plain",
    assumption: true,
  },
  pod_keepout_m: {
    value: 15,
    unit: "m",
    source: "Minimum safe drop-pod landing keep-out radius around crew",
    assumption: true,
  },
  pod_max_landing_speed_ms: {
    value: 15,
    unit: "m/s",
    source: "Maximum rated impact speed for life-support pod payload",
    assumption: true,
  },
  suit_o2_primary_kg: {
    value: 0.91,
    unit: "kg",
    source: "Nominal EVA primary O2 tank capacity",
    assumption: true,
  },
  suit_o2_reserve_kg: {
    value: 0.54,
    unit: "kg",
    source: "Nominal EVA secondary/SOP O2 reserve capacity",
    assumption: true,
  },
  suit_battery_wh: {
    value: 900,
    unit: "Wh",
    source: "Nominal EVA PLSS battery capacity",
    assumption: true,
  },
  suit_coolant_l: {
    value: 4.5,
    unit: "L",
    source: "Nominal EVA LCVG sublimator feedwater reserve",
    assumption: true,
  },
  suit_co2_limit_pa: {
    value: 1013,
    unit: "Pa",
    source: "Contingency inspired CO2 upper bound (~7.6 mmHg)",
    assumption: true,
  },
  pandolf_mars_scaling: {
    value: 1,
    unit: "-",
    source: "Pandolf-Santee weight terms scaled by g_mars/g_earth; unvalidated at 0.38 g pressurized suit",
    assumption: true,
  },
} as const satisfies Record<string, Const>;
