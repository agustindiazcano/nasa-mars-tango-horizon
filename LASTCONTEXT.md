# Last context

**Date:** 2026-11-15

## Summary of work done

- Rescue scenario (180 s, deterministic, seekable) with the crew recast: SOTELO and YACONIS at the base, SALERNO and DIAZ-CANO (injured) on the expedition. The robot drives down a ramp in a natural-looking pit, hooks the casualty, drags him on a stretcher with a tow cable and loads him into `rescue-1`. Agent tools `get_crew_status`, `dispatch_overwatch`, `deploy_rescue_robot`, GUARDIAN drone standoff rule, multilingual crew queries offline.
- Scene panel (top centre, scenes S0-S7, clean takes) and scripted orchestrator chat for the video (no model calls, keyed to scenario events, five languages).
- 3D assets: offline optimizer (`tools/assets`), 19 optimized GLBs (1.08 GB raw to 15.8 MB), model lab (`models.html`), procedural close-up animation of the rigid astronaut. Models in the world: CONAE base complex with annexes, instanced solar field and antenna farm, Starship on the pad visible from the base, rovers, rescue vehicles, animated crew (heading fixed), decorative weathered robots from `rover.glb`.
- NASA-style map with the voice command "show the map" in five languages, shoulder patches (Argentine flag, CONAE placeholder), rocks and boulder fields, storm forecast chart, FFT visualizer, cinematic cameras, Casson panel, Sky-Crane.
- Docs: README and presentation materials (PR #38), plans 22-24.
- Deployed: Cloud Run `tangohorizon-api` revision `00045` and Vercel production from `main` (models, scene panel, chat and patches verified live).

## Decisions made

- Frontend ships through Vercel only; Cloud Run stays API-only.
- All 3D models are created by the project owner (personal use, all rights held).
- `rover-1` and `rover-2` are the large vehicles; the small decorative robots use `rover.glb`, weathered at runtime.
- The pit is a designed natural-looking sinkhole, not a real DEM feature.
- CI was not awaited for the merges, at the owner's request; checks were run locally.

## Where the work was left

- All feature branches are merged into `main`. The first load takes about 30 s (rasters plus about 17 MB of models).
- The official CONAE logo is not in the repo: the patch shows a generic "CONAE" roundel until `web/public/textures/conae-logo.png` is added.
