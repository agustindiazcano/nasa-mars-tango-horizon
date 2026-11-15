# Pending frontend tasks (`web/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> All target frontend code is tracked for `web/` (consuming `@th/shared`). The active runtime code lives in `web/` (the former `web-test-3d/`, migrated under `B22`); `F1`–`F15` were reconciled against it on 2026-11-15 (see below).
> When a frontend task is completed, remove it from the table and mention it in `LASTCONTEXT.md`.

## Frontend reference plans

| Plan / Guide | Scope in `web/` |
|---|---|
| `docs/3D_AND_VISUAL_PLAN.md` | Master 3D and visual specification (scene, shaders, terrain layers, cameras, actors, HUD, acceptance checklist) |
| `docs/EXECUTION_PLAN_ORDER.md` | Step-by-step execution order and prompts (Steps 1, 5, 6, 7, 8, 10, 12, 13, 14, 14b, 15, 16, 17, 18, 20) |
| `docs/impl/01_SCAFFOLD.md` | `web/` workspace setup (`package.json`, `vite.config.ts`, `index.html`, `remote.html`) |
| `docs/impl/04_TERRAIN_HELMET_HUD.md` | Three.js scene, real HiRISE terrain mesh (`terrain.ts`), sky shader (`sky.ts`), first-person `Astronaut`, helmet `#visor`, curved CSS 3D HUD, `HudPointer`, provenance cards (`data-src`), layer blending |
| `docs/impl/14_I18N.md` | Reactive UI translation (`t()`, `setLang`) across all HUD strings, cards, and alerts |
| `docs/impl/06_PHONE_REMOTE.md` | Mobile pointer/trackpad/PTT client (`web/remote.html`, `web/src/remote/remote.ts`) and screen QR receiver (`web/src/remote/screen.ts`) |
| `docs/impl/07_VOICE.md` | Web Speech API capture (`listen.ts`), `<5 ms` local critical intents (`localIntents.ts`), Web Audio neural TTS playback + Quindar tones + 32-band FFT canvas |
| `docs/impl/09_SCENARIOS_WORLD.md` | `SimClock`, `Scenario` runner (`storm`, `sep2017`, `leak`), GPU dust particles (`createDust`), `Unit` fleet controller + NASA GLB models, 20 Mars `BASE` 3D modules + technical cards + resource balance panel, Curiosity traverse + photo waypoints, route polylines, `DECK` (`1`–`0`, `H` hide) |
| `docs/impl/11_HYDRATION_PROSPECTOR.md` | Hydration prediction & uncertainty terrain layers (`hydration_1024.png`, `hydration_unc_1024.png`) + real MSL DAN circles + legend |
| `docs/impl/12_MANIPULATOR_ROBOT.md` | Manipulator rover `manip-1` ("HANDS"): 4-wheel chassis, mast camera, procedural 4-DOF `Arm` with analytic 2-bone IK (`arm.ts`), `SkillRunner` (`drill`, `sample`, `photograph`, `handover`), standalone IK test page, offscreen `512×384` camera target with `T1..Tn` markers |
| `docs/impl/13_STORM_NOWCASTER.md` | HUD 3-sol storm forecast fan chart (observed series + median + 80% band `q10..q90` + Go/No-Go verdict) |
| `docs/impl/15_VEIN_DETECTOR.md` | HUD overlay for real Curiosity Mastcam/MAHLI photos with `256×256` DINOv2 patch heatmap (`*_heat.png`), peak `(u, v)` marker, probability readout, and one-page human label review tool |

## Reconciliation of F1–F15 against `web/` (2026-11-15)

Status from a code audit of `web/src`. "Done" means the code exists; live visual checks stay under `B37`.

| Task | Status | Evidence / gap |
|---|---|---|
| F1 | Done | `web/package.json`, `vite.config.ts` with `index.html` and `remote.html`, `VITE_API_URL` helper in `src/api.ts`, `three`, `qrcode` |
| F2 | Done | `terrainProc.ts`, `terrainLoader.ts`, `terrainRasters.ts`, `astronautProc.ts`, `state.ts`, `skyDust.ts` |
| F3 | Done | `hud.ts`, `hud.css` (flat amber redesign replaced the curved CSS 3D panels), minimap, layer switcher, provenance modal |
| F4 | Done | `setLang` wired across the HUD; EN/ES/FR/DE/IT dictionaries (PR #28) |
| F5 | Done | `remote.html`, `phoneClient.ts`, `screenRelay.ts` (QR, haptics, `invx`) |
| F9 | Done | Hydration layers, DAN points and legend in `terrainRasters.ts`, `hud.ts` |
| F10 | Done | `manipulatorArm.ts` (IK, `SkillRunner`), offscreen camera in `fleetProc.ts` |
| F12 | Done | Trace/swarm panel, `ask_human` confirmation, `GUARDIAN` verdicts in `hud.ts`, `state.ts` |
| F6 | Done | 32-band FFT canvas in the voice HUD (`speak.ts` analyser, `hud.ts`) |
| F8 | Done | Storm forecast fan chart and EVA verdict in the right panel (`stormForecast.ts`); the q10–q90 band shows its held-out coverage (44–52 %, below the nominal 80 %) |
| F15 | Done | FR/DE/IT dictionaries and `ASR_LOCALE`/`TTS_LOCALE` used in `listen.ts`, `speak.ts` |
| F7, F11, F13, F14 | Partial | Remaining work in the table below |

## Pending tasks

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| F7 | 🟡 | Step 10 | Check the `leak` sequence against §5.4/§6.2 (hypoxia/Armstrong countdowns, RK4 pod trajectory, `rescue-1` dispatch); no `SimClock` class exists, scenario time lives in `state.ts` and `main.ts` | `09_SCENARIOS_WORLD.md`, `3D_AND_VISUAL_PLAN.md` §5.4, §6.2 | — |
| F11 | 🟡 | Step 14b | Build the Vein Detector HUD overlay (`*_heat.png`, peak marker, probability and validation metrics) and the one-page human label review tool; `public/data/veins/` exists | `15_VEIN_DETECTOR.md` | — |
| F13 | 🟡 | Step 16 | Reach the full 9-unit fleet (6 `FLEET_SPECS` units plus the MRO orbiter today) and confirm the Base Resource Balance panel and route algorithm badges | `09_SCENARIOS_WORLD.md`, `3D_AND_VISUAL_PLAN.md` §5.2, §5.5, §5.6 | — |
| F14 | 🟢 | Step 17 | Remaining extras: 5 cinematic cameras (`CAM-1`..`CAM-5`), Casson bio-twin panel, Sky-Crane Kevlar tether and 532 nm LiDAR cone (science stations, LIBS and post-processing already exist) | `09_SCENARIOS_WORLD.md`, `12_MANIPULATOR_ROBOT.md`, `3D_AND_VISUAL_PLAN.md` §2.3, §4.2, §5.4 | F13 |

## NASA data audit priority

- 🟢 F16: Runtime remediation in `web/` (`B32`–`B36`, `B25`) is code-complete and verified under Node/Vitest (explicit DEM startup/lifecycle, flat `BASE_ORIGIN` and `@th/shared` `MISSION_SITES`, `8x8` adaptive LOD mesh over `height_2048.u16`, real `1024px` terrain rasters + 377 `in_scene` DAN points, `hydration_index` units, `N`/`S` coordinates, CTX/HiRISE datum audit, and dynamic Provenance modal). Remaining work is live browser DOM/WebGL visual verification (tracked under `B37`).
