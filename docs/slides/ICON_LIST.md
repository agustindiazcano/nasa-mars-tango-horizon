# Slide icon list

Icons are line art on a 24 x 24 grid, drawn in code in `web/src/demo/icons.ts` (`ICONS`, `iconSvg`, `speakerIcon`). They draw in with a short stroke animation. Overlay fields that take an icon name: `icon` (card title, lower third, grid chip, stat, graph box, glow callout) and `bulletIcons` (one per bullet). Voice lines pick an icon from the speaker (`speakerIcon`); graph boxes pick one from the box id (`NODE_ICON` in `overlayLayer.ts`).

## Icon set (58)

| Group | Icons |
|---|---|
| Crew and suit | `astronaut`, `helmet`, `heart`, `oxygen`, `pressure`, `battery`, `thermometer`, `lungs`, `dna` |
| Robots and vehicles | `drone`, `rover`, `roverArm`, `rescue`, `robot`, `cannon`, `pod`, `parachute`, `base`, `rocket` |
| Environment | `storm`, `wind`, `sun`, `radiation`, `planet`, `satellite`, `waterdrop`, `rock`, `vein`, `mountain` |
| Software and AI | `brain`, `chip`, `mic`, `voicewave`, `shield`, `vote`, `human`, `route`, `map`, `eye`, `camera`, `book`, `search`, `phone`, `globe`, `radio`, `offline`, `wrench`, `gear`, `drill`, `chart`, `clock`, `alert`, `check`, `signal`, `flask`, `layers`, `target`, `hud` |

## Use per slide

| Scene | Where icons appear | Icons |
|---|---|---|
| C0 Cover | Five stat chips; the Tango Horizon patch and the partner logos replace the old banner picture | `brain`, `flask`, `robot`, `layers`, `globe` |
| K1 Capabilities | Twelve chips: every core feature of the README | `mic`, `brain`, `shield`, `rescue`, `pod`, `heart`, `book`, `wrench`, `satellite`, `eye`, `flask`, `map` |
| Q1 Predictive RAG | Title, four bullets, three stats | `book`; `heart`, `wrench`, `storm`, `check`; `layers`, `book`, `clock` |
| P0 Problem | Title, three bullets | `clock`; `radio`, `mic`, `alert` |
| A1 Architecture | Ten graph boxes, voice lines | `astronaut`, `voicewave`, `base`, `heart`, `route`, `storm`, `wrench`, `robot`, `shield`, `planet` |
| U1 Helmet UI | Five glow callouts, voice lines | `hud`, `heart`, `storm`, `astronaut`, `mic` |
| W1 Voice to drone | Graph boxes, voice lines, lower third | box icons by id; `voicewave` |
| G1 Decisions | Voice lines (speaker icons) | `shield`, `vote` |
| F1 Everything else (not in the deck order, replaced by K1) | Twelve chips | `phone`, `eye`, `roverArm`, `drone`, `satellite`, `route`, `layers`, `wrench`, `storm`, `book`, `mic`, `offline` |
| V1, R1, L0, L1 | Lower thirds, graph boxes, voice lines | `rescue`, `drone`, `base`, `pod`, `cannon`, `heart`, `shield`, `robot` |
| H1 Health | Title, five bullets | `heart`; `heart`, `chart`, `alert`, `dna`, `book` |
| M1-M3 ML models | Title, three bullets each | `waterdrop` (`map`, `chip`, `chart`); `storm` (`chart`, `clock`, `check`); `vein` (`eye`, `camera`, `chart`) |
| T1, T2 Storm | Alert lower thirds | `storm`, `alert` |
| E1 Closing | Title | `rocket` |

## Candidates not drawn yet

| Icon | Use |
|---|---|
| `qr` | Phone pairing step |
| `tether` | Sky-Crane tether and LiDAR cone chip |
| `lidar` | GPS-denied navigation detail |
| `litter` | Stretcher in the rescue flow |
