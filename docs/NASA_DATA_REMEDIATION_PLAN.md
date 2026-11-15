# NASA Data Audit Remediation Plan

Date: 2026-11-14

## Objective and scope

Make the demo distinguish observations, derived products, model predictions, and mission design assumptions. Align rendered terrain, coordinates, placements, agent tools, and provenance. Deliver both a corrected demo and a separately evidenced geospatial verification; completing the former does not prove the latter.

Implement against the active `web-test-3d/` runtime and `web/public/data/`, with shared contracts in `@th/shared` and corresponding server changes. Do not wait for workspace migration B22 or expand this task into the full B23 refactor. Preserve existing voice, deterministic physics, and robot behavior.

This is an implementation plan, not a report of completed corrections. Audit figures below are reported evidence to reproduce unless explicitly identified as locally inspected.

## Audit baseline

| Finding | Evidence and qualification | Work package |
|---|---|---|
| Server coordinates used Bradbury Landing outside the terrain window | Reported 9.54 km offset; fix `42c5e92` on `fix/ai-rag-findings` reportedly uses terrain metadata and passes 35 server tests. Verify integration and deployment independently. | P0, P4 |
| Terrain metadata describes a 4 km square | Locally inspected metadata: HiRISE `DTEEC_009149_1750_009294_1750_U01`, center latitude -4.745, longitude 137.400 E, 2048 height pixels. Original raster was not verified. | P4 |
| Synthetic curves carry historical REMS/RAD labels | Labels inspected in `web-test-3d/src/main.ts`; reported peaks are tau 7.88 versus file 4.24 and radiation 144.8 versus file 25.9 microgray/hour. Recompute from files. | P1 |
| DEM can silently fall back to procedural terrain | Six-second height fetch timeout inspected in `world/terrainProc.ts`. | P2 |
| World objects are placed before terrain loads | Reported 65–100 m height errors are calculated, not browser observations. | P3 |
| Base is on steep terrain | Reported slopes 12–19 degrees; validate footprint, not only center. | P5 |
| S1–S4 differ across frontend and server | Replace duplicate catalogs with shared definitions tied to valid science evidence. | P5 |
| Display layers do not use available products | Reported unused orthoimage, client-derived slope/SVF, server-only thermal and hydration products. | P6 |
| Hydration prediction is labeled WEH wt% | Model output is reported to be dimensionless; inspect training target and serialization before changing contracts. | P1, P6 |
| Negative latitude is labeled N; provenance is incomplete | Add hemisphere formatting and per-variable provenance. | P1, P7 |
| Original NASA pixels are absent; CTX and HiRISE differ by about 590 m | Coordinate verification so far is metadata arithmetic. Cause of vertical discrepancy is unresolved. | P4 |
| Historical context is mixed with handwritten defaults | Reported sol 4120, pressure, temperature, tau, dose, and Earth light time 492 s; `ephem.json` reportedly contains 660.9 s. Values must retain their own epochs. | P1 |
| RAG standard attribution is weak | B27 records eight NASA-STD-3001 chunks among 1,002 total chunks. Audit describes those eight as handwritten. Verify edition, text, and pages. | P7 |

## Execution order and ownership

Execute P0, P1, P2, P3, P4, P5, P6, P7, then P8. P1–P3 are the first delivery milestone. Early label fixes do not require original raster acquisition. If acquisition blocks P4, continue independent work but keep geospatial verification and dependent placement approval open.

One frontend owner should handle P1–P3 because they share initialization and `main.ts`/`terrainProc.ts`. Keep the existing server/RAG branch focused on its own fixes. Do not introduce concurrent writers to those files. A single agent can execute all packages sequentially; delegation is not required.

### P0 — Establish the integration baseline

- Read `AGENTS.md`, the three session files, `BLUEPRINT.md`, `NASA_APIS.md`, and relevant implementation guides.
- Inspect branch state and remote changes. Preserve unrelated work and use a task branch or isolated worktree.
- Locate commit `42c5e92`, inspect its diff and tests, and check whether its change is already present. Integrate only missing relevant changes; do not duplicate the patch or merge unrelated work.
- Inventory runtime consumers of every audited dataset. Record asset schema, units, time range, coverage, provenance, and actual frontend/server usage in a dedicated evidence document.
- Record the baseline commit and reproduce findings with file references. Keep supplied claims separate from observed results.

Acceptance: every audit item has an owner/package and evidence status; the coordinate fix has a known integration status. Do not report the supplied 35-test result as a new test run.

### P1 — Correct labels, units, and historical playback

