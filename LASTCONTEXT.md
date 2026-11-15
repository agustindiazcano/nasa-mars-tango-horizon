# Last context

**Date:** 2026-11-15

## Summary of work done

- Merged PR #29 (`web-test-3d` renamed to `web`) and PR #30 (reconciliation); deployed Cloud Run `tangohorizon-api` revision `00027` and Vercel from `main`.
- Branch `feat/storm-forecast-fft-cinematic-cams`:
  - `F8`: 3-sol storm forecast fan chart and EVA verdict in the right HUD panel (`web/src/hud/stormForecast.ts`, data from `public/data/env/storm_forecast.json`). The chart caption shows the held-out coverage of the q10–q90 band (44–52 %), lower than the nominal 80 %.
  - `F6`: 32-band FFT canvas in the voice HUD (`RadioSpeaker` analyser in `speak.ts`, canvas in `hud.ts`), delivered by a subagent and cherry-picked. Playback falls back to the destination when `AnalyserNode` is missing.
  - Plan `docs/impl/22_RESCUE_SCENARIO_AND_BASE_REVISION.md` (rescue scenario, three astronauts, unit renames, base revision) and task `B24` in `PENDING.md`.
- `F14` (cinematic cameras, Casson panel, Sky-Crane tether and LiDAR) runs in a separate subagent worktree on branch `feat/f14-cinematic-casson-skycrane`; not merged here.

## Decisions made

- Frontend ships through Vercel only; Cloud Run stays API-only.
- The `rover-2` sign/injection demo stays removed.

## Where the work was left

- Waiting for the user's GLB models: 3 astronauts, solar panels, antennas, Starship and launch base, rescue robot (see plan 22, section 2).
- Visual verification of the new HUD pieces in a browser is pending (`B37`).
