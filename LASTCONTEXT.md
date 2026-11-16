# Last context

**Date:** 2026-11-15

## Model replacement (branch `feat/replace-nasa-buildings`)

- Compressed 8 raw scans (`3d-replace`, 56-60 MB each) with `tools/assets/optimize.mjs` to about 0.6-0.8 MB each (40k triangles): `circle-building-1`, `circle-building-2`, `life-support-cannon`, `model-1`, `model-2`, `rockets`, `rover-new`, `drone-new`.
- Removed `asset-1` (greenhouse), `asset-2` (lab), `asset-3` (shelter), `rover-1`, `rover-2`, `rover`, `ingenuity` GLBs, their manifest entries and their provenance entries.
- Every base module now has a GLB (no procedural-only module): lab/airlock = `circle-building-1`, greenhouse/compute = `circle-building-2`, shelter/eclss/battery = `rockets`, comms = `antenna`, launchers = `life-support-cannon`, fission = `building-3`. The white box stays only as hidden click target and load fallback. `model-1` (rocket pair) is a display piece near the garage.
- `rover-1` uses `model-2`, `rover-2` and the decorative robots use `rover-new`, `drone-1`/`drone-2` use `drone-new`. Rover scans face -X, so `MODEL_SPECS` has a `yaw` of 90 degrees.
- Module footprints and heights follow the scaled model box (`BASE_MODULES` and `BASE_MODULE_FOOTPRINTS`); lab and greenhouse were sized to the old footprints to keep the slope and overlap tests valid.
- README banner and `site/` logo now use the new mission patch.

## Notes

- `drone-new` is one mesh with no rotor nodes: the drone rotors no longer spin.
- Visual checks done in the browser model lab and the base overview; flight, rescue scenes and cannon pod launches were not re-checked live.
- The root checkout has uncommitted work from another session (insignia textures, procedural decor robots, `conae-logo.png`); this branch does not touch it.
