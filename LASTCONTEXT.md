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
  - On finishing a task: commit, push the task branch, remove the worktree, then ask permission for the PR and for the next task.
  - Never write project status in `README.md`.
  - Writing style: direct, concise, no adjectives; the words "honest", "honestly" and "rigorous" are banned.
- Translated all existing project documents to English.

## Decisions

- Rules are written only in `AGENTS.md` so they are not duplicated across tools.
- `LASTCONTEXT.md` is overwritten every session (it is not a history log); what remains to be done goes in `PENDING.md`.
- The two memory files are uppercase, like `AGENTS.md`.
- Chat replies to the user stay in the user's language; everything stored in the repo is in English.

## State the work was left in

- The project has no code yet.
- Work is committed locally on `main`; nothing has been pushed. The GitHub remote is empty, and the push is waiting for the user's permission.
- The "Project" section of `AGENTS.md` has a TODO: goal, stack and commands still need to be described.
