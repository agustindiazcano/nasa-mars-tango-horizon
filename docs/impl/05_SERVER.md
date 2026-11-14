# 05. Server: static files, model proxy and relay

**Goal:** one Node process that serves the app, hides the API key and links the phone to the screen.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 5.2 and 5.3; `.env.example`.
**Plan tasks:** 2, 4, 12 (server side), 14.
**Location:** `server/src/`.

## Code

`config.ts`:

```ts
import "dotenv/config";

const env = (k: string, d = "") => process.env[k] ?? d;
export type ProviderName = "meta" | "gemini";
export type Tier = "large" | "medium" | "fast" | "judge" | "vision";

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  baseURL: string;
  models: Record<Tier, string>;
}

const providers: Record<ProviderName, ProviderConfig> = {
  meta: {
    name: "meta",
    apiKey: env("META_API_KEY"),
    baseURL: env("META_BASE_URL", "https://api.meta.ai/v1"),
    models: {
      large: env("LLM_MODEL_LARGE"),
      medium: env("LLM_MODEL_MEDIUM"),
      fast: env("LLM_MODEL_FAST"),
      judge: env("LLM_MODEL_JUDGE"),
      vision: env("LLM_MODEL_VISION"),
    },
  },
  gemini: {
    name: "gemini",
    apiKey: env("GEMINI_API_KEY") || env("FALLBACK_API_KEY"),
    baseURL: env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
    models: {
      large: env("GEMINI_MODEL_LARGE", "gemini-2.5-pro"),
      medium: env("GEMINI_MODEL_MEDIUM", "gemini-2.5-flash"),
      fast: env("GEMINI_MODEL_FAST", "gemini-2.5-flash"),
      judge: env("GEMINI_MODEL_JUDGE", "gemini-2.5-flash"),
      vision: env("GEMINI_MODEL_VISION", "gemini-2.5-flash"),
    },
  },
};

const primary: ProviderName = env("LLM_PROVIDER", "meta") === "gemini" ? "gemini" : "meta";
const secondary: ProviderName = primary === "meta" ? "gemini" : "meta";

export const config = {
  port: Number(env("PORT", "8080")),
  origins: env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean),
  rateLimit: Number(env("RATE_LIMIT_PER_MIN", "30")),
  maxTokens: Number(env("LLM_MAX_OUTPUT_TOKENS", "400")),
  fastTimeoutMs: Number(env("LLM_FAST_TIMEOUT_MS", "4000")),
  defaultTimeoutMs: Number(env("LLM_DEFAULT_TIMEOUT_MS", "12000")),
  offline: env("AGENTS_OFFLINE", "0") === "1",
  primary,
  secondary,
  providers,
};
```

`llm/provider.ts`:

```ts
import OpenAI from "openai";
import { config, type ProviderName, type Tier } from "../config.js";

/** Dual-provider client (Muse/Meta + Google AI Studio Gemini) with automatic low-latency failover. */
const clients: Record<ProviderName, OpenAI> = {
  meta: new OpenAI({ apiKey: config.providers.meta.apiKey || "missing", baseURL: config.providers.meta.baseURL, maxRetries: 0 }),
  gemini: new OpenAI({ apiKey: config.providers.gemini.apiKey || "missing", baseURL: config.providers.gemini.baseURL, maxRetries: 0 }),
};

export const modelFor = (tier: Tier, provider: ProviderName = config.primary): string => {
  const models = config.providers[provider].models;
  const m = models[tier] || models.medium;
  if (!m) throw new Error(`Missing model for tier ${tier} on provider ${provider} in .env`);
  return m;
};

export const providerAvailable = (p: ProviderName) => Boolean(config.providers[p].apiKey);
export const llmAvailable = () => !config.offline && (providerAvailable("meta") || providerAvailable("gemini"));

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export async function chat(tier: Tier, messages: Msg[], opts: { tools?: Tool[]; json?: boolean; maxTokens?: number; provider?: ProviderName } = {}) {
  const order: ProviderName[] = opts.provider
    ? [opts.provider]
    : [config.primary, config.secondary].filter(providerAvailable);
  if (!order.length) throw new Error("No LLM provider API key configured");

  const timeout = tier === "fast" ? config.fastTimeoutMs : config.defaultTimeoutMs;
  let lastErr: unknown;

  for (const p of order) {
    try {
      const res = await clients[p].chat.completions.create(
        {
          model: modelFor(tier, p),
          messages,
          tools: opts.tools?.length ? opts.tools : undefined,
          response_format: opts.json ? { type: "json_object" } : undefined,
          max_tokens: opts.maxTokens ?? config.maxTokens,
        },
        { timeout }
      );
      return res.choices[0].message;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
```

`relay.ts`:

