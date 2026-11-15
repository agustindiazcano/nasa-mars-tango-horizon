# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B15 | 🔴 | Step 19 | Run final deploy to Cloud Run and Vercel from `web/`, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | — |
| B23 | 🟡 | Tech Debt | Reconcile `PENDING_FRONT.md` (`F1`–`F15`) against the features already built in `web/` (formerly `web-test-3d/`), make the Dockerfile build the frontend so the `web/dist` mirror in `server/src/index.ts` becomes active (or confirm Vercel-only), and fix `src/voice/localIntents.test.ts:6` (expects 6 categories, implementation has 9) | `01_SCAFFOLD.md`, `10_DEPLOY_SUBMISSION.md` | — |
