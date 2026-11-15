# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B15 | 🔴 | Step 19 | Finalize `README.md` (auto-generated data, physics, and constants tables + model validation metrics), run final deploy to Cloud Run and Vercel once `web/` is merged, and tag `submission` | `10_DEPLOY_SUBMISSION.md` | All |
| B22 | 🟡 | Tech Debt | Consolidate active frontend from `web-test-3d/` into `web/` (only `web/public/` exists today), align `vercel.json` and `server/src/index.ts` static path (`../../web/dist`), carry over Vitest tests, and reconcile `PENDING_FRONT.md` (`F1`–`F15`) against features already built in `web-test-3d/` | `01_SCAFFOLD.md`, `10_DEPLOY_SUBMISSION.md` | — |
| B23 | 🟡 | Tech Debt | Replace duplicated `web-test-3d/src/core/{physics,types,i18n}.ts` with direct `@th/shared` workspace imports in `web-test-3d/package.json` / `web/package.json` to prevent client-server drift | `01_SCAFFOLD.md`, `03_PHYSICS_CORE.md` | B22 |
| B37 | 🟢 | Verification | Run live browser DOM/WebGL and online Vertex/Gemini audio STT verification: mic-denial UX (`listen.ts`), `speak.ts` 6 s timeout/cache, `voiceController.ts` audio + `offlineFallback` guard, live `/api/stt` + `/api/agent/voice`, DEM slow/error/retry visual acceptance, and 3D LOD/contact rendering | `04_TERRAIN_HELMET_HUD.md`, `07_VOICE.md`, `08_AGENTS_TOOLS_MCP_GUARDIAN.md` | — |
