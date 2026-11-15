# 22. Crew rescue scenario, three-astronaut crew and base revision (plan)

**Goal:** a scripted, AI-driven rescue on the real Gale Crater terrain: two astronauts on a science traverse far from the base, a rover failure, an astronaut incapacitated in a pit, a dust storm that cuts visibility, and an autonomous response (`BASE` + `GUARDIAN`) that dispatches a rescue rover, overwatch drones and a rescue robot. The same work revises the base layout (solar field, antennas, launch complex with Starship) and the fleet naming.

**Read first:** `AGENTS.md`, `docs/impl/09_SCENARIOS_WORLD.md`, `docs/impl/13_STORM_NOWCASTER.md`, `docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md`.
**Status:** plan. Procedural placeholders are used until the user supplies the GLB models listed in section 2.

## 1. Cast and naming

| Id | Role | Model | Notes |
|---|---|---|---|
| `crew-1` | Astronaut at the base (player-controlled first/third person) | GLB from user | Replaces the procedural `AstronautProc` mesh; the controller, breathing and gait code stay |
| `crew-2` | Astronaut on the traverse (driver) | GLB from user | Stays at the rover, assists the rescue |
| `crew-3` | Astronaut on the traverse (geologist) | GLB from user | Falls into the pit and is incapacitated |
| `rover-1` | Crewed science rover (pressurized vehicle) | procedural until a model arrives | Carries `crew-2`, `crew-3`; the one that fails |
| `robot-perseverance` (`rover-2` today) | Autonomous science robot "(Perseverance)" | `public/models/rover.glb` (already in the repo) | Renamed from "rover"; stays an uncrewed unit |
| `rover-3` | Manipulator rover | procedural (existing) | Unchanged |
| `rescue-1` | Crewed rescue vehicle | procedural until a model arrives | Carries the rescue robot |
| `rescue-bot-1` | Rescue robot deployed from `rescue-1` | procedural until a model arrives | New unit: tracked or legged base, winch arm, stretcher |
| `drone-1`, `drone-2` | Overwatch drones (Ingenuity GLB) | existing | Provide visual contact |

`UnitKind` in `shared/src/types/mission.ts` already has `rover_crew`, `rover_science`, `rescue`, `drone`, `manipulator`. Add `robot` (uncrewed ground robot) and `rescue_robot`. Rename labels in the i18n dictionaries: "rover" for crewed vehicles, "robot (Perseverance)" for `rover-2`.

## 2. Assets to receive from the user

| Asset | Used for | Interim |
|---|---|---|
| 3 astronaut GLB models (rigged if possible) | `crew-1..3` | Current procedural astronaut, tinted per crew member |
| Solar panel GLB | Solar field of the base | Procedural flat panel array |
| Antenna GLB | Comms/antenna farm | Existing `comms` module primitive |
| Starship and launch-base GLBs | Launch complex at `LAUNCH_SITE_COORD` | Existing procedural complex in `launchSiteProc.ts` |
| Rescue robot GLB | `rescue-bot-1` | Procedural robot (chassis, winch arm, stretcher) |

Intake rules: GLBs go to `web/public/models/`, are loaded with `loadNormalizedNasaGlb` (target size and anchor per model), and each keeps a procedural fallback so the scene never breaks if a file is missing. Record source and license of every model in `web/public/data/provenance.json`.

## 3. Scenario script ("Rescue")

World placement: the traverse site `RESCUE_SITE` is 1.5 to 2.5 km from `BASE_ORIGIN`, found by a DEM scan (same method as `LAUNCH_SITE_COORD`): a real depression or steep-walled hollow (target depth of 4 m or more, wall slope above 35 deg) reachable by the rover over terrain below the vehicle slope limit. If no real pit exists, add a procedural pit mesh (open shaft with a skirt) on a flat patch and document it as a design assumption.

Time is compressed for the demo (about 5 minutes of wall time). All timings are scenario seconds `t`.

| t (s) | Event | Telemetry and HUD | Agent action |
|---|---|---|---|
| 0 | `rover-1` leaves the base with `crew-2`, `crew-3`; `crew-1` stays | Fleet panel shows the traverse, minimap route | none |
| 60 | Arrival at `RESCUE_SITE`, EVA for sampling | `crew-3` on foot near the pit rim | none |
| 90 | `rover-1` drive fault (wheel actuator) | FDIR alert, rover stops, `busy=false` | `MAINTENANCE` diagnoses; reports non-recoverable in the field |
| 110 | `crew-3` falls into the pit and is incapacitated | Vitals alarm, suit comms, no movement, injury flag | `SUIT.HEALTH` raises a critical alert |
| 120 | Storm onset: `tau` rises from 0.5 toward 6, visibility falls | Right panel forecast chart turns red, verdict NO-GO for walking back | `WEATHER-RAD` forecast, `BASE` decides to rescue |
| 130 | `BASE` activates `rescue-1` | Route to the site shown, `GUARDIAN` verdict list | `ask_human` confirmation for sending the rescue robot near an injured crew member |
| 135 | Drones launch while `tau` is below the grounding limit (1.8) | Drones fly to overwatch points | Dispatch from `BASE` with standoff rule below |
| 150 to 200 | Drones provide visual contact on `crew-3` and `crew-2`; camera feed to HUD | `RVR-2 CAM`-style viewport per drone | Vision tool describes the scene |
| 200 | `tau` reaches the drone grounding limit; drones land at the nearest safe point | Drone alert, aircraft grounded | `recall_aircraft` maneuver, logged |
| 230 | `rescue-1` arrives at the rim, stops at the keep-out distance | Beacon lights, floodlights on | `GUARDIAN` checks slope and distance |
| 240 to 300 | `rescue-bot-1` deploys, descends with a tether, secures `crew-3` on the stretcher, winches up | Robot camera, progress bar | Skill sequence (reuse `SkillRunner` pattern) |
| 300 to 360 | `crew-2` and `crew-3` board `rescue-1`, return to base through the storm | Visibility at minimum, route follows the planned safe path | `BASE` replans if slope or tau limits are crossed |
| 420 | Arrival at the base airlock, `crew-1` assists, scenario ends | Summary card with times and decisions | Mission report |

