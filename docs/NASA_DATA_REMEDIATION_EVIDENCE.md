# NASA remediation evidence

Date: 2026-11-14

Baseline: `928039cdd87c8abc60eefb9421c3a4eaea8be339`. Coordinate fix `42c5e92` is an ancestor of this baseline; no duplicate patch was applied.

## Package evidence and remaining gates

| Package | Implemented / observed | Open acceptance |
|---|---|---|
| P0 | Branch baseline, coordinate integration and asset inventory recorded | Full source-to-consumer audit |
| P1 | Design labels, hemisphere formatter, independent exact-sample historical viewer, dimensionless backend hydration fields, category in agent context | Browser replay/reset validation and full unit audit |
| P2 | 60-second per-fetch deadline, three attempts with backoff, visible error and manual retry; exact DEM length and metadata validation | Slow/offline/corrupt browser checks, explicit cancellation, asset version identity contract |
| P3 | All mission actors constructed after DEM success; terrain markers rebuilt on loaded heights | Model contact offsets, footprints, movement/reset and browser residuals |
| P4 | Authoritative source crop reproduced using the pipeline sampling policy | CTX comparison, vertical datum, projection-contract audit and distributed control points |
| P5 | No placement approval claimed | Flat base footprint search and shared measured-site catalog |
| P6 | HiRISE orthoimage fetched with deadline; generated layers labelled approximations; fixed forecast labelled historical | Scientific layers/uncertainty, DAN rendering and vein associations |
| P7 | Hydration target inspected in metadata and field names corrected | Verified standards editions/pages, complete provenance cards and source records |
| P8 | Targeted checks and parallel CI | Browser validation and end-to-end probes |

## Source raster comparison

Run `python tools/verify_terrain_source.py` from the repository root. Evidence: `docs/evidence/nasa-terrain-source-check.json`. The entire 2048-square crop matches within 0.006070 m; RMS residual is 0.003478 m. This establishes crop reproduction at uint16 quantization precision, not the vertical datum or CTX compatibility. An initial comparison without the pipeline boundless sampling mode produced RMS 0.186099 m; repeating the actual pipeline policy explains that difference.

## Validation

- Frontend TypeScript: passed after archive and imagery changes.
- Server TypeScript: passed after hydration field changes.
- Targeted Vitest: 12 passed (coordinates and frontend metadata/hemisphere contract).
- CI initial source revision: shared/server/build passed: https://github.com/agustindiazcano/nasa-mars-tango-horizon/actions/runs/43662718070 . Later commits require their own CI result.
- Browser validation blocked: CUA create-tab timed out; inventory returned no browsers and native pipe unavailable (os error 2). No screenshots or visual approval are claimed.
- PR #14: https://github.com/agustindiazcano/nasa-mars-tango-horizon/pull/14 . No merge or production deployment performed. Vercel creates automatic PR previews.

## Asset inventory

The historical archive uses exact samples only. No interpolation across missing records or nonconsecutive REMS sols is implied; changing selection resets the sample position. This archive is separate from design mission telemetry. Absorbed silicon dose is not converted to equivalent dose.

DAN file inspection: 1,567 records total; 377 inside the 4 km crop by x/z bounds. These are available data, not rendered integrations. Existing `weh` keys on observation records require a separate pipeline target audit before presenting their units.

