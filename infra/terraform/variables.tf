variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  default     = "nasa-tango-horizon"
}

variable "region" {
  description = "Primary Google Cloud region for Cloud Run and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "vertex_location" {
  description = "Vertex AI region for Gemini/OpenAI-compatible inference"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "tango-horizon"
}

variable "llm_provider" {
  description = "Primary LLM provider: vertex, meta, or gemini"
  type        = string
  default     = "vertex"
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed CORS/WebSocket origins (e.g. Vercel frontend URL)"
  type        = string
  default     = "http://localhost:5173,http://localhost:8080"
}

variable "deploy_cloud_run" {
  description = "Set to true once the container image has been built and pushed to Artifact Registry"
  type        = bool
  default     = false
}

variable "container_image" {
  description = "Container image URI in Artifact Registry for the Cloud Run service"
  type        = string
  default     = "us-central1-docker.pkg.dev/nasa-tango-horizon/tango-horizon/server:latest"
}
