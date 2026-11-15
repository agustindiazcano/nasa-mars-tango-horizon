# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B15 | 🔴 | Step 19 | Run final deploy to Cloud Run and Vercel once `web/` is merged, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | B22 |
| B22 | 🟡 | Tech Debt | Consolidate active frontend from `web-test-3d/` into `web/` (only `web/public/` exists today), align `vercel.json` and `server/src/index.ts` static path (`../../web/dist`), carry over Vitest tests, and reconcile `PENDING_FRONT.md` (`F1`–`F15`) against features already built in `web-test-3d/` | `01_SCAFFOLD.md`, `10_DEPLOY_SUBMISSION.md` | — |