| Asset | Top-level schema | SHA-256 |
|---|---|---|
| `web/public/data/env/ephem.json` | source, site, earth_light_time_s, round_trip_light_time_s, earth_distance_km, sun_noon_reference, earth_series, sun_series | `0e3f01e50222784e68eb18495263295d6dcadbb8796fbb44ca666a2d31d26dc4` |
| `web/public/data/env/rad_quiet.json` | source, detector, unit, quality_factor_applied, summary, hours, dose_rate_ugy_h, observations | `486e18cbb8d0e1c7cc45d400ec635a3d11566c083d2c699ec607f60472b6115f` |
| `web/public/data/env/rad_sep2017.json` | source, detector, unit, quality_factor_applied, summary, hours, dose_rate_ugy_h, observations | `2b05847627c2a284c8809f508d78e788bbeee23a5ad56f2fd7be1e8c8af3b4ce` |
| `web/public/data/env/rems_clear.json` | source, sols, hours, pressure_pa, air_temp_k, ground_temp_k, uv_w_m2, wind_ms, uv_noon_baseline_w_m2, tau, by_sol | `123d48cbba955f89196c0d6c15519dc939d15c7f656cf72747bfe5ef5cc46530` |
| `web/public/data/env/rems_storm2018.json` | source, tau_note, sols, uv_clear_noon_w_m2, hours, tau, pressure_pa, air_temp_k, ground_temp_k, uv_w_m2, by_sol | `ac6c2b6c7df0fbefd7bd4d58b757d8cc306077e31f915274b820e16dfde8bbd8` |
| `web/public/data/env/storm_forecast.json` | model, target, storm_level, forecast_sol, forecast_note, forecast, replay_my34, validation, provenance | `1d89201ccc776e24d4e1b05b735e765a42a89d34308c9af78c5ff5ea1f952f5c` |
| `web/public/data/provenance.json` | terrain/height_2048.u16, terrain/meta.json, terrain/svf_1024.png, terrain/slope_1024.png, terrain/ortho_4096.webp, terrain/thermal_class.png, env/ephem.json, env/rad_quiet.json, env/rad_sep2017.json, env/rems_clear.json, env/rems_storm2018.json, terrain/hydration_1024.png, veins/index.json, env/storm_forecast.json | `f0e0e5dc860d8313d2803be0c7cba9a024160ef6be98f8249607aa9a19a135fc` |
| `web/public/data/terrain/hydration_meta.json` | weh_min, weh_max, interval_width_max, target_name, target_label, units, signal_tier, validation, provenance | `974c51ea6a020d82b529008f18937e6e3ab06d378163f15c2bb099ac1e0eafb4` |
| `web/public/data/terrain/hydration_sites.json` | product_id, signal_tier, target_label, units, note, scene_size_m, top_candidates, dan_measurements | `1c928dcd79d563e17f7d36a935da340526b399d04bc04242fe320a042b5ce444` |
| `web/public/data/terrain/meta.json` | product_id, size_m, height_px, z_min_m, z_max_m, center_lon_e, center_lat, bounds_projected_m, slope_max_deg, hole_pct | `41906c6d6d9f04ee0bfda88be2db2acd90723642dc7dbfaf6be6a2ca902269e8` |
| `web/public/data/veins/index.json` | model, disclaimer, provenance, validation, images | `1b959e671509abbd84d6590982d49202ac8b6cfd86e964746c542193435602bb` |
| `web/public/data/veins/manifest.json` | model, disclaimer, provenance, validation, images | `1b959e671509abbd84d6590982d49202ac8b6cfd86e964746c542193435602bb` |

## Historical replay follow-up (PR #15)

Baseline main `8a18b17` includes PR #14. Branch `fix/nasa-historical-replay` adds typed validation of five files and deterministic exact-sample playback with explicit rates, pause, seek, reset and end-of-series handling. Every consumed variable has units, category and processing; every sample has its epoch or labelled aggregate bin. Wind nulls remain unavailable. Mission Earth-link defaults are design assumptions.

Targeted command `npx vitest run src/agents/__tests__/historicalSeries.test.ts --root server`: 17 passed. Frontend `npm run typecheck --workspace web-test-3d`: passed. Tests cover exact arrays, radiation peak, epochs, missing data, invalid arrays/units and replay lifecycle/frame partition invariance.

Browser inventory was retried: no apps/browsers; native pipe unavailable (os error 2). No visual result is claimed. Full CI is linked from PR #15: https://github.com/agustindiazcano/nasa-mars-tango-horizon/pull/15 . No new source acquisition or production deployment.

## P2/P3 lifecycle and identity follow-up

Baseline main `8e61b4c` includes PR #15, verified merged through GitHub. Active runtime remains `web-test-3d`; B22/B23 are unchanged. Untracked `.claude/` content is preserved.

Implemented bounded retries, cancellation, stale-generation protection, pinned metadata/DEM identity, explicit startup states and client/server rejection. Terrain commit is idempotent; reset remains document reload. Shared footprint/contact placement covers base modules and actual rover wheels, including launcher origins.

Local validation: lifecycle 14/14 tests passed; terrain validation 9/9 and coordinates 3/3 passed. Frontend and server TypeScript passed. Tests cover a real 6.5-second delay, missing/truncated/same-length corrupt assets, metadata mismatch, retry, cancellation/backoff, ignored abort/late completion, validated-cache reuse, fresh reset owner, repeated-load scene/marker counts, both HTTP mismatch endpoints and numerical contact clearances.

Browser inventory retried through CUA: `apps: []`, `browsers: []`; native pipe connection failed with Windows `os error 2` (file not found). No screenshots, visual contact/reset acceptance or preview MIME checks are claimed.

Source identity does not certify 256-sample client geometry against 2048-sample server queries and processed layers. Contact tests prove no penetration only at supplied supports. Browser residuals, broader crew/pod/camera checks, flat base selection, CTX vertical-reference disposition and P4-P7 gates remain open. No merge or deployment performed.
