# Execution plan order

How to build Tango Horizon with a coding agent: which documents to read for each part, in which order, and the prompt to give.

- Master plan: `NASA_SPACE_APPS_2026_PLAN.md` (what and why; task numbers refer to its section 9).
- Implementation guides: `docs/impl/01` to `14` (how, with code).
- This file: the order, and one prompt per step.

## How to use it

1. Run the steps in order. A step starts only when the "done when" of the steps it depends on is met.
2. One step = one agent session. Paste the prompt as is. Each prompt names the files to read first.
3. Steps marked ∥ can run in parallel in separate sessions (separate git worktrees if two agents edit code at once).
4. At the end of each step the agent reports: what was built, what was verified and how, what was not done, and any assumption it had to make. Read that before starting the next step.
5. When time runs out, stop at the end of the current step and jump to step 20. The order already puts the most valuable work first.

## Rules that apply to every prompt

Paste this block at the top of every session, before the step prompt:

```text
Project rules for Tango Horizon (NASA Space Apps 2026). Follow them in every task.

1. Language: all code, identifiers, comments, commit messages and documentation are in English.
   The guides contain some code blocks with Spanish comments or strings: translate them to English as you copy them.
   Text shown or spoken to the user goes through the i18n module (docs/impl/14_I18N.md), never hard-coded.
2. Data: U.S. Government sources only (NASA, USGS, PDS nodes). Download only what the plan's table 8.1 lists.
   Raw files go in data/raw/ (gitignored). Every file placed in web/public/data gets an entry in provenance.json.
3. Never invent a number. A value comes from a dataset, from a tested equation, or it is flagged as a design
   assumption in code and shown as such in the UI. Do not copy values from figures in papers.
4. Agents never produce numbers themselves: numbers come from tools.
5. Secrets: read keys from .env only. Never print, log or commit them. Never put a key in front-end code.
6. Verify before you report. Run the tests or the acceptance checks in the guide and state exactly what you ran
   and what happened. If something fails or was skipped, say so plainly.
7. If a guide and reality disagree (an API changed, a product is missing, a library signature differs),
   fix the code to match reality, note it in the guide under a "Deviations" heading, and tell me.
8. Ask before any action that costs money, publishes something, or cannot be undone
   (cloud deploys, enabling billable APIs, git push, deleting data).
9. Stay inside the step. Do not start the next step or refactor unrelated code.
10. The 3D viewer is Three.js. Target 60 FPS on a laptop with integrated graphics.
```

## Order at a glance

| Step | Prio | What | Guides to read | Plan tasks | Depends on | Parallel |
|------|------|------|----------------|------------|------------|----------|
| 0 | 🔴 | Human checks: event rules, keys in `.env`, GCP billing | — | 1, 3 | — | — |
| 1 | 🔴 | Scaffold | 01 | 4 | 0 | — |
| 2 | 🔴 | Server base + model check | 05 | 2, 14 | 1 | ∥ with 3, 4 |
| 3 | 🔴 | Data pipeline: terrain, REMS, RAD, SUITS, models | 02 | 5, 6, 7, 8 | 1 | ∥ with 2, 4 |
| 4 | 🔴 | Physics core | 03 | 11 | 1 | ∥ with 2, 3 |
| 5 | 🔴 | Terrain, helmet, HUD, provenance | 04 | 9, 10, 18 | 3, 4 | — |
| 6 | 🔴 | Languages: English and Spanish | 14 | 49 | 5 | ∥ with 7 |
| 7 | 🔴 | Phone pointer | 06 (+05 relay) | 12 | 2, 5 | ∥ with 6 |
| 8 | 🔴 | Voice input and neural voice output | 07 | 13, 40 | 2, 5, 6 | — |
| 9 | 🔴 | Agents: tools, MCP, minimal hierarchy, guardian, offline fallback | 08 | 15, 15a, 15b, 16 | 2, 4, 8 | — |
| 10 | 🔴 | Emergency scenario and demo deck | 09 | 17 | 5, 9 | — |
| 11 | 🔴 | First public deploy and full smoke test | 10 | 4, 33 | 10 | — |
| 12 | 🟡 | Storm Nowcaster and predictive maneuvers | 13 (+02, 03) | 45, 46, 47, 48, 20 | 3, 9 | ∥ with 13, 14 |
| 13 | 🟡 | Hydration Prospector | 11 (+02) | 36, 37, 38, 39 | 3, 9 | ∥ with 12, 14 |
| 14 | 🟡 | Manipulator rover with procedural arm | 12 (+08, 09) | 41, 42, 43 | 5, 9 | ∥ with 12, 13 |
| 14b | 🟡 | Vein Detector (vision model on real rover images) | 15 (+12) | 52, 53, 54, 55 | 3, 9; step 14 for the last task | ∥ with 12, 13 |
| 15 | 🟡 | Agent tree panel, multimodal rover, injection test, RAG, health | 08, 09 | 15c, 15d, 19, 23, 24 | 9 | — |
| 16 | 🟡 | Base with technical cards, fleet, radiation, pod, Earth link, traverse | 09 | 21, 22, 25, 51, 26, 27, 15e | 10 | — |
| 17 | 🟢 | Extras: remaining fleet, tools, energy models, audio | 09, 03, 02 | 28, 29, 30, 31, 44 | 16 | — |
| 18 | 🟢 | French, German, Italian | 14, 07 | 50 | 6, 8 | — |
| 19 | 🔴 | Final deploy, checklist, README | 10 | 33, 34 | all built | — |
| 20 | 🔴 | Video and submission (human) | 10 | 34, 35 | 19 | — |

