import type { FastifyInstance } from "fastify";
import type {} from "@fastify/rate-limit";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { z } from "zod";
import { createHash } from "node:crypto";
import { config } from "./config.js";

// Uses Application Default Credentials: the Cloud Run service account in production,
// or `gcloud auth application-default login` on a developer workstation.
const tts = new TextToSpeechClient();
const LANGS = ["es-US", "en-US", "fr-FR", "de-DE", "it-IT"] as const;
const Body = z.object({
  text: z.string().min(1).max(400),
  lang: z.enum(LANGS),
});

// Bounded in-memory cache so repeated demo phrases return immediately without re-synthesis.
const cache = new Map<string, Buffer>();
const MAX_CACHE = 300;

export function registerTtsRoute(app: FastifyInstance): void {
  // Pre-warm the Cloud TTS gRPC channel + ADC token in the background so the first spoken reply does not stall.
  if (!config.offline && !process.env.VITEST) {
    void (async () => {
      await tts.initialize();
      const voiceName = process.env.TTS_VOICE_ES || undefined;
      await tts.synthesizeSpeech({
        input: { text: "OK" },
        voice: { languageCode: "es-US", name: voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.05 },
      });
    })().catch(() => {});
  }

  app.post(
    "/api/tts",
    {
      config: {
        rateLimit: { max: config.rateLimit * 2, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      const parsed = Body.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "bad request" });
      }

      const voiceName =
        process.env[`TTS_VOICE_${parsed.data.lang.slice(0, 2).toUpperCase()}`] || undefined;
      const key = createHash("sha1")
        .update(`${parsed.data.lang}|${voiceName ?? ""}|${parsed.data.text}`)
        .digest("hex");

      let audio = cache.get(key);
      if (!audio) {
        try {
          const [res] = await tts.synthesizeSpeech({
            input: { text: parsed.data.text },
            voice: { languageCode: parsed.data.lang, name: voiceName },
            audioConfig: { audioEncoding: "MP3", speakingRate: 1.05 },
          });
          if (!res.audioContent) {
            return reply.code(502).send({ error: "empty tts audio" });
          }
          audio = Buffer.from(res.audioContent as Uint8Array);
          if (cache.size >= MAX_CACHE) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
          }
          cache.set(key, audio);
        } catch (err) {
          req.log.warn({ err }, "Google Cloud TTS synthesis failed");
          return reply.code(502).send({ error: "tts_unavailable" });
        }
      }

      return reply
        .header("content-type", "audio/mpeg")
        .header("cache-control", "no-store")
        .send(audio);
    }
  );
}
