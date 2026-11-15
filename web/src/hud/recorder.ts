/**
 * Screen recorder for the presentation. It records the current browser tab (so the HUD overlays, the agent chat
 * and the 3D view are all captured) and falls back to the 3D canvas alone. The result is a WebM download.
 */

const MIME_CANDIDATES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];

/** First container/codec the browser can record, or an empty string when none is supported. */
export function pickMimeType(isSupported: (mime: string) => boolean): string {
  return MIME_CANDIDATES.find((m) => isSupported(m)) ?? "";
}

export function recordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && (!!navigator.mediaDevices?.getDisplayMedia || typeof HTMLCanvasElement !== "undefined");
}

export class PresentationRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startedAt = 0;

  constructor(private getCanvas: () => HTMLCanvasElement | null) {}

  get recording(): boolean {
    return this.recorder !== null && this.recorder.state !== "inactive";
  }

  get elapsedS(): number {
    return this.recording ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  /** Starts recording. Returns "tab", "canvas" or null when nothing could be started. */
  async start(): Promise<"tab" | "canvas" | null> {
    if (this.recording || typeof MediaRecorder === "undefined") return this.recording ? "tab" : null;
    let kind: "tab" | "canvas" = "tab";
    let stream: MediaStream | null = null;
    try {
      const opts = {
        video: { frameRate: 30 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
      } as unknown as DisplayMediaStreamOptions;
      stream = await navigator.mediaDevices.getDisplayMedia(opts);
    } catch {
      stream = null;
    }
    if (!stream) {
      const canvas = this.getCanvas();
      if (!canvas || typeof canvas.captureStream !== "function") return null;
      stream = canvas.captureStream(30);
      kind = "canvas";
    }
    const mimeType = pickMimeType((m) => MediaRecorder.isTypeSupported(m));
    this.stream = stream;
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 8_000_000 });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    // The user can end the tab share from the browser bar.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => void this.stop());
    this.recorder.start(1000);
    this.startedAt = performance.now();
    return kind;
  }

  /** Stops, downloads the file and returns its name (null when nothing was recording). */
  async stop(): Promise<string | null> {
    const rec = this.recorder;
    if (!rec || rec.state === "inactive") return null;
    const done = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.stop();
    await done;
    this.stream?.getTracks().forEach((t) => t.stop());
    const type = rec.mimeType || "video/webm";
    const blob = new Blob(this.chunks, { type });
    const ext = type.includes("mp4") ? "mp4" : "webm";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = `tango-horizon-${stamp}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    return name;
  }
}
