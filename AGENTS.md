# AGENTS.md

Shared instructions for all coding agents (Claude Code, Gemini CLI, Codex, etc.).
`CLAUDE.md` and `GEMINI.md` only import this file: any new rule goes here.

## Mandatory rule: before every session

**ALWAYS read `PENDING.md` and `LASTCONTEXT.md` before doing anything else in a session.** No exceptions, even if the requested task seems unrelated.

@LASTCONTEXT.md
@PENDING.md

If your tool does not resolve the `@imports` above, open both files manually before answering.

Unless the user says otherwise, continue with the highest-priority task in `PENDING.md`.

## Mandatory rule: language

- **Always write your chain of thought / reasoning in English.**
- **`AGENTS.md` and every project document must always be written in English**: Markdown files, code comments, commit messages, PR descriptions, and anything else stored in the repository.
- Chat replies to the user are the only exception: answer in the language the user writes in (usually Spanish).

## Mandatory rule: writing style

Applies to everything you write: chat replies, reasoning, documents, code comments, commit messages and PR descriptions.

- Write direct and concise text. State the fact or the action; cut filler and preamble.
- Do not use adjectives or adverbs that add no information.
- Never use these words: "honest", "honestly", "rigorous" (or their forms and translations, e.g. "honesto", "honestamente", "riguroso").

## Mandatory rule: branches and worktrees

Several people and several agents work on this project at the same time.

Time is limited: work directly on `main`. No task branches or worktrees unless the user asks for them.

1. Before editing, run `git branch --show-current` and `git status`. Confirm you are on `main`.
2. Run `git pull --rebase origin main` before starting and before each push, to pick up other people's and agents' commits.
3. Commit small and push to `origin main` right after each task.
4. On a conflict, resolve it without discarding the other side's changes. Ask the user if unsure.

## Mandatory rule: when a task is finished

1. Update `PENDING.md` and `LASTCONTEXT.md`.
2. Commit the changes for that task, including those two files (one commit per task, with a message that describes it).
3. Push to `origin main`.
4. **Ask the user for permission** before moving on to the next task. Do not start another task without their confirmation.

## Mandatory rule: no project status in the README

**Never write project status in `README.md`**: no progress, roadmap, pending work, "work in progress" notes, or recent changes. Status belongs only in the status files (`PENDING.md`, `LASTCONTEXT.md`) and in dedicated documents.

## Project

`nasa-mars-tango-horizon` — <!-- TODO: describe in 1-2 lines the project goal, stack and commands (install, run, test) -->

### Project files

| Path | Content |
|---|---|
| `BLUEPRINT.md` | Title: "AEGIS-MARS: Master Technical Architecture & Top 1% Global Winner Blueprint". The plan for the whole project. Read it before planning or starting a task. |
| `NASA_APIS.md` | Title: "NASA APIs". NASA and USGS data sources: endpoints, auth, fields used, and the API validation report. Update it when a source is added or changed. |
| `data/` | Downloaded NASA/USGS data, one folder per group (`rover_photos`, `donki`, `horizons`, `orbits_comms`, `trek`, `topography`, `ai4mars`, `moxie`, `radiation`, `atmosphere`, `suits`, `medical`), plus `manifest.json` (download status) and `validation.json` (URL validation results). |
| `docs/` | Project documents, listed below. |

#### Documents in `docs/`

| Path | Title |
|---|---|
| `docs/EXECUTION_PLAN_ORDER.md` | Execution plan order |
| `docs/impl/01_SCAFFOLD.md` | 01. Project scaffold |
| `docs/impl/02_DATA_PIPELINE.md` | 02. Data pipeline |
| `docs/impl/03_PHYSICS_CORE.md` | 03. Physics core |
| `docs/impl/04_TERRAIN_HELMET_HUD.md` | 04. 3D terrain, helmet and HUD |
| `docs/impl/05_SERVER.md` | 05. Server: static files, model proxy and relay |
| `docs/impl/06_PHONE_REMOTE.md` | 06. Phone as pointer |
| `docs/impl/07_VOICE.md` | 07. Hands-free voice |
| `docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md` | 08. SI agents, tools, MCP and guardrail |
| `docs/impl/09_SCENARIOS_WORLD.md` | 09. Scenarios, fleet, base and demo deck |
| `docs/impl/10_DEPLOY_SUBMISSION.md` | 10. Google Cloud deploy and submission |
| `docs/impl/11_HYDRATION_PROSPECTOR.md` | 11. Hydration Prospector: looking for water with SI and orbital data |
| `docs/impl/12_MANIPULATOR_ROBOT.md` | 12. Manipulator rover: a wheeled robot with a procedural arm driven by vision |
| `docs/impl/13_STORM_NOWCASTER.md` | 13. Storm Nowcaster: predicting dust storms and acting before they arrive |
| `docs/impl/14_I18N.md` | 14. Languages |
| `docs/impl/15_VEIN_DETECTOR.md` | 15. Vein Detector: a vision model that finds evidence of past water in rover images |

## Session memory

| File | Content | When to update |
|---|---|---|
| `LASTCONTEXT.md` | What was done last: summary of the previous session, decisions, and the state the work was left in | At the end of every session (overwritten, not accumulated) |
| `PENDING.md` | List of pending tasks with priority | Whenever a task is completed, added or reprioritized |

### When a session ends

1. Rewrite `LASTCONTEXT.md` with: date, what was done, files touched, decisions made and why, and the exact point where the work was left.
2. Update `PENDING.md`: remove what is done, add what is new, reorder priorities.
3. Do not keep in `LASTCONTEXT.md` anything that is already in `PENDING.md` (one is recent history, the other is what remains).

## Conventions

- Priorities use a traffic light: 🔴 blocking/urgent, 🟡 next, 🟢 later, ⚪ backlog.
