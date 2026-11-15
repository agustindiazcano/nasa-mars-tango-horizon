# 23. 3D assets: optimization pipeline, model lab and rigid-astronaut close-up (plan)

**Goal:** bring the team's 17 GLB models into the project at a size the web can load, keep the animated astronaut ready for the simulator, and show the rigid (unrigged) astronaut in close-up with a procedural animation to judge how it looks.

**Read first:** `AGENTS.md`, `docs/impl/22_RESCUE_SCENARIO_AND_BASE_REVISION.md` (section 2 lists the models the rescue scenario waits for), `web/src/world/nasaModels.ts` (GLB loader with Draco).

## 1. What was delivered (`3d-mars-assets/`, 920 MB, 17 files)

| File | Size | Triangles | Notes |
|---|---|---|---|
| `astronaut-animated.glb` | 22 MB | 38.8 k | Skinned, 66 joints, 8 clips: `Running`, `Walking`, `Dead`, `Fall_Dead_from_Abdominal_Injury`, `Idle_11`, `Sit_and_Doze_Off`, `Step_to_Sit_Transition`, `walking_2_inplace`. Textures are 15 MB of PNG. Height 1.7 m, origin at the feet. For the simulator. |
| `astronaut.glb` | 40 MB | 1.06 M | Single rigid mesh, no skeleton. Bounding box centered at the origin (1.9 m tall). For close-ups. |
| `antenna`, `solar-panel`, `building-1..3`, `building-connector`, `rocket`, `rover-1`, `rover-2`, `rescue-rover`, `rescue-robot-astronaut`, `asset-1..4` | 58 to 65 MB each | 1.86 to 1.99 M each | One mesh and three small JPEG textures each. The weight is geometry, not textures. `asset-1..4` have unknown content and must be identified by rendering. |

Raw files stay out of git (920 MB): `/3d-mars-assets/` is ignored. Only optimized outputs are committed.

## 2. Budgets

| Class | Triangle budget | File budget | Texture budget |
|---|---|---|---|
| Props, vehicles, buildings | 25 to 50 k (hero pieces such as `rocket` up to 80 k) | 2 MB each (hero 3 MB) | 1024 px WebP (hero 2048 px) |
| Animated astronaut | keep 38.8 k, keep skin and clips | 4 MB | 1024 px WebP, no PNG |
| Rigid astronaut (close-up) | 80 to 120 k | 5 MB | 2048 px WebP |
| All new models together | | 30 MB | |

## 3. Pipeline (`tools/assets/`, not an npm workspace)

`tools/assets/optimize.mjs` reads `3d-mars-assets/*.glb` and writes `web/public/models/<name>.glb` plus `web/public/models/manifest.json`. Dependencies are already declared in `tools/assets/package.json` (`@gltf-transform/core|extensions|functions`, `meshoptimizer`, `sharp`).

Per asset (settings in a config table inside the script): weld, simplify with the meshoptimizer simplifier to the triangle budget, prune, dedup, resize and re-encode textures to WebP with `sharp`, quantize, compress with EXT_meshopt_compression. The animated astronaut skips simplification and keeps joints and animations (only textures and quantization/compression change; check that skinning still looks right).
`manifest.json` lists per model: file, bytes, triangles, bounding box, real height in metres, up axis, front direction, animation names. The runtime uses it to normalize scale and anchor.

Loader: `web/src/world/nasaModels.ts` gets `MeshoptDecoder` next to Draco (three.js ships `three/examples/jsm/libs/meshopt_decoder.module.js`); WebP textures load through `EXT_texture_webp`.

## 4. Model lab (`web/models.html`)

New Vite entry `web/models.html` + `web/src/lab/modelLab.ts` (kept out of the simulator bundle):

- Dropdown of every model in `manifest.json`, orbit camera, ground grid, lighting similar to the simulator, wireframe toggle, triangle count and file size readout.
- Animation selector and speed slider for models with clips (the animated astronaut: all 8 clips, plus a "locomotion blend" demo: Idle to Walking to Running by speed).
- A contact-sheet mode that renders all models as thumbnails, used to identify `asset-1..4` and the role of each model.

## 5. Rigid astronaut: auto-skin and procedural animation

The rigid `astronaut.glb` has no skeleton, so limbs cannot bend. Approach:

1. Decimate to the close-up budget, then build a humanoid skeleton in code (hips, spine, chest, neck, head, shoulders, upper arms, forearms, hands, thighs, shins, feet) fitted to the model's bounding box and landmark heights.
2. Auto-skin: weight every vertex to the nearest bones by capsule distance with a smooth falloff (top 4 influences, normalized), build a `THREE.SkinnedMesh`. Suit-like regions (torso, helmet) get stiff weights, joints get a short blend.
3. Procedural animation in `web/src/lab/proceduralAstronaut.ts` (pure functions from time and parameters to joint rotations, unit-tested): idle breathing, walk and run cycles with arm swing and counter-rotation, look-around, wave, kneel and fall. The animation parameters are the same ones the simulator uses for the procedural astronaut, so the result can be compared with `astronaut-animated.glb` side by side in the lab.
4. Lab page "Close-up" section: pick the animation, show the skeleton helper and weight heat map, record how it looks (screenshots saved by the agent in the final report).

If auto-skin shows unacceptable tearing at the shoulders or hips, fall back to part-splitting (separate rigid meshes per body part with pivots at the joints) and say so in the report.

## 6. Integration into the simulator (after the rescue branch merges)

Not part of this task, to avoid conflicts with the rescue implementation (`crewProc.ts`, `fleetProc.ts`): swap the procedural placeholders for the optimized GLBs (`rover-1`, `rescue-rover`, `rescue-robot-astronaut`, `rocket`, `solar-panel`, `antenna`, `building-*`), use `astronaut-animated.glb` for the four crew members (`Idle_11`, `Walking`, `Running`, `Fall_Dead_from_Abdominal_Injury` for the pit fall, `Dead` for the incapacitated state). Each model keeps its procedural fallback.

## 7. Acceptance checklist

- `web/public/models/` total of the new models is at most 30 MB and every file meets its budget (report a table of before and after: triangles, bytes).
- The model lab opens every model without console errors; the animated astronaut plays all 8 clips.
- The rigid astronaut animates procedurally in the lab without visible tearing at the main joints, or the fallback is documented.
- `tsc --noEmit`, unit tests for the pure helpers and the `web` build pass; the simulator still loads (no regression in the existing GLB loading).
- Provenance: each model recorded in `web/public/data/provenance.json` as supplied by the team (licence and original generator to be confirmed by the team).
