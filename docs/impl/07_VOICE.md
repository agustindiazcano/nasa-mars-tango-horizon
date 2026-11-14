# 07. Hands-free voice

**Goal:** the astronaut speaks, the system acts and answers in a natural, high-quality voice.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 5.4; guide 06 (`onPtt`); guide 08 (`/api/agent/voice` route); guide 14 (languages).
**Plan tasks:** 13, 40.
**Location:** `web/src/voice/`, `server/src/tts.ts`.

## Flow

```
microphone → Web Speech API → text
   → critical local command? ── yes → immediate action (no network)
                              └ no  → POST /api/agent/voice → actions + reply text
   → reply text → POST /api/tts (neural voice, MP3) → Web Audio → speakers
                  └ if TTS fails → browser speechSynthesis
```

## Voice output: options

| Option | Quality | Latency for one sentence | Languages | Cost and effort | Decision |
|--------|---------|--------------------------|-----------|-----------------|----------|
| **Google Cloud Text-to-Speech** (neural voices) through the server | High, natural | Typically well under 1 s | ES, EN, FR, DE, IT and many more | Same GCP project, no extra key on Cloud Run; pay per character, small at demo volume | **Primary** |
| Neural model in the browser (for example Kokoro or Piper through WebAssembly/WebGPU) | Good | Real time on a laptop with WebGPU; slow on weak machines | Depends on the model; uneven outside English | One-time download of 80 to 300 MB; no server | Backlog; only if offline voice becomes a requirement |
| Browser `speechSynthesis` | Varies by OS, robotic on some | Instant | Whatever the OS has installed | Free, zero work | **Fallback** |

Real-time neural speech is feasible: the reply is 25 words or fewer, so synthesis takes a fraction of a second and playback starts as soon as the audio arrives. The dominant delay in the voice loop is the language model, not the voice.

Because the neural audio plays through Web Audio, an optional "radio" effect (band-pass 300 to 3,200 Hz plus Quindar tones) is a toggle in settings. Default is **clean voice**.

## Code

`web/src/voice/listen.ts`:

```ts
type SR = any; // Web Speech API no tiene tipos estándar en TypeScript

export interface ListenHooks { onInterim(text: string): void; onFinal(text: string): void; onState(listening: boolean): void }

export class Listener {
  private rec: SR | null = null;
  private wake = false;         // modo palabra clave: escucha continua y dispara al oír "base"
  private pushing = false;
  lang: "es-AR" | "en-US" = "es-AR";

  constructor(private hooks: ListenHooks) {}

  static supported(): boolean { return "webkitSpeechRecognition" in window || "SpeechRecognition" in window; }

  /** Push-to-talk: empieza al apretar y entrega el texto final al soltar. */
  pushStart(): void { this.pushing = true; this.start(false); }
  pushEnd(): void { this.pushing = false; this.rec?.stop(); }

  /** Palabra clave: escucha continua; solo entrega frases que empiezan con "base". */
  setWakeMode(on: boolean): void { this.wake = on; if (on) this.start(true); else this.rec?.stop(); }

  private start(continuous: boolean): void {
    if (!Listener.supported()) return;
    this.rec?.abort();
    const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec: SR = new Ctor();
    rec.lang = this.lang; rec.continuous = continuous; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = "";
    rec.onstart = () => this.hooks.onState(true);
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          if (continuous) this.deliverWake(txt); else finalText += txt;
        } else interim += txt;
      }
      this.hooks.onInterim(finalText + interim);
    };
    rec.onend = () => {
      this.hooks.onState(false);
      if (!continuous && finalText.trim()) this.hooks.onFinal(finalText.trim());
      if (continuous && this.wake && !this.pushing) setTimeout(() => this.start(true), 250); // Chrome corta la escucha continua cada tanto
    };
    rec.onerror = (e: any) => { if (e.error === "not-allowed") this.wake = false; };
    this.rec = rec;
    rec.start();
  }

  private deliverWake(text: string): void {
    const m = text.trim().match(/^(?:base|bays|beis)[,.\s]+(.+)/i);
    if (m) this.hooks.onFinal(m[1]);
  }
}
```

`web/src/voice/localIntents.ts`:

