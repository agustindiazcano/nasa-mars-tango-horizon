# Pending tasks (General, Shared, Data Pipeline & Backend `server/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> Frontend (`web/`) tasks are tracked in `PENDING_FRONT.md`.
> When a task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| B15 | 🔴 | Step 19 | Cloud Run (`tangohorizon-api` revision `00045`) and Vercel are deployed from `main`; run an end-to-end check of the deployed app (all 8 scenes, voice orders, map command) and tag `submission` | `10_DEPLOY_SUBMISSION.md` | — |
| B25 | 🟡 | Plan 24 | Add the official CONAE logo at `web/public/textures/conae-logo.png` (shoulder patches use it automatically) | `24_MODELS_IN_SIMULATOR_NATURAL_PIT_AND_MAP.md` | owner file |
| B26 | 🟡 | Plan 24 | Measure frame rate on a low-end GPU and cut the first-load time (about 30 s: DEM rasters plus about 17 MB of models); consider lazy loading models by distance | `23_3D_ASSETS_PIPELINE.md` | — |
| B27 | 🟢 | Plan 24 | Visual checks not done yet: stretcher and tow-cable close-up, casualty orientation on the litter, scenes S1 (rocket shot) and S5, route and rescue crew on the map during a running scenario, thin white line on the far pit rim | `22_RESCUE_SCENARIO_AND_BASE_REVISION.md` | — |
| B29 | 🟡 | Plan 24 | B29 remains open: visually inspect rescue scenes S0-S7, cannon muzzle alignment (current origin is module center at placement.y + 2.96 m; solver uses target/wind heading and 45-degree elevation independently of the GLB; measure a muzzle point/axis on the single-mesh asset before changing it), live drone ground contact on slopes and rover/drone orientation (both rover models already use +90-degree catalogue yaw; movement behavior unchanged), and model-1 clearance beside the garage. Browser/Windows control was unavailable during the production check. Drone animation requires separating the existing rotor geometry with shaft pivots or re-exporting the source with independent rotor nodes; do not add substitute rotors | `24_MODELS_IN_SIMULATOR_NATURAL_PIT_AND_MAP.md` | — |
| B30 | 🟡 | Plan 24 | Visually check the launch pad with the `rockets` model (scale x3, ground contact on the graded pad) and the reframed scenes `S0`, `S1` and `CAM-3` | `24_MODELS_IN_SIMULATOR_NATURAL_PIT_AND_MAP.md` | — |
| B28 | ⚪ | Tech debt | `initialCrewSnapshots` in `shared/src/types/crew.ts` still uses the old spawn offset for the player (overridden at runtime); translate the English-only cartographic labels of the map; re-check the decorative robots against the new base layout | — | — |
