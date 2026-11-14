import { ASR_LOCALE, getLang } from "../core/i18n";

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

export interface ListenHooks {
  onInterim(text: string): void;
  onFinal(text: string): void;
  onState(listening: boolean): void;
}

export class Listener {
  private rec: SpeechRec | null = null;
  private wake = false;
  private pushing = false;
  lang: string = ASR_LOCALE[getLang()];

  constructor(private hooks: ListenHooks) {}

  static supported(): boolean {
    return typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }

  get wakeEnabled(): boolean {
    return this.wake;
  }

  pushStart(): void {
    this.pushing = true;
    this.start(false);
  }

  pushEnd(): void {
    this.pushing = false;
    this.rec?.stop();
  }

  setWakeMode(on: boolean): void {
    this.wake = on;
    if (on) {
      this.start(true);
    } else {
      this.rec?.stop();
    }
  }

  private start(continuous: boolean): void {
    if (!Listener.supported()) return;
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
    if (!Ctor) return;

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
      this.hooks.onInterim((finalText + interim).trim());
    };
    rec.onend = () => {
      this.hooks.onState(false);
      if (!continuous && finalText.trim()) {
        this.hooks.onFinal(finalText.trim());
      }
      if (continuous && this.wake && !this.pushing) {
        setTimeout(() => this.start(true), 250);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        this.wake = false;
      }
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      this.hooks.onState(false);
    }
  }

  private deliverWake(text: string): void {
    const m = text.trim().match(/^(?:base|bays|beis|basis)[,.\s]+(.+)/i);
    if (m?.[1]) {
      this.hooks.onFinal(m[1].trim());
    }
  }
}
