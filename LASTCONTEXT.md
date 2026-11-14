# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Antigravity

## What was done

- Branch `perf/multi-hop-latency`: voice client timeout 15 s -> 45 s (`web-test-3d`).
- `runAgent.ts`: tool calls of one turn (reads, `review()`, delegations) run with `Promise.all`; a direct `dispatch`/`arm_skill` for a unit already delegated to `ROBOT.<id>` in the same run is skipped.
- `hierarchy.ts`: `BASE` prompt forbids delegating and dispatching the same unit.
- `guardian.ts`: `dispatch` and `arm_skill` that pass `ruleCheck` skip the LLM judge when no untrusted text is in context and the request matches no injection pattern. `launch_pod` and `deploy_beacons` still use the judge.
- `npm test` (45 pass), `npm run build` and server `tsc --noEmit` pass.

## Files touched

- `server/src/agents/{runAgent,hierarchy,guardian}.ts`, `web-test-3d/src/voice/voiceController.ts`

## State the work was left in

- PR to `main` opened. Not done: Cloud Run redeploy (`./deploy.sh`) and validation on `tangohorizon.vercel.app` after merge; no latency measurement yet; streaming in `routes.ts` not evaluated (only if multi-agent latency stays > 12 s).
- `@vercel/analytics` `inject()`, 45 s timeout in `web/` and `vercel.json` -> `web/dist` wait for `web/` merge (`B15`) and Vercel Analytics enabled.
