#!/usr/bin/env bash
# Usage: ./deploy.sh   (reads .env from repo root; base infra provisioned via infra/terraform)
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${GCP_PROJECT_ID:=nasa-tango-horizon}"
: "${GCP_REGION:=us-central1}"
: "${VERTEX_LOCATION:=global}"
: "${CLOUD_RUN_SERVICE:=tangohorizon-api}"
: "${SA_EMAIL:=tango-horizon-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"
: "${VERCEL_URL:=https://tangohorizon.vercel.app}"

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

SECRETS_LIST=()
ensure_secret() {
  local name="$1" env_var="$2" val="$3"
  if ! gcloud secrets describe "$name" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
    if [ -z "$val" ]; then return; fi
    printf '%s' "$val" | gcloud secrets create "$name" --project="$GCP_PROJECT_ID" --data-file=- >/dev/null
  else
    local existing_versions
    existing_versions=$(gcloud secrets versions list "$name" --project="$GCP_PROJECT_ID" --filter="state=ENABLED" --format="value(name)" | head -n 1 || true)
    if [ -n "$val" ] && { [ -z "$existing_versions" ] || [ "${UPDATE_SECRETS:-0}" = "1" ]; }; then
      printf '%s' "$val" | gcloud secrets versions add "$name" --project="$GCP_PROJECT_ID" --data-file=- >/dev/null
    fi
  fi
  gcloud secrets add-iam-policy-binding "$name" \
    --project="$GCP_PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
  SECRETS_LIST+=("${env_var}=${name}:latest")
}

ensure_secret "meta-api-key" "META_API_KEY" "${META_API_KEY:-}"
ensure_secret "gemini-api-key" "GEMINI_API_KEY" "${GEMINI_API_KEY:-}"

SECRETS_FLAG=()
if [ ${#SECRETS_LIST[@]} -gt 0 ]; then
  IFS=,
  SECRETS_FLAG=(--set-secrets "${SECRETS_LIST[*]}")
  unset IFS
fi

ENV_VARS="^@^GCP_PROJECT_ID=${GCP_PROJECT_ID}"
ENV_VARS+="@GCP_REGION=${GCP_REGION}"
ENV_VARS+="@VERTEX_LOCATION=${VERTEX_LOCATION}"
ENV_VARS+="@VERTEX_ENABLED=${VERTEX_ENABLED:-1}"
ENV_VARS+="@LLM_PROVIDER=${LLM_PROVIDER:-vertex}"
ENV_VARS+="@LLM_FAST_TIMEOUT_MS=${LLM_FAST_TIMEOUT_MS:-4000}"
ENV_VARS+="@LLM_DEFAULT_TIMEOUT_MS=${LLM_DEFAULT_TIMEOUT_MS:-12000}"
ENV_VARS+="@VERTEX_MODEL_LARGE=${VERTEX_MODEL_LARGE:-google/gemini-4-carbon}"
ENV_VARS+="@VERTEX_MODEL_MEDIUM=${VERTEX_MODEL_MEDIUM:-google/gemini-4-argon}"
ENV_VARS+="@VERTEX_MODEL_FAST=${VERTEX_MODEL_FAST:-google/gemini-4-hydrogen}"
ENV_VARS+="@VERTEX_MODEL_JUDGE=${VERTEX_MODEL_JUDGE:-google/gemini-4-argon}"
ENV_VARS+="@VERTEX_MODEL_VISION=${VERTEX_MODEL_VISION:-google/gemini-4-argon}"
ENV_VARS+="@GEMINI_BASE_URL=${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1beta/openai/}"
ENV_VARS+="@GEMINI_MODEL_LARGE=${GEMINI_MODEL_LARGE:-gemini-4-carbon}"
ENV_VARS+="@GEMINI_MODEL_MEDIUM=${GEMINI_MODEL_MEDIUM:-gemini-4-argon}"
ENV_VARS+="@GEMINI_MODEL_FAST=${GEMINI_MODEL_FAST:-gemini-4-hydrogen}"
ENV_VARS+="@GEMINI_MODEL_JUDGE=${GEMINI_MODEL_JUDGE:-gemini-4-argon}"
ENV_VARS+="@GEMINI_MODEL_VISION=${GEMINI_MODEL_VISION:-gemini-4-argon}"
ENV_VARS+="@META_BASE_URL=${META_BASE_URL:-https://api.meta.ai/v1}"
ENV_VARS+="@LLM_MODEL_LARGE=${LLM_MODEL_LARGE:-muse-wonder-1.0}"
ENV_VARS+="@LLM_MODEL_MEDIUM=${LLM_MODEL_MEDIUM:-muse-wonder-1.0}"
ENV_VARS+="@LLM_MODEL_FAST=${LLM_MODEL_FAST:-muse-spark-1.3}"
ENV_VARS+="@LLM_MODEL_JUDGE=${LLM_MODEL_JUDGE:-muse-spark-1.3}"
ENV_VARS+="@LLM_MODEL_VISION=${LLM_MODEL_VISION:-muse-wonder-1.0}"
ENV_VARS+="@TTS_VOICE_ES=${TTS_VOICE_ES:-es-US-Journey-D}"
ENV_VARS+="@TTS_VOICE_EN=${TTS_VOICE_EN:-en-US-Journey-D}"
ENV_VARS+="@RATE_LIMIT_PER_MIN=${RATE_LIMIT_PER_MIN:-30}"
ENV_VARS+="@LLM_MAX_OUTPUT_TOKENS=${LLM_MAX_OUTPUT_TOKENS:-400}"
ENV_VARS+="@AGENTS_OFFLINE=${AGENTS_OFFLINE:-0}"

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --project "$GCP_PROJECT_ID" \
  --source . \
  --region "$GCP_REGION" \
  --service-account "$SA_EMAIL" \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 1 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 3600 \
  --session-affinity \
  "${SECRETS_FLAG[@]}" \
  --set-env-vars "$ENV_VARS"

URL=$(gcloud run services describe "$CLOUD_RUN_SERVICE" --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --format='value(status.url)')
ORIGINS="${URL}${VERCEL_URL:+,${VERCEL_URL}}"
gcloud run services update "$CLOUD_RUN_SERVICE" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --update-env-vars "^@^ALLOWED_ORIGINS=${ORIGINS}" >/dev/null

echo "Cloud Run service deployed at: $URL"
echo "ALLOWED_ORIGINS set to: $ORIGINS"
curl -fsS "$URL/api/health" && echo
