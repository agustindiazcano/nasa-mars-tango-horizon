import { inject } from "@vercel/analytics";
import { wsUrl } from "../api";
import { setLang, t, type Lang, LANGS } from "@th/shared";

inject({ mode: import.meta.env.DEV ? "development" : "production" });

const params = new URLSearchParams(window.location.search);
const room = params.get("room") ?? "";
const qLang = params.get("lang")?.slice(0, 2).toLowerCase() as Lang | undefined;
if (qLang && (LANGS as readonly string[]).includes(qLang)) {
  setLang(qLang);
}

const $ = (id: string) => document.getElementById(id)!;

let ws: WebSocket | null = null;
let trackpad = false;
let invX = params.get("invx") === "1";
let invY = params.get("invy") === "1";
let lastSent = 0;

function applyI18n(): void {
  $("start-label").textContent = t("remote.tap_to_connect");
  $("pad").textContent = t("remote.select");
  $("ptt").textContent = t("remote.hold_to_talk");
  $("recenter").textContent = t("remote.recenter");
  $("mode").textContent = trackpad ? t("remote.mode_trackpad") : t("remote.mode_pointer");
  $("invx").textContent = `${t("remote.invx")}: ${invX ? "ON" : "OFF"}`;
  $("invy").textContent = `${t("remote.invy")}: ${invY ? "ON" : "OFF"}`;
}
applyI18n();

function send(msg: object): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function connect(): void {
  ws = new WebSocket(wsUrl(`/ws/remote?room=${room}&role=remote`));
  ws.onopen = () => {
    $("status").textContent = `ROOM ${room || "DEMO"} · CONNECTED`;
    $("status").style.color = "#35e0ff";
  };
  ws.onmessage = (e) => {
    try {
      const m = JSON.parse(String(e.data)) as { t?: string; ms?: number };
      if (m.t === "haptic") navigator.vibrate?.(m.ms ?? 25);
    } catch {
      // ignore malformed
    }
  };
  ws.onclose = () => {
    $("status").textContent = `ROOM ${room || "DEMO"} · RECONNECTING...`;
    $("status").style.color = "#ffb800";
    setTimeout(connect, 1200);
  };
}

/**
 * Converts Euler orientation (alpha, beta, gamma) to a stabilized yaw/pitch pointer
 * using quaternion composition when gamma is present.
 */
function onOrientation(e: DeviceOrientationEvent): void {
  if (trackpad || e.alpha == null || e.beta == null) return;
  const now = performance.now();
  if (now - lastSent < 33) return; // 30 Hz
  lastSent = now;

  // Compute forward vector via Z-X'-Y'' quaternion so tilting stays stable
  const deg2rad = Math.PI / 180;
  const alpha = e.alpha * deg2rad;
  const beta = e.beta * deg2rad;
  const gamma = (e.gamma ?? 0) * deg2rad;

  // Approximate pitch/yaw compensated for slight roll
  const yawDeg = (alpha / deg2rad) * (invX ? -1 : 1);
  const pitchDeg = ((beta * Math.cos(gamma) - (e.gamma ?? 0) * 0.1 * Math.sin(beta)) / deg2rad) * (invY ? -1 : 1);

  send({ t: "o", a: +yawDeg.toFixed(2), b: +pitchDeg.toFixed(2) });
}

$("start").addEventListener(
  "click",
  async () => {
    const DevOrient = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    let granted = true;
    if (typeof DevOrient.requestPermission === "function") {
      granted = (await DevOrient.requestPermission().catch(() => "denied")) === "granted";
    }
    if (granted && "DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientation", onOrientation);
    } else {
      trackpad = true;
      applyI18n();
    }
    connect();
    $("start").remove();
  },
  { once: true },
);

$("mode").addEventListener("click", () => {
  trackpad = !trackpad;
  applyI18n();
});

$("recenter").addEventListener("click", () => {
  send({ t: "recenter" });
  navigator.vibrate?.(15);
});

$("invx").addEventListener("click", () => {
  invX = !invX;
  applyI18n();
});

$("invy").addEventListener("click", () => {
  invY = !invY;
  applyI18n();
});

const pad = $("pad");
let px = 0;
let py = 0;
let moved = 0;

pad.addEventListener("pointerdown", (e) => {
  pad.classList.add("down");
  px = e.clientX;
  py = e.clientY;
  moved = 0;
  pad.setPointerCapture(e.pointerId);
});

pad.addEventListener("pointermove", (e) => {
  if (!pad.classList.contains("down")) return;
  const dx = e.clientX - px;
  const dy = e.clientY - py;
  px = e.clientX;
  py = e.clientY;
  moved += Math.abs(dx) + Math.abs(dy);
  if (trackpad) {
    const sx = (invX ? -dx : dx) / window.innerWidth;
    const sy = (invY ? -dy : dy) / window.innerHeight;
    send({ t: "d", dx: +sx.toFixed(4), dy: +sy.toFixed(4) });
  }
});

pad.addEventListener("pointerup", () => {
  pad.classList.remove("down");
  if (moved < 14) {
    send({ t: "click" });
    navigator.vibrate?.(25);
  }
});

const ptt = $("ptt");
const setPtt = (on: boolean) => {
  ptt.classList.toggle("on", on);
  send({ t: "ptt", on });
  if (on) navigator.vibrate?.(20);
};
ptt.addEventListener("pointerdown", (e) => {
  ptt.setPointerCapture(e.pointerId);
  setPtt(true);
});
ptt.addEventListener("pointerup", () => setPtt(false));
ptt.addEventListener("pointercancel", () => setPtt(false));
