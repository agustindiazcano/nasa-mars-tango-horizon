# 21. Environmental, Space-Weather & Martian Climate Predictive Telemetry + Atmospheric RAG (Future)

> **Status:** Research summary and implementation plan only (not implemented yet).

## 1. Current State & Gap Analysis

### 1.1 What Tango Horizon Currently Has
- **Atmospheric & Radiation RAG (`server/src/agents/tools/knowledge.ts` + `server/corpus/chunks.json`):**
  - BM25 index (`1,002` chunks across `15` docs) including `Mars-GRAM_User_Guide.pdf` (`306` chunks), `MCD_user_manual_5.2.pdf` (`111` chunks), `MSL_RAD_RDR_SIS` (`142` chunks), `NASA-STD-3001_Vol1_RevB` (`2` chunks, p. 32 `[V1 4.2.9]`), and `NASA-STD-3001_Vol2_RevE` (`6` chunks, p. 68 `[V2 6095 / 6098]`).
  - `WEATHER-RAD` (`server/src/agents/hierarchy.ts`) already includes `search_docs` in its allowlist alongside `get_environment`, `get_storm_forecast`, `evaluate_eva_weather`, `deploy_beacons`, and `show_alert`.
- **Environmental Physics & Storm Nowcaster (`@th/shared`, `web/public/data/env/`):**
  - `shared/src/physics/atmosphere.ts` (`surfaceDensity`, `densityAt`, `windAt`, `directTransmission`), `solar.ts` (`solarPowerW`, `estimateSolarPower`), `dose.ts` (`doseRate`, `doseRateWithAlbedo`, `cumulativeDose`), and `stormDecision.ts` (`decide()`, `DEFAULT_STORM_LIMITS`).
  - Static datasets under `web/public/data/env/` (`ephem.json`, `rems_clear.json`, `rems_storm2018.json`, `rad_quiet.json`, `rad_sep2017.json`, `storm_forecast.json`) plus raw downloads in `data/donki/` (`cme.json`, `cme_analysis.json`, `sep.json`, `wsa_enlil.json`).

### 1.2 Identified Gaps
1. **Instantaneous `env` snapshot only:** `MissionContext.env` sends single-point scalars (`pressure_pa`, `air_temp_k`, `tau`, `wind_ms`, `dose_rate_ugy_h`). `routes.ts` drops `sol`, `lst_h`, `ground_temp_k`, and `cumulative_dose_ugy`, and maintains no rolling multi-hour telemetry window (`dp/dt` thermal tides, `dtau/dt` ramp, wind shear, RAD `d(dose)/dt`, `sun_elev_deg`, base battery Wh, or DONKI SEP arrival flags).
2. **Inconsistent thresholds & missing short-term ETAs:** `STORM_LIMITS` in `server/src/agents/tools/registry.ts` (`tauVisibility: 2.5`, `tauDroneGrounding: 1.8`) conflicts with `DEFAULT_STORM_LIMITS` in `shared/src/physics/stormDecision.ts` (`tauVisibility: 1.5`, `tauDroneGrounding: 1.2`). Neither computes live ETAs (`time_to_storm_onset_s`, `visibility_abort_eta_s`, `time_to_zero_solar_margin_s`, `projected_eva_dose_ugy`) from rolling telemetry.
3. **Under-used RAG & missing meteorological/space-weather SOPs:** `WEATHER-RAD`'s prompt does not instruct citing `search_docs`, `offline.ts` skips `search_docs` on weather queries, `EVA-PLANNER` lacks `get_storm_forecast` and `search_docs`, and `chunks.json` has `0` chunks covering `DONKI`, `WSA-Enlil`, `MEDA`, `REMS` thermal-tide nowcasting, or solar curtailment operations.
4. **Incomplete `GUARDIAN` environmental gates:** `ruleCheck` checks `ctx.env.tau >= 1.8` only on `deploy_beacons` (`drone_drop`). It does not ground `drone`/`glider` on `dispatch` under high `tau`, excessive wind, or low air density, nor gate outward non-`rescue` dispatch during SEP radiation spikes.

