# AGENTS.md

Shared instructions for all coding agents (Claude Code, Gemini CLI, Codex, etc.).
`CLAUDE.md` and `GEMINI.md` only import this file: any new rule goes here.

## Mandatory rule: before every session

**ALWAYS read `PENDING.md`, `PENDING_FRONT.md` and `LASTCONTEXT.md` before doing anything else in a session.** No exceptions, even if the requested task seems unrelated.

@LASTCONTEXT.md
@PENDING.md
@PENDING_FRONT.md

If your tool does not resolve the `@imports` above, open all three files manually before answering.

Unless the user says otherwise, continue with the highest-priority task in `PENDING.md` (or `PENDING_FRONT.md` for frontend sessions).

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

**Never push directly to `main`. Always work on a task branch and open a Pull Request (PR) to `main`, unless the human explicitly instructs otherwise.**

1. Before editing, run `git status` and `git pull --rebase origin main`, then create or switch to a task branch (`git checkout -b <branch-name>`).
2. Commit small on your branch, push the branch (`git push -u origin <branch-name>`), and open a Pull Request to `main` (`gh pr create --base main`).
3. Only push directly to `origin main` if the human explicitly tells you to do so for that session or task.
4. On a conflict, resolve it without discarding the other side's changes. Ask the user if unsure.

## Mandatory rule: atomic commits

**Every commit must be atomic: one single, self-contained logical change per commit. Never bundle multiple features, models, tasks, or large generated datasets into one giant commit.**

1. **One concern per commit:** Separate documentation/rule updates, shared types/constants, backend logic/tools, Python pipeline scripts, generated dataset outputs, and status file updates (`PENDING.md`, `LASTCONTEXT.md`) into distinct commits.
2. **Keep commits small and revertible:** Each commit must build and pass tests on its own so any single change can be reviewed, cherry-picked, or reverted (`git revert <sha>`) without collateral damage.
3. **Multi-worker / swarm integration:** When integrating work from multiple subagents or worktrees, cherry-pick or commit each worker's module as its own separate commit (or separate PR) rather than squashing unrelated modules together.
4. **Avoid bloated JSON/data diffs:** Keep generated JSON artifacts compact (only the fields consumed at runtime) and commit generated data assets separately from source code.

## Mandatory rule: parallel CI on GitHub branches

**Run full test suites and workspace builds in parallel on GitHub Actions rather than sequentially on the local machine.**

1. Keep local runs for quick targeted checks on the files you changed (`npx vitest run <file>`, `tsc --noEmit`).
2. Push your task branch and let `.github/workflows/ci.yml` execute `test-shared`, `test-server`, and `build` in parallel on GitHub (`gh run watch` or `gh pr checks --watch`).
3. Parallelize independent live integration/voice probes (concurrent requests) instead of running them sequentially.

## Mandatory rule: no prompt-injection tests

**Explicit prohibition on prompt injection, jailbreaks, fake system messages, images with embedded instructions, or any input designed to manipulate the model; this is non-negotiable.** Only use normal mission orders from the documented command/action list—never add invented adversarial cases to unit tests, integration scripts, or live voice/vision probes.

## Mandatory rule: when a task is finished

1. Commit each logical step atomically while working on the task.
2. When the task is finished, update `PENDING.md` (and `PENDING_FRONT.md` if it is a frontend task) and `LASTCONTEXT.md` in their own commit.
3. Push your branch to `origin` and open/update a PR to `main` (unless the human explicitly instructed to push to `main`).
4. **Ask the user for permission** before moving on to the next task. Do not start another task without their confirmation.

## Mandatory rule: no project status in the README

**Never write project status in `README.md`**: no progress, roadmap, pending work, "work in progress" notes, or recent changes. Status belongs only in the status files (`PENDING.md`, `PENDING_FRONT.md`, `LASTCONTEXT.md`) and in dedicated documents.

## Project

`nasa-mars-tango-horizon` (Tango Horizon) — Real-time 3D Mars surface mission operations simulator (Three.js WebGL2 at 60 FPS) over real NASA/USGS Gale Crater cartography, coupled with deterministic bioastronautics/physics (`@th/shared`), hands-free bilingual voice, phone-as-pointer WebSocket control, and an autonomous Multi-Agent AI System guarded by Run-Time Assurance (`GUARDIAN`).

- **Commands:**
  - App & workspaces: `npm install` (install workspaces), `npm run dev` (run `server` on `:8080` only), `npm run dev:web` (run `server` on `:8080` and `web` on `:5174`), `npm run build` (build `shared`, `server`, `web`), `npm start` (production server on `:8080`), `npm test` (run Vitest unit tests in `shared`, then in `server`; server tests run with `AGENTS_OFFLINE=1`).
  - GCP & Terraform (`nasa-tango-horizon`): `gcloud config set project nasa-tango-horizon`, `cd infra/terraform && terraform init && terraform plan && terraform apply`.

