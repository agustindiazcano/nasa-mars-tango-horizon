# 10. Google Cloud deploy and submission

**Goal:** the app public on Cloud Run over HTTPS, the key protected, and the submission material ready.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 5.2, 9 and 10; guide 01 (`Dockerfile`); `.env.example`.
**Plan tasks:** 4, 33, 34, 35.

## Code

`deploy.sh`:

```bash
#!/usr/bin/env bash
# Uso: ./deploy.sh   (lee .env de la raíz)
set -euo pipefail
set -a; source .env; set +a
: "${GCP_PROJECT_ID:?falta GCP_PROJECT_ID}" "${GCP_REGION:=us-central1}" "${CLOUD_RUN_SERVICE:=tango-horizon}"

gcloud config set project "$GCP_PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# La key va a Secret Manager, no a variables de entorno en texto plano.
if ! gcloud secrets describe meta-api-key >/dev/null 2>&1; then
  printf '%s' "$META_API_KEY" | gcloud secrets create meta-api-key --data-file=-
else
  printf '%s' "$META_API_KEY" | gcloud secrets versions add meta-api-key --data-file=-
fi
PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding meta-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --source . \
  --region "$GCP_REGION" \
  --allow-unauthenticated \
  --min-instances 1 --max-instances 1 \
  --cpu 1 --memory 1Gi \
  --timeout 3600 \
  --session-affinity \
  --set-secrets "META_API_KEY=meta-api-key:latest" \
  --set-env-vars "^@^LLM_PROVIDER=${LLM_PROVIDER:-meta}@META_BASE_URL=${META_BASE_URL}@LLM_MODEL_LARGE=${LLM_MODEL_LARGE}@LLM_MODEL_MEDIUM=${LLM_MODEL_MEDIUM}@LLM_MODEL_FAST=${LLM_MODEL_FAST}@LLM_MODEL_JUDGE=${LLM_MODEL_JUDGE}@LLM_MODEL_VISION=${LLM_MODEL_VISION}@RATE_LIMIT_PER_MIN=${RATE_LIMIT_PER_MIN:-30}@LLM_MAX_OUTPUT_TOKENS=${LLM_MAX_OUTPUT_TOKENS:-400}@AGENTS_OFFLINE=${AGENTS_OFFLINE:-0}"

URL=$(gcloud run services describe "$CLOUD_RUN_SERVICE" --region "$GCP_REGION" --format='value(status.url)')
gcloud run services update "$CLOUD_RUN_SERVICE" --region "$GCP_REGION" --update-env-vars "ALLOWED_ORIGINS=${URL}" >/dev/null
echo "Desplegado en: $URL"
curl -fsS "$URL/api/health" && echo
```

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
    9. "Use of AI": which models run in the app and that coding assistants were used to build it (confirm the event disclosure rule, plan task 1).
    10. How to run it locally.
11. **Video:** record with the deck hidden (`H`), 1080p at 60 FPS. Start already inside the helmet, no logos. Suggested order: phone moving the cursor (3 s) → voice order and drawn route (6 s) → manipulator rover handing over a tool (4 s) → storm forecast and the base reacting (5 s) → leak, pod and rescue (7 s) → hydration map and provenance panel with the URL (5 s). Fit the length to what the official 2026 guide requires.
12. **Code freeze Sunday 18:00.** After that, only fixes for bugs that break the demo. Tag the submission commit (`git tag submission`).
13. Do not `git push` or publish the repo unless the user asks.

## Acceptance criteria

- The public URL passes the full checklist from a device and a network that do not belong to the team.
- The README has the data, models and constants tables generated from code.
- The video is recorded and uploaded before 22:00 on Sunday.
