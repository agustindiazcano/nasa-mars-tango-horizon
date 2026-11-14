# 16. Post-Guardrail Escalated Multi-Model Voting Decision System (Future / Nice-to-Have)

> **Status:** Architectural plan only (not implemented yet). Recorded as a future nice-to-have enhancement for high-consequence mission decisions.

## 1. Current Guardrails Inventory

The current Run-Time Assurance (`GUARDIAN`) architecture runs inside `server/src/agents/guardian.ts`, invoked on every `effect === true` tool in `server/src/agents/runAgent.ts`, with HTTP boundaries enforced in `server/src/agents/routes.ts`.

### 1.1 Deterministic Hard Safety Limits (`ruleCheck` in `server/src/agents/guardian.ts`)

Executes before any LLM call and returns a binding `Verdict` (`decision: "allow" | "deny"`, `by: "rules"`) or `null` when LLM review is required:

| Target Action | Rule / Threshold | Source Reference | Outcome on Breach |
|---|---|---|---|
| `set_layer`, `open_panel`, `show_route`, `show_alert` | Non-physical HUD actions | `guardian.ts` (`HUD_ONLY`) | Immediate `allow` (`by: "rules"`). |
| `dispatch` | Finite coordinates (`Number.isFinite(x) && Number.isFinite(z)`) | `guardian.ts` | `deny` (`Invalid target coordinates`). |
| `dispatch` | Unit exists in `ctx.fleet` | `guardian.ts` | `deny` (`Unit {unit_id} does not exist`). |
| `dispatch` | Self-command authority (`ROBOT.<id>` may only dispatch `<id>`) | `guardian.ts` | `deny` (`A robot may only command itself`). |
| `dispatch` | Minimum unit battery (`unit.battery >= 0.1`) | `guardian.ts` | `deny` (`Battery of {unit_id} is below 10%`). |
| `dispatch` | Terrain slope limit `MAX_SLOPE[kind]` via `slopeAt(x, z)` on HiRISE DTM (`rover_crew`: $20^\circ$, `rover_science`: $25^\circ$, `rover_cargo`: $18^\circ$, `scout`: $28^\circ$, `rescue`: $25^\circ$, `manipulator`: $22^\circ$) | `guardian.ts`, `terrainData.ts` | `deny` (`reasonKey: "guard.slope"`). |
| `launch_pod` | Finite coordinates (`target_x`, `target_z`) | `guardian.ts` | `deny` (`Invalid pod target coordinates`). |
| `launch_pod` | Crew keep-out radius $\ge 15\text{ m}$ (`POD_KEEPOUT_M = 15`) from `ctx.astronaut` | `guardian.ts` | `deny` (`reasonKey: "guard.pod_keepout"`). |
| `deploy_beacons` | Pyrotechnic flares prohibited (`pyrotechnic === true`) near $29.6\text{ kPa}$ $100\%\text{ O}_2$ EVA suits | `guardian.ts`, `NASA-STD-3001 V2 [V2 6002]` | `deny` (solid-state LED/UWB only). |
| `deploy_beacons` | Aircraft grounding limit (`mode === "drone_drop"` blocked when `ctx.env.tau >= 1.8`) | `guardian.ts` | `deny` (requires `ballistic_canister`). |
| `deploy_beacons` | Drone battery reserve (`drone.battery >= 0.15`) | `guardian.ts` | `deny`. |
| `deploy_beacons` | Ballistic canister first-drop keep-out $\ge 15\text{ m}$ from `ctx.astronaut` | `guardian.ts` | `deny` (`reasonKey: "guard.pod_keepout"`). |
| `arm_skill` | Unit exists and matches caller (`ROBOT.manip-1`) | `guardian.ts` | `deny`. |
| `arm_skill` | Manipulator battery reserve (`unit.battery >= 0.1`) | `guardian.ts` | `deny`. |
| `arm_skill` | Non-handover crew keep-out $\ge 2\text{ m}$ (`ARM_CREW_KEEPOUT_M = 2`) | `guardian.ts` | `deny` (`reasonKey: "guard.crew_near_tool"`). |
| `arm_skill` | Handover requires `target_id === "astronaut"` and stationary crew (`ctx.astronaut.speed <= 0.1`) | `guardian.ts` | `deny`. |

### 1.2 LLM Safety & Injection Judge (`judge` in `server/src/agents/guardian.ts`)

Runs whenever `ruleCheck` returns `null`:

- Wraps `crew_request`, `proposed_action`, `context_summary`, and `untrusted_data` in `<untrusted>` tags after stripping nested `<untrusted>` tags.
- Validates output with Zod (`decision: "allow" | "deny" | "ask_human"`, `reason`, `injection_suspected: boolean`).
- If `injection_suspected === true`, forces `decision: "deny"`.
- Fail-closed on LLM/parse error (`decision: "deny"`, `by: "rules"`).
- Offline fallback when `!llmAvailable()`: returns `decision: "ask_human"`, `by: "rules"`.

### 1.3 Loop & Boundary Guardrails (`runAgent.ts`, `routes.ts`)

- Tool allowlist per `AgentSpec.tools` and Zod parameter validation before MCP execution.
- Delegation depth capped at `MAX_DELEGATION_DEPTH = 2`; subagent speech and `mcp-knowledge` outputs enter `untrusted` buffers.
- Multimodal rover vision guardrail (`POST /api/agent/vision`): text visible in camera frames is treated as untrusted data; `[INJECTION]` responses flag `injection: true`.
- Fastify per-route rate limiting (`RATE_LIMIT_PER_MIN`) and `ALLOWED_ORIGINS` CORS enforcement.

---

## 2. Current Source of Truth Inventory

