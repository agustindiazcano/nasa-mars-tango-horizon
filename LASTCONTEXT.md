# Last context

**Date:** 2026-11-26 (Argentina)

## Work done

- Removed the yellow LiDAR coverage discs (`lidarRing.ts` deleted) and the green LiDAR cone under the drones in `fleetProc.ts`.
- New overlay kind `graph` (`web/src/demo/overlays.ts`, `overlayLayer.ts`, `overlay.css`): animated decision diagram with boxes and arrows that appear in order, travelling pulses and robot markers moving over a schematic top-view map. Deterministic from scene time.
- Voice dialogue is larger (32 px, 28 px beside a graph; the stack moves to the right when a graph is shown).
- New scenes: `W1` voice order to drone (astronaut point of view via the new `lookAt` shot field, graph `voice -> VOICE-EXEC -> BASE -> ROBOT -> GUARDIAN -> fly_to`), `R1` rescue flow (graph with rescue-1, drones and robot on the map), `L0` life-support flow slide that now plays before the cannon takes `L1`.
- Rescue dialogue overlays added to `S5`, `S6`, `S7` (texts taken from the rescue events).
- `DECK_ORDER`: C0 P0 A1 W1 G1 V1 R1 L0 L1 H1 F1 M1 M2 M3 S5 S6 S7 E1 (about 9.5 min; the footage-length test limit is now 10 min). Scene names added in the five languages (`@th/shared` must be rebuilt for the web dev server: `npm run build -w shared`).
- Checked live: `W1` and `L0` (graph, dialogue, drone leaving in the astronaut view, no LiDAR discs). Not checked live: `R1`, the `S5`-`S7` dialogue, the drones without the green cone.
- `tsc --noEmit` and vitest (`web/src/demo`, `web/src/world`, `shared`) pass. CI not run yet.

- Second round (same branch): opening trimmed (`C0` 14 s, `P0` 11 s with a cut to the rover); `A1` is now an animated hub graph (astronaut, VOICE-EXEC, BASE, four specialists, robot planners, GUARDIAN, simulator). New scenes `T1` (storm alert from a satellite-style top view) and `T2` (helmet view of SALERNO walking to rescue-1, then the robot towing the casualty). New overlay kinds `image` (the rescue robot towing the casualty, shown in `R1`, `S5`, `S6`) and `visor` (helmet frame, also in `W1`). The storm is darker (sun, ambient, fog and sky in `skyDust.ts`).
- Removed the black plinth under every base module (`baseProc.ts`); modules sit 0.25 m into the graded pad. Checked live: domes sit on the ground. The launch-site plinths (`launchSiteProc.ts`) were not touched.
- Gold "Impact Category winner" badge in the HUD top bar (five languages) and the certificate image in both READMEs (`docs/media/impact-winner-certificate.jpeg`).
- Project logo in the HUD top bar and as a corner watermark during takes; the cover and closing slides show the README banner (`web/public/images/th-banner.jpg`).
- Left and right arrow keys step to the previous or next scene while a take or presentation runs (`SceneDirector.step`, `ScenePanel`).
- Loading screen: the falling numbers and letters canvas is gone; the logo is larger and rotates slowly.
- Not done: several astronauts walking to a shelter with drones assisting (the rescue scenario only moves SALERNO and the robot towing DIAZ-CANO; drones are grounded by then); a live check of `T2`, `R1` and the darker storm.

## Files touched

`web/src/demo/*`, `web/src/hud/*`, `web/src/world/{fleetProc,sceneDirector,baseProc,skyDust}.ts`, `web/public/images|media`, `shared/src/i18n/*.ts`, `README*.md`.

## State

Branch `feat/demo-voice-flow-diagrams`. The map markers are schematic and time compressed (`R1`); the drone token in `W1` follows the real drone timing. Not updated: the video script (`docs/slides/VIDEO_SCRIPT_6MIN.md`) and the slide deck do not mention `W1`, `R1`, `L0` yet.
