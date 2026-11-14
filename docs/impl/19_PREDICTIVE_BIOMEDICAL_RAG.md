# 19. Predictive Biomedical Monitoring, Personal Baseline & Standards RAG (Future)

> **Status:** Research summary and implementation plan only (not implemented yet).

## 1. Current State & Gap Analysis

### 1.1 What Tango Horizon Currently Has
- **Standards RAG (`server/src/agents/tools/knowledge.ts` + `server/corpus/chunks.json`):** In-memory BM25 search (`search_docs`, `k1 = 1.5`, `b = 0.75`) over `1,002` chunks across `15` static aerospace and Mars documents, including:
  - `NASA-STD-3001_Vol1_RevB` and `NASA-STD-3001_Vol2_RevE`
  - `OCHMO-TB-004_CO2_Hypercapnia` and `OCHMO_EVA_Medical_Care_Brief`
  - `AMCL_TM-2022-220299.pdf` (`217` chunks) and `MEDPRAT_vs_IMM_TM-20240012058.pdf` (`195` chunks)
  - `Mars-GRAM_User_Guide.pdf`, `MCD_user_manual_5.2.pdf`, `MOXIE_readme_moxie.txt`, `MSL_RAD_RDR_SIS`, and NTRS technical papers.
- **Deterministic Suit & Leak Physics (`@th/shared`, `server/src/agents/tools/registry.ts`):**
  - `SuitTelemetry` (`shared/src/types/suit.ts`) defines SUITS fields (`heart_rate`, `suit_pressure_co2`, `helmet_pressure_co2`, `temperature`, coolant, O2, battery).
  - `leakTimeline` (`shared/src/physics/suitLeak.ts`) computes choked orifice depressurization timelines (`dPdt`, `leakMassFlow`) until `pao2_impaired`, `pao2_critical`, and `p_armstrong`.
  - `get_consumables_margin` computes O2 hours remaining from Pandolf-Santee `metabolicRateW` and `o2KgPerHour`.

### 1.2 Gaps vs. Personalized Predictive Clinical Monitoring
1. **Instantaneous telemetry only:** `MissionContext` (`shared/src/types/mission.ts`) sends a single snapshot per request (`ctx.suit`, `ctx.astronaut`, `ctx.env`). There is no sliding time-series buffer (`d(HR)/dt`, `d(SpO2)/dt`, `d(CO2)/dt`, core temperature trend, or cumulative thermal strain).
2. **No astronaut medical baseline:** `AstronautSnapshot` holds only `{ x, z, speed, load_kg, body_kg, yaw?, grade_pct? }`—no crew ID, resting/peak HR, VO2max, baseline SpO2, heat sensitivity, or decompression sickness (DCS) susceptibility/prebreathe state.
3. **No predictive clinical early-warning engine:** Aside from physical suit hole depressurization (`leakTimeline`), there are no deterministic predictors for hypercapnia onset, cardiac drift, heat strain (PSI), hypoxia trajectory, or composite EVA Early Warning Scores.
4. **No personal-vs-standard RAG lookup or clinical `GUARDIAN` rules:** `search_docs` queries static NASA/OCHMO/AMCL/MEDPRAT standards only, and `GUARDIAN.ruleCheck` (`server/src/agents/guardian.ts`) auto-allows `show_alert` (`HUD_ONLY`) without checking clinical-claim boundaries.

---

## 2. Aerospace & Industry Precedents

No single deployed production system integrates all four layers end-to-end for Mars EVAs (real-time suit biometrics + individual EMR history + predictive multi-condition alerts + RAG over aerospace standards). Related precedents cover parts of the problem:

