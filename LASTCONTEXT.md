# Last context

**Date:** 2026-11-26 (Argentina)

## Work done

- Restored the Starship (owner request): reverted `b758c44`, which brings back `rocket.glb`, its manifest/`ModelId`/spec entries, the procedural stack, launch mount, tower and label in `launchSiteProc.ts`, the original `S0`/`S1`/`CAM-3` framing and the "Starship" i18n strings. The `rockets` GLB is no longer used on the pad.
- Restored `docs/media/starship-pad.jpg` and `starship-distance.jpg` from history.
- Added slide 6 "Starship on Mars" to `docs/slides/TANGO_HORIZON_English.pptx` (now 8 slides). Eyebrow numbers, footer counters (`/08`) and timings were shifted; slide 5 now ends at 01:50.
- `tsc --noEmit` on `web/` and `modelLibrary.test.ts` pass. CI not run yet.

- Merged `main` (site navbar iPhone glass styling, PR #62) into this branch.

## Files touched

`web/src/world/*`, `web/public/models/*`, `shared/src/i18n/*.ts`, `shared/src/physics/sites.ts`, `docs/slides/*`, `docs/media/`, `docs/impl/24_*`.

## State

The new slide was not rendered (no PowerPoint/LibreOffice on this machine); check layout in PowerPoint. The live visual check of the pad was not done. Not updated: the Spanish script, `site/src/data/slidesDeck.ts` and the READMEs still say "rockets".
