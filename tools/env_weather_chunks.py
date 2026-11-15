"""Authoritative environmental, space-weather, and Martian climate RAG chunks.

Imported by `tools/build_corpus.py` to augment `server/corpus/chunks.json` with
REMS thermal-tide precursors, MEDA optical-depth and flight-density sensing,
CCMC DONKI / WSA-Enlil SEP alerting, and dust-storm solar curtailment briefs.
"""

from __future__ import annotations

ENV_WEATHER_CHUNKS: list[dict[str, object]] = [
    {
        "doc": "MSL_REMS_Thermal_Tides_Brief",
        "page": 1,
        "text": (
            "MSL REMS Thermal-Tide Dust Storm Precursor (Gale Crater, MY 34 / 2018 Global Storm): "
            "Suspended atmospheric dust absorbs incoming solar radiation and heats the mid-level "
            "Martian atmosphere, amplifying the diurnal (S1) and semidiurnal (S2) surface pressure "
            "thermal tides recorded by the Rover Environmental Monitoring Station (REMS) barometric "
            "sensor. Because global thermal tides respond to regional dust lifting before dust "
            "advects overhead, rising normalized S1/S2 pressure-tide amplitudes and positive dp/dt "
            "anomalies provide a 1-to-3 sol statistical precursor before local optical depth tau rises."
        ),
    },
    {
        "doc": "MSL_REMS_Thermal_Tides_Brief",
        "page": 2,
        "text": (
            "REMS Dust Opacity Operational Thresholds and Breadcrumb Navigation: "
            "Tango Horizon monitors rolling dtau/dt gradients alongside 3-sol quantile forecasts "
            "(q10, q50, q90). Dust opacity tau >= 1.5 marks storm visibility onset requiring shortened "
            "EVAs and rover pre-positioning; tau >= 1.8 grounds rotorcraft and gliders and switches "
            "breadcrumb beacon deployment from drone_drop to ballistic_canister mode; tau >= 2.5 "
            "triggers mandatory EVA visibility abort and solid-state LED/UWB return guidance."
        ),
    },
    {
        "doc": "Perseverance_MEDA_Optical_Density_Brief",
        "page": 1,
        "text": (
            "Perseverance MEDA Optical Depth Sensing and Aircraft Flight Envelope: "
            "The Mars Environmental Dynamics Analyzer (MEDA) Radiation and Dust Sensor (RDS) and "
            "SkyCam measure solar irradiance attenuation to retrieve column dust optical depth tau, "
            "while pressure and air temperature sensors yield surface air density rho = P / (R_mars * T) "
            "with R_mars = 191.8 J/(kg*K). Safe Mars rotorcraft and glider flight requires "
            "tau < 1.8, surface wind < 15.0 m/s, and air density >= 0.012 kg/m^3."
        ),
    },
    {
        "doc": "CCMC_DONKI_WSA_Enlil_SEP_Brief",
        "page": 1,
        "text": (
            "CCMC DONKI SEP and WSA-Enlil Heliospheric Space-Weather Alerting at Mars (1.524 AU): "
            "NASA Community Coordinated Modeling Center (CCMC) Space Weather Database Of Notifications, "
            "Knowledge, Information (DONKI) tracks Solar Energetic Particle (SEP) events and coronal "
            "mass ejection (CME) arrivals propagated via the WSA-Enlil solar wind model to Mars. "
            "During the September 2017 SEP event (Sols 1811-1817), MSL RAD measured absorbed dose "
            "surges above the quiet Galactic Cosmic Ray (GCR) baseline."
        ),
    },
    {
        "doc": "CCMC_DONKI_WSA_Enlil_SEP_Brief",
        "page": 2,
        "text": (
            "SEP Operational Radiation Dose Gates and ALARA Sheltering (NASA-STD-3001 Vol. 1 p. 32, "
            "Vol. 2 p. 68): Quiet GCR silicon absorbed dose rate (~10-13 uGy/h) rises sharply during "
            "SEP proton events. Surface dose >= 25 uGy/h or an active DONKI SEP alert requires crew "
            "confirmation for outward EVA dispatch. Dose >= 80 uGy/h or an active DONKI SEP alert "
            "with positive RAD slope d(dose)/dt > 0 blocks non-rescue outward dispatch and requires "
            "immediate ALARA shelter in the habitat or low sky-view-factor canyon terrain."
        ),
    },
    {
        "doc": "Mars_Solar_Curtailment_Brief",
        "page": 1,
        "text": (
            "Dust-Storm Solar Power Curtailment Operations (InSight and Opportunity Precedents): "
            "Direct-beam photovoltaic generation scales as I_TOA * exp(-tau / mu) * area * efficiency "
            "(I_TOA = 589.2 W/m^2 at 1.524 AU, mu = sin(sun_elev)). Rising tau collapses solar "
            "output while diffuse sky heating shifts thermal loads. When solar power margin falls "
            "below 500 W or time_to_zero_solar_margin_s approaches zero, operations must charge "
            "batteries early, shed non-critical EVA loads, and transfer base load to fission power."
        ),
    },
]