### Architecture: Frontend, Backend, Agents, MCP, RAG, and Deployment

1. **Workspace separation:**
   - **Frontend (`web/`):** Vite + TypeScript + Three.js viewer (`index.html`), curved CSS 3D HUD, local $<5\text{ ms}$ critical voice intents (`localIntents.ts`), and mobile pointer/PTT client (`remote.html`). The browser is the **single source of truth for mission simulation state**: it sends a JSON `MissionContext` snapshot on each agent call and applies the returned `actions`. Frontend plans and pending tasks are tracked in `PENDING_FRONT.md`.
   - **Backend (`server/`):** Stateless Fastify Node.js server exposing `/api/health`, `/api/agent/voice`, `/api/agent/run`, `/api/agent/vision`, `/api/tts` (Google Cloud Text-to-Speech), and `/ws/remote` (in-memory WebSocket room relay for the phone pointer). Never put API keys in `web/`.
   - **Shared (`shared/`, `@th/shared`):** Deterministic physics core (Pandolf metabolic rate, choked orifice flow, RK4 pod ballistics, sky-view-factor dose, solar power, route planners), shared TypeScript schemas, and i18n dictionaries (`EN`/`ES`/`FR`/`DE`/`IT`).
   - **Data pipeline (`tools/`):** Offline Python scripts that process raw NASA/USGS files from `data/` into static assets under `web/public/data/` with `provenance.json`.
2. **Where Agent Logic, MCP, and RAG run (all inside `server/`):**
   - **Agent orchestration (`server/src/agents/`):** Runs on the backend (`runAgent.ts`, `hierarchy.ts`). Voice orders hit `SUIT.VOICE-EXEC` (fast tier) first and escalate to `BASE` (large tier), which delegates to domain agents (`SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE`, `ROBOT.<id>`).
   - **In-process MCP servers (`server/src/agents/tools/mcp.ts`):** 6 domain MCP servers (`mcp-terrain`, `mcp-suit`, `mcp-environment`, `mcp-fleet`, `mcp-hud`, `mcp-knowledge`) run inside the same Fastify process via `InMemoryTransport` (zero network hop), generated from one tool registry (`registry.ts`). Read tools compute exact numbers via `@th/shared`; effect tools propose `Action` objects.
   - **In-memory BM25 RAG (`server/src/agents/tools/knowledge.ts` + `server/corpus/chunks.json`):** Runs inside `server/` (exposed through `mcp-knowledge` tool `search_docs`). Searches ~800-char chunks extracted from `NASA-STD-3001` (Vol. 1 & 2) and OCHMO briefs in $<2\text{ ms}$ with no external vector database, returning exact document and page citations.
   - **Safety Guardrail (`GUARDIAN`, `server/src/agents/guardian.ts`):** Every effect action passes deterministic hard limits (`ruleCheck`: vehicle slope limits, $15\text{ m}$ pod keep-out radius, $2\text{ m}$ manipulator arm keep-out from crew) followed by an LLM safety/prompt-injection judge (`judge`). Future roadmap plans (not yet implemented): post-guardrail 3-model escalated voting (`docs/impl/16_ESCALATED_MODEL_VOTING.md`: `gemini-4-carbon` `low` + `gemini-4-argon` + `muse-wonder` `medium`), bounded multi-turn voice history (`docs/impl/17_MULTITURN_VOICE_MEMORY.md`), persistent chat/voice session storage (`docs/impl/18_CHAT_SESSION_PERSISTENCE.md`), predictive biomedical monitoring with personal baselines (`docs/impl/19_PREDICTIVE_BIOMEDICAL_RAG.md`), component fault FDIR telemetry + RAG (`docs/impl/20_COMPONENT_FAULT_TELEMETRY_RAG.md`), and environmental/weather predictive telemetry + RAG (`docs/impl/21_ENVIRONMENTAL_WEATHER_RAG.md`).
