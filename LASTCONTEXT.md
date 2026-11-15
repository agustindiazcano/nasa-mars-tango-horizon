# Last context

**Date:** 2026-11-15

## F11 frontend implementation (isolated worktree)

- Branch `milagros/f11-vein-detector`, based on `82f5640`; the historical B22 working copy is untouched.
- Added a validated offline data reader, an independently styled Vein Detector HUD panel, and 19 keys in each of EN/ES/FR/DE/IT. Unknown waypoint IDs return no result; the panel never calls the backend's synthetic fallback.
- Reads the existing eight real photos and published image probabilities/sol-grouped metrics. These metrics were not recomputed; raw labels/model artifacts are unavailable locally. The recall (0.6585) requires the candidate/to-be-confirmed wording.
- Heatmap and normalized-peak rendering are implemented but disabled behind an explicit localization gate. Full-frame resize permits geometric alignment; it does not validate geological localization. Only eight pairs are available, fewer than the guide's ten. No spatial-validation evidence is fabricated and no pixel intensity is called calibrated probability.
- Added `tools/veins/review.html`: explicit local CSV/photo imports, identity required for accept/flip, keyboard controls, quoted CSV export, pending rows preserved, no network calls or source-file writes. The utility can be opened as a local HTML file. Required CSV columns: `name,sol,vein,reviewed_by`; optional columns are preserved.
- No models, data assets, agents, physics, voice contracts or automatic drill behavior changed. The guide's broader detect/recommend/GUARDIAN/drill acceptance remains outside this frontend patch.
- Local checks: shared build and frontend TypeScript pass; 23 new data/presentation/review tests pass. Browser checks and final publication are performed separately by the coordinating agent.

## Summary of work done

- Merged PR #29 (`web-test-3d` renamed to `web`) and PR #30 (reconciliation); deployed Cloud Run `tangohorizon-api` revision `00027` and Vercel from `main`.
- Branch `feat/storm-forecast-fft-cinematic-cams`:
  - `F8`: 3-sol storm forecast fan chart and EVA verdict in the right HUD panel (`web/src/hud/stormForecast.ts`, data from `public/data/env/storm_forecast.json`). The chart caption shows the held-out coverage of the q10–q90 band (44–52 %), lower than the nominal 80 %.
  - `F6`: 32-band FFT canvas in the voice HUD (`RadioSpeaker` analyser in `speak.ts`, canvas in `hud.ts`), delivered by a subagent and cherry-picked. Playback falls back to the destination when `AnalyserNode` is missing.
  - Plan `docs/impl/22_RESCUE_SCENARIO_AND_BASE_REVISION.md` (rescue scenario, three astronauts, unit renames, base revision) and task `B24` in `PENDING.md`.
- `F14` (merged after `F6`/`F8`): five cinematic cameras (Shift+1..5 and HUD buttons), Casson bio-twin panel, Sky-Crane tether pendulum and LiDAR cone; built by a subagent, checked in a browser (CAM-3, no console errors). Sky-Crane toggle position and the Casson panel were not inspected visually.

## Decisions made

- Frontend ships through Vercel only; Cloud Run stays API-only.
- The `rover-2` sign/injection demo stays removed.

## Where the work was left

- Waiting for the user's GLB models: 3 astronauts, solar panels, antennas, Starship and launch base, rescue robot (see plan 22, section 2).
- Open: voice `open_panel` in `server/src/agents/tools/registry.ts` and `offline.ts` cannot target the `casson` panel; the Sky-Crane toggle button (`right:12px; bottom:84px`) may overlap other HUD elements.
- Visual verification of the remaining HUD pieces is pending (`B37`).
