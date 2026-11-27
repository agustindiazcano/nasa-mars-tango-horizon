# Last context

**Date:** 2026-11-27 (Argentina)

## Work done

- Slide panels have no background any more (`overlay.css`): the 3D scene shows through and text carries a dark outline and shadow (graph text uses `paint-order` stroke).
- Icon set: 58 line-art icons in `web/src/demo/icons.ts` (draw-in animation), used by card titles and bullets, stat chips, grid chips, graph boxes (by id), lower thirds and voice lines (by speaker). The list and per-slide use are in `docs/slides/ICON_LIST.md`.
- New overlay kind `glow` (`overlays.ts`, `overlayLayer.ts`): adds `.th-glow` to a live HUD element (CSS selector) and shows a callout with icon and label beside it.
- New scene `U1` (helmet UI and voice demo, 48 s, after `A1`): first-person view of the walking player (`world/uiTourScript.ts`, run by `runHelmetTour` in `main.ts`), gaze moves crew-4, sky, rover-3, drone. Glow tour: `#hud-top`, `#hud-left`, `#hud-right`, `#hud-crew`, `#hud-bottom`. Then scripted voice orders: rover-3 lifts rock `T2` (`FleetProc.liftOnSample`), drone-1 flies to the player, rover-2 moves, questions on air pressure and suit status. New scene fields `showHud` and `pov`; the scene panel keeps the HUD on for `showHud` scenes. The player, rovers and rock are restored when the scene ends.
- Deck limit in the footage-length test raised to 11 min (deck is about 10.3 min with `U1`).
- Checked live (dev server on port 5180, since 5174 serves another project): glow callouts, FPS view with crew-4 ahead, drone arriving, voice lines, icons in `A1`. Not checked: arm lifting the rock close up, glow ring on bright sky at full pace.

- Cover and closing: the banner picture (`th-banner.jpg`, deleted) is replaced by the Tango Horizon patch (`web/public/images/th-patch.png`, circular, transparent), a text title taken from the README ("Tango Horizon: AI Systems for EVA and Mars Exploration" and a multi-agent description) and a partner logo row (`logos` overlay kind; logos cropped from the banner into `web/public/images/logos/*.png` with transparent background). The patch is also the corner brand on every slide. The patch ring still shows the four surnames (it is the project logo).
- New slides `K1` (all 12 core capabilities, from the README) and `Q1` (predictive RAG for health, maintenance and weather); `F1` leaves the deck order because `K1` covers it. The 5-language scene names are added.
- Presentation text uses "astronaut" instead of crew surnames; the scripted agent narration (`narr.*`) and the HUD roster still use the callsigns.
- Crew roster in two lines per astronaut, wide scenes panel, styled scrollbars, crosshair cursor and pointing-hand cursor, Mars favicon (branch `feat/styled-scrollbars`).

- Smoother rescue takes: the scenario view is interpolated between its 0.1 s steps (`RescueScenario.setFrameOffset`, `timeS`), the director uses that smooth time, and the camera look-at follows tightly (`TARGET_RATE`).
- New scene `O1`: big map of the zone (HUD cartography in a `map` overlay, live fleet and crew, rescue-1 route found by A* in `operationRoute()` in `main.ts`). `V1` (22 s), `R1` (29 s) and `W1` (38 s) are shorter; `G1` keeps two of the three decisions (37 s). New `ML1` replaces `M1`-`M3` in the deck.
- Deck order: C0 P0 | U1 W1 A1 K1 G1 | H1 T1 O1 V1 R1 L0 L1 T2 S5 S6 S7 | Q1 ML1 E1 (about 9.9 min). `F1`, `M1`-`M3` stay selectable but leave the deck.
- First-person takes (`pov: "1st"`: `U1`, `W1`, `T2`) hide all floating name tags (`setWorldLabels`); the visor label of `U1` is removed.
- `U1`: the walk avoids rocks (`pushOut`), the orders type into the live HUD chat with processing badge and trace, rover-2 comes closer, chat bubbles have a dark translucent background.

## Files touched

`web/src/demo/*`, `web/src/world/{fleetProc,sceneDirector,uiTourScript}.ts`, `web/src/hud/scenePanel.ts`, `web/src/main.ts`, `shared/src/i18n/*.ts`, `docs/slides/ICON_LIST.md`.

## State

Branch `feat/demo-voice-flow-diagrams`, changes committed, not pushed. Not updated: the video script, the slide deck and `site/src/data/slidesDeck.ts` do not mention `U1`.
