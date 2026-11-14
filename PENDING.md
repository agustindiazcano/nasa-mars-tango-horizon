# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B8 | 🔴 | Step 11 | Deploy backend to Google Cloud Run (`deploy.sh` with `META_API_KEY` and `GEMINI_API_KEY` in Secret Manager) and frontend (`web/`) to Vercel (`VITE_API_URL` + `ALLOWED_ORIGINS`), then run post-deploy smoke checklist | `10_DEPLOY_SUBMISSION.md` | B7, F7 |
| B15 | 🔴 | Step 19 | Finalize `README.md` (auto-generated data, physics, and constants tables + model validation metrics), run final deploy to Cloud Run and Vercel, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | All |
