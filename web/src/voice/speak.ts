import { apiUrl } from "../api";
import { getLang, TTS_LOCALE, type Lang } from "@th/shared";

export class RadioSpeaker {
  private ctx: AudioContext | null = null;
  private queue: Promise<void> = Promise.resolve();
  private current: AudioBufferSourceNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  lang: Lang = getLang();
  radioEffect = true; // Quindar 2525 Hz / 2475 Hz + 300-3200 Hz bandpass

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }
  }

  say(text: string, onStart?: () => void): Promise<void> {
    if (!text.trim()) return Promise.resolve();
    this.queue = this.queue.then(() => this.sayNow(text, onStart)).catch(() => {});
    return this.queue;
  }

  cancel(): void {
    try {
      this.current?.stop();
    } catch {
      // ignore already stopped
    }
    this.current = null;
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
  }

  async beep(freq = 880, dur = 0.08): Promise<void> {
    try {
      await this.unlock();
      await this.tone(freq, dur);
    } catch {
      // ignore audio context block before user gesture
    }
  }

  private async sayNow(text: string, onStart?: () => void): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const clipped = text.slice(0, 400);
    const cacheKey = `${TTS_LOCALE[this.lang]}|${clipped}`;
    let buffer: AudioBuffer | null = this.bufferCache.get(cacheKey) ?? null;
    if (!buffer) {
      try {
        const res = await fetch(apiUrl("/api/tts"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: clipped, lang: TTS_LOCALE[this.lang] }),
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          buffer = await ctx.decodeAudioData(await res.arrayBuffer());
          if (this.bufferCache.size >= 100) {
            const oldest = this.bufferCache.keys().next().value;
            if (oldest !== undefined) this.bufferCache.delete(oldest);
          }
          this.bufferCache.set(cacheKey, buffer);
        }
      } catch {
        // fallback to browser speechSynthesis
      }
    }

    if (this.radioEffect && ctx.state === "running") {
      await this.tone(2525, 0.16);
    }
    onStart?.();
    if (buffer && ctx.state === "running") {
      await this.playBuffer(ctx, buffer);
    } else {
      await this.browserVoice(text);
    }
    if (this.radioEffect && ctx.state === "running") {
      await this.tone(2475, 0.16);
    }
  }

  private playBuffer(ctx: AudioContext, buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      let node: AudioNode = src;
      if (this.radioEffect) {
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 300;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3200;
        node = src.connect(hp).connect(lp);
      }
      node.connect(ctx.destination);
      src.onended = () => {
        if (this.current === src) this.current = null;
        resolve();
      };
      this.current = src;
      src.start();
    });
  }

  private browserVoice(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === "undefined") {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = TTS_LOCALE[this.lang];
      const voices = speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(this.lang));
      if (match) u.voice = match;
      u.rate = 1.04;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  private tone(freq: number, dur: number): Promise<void> {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.008);
    g.gain.setValueAtTime(0.08, t + Math.max(0.01, dur - 0.008));
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    return new Promise((r) => setTimeout(r, dur * 1000));
  }
}