Suggested clock: steps 0 to 5 on Saturday; 6 to 11 by Sunday midday; 12 to 16 Sunday 12:00 to 18:00, as far as they get; freeze at 18:00; 19 and 20 after.

---

## Step 0. Human checks (no agent)

| # | Do | Why |
|---|----|-----|
| 1 | Open spaceappschallenge.org and write into plan section 2.2: the 2026 judging criteria, the deliverables, the exact deadline, the full challenge text, the AI-disclosure rule | Everything is tuned to assumptions until this is read |
| 2 | Copy `.env.example` to `.env`. Paste the Meta hackathon key. Fill the five `LLM_MODEL_*` IDs from the Meta model docs | The agents need them |
| 3 | Create or choose the GCP project, enable billing, run `gcloud auth login` and `gcloud auth application-default login`. Fill `GCP_PROJECT_ID` | Deploy and neural voice |
| 4 | Decide who is on which phone for testing (one Android, one iPhone) | Guide 06 |

---

## Step 1. Scaffold

**Read:** `docs/impl/01_SCAFFOLD.md`; plan sections 5.1, 5.2.

```text
Read docs/impl/01_SCAFFOLD.md and sections 5.1 and 5.2 of NASA_SPACE_APPS_2026_PLAN.md.
Create the project scaffold exactly as the guide describes: npm workspaces (shared, web, server), the Vite config
with the two entry pages, the Dockerfile and the ignore files. Initialize git if needed and make a first commit.
Do not touch data/, the two existing Python scripts or the Markdown files at the repo root.
Finish by running the guide's acceptance criteria and report the result of each one.
```

**Done when:** `npm run build` and `docker build .` succeed; `/api/health` answers.

---

## Step 2. Server base and model check ∥

**Read:** `docs/impl/05_SERVER.md`; `.env.example`; plan section 5.3.

```text
Read docs/impl/05_SERVER.md, .env.example and section 5.3 of the plan.
Implement the server: config, the OpenAI-compatible provider layer, the WebSocket relay, static serving and index.
Then run the model check script (server/src/scripts/check-llm.ts) against the key in .env and write the full output,
with latencies per tier, to docs/LLM_CHECK.md.
Interpret the result using step 2 of the guide's instructions and tell me clearly:
which capabilities work (text per tier, image input, tool calling, JSON mode), which do not, and what you recommend.
If every call fails with 401 or 403, stop and tell me; do not try other endpoints or keys.
Do not implement the agent routes yet (that is guide 08); leave registerAgentRoutes as a stub.
```

**Done when:** `docs/LLM_CHECK.md` exists and you know which capabilities the key gives.

---