```ts
/** Comandos que no pueden esperar a la red. Se resuelven en el navegador en menos de 5 ms. */
export interface LocalIntent { id: string; patterns: RegExp[] }

export const LOCAL_INTENTS: LocalIntent[] = [
  { id: "emergency",   patterns: [/\b(emergencia|mayday|auxilio|emergency)\b/i] },
  { id: "abort_eva",   patterns: [/\b(abort(ar|o)?|cancel(ar|o)? (la )?eva|abort eva)\b/i] },
  { id: "stop_all",    patterns: [/\b(alto|det[eé]n(gan|er)? todo|stop all|all stop)\b/i] },
  { id: "open_map",    patterns: [/\b(abr[ií]r?|mostr[aá]r?|open|show) (el )?(mapa|map)\b/i] },
  { id: "close_panel", patterns: [/\b(cerr[aá]r?|close) (el )?(panel|men[uú]|todo)\b/i] },
  { id: "repeat",      patterns: [/\b(repet[ií]|repeat|say again)\b/i] },
];

export const matchLocal = (text: string): string | null =>
  LOCAL_INTENTS.find((i) => i.patterns.some((p) => p.test(text)))?.id ?? null;
```

`server/src/tts.ts`:

```ts
import type { FastifyInstance } from "fastify";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { z } from "zod";
import { createHash } from "node:crypto";
import { config } from "./config.js";

// Uses Application Default Credentials: the Cloud Run service account in production,
// `gcloud auth application-default login` on a developer machine.
const tts = new TextToSpeechClient();
const LANGS = ["es-US", "en-US", "fr-FR", "de-DE", "it-IT"] as const;
const Body = z.object({ text: z.string().min(1).max(400), lang: z.enum(LANGS) });

// Small in-memory cache: demo phrases repeat, and cached audio returns instantly.
const cache = new Map<string, Buffer>();
const MAX_CACHE = 300;

export function registerTtsRoute(app: FastifyInstance) {
  app.post("/api/tts", { config: { rateLimit: { max: config.rateLimit * 2, timeWindow: "1 minute" } } }, async (req, reply) => {
    const b = Body.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "bad request" });
    const voiceName = process.env[`TTS_VOICE_${b.data.lang.slice(0, 2).toUpperCase()}`] || undefined;
    const key = createHash("sha1").update(`${b.data.lang}|${voiceName}|${b.data.text}`).digest("hex");
    let audio = cache.get(key);
    if (!audio) {
      const [res] = await tts.synthesizeSpeech({
        input: { text: b.data.text },
        voice: { languageCode: b.data.lang, name: voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.05 },
      });
      audio = Buffer.from(res.audioContent as Uint8Array);
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
      cache.set(key, audio);
    }
    return reply.header("content-type", "audio/mpeg").header("cache-control", "no-store").send(audio);
  });
}
```

`web/src/voice/speak.ts`:

```ts
import type { Lang } from "@th/shared";
import { TTS_LOCALE } from "@th/shared";

/** Speech output. Neural voice from the server through Web Audio; browser synthesis if that fails. */
export class Radio {
  private ctx = new AudioContext();
  private queue: Promise<void> = Promise.resolve();
  private current: AudioBufferSourceNode | null = null;
  lang: Lang = "en";
  radioEffect = false; // optional band-pass + Quindar tones; off by default for clean audio

  /** Must be called inside a user gesture: browsers block audio until then. */
  unlock(): Promise<void> { return this.ctx.resume(); }

  say(text: string, onStart?: () => void): Promise<void> {
    this.queue = this.queue.then(() => this.sayNow(text, onStart)).catch(() => {});
    return this.queue;
  }

  cancel(): void { this.current?.stop(); this.current = null; speechSynthesis.cancel(); }

  private async sayNow(text: string, onStart?: () => void): Promise<void> {
    let buffer: AudioBuffer | null = null;
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, lang: TTS_LOCALE[this.lang] }), signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(String(res.status));
      buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch { /* fall through to the browser voice */ }

    if (this.radioEffect) await this.tone(2525, 0.25);
    onStart?.();
    if (buffer) await this.play(buffer); else await this.browserVoice(text);
    if (this.radioEffect) await this.tone(2475, 0.25);
  }

  private play(buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      let node: AudioNode = src;
      if (this.radioEffect) {
        const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300;
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
        node = src.connect(hp).connect(lp);
      }
      node.connect(this.ctx.destination);
      src.onended = () => { if (this.current === src) this.current = null; resolve(); };
      this.current = src;
      src.start();
    });
  }

  private browserVoice(text: string): Promise<void> {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = TTS_LOCALE[this.lang];
      const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith(this.lang));
      if (v) u.voice = v;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  /** Sine tone with 8 ms ramps to avoid clicks. */
  tone(freq: number, dur: number): Promise<void> {
    const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.008);
    g.gain.setValueAtTime(0.1, t + dur - 0.008);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + dur);
    return new Promise((r) => setTimeout(r, dur * 1000));
  }
}
```

`web/src/voice/voice.ts` (wires everything together):

