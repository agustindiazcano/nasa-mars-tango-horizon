import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = Fastify({ logger: true });

app.get("/api/health", async () => ({ ok: true }));

const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, maxAge: "1h" });
  app.get("/remote", (_req, reply) => reply.sendFile("remote.html"));
}

const port = Number(process.env.PORT ?? "8080");
await app.listen({ port, host: "0.0.0.0" });
