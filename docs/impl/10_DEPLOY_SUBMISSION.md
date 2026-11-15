# 10. Google Cloud & Vercel deploy and submission

**Goal:** the backend (`server/`, with MCP servers, BM25 RAG, `GUARDIAN`, TTS, and WebSocket relay, plus a bundled mirror of `web/dist`) public on Google Cloud Run over HTTPS with both API keys (`META_API_KEY` and `GEMINI_API_KEY`) protected in Secret Manager, the frontend (`web/`) deployed on Vercel Edge CDN pointing to Cloud Run via `VITE_API_URL`, and the submission material ready.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 5.2, 9 and 10; guide 01 (`Dockerfile`); `.env.example`.
**Plan tasks:** 4, 33, 34, 35.

## Code

`deploy.sh` (current deployment script in repo root):

```bash
#!/usr/bin/env bash
# Usage: ./deploy.sh   (reads .env from repo root; base infra provisioned via infra/terraform)
set -euo pipefail

if [ -f .env ]; then
  set -a
  source <(tr -d '\r' < .env)
  set +a
fi

: "${GCP_PROJECT_ID:=nasa-tango-horizon}"
: "${GCP_REGION:=us-central1}"
: "${VERTEX_LOCATION:=global}"
: "${CLOUD_RUN_SERVICE:=tangohorizon-api}"
: "${SA_EMAIL:=tango-horizon-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"
: "${VERCEL_URL:=https://tangohorizon.vercel.app}"
# Builds image with `gcloud builds submit --tag us-central1-docker.pkg.dev/nasa-tango-horizon/tango-horizon/${CLOUD_RUN_SERVICE}:latest .`
# Deploys Cloud Run with --min-instances 1 --max-instances 1 --session-affinity --service-account "$SA_EMAIL"
# Sets ALLOWED_ORIGINS="${URL},${VERCEL_URL}" and smoke-checks "$URL/api/health"
```

> **Live deployment (PR #3):**
> - **Cloud Run backend:** `https://tangohorizon-api-yuhr7hkc7q-uc.a.run.app` (`tangohorizon-api`, `us-central1`, `tango-horizon-sa@nasa-tango-horizon.iam.gserviceaccount.com`)
> - **Vercel frontend:** `https://tangohorizon.vercel.app` (configured with `VITE_API_URL=https://tangohorizon-api-yuhr7hkc7q-uc.a.run.app` in `production` and `preview`)

## Frontend Deployment on Vercel (`vercel.json`)

1. Root `vercel.json` currently builds `web/dist` (with `publicDir: "../web/public"` so static NASA terrain and model assets are served from `/data/*`) while `web/` is completed by the frontend team:
   - `buildCommand`: `npm -w shared run build && npm -w web run build` (switch to `npm -w web run build` and `outputDirectory: "web/dist"` when `web/` is merged in **B15**).
   - `rewrites`: `/remote` -> `/remote.html`.
2. Set `VITE_API_URL=https://tangohorizon-api-yuhr7hkc7q-uc.a.run.app` in Vercel Project Settings (no API keys are ever placed in Vercel).
3. In frontend `src/`, all `/api/*` `fetch` calls prefix `import.meta.env.VITE_API_URL ?? ""` and WebSocket `/ws/remote` connects to `(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`) + "/ws/remote"`. When `VITE_API_URL` is empty (local Vite dev proxy or Cloud Run mirror), it uses same-origin paths automatically.
4. Add the deployed Vercel URL to `VERCEL_URL` in `.env` and re-run `./deploy.sh` so `ALLOWED_ORIGINS` accepts CORS and WebSocket connections from Vercel.

`.dockerignore` (root-anchored so `web/public/data` and `server/src/agents/tools` are preserved):

```
node_modules
**/node_modules
**/dist
/data
/docs
/tools
/infra
.env
.env.*
.git
.vercel
*.bak.md
```

`.gcloudignore`:

```
.git
node_modules
**/node_modules
**/dist
/data/
/docs/
/tools/
/infra/
.env
.env.*
.vercel/
*.bak.md
```

## Instructions for the coding agent

1. **Ask the user for confirmation before running `deploy.sh`**: it creates billable resources in their Google Cloud account and publishes a URL. It needs `gcloud auth login` done by the user and billing enabled on the project.
2. Do not set `PORT` on Cloud Run: the platform injects it (8080). The server already reads `process.env.PORT`.
3. `min-instances=1` and `max-instances=1` are intentional: relay rooms live in memory. Do not raise `max-instances` without moving rooms to a shared store.
4. `--timeout 3600` is the longest a WebSocket connection lives on Cloud Run. The client already reconnects (guide 06).
5. If the Meta key is US-only, region `us-central1` makes calls originate there. Verify after deploy with a real voice order, not only `/api/health`.
6. If the fallback provider is used, create a second secret `fallback-api-key` and add it to `--set-secrets`.
7. Add to the script: enable `texttospeech.googleapis.com`, grant the Cloud Run service account permission to call it, and pass the `TTS_VOICE_*` variables in `--set-env-vars`.
8. `web/public/data` travels inside the image. If it exceeds 80 MB, find what was left uncompressed before deploying.
9. **Checklist after every deploy:**

   | Test | How |
   |------|-----|
   | Cold load | Incognito window, terrain visible in under 5 s |
   | Phone | Scan the QR on mobile data (no Wi-Fi), move the cursor, select |
   | Voice | One HUD order and one that escalates to `BASE`, in Spanish and in English, each answered in a neural voice |
   | Guardrail | Order a rover onto an excessive slope: rejected |
   | No model | `AGENTS_OFFLINE=1` on a test revision: the demo deck still works |
   | Key | Search network responses and the bundle for the key value: it must not appear |
   | Console | No errors in the browser console |

10. **README.md** (English; this is what judges read), in this order:
    1. One sentence saying what it is, plus a link to the live demo.
    2. 5-second GIF of the HUD with the phone as pointer.
    3. "NASA data used" table: dataset, product ID, source, what it is used for. Generate it from `provenance.json`.
    4. "Physics models" table: model, equation, reference, code file and test.
    5. "Constants" table generated from `C` in `shared/src/physics/constants.ts`, flagging design assumptions.
    6. "Our models" section: the Hydration Prospector and the Storm Nowcaster, each with data, method, validation numbers and limits.
    7. Diagram of the agent hierarchy and the guardrail.
    8. "Limitations": everything that is an approximation or an assumption, stated plainly. Include the gravity scaling of the metabolic model, the thermal proxy and the geometric dose approximation.
    9. "AI-assisted development methodology (Software 3.0)": which models run in the app and the Software 3.0 agent contract methodology (`AGENTS.md`, `PENDING.md`, `LASTCONTEXT.md`) under human-in-the-loop verification.
    10. How to run it locally.
11. **Video:** record with the deck hidden (`H`), 1080p at 60 FPS. Start already inside the helmet, no logos. Suggested order: phone moving the cursor (3 s) → voice order and drawn route (6 s) → manipulator rover handing over a tool (4 s) → storm forecast and the base reacting (5 s) → leak, pod and rescue (7 s) → hydration map and provenance panel with the URL (5 s). Fit the length to what the official 2026 guide requires.
12. **Code freeze Sunday 18:00.** After that, only fixes for bugs that break the demo. Tag the submission commit (`git tag submission`).
13. Do not `git push` or publish the repo unless the user asks.

## Acceptance criteria

- The public URL passes the full checklist from a device and a network that do not belong to the team.
- The README has the data, models and constants tables generated from code.
- The video is recorded and uploaded before 22:00 on Sunday.