## Step 3. Data pipeline ∥

**Read:** `docs/impl/02_DATA_PIPELINE.md`; plan sections 8.1 and 8.3; `data/radiation/RAD_RDR_SIS.html`.

```text
Read docs/impl/02_DATA_PIPELINE.md and sections 8.1 and 8.3 of the plan. The download list in table 8.1 is approved.
Before downloading, list each file you are about to fetch with its size and confirm the total stays within the
"core demo" estimate in the plan (about 0.6 GB); if it would exceed it, stop and tell me.
Then, in this order:
1. Terrain: run build_terrain.py for the HiRISE DTM in row 1. Choose the window center from Curiosity's real
   traverse if it falls inside the DTM. Show me slope_1024.png and the orthoimage and tell me if you see holes or stripes.
2. REMS: three clear sols to rems_clear.json (the storm stretch is handled in step 12).
3. RAD: read the SIS document first, then one quiet week to rad_quiet.json and 10 to 15 September 2017 to rad_sep2017.json.
4. SUITS telemetry JSON to shared/src/types/suit.ts.
5. Ephemerides to env/ephem.json from the Horizons files already in data/horizons.
6. GLB models of Curiosity, Ingenuity and MRO.
Run every sanity check in the guide's acceptance criteria and report the actual values you got
(pressure range, temperature range, quiet-time dose rate, hole percentage, total size of web/public/data).
```

**Done when:** `web/public/data/terrain/meta.json` exists with `hole_pct` under 2 and the sanity ranges hold.

---

## Step 4. Physics core ∥

**Read:** `docs/impl/03_PHYSICS_CORE.md`; plan section 6 and table 2.1.

```text
Read docs/impl/03_PHYSICS_CORE.md, section 6 of the plan and table 2.1 (the errors found in the previous plan).
Implement the physics modules in shared/src/physics with their tests, translating comments to English.
Then add dose.ts, solar.ts and suitState.ts as the guide instructs.
Verify the Santee downhill correction against the original paper if you can reach it; if you cannot, apply the
fallback the guide describes and flag it as a design assumption.
Run the tests. If one fails, fix the code, not the test, unless you can show the expected value is wrongly derived.
Report: test results, the leak timeline you get for a 1.6 mm hole at 29.6 kPa, and every constant you had to
mark as a design assumption.
```

**Done when:** `npm test` passes; Armstrong time for the test case is about 890 s.

---

## Step 5. Terrain, helmet, HUD and provenance

**Read:** `docs/impl/04_TERRAIN_HELMET_HUD.md`; plan sections 4 and 7.5; the outputs of steps 3 and 4.

```text
Read docs/impl/04_TERRAIN_HELMET_HUD.md and sections 4 and 7.5 of the plan.
Build the Three.js viewer: real terrain from web/public/data/terrain, sky, first-person astronaut, helmet frame,
and the HUD panels (life support, mission, environment, bottom menu, minimap) fed by suitState and the REMS/RAD files.
Implement the terrain layers, the global store, the single HUD pointer, and the provenance cards: every number
in the HUD must carry data-src and open a card with its dataset and product ID, or its equation and constants.
Measure FPS on this machine while walking and report it. Check that the coordinates shown fall inside the DTM
footprint in meta.json. Open the app in the browser and confirm there are no console errors.
Put visible strings behind a t() function even if only English exists yet; the i18n module arrives next.
```

**Done when:** 60 FPS walking on real terrain; every HUD number shows its source.

---

## Step 6. Languages: English and Spanish ∥

**Read:** `docs/impl/14_I18N.md`.

```text
Read docs/impl/14_I18N.md. Implement the i18n module in shared/src/i18n with the English dictionary as the source
of truth and a hand-written Spanish dictionary with the same keys. Replace every visible string in web/ with a key.
Add the Language menu item and wire setLang so that it updates the UI with no reload.
Add the unit test that fails when a dictionary lacks a key or drops a placeholder.
Search the repository for remaining Spanish text in code, comments and docs and translate it to English;
list what you found. Do not generate French, German or Italian yet.
```

**Done when:** switching EN ↔ ES changes every visible string; the dictionary test passes.

---

