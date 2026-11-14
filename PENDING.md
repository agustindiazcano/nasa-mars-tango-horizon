# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B1 | 🔴 | Step 1 | Create root, `shared/`, and `server/` workspace scaffold (`package.json`, `Dockerfile`, `server/src/index.ts` health check) | `01_SCAFFOLD.md` | — |
| B2 | 🔴 | Step 2 | Implement `server/src/` base: `config.ts`, 3-provider LLM layer (`llm/provider.ts` for Vertex AI keyless ADC on `nasa-tango-horizon` + Muse/Meta + Google AI Studio Gemini with automatic failover), CORS for `ALLOWED_ORIGINS` (Vercel + Cloud Run), `/ws/remote` relay (`relay.ts`), and run `scripts/check-llm.ts` → `docs/LLM_CHECK.md` | `05_SERVER.md`, `INFRASTRUCTURE_AND_VERTEX_AI.md` | B1 |
| B3 | 🔴 | Step 3 | Run NASA/USGS data pipeline (`tools/`): `build_terrain.py` (`height_2048.u16`, `ortho_4096.webp`, `slope_1024.png`, `svf_1024.png`), `build_thermal.py` (`thermal_class.png`), REMS (`rems_clear.json`), RAD (`rad_quiet.json`, `rad_sep2017.json`), SUITS (`shared/src/types/suit.ts`), ephemerides (`ephem.json`), NASA GLBs, and `provenance.json` | `02_DATA_PIPELINE.md` | B1 |
| B4 | 🔴 | Step 4 | Implement deterministic physics core in `shared/src/physics/` (Pandolf metabolic rate, choked orifice flow, RK4 pod ballistics, sky-view-factor dose, solar power, `suitState.ts`, `route.ts`) with Vitest unit tests | `03_PHYSICS_CORE.md` | B1 |
| B5 | 🔴 | Step 6 | Implement `shared/src/i18n/` with English source-of-truth dictionary, Spanish dictionary, and dictionary completeness unit test | `14_I18N.md` | B1 |
| B6 | 🔴 | Step 8 | Implement `POST /api/tts` in `server/src/tts.ts` using Google Cloud Text-to-Speech neural voices and `list-voices` helper script | `07_VOICE.md` | B2 |
| B7 | 🔴 | Step 9 | Implement backend agents, MCP servers, and guardrail in `server/src/agents/`: `terrainData.ts`, `registry.ts`, 6 in-process MCP servers (`mcp.ts`), `runAgent.ts`, `hierarchy.ts` (`SUIT.VOICE-EXEC` → `BASE`), `GUARDIAN` (`ruleCheck` + `judge`), `offline.ts` deterministic fallback, and `/api/agent/{voice,run,vision}` routes | `08_AGENTS_TOOLS_MCP_GUARDIAN.md` | B2, B4, B6 |
| B8 | 🔴 | Step 11 | Deploy backend to Google Cloud Run (`deploy.sh` with `META_API_KEY` and `GEMINI_API_KEY` in Secret Manager) and frontend (`web/`) to Vercel (`VITE_API_URL` + `ALLOWED_ORIGINS`), then run post-deploy smoke checklist | `10_DEPLOY_SUBMISSION.md` | B7, F7 |
| B9 | 🟡 | Step 12 | Train and validate Storm Nowcaster (`tools/storm/`), export `storm_forecast.json` and `docs/storm_tides.png`, implement `stormDecision.ts` in `shared/`, and register `WEATHER-RAD` agent & MCP tools | `13_STORM_NOWCASTER.md` | B3, B7 |
| B10 | 🟡 | Step 13 | Train and validate Hydration Prospector (`tools/hydration/`), export `hydration_1024.png` + `hydration_unc_1024.png`, and register `SCIENCE` agent & MCP tools (`get_hydration_at`, `rank_sample_sites`) | `11_HYDRATION_PROSPECTOR.md` | B3, B7 |
| B11 | 🟡 | Step 14 | Register `arm_skill` tool in `mcp-fleet`, add `manip-1` safety rules to `GUARDIAN` (`<2 m` crew keep-out, stationary handover check), and register `ROBOT.manip-1` vision planner | `12_MANIPULATOR_ROBOT.md` | B7 |
| B12 | 🟡 | Step 14b | Extract DINOv2 embeddings and train sol-grouped Vein Detector (`tools/veins/`), export `web/public/data/veins/`, and register `detect_veins` MCP tool | `15_VEIN_DETECTOR.md` | B3, B7 |
| B13 | 🟡 | Step 15 | Build in-memory BM25 RAG corpus (`tools/build_corpus.py` → `server/corpus/chunks.json` from `NASA-STD-3001` Vol. 1 & 2 and OCHMO briefs), `knowledge.ts` (`search_docs`), `MAINTENANCE` and `SUIT.HEALTH` agents, and prompt-injection tests | `08_AGENTS_TOOLS_MCP_GUARDIAN.md` | B7 |
| B14 | 🟡 | Step 16 | Implement multi-vehicle route planners in `shared/src/physics/planning/` (per-vehicle A\*, time-optimal rescue, Hungarian assignment, drone lattice, lawnmower coverage, station ordering) with unit tests | `09_SCENARIOS_WORLD.md` | B4 |
| B15 | 🔴 | Step 19 | Finalize `README.md` (auto-generated data, physics, and constants tables + model validation metrics), run final deploy to Cloud Run and Vercel, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | All |
