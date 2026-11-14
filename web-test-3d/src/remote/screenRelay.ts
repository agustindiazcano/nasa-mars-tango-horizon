import QRCode from "qrcode";
import { getLang, onLangChange } from "../core/i18n";

export interface ScreenRelayHooks {
  onPtt(on: boolean): void;
  onStatus(connected: boolean): void;
  onCanvasClick?(normX: number, normY: number): void;
}

const FOV_YAW = 42;
const FOV_PITCH = 28;
const wrapDeg = (d: number) => ((d + 540) % 360) - 180;

export class ScreenRelay {
  x = 0.5;
  y = 0.5;
  readonly room: string;
  private ws: WebSocket | null = null;
  private cursorEl: HTMLElement | null = null;
  private hovered: Element | null = null;
  private lastHapticAt = 0;
  private a0: number | null = null;
  private b0 = 0;
  private lastA = 0;
  private lastB = 0;
  private sx = 0.5;
  private sy = 0.5;
  private invX = false;
  private invY = false;
  private closed = false;

  constructor(
    private qrCanvas: HTMLCanvasElement,
    private urlEl: HTMLElement | null,
    private hooks: ScreenRelayHooks,
  ) {
    this.room = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32],
    ).join("");

    const params = new URLSearchParams(window.location.search);
    this.invX = params.get("invx") === "1";
    this.invY = params.get("invy") === "1";

    this.cursorEl = document.getElementById("hud-cursor");

    window.addEventListener("mousemove", (e) => {
      if (!document.pointerLockElement) {
        this.move(e.clientX / window.innerWidth, e.clientY / window.innerHeight, false);
      }
    });

    onLangChange(() => void this.renderQr());
    void this.renderQr();
    this.connect();
  }

  getPhoneUrl(): string {
    return `${window.location.origin}/remote.html?room=${this.room}&lang=${getLang()}`;
  }

  async renderQr(): Promise<void> {
    const url = this.getPhoneUrl();
    if (this.urlEl) this.urlEl.textContent = url;
    await QRCode.toCanvas(this.qrCanvas, url, {
      width: 210,
      margin: 1,
      color: { dark: "#35e0ff", light: "#061018" },
    });
  }

  setInvert(invX: boolean, invY: boolean): void {
    this.invX = invX;
    this.invY = invY;
  }

  recenter(): void {
    this.a0 = this.lastA;
    this.b0 = this.lastB;
    this.sx = 0.5;
    this.sy = 0.5;
    this.move(0.5, 0.5, false);
  }

  move(nx: number, ny: number, fromRemote = true): void {
    this.x = Math.min(Math.max(nx, 0), 1);
    this.y = Math.min(Math.max(ny, 0), 1);
    const px = this.x * window.innerWidth;
    const py = this.y * window.innerHeight;
    if (this.cursorEl) {
      this.cursorEl.style.transform = `translate(${px}px, ${py}px)`;
    }
    const target = document.elementFromPoint(px, py)?.closest("[data-pointable]") ?? null;
    if (target !== this.hovered) {
      this.hovered?.classList.remove("hover");
      target?.classList.add("hover");
      this.hovered = target;
      if (target && fromRemote) {
        const now = performance.now();
        if (now - this.lastHapticAt > 150) {
          this.lastHapticAt = now;
          this.send({ t: "haptic", ms: 12 });
        }
      }
    }
  }

  click(): void {
    if (this.hovered instanceof HTMLElement) {
      this.hovered.click();
    } else {
      this.hooks.onCanvasClick?.(this.x, this.y);
    }
    this.send({ t: "haptic", ms: 30 });
  }

  close(): void {
    this.closed = true;
    this.ws?.close();
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private connect(): void {
    if (this.closed) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/remote?room=${this.room}&role=screen`);
    this.ws = ws;

    ws.onmessage = (ev) => {
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      switch (m.t) {
        case "remote_joined":
          this.a0 = null;
          this.hooks.onStatus(true);
          break;
        case "remote_left":
          this.a0 = null;
          this.hooks.onStatus(false);
          break;
        case "o": {
          const a = Number(m.a ?? 0);
          const b = Number(m.b ?? 0);
          this.lastA = a;
          this.lastB = b;
          if (this.a0 === null) {
            this.a0 = a;
            this.b0 = b;
          }
          const signX = this.invX ? 1 : -1;
          const signY = this.invY ? 1 : -1;
          const tx = 0.5 + (signX * wrapDeg(a - this.a0)) / FOV_YAW;
          const ty = 0.5 + (signY * (b - this.b0)) / FOV_PITCH;
          this.sx += (tx - this.sx) * 0.35;
          this.sy += (ty - this.sy) * 0.35;
          this.move(this.sx, this.sy, true);
          break;
        }
        case "d": {
          const dx = Number(m.dx ?? 0) * (this.invX ? -1.6 : 1.6);
          const dy = Number(m.dy ?? 0) * (this.invY ? -1.6 : 1.6);
          this.sx = Math.min(Math.max(this.x + dx, 0), 1);
          this.sy = Math.min(Math.max(this.y + dy, 0), 1);
          this.move(this.sx, this.sy, true);
          break;
        }
        case "recenter":
          this.recenter();
          break;
        case "click":
          this.click();
          break;
        case "ptt":
          this.hooks.onPtt(Boolean(m.on));
          break;
      }
    };

    ws.onclose = () => {
      if (!this.closed) {
        setTimeout(() => this.connect(), 1500);
      }
    };
    ws.onerror = () => {
      ws.close();
    };
  }
}
