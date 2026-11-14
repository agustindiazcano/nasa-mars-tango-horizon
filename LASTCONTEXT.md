# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Claude Code

## What was done

- Created the agent instruction structure in a previously empty directory:
  - `AGENTS.md`: single source of instructions.
  - `CLAUDE.md` and `GEMINI.md`: only import `AGENTS.md` via `@AGENTS.md`.
  - `LASTCONTEXT.md` (this file) and `PENDING.md`, imported from `AGENTS.md`.
- Created `README.md` (title "Tango Horizon", sections Team, AI Usage and License) and the `LICENSE` file with the MIT license under Agustin Diaz-Cano and Baltazar Salerno.
- Initialized git (branch `main`) and set `origin` → https://github.com/agustindiazcano/nasa-mars-tango-horizon.git.
- Added the mandatory rules in `AGENTS.md`:
  - Always read `PENDING.md` and `LASTCONTEXT.md` before every session.
  - Chain of thought and all project documents always in English.
  - Branches and worktrees: check the current branch, one new branch and worktree per task, remove the worktree after commit and push.
  - On finishing a task: commit, push to `main`, then ask permission for the next task.
  - Never write project status in `README.md`.
  - Writing style: direct, concise, no adjectives; the words "honest", "honestly" and "rigorous" are banned.
- Translated all existing project documents to English.
- Added `.gitignore` (env files, OS, editor and log files) and `.env.example` (no variables yet). Each developer keeps a local `.env`, ignored by git.
- Work goes directly on `main` (user decision, time-limited). Branch/worktree rule replaced in `AGENTS.md`.
- Created `NASA_APIS.md` (table of NASA/USGS sources; endpoints untested) and referenced it in `AGENTS.md`.
- Created `BLUEPRINT.md` (plan for the whole project; content pasted by the user, in Spanish) and the `docs/` folder.- Re-downloaded the NASA/USGS data into `data/` with `fetch_mars_data.py` (33 items OK, 0 failed) and regenerated `data/validation.json` with `validate_urls.py`, so file dates are today. Scripts were run from the scratchpad and are not in the repo.
- Recreated `docs/` (`EXECUTION_PLAN_ORDER.md` and `impl/01`–`15`) as new files with the same content as `nasa-data/docs`.
- `AGENTS.md` now lists `BLUEPRINT.md`, `NASA_APIS.md`, `data/` and every document in `docs/` with path and title.

## Decisions

- Rules are written only in `AGENTS.md` so they are not duplicated across tools.
- `LASTCONTEXT.md` is overwritten every session (it is not a history log); what remains to be done goes in `PENDING.md`.
- The two memory files are uppercase, like `AGENTS.md`.
- Chat replies to the user stay in the user's language; everything stored in the repo is in English.

## State the work was left in

- The project has no code yet.
- `main` is pushed to `origin`. New tasks go in a branch and worktree created from `origin/main`.
- The "Project" section of `AGENTS.md` has a TODO: goal, stack and commands still need to be described.
