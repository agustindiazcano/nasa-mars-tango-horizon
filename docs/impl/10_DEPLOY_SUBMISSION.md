# 10. Google Cloud & Vercel deploy and submission

**Goal:** the backend (`server/`, with MCP servers, BM25 RAG, `GUARDIAN`, TTS, and WebSocket relay, plus a bundled mirror of `web/dist`) public on Google Cloud Run over HTTPS with both API keys (`META_API_KEY` and `GEMINI_API_KEY`) protected in Secret Manager, the frontend (`web/`) deployed on Vercel Edge CDN pointing to Cloud Run via `VITE_API_URL`, and the submission material ready.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 5.2, 9 and 10; guide 01 (`Dockerfile`); `.env.example`.
**Plan tasks:** 4, 33, 34, 35.

## Code

`deploy.sh`:

```bash
#!/usr/bin/env bash
# Usage: ./deploy.sh   (reads .env from repo root; base infra provisioned via infra/terraform)
set -euo pipefail
set -a; source .env; set +a
: "${GCP_PROJECT_ID:=nasa-tango-horizon}" "${GCP_REGION:=us-central1}" "${VERTEX_LOCATION:=us-central1}" "${CLOUD_RUN_SERVICE:=tango-horizon}"
SA_EMAIL="${CLOUD_RUN_SERVICE}-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$GCP_PROJECT_ID"

# Store Muse/Meta and Google AI Studio keys in Secret Manager if provided (Vertex AI uses keyless ADC via SA_EMAIL).
SECRETS_LIST=()
upsert_secret() {
  local name="$1" env_var="$2" val="$3"
  if [ -z "$val" ]; then return; fi
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$val" | gcloud secrets create "$name" --data-file=-
  else
    printf '%s' "$val" | gcloud secrets versions add "$name" --data-file=-
  fi
  gcloud secrets add-iam-policy-binding "$name" --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.secretAccessor" >/dev/null
  SECRETS_LIST+=("${env_var}=${name}:latest")
}

upsert_secret "meta-api-key" "META_API_KEY" "${META_API_KEY:-}"
upsert_secret "gemini-api-key" "GEMINI_API_KEY" "${GEMINI_API_KEY:-}"

SECRETS_FLAG=()
if [ ${#SECRETS_LIST[@]} -gt 0 ]; then
  IFS=,; SECRETS_FLAG=(--set-secrets "${SECRETS_LIST[*]}"); unset IFS
fi

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --source . \
  --region "$GCP_REGION" \
  --service-account "$SA_EMAIL" \
  --allow-unauthenticated \
  --min-instances 1 --max-instances 1 \
  --cpu 1 --memory 1Gi \
  --timeout 3600 \
  --session-affinity \
  "${SECRETS_FLAG[@]}" \
  --set-env-vars "^@^GCP_PROJECT_ID=${GCP_PROJECT_ID}@GCP_REGION=${GCP_REGION}@VERTEX_LOCATION=${VERTEX_LOCATION}@VERTEX_ENABLED=${VERTEX_ENABLED:-1}@LLM_PROVIDER=${LLM_PROVIDER:-vertex}@VERTEX_MODEL_LARGE=${VERTEX_MODEL_LARGE:-google/gemini-4-carbon}@VERTEX_MODEL_MEDIUM=${VERTEX_MODEL_MEDIUM:-google/gemini-4-argon}@VERTEX_MODEL_FAST=${VERTEX_MODEL_FAST:-google/gemini-4-hydrogen}@VERTEX_MODEL_JUDGE=${VERTEX_MODEL_JUDGE:-google/gemini-4-argon}@VERTEX_MODEL_VISION=${VERTEX_MODEL_VISION:-google/gemini-4-argon}@GEMINI_BASE_URL=${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1beta/openai/}@GEMINI_MODEL_LARGE=${GEMINI_MODEL_LARGE:-gemini-4-carbon}@GEMINI_MODEL_MEDIUM=${GEMINI_MODEL_MEDIUM:-gemini-4-argon}@GEMINI_MODEL_FAST=${GEMINI_MODEL_FAST:-gemini-4-hydrogen}@GEMINI_MODEL_JUDGE=${GEMINI_MODEL_JUDGE:-gemini-4-argon}@GEMINI_MODEL_VISION=${GEMINI_MODEL_VISION:-gemini-4-argon}@META_BASE_URL=${META_BASE_URL:-https://api.meta.ai/v1}@LLM_MODEL_LARGE=${LLM_MODEL_LARGE:-muse-wonder}@LLM_MODEL_MEDIUM=${LLM_MODEL_MEDIUM:-muse-wonder}@LLM_MODEL_FAST=${LLM_MODEL_FAST:-muse-spark}@LLM_MODEL_JUDGE=${LLM_MODEL_JUDGE:-muse-spark}@LLM_MODEL_VISION=${LLM_MODEL_VISION:-muse-wonder}@TTS_VOICE_ES=${TTS_VOICE_ES:-es-US-Journey-D}@TTS_VOICE_EN=${TTS_VOICE_EN:-en-US-Journey-D}@RATE_LIMIT_PER_MIN=${RATE_LIMIT_PER_MIN:-30}@LLM_MAX_OUTPUT_TOKENS=${LLM_MAX_OUTPUT_TOKENS:-400}@AGENTS_OFFLINE=${AGENTS_OFFLINE:-0}"

URL=$(gcloud run services describe "$CLOUD_RUN_SERVICE" --region "$GCP_REGION" --format='value(status.url)')
ORIGINS="${URL}${VERCEL_URL:+,${VERCEL_URL}}"
gcloud run services update "$CLOUD_RUN_SERVICE" --region "$GCP_REGION" --update-env-vars "^@^ALLOWED_ORIGINS=${ORIGINS}" >/dev/null
echo "Cloud Run backend + mirror deployed at: $URL"
curl -fsS "$URL/api/health" && echo
```

## Frontend Deployment on Vercel (`web/`)

1. In Vercel, import the repository with **Root Directory** set to `.` (or deploy via `vercel --prod`), **Build Command**: `npm -w shared run build && npm -w web run build`, and **Output Directory**: `web/dist`.
2. Set the environment variable `VITE_API_URL=https://<cloud-run-service>.a.run.app` in Vercel Project Settings (no API keys are ever placed in Vercel).
3. In `web/src/`, all `/api/*` `fetch` calls prefix `import.meta.env.VITE_API_URL ?? ""` and WebSocket `/ws/remote` connects to `(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`) + "/ws/remote"`. When `VITE_API_URL` is empty (local Vite dev proxy or Cloud Run mirror), it uses same-origin paths automatically.
4. Add the deployed Vercel URL (e.g., `https://nasa-mars-tango-horizon.vercel.app`) to `VERCEL_URL` in `.env` and re-run the `ALLOWED_ORIGINS` update so Cloud Run accepts CORS and WebSocket connections from Vercel.

`.dockerignore`:

```
node_modules
**/node_modules
**/dist
data
docs
tools
.env
.git
*.bak.md
```

`.gcloudignore`:

```
.git
node_modules
**/node_modules
**/dist
data/
.env
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
