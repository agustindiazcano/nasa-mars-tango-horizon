# Last context

**Date:** 2026-11-27 (Argentina)

## Work done

- Slide panels have no background any more (`overlay.css`): the 3D scene shows through and text carries a dark outline and shadow (graph text uses `paint-order` stroke).
- Icon set: 58 line-art icons in `web/src/demo/icons.ts` (draw-in animation), used by card titles and bullets, stat chips, grid chips, graph boxes (by id), lower thirds and voice lines (by speaker). The list and per-slide use are in `docs/slides/ICON_LIST.md`.
- New overlay kind `glow` (`overlays.ts`, `overlayLayer.ts`): adds `.th-glow` to a live HUD element (CSS selector) and shows a callout with icon and label beside it.
- New scene `U1` (helmet UI and voice demo, 48 s, after `A1`): first-person view of the walking player (`world/uiTourScript.ts`, run by `runHelmetTour` in `main.ts`), gaze moves crew-4, sky, rover-3, drone. Glow tour: `#hud-top`, `#hud-left`, `#hud-right`, `#hud-crew`, `#hud-bottom`. Then scripted voice orders: rover-3 lifts rock `T2` (`FleetProc.liftOnSample`), drone-1 flies to the player, rover-2 moves, questions on air pressure and suit status. New scene fields `showHud` and `pov`; the scene panel keeps the HUD on for `showHud` scenes. The player, rovers and rock are restored when the scene ends.
- Deck limit in the footage-length test raised to 11 min (deck is about 10.3 min with `U1`).
- Checked live (dev server on port 5180, since 5174 serves another project): glow callouts, FPS view with crew-4 ahead, drone arriving, voice lines, icons in `A1`. Not checked: arm lifting the rock close up, glow ring on bright sky at full pace.

## Files touched

`web/src/demo/*`, `web/src/world/{fleetProc,sceneDirector,uiTourScript}.ts`, `web/src/hud/scenePanel.ts`, `web/src/main.ts`, `shared/src/i18n/*.ts`, `docs/slides/ICON_LIST.md`.

## State

Branch `feat/demo-voice-flow-diagrams`, changes committed, not pushed. Not updated: the video script, the slide deck and `site/src/data/slidesDeck.ts` do not mention `U1`.
