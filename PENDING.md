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
