output "project_id" {
  description = "Configured Google Cloud Project ID"
  value       = var.project_id
}

output "region" {
  description = "Configured Google Cloud Region"
  value       = var.region
}

output "service_account_email" {
  description = "Dedicated Service Account email for Cloud Run and Vertex AI"
  value       = google_service_account.backend.email
}

output "artifact_registry_repository" {
  description = "Artifact Registry Docker repository URI"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}

output "vertex_openai_base_url" {
  description = "Vertex AI OpenAI-compatible Chat Completions endpoint URL"
  value       = var.vertex_location == "global" ? "https://aiplatform.googleapis.com/v1beta1/projects/${var.project_id}/locations/global/endpoints/openapi" : "https://${var.vertex_location}-aiplatform.googleapis.com/v1beta1/projects/${var.project_id}/locations/${var.vertex_location}/endpoints/openapi"
}

output "cloud_run_url" {
  description = "Deployed Cloud Run backend URL (when deploy_cloud_run = true)"
  value       = var.deploy_cloud_run ? google_cloud_run_v2_service.backend[0].uri : null
}
