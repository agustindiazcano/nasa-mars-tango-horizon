locals {
  required_apis = toset([
    "cloudresourcemanager.googleapis.com",
    "aiplatform.googleapis.com",
    "texttospeech.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
  ])
}

# 1. Enable required Google Cloud APIs (Vertex AI, TTS, Cloud Run, Artifact Registry, Secret Manager)
resource "google_project_service" "apis" {
  for_each           = local.required_apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# 2. Dedicated Service Account for the Tango Horizon Backend (Cloud Run + Local Impersonation)
resource "google_service_account" "backend" {
  project      = var.project_id
  account_id   = "${var.service_name}-sa"
  display_name = "Tango Horizon Backend Service Account"
  description  = "Identity for Cloud Run backend: keyless Vertex AI inference, Cloud TTS, and Secret Manager access"
  depends_on   = [google_project_service.apis["iam.googleapis.com"]]
}

# 3. Least-privilege IAM roles for the Backend Service Account
resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# 4. Artifact Registry Docker repository for container images
resource "google_artifact_registry_repository" "repo" {
  project       = var.project_id
  location      = var.region
  repository_id = var.service_name
  description   = "Docker images for Tango Horizon backend and bundled web mirror"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis["artifactregistry.googleapis.com"]]
}

# 5. Secret Manager secrets for external LLM providers (Muse/Meta & Google AI Studio fallback)
resource "google_secret_manager_secret" "meta_api_key" {
  project   = var.project_id
  secret_id = "meta-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret" "gemini_api_key" {
  project   = var.project_id
  secret_id = "gemini-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_iam_member" "meta_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.meta_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_secret_manager_secret_iam_member" "gemini_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend.email}"
}

# 6. Cloud Run v2 Service (enabled when var.deploy_cloud_run = true after image push)
resource "google_cloud_run_v2_service" "backend" {
  count    = var.deploy_cloud_run ? 1 : 0
  project  = var.project_id
  name     = var.cloud_run_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account  = google_service_account.backend.email
    session_affinity = true
    timeout          = "3600s"

    scaling {
      min_instance_count = 1
      max_instance_count = 1
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "VERTEX_LOCATION"
        value = var.vertex_location
      }
      env {
        name  = "LLM_PROVIDER"
        value = var.llm_provider
      }
      env {
        name  = "ALLOWED_ORIGINS"
        value = var.allowed_origins
      }
      env {
        name  = "VERTEX_MODEL_LARGE"
        value = "google/gemini-4-carbon"
      }
      env {
        name  = "VERTEX_MODEL_MEDIUM"
        value = "google/gemini-4-argon"
      }
      env {
        name  = "VERTEX_MODEL_FAST"
        value = "google/gemini-4-hydrogen"
      }
      env {
        name  = "VERTEX_MODEL_JUDGE"
        value = "google/gemini-4-argon"
      }
      env {
        name  = "VERTEX_MODEL_VISION"
        value = "google/gemini-4-argon"
      }
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_project_iam_member.vertex_ai_user,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.deploy_cloud_run ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# 7. Keyless GitHub Actions Continuous Deployment via Workload Identity Federation (WIF)
resource "google_service_account" "github_cd" {
  project      = var.project_id
  account_id   = "${var.service_name}-cd"
  display_name = "Tango Horizon GitHub Actions CD Service Account"
  description  = "Keyless OIDC identity for GitHub Actions to build and deploy Cloud Run on main push"
  depends_on   = [google_project_service.apis["iam.googleapis.com"]]
}

locals {
  github_cd_roles = toset([
    "roles/run.admin",
    "roles/cloudbuild.builds.editor",
    "roles/storage.admin",
    "roles/artifactregistry.writer",
    "roles/secretmanager.viewer",
    "roles/serviceusage.serviceUsageConsumer",
  ])
}

resource "google_project_iam_member" "github_cd_roles" {
  for_each = local.github_cd_roles
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.github_cd.email}"
}

resource "google_service_account_iam_member" "github_cd_act_as_backend" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_cd.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "OIDC Workload Identity Pool for GitHub Actions CI/CD"
  depends_on = [
    google_project_service.apis["iam.googleapis.com"],
    google_project_service.apis["sts.googleapis.com"],
  ]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC Provider"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  attribute_condition = "assertion.repository == \"${var.github_repository}\""
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif_binding" {
  service_account_id = google_service_account.github_cd.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}
