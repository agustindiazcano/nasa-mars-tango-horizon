# 20. Component Fault & Predictive Maintenance Telemetry + Aerospace FDIR RAG (Future)

> **Status:** Research summary and implementation plan only (not implemented yet).

## 1. Current State & Gap Analysis

### 1.1 What Tango Horizon Currently Has
- **Suit Schema & Degradation (`shared/src/types/suit.ts`, `shared/src/physics/suitState.ts`, `web/src/core/physics.ts`):**
  - `SuitsRawTelemetry` and `SuitTelemetry` declare hardware health fields (`fan_pri_rpm`, `fan_sec_rpm`, `scrubber_a_co2_storage`, `scrubber_b_co2_storage`, `coolant_ml`, `coolant_gas_pressure`, `coolant_liquid_pressure`, `active_scrubber`, `active_fan`, `dcu`, `error`).
  - `stepSuitState` advances consumables (`o2_primary_kg`, `o2_reserve_kg`, `suit_pressure_pa`, `co2_pa`, `battery_wh`, `coolant_l`) at 1 Hz; `web` simulates fan degradation via a boolean `fanDegraded` flag.
- **Mission Snapshot (`shared/src/types/mission.ts`):**
  - `MissionContext` carries instantaneous snapshots (`suit`, `env`, `fleet: FleetUnitSnapshot[]` with `{ id, kind, x, z, battery, busy, task }`).
- **Agent Hierarchy & Guardrail (`server/src/agents/hierarchy.ts`, `guardian.ts`, `offline.ts`):**
  - `MAINTENANCE` (`tier: "medium"`) has `["get_suit_telemetry", "list_units", "search_docs", "show_alert"]` and instructs predicting equipment failures from telemetry trends.
  - `ROBOT.<id>` uses unit-scoped mobility/terrain tools without hardware health inspection, and `GUARDIAN.ruleCheck` checks battery `< 0.1` (`0.15` for `drone_drop`), terrain slope limits, keep-out zones, and speed for `handover`.
- **BM25 Corpus (`server/corpus/chunks.json`):** `1,002` chunks across `15` documents (`Mars-GRAM`, `AMCL`, `MEDPRAT`, `MSL_RAD`, `MCD`, `NASA-STD-3001`, `OCHMO`, `MOXIE_readme_moxie.txt`, NTRS papers).

### 1.2 Identified Gaps
1. **No sliding telemetry window:** `MissionContext` transmits a single point-in-time snapshot; agents cannot compute `d(RPM)/dt`, filter/loop differential pressure trends, scrubber saturation curves, battery thermal slopes, or solar panel dust fouling rates.
2. **Missing fleet/arm/ISRU hardware health signals:** `FleetUnitSnapshot` lacks motor phase currents, actuator temperatures, wheel slip ratio, and `manip-1` drill torque/joint temperature; `env` lacks panel dust attenuation (`solar_dust_factor`) and ISRU compressor/SOXE health metrics.
3. **No deterministic FDIR/RUL engine:** `MAINTENANCE` inspects raw snapshots rather than calling a deterministic prognostics tool in `@th/shared`.
4. **Corpus lacks hardware FDIR SOPs:** None of the `15` documents in `chunks.json` provide PLSS fan/scrubber/coolant fault trees, rover mobility stall/sinkage recovery procedures, manipulator overcurrent recovery, or MOXIE SOXE/compressor FDIR playbooks (`MOXIE_readme_moxie.txt` covers production summaries only).
5. **No hardware-fault `GUARDIAN` gates:** `ruleCheck` does not prevent dispatching rovers with stalled/overheating actuators or executing `manip-1` `drill`/`sample` actions under joint overcurrent faults.

---

## 2. Aerospace & Industry Precedents

