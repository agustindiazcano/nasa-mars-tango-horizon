# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Claude Code

## What was done

- Audit of the repo, then fixes merged in PR #11: vision intercept regex, single leak emergency protocol (`emergency_response_active`), aircraft grounding at tau >= 1.8 in `GUARDIAN` and frontend, `deploy.sh` carriage return, one trusted proxy hop for rate limits, sanitized `MissionContext`, vision route error handling, server tests in `npm test`.
- AI/RAG test run against a local server (no adversarial inputs): RAG integrity and latency (p95 0.53 ms), 62 `GUARDIAN` rule cases, offline fallback, providers, 15 agent cases through `/api/agent/run`.
- Branch `fix/ai-rag-findings` (former B28-B31 plus the coordinate anchor):
  - `chat()` returns an empty completion instead of throwing when every provider answers empty; agent routes return `offline: true/false`.
  - `decide()` takes the measured tau; `evaluate_eva_weather` returns `no_go` at tau 3.0.
  - Spoken replies pass through `plainSpeech` (no Markdown/LaTeX); `search_docs` capped at 2 per run and queried in English.
  - 120-token cap removed from the `GUARDIAN` judge and `check-llm.ts`: Meta models answer tool calls and JSON with the default budget.
  - `worldToPlanetocentric` anchors at the DTM window center from `terrain/meta.json` (-4.745, 137.400) instead of Bradbury Landing; every server lat/lon was 9.54 km off.
- Read-only audit of NASA data usage and of the scene coordinates; open gaps recorded as B32-B36.

## Files touched

- `server/src/llm/provider.ts`, `server/src/agents/{routes,runAgent,guardian,speech}.ts`, `server/src/agents/tools/{registry,terrainData}.ts`, `server/src/scripts/check-llm.ts`, `server/src/agents/__tests__/{speech,coordinates,knowledge}.test.ts`
- `shared/src/physics/stormDecision.ts` and its test

## Decisions

- An empty LLM completion is handled by the forced-final path in `runAgent.ts`, not by the offline rule engine: the offline engine answered a delegation order with a fixed site (S2) unrelated to the tool results.
- The scene anchor comes from the cartography metadata, so server and HUD report the same coordinates.
- Subagents run in isolated worktrees: sharing one working tree with another session moved the checkout mid-edit.

## State the work was left in

- `fix/ai-rag-findings` pushed with a PR to `main`; not deployed. Local checks: 46 tests in `shared`, 35 in `server`.
- A voice test run (local server, benign orders) was still in progress when the PR was opened; its results are not in this file.
