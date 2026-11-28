# Last context

**Date:** 2026-11-28 (Argentina)

## Work done (branch `fix/towing-drone-parachute-storm`)

- Drones (`fleetProc.ts`): the target height is low-passed and the drone follows it with a critically damped spring (no overshoot or wobble on height changes). Clearance over terrain ahead is `envelope + altitude + 6 m`; look-ahead reaches 60 m.
- Parachute (`parachuteProc.ts`, `podBallistics.ts`): after touchdown the canopy deflates (`collapse`) and lies on the ground downwind of the pod, with lines to the pod base. It stays until the next launch or scene reset.
- Storm (`world/stormTau.ts`, `SceneDef.stormTau`, `main.ts`): scenes after the storm alert keep a dust floor (`STORM_TAU` 3.2 for `O1 V1 R1 L0 L1 S5`, `STORM_TAU_FULL` 4.2 for `Q1 ML1 E1`). `store.env.tau` and wind use the floor; aircraft grounding still uses the scripted tau, so drones fly in those scenes.
- Storm alert slide `T1`: new overlay kind `forecast` (`demo/forecastChart.ts`): animated Storm Nowcaster fan chart (observed dots, median line, q10-q90 band, storm level, Go/No-Go stamp) from the real `storm_forecast` file and `stormVerdict`. Checked live.
- Rescue cart (`rescueLitter.ts`): four large wheels (tyre, rim, spokes, hub cap) beside the bed, weathered materials (same dust and scratches as the GLB vehicles), tilt to the slope (`litterTilt`, low-passed). The casualty tilts with it (`crew.place` accepts `pitch` and `roll`).
- Arm robot (`fleetProc.ts`, `manipulatorArm.ts` materials): dust and scratches through `weatherObject`.
- Fixed a circular import that blanked the app (`STORM_TAU` moved out of `sceneDirector.ts`).

## State

Committed on the branch; PR to `main` open. Not checked live: cart wheels and tilt on a slope, parachute lying on the ground, drone over the mountain, storm look in `O1`-`E1`, weathering look on the arm robot (see `PENDING.md` B49). The video script still lacks `U1`, `K1`, `O1`, `ML1`, `Q1` (B43).
