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

## Mandatory rule: when a task is finished

1. Commit the changes for that task (one commit per task, with a message that describes it).
2. Update `PENDING.md` and `LASTCONTEXT.md` and include them in that commit.
3. **Ask the user for permission** before opening the PR and before moving on to the next task. Do not push, open a PR, or start another task without their confirmation.

## Mandatory rule: no project status in the README

**Never write project status in `README.md`**: no progress, roadmap, pending work, "work in progress" notes, or recent changes. Status belongs only in the status files (`PENDING.md`, `LASTCONTEXT.md`) and in dedicated documents.

## Project

`nasa-mars-tango-horizon` — <!-- TODO: describe in 1-2 lines the project goal, stack and commands (install, run, test) -->

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
