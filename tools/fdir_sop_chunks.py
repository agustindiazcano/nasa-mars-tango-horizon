"""Curated NASA/JPL aerospace FDIR SOP chunks tagged with canonical fault_codes."""

from __future__ import annotations

FDIR_SOP_CHUNKS: list[dict[str, object]] = [
    {
        "doc": "NTRS_20150003027_EMU_FPS_FDIR",
        "page": 1,
        "fault_codes": ["PLSS-FAN-01"],
        "text": (
            "EMU Fan-Pump-Separator (FPS) FDIR SOP [PLSS-FAN-01]: Nominal PLSS ventilation fan "
            "operates near 30,000 rpm with >= 850 Pa loop delta-P. A sustained downward RPM slope "
            "below 26,000 rpm or delta-P below 650 Pa indicates bearing drag, free-water carryover, "
            "or rotor fouling. Reduce crew metabolic workload (derate) and monitor helmet ppCO2."
        ),
    },
    {
        "doc": "NTRS_20150003027_EMU_FPS_FDIR",
        "page": 2,
        "fault_codes": ["PLSS-FAN-01"],
        "text": (
            "PLSS Redundant Fan Switchover Procedure [PLSS-FAN-01]: When primary fan speed drops "
            "to or below 18,000 rpm or loop delta-P falls below 400 Pa (critical stall), immediately "
            "command switch_redundant to engage the secondary ventilation fan (fan_sec), verify "
            "helmet CO2 washout < 530 Pa, and initiate EVA return-to-airlock."
        ),
    },
    {
        "doc": "NTRS_20170009505_xEMU_PLSS_CWS",
        "page": 1,
        "fault_codes": ["PLSS-SCRUB-01"],
        "text": (
            "xEMU/Mars PLSS Caution and Warning System CO2 Scrubber SOP [PLSS-SCRUB-01]: "
            "Monitor active CO2 scrubber bed saturation and suit ppCO2 against NASA-STD-3001 V2 "
            "11039 (indefinite <= 4.0 mmHg / 533 Pa, DNE 15.0 mmHg / 2,000 Pa). At >= 75% canister "
            "saturation or suit ppCO2 >= 600 Pa with nominal fan RPM, derate metabolic work rate."
        ),
    },
    {
        "doc": "NTRS_20170009505_xEMU_PLSS_CWS",
        "page": 2,
        "fault_codes": ["PLSS-SCRUB-01"],
        "text": (
            "PLSS Scrubber Breakthrough Switchover SOP [PLSS-SCRUB-01]: When active CO2 scrubber "
            "saturation reaches >= 95% or suit ppCO2 reaches >= 1,333 Pa (10 mmHg), execute "
            "switch_redundant to isolate canister A and engage backup scrubber B (or swing-bed "
            "regeneration cycle). Abort EVA if backup canister breakthrough occurs."
        ),
    },
    {
        "doc": "NTRS_20260005404_Mars_PLSS_FDIR",
        "page": 1,
        "fault_codes": ["PLSS-COOL-01"],
        "text": (
            "Mars PLSS Thermal and Coolant Loop (SWME/LCVG) FDIR SOP [PLSS-COOL-01]: Nominal "
            "coolant loop liquid pressure is 500 psi with suit temperature ~293 K. Pressure below "
            "350 psi, feedwater < 400 mL, or suit temperature >= 301 K indicates sublimator dryout, "
            "pump cavitation, or loop leak. Reduce metabolic heat load (derate) immediately."
        ),
    },
    {
        "doc": "NTRS_20260005404_Mars_PLSS_FDIR",
        "page": 2,
        "fault_codes": ["PLSS-COOL-01"],
        "text": (
            "PLSS Critical Coolant Loss and Battery Thermal SOP [PLSS-COOL-01]: If coolant pressure "
            "drops <= 250 psi, coolant reserve <= 200 mL, suit temperature >= 306 K, or PLSS "
            "battery temperature >= 52 C, execute safe_halt of high-power avionics/sublimator pump "
            "and direct crew to nearest pressurized rover or habitat airlock."
        ),
    },
    {
        "doc": "JPL_ROB-20-0040_Rover_Mobility_FDIR",
        "page": 1,
        "fault_codes": ["RVR-MOB-01"],
        "text": (
            "Mars Rover Visual-Odometry Slip-Sinkage Recovery SOP [RVR-MOB-01]: Elevated wheel "
            "slip_ratio (>= 0.35 degraded, >= 0.60 critical) paired with nominal drive motor current "
            "(< 12 A) identifies regolith wheel sinkage rather than mechanical jam. Derate wheel "
            "speed, halt forward excavation, and execute short reverse or crab extraction to firm soil."
        ),
    },
    {
        "doc": "JPL_ROB-20-0040_Rover_Mobility_FDIR",
        "page": 2,
        "fault_codes": ["RVR-MOB-01"],
        "text": (
            "Mars Rover Wheel-Drive Stall and Overcurrent Recovery SOP [RVR-MOB-01]: Sustained "
            "motor_current_a >= 12 A (degraded) or >= 18 A (critical) with low slip_ratio (< 0.20) "
            "indicates a locked rotor or rock-wedged wheel. Immediately command safe_halt to prevent "
            "actuator winding burnout and quarantine the unit until mobility diagnostics pass."
        ),
    },
    {
        "doc": "JPL_2025_RO_Ops_Thermal_Arm_FDIR",
        "page": 1,
        "fault_codes": ["RVR-THM-01"],
        "text": (
            "Mars Rover and Manipulator Actuator Thermal FDIR SOP [RVR-THM-01]: Joint and wheel "
            "actuator temperatures >= 65 C require duty-cycle derating and pause intervals between "
            "traverse legs. At critical actuator_temp_c >= 85 C, command safe_halt, inhibit "
            "dispatch and arm skills, and allow passive radiative thermal soak below 55 C."
        ),
    },
    {
        "doc": "JPL_2025_RO_Ops_Thermal_Arm_FDIR",
        "page": 2,
        "fault_codes": ["ARM-TORQ-01"],
        "text": (
            "Manipulator Arm Over-Torque and Drill Stow SOP [ARM-TORQ-01]: During manip-1 drill or "
            "sample operations, drill_torque_nm >= 30 Nm (degraded) requires feed-force derating. "
            "At critical drill_torque_nm >= 45 Nm or arm motor current >= 18 A, immediately inhibit "
            "drill/sample/handover skills, execute safe_halt, reverse spindle, and stow the arm."
        ),
    },
    {
        "doc": "NTRS_20240008876_Hab_Power_Battery_FDIR",
        "page": 1,
        "fault_codes": ["HAB-PWR-01"],
        "text": (
            "Habitat Solar Dust Fouling and Bus Undervoltage SOP [HAB-PWR-01]: When solar_dust_factor "
            "falls below 0.55 or 28 V habitat bus voltage sags below 25.5 V (critical <= 24.0 V), "
            "execute power derate by shedding non-essential ISRU and rover charging loads to "
            "preserve life-support ECLSS bus margin."
        ),
    },
    {
        "doc": "NTRS_20240008876_Hab_Power_Battery_FDIR",
        "page": 2,
        "fault_codes": ["HAB-PWR-01"],
        "text": (
            "Habitat Li-Ion Battery Thermal-Coupled FDIR SOP [HAB-PWR-01]: Thermal-coupled battery "
            "health monitoring flags hab_battery_temp_c >= 42 C as degraded charge-rate fault and "
            ">= 52 C as critical thermal runaway precursor. Command safe_halt on high-rate charge "
            "buses and isolate the affected battery string."
        ),
    },
    {
        "doc": "NASA_MOXIE_ISRU_FDIR",
        "page": 1,
        "fault_codes": ["ISRU-MOX-01"],
        "text": (
            "MOXIE Scroll Compressor and Dust Filter FDIR SOP [ISRU-MOX-01]: Rising scroll "
            "compressor current (>= 8.5 A degraded, >= 12.0 A critical) accompanied by dropping O2 "
            "production (< 4.5 g/h) indicates HEPA inlet dust loading or scroll stall. Derate "
            "compressor RPM or command safe_halt before motor thermal trip."
        ),
    },
    {
        "doc": "NASA_MOXIE_ISRU_FDIR",
        "page": 2,
        "fault_codes": ["ISRU-MOX-01"],
        "text": (
            "MOXIE SOXE Stack ASR Degradation FDIR SOP [ISRU-MOX-01]: Solid oxide electrolysis "
            "stacks operating near 800 C require Area Specific Resistance (ASR) < 1.5 ohm*cm2. "
            "ASR >= 1.5 ohm*cm2 (degraded) or >= 2.2 ohm*cm2 (critical) indicates cathode carbon "
            "deposition (coking); derate stack voltage or perform controlled safe_halt cooldown."
        ),
    },
]
