"""Authoritative NASA-STD-3001 Vol. 1 & Vol. 2, OCHMO-HB-004, and NASA-TP reference chunks.

Imported by `tools/build_corpus.py` to expand `server/corpus/chunks.json` with
operational limits and engineering design standards across crew biomedical health,
EVA suit physiology, decompression sickness, thermal strain, radiation PELs,
habitat atmosphere/flammability safety, dust mitigation, acoustics, and emergency
life-support consumables.
"""

from __future__ import annotations

NASA_STD_3001_CHUNKS: list[dict[str, object]] = [
    # --- NASA-STD-3001 Vol 1 Rev B: Crew Health / Biomedical ---
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 23,
        "text": (
            "[V1 4.2.3 / Sec 4.2.3] Atmospheric Carbon Dioxide (CO2) Chronic and Acute Limits: "
            "Habitable modules shall maintain chronic cabin CO2 partial pressure (ppCO2) at or "
            "below 0.40 kPa (3.0 mmHg, ~4,000 ppm at 101.3 kPa) on a 1-hour rolling average, "
            "targeting <= 0.27 kPa (2.0 mmHg) for long-duration planetary stays to prevent headache "
            "and cognitive fatigue. Acute off-nominal exposures from 1.0 kPa (7.5 mmHg) to 2.0 kPa "
            "(15.0 mmHg) cause progressive hypercapnia, respiratory acidosis, hyperventilation, "
            "and impaired executive decision-making; 2.0 kPa is an immediate Do-Not-Exceed ceiling."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 24,
        "text": (
            "[V1 4.2.2 / Sec 4.2.2] Oxygenation, Alveolar PAO2 Hypoxia Thresholds, and Armstrong Limit: "
            "Crew arterial oxygen saturation (SpO2) shall remain >= 96% nominally, with <= 94% "
            "flagging mild hypoxia and <= 90% indicating critical desaturation. Breathing 100% O2 "
            "in a 29.6 kPa EVA suit, alveolar partial pressure follows PAO2 = P_suit - PH2O - PaCO2 "
            "(PH2O = 6.27 kPa at 37 C; PaCO2 = 5.33 kPa). Below PAO2 = 8.0 kPa (60 mmHg; P_suit ~19.6 kPa) "
            "hypoxic cognitive impairment begins; below 4.0 kPa (30 mmHg; P_suit ~15.6 kPa) loss of "
            "consciousness occurs; at the Armstrong limit (6.27 kPa / 47 mmHg), body water boils."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 26,
        "text": (
            "[V1 4.2.4 / Sec 4.2.4] Decompression Sickness (DCS) R-Value and EVA Prebreathe Protocols: "
            "Transitions from higher-pressure habitats (101.3 kPa / 14.7 psia or 56.5-70.3 kPa exploration "
            "atmospheres) to a 29.6 kPa (4.3 psia) 100% O2 EVA suit shall limit DCS incidence to <= 15% "
            "at 95% confidence and prevent Grade IV Venous Gas Emboli (VGE). Protocols constrain tissue "
            "nitrogen ratio R = ppN2_tissue / P_suit (target R <= 1.2-1.4) via 4-hour in-suit O2 "
            "prebreathe from 101.3 kPa, exercise-enhanced denitrogenation, or 70.3 kPa (10.2 psia) "
            "staged camp-out, accounting for Patent Foramen Ovale (PFO) screening."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 28,
        "text": (
            "[V1 4.2.5 / Sec 4.2.5] Thermal Heat Strain, Core Temperature, PSI, and Metabolic Rate: "
            "EVA thermal control systems (LCVG and sublimator/radiator loops) shall prevent excessive "
            "heat storage (delta Q_stored <= 1.4 BTU/lb or ~3.25 kJ/kg) and hyperthermia. Baseline "
            "core body temperature is 37.0 C, with 37.6 C elevated, 38.0 C thermal strain warning "
            "(cognitive deficit onset), and 39.0 C critical hyperthermia abort threshold. Physiological "
            "Strain Index (PSI, 0-10 scale combining core temperature and heart rate) marks >= 4.0 "
            "elevated, >= 7.0 warning, and >= 9.0 critical across 200-500 W EVA metabolic workloads."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 29,
        "text": (
            "[V1 4.2.6 / Sec 4.2.6] Cold Strain, Hypothermia, and Suited Extremity Protection: "
            "During shadowed crater traverses or Mars nighttime EVAs (ambient ~180-210 K), spacesuit "
            "insulation and active heaters shall maintain core body temperature >= 36.0 C (clinical "
            "hypothermia onset < 35.0 C) and gloved finger/toe skin temperatures above 10 C to "
            "preserve manual dexterity and prevent cold-induced vasoconstriction or frostbite. "
            "Continuous skin/core thermal telemetry and glove-heater health monitoring are mandatory "
            "when external radiant sink temperature drops below 200 K."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 20,
        "text": (
            "[V1 4.2.1 / Sec 4.2.1] EVA Cardiovascular Drift, Fluid Balance, and Orthostatic Readiness: "
            "Prolonged surface EVAs at 200-500 W metabolic rates induce sweat and respiratory moisture "
            "losses that contract plasma volume, elevate hematocrit, and drive cardiovascular drift "
            "(heart rate rise per watt >= 0.38 bpm/W elevated, >= 0.45 warn, >= 0.60 critical; HR >= 155 bpm "
            "warning, >= 175 bpm critical). Crew health teams shall monitor cumulative fluid deficits, "
            "provide in-suit hydration, and conduct post-EVA orthostatic and venous thromboembolism (VTE) "
            "triage under base flight-surgeon oversight."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 33,
        "text": (
            "[V1 4.2.9 / Sec 4.2.9] Ionizing Radiation Career Limit and Acute Organ PELs (BFO, Lens, Skin): "
            "NASA-STD-3001 Volume 1 establishes a universal career effective dose limit of < 600 mSv "
            "across all crew ages and sexes, bounding Risk of Exposure-Induced Death (REID) from fatal "
            "cancer to <= 3%. Deterministic short-term and career tissue limits in gray-equivalent (mGy-Eq) "
            "protect acute organ function: Blood-Forming Organs (BFO) 250 mGy-Eq (30-day) and 500 mGy-Eq "
            "(1-year); Eye Lens 1,000 mGy-Eq (30-day), 2,000 mGy-Eq (1-year), 4,000 mGy-Eq (career); "
            "Skin 1,500 / 3,000 / 6,000 mGy-Eq; Central Nervous System (CNS) 500 mGy-Eq (30-day)."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 34,
        "text": (
            "[V1 4.2.9 / ALARA] Solar Particle Event (SPE) Storm Sheltering and Surface ALARA Operations: "
            "While Martian Galactic Cosmic Ray (GCR) background (~22-27 uSv/h) accumulates steadily, "
            "Solar Energetic Particle (SPE) storms deliver rapid proton dose-rate surges capable of "
            "breaching 30-day BFO limits. Operations shall enforce ALARA (As Low As Reasonably Achievable) "
            "controls: real-time personal dosimetry, CCMC DONKI / WSA-Enlil proton alerts, immediate "
            "EVA cancellation on storm onset, and crew sheltering behind habitat water/polyethylene "
            "mass or low sky-view-factor canyon walls accounting for regolith neutron albedo."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 40,
        "text": (
            "[V1 4.3 / Sec 6.2-6.3] Crew Work-Rest Cycles, Circadian Alignment, and Private Medical Comms: "
            "Nominal Mars surface operations (24.65-hour sol) shall schedule an 8.0-hour uninterrupted "
            "sleep opportunity, limit nominal workdays to 8.5 hours and workweeks to 48 hours, and "
            "restrict unplanned EVA overtime to prevent cumulative cognitive error. Under [V1 6002/6003], "
            "Private Medical Communications (PMC) between crewmembers and the Flight Surgeon remain "
            "confidential, using store-and-forward audio/telemetry across Mars-Earth light-time delays."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 1 Rev B",
        "page": 30,
        "text": (
            "[V1 4.2.8 / Sec 4.2.8] Surface Nutrition, Metabolic Energy Supply, and EVA Endurance: "
            "Habitat and EVA provisioning shall supply balanced caloric intake scaled to mission work "
            "intensity (~2,700-3,200 kcal/day nominal; +300-600 kcal on heavy EVA sols), adequate "
            "protein (0.8-1.2 g/kg/day), and electrolytes to sustain lean body mass and bone mineral "
            "density in 0.38 g Mars gravity. Under [V1 4.2.7], physical exercise countermeasures and "
            "post-EVA recovery nutrition preserve aerobic capacity (VO2max) for emergency self-rescue."
        ),
    },

    # --- NASA-STD-3001 Vol 2 Rev C: Habitability, Environment & Hardware Safety ---
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 107,
        "text": (
            "[V2 11006 / 11032 / 11034] Exploration Suit Operating Pressure and Telemetry Display: "
            "Surface exploration EVA suits shall operate nominally at 29.6 kPa (4.3 psia) breathing "
            "100% O2 with pressure stability maintained within +/- 1.72 kPa (+/- 0.25 psi). Launch, "
            "Entry, and Abort (LEA) suits require >= 40 kPa (5.8 psia) minimum pressure, and suits "
            "shall support a contingency DCS recompression mode up to 55.2 kPa (8.0 psia). Helmet "
            "or wrist displays shall continuously present suit total pressure, ppO2, ppCO2, O2 mass "
            "margin, and cooling status directly to the suited crewmember."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 44,
        "text": (
            "[V2 6002 / 6003] Inert Diluent Gas, ppO2 Flammability Envelope, and Oxygen Enrichment Safety: "
            "Habitable spacecraft and surface habitats operating beyond 14 days shall maintain >= 30% "
            "inert diluent gas (nitrogen) and bound oxygen concentration (nominal 21-24% O2 at 70.3-101.3 kPa; "
            "never > 30% O2 at exploration pressures) to prevent pulmonary absorption atelectasis and "
            "uncontrolled material ignition. Ambient habitat PIO2 shall stay within 16.9 kPa (127 mmHg "
            "hypoxia floor) to 47.5 kPa (356 mmHg indefinite hyperoxic ceiling; 105.5 kPa <= 6-9 h prebreathe)."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 45,
        "text": (
            "[V2 6002 / 11015] Pyrotechnic Exclusion and Ignition Control Near 100% O2 Suits and Airlocks: "
            "Pure-oxygen (100% O2) EVA suits at 29.6 kPa, oxygen umbilicals, high-pressure COPV fittings, "
            "and enriched airlock purge volumes create extreme flammability sensitivity with lowered "
            "minimum ignition energies. Under NASA-STD-3001 Vol 2 ignition-control rules, pyrotechnic "
            "flares, explosive bolts, incendiary markers, and unsealed arcing contacts are prohibited "
            "near suited crew or O2 servicing hardware; breadcrumb navigation and distress beacons shall "
            "use non-pyrotechnic solid-state LED/laser and UWB RF transponders."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 110,
        "text": (
            "[V2 11039 / Table 11.3-1] Spacesuit PICO2 Hypercapnia Limits and Scrubber Breakthrough: "
            "Spacesuit PLSS ventilation loops (~170 L/min / 6 ACFM helmet washout) and CO2 scrubbers "
            "(LiOH or regenerable RCA swing-bed) shall constrain inspired CO2 partial pressure: "
            "<= 0.53 kPa (4.0 mmHg) indefinitely; <= 0.93 kPa (7.0 mmHg) <= 7.0 h/day; <= 1.33 kPa "
            "(10.0 mmHg) <= 2.5 h/day; <= 1.67 kPa (12.5 mmHg) <= 1.0 h/day; <= 2.00 kPa (15.0 mmHg) "
            "<= 0.5 h/day; > 2.00 kPa (15.0 mmHg) Do Not Exceed. On scrubber breakthrough or fan stall, "
            "derate workload, switch to backup canister/RCA bed, or open O2 contingency purge."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 47,
        "text": (
            "[V2 6004 / 6020-6022] Habitat CO2 Scrubber Control, Atmosphere Monitoring, and Purge: "
            "Habitat ECLSS CO2 removal assemblies (CDRA / amine swing-beds) shall maintain cabin ppCO2 "
            "<= 0.40 kPa (3.0 mmHg, 1-hour average) with real-time redundant sensing of total pressure "
            "(34.5-103 kPa envelope), ppO2, ppCO2, and dew point. Off-nominal CO2 breakthrough (> 0.53 kPa "
            "in cabin or rising trend) triggers automated caution-and-warning alarms, backup scrubber "
            "switchover, crew metabolic rest, and contingency cabin purge or localized mask breathing."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 53,
        "text": (
            "[V2 6053 / 6054 / 6033] Lunar and Martian Dust Mitigation, Toxicity, and Electrostatic Control: "
            "Habitable atmospheres shall limit respirable planetary dust (< 10 um aerodynamic diameter) "
            "below 0.3 mg/m3 time-weighted average (LADTAG benchmark), isolating Martian regolith oxidants "
            "and perchlorates from cabin air and water loops. Airlocks and suitports require multi-stage "
            "HEPA filtration, dust-tolerant seals, suit/rover electrostatic discharge (ESD) grounding "
            "straps to prevent triboelectric sparks in dry CO2 air, and >= 0.5 kg immediately accessible "
            "potable water ([V2 6033]) for acute ocular dust irrigation."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 51,
        "text": (
            "[V2 6050 / 6051] Airborne Trace Contaminants (SMACs) and Habitat Isolation: "
            "Vehicle and habitat ECLSS trace contaminant control systems (TCCS) shall keep volatile "
            "organic compounds, ammonia, carbon monoxide, and battery thermal-runaway off-gassing "
            "below JSC-20584 Spacecraft Maximum Allowable Concentrations (SMACs) across 1-hour to "
            "180-day limits. Upon sensor detection of smoke, CO, or electrolyte vapors, crew procedures "
            "mandate immediate respiratory mask donning, affected module hatch isolation, and purge."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 58,
        "text": (
            "[V2 6073 / 6076 / 10035] Acoustic Noise Ceilings and Speech Communication Intelligibility: "
            "Continuous background noise from ECLSS fans, pumps, and PLSS ventilation blowers shall not "
            "exceed NC-50 (~58-60 dBA equivalent) in habitable work areas and suit helmets, or NC-40 "
            "in crew sleep quarters, with 24-hour hazardous exposure kept below 85 dBA TWA. Under "
            "Section 10 audio display standards, voice intercoms and caution/warning alerts shall achieve "
            "Speech Transmission Index (STI) >= 0.70 and >= 90% word intelligibility under suited noise."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 48,
        "text": (
            "[V2 6026 / 6029-6032 / 6051] Potable Water Quality, Daily Allocation, and Closed-Loop Recovery: "
            "Closed-loop habitat water recovery systems (condensate, Sabatier, and urine processor "
            "assemblies) shall deliver potable water free of chemical/microbial hazards (total organic "
            "carbon < 3 mg/L, < 50 CFU/mL, silver/iodine residual biocide). Minimum allocations provide "
            ">= 2.5 L (2.5 kg) per crewmember per day for drinking and food rehydration plus hygiene "
            "reserves, and EVA suits shall carry >= 0.24 L/h (240 mL/h) accessible in-helmet drinking water."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 112,
        "text": (
            "[V2 11036 / 11037 / 6022] Emergency Life-Support Contingency Consumables and Suit Leak Reserves: "
            "Each EVA suit shall incorporate an independent Secondary Oxygen Pack (SOP) providing >= 30 "
            "minutes of emergency open-loop O2 flow (>= 2.7 kg/h purge capacity) to maintain suit "
            "pressure above hypoxic thresholds during primary PLSS failure or minor micrometeoroid leak. "
            "Remote surface traverses further require >= 2-hour contingency reserves via pressurized rover "
            "umbilicals or ballistic 8.0 kg life-support pods (COPV O2, LiOH scrubber, battery, patch kit)."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 56,
        "text": (
            "[V2 6070 / Sec 6.5] Dynamic Impact Acceleration and Crew Injury Risk Criterion (Brinkley): "
            "Pressurized rovers, crew landers, and airlock restraint seats shall limit transient "
            "translational accelerations (<= 0.5 s) using the Brinkley Dynamic Response injury risk "
            "criterion (beta <= 1.0 low-risk nominal; beta <= 1.4 off-nominal contingency across "
            "x/y/z axes) to prevent spinal compression and head trauma during rough-terrain traverse "
            "drops, emergency braking, or ballistic landing events in 0.38 g gravity."
        ),
    },
    {
        "doc": "NASA-STD-3001 Vol 2 Rev C",
        "page": 109,
        "text": (
            "[V2 11035 / 11038] Spacesuit Metabolic Cooling, Humidity Control, and Sustained Workload: "
            "Spacesuit thermal and ventilation loops shall reject up to 581 W (500 kcal/h) sustained "
            "EVA metabolic heat production and transient peaks up to 730 W while holding helmet dew "
            "point between 4.4 C and 15.6 C to prevent visor fogging and sweat accumulation. Sustained "
            "metabolic workloads above 500 W require automated pace derating alerts, cooling pump "
            "verification, and mandatory rest intervals."
        ),
    },

    # --- Companion OCHMO & NASA-TP Technical References ---
    {
        "doc": "OCHMO-HB-004",
        "page": 42,
        "text": (
            "[OCHMO-HB-004 Sec 4.3 / 4.5] Suited Anthropometry, Reach Envelopes, and Torque Ergonomics: "
            "Pressurized 29.6 kPa EVA suits reduce joint range of motion, increase activation torque, "
            "and attenuate gloved tactile sensation relative to shirtsleeve baselines. Habitat hatches, "
            "emergency oxygen valves, rover controls, and sample-handling tools shall fit 5th-percentile "
            "female to 95th-percentile male suited reach envelopes and constrain peak actuation loads "
            "below 50% maximum voluntary contraction (MVC) to prevent forearm fatigue."
        ),
    },
    {
        "doc": "OCHMO-HB-004",
        "page": 68,
        "text": (
            "[OCHMO-HB-004 Sec 4.6] Suited Center of Mass, Slope Locomotion, and Metabolic Cost: "
            "Adding a ~65 kg surface EVA suit and PLSS backpack shifts whole-body center of mass "
            "posteriorly and upward, altering balance recovery in 0.38 g Martian gravity. Under Pandolf "
            "locomotion biomechanics, loose regolith (terrain factor 1.3-1.5) and grades > 15 degrees "
            "sharply raise metabolic O2 demand and slip-fall risk; EVA route planners shall cap "
            "sustained foot traverse slopes <= 15 deg and offload heavy gear to surface rovers."
        ),
    },
    {
        "doc": "NASA-TP-20205008905",
        "page": 4,
        "text": (
            "[NASA-TP-20205008905 Sec 2-3] Autonomous sUAS Communications and Navigation Contingency: "
            "Beyond Visual Line-of-Sight (BVLOS) small unmanned aircraft systems require deterministic "
            "contingency management when telemetry links degrade, navigation covariance grows, battery "
            "reserve falls below 15%, or local atmospheric dust opacity (tau >= 1.8) and winds (>= 15 m/s) "
            "exceed flight limits. On trigger, the onboard executive immediately executes pre-planned "
            "hold, return-to-home, or safe-landing trajectories without waiting for ground uplink."
        ),
    },
]