3. **3-Provider LLM Failover (Vertex AI + Google AI Studio + Meta Muse) & Offline Resilience:**
   - **Primary + Automatic Failover (`server/src/llm/provider.ts`):**
     1. **Primary — Google Cloud Vertex AI (`vertex`, keyless via ADC / `tango-horizon-sa` on GCP project `nasa-tango-horizon`)**: `google/gemini-4-carbon` (`large` / brain: `BASE`), `google/gemini-4-argon` (`medium`, `judge`, `vision`: domain agents + `GUARDIAN`), `google/gemini-4-hydrogen` (`fast` / lightweight: `SUIT.VOICE-EXEC`).
     2. **Secondary — Google AI Studio / Gemini API (`gemini`, optional `GEMINI_API_KEY`)**: `gemini-4-carbon` (`large`), `gemini-4-argon` (`medium`, `judge`, `vision`), `gemini-4-hydrogen` (`fast`).
     3. **Backup — Meta Muse API (`meta`, `META_API_KEY`)**: `muse-wonder` (`large` / brain, `medium`, `vision`), `muse-spark` (`fast` / lightweight, `judge`).
   - **Low-latency routing & failover:** `check-llm.ts` benchmarks all enabled providers across tiers (`fast`, `medium`, `large`, `judge`, `vision`). At runtime, if the primary provider exceeds a tight timeout or returns an error (`429`/`5xx`), `provider.ts` automatically retries against the next configured provider within the same request.
   - **Deterministic Offline Fallback (`server/src/agents/offline.ts`):** If all cloud LLM providers are unreachable or `AGENTS_OFFLINE=1`, the backend executes deterministic rule-based tool calls and replies so the demo never breaks.
4. **Deployment & Terraform IaC (Vercel Frontend + Google Cloud Run Backend on `nasa-tango-horizon`):**
   - **Infrastructure-as-Code (`infra/terraform/`):** Provisions all Google Cloud APIs (`aiplatform`, `texttospeech`, `run`, `cloudbuild`, `artifactregistry`, `secretmanager`, `iam`), dedicated Service Account (`tango-horizon-sa@nasa-tango-horizon.iam.gserviceaccount.com` with `roles/aiplatform.user`), Artifact Registry (`us-central1-docker.pkg.dev/nasa-tango-horizon/tango-horizon`), Secret Manager secrets (`meta-api-key`, `gemini-api-key`), and Cloud Run service configuration.
   - **Backend (`server/`):** Deployed as a Docker container on **Google Cloud Run** (`nasa-tango-horizon`, `us-central1`, `--service-account tango-horizon-sa@nasa-tango-horizon.iam.gserviceaccount.com`, `--min-instances 1 --max-instances 1 --session-affinity` for WebSocket rooms). Cloud Run serves the API only (decision of 2026-11-15): Vercel serves the frontend, so the Dockerfile builds no frontend and the `web/dist` static mirror in `server/src/index.ts` stays inactive.
   - **Frontend (`web/`):** Deployed on **Vercel** (global Edge CDN for fast 3D asset/texture loading) configured with `VITE_API_URL=https://<cloud-run-service>.run.app` for `/api/*` and `/ws/remote`, with the Vercel domain whitelisted in Cloud Run's `ALLOWED_ORIGINS`.

### Project files

| Path | Content |
|---|---|
| `BLUEPRINT.md` | Title: "Tango Horizon: Master Technical Architecture Blueprint". The plan for the whole project. Read it before planning or starting a task. |
| `NASA_APIS.md` | Title: "NASA APIs". NASA and USGS data sources: endpoints, auth, fields used, and the API validation report. Update it when a source is added or changed. |
| `PENDING_FRONT.md` | Title: "Pending frontend tasks (`web/`)". Frontend reference plans and prioritized pending tasks for the `web/` workspace. |
| `web/` | Frontend workspace `@th/web` (Vite + TypeScript + Three.js procedural 3D viewer, HUD, phone pointer, voice/agents integration, `index.html`, `remote.html`, and static processed datasets in `web/public/data/`). Serves `tangohorizon.vercel.app` via `vercel.json`. Formerly `web-test-3d/`. |
| `server/` | Backend workspace (Fastify server, LLM/MCP agents, TTS proxy, WebSocket relay). |
| `shared/` | Shared workspace (`@th/shared`: physics core, types, i18n). |
| `deploy.sh` | Cloud Build + Cloud Run deploy script (`tangohorizon-api` on `us-central1`, Secret Manager + `ALLOWED_ORIGINS` wiring). |
| `vercel.json` | Vercel build and `/remote` rewrite config for the frontend deployment (`tangohorizon.vercel.app`). |
| `infra/terraform/` | Terraform Infrastructure-as-Code (`versions.tf`, `variables.tf`, `main.tf`, `outputs.tf`, `terraform.tfvars`) for GCP project `nasa-tango-horizon` (`291271901218`): APIs, `tango-horizon-sa`, IAM, Artifact Registry, Secret Manager, and Cloud Run. |
| `data/` | Downloaded NASA/USGS data, one folder per group (`rover_photos`, `donki`, `horizons`, `orbits_comms`, `trek`, `topography`, `ai4mars`, `moxie`, `radiation`, `atmosphere`, `suits`, `medical`), plus `manifest.json` (download status) and `validation.json` (URL validation results). |
| `docs/` | Project documents, listed below. |

