import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Search local cwd, parent directory, module-relative repo root, and main repo root for .env
// so scripts and server processes work from any working directory or git worktree.
const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../.env"),
  fileURLToPath(new URL("../../.env", import.meta.url)),
];

for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const env = (key: string, fallback = "") => process.env[key] ?? fallback;

export type ProviderName = "vertex" | "gemini" | "meta";
export type Tier = "large" | "medium" | "fast" | "judge" | "vision";

export interface ProviderConfig {
  name: ProviderName;
  enabled: boolean;
  apiKey?: string;
  baseURL: string;
  models: Record<Tier, string>;
}

const gcpProject = env("GCP_PROJECT_ID", "nasa-tango-horizon");
const vertexLoc = env("VERTEX_LOCATION", "global");
const vertexHost =
  vertexLoc === "global"
    ? "aiplatform.googleapis.com"
    : `${vertexLoc}-aiplatform.googleapis.com`;

const providers: Record<ProviderName, ProviderConfig> = {
  vertex: {
    name: "vertex",
    enabled: env("VERTEX_ENABLED", "1") !== "0" && Boolean(gcpProject),
    baseURL: `https://${vertexHost}/v1beta1/projects/${gcpProject}/locations/${vertexLoc}/endpoints/openapi`,
    models: {
      large: env("VERTEX_MODEL_LARGE", "google/gemini-4-carbon"),
      medium: env("VERTEX_MODEL_MEDIUM", "google/gemini-4-argon"),
      fast: env("VERTEX_MODEL_FAST", "google/gemini-4-hydrogen"),
      judge: env("VERTEX_MODEL_JUDGE", "google/gemini-4-argon"),
      vision: env("VERTEX_MODEL_VISION", "google/gemini-4-argon"),
    },
  },
  gemini: {
    name: "gemini",
    enabled: Boolean(env("GEMINI_API_KEY") || env("FALLBACK_API_KEY")),
    apiKey: env("GEMINI_API_KEY") || env("FALLBACK_API_KEY"),
    baseURL: env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
    models: {
      large: env("GEMINI_MODEL_LARGE", "gemini-4-carbon"),
      medium: env("GEMINI_MODEL_MEDIUM", "gemini-4-argon"),
      fast: env("GEMINI_MODEL_FAST", "gemini-4-hydrogen"),
      judge: env("GEMINI_MODEL_JUDGE", "gemini-4-argon"),
      vision: env("GEMINI_MODEL_VISION", "gemini-4-argon"),
    },
  },
  meta: {
    name: "meta",
    enabled: Boolean(env("META_API_KEY")),
    apiKey: env("META_API_KEY"),
    baseURL: env("META_BASE_URL", "https://api.meta.ai/v1"),
    models: {
      large: env("LLM_MODEL_LARGE", "muse-wonder-1.0"),
      medium: env("LLM_MODEL_MEDIUM", "muse-wonder-1.0"),
      fast: env("LLM_MODEL_FAST", "muse-spark-1.3"),
      judge: env("LLM_MODEL_JUDGE", "muse-spark-1.3"),
      vision: env("LLM_MODEL_VISION", "muse-wonder-1.0"),
    },
  },
};

const rawPrimary = env("LLM_PROVIDER", "vertex") as ProviderName;
const primary: ProviderName = rawPrimary in providers ? rawPrimary : "vertex";
const providerOrder: ProviderName[] = [
  primary,
  ...(["vertex", "gemini", "meta"] as ProviderName[]).filter((p) => p !== primary),
];

export const config = {
  port: Number(env("PORT", "8080")),
  gcpProject,
  vertexLoc,
  origins: env("ALLOWED_ORIGINS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimit: Number(env("RATE_LIMIT_PER_MIN", "30")),
  // Reasoning models (Gemini 4, Muse Spark/Wonder) spend 150-450 tokens on thought; keep a safe floor.
  maxTokens: Math.max(1200, Number(env("LLM_MAX_OUTPUT_TOKENS", "1500"))),
  fastTimeoutMs: Math.max(6000, Number(env("LLM_FAST_TIMEOUT_MS", "8000"))),
  defaultTimeoutMs: Math.max(15000, Number(env("LLM_DEFAULT_TIMEOUT_MS", "20000"))),
  offline: env("AGENTS_OFFLINE", "0") === "1",
  primary,
  providerOrder,
  providers,
};
