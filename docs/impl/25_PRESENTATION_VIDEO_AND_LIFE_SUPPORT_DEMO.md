# 25. Presentation video, scripted demos and life-support launch (plan)

Goal: a 5 to 6 minute video (up to 10 minutes is acceptable) made of clean simulator takes with animated overlay slides on top. Everything plays from one button, deterministic, without a live LLM or microphone.

## Current state (audit)

| Piece | State | Detail |
|---|---|---|
| Drone and rescue robot arrival | Exists | Scenes `S2`-`S6` (`rescueScenario.ts`), narration with coordinates in the agent chat |
| Life-support cannon | Partial | `life-support-cannon.glb` is static: no firing, recoil or smoke |
| Pod in flight | Partial | Orange cylinder, parachute dome, arc, landing ellipse and 15 m keep-out ring (`podBallistics.ts`) |
| Pod contents | Missing | No model or animation of O2 COPV, LiOH scrubber, battery or suit patch; only the HUD panel and a text alert |
| Pod launch in the scripted rescue | Missing | The scenario writes the trajectory in text; the pod is launched only by voice or agent action (`onLaunchPod`) |
| Mock conversation | Missing | The agent chat runs the real LLM or the offline engine |
| Explanatory slides | Missing | Only the English `.pptx` (8 slides) exists, with stale ML metrics |

## Design

- `web/src/demo/` module: a timeline runner (`atS` steps: card, chat line, camera, fleet action, pod event), an overlay layer with CSS animations, and demo definitions. Triggered from the scene panel and `?demo=` links.
- Overlay slides are transparent cards over the live take so the 3D scene stays visible; the same cards can be recorded with the scene panel `REC` button.
- The scripted voice exchange reuses the HUD transcript and agent chat (`store`, `AgentChat`) with fixed lines; fleet actions use `fleet.dispatchTo`.
- Life-support demo: cannon fire effects, existing `PodBallistics.launch`, a pod detail model built in code (replaceable by an owner GLB), a landing and open-hatch animation of the four payload items, and the HUD life-support panel recovering after `sealSuitLeak`.

## Status

B31, B33-B39 are implemented (see `LASTCONTEXT.md`). Open: B32 (merge order), B40, recording and live checks (B41), optional upgrades (B42).

## Tasks

| # | Priority | Task | Depends on |
|---|---|---|---|
| B31 | 🔴 | Correct stale ML metrics in the `.pptx`, `SLIDES.md`, scripts and `site/src/data/slidesDeck.ts` using `README.md` values | none |
| B32 | 🔴 | Merge open PRs in order: #63 Starship, #64 buildings, #66 rotors, #65 README | none |
| B33 | 🔴 | Demo timeline runner and animated overlay cards | none |
| B34 | 🔴 | Mock voice conversation demo: spoken order, agent reply, drone and rescue robot dispatch, coordinates | B33 |
| B35 | 🔴 | Life-support demo: cannon firing effects, pod detail, flight, landing, payload animation, HUD recovery | B33 |
| B36 | 🟡 | Animated slides: cover (AI models, technologies, multi-agent, voice), architecture diagram, astronaut health monitoring, three ML models, closing | B33 |
| B37 | 🟡 | Trim redundant takes in `sceneDirector.ts` (S0+S1 merge, shorter S2/S3/S4/S6) | none |
| B38 | 🟡 | English and Spanish scripts for the 6 minute video, with take and slide timing | B34, B35, B36, B37 |
| B39 | 🟢 | Replace stale "rockets" wording in `site/src/data`, Spanish 3 minute script and slide outline | B32 |
| B40 | ⚪ | Remove the stale `models/mro.glb` entry in `web/public/data/provenance.json` (fixes `provenance.test.ts`) | none |

## Storyboard (about 6:00)

| Time | Screen | Background |
|---|---|---|
| 0:00-0:25 | Cover | Starship and base take |
| 0:25-0:50 | The problem: 4 to 24 minute delay | Base in dust |
| 0:50-1:30 | Multi-agent architecture diagram | Base aerial |
| 1:30-2:30 | Mock conversation, drone and robot arrive, coordinates | S2-S4 |
| 2:30-3:15 | Life-support launch | Cannon and pit |
| 3:15-4:00 | Astronaut health monitoring | HUD bio-twin |
| 4:00-5:15 | Three ML models | Terrain, storm, Curiosity photo |
| 5:15-5:45 | Cooperative rescue and return | S5-S7 |
| 5:45-6:00 | Closing and links | Starship |
