# Last context

> Summary of the previous session. Overwritten at the end of every session.

**Date:** 2026-11-14
**Agent:** Antigravity

## What was done

- Linked active `gcloud` CLI and Application Default Credentials (ADC) quota project to `nasa-tango-horizon` (`291271901218`).
- Created and applied Terraform Infrastructure-as-Code in `infra/terraform/` (`versions.tf`, `variables.tf`, `main.tf`, `outputs.tf`, `terraform.tfvars`, `.terraform.lock.hcl`) against `nasa-tango-horizon`:
  - Enabled 8 Google Cloud APIs: `cloudresourcemanager`, `aiplatform` (Vertex AI), `texttospeech` (Cloud TTS), `run` (Cloud Run), `cloudbuild`, `artifactregistry`, `secretmanager`, and `iam`.
  - Created dedicated backend Service Account `tango-horizon-sa@nasa-tango-horizon.iam.gserviceaccount.com` with `roles/aiplatform.user`, `roles/logging.logWriter`, `roles/monitoring.metricWriter`, and `roles/secretmanager.secretAccessor`.
  - Created Artifact Registry Docker repository `us-central1-docker.pkg.dev/nasa-tango-horizon/tango-horizon`.
  - Created Secret Manager secret containers `meta-api-key` and `gemini-api-key`.
- Updated `docs/impl/05_SERVER.md`, `docs/impl/01_SCAFFOLD.md`, `docs/impl/10_DEPLOY_SUBMISSION.md`, and `.env.example` to support the 3-provider LLM failover chain (`vertex` via keyless ADC on `nasa-tango-horizon`, `meta` via `META_API_KEY`, and `gemini` via `GEMINI_API_KEY`), backed by `offline.ts`.
- Created `docs/INFRASTRUCTURE_AND_VERTEX_AI.md` documenting the GCP resources, Vertex AI integration, Terraform commands, and Vercel + Cloud Run architecture, and indexed it in `AGENTS.md`.

## Files touched

- `infra/terraform/versions.tf`, `infra/terraform/variables.tf`, `infra/terraform/main.tf`, `infra/terraform/outputs.tf`, `infra/terraform/terraform.tfvars`, `infra/terraform/.terraform.lock.hcl` (created)
- `docs/INFRASTRUCTURE_AND_VERTEX_AI.md` (created)
- `AGENTS.md`, `PENDING.md`, `LASTCONTEXT.md` (updated)
- `.env.example`, `.gitignore` (updated for `nasa-tango-horizon`, Vertex AI, and Terraform state exclusions)
- `docs/impl/01_SCAFFOLD.md`, `docs/impl/05_SERVER.md`, `docs/impl/10_DEPLOY_SUBMISSION.md` (updated)

## Decisions

- Provisioned `nasa-tango-horizon` via Terraform with a dedicated least-privilege service account (`tango-horizon-sa`) granted `roles/aiplatform.user` so `server/` authenticates to Vertex AI (`https://us-central1-aiplatform.googleapis.com/v1/projects/nasa-tango-horizon/locations/us-central1/endpoints/openapi`) and Cloud TTS using keyless Application Default Credentials, with automatic failover to Muse/Meta (`META_API_KEY`), Google AI Studio (`GEMINI_API_KEY`), and `offline.ts`.

## State the work was left in

- Base GCP infrastructure on `nasa-tango-horizon` is live (`terraform apply` completed with 17 resources created).
- Next step is `B1` / `F1` (Step 1: Project scaffold in `docs/impl/01_SCAFFOLD.md`) upon user confirmation.