## Step 7. Phone pointer ∥

**Read:** `docs/impl/06_PHONE_REMOTE.md`; the relay section of `docs/impl/05_SERVER.md`; `HudPointer` in guide 04.

```text
Read docs/impl/06_PHONE_REMOTE.md, the relay in docs/impl/05_SERVER.md and the HudPointer class from guide 04.
Implement the phone page, the screen-side receiver and the QR panel, with labels through i18n and the language
passed in the QR URL. The phone needs HTTPS for its sensors: tell me how you want to test it
(against the Cloud Run deploy, or a tunnel) and wait for my answer before setting anything up.
Implement trackpad mode as the fallback when sensor permission is denied, the recenter button, and reconnection
with the same room code. I will test on real phones: give me a short checklist of what to try and which
query switches invert the axes.
```

**Done when:** on one Android and one iPhone, the cursor moves across the HUD and selects a menu item.

---

## Step 8. Voice input and neural voice output

**Read:** `docs/impl/07_VOICE.md`; `docs/impl/14_I18N.md`; `docs/LLM_CHECK.md`.

```text
Read docs/impl/07_VOICE.md and docs/impl/14_I18N.md.
Implement voice input with the Web Speech API (push-to-talk from the space bar and the phone button, and wake word),
the local critical commands in English and Spanish, and the live transcript in the HUD.
For voice output, implement the /api/tts route with Google Cloud Text-to-Speech and the Radio class that plays the
audio through Web Audio with the browser voice as fallback. Ask me before enabling the Text-to-Speech API.
Write the list-voices script, synthesize the same sentence with two or three of the newest neural voices for
English and for Spanish, save the samples to a temporary folder and tell me their names so I can choose.
Measure and report the latency of each stage of the voice loop.
Until the agents exist, route non-local orders to a stub that echoes the text, so the loop can be tested end to end.
```

**Done when:** a spoken order in each language triggers an action and gets a spoken reply in a neural voice.

---

## Step 9. Agents: tools, MCP, hierarchy, guardian, fallback

**Read:** `docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md`; plan section 5.6; `docs/LLM_CHECK.md`; guide 03.

```text
Read docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md, section 5.6 of the plan and docs/LLM_CHECK.md.
Implement, in this order, verifying each before the next:
1. terrainData.ts and the tool registry (read tools first), with a script that calls each tool on a sample context.
2. The MCP servers generated from the registry. Check the SDK API against the installed version first.
   If it is not working within 45 minutes, switch callTool to direct calls as the guide allows, and tell me.
3. runAgent and the minimal hierarchy: SUIT.VOICE-EXEC (fast tier) escalating to BASE (large tier).
   If LLM_CHECK.md says native tool calling does not work, use the JSON fallback loop described in the guide.
4. GUARDIAN: rule checks with unit tests, then the judge. Run the three manual judge cases from the guide
   (legitimate action, dangerous action, action induced by untrusted text) and show me the verdicts.
5. offline.ts covering the demo deck orders, and confirm the app still works with AGENTS_OFFLINE=1.
Connect /api/agent/voice to the voice module from step 8.
Report the measured latency for a HUD order and for an order that escalates to BASE, and the result of each
acceptance criterion in the guide.
```

**Done when:** "open the thermal map" and "plan the route to site two" work by voice; an unsafe order is blocked with a visible reason; offline mode works.

---

## Step 10. Emergency scenario and demo deck

**Read:** `docs/impl/09_SCENARIOS_WORLD.md` (clock, scenario, demo deck, instruction 5); plan section 4.

```text
Read docs/impl/09_SCENARIOS_WORLD.md and section 4 of the plan.
Implement only what the core demo needs: the simulation clock, the scenario runner, the fleet units needed for the
rescue (rescue robot, one launch tower), the leak scenario end to end, and the demo deck with keys 1 to 0.
The countdown must come from leakTimeline and the pod trajectory from simulatePod with aim correction.
Place the base so that the rescue closes with real numbers, and show those numbers in the HUD.
Deck buttons must send their orders through the same path as real voice.
Run the scenario three times and confirm it plays identically each time. Report the timeline with its numbers.
```

