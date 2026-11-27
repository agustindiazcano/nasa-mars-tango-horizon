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
| B29 | 🟡 | Plan 24 | B29 remains open: visually inspect rescue scenes S0-S7, cannon muzzle alignment (current origin is module center at placement.y + 2.96 m; solver uses target/wind heading and 45-degree elevation independently of the GLB; measure a muzzle point/axis on the single-mesh asset before changing it), live drone ground contact on slopes and rover/drone orientation (both rover models already use +90-degree catalogue yaw; movement behavior unchanged), and model-1 clearance beside the garage. Browser/Windows control was unavailable during the production check. Drone rotor animation is done (see `LASTCONTEXT.md`); only its live visual check remains | `24_MODELS_IN_SIMULATOR_NATURAL_PIT_AND_MAP.md` | — |
| B30 | 🟡 | Plan 24 | Visually check the restored Starship complex (stack on the mount, tower, ground contact on the graded pad) and scenes `S0`, `S1` and `CAM-3` with their original framing | `24_MODELS_IN_SIMULATOR_NATURAL_PIT_AND_MAP.md` | — |
| B32 | 🔴 | Plan 25 | Merge open PRs in order: #63 Starship, #64 buildings, #66 rotors, #65 README | — | — |
| B40 | ⚪ | Tech debt | Remove the stale `models/mro.glb` entry in `provenance.json` (fixes `provenance.test.ts`) | — | — |
| B41 | 🔴 | Plan 25 | Record the explained video (`/?present=1`, Record + Play all) and check each scene live: `S5`-`S7` after the trimmed deck order, `M2`/`M3` camera framing, `E1` closing, cannon flash and smoke at the muzzle | `25_PRESENTATION_VIDEO_AND_LIFE_SUPPORT_DEMO.md` | B32 |
| B42 | 🟡 | Plan 25 | Optional: replace the code-built pod with an owner GLB, add barrel recoil (needs a separate barrel node in `life-support-cannon.glb`), and add voice narration audio over the scripted lines | same | owner file |
| B43 | 🟡 | Plan 25 | Update the slide deck (`docs/slides/TANGO_HORIZON_English.pptx`) and `site/src/data/slidesDeck.ts` for the new scenes (`W1`, `R1`, `L0`, `T1`, `T2`); check `R1` and the `S5` and `S7` dialogue live | `25_PRESENTATION_VIDEO_AND_LIFE_SUPPORT_DEMO.md` | — |
| B44 | 🟢 | Plan 25 | Storm sequence is limited to two astronauts (SALERNO and crew-4 in `T2`) and grounded drones; a larger march to the base shelter with drones or robots assisting needs a new scenario segment; the launch-site plinths (`launchSiteProc.ts`) still show dark slabs | `25_PRESENTATION_VIDEO_AND_LIFE_SUPPORT_DEMO.md` | — |
| B28 | ⚪ | Tech debt | `initialCrewSnapshots` in `shared/src/types/crew.ts` still uses the old spawn offset for the player (overridden at runtime); translate the English-only cartographic labels of the map; re-check the decorative robots against the new base layout | — | — |
