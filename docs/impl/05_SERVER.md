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
const useFallback = env("LLM_PROVIDER", "meta") === "fallback";

export const config = {
  port: Number(env("PORT", "8080")),
  origins: env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean),
  rateLimit: Number(env("RATE_LIMIT_PER_MIN", "30")),
  maxTokens: Number(env("LLM_MAX_OUTPUT_TOKENS", "400")),
  offline: env("AGENTS_OFFLINE", "0") === "1",
  llm: {
    apiKey: useFallback ? env("FALLBACK_API_KEY") : env("META_API_KEY"),
    baseURL: useFallback ? env("FALLBACK_BASE_URL") : env("META_BASE_URL", "https://api.meta.ai/v1"),
    models: {
      large: env("LLM_MODEL_LARGE"), medium: env("LLM_MODEL_MEDIUM"), fast: env("LLM_MODEL_FAST"),
      judge: env("LLM_MODEL_JUDGE"), vision: env("LLM_MODEL_VISION"),
    },
  },
};
export type Tier = keyof typeof config.llm.models;
```

`llm/provider.ts`:

```ts
import OpenAI from "openai";
import { config, type Tier } from "../config.js";

/** Cliente único. La API de Meta es compatible con OpenAI: cambiar de proveedor es cambiar baseURL, key y modelos. */
export const client = new OpenAI({ apiKey: config.llm.apiKey || "missing", baseURL: config.llm.baseURL, timeout: 20_000, maxRetries: 1 });

export const modelFor = (tier: Tier): string => {
  const m = config.llm.models[tier] || config.llm.models.medium;
  if (!m) throw new Error(`Falta LLM_MODEL_${tier.toUpperCase()} en .env`);
  return m;
};

export const llmAvailable = () => !config.offline && Boolean(config.llm.apiKey);

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export async function chat(tier: Tier, messages: Msg[], opts: { tools?: Tool[]; json?: boolean; maxTokens?: number } = {}) {
  const res = await client.chat.completions.create({
    model: modelFor(tier),
    messages,
    tools: opts.tools?.length ? opts.tools : undefined,
    response_format: opts.json ? { type: "json_object" } : undefined,
    max_tokens: opts.maxTokens ?? config.maxTokens,
  });
  return res.choices[0].message;
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

// Rechaza llamadas a /api y /ws desde orígenes no listados.
app.addHook("onRequest", async (req, reply) => {
  if (!req.url.startsWith("/api") && !req.url.startsWith("/ws")) return;
  const origin = req.headers.origin;
  if (origin && config.origins.length && !config.origins.includes(origin)) return reply.code(403).send({ error: "origin" });
});

app.get("/api/health", async () => ({ ok: true, offline: config.offline }));
registerRelay(app);
registerAgentRoutes(app);

const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
await app.register(fastifyStatic, { root: webDist, maxAge: "1h" });
app.get("/remote", (_req, reply) => reply.sendFile("remote.html"));

await app.listen({ port: config.port, host: "0.0.0.0" });
```

`scripts/check-llm.ts` (plan task 2, run this first):

```ts
import { chat, modelFor } from "../llm/provider.js";

const tiny = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const run = async (name: string, fn: () => Promise<unknown>) => {
  const t = Date.now();
  try { const r = await fn(); console.log(`OK   ${name} ${Date.now() - t} ms`, JSON.stringify(r).slice(0, 160)); }
  catch (e: any) { console.log(`FAIL ${name}`, e?.status ?? "", e?.message); }
};

for (const tier of ["fast", "medium", "large", "judge"] as const)
  await run(`texto ${tier} (${modelFor(tier)})`, () => chat(tier, [{ role: "user", content: "Reply with the word READY." }], { maxTokens: 10 }));

await run("imagen", () => chat("vision", [{ role: "user", content: [
  { type: "text", text: "What color is this pixel? One word." }, { type: "image_url", image_url: { url: tiny } } ] }], { maxTokens: 10 }));

await run("tool calling", () => chat("fast", [{ role: "user", content: "Open the thermal map." }], { tools: [{ type: "function",
  function: { name: "set_layer", description: "Switch the terrain layer", parameters: { type: "object",
    properties: { layer: { type: "string", enum: ["optical", "slope", "thermal", "radiation"] } }, required: ["layer"] } } }] }));

await run("JSON", () => chat("fast", [{ role: "user", content: 'Return JSON {"ok":true}' }], { json: true, maxTokens: 20 }));
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
