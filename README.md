[![Leer en español](https://img.shields.io/badge/Leer%20en-espa%C3%B1ol-0ea5e9?style=for-the-badge)](README_ES.md)

<sub>This effort is supported by [NASA](https://www.nasa.gov/), [NASA Space Apps Challenge](https://www.spaceappschallenge.org/), [CONAE](https://www.argentina.gob.ar/ciencia/conae), [Universidad de Palermo](https://www.palermo.edu/) & [IBM Argentina](https://www.ibm.com/ar-es).</sub><br/>
<sub>All project development took place within the hackathon window starting Nov 14, 2026 at 09:00 ART (UTC-3), verifiable by repository creation (2026-11-14 16:56:55 UTC), commit hashes (initial commit [a3f7a4e](https://github.com/agustindiazcano/nasa-mars-tango-horizon/commit/a3f7a4e7d0bfa7ba5677b80eec3c6523eb61433b)), and [Pull Requests](https://github.com/agustindiazcano/nasa-mars-tango-horizon/pulls?q=is%3Apr).</sub>

# Tango Horizon: AI Systems for EVA and Mars Exploration

**Autonomous Multi-Agent AI Systems for Extravehicular Activities (EVA)**

## Index

- [Team: Tango Horizon (Buenos Aires, Argentina)](#team-tango-horizon-buenos-aires-argentina)
- [NASA Space Apps Challenge Links](#nasa-space-apps-challenge-links)
- [AI Usage](#ai-usage)
- [Full Technical README (Models & Technologies)](#full-technical-readme)
- [License](#license)

## Team: Tango Horizon (Buenos Aires, Argentina)

- **Agustin Diaz Cano:** MS Candidate, Systems Engineering ([UTN, FRBA](https://frba.utn.edu.ar/)) · [LinkedIn](https://www.linkedin.com/in/agustindiazcano/) · [Portfolio](https://www.agustindiazcano.com/) · [GitHub](https://github.com/agustindiazcano) · [Qollab](https://qollab.xyz/u/agustindiazcano) · [YouTube](https://www.youtube.com/@agustin-diaz-cano)
- **Baltazar Salerno:** Frontend Developer · [GitHub](https://github.com/S-Baltazar)
- **Milagros Sotelo:** Systems Engineering Student ([UTN, FRBA](https://frba.utn.edu.ar/)) · [GitHub](https://github.com/Milagros-Sotelo)
- **Federico Yaconis:** 3D Developer & QA

## NASA Space Apps Challenge Links

- **Team:** https://www.spaceappschallenge.org/2026/find-a-team/tango-horizon/?tab=project
- **Local Event — [Universidad de Palermo](https://www.palermo.edu/) (Buenos Aires, Argentina) Node:** https://www.spaceappschallenge.org/2026/local-events/buenos-aires/
- **Challenge — Interplanetary Survival Guide: Martian Map:** https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/
- **Rules (Participant Terms & Conditions):** https://www.spaceappschallenge.org/legal/
- **Participant Resources & FAQs:** https://www.spaceappschallenge.org/resources/ · https://www.spaceappschallenge.org/resources/participant-faqs/
- **Space Apps Challenge:** https://www.spaceappschallenge.org/

## AI Usage

### AI-assisted development methodology (Software 3.0)

This project was built with AI-assisted development in the Software 3.0 style: AI coding agents took part in the whole development process (implementation, tests, CI/CD, pull requests, commits and documentation validated and designed by human, deploy), under human direction and review.

- **Coding agents:** Codex, Claude Code, Gemini Antigravity, IBM Bob, Meta Muse
- **Parallel orchestration & isolation:** Multiple agents running in parallel via an orchestrator coordinating medium-tier models, each in its own git worktree and branch to avoid conflicts, plus a code reviewer agent
- **Workflow AI:** ChatGPT, Gemini, Google AI Studio, Grok

**Contracts for agent context.** Agents receive their context through contract files: [`AGENTS.md`](AGENTS.md) (rules), [`PENDING.md`](PENDING.md) (prioritized open tasks) and [`LASTCONTEXT.md`](LASTCONTEXT.md) (latest state and next step). Every task updates [`PENDING.md`](PENDING.md) and [`LASTCONTEXT.md`](LASTCONTEXT.md) so the next agent starts from the same state.

**Human responsibility (human in the loop).** All plan, code review, data validation, designs, mathematical formulations, implementations and empirical results were audited and verified by the authors.

<a id="full-technical-readme"></a>
<details>
<summary><strong>View full README — Architecture, Models &amp; Technologies</strong></summary>

## System Overview

Tango Horizon is a real-time 3D Mars surface EVA operations simulator over NASA/USGS Gale Crater cartography, combining deterministic bioastronautics/physics (`@th/shared`), hands-free multilingual voice, a phone-as-pointer WebSocket remote, and a hierarchical Multi-Agent AI System guarded by Run-Time Assurance (`GUARDIAN`).

- **Voice & Multi-Agent Orchestration (`server/src/agents/`):** Spoken orders hit `SUIT.VOICE-EXEC` (fast tier) and escalate to `BASE` (large tier), which coordinates domain specialists (`SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE`) and unit planners (`ROBOT.<id>`).
- **In-Process MCP Servers (`server/src/agents/tools/mcp.ts`):** Six domain MCP servers (`terrain`, `environment`, `suit`, `fleet`, `hud`, `knowledge`) run in-process over `InMemoryTransport`.
- **BM25 Standards RAG (`server/src/agents/tools/knowledge.ts`):** In-memory BM25 search over `NASA-STD-3001` (Vol. 1 & 2), `OCHMO` briefs, `AMCL`, `Mars-GRAM`, and `MOXIE` chunks (`server/corpus/chunks.json`) with document and page citations.
- **Run-Time Assurance (`GUARDIAN`, `server/src/agents/guardian.ts`):** Deterministic hard safety limits (vehicle slope limits, 15 m pod keep-out radius, 2 m manipulator arm clearance, aircraft dust opacity `tau < 1.8` grounding, no pyrotechnics near 100% O2 suits) paired with an LLM safety & prompt-injection judge.
- **3-Provider LLM Failover (`server/src/llm/provider.ts`):** Automatic failover across Google Cloud Vertex AI (primary via ADC), Google AI Studio, and Meta Muse API, plus a deterministic offline fallback (`offline.ts`).

## Models Used

| Component / Tier | Model / Architecture | Provider / Framework | Purpose & Notes |
|---|---|---|---|
| Orchestrator (`large`) | `google/gemini-4-carbon` (failover: `gemini-4-carbon`, `muse-wonder-1.0`) | Vertex AI / Google AI Studio / Meta Muse | `BASE` multi-agent mission planner and tool orchestrator |
| Domain Agents & Vision (`medium`, `vision`) | `google/gemini-4-argon` (failover: `gemini-4-argon`, `muse-wonder-1.0`) | Vertex AI / Google AI Studio / Meta Muse | `SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE`, `ROBOT.<id>`, and rover camera analysis |
| Suit Voice Executor (`fast`) | `google/gemini-4-hydrogen` (failover: `gemini-4-hydrogen`, `muse-spark-1.3`) | Vertex AI / Google AI Studio / Meta Muse | Low-latency HUD, telemetry, and voice routing (`SUIT.VOICE-EXEC`) |
| Safety Judge (`judge`) | `google/gemini-4-argon` (failover: `gemini-4-argon`, `muse-spark-1.3`) | Vertex AI / Google AI Studio / Meta Muse | `GUARDIAN` contextual safety and prompt-injection evaluation |
| Neural Voice Synthesis (TTS) | Journey neural voices (`es-US-Journey-D`, `en-US-Journey-D`, `fr-FR`, `de-DE`, `it-IT`) | Google Cloud Text-to-Speech | Spoken radio replies via `/api/tts` with in-memory SHA-1 cache |
| Hydration Prospector (`tango-horizon-hydration-v1`) | `GradientBoostingRegressor` ensemble (mean + quantiles) | scikit-learn (Python) | Near-surface mineral-bound hydrogen indicator (`R² = 0.364`, `Spearman = 0.582`, 500 m spatial-block CV, `n = 1,567`) |
| Storm Nowcaster (`rems_hgbr_quantile_v1`) | Quantile `HistGradientBoostingRegressor` (`q = 0.1, 0.5, 0.9`) + CQR | scikit-learn (Python) | 1–3 sol atmospheric dust `tau` forecast from REMS tides (`MY 34` held out, `Spearman = 0.765–0.796`) |
| Mineral Vein Detector (`tango-horizon-veins-v1`) | Frozen `facebook/dinov2-small` (`dinov2_vits14`) + `LogisticRegression` (with Gabor/morphological fallback) | PyTorch, Hugging Face `transformers`, scikit-learn | Visual vein-candidate detection & patch heatmaps on MSL Mastcam/MAHLI (`ROC-AUC = 0.845`, `PR-AUC = 0.796`, `n = 117`) |
| 3D Assets | Generative 3D meshes (GLB) | Meshy AI | Rover, astronaut, and surface base asset models |

## Technologies & Infrastructure

| Layer | Technologies |
|---|---|
| Frontend & 3D Viewer | TypeScript, Vite, Three.js (`three` WebGL2), CSS 3D curved HUD, Web Speech API, Web Audio API, `qrcode`, `@vercel/analytics` |
| Backend & Agent Runtime | Node.js 22, Fastify 5 (`@fastify/static`, `@fastify/websocket`, `@fastify/rate-limit`), `@modelcontextprotocol/sdk` (`InMemoryTransport`), Zod (`zod`, `zod-to-json-schema`), `openai` SDK, `google-auth-library` |
| Shared Physics & Testing | TypeScript (`@th/shared`: Pandolf metabolic rate, choked orifice flow, RK4 ballistics, sky-view-factor dose, A*/route planners), Vitest (`vitest`) |
| Data Science & GIS Pipeline | Python 3, NumPy, Pandas, SciPy, scikit-learn, `joblib`, PyTorch (`torch`), `transformers`, Pillow, Matplotlib, Rasterio, PyProj, PyMuPDF (`pymupdf`), Requests |
| Google Cloud & IaC | Terraform (`infra/terraform/`), Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Vertex AI, Cloud Text-to-Speech, Cloud IAM (`tango-horizon-sa`) |
| Containers, Hosting & CI/CD | Docker (`node:22-slim` multi-stage build), GitHub Actions (`.github/workflows/ci.yml` parallel test & build jobs), Vercel (Edge CDN + `/remote` rewrite), GitHub (branches & Pull Requests), `deploy.sh` |

## Workspaces & Commands

- `shared/` (`@th/shared`): Deterministic physics core, schemas, and i18n dictionaries (`EN`/`ES`/`FR`/`DE`/`IT`).
- `server/` (`@th/server`): Fastify API, in-process MCP servers, BM25 RAG, `GUARDIAN`, TTS proxy, and WebSocket room relay (`/ws/remote`).
- `web-test-3d/` / `web/`: Vite + Three.js 3D viewer, voice controller, and static NASA/USGS datasets under `web/public/data/`.
- `tools/`: Offline Python data, terrain, RAG corpus, and ML training pipelines.
- `infra/terraform/`: Google Cloud infrastructure definitions for project `nasa-tango-horizon`.

```bash
npm install
npm run dev:test3d
npm test
npm run build
```

</details>

## License

Copyright (c) 2026 Agustin Diaz-Cano, Baltazar Salerno, Milagros Sotelo and Federico Yaconis.

This project is licensed under the [MIT License](LICENSE).
