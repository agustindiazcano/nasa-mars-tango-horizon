# Pending frontend tasks (`web/`)

> Priority: 🔴 blocking/urgent · 🟡 next · 🟢 later · ⚪ backlog
> All target frontend code is tracked for `web/` (consuming `@th/shared`). Active runtime code currently resides in `web-test-3d/` until `B22` and `B23` in `PENDING.md` consolidate it and reconcile `F1`–`F15`.
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

## Pending tasks

| # | Priority | Step | Task | Guides | Depends on |
|---|---|---|---|---|---|
| F1 | 🔴 | Step 1 | Scaffold `web/` workspace (`web/package.json`, `web/vite.config.ts` with `index.html` and `remote.html` entries, `VITE_API_URL` helper for Vercel → Cloud Run `/api` and `/ws/remote`, `three`, `@types/three`, `qrcode`) | `01_SCAFFOLD.md`, `10_DEPLOY_SUBMISSION.md` | — |
| F2 | 🔴 | Step 5 | Build core Three.js viewer in `web/src/`: `Terrain` (`height_2048.u16`, `ortho_4096.webp`, `2048²` normal map, bilinear `heightAt`/`slopeAt`), Martian sky shader (`uTau`), `Astronaut` WASD controller, `#visor` helmet frame, global `state.ts` store | `04_TERRAIN_HELMET_HUD.md`, `3D_AND_VISUAL_PLAN.md` §2–4 | F1, Step 3 data, Step 4 physics |
| F3 | 🔴 | Step 5 | Build curved CSS 3D HUD (`hud.css`, `thresholds.ts`): Left life-support panel, Top mission/coordinates panel, Right environment panel, Bottom pointable menu, 2D minimap canvas, terrain layer switcher (`slope`, `svf`, `thermal_class`), `HudPointer`, and `data-src` provenance cards | `04_TERRAIN_HELMET_HUD.md`, `3D_AND_VISUAL_PLAN.md` §7 | F2 |
| F4 | 🔴 | Step 6 | Wire `t()` and `setLang` across all `web/` UI elements and add Language menu item (EN/ES live switch without reload) | `14_I18N.md` | F3 |
| F5 | 🔴 | Step 7 | Implement phone pointer UI (`web/remote.html`, `web/src/remote/remote.ts`) and screen QR receiver (`web/src/remote/screen.ts`) with trackpad fallback, recenter, haptics, and `?invx=1&invy=1` | `06_PHONE_REMOTE.md` | F3, Step 2 relay |
| F6 | 🔴 | Step 8 | Implement `web/src/voice/`: `Listener` (Spacebar/phone PTT + wake word), `localIntents.ts`, live HUD transcript, Web Audio TTS player with optional radio filter/Quindar tones, and FFT visualizer | `07_VOICE.md`, `3D_AND_VISUAL_PLAN.md` §7.1 | F3, F4, Step 2 |
| F7 | 🔴 | Step 10 | Implement `SimClock`, `Scenario` runner, `leak` emergency sequence (pulsing red HUD, hypoxia/Armstrong countdowns, RK4 ballistic O2 pod trajectory line & flight animation, `rescue-1` dispatch), and `demoDeck.ts` (`1`–`0`, `H` hide) | `09_SCENARIOS_WORLD.md`, `3D_AND_VISUAL_PLAN.md` §5.4, §6.2 | F3, Step 9 agents |
| F8 | 🟡 | Step 12 | Add GPU dust storm particle system (`createDust` in `storm.ts`), `storm` 60 s replay driving `uTau`, and 3-sol Storm Forecast fan chart in the Right HUD panel | `13_STORM_NOWCASTER.md`, `09_SCENARIOS_WORLD.md` | F7, Step 12 data |
| F9 | 🟡 | Step 13 | Add Hydration Prospector layer (`hydration_1024.png`), uncertainty layer (`hydration_unc_1024.png`), real DAN measurement circles on terrain/minimap, and layer legend with validation metrics | `11_HYDRATION_PROSPECTOR.md` | F3, Step 13 data |
| F10 | 🟡 | Step 14 | Build Manipulator Rover `manip-1` (`web/src/world/manipulator/arm.ts`, `skills.ts`): standalone IK test page, 4-wheel chassis + mast camera, 4-DOF arm IK, `drill`/`sample`/`photograph`/`handover` animations, and `512×384` offscreen camera target with projected `T1..Tn` markers | `12_MANIPULATOR_ROBOT.md`, `3D_AND_VISUAL_PLAN.md` §5.3 | F3, Step 9 agents |
| F11 | 🟡 | Step 14b | Build Vein Detector HUD photo/heatmap overlay (`*_heat.png`, peak target marker, probability + validation metrics) and one-page human label review tool | `15_VEIN_DETECTOR.md` | F3, F10 |
| F12 | 🟡 | Step 15 | Add HUD Agent Tree / Swarm Stream panel (delegations, tool calls, `GUARDIAN` green/red/amber verdicts, `ask_human` Confirm/Cancel prompt), `RVR-2 CAM` viewport, and 3D prompt-injection sign on terrain | `08_AGENTS_TOOLS_MCP_GUARDIAN.md`, `09_SCENARIOS_WORLD.md` | F3, Step 9 agents |
| F13 | 🟡 | Step 16 | Build 20 Mars `BASE` 3D primitive modules on `<5°` slope with selectable technical cards, fission keep-out ring, Base Resource Balance panel, full 9-unit `FLEET` (Curiosity/Ingenuity/MRO GLBs + procedural units + floating labels), `sep2017` radiation scenario, Earth-link light-time counter, Curiosity traverse + photo waypoints, and route polylines with algorithm badges | `09_SCENARIOS_WORLD.md`, `3D_AND_VISUAL_PLAN.md` §5.2, §5.5, §5.6 | F7 |
| F14 | 🟢 | Step 17 | Add extras if time permits before code freeze: science stations `S1`–`S4`, LIBS purple laser pulse + emission spectrum, Sky-Crane Kevlar tether pendulum + green 532 nm LiDAR cone, 5 cinematic cameras (`CAM-1`..`CAM-5`), hypercapnic vignette + bloom post-processing, Casson bio-twin panel | `09_SCENARIOS_WORLD.md`, `12_MANIPULATOR_ROBOT.md`, `3D_AND_VISUAL_PLAN.md` §2.3, §4.2, §5.4 | F10, F13 |
| F15 | 🟢 | Step 18 | Wire French, German, and Italian dictionaries into the HUD Language menu and voice selector | `14_I18N.md`, `07_VOICE.md` | F4, F6 |
