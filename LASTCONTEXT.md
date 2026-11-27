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

## Files touched

`web/src/demo/*`, `web/src/world/fleetProc.ts`, `web/src/world/sceneDirector.ts`, `shared/src/i18n/*.ts`.

## State

Branch `feat/demo-voice-flow-diagrams`. The map markers are schematic and time compressed (`R1`); the drone token in `W1` follows the real drone timing. Not updated: the video script (`docs/slides/VIDEO_SCRIPT_6MIN.md`) and the slide deck do not mention `W1`, `R1`, `L0` yet.
