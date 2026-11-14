# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Antigravity

## What was done

- Completed **B8** (Cloud Run + Vercel deployment and post-deploy smoke verification):
  - Fixed stale `MissionContext` fields in `server/src/agents/__tests__/knowledge.test.ts` so `npm run build` compiles `@th/server` cleanly (`0` TypeScript errors).
  - Updated `infra/terraform/{variables,main,outputs,terraform.tfvars}` to separate `cloud_run_service_name = "tangohorizon-api"` from existing `tango-horizon-sa` and `tango-horizon` Artifact Registry, and aligned `vertex_location = "global"`.
  - Created `deploy.sh`, `.dockerignore`, `.gcloudignore`, and updated `Dockerfile` (anchored `/data`, `/tools`, `/docs`, `/infra` so `server/src/agents/tools` and `web/public/data` are included in Cloud Build, added `--quiet`, CRLF stripping when sourcing `.env`, and `ALLOWED_ORIGINS` wiring for Vercel).
  - Fixed `server/src/agents/runAgent.ts` (`maxSteps = 6` plus a tool-less final summary call when `maxSteps` is reached) so `BASE` never returns an empty `speech` string after multi-step tool loops.
  - Added `VITE_API_URL` support (`web-test-3d/src/api.ts`, `main.ts`, `voice/speak.ts`, `voice/voiceController.ts`, `remote/phoneClient.ts`, `remote/screenRelay.ts`), configured `publicDir: "../web/public"` in `web-test-3d/vite.config.ts`, and added root `vercel.json` (`/remote` rewrite).
  - Deployed backend to **Google Cloud Run** (`https://tangohorizon-api-yuhr7hkc7q-uc.a.run.app`, service `tangohorizon-api`, `us-central1`, service account `tango-horizon-sa@nasa-tango-horizon.iam.gserviceaccount.com`, Secret Manager `meta-api-key` + `gemini-api-key`) and frontend to **Vercel** (`https://tangohorizon.vercel.app`, project `tangohorizon` with `VITE_API_URL` in `production` & `preview`).
  - Verified live smoke tests: `/api/health` (`{"ok":true,"offline":false}`), CORS from `https://tangohorizon.vercel.app`, `/api/tts` (`audio/mpeg`), fast `SUIT.VOICE-EXEC` order (`1.6 s`), escalated `BASE` -> `ROBOT.rover-2` dispatch in Spanish with spoken response and `GUARDIAN` approval, weather forecast/hold-position `GUARDIAN` checks, `/data/terrain/meta.json` and `/remote` on Vercel, and verified `VITE_API_URL` is bundled with zero leaked API keys.
- Updated `README.md` with the supported-by banner above the title, team roles and clickable UTN FRBA / LinkedIn / Portfolio / GitHub links, and the NASA Space Apps Challenge Links section.
- Drafted and documented two future (unimplemented) plans via `pro` research subagents and linked them in `AGENTS.md` and `PENDING.md`:
  - `docs/impl/16_ESCALATED_MODEL_VOTING.md`: Post-guardrail 3-model voting (`gemini-4-carbon` `low`, `gemini-4-argon`, `muse-wonder` `medium`), plus full inventory of current `GUARDIAN` rules and Source of Truth layers.
  - `docs/impl/17_MULTITURN_VOICE_MEMORY.md`: Bounded multi-turn conversational memory (`history`, max 6 turns) for voice orders.

## Files touched

- `.dockerignore`, `.gcloudignore`, `.env.example`, `Dockerfile`, `deploy.sh`, `vercel.json`
- `infra/terraform/{variables.tf,main.tf,outputs.tf,terraform.tfvars}`
- `server/src/agents/runAgent.ts`, `server/src/agents/__tests__/knowledge.test.ts`
- `web-test-3d/vite.config.ts`, `web-test-3d/src/{api.ts,main.ts,voice/speak.ts,voice/voiceController.ts,remote/phoneClient.ts,remote/screenRelay.ts}`
- `docs/impl/16_ESCALATED_MODEL_VOTING.md`, `docs/impl/17_MULTITURN_VOICE_MEMORY.md`
- `AGENTS.md`, `README.md`, `PENDING.md`, `LASTCONTEXT.md`

## Decisions

- Separated `cloud_run_service_name = "tangohorizon-api"` from `service_name = "tango-horizon"` in Terraform so the existing `tango-horizon-sa` Service Account, `tango-horizon` Artifact Registry repo, and Secret Manager secrets remain intact without replacement.
- Configured `vercel.json` to deploy `web-test-3d/dist` (with `../web/public` static assets) to `https://tangohorizon.vercel.app` while `web/` is completed by the frontend team; switching to `web/dist` later only requires updating `buildCommand` and `outputDirectory` in `vercel.json`.
- Kept `docs/impl/16_ESCALATED_MODEL_VOTING.md` and `docs/impl/17_MULTITURN_VOICE_MEMORY.md` as documented backlog plans (`B16`, `B17`) without modifying runtime code.

## State the work was left in

- Cloud Run (`https://tangohorizon-api-yuhr7hkc7q-uc.a.run.app`) and Vercel (`https://tangohorizon.vercel.app`) are live and connected; `B8` is complete and removed from `PENDING.md`.
- All changes are on branch `feat/b8-deploy-cloudrun-vercel` with atomic commits and a PR opened to `main`.
- Only `B15` (final `README.md` tables + final deploy once `web/` is merged + `submission` tag) remains blocking in `PENDING.md`, alongside optional backlog plans `B16` and `B17`.
