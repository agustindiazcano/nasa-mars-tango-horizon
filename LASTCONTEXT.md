# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Antigravity

## What was done

- Created `docs/3D_AND_VISUAL_PLAN.md` consolidating all 3D and visual tasks, shaders, terrain layers, cameras, actors, fleet, manipulator rover (`manip-1`), Mars base modules, GPU dust particles, HUD panels, modals, phone remote UI, file paths, and acceptance criteria.
- Created `PENDING_FRONT.md` for `web/` frontend plans and tasks (`F1`–`F15`).
- Completed previous `PENDING.md` Tasks 1 and 2 and replaced `PENDING.md` with the structured backend/shared/data task queue (`B1`–`B15`):
  - Defined project goal, stack, commands, and full architecture in `AGENTS.md` (Frontend `web/` on Vercel + Cloud Run mirror; Backend `server/` on Google Cloud Run hosting in-process MCP servers, BM25 RAG, `GUARDIAN`, Google Cloud TTS, and `/ws/remote` relay; Dual-LLM provider with Muse/Meta + Google AI Studio Gemini automatic failover + `offline.ts` deterministic fallback).
  - Updated `.env.example` with all environment variables (`META_API_KEY`, `GEMINI_API_KEY`, model tiers for both providers, `VITE_API_URL`, `ALLOWED_ORIGINS`, GCP/Cloud Run/TTS variables) and updated `.gitignore` with stack-specific entries.
- Updated `docs/impl/05_SERVER.md`, `docs/impl/10_DEPLOY_SUBMISSION.md`, and `docs/EXECUTION_PLAN_ORDER.md` to implement dual-provider failover (`meta` + `gemini`), CORS for Vercel, Secret Manager storage for both keys, and Vercel + Cloud Run deployment.

## Files touched

- `AGENTS.md` (updated project description, commands, and architecture)
- `.env.example` (populated all project variables)
- `.gitignore` (added Node/Vite/Vercel/Python/data entries)
- `docs/impl/05_SERVER.md` (added dual-provider `meta` + `gemini` failover and CORS headers)
- `docs/impl/10_DEPLOY_SUBMISSION.md` (added dual-secret Cloud Run deploy and Vercel frontend setup)
- `docs/EXECUTION_PLAN_ORDER.md` (updated Steps 0, 2, 11 for dual keys and Vercel + Cloud Run)
- `PENDING.md` (updated with backend/shared/data tasks `B1`–`B15`)
- `PENDING_FRONT.md` (added `VITE_API_URL` note to `F1`)
- `LASTCONTEXT.md` (updated)

## Decisions

- **Where agent logic, MCP, and RAG live:** All agent orchestration (`runAgent.ts`, `hierarchy.ts`), 6 in-process MCP servers (`mcp.ts`), in-memory BM25 RAG (`knowledge.ts` over `NASA-STD-3001` & OCHMO chunks), and `GUARDIAN` run on the stateless Node/Fastify backend (`server/`) on Google Cloud Run. The browser (`web/`) holds mission simulation state and runs `<5 ms` local critical voice intents (`localIntents.ts`), sending a `MissionContext` snapshot per request.
- **Dual-LLM Failover + Offline Resilience:** `server/src/llm/provider.ts` uses both Muse/Meta (`META_API_KEY`) and Google AI Studio (`GEMINI_API_KEY`, OpenAI-compatible endpoint) with tight per-tier timeouts and automatic failover, backed by `offline.ts` deterministic rule execution.
- **Hybrid Deployment:** Frontend (`web/`) deploys to Vercel (using `VITE_API_URL` pointing to Cloud Run) for global CDN speed, while Google Cloud Run hosts `server/` (and also serves `web/dist` as a mirror).

## State the work was left in

- All architecture, plans, `.env.example`, `.gitignore`, `PENDING.md`, and `PENDING_FRONT.md` are committed and pushed to `origin/main`.
- Next step is `B1` / `F1` (Step 1: Project scaffold in `01_SCAFFOLD.md`) upon user confirmation.
