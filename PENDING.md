# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B15 | 🔴 | Step 19 | Finalize `README.md` (auto-generated data, physics, and constants tables + model validation metrics), run final deploy to Cloud Run and Vercel once `web/` is merged, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | All |
| B16 | ⚪ | Backlog | Implement post-guardrail 3-model escalated voting (`gemini-4-carbon` `low`, `gemini-4-argon`, `muse-wonder` `medium`) and HUD trace card (nice-to-have) | `16_ESCALATED_MODEL_VOTING.md` | B8 |
| B17 | ⚪ | Backlog | Implement bounded multi-turn conversational memory (`history`, max 6 turns) across separate voice orders | `17_MULTITURN_VOICE_MEMORY.md` | B8 |
| B18 | ⚪ | Backlog | Implement client-side persistent chat and voice session history (`IndexedDB` / `localStorage`, max 20 sessions) with session picker and JSON/Markdown export | `18_CHAT_SESSION_PERSISTENCE.md` | B17 |
| B19 | ⚪ | Backlog | Implement deterministic EVA biomedical trend prediction (`shared/src/physics/biomed.ts`), privacy-bounded personal baselines, `evaluate_crew_biomed` MCP tool, and clinical `GUARDIAN` rules | `19_PREDICTIVE_BIOMEDICAL_RAG.md` | B8 |
| B20 | ⚪ | Backlog | Implement deterministic FDIR/RUL component fault prediction (`shared/src/physics/fdir.ts`), `evaluate_component_health` MCP tool, FDIR SOP RAG chunks, `isolate_component`, and hardware `GUARDIAN` gates | `20_COMPONENT_FAULT_TELEMETRY_RAG.md` | B8 |
| B21 | ⚪ | Backlog | Implement unified `ENV_LIMITS`, `shared/src/physics/envNowcast.ts`, `evaluate_environmental_risk` MCP tool, DONKI/REMS/MEDA RAG chunks, and environmental `GUARDIAN` gates | `21_ENVIRONMENTAL_WEATHER_RAG.md` | B8 |
| B22 | 🟡 | Tech Debt | Consolidate active frontend from `web-test-3d/` into `web/` (only `web/public/` exists today), align `vercel.json` and `server/src/index.ts` static path (`../../web/dist`), and reconcile `PENDING_FRONT.md` (`F1`–`F15`) against features already built in `web-test-3d/` | `01_SCAFFOLD.md`, `10_DEPLOY_SUBMISSION.md` | — |
| B23 | 🟡 | Tech Debt | Replace duplicated `web-test-3d/src/core/{physics,types,i18n}.ts` with direct `@th/shared` workspace imports in `web-test-3d/package.json` / `web/package.json` to prevent client-server drift | `01_SCAFFOLD.md`, `03_PHYSICS_CORE.md` | B22 |
| B24 | 🟢 | Testing | Add automated test suites for `server/` (`GUARDIAN` `ruleCheck`/`judge`, action parsing, BM25 `searchDocs`, HTTP/WS routes, `offlineReply`, PNG decoder in `terrainData.ts`) and frontend (`web-test-3d/` / `web/`) | `05_SERVER.md`, `08_AGENTS_TOOLS_MCP_GUARDIAN.md` | — |
| B25 | 🟢 | Tech Debt | Upgrade `TerrainProc` (`web-test-3d/src/world/terrainProc.ts`) from the `256x256` (`gridN = 256`) DEM subsample to full-resolution rendering/LOD over `height_2048.u16` and `web/public/data/terrain/` assets | `04_TERRAIN_HELMET_HUD.md`, `3D_AND_VISUAL_PLAN.md` | B22 |
| B27 | 🔴 | RAG | Extend `server/corpus/chunks.json` with `NASA-STD-3001` content: only 8 of 1,002 chunks come from it (6 from Vol. 2, 2 from Vol. 1), while the agents and docs present the RAG as based on that standard | `08_AGENTS_TOOLS_MCP_GUARDIAN.md`, `02_DATA_PIPELINE.md` | — |
| B28 | 🔴 | Agents | `chat()` in `server/src/llm/provider.ts` throws when every provider returns an empty completion; `/api/agent/run` and `/api/agent/voice` then answer with `offlineReply` (HTTP 200, no marker) and drop the tool results already gathered. Return the empty message to the forced-final path in `runAgent.ts` and flag fallback responses | `08_AGENTS_TOOLS_MCP_GUARDIAN.md` | — |
| B29 | 🟡 | Agents | `evaluate_eva_weather` (`server/src/agents/tools/registry.ts`) ignores the current `ctx.env.tau`: tau 0.48 and tau 3.0 both return `go_with_changes` although 3.0 is above the 2.5 visibility limit | `13_STORM_NOWCASTER.md` | — |
| B30 | 🟡 | LLM | Meta backup (`muse-spark`) returns empty completions for tool calling and JSON mode in `check-llm.ts`, so failover to `meta` cannot run agent tools or the `GUARDIAN` judge | `LLM_CHECK.md` | — |
| B31 | 🟢 | Agents | Agent replies contain Markdown/LaTeX (`**GO**`, `$\tau$`) that TTS reads aloud; `search_docs` returns nothing for Spanish queries over the English corpus; `MAINTENANCE` used 5 `search_docs` calls (35 s) for one fan question | `07_VOICE.md`, `08_AGENTS_TOOLS_MCP_GUARDIAN.md` | — |

## NASA data audit priority

- 🔴 B32: Execute P0–P8 in `docs/NASA_DATA_REMEDIATION_PLAN.md`. Verify coordinate-fix integration, source provenance, CTX/HiRISE elevation differences, and shared spatial contracts. This gates B15 and incorporates existing B27 rather than duplicating it. Implementation remains pending.
