import OpenAI from "openai";
import { GoogleAuth } from "google-auth-library";
import { config, type ProviderName, type Tier } from "../config.js";

/**
 * Multi-provider OpenAI-compatible client supporting:
 * 1. "vertex": Google Cloud Vertex AI on `nasa-tango-horizon` (keyless via ADC / Service Account IAM)
 * 2. "gemini": Google AI Studio OpenAI-compatible endpoint (`GEMINI_API_KEY`)
 * 3. "meta": Meta Muse API (`META_API_KEY`)
 * Fails over across enabled providers on timeout or HTTP error.
 */
const googleAuth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const staticClients: Record<"gemini" | "meta", OpenAI> = {
  gemini: new OpenAI({
    apiKey: config.providers.gemini.apiKey || "missing",
    baseURL: config.providers.gemini.baseURL,
    maxRetries: 0,
  }),
  meta: new OpenAI({
    apiKey: config.providers.meta.apiKey || "missing",
    baseURL: config.providers.meta.baseURL,
    maxRetries: 0,
  }),
};

async function getClient(provider: ProviderName): Promise<OpenAI> {
  if (provider === "vertex") {
    const token = await googleAuth.getAccessToken();
    if (!token) throw new Error("Vertex AI ADC token unavailable");
    return new OpenAI({
      apiKey: token,
      baseURL: config.providers.vertex.baseURL,
      maxRetries: 0,
    });
  }
  return staticClients[provider];
}

export const modelFor = (tier: Tier, provider: ProviderName = config.primary): string => {
  const models = config.providers[provider].models;
  const model = models[tier] || models.medium;
  if (!model) throw new Error(`Missing model for tier ${tier} on provider ${provider}`);
  return model;
};

export const providerAvailable = (provider: ProviderName): boolean =>
  config.providers[provider].enabled;

export const llmAvailable = (): boolean =>
  !config.offline && config.providerOrder.some(providerAvailable);

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;

export interface ChatOptions {
  tools?: ChatTool[];
  json?: boolean;
  maxTokens?: number;
  provider?: ProviderName;
}

export async function chat(
  tier: Tier,
  messages: ChatMessage[],
  opts: ChatOptions = {}
) {
  const order: ProviderName[] = opts.provider
    ? [opts.provider]
    : config.providerOrder.filter(providerAvailable);

  if (!order.length) {
    throw new Error("No LLM provider enabled");
  }

  const timeout = tier === "fast" ? config.fastTimeoutMs : config.defaultTimeoutMs;
  let lastErr: unknown;

  for (const provider of order) {
    try {
      const client = await getClient(provider);
      const res = await client.chat.completions.create(
        {
          model: modelFor(tier, provider),
          messages,
          tools: opts.tools?.length ? opts.tools : undefined,
          response_format: opts.json ? { type: "json_object" } : undefined,
          max_tokens: opts.maxTokens ?? config.maxTokens,
        },
        { timeout }
      );
      const message = res.choices[0]?.message;
      if (!message) {
        throw new Error(`Empty completion choice from provider ${provider}`);
      }
      return message;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr;
}