Overwatch drone rule (user requirement: near the astronauts, never on top of them):

- Hold a horizontal standoff of 25 m or more from every crew position (the existing pod keep-out is 15 m; use a larger margin for rotorcraft downwash and loss of control).
- Hold altitude 20 to 30 m above local terrain, orbit the target at a 25 to 40 m radius on opposite sides.
- Check the rule in `GUARDIAN.ruleCheck` for every drone `goto` while the scenario is active; deny any waypoint inside the standoff radius.
- Drone grounding at `tau >= 1.8` (`AIRCRAFT_GROUNDING_TAU`) stays unchanged: the script launches the drones early and models the loss of the aerial link as part of the scenario.

## 4. Base revision

Current modules (`web/src/world/baseProc.ts`): `hab-1`, `airlock`, `compute`, `lab`, `med`, `greenhouse`, `eclss`, `isru`, `solar`, `battery`, `fission`, `garage`, `comms`, `launcher-1`, `launcher-2`, `shelter`. Launch complex at `LAUNCH_SITE_COORD`, 1.1 km from `BASE_ORIGIN`.

| # | Change | Rule |
|---|---|---|
| 1 | Solar field: replace the single `solar` primitive by a row array of panel GLBs, south-facing, with spacing for shadows | Under 5 deg slope, outside the 100 m `fission` keep-out and the 15 m pod keep-out |
| 2 | Antenna farm: dish and mast GLBs near `comms`, line of sight to the sky, away from the launch path | Keep a 50 m clearance from walkways |
| 3 | Garage and landing apron for `rover-1`, `rescue-1`, `rescue-bot-1` and drones, next to the airlock | One 12 m by 8 m apron per vehicle |
| 4 | Launch base with Starship GLB at `LAUNCH_SITE_COORD`, road to the base | Blast safety radius ring on the minimap, no crew inside |
| 5 | Re-run the flat-terrain scan for any module that moves; update `BASE_MODULES` offsets and `shared/src/physics/sites.ts` | `sites.test.ts` checks distance and relief on the real DEM |

Positions are decided after the models arrive (footprints change) and are validated with the DEM scan, not placed by hand.

## 5. Implementation phases

| Phase | Work | Files (new or touched) | Depends on |
|---|---|---|---|
| P1 | Rename units and kinds, update fleet labels and i18n | `shared/src/types/mission.ts`, `fleetProc.ts`, `shared/src/i18n/*.ts` | none |
| P2 | `RESCUE_SITE` DEM scan, constants and test; pit mesh | `shared/src/physics/sites.ts`, `web/src/world/pitProc.ts` | none |
| P3 | Rescue robot procedural model and `rescue-bot-1` unit with skills (descend, secure, winch) | `web/src/world/rescueRobotProc.ts`, `manipulatorArm.ts` pattern | P1 |
| P4 | Crew module: 3 crew entities, swap-in of GLBs, crew positions in `MissionContext` | `web/src/world/crewProc.ts`, `state.ts` | astronaut GLBs |
| P5 | Scenario runner with the timeline above (extend `startScenario`) and HUD summary card | `web/src/main.ts`, `web/src/hud/hud.ts`, new `rescueScenario.ts` | P1, P2, P3 |
| P6 | Agent tools and guard rules: `get_crew_status`, `dispatch_overwatch`, `deploy_rescue_robot`; drone standoff rule in `GUARDIAN` | `server/src/agents/tools/registry.ts`, `guardian.ts`, `offline.ts` | P5 |
| P7 | Base layout revision with solar, antenna and launch models | `baseProc.ts`, `launchSiteProc.ts`, `sites.ts` | solar, antenna, Starship GLBs |
| P8 | Offline deterministic path so the scenario runs with `AGENTS_OFFLINE=1`, plus tests | `server/src/agents/offline.ts`, `web/src/**/*.test.ts` | P6 |

Each phase is one PR. Deploy: frontend to Vercel from `main`, backend to Cloud Run with `deploy.sh` only for P6 and P8.

## 6. Acceptance checklist

- The scenario runs end to end offline and online, with every effect action passing `GUARDIAN`.
- No drone waypoint lies inside the 25 m standoff of any crew member (test).
- `tau` timeline, drone grounding, forecast chart verdict and rescue steps agree in the HUD.
- Every added model has provenance and a procedural fallback.
- `sites.test.ts` covers `RESCUE_SITE` distance and relief on the real DEM.

## 7. Inputs needed from the user

- The GLB files in section 2 and their intended scale and orientation.
- Which crew member the player controls (default `crew-1`).
- Preferred wall-clock length of the demo (default about 7 minutes).
- Whether the pit must be a real DEM feature or a designed mesh is acceptable.