The mission architecture separates authority across four deterministic layers:

1. **Browser Runtime State (`MissionContext`):** The browser is the single source of truth for live simulation state (`lang`, `met_s`, `astronaut`, `suit`, `env`, `fleet`, `hud`, `leak_diameter_m`, `targets`, `storm_forecast`). `server/` holds no persistent mission state.
2. **Deterministic Physics Core (`@th/shared`):** Pure TypeScript modules (`pandolf.ts`, `chokedFlow.ts`, `ballistics.ts`, `svf.ts`, `route.ts`, `constants.ts`) compute metabolic rate, $\text{O}_2$ consumption, choked leak hypoxia timelines, RK4 pod trajectories, sky-view-factor dose, and $A^*$ / RCSPP routes with zero LLM estimation.
3. **NASA/USGS Static Datasets (`web/public/data/` + `provenance.json`):** HiRISE $1\text{ m/px}$ DTM (`height_2048.u16`), slope, SVF, THEMIS thermal classes, DAN+CRISM hydration maps (`hydration_1024.png`, `hydration_unc_1024.png`), REMS 3-sol storm nowcast (`storm_forecast.json`), RAD quiet baseline (`rad_quiet.json`), JPL Horizons ephemeris (`ephem.json`), and Mastcam/MAHLI vein detections (`veins/index.json`).
4. **In-Memory BM25 RAG Corpus (`server/corpus/chunks.json` + `knowledge.ts`):** ~800-char chunks from `NASA-STD-3001` (Vol. 1 & 2) and OCHMO medical briefs queried in $<2\text{ ms}$ with exact document and page citations.

---

## 3. Proposed Post-Guardrail Escalated Multi-Model Voting Architecture

For high-consequence `BASE` operations that clear `GUARDIAN` Step 1 (`ruleCheck`) and Step 2 (`judge`), add an optional multi-model consensus panel that runs in parallel before execution or human confirmation.

### 3.1 Escalation Triggers

The voting panel runs only when `ruleCheck` did not deny and `judge` did not flag prompt injection, AND at least one trigger applies:

1. **Borderline Judge Verdict:** `judge` returned `decision: "ask_human"`.
2. **High-Consequence Physical Actuation:** `launch_pod`, `deploy_beacons` (`ballistic_canister`), or `dispatch` with `task === "rescue"`, distance $> 200\text{ m}$, or target slope $> 15^\circ$.
3. **Severe Telemetry State:** Active suit leak (`leak_diameter_m > 0`), $\tau \ge 1.5$, dose rate $> 100\text{ }\mu\text{Gy/h}$, or primary $\text{O}_2$ margin $< 45\text{ min}$.

### 3.2 Parallel 3-Model Voting Panel

Requests execute concurrently via `Promise.allSettled()` with per-voter `AbortController` timeouts:

| Voter | Model | Provider Route | Reasoning Effort | Max Tokens | Timeout |
|---|---|---|---|---|---|
| Voter A | `google/gemini-4-carbon` | `vertex` (failover `gemini`) | `low` | 250 | 2,500 ms |
| Voter B | `google/gemini-4-argon` | `vertex` (failover `gemini`) | default | 200 | 2,000 ms |
| Voter C | `muse-wonder-1.0` | `meta` | `medium` | 250 | 2,500 ms |

Each voter returns strict JSON: `{"vote":"allow"|"deny"|"ask_human","confidence":0.0-1.0,"rationale":"<max 30 words>"}`.

### 3.3 Quorum, Tie-Breaking, and Veto Supremacy

- **Full Quorum (3 votes):** `3-0` unanimous or `2-1` majority adopts the winning decision; `1-1-1` three-way split resolves to `ask_human`.
- **Asymmetric Safety Override:** If two voters return `allow` while one returns `deny` with `confidence >= 0.85`, the consolidated decision downgrades to `ask_human` so the crew confirms on the HUD.
- **Degraded Quorum (2 votes):** `2-0` concordant adopts the decision; `1-1` split resolves to `ask_human`.
- **Failed Quorum ($\le 1$ vote):** Falls back to `GUARDIAN` Step 2 verdict or `ask_human`.
- **Invariant — GUARDIAN & Physics Supremacy:** Voting models can never override a `ruleCheck` `deny`, an injection `deny`, or any `@th/shared` physical limit.

### 3.4 Trace & HUD Representation

- Extend `TraceEvent` (`kind: "voting"`) with individual voter model, provider, vote, confidence, rationale, `latency_ms`, `tally`, `consensus`, and `finalDecision`.
- Display an `ESC-VOTE` breakdown card in the HUD Agent Tree panel (`Allow` green, `Deny` red, `Ask Human` amber) with crew Confirm/Cancel controls when `finalDecision === "ask_human"`.

---

## 4. Target Files (When Implemented) and Acceptance Criteria

- **Target files:** `server/src/agents/voting.ts` (new), `server/src/agents/guardian.ts`, `server/src/agents/types.ts`, `server/src/config.ts`, `server/src/llm/provider.ts` (`reasoning_effort` support), `server/src/agents/__tests__/voting.test.ts` (new), and HUD Agent Tree renderer in `web/src/`.
- **Acceptance criteria:**
  - `ruleCheck` violations and injection detections bypass voting (`0` voting calls).
  - Routine HUD/read actions bypass voting.
  - Full 3-model panel finishes in $< 2,800\text{ ms}$ via `Promise.allSettled()`.
  - Quorum rules (`3-0`, `2-1`, asymmetric `deny >= 0.85 -> ask_human`, `1-1-1 -> ask_human`, degraded `2`-voter, `AGENTS_OFFLINE=1` bypass) verified by unit tests.
