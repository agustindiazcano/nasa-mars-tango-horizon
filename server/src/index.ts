import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import fastifyRateLimit from "@fastify/rate-limit";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { registerRelay } from "./relay.js";
import { registerTtsRoute } from "./tts.js";
import { registerAgentRoutes } from "./agents/routes.js";

const app = Fastify({ logger: true, bodyLimit: 4_000_000, trustProxy: true });

await app.register(fastifyRateLimit, { global: false });
await app.register(fastifyWebsocket);

app.addHook("onRequest", async (req, reply) => {
  const origin = req.headers.origin;
  if (req.url.startsWith("/api/") && origin && config.origins.length) {
    if (!config.origins.includes(origin)) {
      return reply.code(403).send({ error: "origin not allowed" });
    }
    reply.header("access-control-allow-origin", origin);
    reply.header("access-control-allow-headers", "content-type");
    reply.header("access-control-allow-methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return reply.code(204).send();
  }
});

app.get("/api/health", async () => ({ ok: true, offline: config.offline }));

registerRelay(app);
registerTtsRoute(app);
await registerAgentRoutes(app);

const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, maxAge: "1h" });
  app.get("/remote", (_req, reply) => reply.sendFile("remote.html"));
}

await app.listen({ port: config.port, host: "0.0.0.0" });