- Immediately label synthetic event curves as design scenarios. Correct hemisphere formatting: -4.745 becomes 4.745 S; test N/S, E/W, zero, and longitude conventions.
- Replace dimensionless hydration percentage labels in HUD, legends, tools, and agent instructions with “Estimated hydration index (dimensionless)”. Preserve legitimate measured WEH units on actual DAN observations. Do not multiply an index by 100 or infer calibration.
- Add validated loaders for `env/rems_clear.json`, `rems_storm2018.json`, `rad_quiet.json`, `rad_sep2017.json`, and `ephem.json` under `web/public/data/`. Inspect real schemas before defining adapters.
- Separate historical replay and design scenarios. Each displayed variable carries source, units, epoch/sol, transformation, and data category. Do not imply that RAD, REMS, and ephemeris files from different epochs describe one observed instant.
- Use a deterministic replay clock with documented interpolation, gap handling, reset behavior, and time compression. Preserve measured extrema; do not amplify historical curves for visual effect. Never extrapolate silently.
- Keep absorbed dose (microgray/hour) distinct from equivalent dose (microsievert/hour). Any conversion requires a documented model and distinct derived label.
- Use the ephemeris value for its recorded epoch and clarify one-way versus round-trip light time. Remove unrelated hardcoded defaults from historical mode.
- If an asset is missing or invalid, disable the affected historical replay and show its error. Offer a separately labeled design scenario where appropriate.

Acceptance: source samples and replay values match at sample times; intermediate values follow the declared interpolation; observed peaks are reproduced from validated files; resets do not retain values from another scenario. UI and agent context agree on units, time, and category.

### P2 — Make terrain loading explicit

- Implement loading, ready, and error states with bounded retry/backoff, cancellation, and a manual retry control. Replace the fixed six-second cutoff with a documented policy suitable for the asset size; avoid unbounded waits.
- Validate metadata, byte length, decoding, and finite elevation values before exposing terrain as ready. Cache only validated assets with a version identifier.
- Keep progress/error information visible in the HUD. Do not claim byte progress when content length is unknown.
- Default to waiting for real terrain. If procedural preview remains available, require an explicit labeled mode and prevent real-terrain server routes or safety verdicts from being applied to that geometry.
- Include terrain identity/readiness in the mission contract where needed to detect client/server mismatch.

Acceptance: a download taking longer than six seconds can succeed; offline, missing, corrupt, and mismatched assets produce visible outcomes; retry recovers without duplicate scene objects or a stale request replacing newer terrain.

### P3 — Initialize the world after the DEM

- Await validated terrain before constructing or positioning ground-dependent base modules, astronaut, launcher, targets, stations, and fleet.
- Use one placement helper with sampled elevation plus each model's physical contact offset. Account for model origins and multi-point footprints rather than setting every mesh origin to ground height.
- Gate mission interaction until placements are ready. Make reset and retry lifecycle handling explicit.
- Verify rover/crew movement, pod launch and landing, cameras, routes, and marker placement against the same surface.

Acceptance: browser inspection and numeric contact-point checks show no unexplained floating or buried objects. Record screenshots and height residuals with tolerances justified by mesh resolution and model geometry. Test initial load, slow load, retry, and reset.

### P4 — Verify geospatial provenance and vertical reference

- Retrieve the original HiRISE product and metadata from the authoritative archive, plus the relevant CTX source. Use reproducible acquisition commands, product IDs, checksums, and source URLs; avoid committing large raw rasters.
- Verify planetary reference system, latitude convention, east longitude convention, projection, pixel centers, bounds, axis orientation, horizontal/vertical units, nodata, scale/offset, and vertical datum.
- Reproduce the processed crop from source pixels. Compare center, corners, and distributed interior control points, documenting sampling and tolerance based on resolution/quantization.
- Investigate the approximately 590 m CTX–HiRISE difference: spatial registration, datum, scale/offset, preprocessing, and interpolation. Summarize residual distribution and spatial pattern. Do not apply an arbitrary constant correction or assume either product is correct.
- Use one shared coordinate contract anchored to metadata. Preserve the reported regression x=-600, z=-900 -> latitude about -4.729816, longitude 137.389878 E, after validating its convention and rounding. Add edge, orientation, and round-trip tests.
- If sources cannot be obtained, report verification as metadata-only, isolate incompatible products, and record the exact blocker. Do not declare full geospatial completion.

Acceptance: source-to-crop checks are reproducible; the vertical discrepancy is explained and corrected with evidence, or remains explicitly unresolved with affected claims disabled. Metadata agreement alone is insufficient.

### P5 — Place the base and unify science sites