```ts
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

interface Room { screen?: WebSocket; remotes: Set<WebSocket>; touched: number }
const rooms = new Map<string, Room>();
const CODE = /^[A-Z0-9]{6}$/;

/** Relay celular ↔ pantalla. La sala vive en memoria: por eso Cloud Run corre con una sola instancia. */
export function registerRelay(app: FastifyInstance) {
  app.get("/ws/remote", { websocket: true }, (socket: WebSocket, req) => {
    const q = req.query as { room?: string; role?: string };
    const code = (q.room ?? "").toUpperCase();
    const role = q.role === "screen" ? "screen" : "remote";
    if (!CODE.test(code)) return socket.close(1008, "bad room");

    const room = rooms.get(code) ?? { remotes: new Set<WebSocket>(), touched: Date.now() };
    rooms.set(code, room);
    if (role === "screen") { room.screen?.close(1000, "replaced"); room.screen = socket; }
    else {
      if (room.remotes.size >= 2) return socket.close(1008, "room full");
      room.remotes.add(socket);
      room.screen?.send(JSON.stringify({ t: "remote_joined" }));
    }

    socket.on("message", (raw: Buffer) => {
      if (raw.length > 512) return; // los mensajes del puntero son chicos; lo demás se descarta
      room.touched = Date.now();
      if (role === "remote") room.screen?.send(raw.toString());
      else for (const r of room.remotes) r.send(raw.toString());
    });
    socket.on("close", () => {
      if (role === "screen") { if (room.screen === socket) room.screen = undefined; }
      else { room.remotes.delete(socket); room.screen?.send(JSON.stringify({ t: "remote_left" })); }
    });
  });

  setInterval(() => {
    for (const [code, r] of rooms) if (!r.screen && !r.remotes.size && Date.now() - r.touched > 600_000) rooms.delete(code);
  }, 60_000).unref();
}
```

`index.ts`:

```ts
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { registerRelay } from "./relay.js";
import { registerAgentRoutes } from "./agents/routes.js"; // guía 08

const app = Fastify({ logger: true, bodyLimit: 4 * 1024 * 1024 }); // 4 MB: alcanza para un frame JPEG del rover
await app.register(rateLimit, { global: false });
await app.register(websocket, { options: { maxPayload: 4096 } });

// Rejects calls to /api and /ws from unlisted origins, and sets CORS headers for allowed origins (e.g. Vercel frontend).
app.addHook("onRequest", async (req, reply) => {
  if (!req.url.startsWith("/api") && !req.url.startsWith("/ws")) return;
  const origin = req.headers.origin;
  if (origin) {
    if (config.origins.length && !config.origins.includes(origin)) return reply.code(403).send({ error: "origin" });
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return reply.code(204).send();
});

app.get("/api/health", async () => ({ ok: true, offline: config.offline }));
registerRelay(app);
registerAgentRoutes(app);

const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
await app.register(fastifyStatic, { root: webDist, maxAge: "1h" });
app.get("/remote", (_req, reply) => reply.sendFile("remote.html"));

await app.listen({ port: config.port, host: "0.0.0.0" });
```

`scripts/check-llm.ts` (plan task 2, run this first against both `meta` and `gemini` providers):

```ts
import { chat, modelFor, providerAvailable } from "../llm/provider.js";
import type { ProviderName } from "../config.js";

const tiny = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const run = async (name: string, fn: () => Promise<unknown>) => {
  const t = Date.now();
  try { const r = await fn(); console.log(`OK   ${name} ${Date.now() - t} ms`, JSON.stringify(r).slice(0, 160)); }
  catch (e: any) { console.log(`FAIL ${name}`, e?.status ?? "", e?.message); }
};

for (const provider of (["meta", "gemini"] as ProviderName[]).filter(providerAvailable)) {
  console.log(`\n=== Provider: ${provider} ===`);
  for (const tier of ["fast", "medium", "large", "judge"] as const)
    await run(`${provider} text ${tier} (${modelFor(tier, provider)})`, () => chat(tier, [{ role: "user", content: "Reply with the word READY." }], { maxTokens: 10, provider }));

  await run(`${provider} vision`, () => chat("vision", [{ role: "user", content: [
    { type: "text", text: "What color is this pixel? One word." }, { type: "image_url", image_url: { url: tiny } } ] }], { maxTokens: 10, provider }));

  await run(`${provider} tool calling`, () => chat("fast", [{ role: "user", content: "Open the thermal map." }], { provider, tools: [{ type: "function",
    function: { name: "set_layer", description: "Switch the terrain layer", parameters: { type: "object",
      properties: { layer: { type: "string", enum: ["optical", "slope", "thermal", "radiation"] } }, required: ["layer"] } } }] }));

  await run(`${provider} JSON`, () => chat("fast", [{ role: "user", content: 'Return JSON {"ok":true}' }], { json: true, maxTokens: 20, provider }));
}
```

## Instructions for the coding agent

1. The `.env` lives at the repo root: use `dotenv.config({ path: "../.env" })` if the process starts inside `server/`.
2. **Run `npx tsx server/src/scripts/check-llm.ts` before any other agent work** and paste the output into `docs/LLM_CHECK.md`. Depending on the result:
   - Everything fails with 401 or 403: the key or the region is not accepted. Tell the user; do not keep trying variants.
   - Only the image check fails: the multimodal rover needs a different model in `LLM_MODEL_VISION`.
   - Tool calling fails: use the fallback mode in guide 08 (the model returns JSON naming the action).
   - JSON mode fails: drop `response_format`, ask for JSON in the prompt and validate with zod.
   - Record the latency of each tier: the `fast` tier must answer in under 1.5 s for voice.
3. Model names come from `.env`. Never write model IDs in code.
4. The origin check is a basic barrier; the real spending limit is the per-IP `rateLimit` on `/api/agent*` and `/api/tts` plus `LLM_MAX_OUTPUT_TOKENS`.
5. Never log the API key or full image payloads. Redact the `authorization` header in the logger.
6. Check the WebSocket handler signature against the installed `@fastify/websocket` version: in older versions the first argument is an object with `.socket`.
7. Register the TTS route from guide 07 (`registerTtsRoute(app)`).

## Acceptance criteria

- `check-llm.ts` runs and its result is documented.
- Two tabs connected to `/ws/remote?room=ABC123` with different roles exchange messages.
- `npm run build && npm start` serves the app at `http://localhost:8080` and `/remote` returns the phone page.
- The key does not appear in any file under `web/dist`.
