# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B9 | 🔴 | Step 12 | Train and validate Storm Nowcaster (`tools/storm/`), export `storm_forecast.json` and `docs/storm_tides.png`, and wire `storm_forecast.json` into `WEATHER-RAD` MCP tools | `13_STORM_NOWCASTER.md` | B3, B7 |
| B10 | 🔴 | Step 13 | Train and validate Hydration Prospector (`tools/hydration/`), export `hydration_1024.png` + `hydration_unc_1024.png`, and wire `hydration` data into `SCIENCE` MCP tools (`get_hydration_at`, `rank_sample_sites`) | `11_HYDRATION_PROSPECTOR.md` | B3, B7 |
| B12 | 🟡 | Step 14b | Extract DINOv2 embeddings and train sol-grouped Vein Detector (`tools/veins/`), export `web/public/data/veins/`, and register `detect_veins` MCP tool | `15_VEIN_DETECTOR.md` | B3, B7 |
| B8 | 🔴 | Step 11 | Deploy backend to Google Cloud Run (`deploy.sh` with `META_API_KEY` and `GEMINI_API_KEY` in Secret Manager) and frontend (`web/`) to Vercel (`VITE_API_URL` + `ALLOWED_ORIGINS`), then run post-deploy smoke checklist | `10_DEPLOY_SUBMISSION.md` | B7, F7 |
| B15 | 🔴 | Step 19 | Finalize `README.md` (auto-generated data, physics, and constants tables + model validation metrics), run final deploy to Cloud Run and Vercel, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | All |
