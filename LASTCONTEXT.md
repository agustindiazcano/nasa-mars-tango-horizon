# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Antigravity

## What was done

- Merged PR #10 and worked on branch `feat/robot-action-catalog`:
  - Added the 10-action robot capability catalog (`server/src/agents/unitCapabilities.ts`), the `unit_action` MCP tool, deterministic `GUARDIAN` capability/dust-grounding checks, direct `BASE` execution for single-unit orders, and `web-test-3d` handlers (`state.ts`, `main.ts`) plus a 70 s voice request timeout (`voiceController.ts`).
  - Added deterministic life-support safety net in `hierarchy.ts` when `leak_diameter_m > 0`, updated `GUARDIAN` judge prompt for active leaks, raised `LLM_MAX_OUTPUT_TOKENS` default to `1500`, bound Gemini `reasoning_effort` to `"low"` and failed over on empty completions in `provider.ts`, and popped empty assistant turns before forced final replies in `runAgent.ts`.
  - Added unit tests (`unit_actions.test.ts`, `safety_fixes.test.ts`), added `.github/workflows/ci.yml` (parallel `test-shared`, `test-server`, `build`), updated `AGENTS.md` (parallel CI on branches + explicit prohibition on prompt-injection/adversarial tests), and added the collapsible `View full README` toggle with Models and Technologies tables to `README.md` and `README_ES.md`.
  - Deployed to Cloud Run (`tangohorizon-api-00015-62r`) and validated all 11 normal voice/TTS cases in parallel against production (`3.6 s` health fast-path, `8.2–11.7 s` weather/route/return/storm/wrong-kind, `20.9 s` full 4-action leak life-support protocol, `22.9 s` drone takeoff + east photo, `36.0 s` manip-1 rock sample).

## Files touched

- `AGENTS.md`, `README.md`, `README_ES.md`, `.github/workflows/ci.yml`, `.env.example`, `deploy.sh`
- `server/src/config.ts`, `server/src/llm/provider.ts`, `server/src/agents/{guardian,hierarchy,runAgent,unitCapabilities}.ts`, `server/src/agents/tools/registry.ts`, `server/src/agents/__tests__/unit_actions.test.ts`
- `web-test-3d/src/{main,state}.ts`, `web-test-3d/src/voice/voiceController.ts`

## Decisions

- Bounded `reasoning_effort` to `"low"` for Vertex/Gemini and treated empty `{content:"", tool_calls:[]}` completions as failover errors so `BASE` no longer stalls or returns empty replies.
- Replaced sequential local full-suite runs with parallel GitHub Actions jobs (`ci.yml`) and concurrent live probes, and prohibited prompt-injection/adversarial tests in `AGENTS.md`.

## State the work was left in

- `feat/robot-action-catalog` pushed with a PR opened to `main`, CI checks passing, and Cloud Run `tangohorizon-api-00015-62r` serving the validated backend. Waiting for user approval to merge the PR and proceed to `PENDING.md` / `PENDING_FRONT.md`.
