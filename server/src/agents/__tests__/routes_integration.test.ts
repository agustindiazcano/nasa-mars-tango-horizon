import fastifyRateLimit from "@fastify/rate-limit";
import { READY_TERRAIN } from "@th/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockTts = vi.hoisted(() => ({
  initialize: vi.fn(async () => {}),
  synthesizeSpeech: vi.fn(),
}));

vi.mock("@google-cloud/text-to-speech", () => ({
  TextToSpeechClient: vi.fn(() => mockTts),
}));

import { config } from "../../config.js";
import { registerTtsRoute } from "../../tts.js";
import { registerAgentRoutes } from "../routes.js";

describe("Fastify HTTP routes integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(fastifyRateLimit, { global: false });
    app.get("/api/health", async () => ({ ok: true, offline: config.offline }));
    registerTtsRoute(app);
    await registerAgentRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockTts.synthesizeSpeech.mockReset();
  });

  it("GET /api/health returns ok and offline status", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, offline: true });
  });

  it("POST /api/agent/voice handles 200 offline, 400 invalid body, and 409 terrain mismatch", async () => {
    const okRes = await app.inject({
      method: "POST",
      url: "/api/agent/voice",
      payload: {
        text: "Status of my suit oxygen",
        lang: "en",
        context: {
          terrain: READY_TERRAIN,
          astronaut: { x: 0, z: 0 },
          suit: { o2_primary_kg: 1.08, suit_pressure_pa: 29600 },
          env: { tau: 0.5 },
        },
      },
    });
    expect(okRes.statusCode).toBe(200);
    const okBody = okRes.json();
    expect(okBody.offline).toBe(true);
    expect(okBody.terrain).toEqual(READY_TERRAIN);
    expect(typeof okBody.speech).toBe("string");
    expect(okBody.speech.length).toBeGreaterThan(0);
    expect(Array.isArray(okBody.actions)).toBe(true);
    expect(Array.isArray(okBody.trace)).toBe(true);

    const badBodyRes = await app.inject({
      method: "POST",
      url: "/api/agent/voice",
      payload: { text: "   ", lang: "en", context: { terrain: READY_TERRAIN } },
    });
    expect(badBodyRes.statusCode).toBe(400);
    expect(badBodyRes.json()).toEqual({ error: "bad request" });

    const mismatchRes = await app.inject({
      method: "POST",
      url: "/api/agent/voice",
      payload: {
        text: "Status of my suit oxygen",
        lang: "en",
        context: { terrain: { ...READY_TERRAIN, heightSha256: "mismatch" } },
      },
    });
    expect(mismatchRes.statusCode).toBe(409);
    expect(mismatchRes.json()).toMatchObject({
      error: "terrain_mismatch",
      actions: [],
      terrain: READY_TERRAIN,
    });
  });

  it("POST /api/agent/run handles 200 offline and 400 unknown agent", async () => {
    const okRes = await app.inject({
      method: "POST",
      url: "/api/agent/run",
      payload: {
        agent: "SCIENCE",
        text: "Check hydration near origin",
        lang: "en",
        context: { terrain: READY_TERRAIN },
      },
    });
    expect(okRes.statusCode).toBe(200);
    const okBody = okRes.json();
    expect(okBody.offline).toBe(true);
    expect(okBody.terrain).toEqual(READY_TERRAIN);
    expect(typeof okBody.speech).toBe("string");
    expect(okBody.speech.length).toBeGreaterThan(0);
    expect(Array.isArray(okBody.actions)).toBe(true);

    const unknownRes = await app.inject({
      method: "POST",
      url: "/api/agent/run",
      payload: {
        agent: "UNKNOWN-AGENT",
        text: "Check status",
        lang: "en",
        context: { terrain: READY_TERRAIN },
      },
    });
    expect(unknownRes.statusCode).toBe(400);
    expect(unknownRes.json()).toEqual({ error: "unknown agent" });

    const badBodyRes = await app.inject({
      method: "POST",
      url: "/api/agent/run",
      payload: { agent: "BASE" },
    });
    expect(badBodyRes.statusCode).toBe(400);
    expect(badBodyRes.json()).toEqual({ error: "bad request" });
  });

  it("POST /api/tts validates inputs (400) and serves MP3 with in-memory cache hit (200)", async () => {
    const badLang = await app.inject({
      method: "POST",
      url: "/api/tts",
      payload: { text: "Hello Mars", lang: "pt-BR" },
    });
    expect(badLang.statusCode).toBe(400);
    expect(badLang.json()).toEqual({ error: "bad request" });

    const emptyText = await app.inject({
      method: "POST",
      url: "/api/tts",
      payload: { text: "", lang: "en-US" },
    });
    expect(emptyText.statusCode).toBe(400);
    expect(emptyText.json()).toEqual({ error: "bad request" });

    const fakeMp3 = Buffer.from("ID3-MOCK-MP3-PAYLOAD");
    mockTts.synthesizeSpeech.mockResolvedValueOnce([{ audioContent: fakeMp3 }]);

    const phrase = "Suit pressure nominal at 29.6 kilopascals.";
    const first = await app.inject({
      method: "POST",
      url: "/api/tts",
      payload: { text: phrase, lang: "en-US" },
    });
    expect(first.statusCode).toBe(200);
    expect(first.headers["content-type"]).toContain("audio/mpeg");
    expect(first.headers["cache-control"]).toBe("no-store");
    expect(first.rawPayload).toEqual(fakeMp3);
    expect(mockTts.synthesizeSpeech).toHaveBeenCalledTimes(1);

    const second = await app.inject({
      method: "POST",
      url: "/api/tts",
      payload: { text: phrase, lang: "en-US" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.headers["content-type"]).toContain("audio/mpeg");
    expect(second.rawPayload).toEqual(fakeMp3);
    expect(mockTts.synthesizeSpeech).toHaveBeenCalledTimes(1);
  });
});
