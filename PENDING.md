# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B15 | 🔴 | Step 19 | Finalize `README.md` (auto-generated data, physics, and constants tables + model validation metrics), run final deploy to Cloud Run and Vercel once `web/` is merged, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | All |
| B16 | ⚪ | Backlog | Implement post-guardrail 3-model escalated voting (`gemini-4-carbon` `low`, `gemini-4-argon`, `muse-wonder` `medium`) and HUD trace card (nice-to-have) | `16_ESCALATED_MODEL_VOTING.md` | B8 |
| B17 | ⚪ | Backlog | Implement bounded multi-turn conversational memory (`history`, max 6 turns) across separate voice orders | `17_MULTITURN_VOICE_MEMORY.md` | B8 |
