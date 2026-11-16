# Last context

**Date:** 2026-11-15 (Argentina)

## Work done

- Removed the Starship from the project: `rocket.glb` and its manifest/`ModelId`/spec entries, the procedural stack, launch mount, tower and label in `launchSiteProc.ts`, the two Starship README screenshots, and every text mention (i18n, docs, README, `site/` data).
- The launch pad at `LAUNCH_SITE_COORD` now shows the generic `rockets` GLB (14 m catalogue size, scaled x3 on the pad). Pad slab, tank farm, bunker and floodlights stay.
- Scene `S0` is now "Rockets at the pad" (i18n key unchanged). `S0`/`S1` camera shots and `CAM-3` were moved to the smaller model scale.
- Removed the simulator gallery (screenshots table) from `README.md` and `README_ES.md`. Image files in `docs/media/` (except the two Starship ones) stay in the repo.
- Owner requested PR, merge and Vercel deployment without tests or CI (urgent). Only `tsc --noEmit` on `web/` was run.

## Files touched

`web/src/world/launchSiteProc.ts`, `sceneDirector.ts`, `cinematicCams.ts`, `modelLibrary.ts`, `__tests__/modelLibrary.test.ts`, `web/public/models/manifest.json`, `shared/src/i18n/*.ts`, `shared/src/physics/sites.ts`, READMEs, `docs/`, `site/src/data/`.

## State

Live visual check of the pad with the `rockets` model (scale, ground contact, S0/S1/CAM-3 framing) was not done.
