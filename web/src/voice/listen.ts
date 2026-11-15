import { ASR_LOCALE, getLang } from "@th/shared";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

interface SpeechResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [idx: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

export type ListenErrorCode = "unsupported" | "not-allowed" | "audio-capture" | "network" | "other";

export interface ListenHooks {
  onInterim(text: string): void;
  onFinal(text: string): void;
  onFinalAudio?(wavBase64: string, fallbackText: string): void;
  onState(listening: boolean): void;
  onError?(code: ListenErrorCode, detail?: string): void;
}

interface PttSession {
  seq: number;
  useSpeech: boolean;
  useAudio: boolean;
  speechDone: boolean;
  audioDone: boolean;
  finalText: string;
  interimText: string;
  wavBase64: string | null;
  finalized: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

const TARGET_SAMPLE_RATE = 16000;
const MIN_AUDIO_SECONDS = 0.12;
const MAX_AUDIO_SECONDS = 25;

/** Downsamples mono Float32 PCM samples to 16 kHz with box-averaging anti-aliasing. */
export function downsampleTo16k(samples: Float32Array, srcRate: number): Float32Array {
  if (srcRate <= 0 || samples.length === 0) return new Float32Array(0);
  if (srcRate === TARGET_SAMPLE_RATE) return samples;
  const ratio = srcRate / TARGET_SAMPLE_RATE;
  const outLen = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    if (end > start) {
      let sum = 0;
      for (let j = start; j < end; j++) sum += samples[j];
      out[i] = sum / (end - start);
    } else {
      out[i] = samples[Math.min(start, samples.length - 1)];
    }
  }
  return out;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Encodes mono Float32 PCM chunks into a 16 kHz, 16-bit PCM RIFF/WAVE base64 string. */
export function encodeWav16kMono(chunks: readonly Float32Array[], srcRate: number): string | null {
  if (srcRate <= 0 || chunks.length === 0) return null;
  let total = 0;
  for (const c of chunks) total += c.length;
  if (total < Math.round(srcRate * MIN_AUDIO_SECONDS)) return null;

  const maxSrcSamples = Math.round(srcRate * MAX_AUDIO_SECONDS);
  const mergedLen = Math.min(total, maxSrcSamples);
  const merged = new Float32Array(mergedLen);
  let skip = total - mergedLen;
  let offset = 0;
  for (const c of chunks) {
    if (skip >= c.length) {
      skip -= c.length;
      continue;
    }
    const slice = skip > 0 ? c.subarray(skip) : c;
    skip = 0;
    merged.set(slice, offset);
    offset += slice.length;
  }

  const pcmFloat = downsampleTo16k(merged, srcRate);
  if (pcmFloat.length === 0) return null;

  const dataBytes = pcmFloat.length * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);

  const writeAscii = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  let pos = 44;
  for (let i = 0; i < pcmFloat.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmFloat[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return uint8ToBase64(new Uint8Array(buf));
}

export class Listener {
  private rec: SpeechRec | null = null;
  private wake = false;
  private pushing = false;
  private captureSeq = 0;
  private activeSession: PttSession | null = null;
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private recordedChunks: Float32Array[] = [];
  private recordedSamples = 0;
  private recordedRate = TARGET_SAMPLE_RATE;
  lang: string = ASR_LOCALE[getLang()];

  constructor(private hooks: ListenHooks) {}

  static supported(): boolean {
    return typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }

  static audioCaptureSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      ("AudioContext" in window || "webkitAudioContext" in window)
    );
  }

  get wakeEnabled(): boolean {
    return this.wake;
  }

  pushStart(): void {
    if (this.pushing) return;
    this.cleanupAudioNodes();
    this.pushing = true;

    const speechOk = Listener.supported();
    const audioOk = Boolean(this.hooks.onFinalAudio && Listener.audioCaptureSupported());
    if (!speechOk && !audioOk) {
      this.pushing = false;
      this.hooks.onError?.("unsupported");
      return;
    }

    const session: PttSession = {
      seq: ++this.captureSeq,
      useSpeech: speechOk,
      useAudio: audioOk,
      speechDone: !speechOk,
      audioDone: !audioOk,
      finalText: "",
      interimText: "",
      wavBase64: null,
      finalized: false,
      timer: null,
    };
    this.activeSession = session;

    if (audioOk) {
      void this.beginAudioCapture(session);
    }
    if (speechOk) {
      this.start(false, session);
    }
  }

  pushEnd(): void {
    const session = this.activeSession;
    if (!this.pushing && !session) {
      this.rec?.stop();
      return;
    }
    this.pushing = false;

    if (session && !session.audioDone) {
      session.wavBase64 = this.stopAudioCapture();
      session.audioDone = true;
    }

    if (session && !session.speechDone) {
      try {
        this.rec?.stop();
      } catch {
        session.speechDone = true;
      }
      if (!session.speechDone && session.timer === null) {
        session.timer = setTimeout(() => {
          session.timer = null;
          if (!session.speechDone) {
            session.speechDone = true;
            try {
              this.rec?.abort();
            } catch {
              // ignore abort timeout cleanup
            }
            this.maybeFinalizePtt(session);
          }
        }, 500);
      }
    }

    this.maybeFinalizePtt(session);
  }

  setWakeMode(on: boolean): void {
    this.wake = on;
    if (on) {
      this.start(true);
    } else {
      this.rec?.stop();
    }
  }

  private async beginAudioCapture(session: PttSession): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!this.pushing || this.captureSeq !== session.seq) {
        for (const track of stream.getTracks()) track.stop();
        session.audioDone = true;
        this.maybeFinalizePtt(session);
        return;
      }

      const win = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioCtxCtor = win.AudioContext ?? win.webkitAudioContext;
      if (!AudioCtxCtor) {
        for (const track of stream.getTracks()) track.stop();
        session.useAudio = false;
        session.audioDone = true;
        this.maybeFinalizePtt(session);
        return;
      }

      let ctx: AudioContext;
      try {
        ctx = new AudioCtxCtor({ sampleRate: TARGET_SAMPLE_RATE });
      } catch {
        ctx = new AudioCtxCtor();
      }
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      if (!this.pushing || this.captureSeq !== session.seq) {
        for (const track of stream.getTracks()) track.stop();
        void ctx.close().catch(() => {});
        session.audioDone = true;
        this.maybeFinalizePtt(session);
        return;
      }

      this.mediaStream = stream;
      this.audioCtx = ctx;
      this.recordedRate = ctx.sampleRate || TARGET_SAMPLE_RATE;
      this.recordedChunks = [];
      this.recordedSamples = 0;

      const maxSamples = Math.round(this.recordedRate * (MAX_AUDIO_SECONDS + 1));
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      processor.onaudioprocess = (ev) => {
        if (!this.pushing || this.captureSeq !== session.seq) return;
        const input = ev.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        this.recordedChunks.push(copy);
        this.recordedSamples += copy.length;
        while (this.recordedSamples > maxSamples && this.recordedChunks.length > 1) {
          const dropped = this.recordedChunks.shift();
          if (dropped) this.recordedSamples -= dropped.length;
        }
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      this.sourceNode = source;
      this.processorNode = processor;
      this.silentGain = silentGain;

      if (!session.useSpeech) {
        this.hooks.onState(true);
      }
    } catch (err) {
      this.cleanupAudioNodes();
      session.useAudio = false;
      session.audioDone = true;
      session.wavBase64 = null;
      if (!session.useSpeech) {
        this.pushing = false;
        this.hooks.onState(false);
        const name = err instanceof Error ? err.name : "";
        const code: ListenErrorCode =
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "not-allowed"
            : name === "NotFoundError" || name === "NotReadableError" || name === "AbortError"
              ? "audio-capture"
              : "other";
        this.hooks.onError?.(code, name || undefined);
        return;
      }
      this.maybeFinalizePtt(session);
    }
  }

  private stopAudioCapture(): string | null {
    const chunks = this.recordedChunks;
    const rate = this.recordedRate;
    this.cleanupAudioNodes();
    try {
      return encodeWav16kMono(chunks, rate);
    } catch {
      return null;
    }
  }

  private cleanupAudioNodes(): void {
    try {
      this.processorNode?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    try {
      this.sourceNode?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    try {
      this.silentGain?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
    }
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {});
    }
    this.processorNode = null;
    this.sourceNode = null;
    this.silentGain = null;
    this.mediaStream = null;
    this.audioCtx = null;
    this.recordedChunks = [];
    this.recordedSamples = 0;
  }

  private maybeFinalizePtt(session: PttSession | null): void {
    if (!session || session.finalized || this.pushing || !session.speechDone || !session.audioDone) {
      return;
    }
    session.finalized = true;
    if (session.timer !== null) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    if (this.activeSession === session) {
      this.activeSession = null;
    }
    this.hooks.onState(false);

    const text = (session.finalText || session.interimText).trim();
    if (session.wavBase64 && this.hooks.onFinalAudio) {
      this.hooks.onFinalAudio(session.wavBase64, text);
      return;
    }
    if (text) {
      this.hooks.onFinal(text);
    }
  }

  private start(continuous: boolean, pttSession?: PttSession): void {
    if (!Listener.supported()) {
      if (!pttSession) this.hooks.onError?.("unsupported");
      return;
    }
    try {
      this.rec?.abort();
    } catch {
      // ignore abort on idle recognition
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) {
      if (pttSession) {
        pttSession.useSpeech = false;
        pttSession.speechDone = true;
        this.maybeFinalizePtt(pttSession);
      } else {
        this.hooks.onError?.("unsupported");
      }
      return;
    }

    const rec = new Ctor();
    rec.lang = this.lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = "";
    rec.onstart = () => this.hooks.onState(true);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          if (continuous) this.deliverWake(txt);
          else finalText += txt;
        } else {
          interim += txt;
        }
      }
      const combined = (finalText + interim).trim();
      if (pttSession) {
        pttSession.finalText = finalText.trim();
        pttSession.interimText = combined;
      }
      this.hooks.onInterim(combined);
    };
    rec.onend = () => {
      if (pttSession) {
        pttSession.finalText = finalText.trim();
        pttSession.speechDone = true;
        if (this.pushing && pttSession.useAudio && !pttSession.audioDone) {
          // SpeechRecognition timed out while user is still holding PTT; keep recording WAV.
          return;
        }
        this.maybeFinalizePtt(pttSession);
        return;
      }
      this.hooks.onState(false);
      if (!continuous && finalText.trim()) {
        this.hooks.onFinal(finalText.trim());
      }
      if (continuous && this.wake && !this.pushing) {
        setTimeout(() => this.start(true), 250);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.wake = false;
        if (pttSession) {
          this.pushing = false;
          this.stopAudioCapture();
          pttSession.useAudio = false;
          pttSession.audioDone = true;
          pttSession.speechDone = true;
          pttSession.finalized = true;
          if (this.activeSession === pttSession) this.activeSession = null;
        }
        this.hooks.onState(false);
        this.hooks.onError?.("not-allowed", e.error);
        return;
      }
      if (pttSession && pttSession.useAudio) {
        // Keep audio capture active even if browser Web Speech service fails mid-PTT.
        pttSession.speechDone = true;
        this.maybeFinalizePtt(pttSession);
        return;
      }
      if (e.error === "audio-capture" || e.error === "network") {
        this.hooks.onError?.(e.error, e.error);
        return;
      }
      this.hooks.onError?.("other", e.error);
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      if (pttSession) {
        pttSession.useSpeech = false;
        pttSession.speechDone = true;
        this.maybeFinalizePtt(pttSession);
        if (!pttSession.useAudio) {
          this.hooks.onState(false);
          this.hooks.onError?.("other");
        }
      } else {
        this.hooks.onState(false);
        this.hooks.onError?.("other");
      }
    }
  }

  private deliverWake(text: string): void {
    const m = text.trim().match(/^(?:base|bays|beis|basis)[,.\s]+(.+)/i);
    if (m?.[1]) {
      this.hooks.onFinal(m[1].trim());
    }
  }
}
