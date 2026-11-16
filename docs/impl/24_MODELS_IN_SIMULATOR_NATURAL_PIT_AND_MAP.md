# 24. Optimized models in the simulator, base design, natural pit, NASA-style map (plan)

**Goal:** the optimized GLBs from plan 23 (`web/public/models/`, 19 files, 15.8 MB) become the visible world of the simulator; the rescue pit looks like a natural sinkhole; the astronaut can ask for a realistic NASA-style map with the position of everything; the rockets pad is visible near the base and in a recorded scene.

**Read first:** `AGENTS.md`, plans 22 (rescue) and 23 (assets), `web/public/models/manifest.json`, `web/src/world/nasaModels.ts`.
**Owner decisions (2026-11-15):** all models are created by the project owner (personal use, all rights held). "Rover" means a large transport or uncrewed vehicle. The injured astronaut is DIAZ-CANO; SALERNO is the other expedition member; SOTELO and YACONIS are at the base. The pit is a designed natural-looking sinkhole, not a real DEM feature.

## 1. Model map

| Model | Role in the simulator |
|---|---|
| `astronaut-animated` | The four crew members (SOTELO, YACONIS, SALERNO, DIAZ-CANO), one instance each with clips: `Idle_11`, `Walking`, `Running`, `Fall_Dead_from_Abdominal_Injury` (the fall into the pit), `Dead` (lying incapacitated) |
| `astronaut` (rigid) | Close-up shots only (model lab) |
| `rover-1` | Large transport rover of the science expedition (unit `rover-1`, the one that fails) |
| `rover-2` | Second large transport rover parked at the base apron (cargo/transport, uncrewed) |
| `rescue-rover` | Unit `rescue-1` |
| `rescue-robot-without-astronaut` | Unit `rescue-bot-1` (the casualty is a separate animated crew model dragged by it) |
| `rescue-robot-astronaut` | Static display piece (robot carrying an astronaut) at the garage or in a scene |
| `conae-base-mars` | Main base complex at `BASE_ORIGIN` (hero asset) |
| `asset-1` (inflatable habitat cluster), `asset-2` (lab with ramp and NASA logo), `asset-3` (twin domes with corridor), `building-1` (landing pad with long module), `building-2` (geodesic dome), `building-3` (round hub), `building-connector` (tube) | Base modules and annexes arranged around the main complex; the existing selectable module cards map to them |
| `asset-4` and `solar-panel` | Solar field (instanced) |
| `antenna` | Antenna farm (instanced, 2 to 3 units) |
| `rockets` | Generic rocket pair on the launch pad, visible from the base |

Every model keeps its procedural fallback (existing primitives) when a file fails to load. Models load asynchronously and in priority order (base and crew first), with instancing for repeated pieces.

## 2. Workstream A: models in the world and base design

- A model library (`web/src/world/modelLibrary.ts`) built on `getGltfLoader()` and `manifest.json`: normalize scale (real height where known, otherwise target size in metres per role), anchor to the ground, clone with shared geometry and materials, cache.
- Base layout redesign in `web/src/world/baseProc.ts` and `shared/src/physics/sites.ts`: place the models on flat ground (below 5 deg), keep the fission keep-out (100 m), the pod keep-out (15 m), the launcher positions and the airlock and spawn points; keep module ids selectable with their technical cards; update `BASE_MODULE_FOOTPRINTS` (rocks keep clear of them) and the tests (`terrainLodAndContact`, `sites`).
- Launch complex: the `rockets` model on the pad in `launchSiteProc.ts`; make it visible in the background of the base (S1 base aerial and a base ground shot) and add a scene `S0` "Rockets at the pad" to the scene table (`sceneDirector.ts`) plus a CAM shot.
- Fleet: swap the procedural units for the models listed above, keeping `FleetProc` hooks (`placeUnit`, pitch, ramp, bay) working with the new meshes (bay and ramp positions measured from the model bounding boxes).
- Crew: `crewProc.ts` uses `astronaut-animated` with an `AnimationMixer` and a small state machine (idle, walk, run, fall, lying), driven by the rescue scenario poses; the player astronaut keeps the first-person controller and uses the model in third person.
- Visual check in the browser for the base aerial, the launch site, the rescue scenes S3, S5 and S6, with a before/after of the frame rate.

## 3. Workstream B: natural pit and NASA-style map

- Natural pit: irregular outline (radius modulated by seeded noise around the angle, shared pure function used by both the terrain hole and the mesh), sloping crumbling walls instead of a cylinder, a talus ramp made of rubble, strata bands and the basalt rock textures from `rockTextures.ts` on the walls and floor, a darker floor with scattered rocks and boulders (boulder field at the rim through `RocksProc` extra clusters), no flange ring. Keep the rescue geometry contract (`RESCUE_PIT`, `pitSurfaceOffsetAt`) valid and the scenario tests passing; update them if the outline changes.
- NASA-style map: a large map panel (replaces the small map modal) drawn on a canvas: hypsometric tint plus hillshade from the DEM, contour lines (index contours labeled), lat/lon graticule with tick labels, scale bar, north arrow, title block ("Gale Crater, Mars - HiRISE DTM", data source from provenance), legend, and the positions of everything: base, launch complex, rescue site and pit, science stations S1 to S4, fleet units, drones, the four crew members by callsign, the active route. Style like USGS/NASA planetary cartography, not like a game minimap.
- Voice and chat command to open it: "show the map", "muéstrame el mapa", "montre la carte", "zeig die Karte", "mostra la mappa" through the local intents (instant, offline) and the server offline parser, in five languages; closing with "close the map".

## 4. Acceptance checklist

- Every model in section 1 appears in the simulator with a working fallback; the simulator still loads with no console errors and total downloaded model weight stays under 20 MB.
- Rescue scenes S3, S5 and S6 still play correctly with the new meshes; the injured crew member lies visibly and is dragged into `rescue-1`.
- The pit reads as a natural sinkhole from the rim and from the scene cameras.
- The map command works in the five languages and the map shows all positions with callsigns.
- `tsc --noEmit`, unit tests and the `web` build pass.
