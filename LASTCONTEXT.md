# Last context

**Date:** 2026-11-26 (Argentina)

## Work done

- Restored the Starship (owner request): reverted `b758c44`, which brings back `rocket.glb`, its manifest/`ModelId`/spec entries, the procedural stack, launch mount, tower and label in `launchSiteProc.ts`, the original `S0`/`S1`/`CAM-3` framing and the "Starship" i18n strings. The `rockets` GLB is no longer used on the pad.
- Restored `docs/media/starship-pad.jpg` and `starship-distance.jpg` from history.
- Added slide 6 "Starship on Mars" to `docs/slides/TANGO_HORIZON_English.pptx` (now 8 slides). Eyebrow numbers, footer counters (`/08`) and timings were shifted; slide 5 now ends at 01:50.
- Restored `asset-1..3` (inflatable habitat, lab with ramp, twin domes) from history on branch `feat/restore-nasa-buildings`: greenhouse uses `asset-1`, lab `asset-2`, shelter `asset-3`; footprints back to 18x11.45, 14x8.5, 14x4.97 m. Checked in the model lab contact sheet and the aerial base view; no close-up shot of the three buildings yet. `provenance.test.ts` was already failing (stale `models/mro.glb` entry).
- Drone rotors (`drone-new`): `tools/assets/split-drone-rotors.mjs` splits the fused scan mesh into a body plus eight `rotor_<corner>_<layer>` pivot nodes (two coaxial layers on each of four arms); `collectDroneRotorPivots` in `nasaModels.ts` feeds `fleetProc.ts`, which spins them (32 rad/s flying, 0.5 rad/s landed, alternating sense in `node.extras.spinDir`). The original blades are reused, no substitute rotors. A few tiny scan fragments near the hubs were not moved; GLB grew from 0.66 to 1.0 MB. Checked in the model lab with a rotated debug build and in the running app (8 pivots, correct senses); live spin not filmed.
- Explained video (plan 25): `web/src/demo/` overlay layer (cards, agent flow, scripted voice conversation, coordinates chip, lower thirds, scripted life-support panel) and nine new scenes `C0 P0 A1 V1 L1 H1 M1 M2 M3 E1` in `demoScenes.ts`; `Play all` now plays `DECK_ORDER` (about 6 min, `S0`-`S4` stay selectable). Scene `L1` fires the cannon at 4 s (flash, smoke), the pod flies about 34 s, opens and lifts its four payload items. ML metrics in slides and scripts now match the README. Script: `docs/slides/VIDEO_SCRIPT_6MIN.md`. Viewed live: `C0`, `A1`, `V1`, `L1`, `H1`, `M1`.
- `tsc --noEmit` on `web/` and `modelLibrary.test.ts` pass. CI not run yet.

- Merged `main` (site navbar iPhone glass styling, PR #62) into this branch.

## Files touched

`web/src/world/*`, `web/public/models/*`, `shared/src/i18n/*.ts`, `shared/src/physics/sites.ts`, `docs/slides/*`, `docs/media/`, `docs/impl/24_*`.

## State

The new slide was not rendered (no PowerPoint/LibreOffice on this machine); check layout in PowerPoint. The live visual check of the pad was not done. Not updated: the Spanish script, `site/src/data/slidesDeck.ts` and the READMEs still say "rockets".