---

## 2. Mars Meteorology & Space-Weather Precedents

- **MSL REMS & Thermal-Tide Dust Nowcasting:** Curiosity REMS ([PDS Atmospheres](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/curiosity.html)), dust amplification of diurnal/semidiurnal pressure tides ([NTRS 20170002483](https://ntrs.nasa.gov/citations/20170002483), [Thermal Tides at Mars](https://science.nasa.gov/resource/thermal-tides-at-mars/)), surface energy budget shifts ([NTRS 20250010684](https://ntrs.nasa.gov/api/citations/20250010684/downloads/SmithSurfaceSTI.pdf?attachment=true)), and MY 34 global storm observations ([NTRS 20190027303](https://ntrs.nasa.gov/api/citations/20190027303/downloads/20190027303.pdf)).
- **Perseverance MEDA & Engineering Density Models:** MEDA RDS/SkyCam ([NASA Science](https://science.nasa.gov/resource/medas-radiation-and-dust-sensor/), [PDS MEDA](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html)), Mars-GRAM ([NTRS 20210023957](https://ntrs.nasa.gov/api/citations/20210023957/downloads/Mars-GRAM%20User%20Guide.pdf), [NTRS 20240012934](https://ntrs.nasa.gov/citations/20240012934)), MCD v5.2 ([User Manual](https://www-mars.lmd.jussieu.fr/mars/info_web/user_manual_5.2.pdf)), and Ingenuity air-density flight envelopes ([NASA Science](https://science.nasa.gov/resource/mars-atmosphere-density-model/)).
- **MSL RAD & DONKI / WSA-Enlil Space Weather:** RAD RDR SIS ([PDS-PPI](https://pds-ppi.igpp.ucla.edu/volume/MSLRAD_1002/DOCUMENT/RAD_RDR_SIS.HTM)), September 2017 Mars SEP GLE ([NASA GOES/SEP](https://www.nasa.gov/missions/goes/september-2017s-intense-solar-activity-viewed-from-space/), [NTRS 20140012993](https://ntrs.nasa.gov/citations/20140012993)), and CCMC DONKI SEP / WSA-Enlil heliospheric propagation ([SVS 4699](https://svs.gsfc.nasa.gov/4699/), [NTRS 20240005985](https://ntrs.nasa.gov/api/citations/20240005985/downloads/Khoo_2024_ApJ_963_107.pdf?attachment=true)).
- **Dust-Storm Solar Curtailment Operations:** InSight storm load-shedding ([NASA InSight](https://www.nasa.gov/missions/insight/nasas-insight-waits-out-dust-storm/), [Power Levels Stabilize](https://www.nasa.gov/solar-system/nasas-insight-sees-power-levels-stabilize-after-dust-storm/)) and Opportunity 2018 storm loss ([JPL](https://www.jpl.nasa.gov/news/six-things-about-opportunitys-recovery-efforts/)).

---

## 3. Planned Architecture (`B21`, Future)

Keep Tango Horizon's **deterministic physics vs. LLM RAG separation**: `@th/shared` computes all slopes, ETAs, solar reserves, and projected radiation doses; `WEATHER-RAD` and `EVA-PLANNER` cite retrieved standards; `GUARDIAN` enforces hard environmental envelopes.

1. **Rolling Environmental Telemetry Window (`EnvTelemetryWindow`):**
   - Extend `shared/src/types/mission.ts` and `routes.ts` (`buildContext`) with optional `env_window` (up to 48 bounded samples of `t_s`, `sol`, `lst_h`, `pressure_pa`, `air_temp_k`, `ground_temp_k`, `tau`, `wind_ms`, `dose_rate_ugy_h`, `sun_elev_deg`) plus `base_battery_wh` and cached `donki_alert` (`active_sep`, `wsa_enlil_mars_arrival_h`, `source_id`).
2. **Unified Limits & Deterministic Nowcast (`shared/src/physics/envNowcast.ts`):**
   - Unify `STORM_LIMITS` (`registry.ts`) and `DEFAULT_STORM_LIMITS` (`stormDecision.ts`) into a single shared `ENV_LIMITS` export (`tauVisibility`, `tauAbort`, `tauDroneGrounding`, `maxFlightWindMs`, `minFlightDensityKgM3`, `minPowerMarginW`, `sepDoseWarnUgyH`, `sepDoseAbortUgyH`).
   - Implement `computeEnvGradients` (`dp_dt_pa_h`, `diurnal_air_swing_k`, `dtau_dt_per_h`, `dwind_dt_ms_h`, `ddose_dt_ugy_h2`, `air_density_kg_m3`) and `predictEnvironmentalRisk` returning exact SI outputs: `time_to_storm_onset_s`, `visibility_abort_eta_s`, `time_to_zero_solar_margin_s`, `battery_autonomy_s`, `projected_eva_dose_ugy`, `flight_envelope`, and `recommended_maneuvers`.
   - Register read-only MCP tool `evaluate_environmental_risk` on `mcp-environment`.
3. **Atmospheric / Space-Weather RAG & Prompt Alignment (`hierarchy.ts`, `offline.ts`, `chunks.json`):**
   - Ingest REMS tidal precursor, MEDA optical-depth sensing, DONKI/WSA-Enlil SEP alerting, and dust-storm solar curtailment briefs into `server/corpus/chunks.json`.
   - Update `WEATHER-RAD` prompt and `offline.ts` to call both `evaluate_environmental_risk` and `search_docs`, citing `(doc, page)` (`NASA-STD-3001_Vol1_RevB` p. 32, `Vol2_RevE` p. 68, `Mars-GRAM`, `MCD`, `MSL_RAD`).
   - Grant `EVA-PLANNER` access to `get_storm_forecast` and `search_docs`.
4. **Proactive Coordination & `GUARDIAN` Environmental Gates (`guardian.ts`):**
   - **`dispatch` for `drone`/`glider`:** `deny` if `tau >= ENV_LIMITS.tauDroneGrounding`, `wind_ms >= ENV_LIMITS.maxFlightWindMs`, or `surfaceDensity(...) < ENV_LIMITS.minFlightDensityKgM3`.
   - **SEP high-dose gate:** `deny` non-`rescue` outward `dispatch` (moving away from shelter `(0, 0)`) when `dose_rate_ugy_h >= ENV_LIMITS.sepDoseAbortUgyH` or `donki_alert?.active_sep` with rising RAD slope (`ask_human` on borderline warning thresholds).
   - **`deploy_beacons` (`drone_drop`):** unify line 89 check onto `ENV_LIMITS.tauDroneGrounding`.

---

## 4. Tests & Acceptance Criteria (When Implemented)

1. Unit tests in `shared/src/physics/__tests__/envNowcast.test.ts` validating positive `dtau_dt_per_h`, storm onset ETAs over 2018 REMS storm ramps, solar autonomy drop with rising `tau`, and single-source `ENV_LIMITS`.
2. Corpus tests verifying `searchDocs` retrieves `(doc, page)` citations across `Mars-GRAM`, `MCD`, `MSL_RAD`, `NASA-STD-3001`, and new DONKI/REMS/MEDA chunks in `< 5 ms`.
3. `GUARDIAN` tests verifying deterministic `deny` when dispatching `drone`/`glider` above `tau`/`wind`/low-density limits or dispatching non-rescue EVAs outward during SEP spikes.
4. End-to-end `WEATHER-RAD` test (LLM and `offlineReply`) verifying `evaluate_environmental_risk` + `search_docs` calls, exact SI ETAs, and cited `show_alert` output.