```ts
import { Listener } from "./listen";
import { matchLocal } from "./localIntents";
import { Radio } from "./speak";

export interface VoiceDeps {
  getContext(): object;                               // estado resumido que viaja con la orden
  runLocal(intentId: string): string;                 // ejecuta y devuelve la frase de confirmación
  applyActions(actions: unknown[]): void;             // acciones de HUD y de mundo que devuelve el servidor
  showTranscript(text: string, who: "you" | "base", final: boolean): void;
  setMic(listening: boolean): void;
}

export function createVoice(deps: VoiceDeps) {
  const radio = new Radio();
  let lastReply = "";

  const handle = async (text: string) => {
    deps.showTranscript(text, "you", true);
    const local = matchLocal(text);
    if (local === "repeat") return void radio.say(lastReply);
    if (local) { lastReply = deps.runLocal(local); deps.showTranscript(lastReply, "base", true); return void radio.say(lastReply); }
    try {
      const res = await fetch("/api/agent/voice", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, lang: listener.lang, context: deps.getContext() }), signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(String(res.status));
      const out = await res.json() as { speech: string; actions: unknown[] };
      deps.applyActions(out.actions ?? []);
      lastReply = out.speech;
    } catch {
      lastReply = listener.lang === "es-AR" ? "Sin enlace con la base. Repetí la orden." : "No link to base. Say again.";
    }
    deps.showTranscript(lastReply, "base", true);
    radio.say(lastReply);
  };

  const listener = new Listener({
    onInterim: (t) => deps.showTranscript(t, "you", false),
    onFinal: handle,
    onState: deps.setMic,
  });

  return {
    radio, listener, handle,                           // handle() permite simular una orden desde la botonera
    pushStart: () => { radio.cancel(); listener.pushStart(); },
    pushEnd: () => listener.pushEnd(),
    setLang: (l: "es-AR" | "en-US") => { listener.lang = l; radio.lang = l; },
  };
}
```

## Instructions for the coding agent

1. **Enable the API first:** `gcloud services enable texttospeech.googleapis.com`. Locally, the user runs `gcloud auth application-default login` once. Ask the user before enabling a billable API.
2. **Pick the voices by listening.** Write `server/src/scripts/list-voices.ts` that calls `tts.listVoices({ languageCode })` for the five locales and prints the names. Synthesize the same test sentence with two or three of the newest neural voices per language, let the user choose, and put the names in `TTS_VOICE_ES`, `TTS_VOICE_EN`, `TTS_VOICE_FR`, `TTS_VOICE_DE`, `TTS_VOICE_IT`. With the variables empty, Google picks a default voice for the locale. Do not hard-code voice names.
3. Update the blocks copied from the Spanish draft: `listen.ts` and `voice.ts` use the `Lang` type and the `ASR_LOCALE` map from guide 14 in place of the `"es-AR" | "en-US"` union, and the hard-coded "no link" sentence becomes an i18n key.
4. `localIntents.ts`: keep Spanish and English patterns (both are required). French, German and Italian patterns are a nice-to-have: add them only with guide 14 phase 2.
5. Measure the voice loop and log each stage: speech-to-text end → agent reply → audio start. Target: audio starts within 1 s of the reply text for a 25-word sentence. If TTS takes longer than 2.5 s, play the browser voice instead of waiting.
6. Pre-warm the cache at startup with the fixed phrases of the demo deck (guide 09) in Spanish and English so they play instantly.
7. Web Speech recognition works in Chrome and Edge, not Firefox. Detect with `Listener.supported()`; without support show a text field. The demo runs in Chrome.
8. Chrome sends audio to a Google service to transcribe: no network means no voice input. The one-click demo deck calls `handle()` with the text of each order, so the demo never depends on the microphone.
9. Call `radio.unlock()` on the first user click or tap.
10. Push-to-talk: space bar (when focus is not in a text field) and the phone button (`onPtt`). Starting to talk cancels the reply in progress.
11. Show the live partial transcript in the bottom HUD panel: it is what proves to the jury that the voice is real.
12. Spoken replies are 25 words or fewer. Longer text goes to the panel.
13. Server-side speech-to-text (`ASR_PROVIDER=meta`): only if Web Speech performs badly and the key allows it. Read the endpoint documentation before writing any code; do not assume the message format.

## Acceptance criteria

- "Emergency" / "Emergencia" triggers the action under 100 ms after the final transcript, with no network call.
- An open question in Spanish and one in English each return a spoken reply in the same language, in a neural voice.
- With `/api/tts` blocked, the reply is still spoken by the browser voice.
- Push-to-talk works from the keyboard and from the phone.
- With the server down, the "no link to base" message is spoken.