**Done when:** key 7 runs leak → alert → pod → rescue → recovery, with the countdown stopped before zero.

---

## Step 11. First public deploy

**Read:** `docs/impl/10_DEPLOY_SUBMISSION.md`.

```text
Read docs/impl/10_DEPLOY_SUBMISSION.md. Prepare deploy.sh and the ignore files, including the Text-to-Speech
permission for the Cloud Run service account. Show me the exact commands and what they will create, and wait for
my confirmation before running anything in Google Cloud.
After deploying, run the model check against the deployed service so we know the Meta key works from that region,
then go through the post-deploy checklist in the guide and report each row as pass or fail with what you observed.
Do not push the repository anywhere.
```

**Done when:** the public URL passes the checklist, including the phone on mobile data.

---

## Step 12. Storm Nowcaster and predictive maneuvers ∥

**Read:** `docs/impl/13_STORM_NOWCASTER.md`; plan section 12.1; guide 02 step 5; guide 03 (`solar.ts`).

```text
Read docs/impl/13_STORM_NOWCASTER.md and section 12.1 of the plan. You have a 4-hour budget for this step;
tell me at the 2-hour mark where you are.
1. Estimate the size of the full REMS MODRDR record from the archive listing and tell me before downloading.
2. Build the per-sol table and the target. Follow the guide's order of preference for the target and tell me
   which one you ended up with and how it must be labelled.
3. Before training, plot the tide amplitudes against the target across the 2018 global storm and save it to
   docs/storm_tides.png. If the amplitudes do not rise with dust, find the bug before going on.
4. Train and validate with the 2018 Mars year held out. Show me report.json and tell me plainly, using the
   table in step 6 of the guide, which case we are in. Do not change the validation to get a better number.
5. Export the forecast replay, implement stormDecision.ts with tests, the two tools, the WEATHER-RAD agent,
   the forecast fan chart in the HUD and the new demo beat (forecast → maneuvers → storm arrives → forecast vs. reality).
   Also implement the storm scenario itself from guide 09 (instruction 3).
If the model does not beat its baselines, implement plan B from the guide and write the negative result, with numbers,
into a section for the README.
```

**Done when:** `report.json` exists with baselines and coverage; the go/no-go in the demo changes with the forecast.

---

## Step 13. Hydration Prospector ∥

**Read:** `docs/impl/11_HYDRATION_PROSPECTOR.md`; plan section 12.2; guide 02.

```text
Read docs/impl/11_HYDRATION_PROSPECTOR.md and section 12.2 of the plan. You have a 4-hour budget for this step;
the first 60 minutes are for finding out whether usable DAN data exists.
1. Read the MSL DAN documentation at PDS Geosciences. Tell me which product you will use, whether it gives
   water-equivalent hydrogen or only a relative indicator, how many measurements it has, and the download size.
   If there is no usable product, stop and go to plan B; do not take values from papers.
2. Assemble the predictors (CRISM processed products, THEMIS, DTM derivatives, image texture) and build the dataset.
   Tell me how many DAN points have all predictors.
3. Train with spatial-block validation. Show me report.json and say which row of the decision table in step 6 applies.
   Do not switch to random splits.
4. Predict the map and its uncertainty, add the layer with the real DAN points on top, the two tools and the
   SCIENCE agent that ranks sampling sites and explains its choice.
State in the provenance entry and in a README section what the model predicts (near-surface mineral hydration),
what it does not (liquid water, ice), and its validation numbers.
```

**Done when:** the hydration layer shows prediction, uncertainty and real DAN points, with validation metrics visible; or plan B is in place and the result is reported.

---

## Step 14. Manipulator rover ∥

**Read:** `docs/impl/12_MANIPULATOR_ROBOT.md`; guides 08 and 09; `docs/LLM_CHECK.md` (image input).

