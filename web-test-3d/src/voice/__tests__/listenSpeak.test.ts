import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang } from "@th/shared";
import { Listener, downsampleTo16k, encodeWav16kMono } from "../listen.js";
import { RadioSpeaker } from "../speak.js";

const origWindow = globalThis.window;
const origNavigator = globalThis.navigator;
const origFetch = globalThis.fetch;
const origSpeechSynthesis = (globalThis as { speechSynthesis?: unknown }).speechSynthesis;
const origUtterance = (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;

describe("listen.ts audio encoding and mic-denial UX (B37)", () => {
  afterEach(() => {
    setLang("en");
    Object.defineProperty(globalThis, "window", { value: origWindow, configurable: true, writable: true });
    Object.defineProperty(globalThis, "navigator", { value: origNavigator, configurable: true, writable: true });
    vi.restoreAllMocks();
  });

  it("downsamples to 16 kHz and encodes valid RIFF/WAVE mono PCM base64", () => {
    expect(encodeWav16kMono([], 16000)).toBeNull();
    expect(encodeWav16kMono([new Float32Array(500)], 16000)).toBeNull();

    const samples = new Float32Array(12000);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
    const down = downsampleTo16k(samples, 48000);
    expect(down.length).toBe(4000);

    const b64 = encodeWav16kMono([samples], 48000);
    expect(b64).toBeTruthy();
    const raw = Buffer.from(b64!, "base64");
    expect(raw.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(raw.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(raw.readUInt32LE(24)).toBe(16000);
  });

  it("emits unsupported when neither Web Speech nor MediaDevices audio capture exists", () => {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
    Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true, writable: true });

    const onError = vi.fn();
    const listener = new Listener({
      onInterim: vi.fn(),
      onFinal: vi.fn(),
      onState: vi.fn(),
      onError,
    });
    listener.pushStart();
    expect(onError).toHaveBeenCalledWith("unsupported");
  });

  it("maps NotAllowedError and NotFoundError from getUserMedia to typed ListenErrorCode", async () => {
    const mkReject = (name: string) => {
      const err = new Error(name);
      err.name = name;
      return vi.fn().mockRejectedValue(err);
    };

    class DummyAudioCtx {}
    Object.defineProperty(globalThis, "window", {
      value: { AudioContext: DummyAudioCtx },
      configurable: true,
      writable: true,
    });

    const denied = mkReject("NotAllowedError");
    Object.defineProperty(globalThis, "navigator", {
      value: { mediaDevices: { getUserMedia: denied } },
      configurable: true,
      writable: true,
    });
    const onError = vi.fn();
    const onState = vi.fn();
    const l1 = new Listener({
      onInterim: vi.fn(),
      onFinal: vi.fn(),
      onFinalAudio: vi.fn(),
      onState,
      onError,
    });
    l1.pushStart();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("not-allowed", "NotAllowedError"));
    expect(onState).toHaveBeenCalledWith(false);

    const missing = mkReject("NotFoundError");
    Object.defineProperty(globalThis, "navigator", {
      value: { mediaDevices: { getUserMedia: missing } },
      configurable: true,
      writable: true,
    });
    const onError2 = vi.fn();
    const l2 = new Listener({
      onInterim: vi.fn(),
      onFinal: vi.fn(),
      onFinalAudio: vi.fn(),
      onState: vi.fn(),
      onError: onError2,
    });
    l2.pushStart();
    await vi.waitFor(() => expect(onError2).toHaveBeenCalledWith("audio-capture", "NotFoundError"));
  });
});

describe("speak.ts TTS caching and 6 s timeout fallback (B37)", () => {
  afterEach(() => {
    setLang("en");
    Object.defineProperty(globalThis, "fetch", { value: origFetch, configurable: true, writable: true });
    Object.defineProperty(globalThis, "speechSynthesis", { value: origSpeechSynthesis, configurable: true, writable: true });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { value: origUtterance, configurable: true, writable: true });
    vi.restoreAllMocks();
  });

  it("fetches /api/tts once per phrase/lang and serves subsequent calls from in-memory bufferCache", async () => {
    const startSpy = vi.fn();
    const fakeBuffer = { duration: 0.25 } as AudioBuffer;
    const fakeCtx = {
      state: "running",
      currentTime: 0,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue(fakeBuffer),
      createBufferSource: vi.fn(() => {
        const src = {
          buffer: null as AudioBuffer | null,
          onended: null as (() => void) | null,
          connect: vi.fn(),
          start: vi.fn(() => {
            startSpy();
            setTimeout(() => src.onended?.(), 0);
          }),
          stop: vi.fn(),
        };
        return src;
      }),
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "audio/mpeg" }),
      arrayBuffer: async () => new ArrayBuffer(64),
    });
    Object.defineProperty(globalThis, "fetch", { value: fetchMock, configurable: true, writable: true });

    const speaker = new RadioSpeaker() as unknown as {
      ctx: unknown;
      radioEffect: boolean;
      say: (text: string, onStart?: () => void) => Promise<void>;
    };
    speaker.ctx = fakeCtx;
    speaker.radioEffect = false;

    const started = vi.fn();
    await speaker.say("Suit oxygen nominal.", started);
    await speaker.say("Suit oxygen nominal.", started);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledTimes(2);
    expect(startSpy).toHaveBeenCalledTimes(2);
  });

  it("passes AbortSignal.timeout(6000) to /api/tts and falls back to browser speechSynthesis on timeout", async () => {
    const spoken: string[] = [];

    class FakeUtterance {
      lang = "";
      voice: unknown = null;
      rate = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "speechSynthesis", {
      value: {
        getVoices: () => [{ lang: "en-US" }],
        speak: (u: FakeUtterance) => {
          spoken.push(u.text);
          u.onend?.();
        },
        cancel: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    const ctrl = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockImplementation((_ms: number) => {
      setTimeout(() => ctrl.abort(new DOMException("The operation timed out.", "TimeoutError")), 10);
      return ctrl.signal;
    });

    const fetchMock = vi.fn((_url: unknown, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(init.signal.reason);
          return;
        }
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    });
    Object.defineProperty(globalThis, "fetch", { value: fetchMock, configurable: true, writable: true });

    const speaker = new RadioSpeaker() as unknown as {
      ctx: unknown;
      radioEffect: boolean;
      say: (text: string, onStart?: () => void) => Promise<void>;
    };
    speaker.ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    };
    speaker.radioEffect = false;

    await speaker.say("Emergency pod launched.");

    expect(timeoutSpy).toHaveBeenCalledWith(6000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(spoken).toEqual(["Emergency pod launched."]);
  });
});