- **NASA ExMC MDA & CDSS:** ExMC Medical Data Architecture ([NTRS 20200000568](https://ntrs.nasa.gov/citations/20200000568)), ExMC Clinical Decision Support System ([NTRS 20205011448](https://ntrs.nasa.gov/citations/20205011448)), and HRP-48032 Rev. B ([NTRS 20220017869](https://ntrs.nasa.gov/api/citations/20220017869/downloads/HRP-48032%20ExMC%20CDSS%20Architecture%20Recommendation%20Rev%20B.pdf?attachment=true)) define Earth-Independent Medical Operations (EIMO) combining passive telemetry and clinical inputs for NASA-STD-3001 Level of Care V ([PubMed 37344482](https://pubmed.ncbi.nlm.nih.gov/37344482/)).
- **AMCL / MEDPRAT / IMPACT:** Probabilistic mission-planning risk models ([AMCL](https://ntrs.nasa.gov/api/citations/20210012912/downloads/HSIA_Evidence_Report_Final_04-27-21.pdf), [MEDPRAT 20180004678](https://ntrs.nasa.gov/api/citations/20180004678/downloads/20180004678.pdf), [20200000974](https://ntrs.nasa.gov/citations/20200000974), [IMPACT 20230000738](https://ntrs.nasa.gov/citations/20230000738)) used for mission trade-space sizing rather than live EVA alerting.
- **NASA SUITS & AR Prototypes:** SUITS Telemetry Stream Server ([TSS2026](https://github.com/SUITS-Techteam/TSS2026)) and LLM AR HUDs ([arXiv:2507.01206](https://arxiv.org/html/2507.01206v1)) stream simulated suit metrics without longitudinal medical records or predictive scoring.
- **Commercial Wearables & Privacy Controls:** SpaceX Polaris Dawn telemedicine/wearables ([NASA](https://www.nasa.gov/humans-in-space/nasa-to-test-telemedicine-gather-essential-health-data-with-polaris-dawn-crew/)) and CSA Bio-Monitor collect multi-sensor data, while NASA's Longitudinal Study of Astronaut Health (LSAH, [nlsp.nasa.gov/resources/lsah](https://nlsp.nasa.gov/resources/lsah)) operates under strict Privacy Act re-identification limits ([NTRS 20210023989](https://ntrs.nasa.gov/citations/20210023989)).
- **Human Digital Twins & Clinical RAG:** Conceptual spaceflight Digital Twins ([PubMed 42149965](https://pubmed.ncbi.nlm.nih.gov/42149965?dopt=Abstract), [arXiv:2307.09225](https://arxiv.org/abs/2307.09225), [Frontiers in Digital Health 2026](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2026.1827007/full)) and grounded clinical RAG ([ClinicalRAG](https://aclanthology.org/2024.knowllm-1.6.pdf), [arXiv:2510.01363](https://arxiv.org/abs/2510.01363)).

---

## 3. Planned Architecture (`B19`, Future)

Follow Tango Horizon's strict **deterministic physics vs. LLM reasoning separation**:

1. **Privacy & Data Minimization Boundary:**
   - Never send full EMR documents or PII to cloud LLMs. Keep any crew profile on local client/habitat storage behind a consent flag (`privacy_mode`) and transmit only anonymized physiological baselines/deltas (`resting_hr_bpm`, `max_hr_bpm`, `hr_delta_sigma`, `personal_co2_warn_pa`, `heat_strain_index`) inside an optional `MissionContext.crew_profile` / `vitals_window`.
2. **Two-Tier Thresholds (Hard Population Floor + Personal Baseline):**
   - `NASA-STD-3001` limits remain non-negotiable ceiling/floor bounds. Personal baselines may **tighten** early warnings (alerting sooner for a given crew member's cardiac/thermal/CO2 profile) and must **never relax** a `NASA-STD-3001` threshold.
3. **Deterministic Trend & Early-Warning Module (`shared/src/physics/biomed.ts`):**
   - Pure deterministic calculations over a client-side sliding window (e.g., last 5–15 min downsampled to 10 s intervals):
     - Exponential/linear slope (`time_to_breach_s`) for `co2_pa` (hypercapnia), core temperature / Physiological Strain Index (PSI), `SpO2`, and cardiac drift (`HR / metabolic_w`).
     - Space-adapted composite Early Warning Score (`0-3` subscores) mapping to deterministic `green / amber / red` alert levels.
   - Expose via read-only MCP tool `evaluate_crew_biomed` in `server/src/agents/tools/registry.ts` so `SUIT.HEALTH` reads pre-computed numbers rather than inventing clinical scores.
4. **Standards RAG Role & `GUARDIAN` Clinical Guardrail:**
   - `SUIT.HEALTH` uses `evaluate_crew_biomed` for exact trends/scores and `search_docs` (BM25 over `NASA-STD-3001`, `OCHMO`, `AMCL`, `MEDPRAT`) only to retrieve cited operational countermeasures (`doc`, `page`).
   - Add mandatory Clinical Decision Support framing in `SUIT.HEALTH` responses and HUD (`"Decision support advisory only; not a medical diagnosis"`), and enforce in `GUARDIAN` that `SUIT.HEALTH` outputs remain operational advisories (`show_alert` / return-to-hab recommendations) without prescribing medication or overriding flight-surgeon authority.

---

## 4. Tests & Acceptance Criteria (When Implemented)

1. Unit tests in `shared/` verifying `time_to_breach_s`, PSI, cardiac drift, and composite EWS determinism under rising CO2, heat strain, and hypoxia scenarios.
2. Personal-baseline test proving tighter individual thresholds trigger `warn` earlier while attempts to loosen below `NASA-STD-3001` bounds are clamped.
3. Privacy test verifying no PII or raw medical record text enters LLM prompts or `TraceEvent` payloads.
4. `GUARDIAN` test verifying medical-advice overreach or non-cited clinical claims are flagged/blocked while cited `NASA-STD-3001` advisories pass.
