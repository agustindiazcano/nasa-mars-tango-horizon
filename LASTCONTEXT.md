# Last context

**Date:** 2026-11-15

## Summary of work done

Implemented three updates on `feat/nasa-glb-models` (branched from `origin/main` at `474c3d1`):

- **NASA GLB asset integration (`341f8ec`, `611b58e`):** Copied Three.js Draco glTF decoders to `web/public/draco/gltf/`, added `web-test-3d/src/world/nasaModels.ts` (`loadNormalizedNasaGlb`, `extractIngenuityRotorPivots`), and wired `/models/rover.glb` (`rover-2`), `/models/ingenuity.glb` (`drone-1`/`drone-2`), and `/models/mro.glb` (`mro-orbiter` orbital pass) into `web-test-3d/src/world/fleetProc.ts` with fallback to procedural geometry (`nasaModels.test.ts`).
- **Base anchoring & fleet clearance (`9eb4f06`):** Added `3.6 m` foundation plinths (`BoxGeometry`) under all base modules in `web-test-3d/src/world/baseProc.ts` so buildings sit flush into Gale Crater micro-relief (`4–12 m`), and moved `rover-1` (`-30, 24`) and `rescue-1` (`-16, 24`) in `shared/src/physics/sites.ts` (`FLEET_START_OFFSETS`) to clear `garage` (`-26, 12`).
- **Half-Life FPS controls & aerial isometric camera (`f156564`):** Fixed `web-test-3d/src/world/astronautProc.ts` so 1st-person `WASD` strafes/backpedals relative to camera `yaw` without snapping aim, added crisp ground acceleration/friction, bumped sensitivity to `0.0028` rad/px and camera FOV to `72` (`web-test-3d/src/main.ts`), split 60+ FPS `updateMovement(dt)` from 10 Hz `computeBioMetrics()`, and added `"iso"` aerial base overview mode (`#btn-iso` button in `web-test-3d/src/hud/hud.ts`, `KeyV` shortcut, `WASD` pan, wheel zoom `10–1800 m`, left-drag orbit, right/middle/Shift-drag pan, drag guard via `consumeWasDragged()`), localized in all 5 dictionaries (`web-test-3d/src/core/i18n.ts`) and covered by `web-test-3d/src/world/__tests__/astronautControls.test.ts`.
- **NASA DEM provenance check:** Audited `web/public/data/terrain/height_2048.u16` and `meta.json` (`DTEEC_009149_1750_009294_1750_U01`, `4000×4000 m`, Gale Crater `-4.745°, 137.400° E`), confirming `BASE_ORIGIN (210, -495)` is the flattest `100×100 m` basin in the tile (`2.51°` mean slope, `4.61 m` relief).

## Decisions made

- Kept `BASE_ORIGIN` at `(210, -495)` instead of flattening the real HiRISE DEM or relocating onto steeper northern plains (`4.13°` mean, `18.12°` max slope), using structural foundation plinths to absorb local relief.
- Preserved `Space` for voice Push-to-Talk in `main.ts` rather than binding jump.

## Where the work was left

- Branch `feat/nasa-glb-models` passes `@th/web-test-3d` `tsc --noEmit && vite build`, `web-test-3d` Vitest (`9 files / 148 tests`), and `shared/src/physics/__tests__/sites.test.ts` (`4 tests`), ready for PR to `main` and live visual inspection (`B37`).