- Preserve the DEM center as the geographic anchor. Move mission objects instead of redefining the origin to relocate the base.
- Search the verified terrain for a base footprint below 5 degrees slope, including module footprints, vehicle access, launcher clearances, and existing keep-out constraints. Record the selected coordinates and checks. If no suitable footprint exists, report that result rather than flattening terrain silently.
- Create a shared mission/site catalog consumed by frontend, server, minimap, and agent tools. Eliminate duplicated S1–S4 coordinate tables.
- Choose science targets from valid DAN evidence within coverage and retain measurement IDs. Label proposed stations separately from measured rover locations; do not invent four measured sites if coverage cannot support them.

Acceptance: all consumers resolve the same IDs to the same coordinates; placements remain in valid coverage; the base footprint and access satisfy documented limits.

### P6 — Render data layers and science evidence

- Load the real orthoimage and available slope, sky-view factor, thermal-class, hydration, and uncertainty products. Verify raster alignment, orientation, bounds, encoding, and nodata.
- Share product decoding and operational sampling where feasible. Keep mesh render subsampling distinct from authoritative terrain queries; explain and measure any residual client/server difference.
- Render available DAN observations (audit reports 377), clipping only by documented coverage rules. Show counts for available, visible, and excluded observations and retain source identifiers and measured units.
- Display Mastcam/MAHLI images and their corresponding vein heatmaps, prediction values, and model limitations. Validate image/heatmap association and coordinate alignment.
- Label the fixed sol-2079 storm forecast as historical with its initialization time, or recompute from the selected valid context. Do not present it as a current forecast.

Acceptance: control points align across the terrain, layers, and backend; legends distinguish measurements, derived products, and predictions; missing layers are marked unavailable rather than replaced with unlabeled noise.

### P7 — Complete provenance and audit the RAG

- Complete HUD provenance cards with product/source, epoch, units, coverage, processing, model version where relevant, and limitations. Keep source claims consistent with actual runtime consumers.
- Trace processed environment JSON back to source records; an existing filename is not proof of observational provenance.
- Resolve B27 by obtaining the cited NASA-STD-3001 editions, extracting attributable passages, and verifying page references and retrieval results. Separate commentary/design assumptions from excerpts. Do not fabricate citations or treat a chunk count as quality evidence.
- Update `NASA_APIS.md` when sources or acquisition paths change. Store verification methods and results in a dedicated document; keep project status out of README files.
- Explicitly retain NASA GLB integration, DONKI, Mars Trek, AI4Mars, and full-resolution terrain LOD as follow-up work unless necessary for an acceptance criterion above. Downloaded assets must not be described as runtime integrations.

Acceptance: every NASA attribution has a source-to-consumer trace; citations resolve to the stated edition/page; outstanding limitations remain visible.

### P8 — Validate and integrate

- Run targeted local tests for changed loaders, sampling, coordinates, catalogs, replay, units, and lifecycle behavior. Use normal mission commands only; the repository prohibition on adversarial inputs applies even where older plans suggest otherwise.
- Push task branches and run full `test-shared`, `test-server`, and `build` jobs in parallel through GitHub Actions. Record actual results and URLs.
- Perform browser checks for slow/failing terrain loads, placement, layer switching, replay/reset, provenance, and hemispheres. Check asset paths and MIME responses in the preview deployment.
- Run independent normal voice/integration probes concurrently where supported: report coordinates, request a route, query weather, and identify a science site. Confirm state and provenance remain consistent end to end.
- Keep atomic commits: shared contracts, backend logic, frontend behavior, pipeline scripts, generated compact artifacts, and status updates are separate concerns. Use reviewable PRs to `main`; never push directly to `main`.
- Update `PENDING.md`, `PENDING_FRONT.md`, and `LASTCONTEXT.md` in a separate status commit. Do not mark unverified work complete. Obtain merge/deployment authorization where required; do not treat a passing PR as a deployed fix.

## Completion gates

1. Demo integrity: no synthetic curve attributed to an observed NASA event; no dimensionless prediction labeled as measured WEH; no silent terrain substitution.
2. Spatial integrity: shared coordinates and site definitions; post-load placements verified in browser; original-source verification and vertical discrepancy disposition documented.
3. Scientific presentation: real layers and evidence visible, epochs and units explicit, RAG citations verified, unavailable integrations accurately described.
4. Engineering delivery: targeted checks and parallel CI pass, browser evidence recorded, PRs opened, status files updated, deployment status stated separately.

## Agent execution prompt

Use this prompt from the repository root:

```text
Execute docs/NASA_DATA_REMEDIATION_PLAN.md as one authorized remediation task, including packages P0 through P8. Read AGENTS.md, PENDING.md, PENDING_FRONT.md, and LASTCONTEXT.md before any other work, then read BLUEPRINT.md and the plan in full.

Implement the plan; do not return another proposal. Verify the current branch and actual code before relying on audit claims. Preserve unrelated work and existing voice tests. Work on task branches or isolated worktrees; never push directly to main. Check whether coordinate fix 42c5e92 is already integrated before applying any equivalent change.

Start with P1-P3 in the active web-test-3d runtime. Do not wait for B22 or broaden this into a workspace migration. Continue through the remaining packages in dependency order. All packages in this plan are authorized as part of this task; ask before starting unrelated work. Do not spawn other agents unless separately authorized.

Distinguish observations, derived products, predictions, and design assumptions throughout UI, schemas, and agent context. Do not invent scientific provenance, units, citations, test results, or a correction for the CTX/HiRISE discrepancy. If original data acquisition is blocked, record the exact blocker, keep dependent acceptance gates open, and continue independent authorized work.

Write repository content in English and progress/final replies in Spanish. Make atomic commits, keep generated assets separate from source changes, run targeted local checks, and run full suites/builds in parallel on GitHub Actions. Use only normal mission commands for voice/integration checks. Verify visual outcomes in a browser rather than claiming them from arithmetic alone.

Update the three status files in a separate commit, push the task branch(es), and open/update PRs to main. Do not merge or deploy without the applicable authorization. Finish with completed packages, outstanding blockers, exact validation results, evidence paths, PR links, and integration/deployment status. Do not claim the full plan is complete while an acceptance gate remains unresolved.
```

## P1 replay implementation decisions (2026-11-14)

- Keep playback inside the independent archive. Selecting a historical file does not overwrite mission or agent design telemetry with records from another epoch.
- Advance exact samples at 1, 4, or 12 samples per wall-clock second. This is sample compression, not a mapping to elapsed Martian or terrestrial time. The storm sequence contains nonconsecutive sols.
- Do not interpolate or extrapolate. Null measurements remain unavailable. Closing pauses playback and cancels requests. Selecting another file cancels the prior request and resets playback. Playback stops at the final record. Reset returns to sample zero and pauses.
- Display source, units, category, processing and epoch. REMS clear values aggregate sols 2004-2006 and clear opacity is an assumed reference. Storm opacity is a UV proxy. RAD is absorbed silicon dose with recorded UTC/sol/observation ID. Horizons uses TDB epochs and one-way seconds; round-trip seconds are a labelled symmetric approximation.
- Validate all consumed arrays before enabling controls. Reject invalid lengths, empty series, nonfinite values, unsupported radiation quantities and nonincreasing time. Never fill missing wind from mission defaults.

Validation scope: numeric adapters and clock are tested against all five files. Browser controls, modal accessibility and visual layout still require browser verification; the browser surface is unavailable.

## P2/P3 terrain lifecycle decisions (2026-11-14)

- Pin metadata bytes and little-endian DEM bytes with SHA-256 in `shared/src/terrainContract.ts`. The version names a source crop, not a verified vertical datum. Regeneration, including metadata serialization, requires reviewing both hashes and the version.
- One startup owner: each fetch has a 60-second deadline, three attempts and 1/2-second backoff. Cancel interrupts fetch/backoff; generation checks reject late completion even if fetch ignores abort. Manual retry starts a new generation. Cache only validated assets in memory.
- Actors are built after DEM success. Successful reload calls reuse the asset without rebuilding markers. Reset remains a full page reload, destroying the old document and scene. Page exit cancels DEM/imagery and stops startup continuation.
- Require ready source identity on voice/run requests. Missing/mismatched identity or synthetic server fallback returns HTTP 409 with no actions before agent execution. Successful responses carry identity; the browser discards incompatible results without local fallback. Older clients/servers require coordinated updates. Transport failure retains the existing local design fallback.
- Source identity does not assert equal sampling: client mesh/queries retain 256 samples and approximate fields; server height queries use 2048 samples, absolute elevations and processed layers. P4/P6 must quantify differences before route costs or safety geometry are claimed equivalent.
- Common placement uses the maximum required root height across physical contacts. Base modules use footprint corners and main-mesh lower bounds; launcher origins follow placement. Rovers use actual wheel centers, 0.32 m radius and attitude at spawn/movement. Downhill supports may remain above ground. Adaptive supports, articulation, flat base selection and visual contact approval remain open. Crew/markers/pod retain center-height placement.
