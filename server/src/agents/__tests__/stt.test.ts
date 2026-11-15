import Fastify from "fastify";
import { READY_TERRAIN } from "@th/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

const mockState = vi.hoisted(() => ({
  llmOnline: true,
  chat: vi.fn(),
}));

vi.mock("../../llm/provider.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../llm/provider.js")>();
  return {
    ...actual,
    llmAvailable: () => mockState.llmOnline,
    chat: (...args: unknown[]) => mockState.chat(...args),
  };
});

import { config } from "../../config.js";
import { timeoutForAttempt } from "../../llm/provider.js";
import { registerAgentRoutes } from "../routes.js";
import {
  needsTranscriptNormalization,
  normalizeAudioBase64,
  normalizeVoiceTranscript,
  transcribeAudioDetailed,
} from "../stt.js";
import { setLang } from "@th/shared";
import { MissionStore } from "../../../../web-test-3d/src/state";
import { encodeWav16kMono } from "../../../../web-test-3d/src/voice/listen";
import { VoiceController } from "../../../../web-test-3d/src/voice/voiceController";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    terrain: READY_TERRAIN,
    lang: "en",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.45, co2_pa: 210 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.9, busy: false },
      { id: "rover-2", kind: "rover_science", x: -100, z: -240, battery: 0.85, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

function makeAudioContextStub() {
  return class MockAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    async resume() {}
    async decodeAudioData() {
      return {};
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    createBiquadFilter() {
      return {
        type: "bandpass",
        frequency: { value: 0 },
        Q: { value: 0 },
        connect() {},
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        connect() {},
        start() {},
        stop() {},
      };
    }
  };
}

const SAMPLE_WAV_B64 = Buffer.from("RIFFDATA12345678").toString("base64");

describe("W1 STT audio transcription, normalization, and B37 bounds", () => {
  beforeEach(() => {
    mockState.llmOnline = true;
    mockState.chat.mockReset();
    setLang("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates and strips data-URL headers in normalizeAudioBase64", () => {
    expect(normalizeAudioBase64(`  data:audio/wav;base64,${SAMPLE_WAV_B64}  `)).toBe(SAMPLE_WAV_B64);
    expect(normalizeAudioBase64(`data:audio/webm;codecs=opus;base64,${SAMPLE_WAV_B64.slice(0, 8)}\n${SAMPLE_WAV_B64.slice(8)}`)).toBe(
      SAMPLE_WAV_B64,
    );
    expect(normalizeAudioBase64("")).toBeNull();
    expect(normalizeAudioBase64("AAAA")).toBeNull();
    expect(normalizeAudioBase64("abcde===")).toBeNull();
    expect(normalizeAudioBase64("not_base64!@#")).toBeNull();
  });

  it("classifies clean domain phrases vs noisy ASR slips in needsTranscriptNormalization", () => {
    expect(needsTranscriptNormalization("")).toBe(false);
    expect(needsTranscriptNormalization("Check suit oxygen margin")).toBe(false);
    expect(needsTranscriptNormalization("Dispatch rover-1 to S2")).toBe(false);
    expect(needsTranscriptNormalization("Mostrá la capa térmica")).toBe(false);

    expect(needsTranscriptNormalization("rober uno ven")).toBe(true);
    expect(needsTranscriptNormalization("dron dos despega")).toBe(true);
    expect(needsTranscriptNormalization("route to site two")).toBe(true);
    expect(needsTranscriptNormalization("show high ration layer")).toBe(true);
    expect(needsTranscriptNormalization("rover rover check")).toBe(true);
    expect(needsTranscriptNormalization("xyzzy unknown")).toBe(true);
  });

  it("transcribeAudioDetailed sends input_audio to Google fast tier and strips transcript formatting", async () => {
    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: 'Transcript: "Dispatch rover-1 to S2"',
    });

    const res = await transcribeAudioDetailed(`data:audio/wav;base64,${SAMPLE_WAV_B64}`, "wav", "en", makeContext(), "rober one");
    expect(res).toEqual({
      transcript: "Dispatch rover-1 to S2",
      source: "llm_audio",
      fallback: false,
    });

    expect(mockState.chat).toHaveBeenCalledTimes(1);
    const [tier, messages, opts] = mockState.chat.mock.calls[0] as [
      string,
      Array<{ role: string; content: unknown }>,
      { providers?: string[]; timeoutMs?: number },
    ];
    expect(tier).toBe("fast");
    expect(opts.providers).toEqual(["vertex", "gemini"]);
    expect(opts.timeoutMs).toBe(config.sttTimeoutMs);
    const userContent = messages[1].content as Array<{ type: string; input_audio?: { data: string; format: string } }>;
    expect(userContent[1].type).toBe("input_audio");
    expect(userContent[1].input_audio?.data).toBe(SAMPLE_WAV_B64);
    expect(userContent[1].input_audio?.format).toBe("wav");
  });

  it("transcribeAudioDetailed falls back to normalized_hint or raw_hint on audio error and respects offline mode", async () => {
    mockState.chat
      .mockRejectedValueOnce(new Error("vertex timeout"))
      .mockResolvedValueOnce({ role: "assistant", content: "rover-1 go to S2" });

    const normFallback = await transcribeAudioDetailed(SAMPLE_WAV_B64, "wav", "en", makeContext(), "rober uno go to site two");
    expect(normFallback).toEqual({
      transcript: "rover-1 go to S2",
      source: "normalized_hint",
      fallback: true,
    });

    mockState.chat.mockRejectedValueOnce(new Error("audio error"));
    const noHint = await transcribeAudioDetailed(SAMPLE_WAV_B64, "wav", "en", makeContext());
    expect(noHint).toEqual({ transcript: "", source: "none", fallback: true });

    mockState.llmOnline = false;
    const offlineWithHint = await transcribeAudioDetailed(SAMPLE_WAV_B64, "wav", "en", makeContext(), "Check suit");
    expect(offlineWithHint).toEqual({ transcript: "Check suit", source: "raw_hint", fallback: true });
    const offlineNoHint = await transcribeAudioDetailed(SAMPLE_WAV_B64, "wav", "en", makeContext());
    expect(offlineNoHint).toEqual({ transcript: "", source: "none", fallback: true });
  });

  it("normalizeVoiceTranscript falls back safely on LLM error or oversized output", async () => {
    // Clean domain phrase skips LLM unless forced.
    expect(await normalizeVoiceTranscript("Check suit oxygen margin", "en", makeContext())).toBe("Check suit oxygen margin");
    expect(mockState.chat).not.toHaveBeenCalled();

    // Error fallback returns rawText unchanged.
    mockState.chat.mockRejectedValueOnce(new Error("provider unavailable"));
    expect(await normalizeVoiceTranscript("rober uno ven", "es", makeContext())).toBe("rober uno ven");

    // Oversized output fallback rejects hallucinated paragraphs.
    mockState.chat.mockResolvedValueOnce({ role: "assistant", content: "word ".repeat(120) });
    expect(await normalizeVoiceTranscript("rober uno ven", "es", makeContext())).toBe("rober uno ven");

    // Valid repair returns cleaned output.
    mockState.chat.mockResolvedValueOnce({ role: "assistant", content: '"rover-1 ven"' });
    expect(await normalizeVoiceTranscript("rober uno ven", "es", makeContext())).toBe("rover-1 ven");
  });

  it("handles POST /api/stt validation, mocked audio transcription, and offline fallback", async () => {
    const app = Fastify();
    await registerAgentRoutes(app);

    try {
      const badB64 = await app.inject({
        method: "POST",
        url: "/api/stt",
        payload: { audio_base64: "not valid base64!!", format: "wav", lang: "en" },
      });
      expect(badB64.statusCode).toBe(400);

      mockState.llmOnline = false;
      const offlineNoHint = await app.inject({
        method: "POST",
        url: "/api/stt",
        payload: { audio_base64: SAMPLE_WAV_B64, format: "wav", lang: "en" },
      });
      expect(offlineNoHint.statusCode).toBe(503);

      const offlineWithHint = await app.inject({
        method: "POST",
        url: "/api/stt",
        payload: { audio_base64: SAMPLE_WAV_B64, format: "wav", lang: "en", raw_text: "Check suit pressure" },
      });
      expect(offlineWithHint.statusCode).toBe(200);
      expect(offlineWithHint.json()).toMatchObject({
        transcript: "Check suit pressure",
        source: "raw_hint",
        fallback: true,
        offline: true,
      });

      mockState.llmOnline = true;
      mockState.chat.mockResolvedValueOnce({ role: "assistant", content: "Check suit oxygen margin" });
      const onlineOk = await app.inject({
        method: "POST",
        url: "/api/stt",
        payload: { audio_base64: SAMPLE_WAV_B64, format: "wav", lang: "en" },
      });
      expect(onlineOk.statusCode).toBe(200);
      expect(onlineOk.json()).toMatchObject({
        transcript: "Check suit oxygen margin",
        source: "llm_audio",
        fallback: false,
        offline: false,
      });
    } finally {
      await app.close();
    }
  });

  it("handles POST /api/agent/voice with audio_base64 online and offline", async () => {
    const app = Fastify();
    await registerAgentRoutes(app);
    const ctx = makeContext();

    try {
      const placeholderOnly = await app.inject({
        method: "POST",
        url: "/api/agent/voice",
        payload: { text: "(voice audio)", lang: "en", context: ctx },
      });
      expect(placeholderOnly.statusCode).toBe(400);

      // Online audio path: 1 fast STT call + 1 fast SUIT.VOICE-EXEC call (no duplicate normalization).
      mockState.llmOnline = true;
      mockState.chat
        .mockResolvedValueOnce({ role: "assistant", content: "Show thermal layer" })
        .mockResolvedValueOnce({
          role: "assistant",
          content: null,
          tool_calls: [{ id: "tc_layer", type: "function", function: { name: "set_layer", arguments: '{"layer":"thermal"}' } }],
        })
        .mockResolvedValueOnce({ role: "assistant", content: "Thermal layer active." });

      const onlineAudio = await app.inject({
        method: "POST",
        url: "/api/agent/voice",
        payload: { audio_base64: SAMPLE_WAV_B64, audio_format: "wav", lang: "en", context: ctx },
      });
      expect(onlineAudio.statusCode).toBe(200);
      const onlineJson = onlineAudio.json();
      expect(onlineJson.transcript).toBe("Show thermal layer");
      expect(onlineJson.speech).toBe("Thermal layer active.");
      expect(onlineJson.offline).toBe(false);
      expect(onlineJson.actions.some((a: { type: string }) => a.type === "set_layer")).toBe(true);

      // Offline audio path with raw_text uses deterministic offlineReply on raw_text.
      mockState.llmOnline = false;
      const offlineHint = await app.inject({
        method: "POST",
        url: "/api/agent/voice",
        payload: { audio_base64: SAMPLE_WAV_B64, audio_format: "wav", raw_text: "Show thermal layer", lang: "en", context: ctx },
      });
      expect(offlineHint.statusCode).toBe(200);
      const offlineHintJson = offlineHint.json();
      expect(offlineHintJson.transcript).toBe("Show thermal layer");
      expect(offlineHintJson.offline).toBe(true);
      expect(offlineHintJson.actions.some((a: { type: string }) => a.type === "set_layer")).toBe(true);

      // Offline audio path without raw_text returns localized retry message.
      const offlineNoHint = await app.inject({
        method: "POST",
        url: "/api/agent/voice",
        payload: { audio_base64: SAMPLE_WAV_B64, audio_format: "wav", lang: "es", context: ctx },
      });
      expect(offlineNoHint.statusCode).toBe(200);
      expect(offlineNoHint.json().transcript).toBe("");
      expect(offlineNoHint.json().speech).toContain("No se pudo transcribir");
      expect(offlineNoHint.json().offline).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("caps vertex gemini-4-carbon single-turn timeout when a failover provider is available (B37)", () => {
    expect(timeoutForAttempt("large", "vertex", "google/gemini-4-carbon", true)).toBe(config.vertexCarbonTimeoutMs);
    expect(timeoutForAttempt("large", "vertex", "google/gemini-4-carbon", false)).toBe(config.defaultTimeoutMs);
    expect(timeoutForAttempt("large", "meta", "muse-wonder-1.0", true)).toBe(config.defaultTimeoutMs);
    expect(timeoutForAttempt("fast", "vertex", "google/gemini-4-hydrogen", true)).toBe(config.fastTimeoutMs);
  });

  it("encodes 16 kHz mono WAV and updates HUD transcript cleanly via VoiceController.handleAudio", async () => {
    // 48 kHz 0.25 s sine wave -> 16 kHz mono WAV (4000 samples * 2 + 44 header bytes = 8044 bytes).
    const chunk = new Float32Array(12000);
    for (let i = 0; i < chunk.length; i++) chunk[i] = Math.sin(i * 0.05) * 0.5;
    const wavB64 = encodeWav16kMono([chunk], 48000);
    expect(wavB64).toBeTruthy();
    const wavBytes = Buffer.from(wavB64!, "base64");
    expect(wavBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wavBytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wavBytes.readUInt16LE(22)).toBe(1);
    expect(wavBytes.readUInt32LE(24)).toBe(16000);
    expect(wavBytes.readUInt16LE(34)).toBe(16);
    expect(wavBytes.length).toBe(8044);

    // Sub-120 ms clips are ignored.
    expect(encodeWav16kMono([new Float32Array(100)], 16000)).toBeNull();

    vi.stubGlobal("AudioContext", makeAudioContextStub());
    const sentPayloads: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/tts")) return new Response(new ArrayBuffer(8), { status: 200 });
      sentPayloads.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      return new Response(
        JSON.stringify({
          terrain: READY_TERRAIN,
          transcript: "Dispatch rover-1 to S2",
          speech: "Rover-1 dispatched to S2.",
          actions: [],
          trace: [],
          route: ["SUIT.VOICE-EXEC", "BASE"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = new MissionStore();
    store.terrain = READY_TERRAIN;
    const vc = new VoiceController(store);

    await vc.handleAudio(wavB64!, "rober one to site two");
    expect(sentPayloads[0].audio_base64).toBe(wavB64);
    expect(sentPayloads[0].audio_format).toBe("wav");
    expect(sentPayloads[0].raw_text).toBe("rober one to site two");
    expect(store.transcripts[0].who).toBe("you");
    expect(store.transcripts[0].text).toBe("Dispatch rover-1 to S2");
    expect(store.transcripts[0].final).toBe(true);
    expect(store.transcripts[1].who).toBe("base");
    expect(store.transcripts[1].text).toBe("Rover-1 dispatched to S2.");
    expect(vc.getHistory()).toEqual([
      { role: "user", content: "Dispatch rover-1 to S2" },
      { role: "assistant", content: "Rover-1 dispatched to S2." },
    ]);

    // Offline audio fallback without hint must not run offlineFallback("") or leave "..." in HUD.
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await vc.handleAudio(wavB64!, "");
    expect(store.transcripts.some((line) => line.text === "...")).toBe(false);
    expect(store.transcripts[store.transcripts.length - 1].who).toBe("base");
    expect(store.transcripts[store.transcripts.length - 1].text).toContain("No link to base");

    // Text-only handle() updates the HUD "you" line if server returns a normalized transcript.
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          terrain: READY_TERRAIN,
          transcript: "rover-1 come",
          speech: "Rover-1 en route.",
          actions: [],
          trace: [],
          route: ["SUIT.VOICE-EXEC", "BASE"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await vc.handle("rober uno come");
    const lastYou = [...store.transcripts].reverse().find((line) => line.who === "you");
    expect(lastYou?.text).toBe("rover-1 come");
  });
});