- **NASA PCoE & PHM:** NASA Ames Prognostics Center of Excellence datasets ([PCoE Data Set Repository](https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/)), rotary valve actuator RUL prognostics ([NTRS 20160000931](https://ntrs.nasa.gov/citations/20160000931)), and thermal-coupled Li-ion battery health monitoring ([NTRS 20240008876](https://ntrs.nasa.gov/citations/20240008876)).
- **Integrated System Health Management (ISHM):** Deep-space autonomous FDIR architectures under the NASA Platform for Autonomous Systems ([NTRS 20220008322](https://ntrs.nasa.gov/api/citations/20220008322/downloads/NPAS%20for%20Space%20Trusted%20Autonomy%20%2005-19-2022.pdf)) and Autonomous Mission Operations ([NTRS 20170011337](https://ntrs.nasa.gov/api/citations/20170011337/downloads/20170011337.pdf)).
- **EMU / xEMU / Mars PLSS FDIR:** Fan-Pump-Separator failure investigation ([NTRS 20150003027](https://ntrs.nasa.gov/api/citations/20150003027/downloads/20150003027.pdf)) and xEMU/Mars PLSS CWS monitoring of motor phase currents, delta-P, swing-bed CO2 scrubbers, and SWME loops ([NTRS 20120009158](https://ntrs.nasa.gov/api/citations/20120009158/downloads/20120009158.pdf), [NTRS 20170009505](https://ntrs.nasa.gov/api/citations/20170009505/downloads/20170009505.pdf), [NTRS 20260005404](https://ntrs.nasa.gov/api/citations/20260005404/downloads/Mars_PLSS_Plan_ICES2026_Presentation_Final.pdf)).
- **Mars Rover Mobility & MOXIE FDIR:** MSL/M2020 wheel motor current persistence and visual-odometry slip-sinkage protection ([JPL ROB-20-0040](https://www-robotics.jpl.nasa.gov/media/documents/ROB-20-0040_R3.pdf), [JPL 2025 IEEE Aero RO Ops](https://www-robotics.jpl.nasa.gov/media/documents/2025_IEEE_Aero_RO_ops.pdf)), plus MOXIE scroll compressor and ~800 °C SOXE stack monitoring ([NASA MOXIE Components](https://science.nasa.gov/resource/components-of-moxie-illustration/), [DTU MOXIE SOXE Study](https://backend.orbit.dtu.dk/ws/portalfiles/portal/272334190/11214_2020_782_ReferencePDF.pdf)).
- **Anomaly-Troubleshooting RAG:** NASA AMPLIFY ([NTRS 20260000162](https://ntrs.nasa.gov/api/citations/20260000162/downloads/AMPLIFY%20LLM%20Platform%20Whitepaper_final.pdf)) and DLR SpaceOps 2025 agentic FDIR ([SpaceOps 2025 ID-118](https://elib.dlr.de/222447/1/DLR-GK-RBT-SpaceOps-2025-ID-118-Paper-v3.pdf)) combining deterministic anomaly monitors, handbook RAG, and HITL gating.

---

## 3. Planned Architecture (`B20`, Future)

Keep Tango Horizon's **deterministic FDIR vs. LLM RAG separation**: `@th/shared` computes all slopes, fault codes, and RULs; `MAINTENANCE` retrieves cited SOPs via `search_docs`; `GUARDIAN` validates every mitigation action.

1. **Client Sliding Fault-Telemetry Window (`shared/src/types/mission.ts`):**
   - Add bounded `suit_window`, `fleet_health` (`motor_current_a`, `actuator_temp_c`, `slip_ratio`, `drill_torque_nm`, `isolated`, `fault_codes`), `fleet_windows`, and `power_isru_window` (`solar_dust_factor`, hab bus voltage/battery temp, MOXIE compressor current / SOXE ASR) across the last 10–15 min (downsampled to 10 s, max 90 samples).
2. **Deterministic FDIR & RUL Engine (`shared/src/physics/fdir.ts`) + `evaluate_component_health`:**
   - Compute linear least-squares slopes, z-score residuals, and clamped `rul_s` (`null` when non-degrading, `0` when breached).
   - Map deterministic multi-channel signatures to canonical fault codes (`PLSS-FAN-01`, `PLSS-SCRUB-01`, `PLSS-COOL-01`, `RVR-MOB-01`, `RVR-THM-01`, `ARM-TORQ-01`, `HAB-PWR-01`, `ISRU-MOX-01`) and severity (`nominal | degraded | critical`).
   - Expose read-only MCP tool `evaluate_component_health({ scope, unit_id? })` in `server/src/agents/tools/registry.ts`.
3. **FDIR Troubleshooting SOP RAG Expansion (`server/corpus/chunks.json` + `knowledge.ts`):**
   - Curate and ingest NASA/JPL FDIR procedures for PLSS redundancy switchovers (`fan_sec`, `scrubber_b`, coolant recovery), rover slip/stall recovery, arm overcurrent stow, and MOXIE/solar power derating, adding optional `fault_codes` metadata filtering before BM25 ranking so `search_docs` cites exact `(doc, page)` recovery SOPs.
4. **Hardware Isolation Action & `GUARDIAN` Rules (`guardian.ts`, `hierarchy.ts`):**
   - Add effect action `isolate_component({ target_type, target_id, subsystem, fault_code, action: "switch_redundant" | "derate" | "safe_halt" | "quarantine" })`.
   - Grant `ROBOT.<id>` unit-scoped `evaluate_component_health` + `isolate_component`.
   - Enforce in `GUARDIAN.ruleCheck`:
     - `deny` `dispatch` for `isolated` units or `critical` mobility/thermal faults (`RVR-MOB-01`, `RVR-THM-01`).
     - `deny` `arm_skill` (`drill`/`sample`/`handover`) when `manip-1` has active `critical` `ARM-TORQ-01` or `RVR-THM-01`.
     - `deny` `isolate_component` if `fault_code` is not corroborated by deterministic `evaluateComponentHealth(ctx)` (blocks prompt-injected shutdowns); `allow` verified `switch_redundant` on `critical` faults; return `ask_human` for `quarantine` or `safe_halt` of `degraded` assets or active `rescue` units.

---

## 4. Tests & Acceptance Criteria (When Implemented)

1. Unit tests in `shared/src/physics/__tests__/fdir.test.ts` validating slopes, clamped `rul_s`, and multi-channel isolation (`PLSS-FAN-01` vs `PLSS-SCRUB-01`, `RVR-MOB-01` sinkage vs stall).
2. Tool and RAG tests verifying `evaluate_component_health` determinism and `search_docs` `(doc, page)` citation accuracy on matching `fault_code` queries.
3. `GUARDIAN` tests verifying deterministic `deny` on faulted `dispatch`/`arm_skill` or uncorroborated `isolate_component`, and `ask_human` on `quarantine` / active `rescue` asset shutdowns.
4. End-to-end `MAINTENANCE` flow (both LLM and `offline.ts`) returning exact RPM slope, `rul_s`, cited FDIR SOP, and `switch_redundant` / `show_alert`.