```text
Read docs/impl/12_MANIPULATOR_ROBOT.md.
1. Build the arm alone on a test page with a draggable target. Verify visually that the tool tip reaches the target
   everywhere inside the reach envelope and that reach() refuses outside it. The joint sign conventions in the guide
   were derived on paper: if the tip misses, fix them and document the correction. Show me a screenshot.
2. Build the chassis, mast camera and tool turret; register the robot as fleet unit manip-1.
3. Implement the four skills (drill, sample, photograph, handover) and trigger each from a temporary button.
4. Implement the vision loop: mast camera frame with numbered target markers → ROBOT.manip-1 planner →
   arm_skill tool call → GUARDIAN rules and judge → drive into reach → skill → spoken report.
5. Test the four voice orders in the guide in English and in Spanish, and the two refusal cases
   (drilling with the astronaut within 2 m; handover while the astronaut is walking).
Report which orders worked end to end and show the agent trace for one of them.
```

**Done when:** "Hands, drill the vein" and "Hands, bring me the hammer" run end to end, and the two refusals are shown with reasons.

---

## Step 14b. Vein Detector ∥

**Read:** `docs/impl/15_VEIN_DETECTOR.md`; plan section 12.3; guide 12 (for the last task).

```text
Read docs/impl/15_VEIN_DETECTOR.md and section 12.3 of the plan. You have a 3-hour budget for this step.
1. Spend at most 30 minutes checking whether an existing NASA JPL labelled set of Curiosity images has a usable
   vein class. If you use one, read its licence, tell me what it requires, and record it in provenance.
2. Otherwise download about 400 Mastcam and MAHLI images across at least 15 sols (tell me the size first),
   pre-label them with the vision model, and build the one-page review tool. Then stop and ask me to review the labels:
   training must not run on labels no person has checked.
3. Compute embeddings on CPU, train, and show me report.json. Tell me which row of the decision table in step 6 applies.
   Keep the validation grouped by sol.
4. Open ten heat maps next to their images and tell me honestly whether the bright area sits on the vein.
   If it mostly does not, keep only the image-level probability.
5. Integrate: demo images at waypoints, the detect_veins tool, the HUD overlay, and the order
   "Hands, find a vein and drill it" if the manipulator rover from step 14 exists.
The detector runs only on real photographs, never on frames rendered by the viewer. Agents must say "vein candidate"
and must never name a mineral from a photo.
```

**Done when:** a real Curiosity image shows its vein probability in the HUD with validation metrics in provenance; or plan B is in place and the result is reported.

---

## Step 15. Agent tree, multimodal rover, injection test, RAG, health

**Read:** `docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md` (instructions 4, 6 to 9); `docs/impl/09_SCENARIOS_WORLD.md` (instruction 10).

```text
Read instructions 4 and 6 to 9 of docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md and instruction 10 of
docs/impl/09_SCENARIOS_WORLD.md. Implement, in this order, and stop after any item if I say time is up:
1. The live agent-tree panel in the HUD from the trace and route fields.
2. The multimodal science rover: camera frame to /api/agent/vision and a spoken description.
3. The injection test: a sign on the terrain, detected and blocked, shown in the HUD.
4. The RAG corpus from NASA-STD-3001 volumes 1 and 2 and the OCHMO briefs, BM25 search, and the MAINTENANCE agent
   that reports a telemetry trend with its cited document and page.
5. The SUIT.HEALTH agent reporting status against cited limits.
For item 4, show me three example questions with the retrieved chunks and their sources so I can judge retrieval quality.
```

**Done when:** the tree is visible, the rover describes its view, the injection is blocked on screen, and an alert shows document and page.

---

## Step 16. Base, fleet, radiation, pod, Earth link, traverse

**Read:** `docs/impl/09_SCENARIOS_WORLD.md` (base section and instructions 4, 6 to 9); plan sections 7.3 and 7.4.

