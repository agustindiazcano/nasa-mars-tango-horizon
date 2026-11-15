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

export interface ChatCallMeta {
  provider: ProviderName;
  model: string;
  ms: number;
  finishReason?: string | null;
  usage?: unknown;
}

export interface ChatOptions {
  tools?: ChatTool[];
  json?: boolean;
  maxTokens?: number;
  provider?: ProviderName;
  providers?: ProviderName[];
  onMeta?: (meta: ChatCallMeta) => void;
}

/** Strips Google-specific extension fields from assistant/tool_call history when sending to non-Google providers. */
export function sanitizeMessagesForProvider(messages: ChatMessage[], provider: ProviderName): ChatMessage[] {
  if (provider !== "meta") return messages;
  return messages.map((m) => {
    if (m.role !== "assistant") return m;
    const raw = m as unknown as Record<string, unknown>;
    const toolCalls = Array.isArray(raw.tool_calls)
      ? raw.tool_calls.map((tc: unknown) => {
          const t = tc as { id?: string; type?: string; function?: unknown };
          return { id: t.id, type: t.type ?? "function", function: t.function };
        })
      : undefined;
    return {
      role: "assistant",
      content: (raw.content as string | null | undefined) ?? null,
      ...(toolCalls?.length ? { tool_calls: toolCalls } : {}),
    } as ChatMessage;
  });
}

export async function chat(
  tier: Tier,
  messages: ChatMessage[],
  opts: ChatOptions = {}
) {
  const order: ProviderName[] = opts.provider
    ? [opts.provider]
    : (opts.providers?.length ? opts.providers : config.providerOrder).filter(providerAvailable);

  if (!order.length) {
    throw new Error("No LLM provider enabled");
  }

  const timeout = tier === "fast" ? config.fastTimeoutMs : config.defaultTimeoutMs;
  let lastErr: unknown;
  let emptyMessage: OpenAI.Chat.Completions.ChatCompletionMessage | undefined;

  for (const provider of order) {
    const model = modelFor(tier, provider);
    const started = Date.now();
    try {
      const client = await getClient(provider);
      const res = await client.chat.completions.create(
        {
          model,
          messages: sanitizeMessagesForProvider(messages, provider),
          tools: opts.tools?.length ? opts.tools : undefined,
          response_format: opts.json ? { type: "json_object" } : undefined,
          max_tokens: opts.maxTokens ?? config.maxTokens,
          // Keep Gemini reasoning bounded on Vertex/AI Studio so tool turns stay fast and never burn all tokens on thought.
          ...(provider !== "meta" ? { reasoning_effort: "low" as const } : {}),
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        { timeout }
      );
      const ms = Date.now() - started;
      const choice = res.choices[0];
      const message = choice?.message;
      opts.onMeta?.({
        provider,
        model,
        ms,
        finishReason: choice?.finish_reason ?? null,
        usage: res.usage,
      });
      if (!message) {
        throw new Error(`Empty completion choice from provider ${provider}`);
      }
      if (!message.content?.trim() && !message.tool_calls?.length) {
        console.warn(
          JSON.stringify({
            event: "llm_empty_completion",
            provider,
            tier,
            model,
            ms,
            finish_reason: choice?.finish_reason ?? null,
            usage: res.usage ?? null,
          })
        );
        // Empty reply: try the next provider, but keep it so the caller can run its own empty-reply path.
        emptyMessage = message;
        continue;
      }
      return message;
    } catch (err) {
      const ms = Date.now() - started;
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: unknown }).status
          : undefined;
      const name = err instanceof Error ? err.constructor.name : "Error";
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        JSON.stringify({
          event: "llm_provider_error",
          provider,
          tier,
          model,
          ms,
          ...(status !== undefined ? { status } : {}),
          err: name,
          message: msg.slice(0, 200),
        })
      );
      lastErr = err;
    }
  }

  // Every provider answered empty or failed: an empty reply is not an outage, so return it instead of throwing.
  if (emptyMessage) return emptyMessage;
  throw lastErr;
}
