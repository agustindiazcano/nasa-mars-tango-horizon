/**
 * Physical constants and documented design assumptions for Tango Horizon.
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
  pod_mass_kg: {
    value: 8.0,
    unit: "kg",
    source: "Multi-consumable EVA emergency pod total mass (4.0 kg O2 COPV + 1.2 kg LiOH + 1.0 kg battery + 0.35 kg patch + 1.45 kg aeroshell/chute)",
    assumption: true,
  },
  pod_o2_copv_kg: {
    value: 4.0,
    unit: "kg",
    source: "High-pressure O2 COPV assembly (1.00 kg O2 gas + 2.46 kg COPV dry mass at gamma_O2=2.46 + 0.54 kg regulator/umbilical, NASA xPLSS study)",
    assumption: true,
  },
  pod_o2_usable_kg: {
    value: 1.0,
    unit: "kg",
    source: "Usable breathable O2 gas in emergency pod COPV (~3,000 psi / 20.7 MPa)",
    assumption: true,
  },
  pod_co2_scrubber_kg: {
    value: 1.2,
    unit: "kg",
    source: "Single-use emergency LiOH CO2 scrubber cartridge (2-3 h contingency bypass)",
    assumption: true,
  },
  pod_battery_pack_kg: {
    value: 1.0,
    unit: "kg",
    source: "Emergency Li-ion thermal/avionics battery pack (200 Wh at 200 Wh/kg)",
    assumption: true,
  },
  pod_patch_kit_kg: {
    value: 0.35,
    unit: "kg",
    source: "Viscoelastic RTV/HybridSil cure-in-place suit breach patch + Nomex/Kapton mechanical clamp",
    assumption: true,
  },
  pod_aeroshell_chute_kg: {
    value: 1.45,
    unit: "kg",
    source: "Crushable honeycomb aeroshell, drogue/main parachute (cdA=18.0 m^2), and UWB recovery beacon",
    assumption: true,
  },
  pod_chute_cda_m2: {
    value: 18.0,
    unit: "m^2",
    source: "Parachute drag area sizing for 8.0 kg pod (terminal speed ~13.5 m/s <= 15 m/s at rho=0.018 kg/m^3)",
    assumption: true,
  },
  beacon_puck_mass_kg: {
    value: 0.25,
    unit: "kg",
    source: "Non-pyrotechnic solid-state LED/laser + UWB breadcrumb beacon puck (NASA JPL CoSTAR / RTCM 13200.0 eVDSD class)",
    assumption: true,
  },
  beacon_spacing_m: {
    value: 50,
    unit: "m",
    source: "Nominal breadcrumb beacon spacing along emergency return path",
    assumption: true,
  },
  beacon_uwb_freq_ghz: {
    value: 6.5,
    unit: "GHz",
    source: "IEEE 802.15.4z UWB Channel 5 time-of-flight ranging frequency",
  },
  beacon_strobe_hz: {
    value: 1.5,
    unit: "Hz",
    source: "RTCM 13200.0 eVDSD solid-state optical strobe flash rate (505 nm cyan + 615 nm red-orange + 850 nm NIR)",
  },
  beacon_homing_tone_hz: {
    value: 880,
    unit: "Hz",
    source: "Acoustic ILS-style radio-homing pulse frequency in crew headset",
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