```text
Read the base section and instructions 4 and 6 to 9 of docs/impl/09_SCENARIOS_WORLD.md, and sections 7.3 and 7.4
of the plan. Implement, in this order:
1. All base modules from primitives on a flat area chosen from the slope map, each selectable with a technical card.
   Fill each card's figures from the sources named in the guide's table. Any figure you cannot source is entered
   as a design assumption and displayed with that label. Give me the list of figures with their sources.
2. The resource balance panel (power, O2, water, food days), reacting to dust opacity.
3. The Sep 2017 radiation scenario with the sky-view-factor layer and the shelter suggestion.
4. The remaining fleet units as simple consistent geometry, one agent per vehicle, answering by voice.
5. The Earth-link switch with the real light time, and Curiosity's traverse with real photos at waypoints.
6. The planners of plan section 6.1 (guide 09, instruction 14), in the order given there: per-vehicle A* costs,
   time-optimal rescue route, Hungarian assignment, drone lattice with terrain clearance, lawnmower coverage,
   station ordering. Each with a unit test. Show the algorithm name and its numbers next to every route in the HUD.
   Leave D* Lite, Bayesian search and Ant Colony Optimization for step 17.
Report FPS with everything on screen.
```

**Done when:** every base module opens a sourced card; 55 FPS or more with fleet, base and dust.

---

## Step 17. Extras

**Read:** `docs/impl/09_SCENARIOS_WORLD.md` (instruction 11), `docs/impl/12_MANIPULATOR_ROBOT.md` (instruction 7), `docs/impl/03_PHYSICS_CORE.md`.

```text
Only if there is time before the 18:00 freeze. Read instruction 11 of docs/impl/09_SCENARIOS_WORLD.md and
instruction 7 of docs/impl/12_MANIPULATOR_ROBOT.md. In order: the manipulator handing over the patch kit or O2 bottle
in the leak scenario; science stations with sampling that adds carried mass; science tools; real Perseverance audio;
DONKI space-weather alert; ISRU figures from MOXIE; fleet energy model. Stop when I tell you the freeze has started.
```

---

## Step 18. French, German, Italian

**Read:** `docs/impl/14_I18N.md` (instruction 7); `docs/impl/07_VOICE.md` (instruction 2).

```text
Only if English and Spanish are complete and stable. Read instruction 7 of docs/impl/14_I18N.md.
Generate the French, German and Italian dictionaries with tools/i18n_generate.ts, write the safety voice commands
for each by hand, and choose a neural voice per language with the list-voices script.
Run one full voice exchange in each language and tell me honestly how recognition and voice quality were.
Register only the languages that complete the exchange cleanly; leave the others out of the menu.
```

---

## Step 19. Final deploy, checklist, README

**Read:** `docs/impl/10_DEPLOY_SUBMISSION.md`; plan sections 2.2 and 13.

```text
Read docs/impl/10_DEPLOY_SUBMISSION.md. The code is frozen: fix only bugs that break the demo.
1. Write README.md in English in the order the guide gives, generating the data table from provenance.json and the
   constants table from the physics constants. Include the "Our models" section with the real validation numbers of
   the Storm Nowcaster and the Hydration Prospector, and a "Limitations" section that states every approximation
   and design assumption plainly. Do not claim anything that was not built or measured.
2. Show me the deploy commands and wait for my confirmation, then deploy.
3. Run the full post-deploy checklist and report each row as pass or fail.
4. Tag the commit as "submission". Do not push unless I ask.
Give me a final list: what works, what is partial, what was cut.
```

**Done when:** the checklist passes from a device and network outside the team; the README is complete.

---

## Step 20. Video and submission (human)

| # | Do |
|---|----|
| 1 | Hide the deck (`H`), record at 1080p and 60 FPS following the shot list in guide 10 instruction 11. Start inside the helmet, no logos |
| 2 | Fit the length and format to the official 2026 guide read in step 0 |
| 3 | Fill the project page: one sentence, the live link first, the data table, the two models with their numbers, the use-of-AI statement |
| 4 | Submit before 22:00 on Sunday. Open the public link from a phone on mobile data once more after submitting |

---

## Housekeeping left over

| Item | Status |
|------|--------|
| `fetch_mars_data.py`, `validate_urls.py`, `VALIDACION_APIS.md` (written earlier, Spanish comments and text) | Not yet translated. Step 6 covers it: the agent translates comments and regenerates the report in English |
| Code blocks inside guides 02 to 11 | Code is English; some comments and strings are Spanish. Rule 1 has the agent translate them on copy |
| `data/` contains three non-U.S.-Government downloads (CelesTrak, `tle.ivanstanojevic.me`, MCD manual) | Not used by the app. Leave or delete; they are gitignored |