#### Documents in `docs/`

| Path | Title |
|---|---|
| `docs/EXECUTION_PLAN_ORDER.md` | Execution plan order |
| `docs/3D_AND_VISUAL_PLAN.md` | 3D and Visual Implementation Plan |
| `docs/INFRASTRUCTURE_AND_VERTEX_AI.md` | Infrastructure, Terraform & Vertex AI Guide (`nasa-tango-horizon`) |
| `docs/LLM_CHECK.md` | LLM Provider & Voice Benchmark (`check-llm.ts`) |
| `docs/WEB_TEST_3D_PLAN.md` | Plan: `web-test-3d/` (now `web/`) — Standalone Procedural 3D Harness (historical) |
| `docs/impl/01_SCAFFOLD.md` | 01. Project scaffold |
| `docs/impl/02_DATA_PIPELINE.md` | 02. Data pipeline |
| `docs/impl/03_PHYSICS_CORE.md` | 03. Physics core |
| `docs/impl/04_TERRAIN_HELMET_HUD.md` | 04. 3D terrain, helmet and HUD |
| `docs/impl/05_SERVER.md` | 05. Server: static files, model proxy and relay |
| `docs/impl/06_PHONE_REMOTE.md` | 06. Phone as pointer |
| `docs/impl/07_VOICE.md` | 07. Hands-free voice |
| `docs/impl/08_AGENTS_TOOLS_MCP_GUARDIAN.md` | 08. AI agents, tools, MCP and guardrail |
| `docs/impl/09_SCENARIOS_WORLD.md` | 09. Scenarios, fleet, base and demo deck |
| `docs/impl/10_DEPLOY_SUBMISSION.md` | 10. Google Cloud deploy and submission |
| `docs/impl/11_HYDRATION_PROSPECTOR.md` | 11. Hydration Prospector: looking for water with AI and orbital data |
| `docs/impl/12_MANIPULATOR_ROBOT.md` | 12. Manipulator rover: a wheeled robot with a procedural arm driven by vision |
| `docs/impl/13_STORM_NOWCASTER.md` | 13. Storm Nowcaster: predicting dust storms and acting before they arrive |
| `docs/impl/14_I18N.md` | 14. Languages |
| `docs/impl/15_VEIN_DETECTOR.md` | 15. Vein Detector: a vision model that finds evidence of past water in rover images |
| `docs/impl/16_ESCALATED_MODEL_VOTING.md` | 16. Post-guardrail escalated multi-model voting decision system (future nice-to-have plan) |
| `docs/impl/17_MULTITURN_VOICE_MEMORY.md` | 17. Bounded multi-turn conversational memory for voice orders (future plan) |
| `docs/impl/18_CHAT_SESSION_PERSISTENCE.md` | 18. Persistent chat and voice session history (future plan) |
| `docs/impl/19_PREDICTIVE_BIOMEDICAL_RAG.md` | 19. Predictive biomedical monitoring, personal baseline and standards RAG (future plan) |
| `docs/impl/20_COMPONENT_FAULT_TELEMETRY_RAG.md` | 20. Component fault & predictive maintenance telemetry + aerospace FDIR RAG (future plan) |
| `docs/impl/21_ENVIRONMENTAL_WEATHER_RAG.md` | 21. Environmental, space-weather & Martian climate predictive telemetry + atmospheric RAG (future plan) |
| `docs/impl/22_RESCUE_SCENARIO_AND_BASE_REVISION.md` | 22. Crew rescue scenario, three-astronaut crew and base revision (plan) |

## Session memory

| File | Content | When to update |
|---|---|---|
| `LASTCONTEXT.md` | What was done last: summary of the previous session, decisions, and the state the work was left in | At the end of every session (overwritten, not accumulated) |
| `PENDING.md` | List of general/backend pending tasks with priority | Whenever a task is completed, added or reprioritized |
| `PENDING_FRONT.md` | List of frontend (`web/`) plans and pending tasks with priority | Whenever a frontend task is completed, added or reprioritized |

### When a session ends

1. Rewrite `LASTCONTEXT.md` with: date, what was done, files touched, decisions made and why, and the exact point where the work was left.
2. Update `PENDING.md` and `PENDING_FRONT.md`: remove what is done, add what is new, reorder priorities.
3. Do not keep in `LASTCONTEXT.md` anything that is already in `PENDING.md` or `PENDING_FRONT.md` (one is recent history, the others are what remains).

## Conventions

- Priorities use a traffic light: 🔴 blocking/urgent, 🟡 next, 🟢 later, ⚪ backlog.
