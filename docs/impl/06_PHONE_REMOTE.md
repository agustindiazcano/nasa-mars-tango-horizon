# 06. Phone as pointer

**Goal:** scan a QR code and use the phone as pointer, button and push-to-talk for the HUD.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 5.5; guide 04 (`HudPointer`); guide 05 (`relay.ts`).
**Plan tasks:** 12.

## Protocol (JSON over WebSocket, messages under 512 bytes)

| Direction | Message | Meaning |
|-----------|---------|---------|
| phone → screen | `{"t":"o","a":<yaw°>,"b":<pitch°>}` | Orientation, 30 Hz |
| phone → screen | `{"t":"d","dx":..,"dy":..}` | Trackpad mode: relative movement |
| phone → screen | `{"t":"click"}` | Select |
| phone → screen | `{"t":"ptt","on":true\|false}` | Push-to-talk |
| phone → screen | `{"t":"recenter"}` | Current heading becomes the center |
| screen → phone | `{"t":"haptic","ms":30}` | Vibrate on hover or select |
| server → screen | `{"t":"remote_joined"}` / `{"t":"remote_left"}` | Connection state |

## Code

`web/remote.html`:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Tango Horizon · Remote</title>
<style>
  html,body{margin:0;height:100%;background:#05080c;color:#35e0ff;font:600 16px system-ui;touch-action:none;user-select:none;-webkit-user-select:none}
  #start{position:fixed;inset:0;display:grid;place-items:center;font-size:22px;background:#05080c;z-index:2}
  #ui{display:grid;grid-template-rows:1fr 96px 64px;height:100%;gap:10px;padding:14px;box-sizing:border-box}
  button,#pad{border:2px solid currentColor;border-radius:18px;background:rgba(53,224,255,.08);color:inherit;font:inherit}
  #pad{display:grid;place-items:center;font-size:20px}
  #pad.down{background:rgba(53,224,255,.3)}
  #row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #ptt.on{background:#ff2a55;color:#fff;border-color:#ff2a55}
  small{opacity:.7;text-align:center}
</style>
</head>
<body>
<div id="start">Tocar para conectar</div>
<div id="ui">
  <div id="pad">SELECCIONAR</div>
  <button id="ptt">MANTENER PARA HABLAR</button>
  <div id="row"><button id="recenter">RECENTRAR</button><button id="mode">MODO: PUNTERO</button></div>
</div>
<script type="module" src="/src/remote/remote.ts"></script>
</body>
</html>
```

`web/src/remote/remote.ts`:

```ts
const room = new URLSearchParams(location.search).get("room") ?? "";
const $ = (id: string) => document.getElementById(id)!;
let ws: WebSocket | null = null;
let trackpad = false;
let last = 0;

const send = (m: object) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); };

function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/remote?room=${room}&role=remote`);
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.t === "haptic") navigator.vibrate?.(m.ms); };
  ws.onclose = () => setTimeout(connect, 1000);
}

function onOrientation(e: DeviceOrientationEvent) {
  if (trackpad || e.alpha == null || e.beta == null) return;
  const now = performance.now();
  if (now - last < 33) return; // 30 Hz
  last = now;
  send({ t: "o", a: +e.alpha.toFixed(2), b: +e.beta.toFixed(2) });
}

$("start").addEventListener("click", async () => {
  // iOS exige pedir el permiso de sensores dentro de un gesto del usuario.
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  let granted = true;
  if (typeof D.requestPermission === "function") granted = (await D.requestPermission().catch(() => "denied")) === "granted";
  if (granted) addEventListener("deviceorientation", onOrientation);
  else setTrackpad(true);
  connect();
  $("start").remove();
}, { once: true });

function setTrackpad(on: boolean) { trackpad = on; $("mode").textContent = on ? "MODO: TRACKPAD" : "MODO: PUNTERO"; }
$("mode").addEventListener("click", () => setTrackpad(!trackpad));
$("recenter").addEventListener("click", () => send({ t: "recenter" }));

const pad = $("pad");
let px = 0, py = 0, moved = 0;
pad.addEventListener("pointerdown", (e) => { pad.classList.add("down"); px = e.clientX; py = e.clientY; moved = 0; pad.setPointerCapture(e.pointerId); });
pad.addEventListener("pointermove", (e) => {
  if (!pad.classList.contains("down")) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  if (trackpad) send({ t: "d", dx: +(dx / innerWidth).toFixed(4), dy: +(dy / innerHeight).toFixed(4) });
});
pad.addEventListener("pointerup", () => { pad.classList.remove("down"); if (moved < 12) send({ t: "click" }); });

const ptt = $("ptt");
const setPtt = (on: boolean) => { ptt.classList.toggle("on", on); send({ t: "ptt", on }); };
ptt.addEventListener("pointerdown", (e) => { ptt.setPointerCapture(e.pointerId); setPtt(true); });
ptt.addEventListener("pointerup", () => setPtt(false));
ptt.addEventListener("pointercancel", () => setPtt(false));
```

`web/src/remote/screen.ts` (screen side):

```ts
import QRCode from "qrcode";
import type { HudPointer } from "../hud/pointer";

export interface RemoteHooks { onPtt(on: boolean): void; onStatus(connected: boolean): void }

const FOV_YAW = 40, FOV_PITCH = 28; // grados de giro del celular que cubren toda la pantalla
const wrap = (d: number) => ((d + 540) % 360) - 180;

export async function startRemote(pointer: HudPointer, qrCanvas: HTMLCanvasElement, hooks: RemoteHooks) {
  const room = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
  await QRCode.toCanvas(qrCanvas, `${location.origin}/remote?room=${room}`, { width: 220, margin: 1 });

  let a0: number | null = null, b0 = 0, sx = 0.5, sy = 0.5, lastA = 0, lastB = 0;
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/remote?room=${room}&role=screen`);

  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    switch (m.t) {
      case "remote_joined": hooks.onStatus(true); break;
      case "remote_left": hooks.onStatus(false); a0 = null; break;
      case "o": {
        lastA = m.a; lastB = m.b;
        if (a0 === null) { a0 = m.a; b0 = m.b; }
        const tx = 0.5 - wrap(m.a - a0) / FOV_YAW;   // girar a la derecha baja alpha
        const ty = 0.5 - (m.b - b0) / FOV_PITCH;     // levantar el celular sube el cursor
        sx += (tx - sx) * 0.35; sy += (ty - sy) * 0.35; // suavizado contra el temblor de la mano
        pointer.move(sx, sy);
        break;
      }
      case "d": sx = pointer.x + m.dx * 1.6; sy = pointer.y + m.dy * 1.6; pointer.move(sx, sy); break;
      case "recenter": a0 = lastA; b0 = lastB; break;
      case "click": pointer.click(); ws.send(JSON.stringify({ t: "haptic", ms: 30 })); break;
      case "ptt": hooks.onPtt(Boolean(m.on)); break;
    }
  };
  return { room, close: () => ws.close() };
}
```

## Instructions for the coding agent

1. `remote.html` is a separate Vite entry (already in the guide 01 `vite.config.ts`). It does not import Three.js: it must load in under a second on mobile data.
2. **HTTPS is mandatory** for sensors and microphone. Locally, test the phone against the Cloud Run deploy, or use `vite --host` behind an HTTPS tunnel. `http://192.168.x.x` does not work on iOS.
3. The sign of `alpha` and `beta` differs between Android and iOS and with how the phone is held. Test on the real phones of the team; if the cursor moves backwards, flip the sign of `tx` or `ty` in `screen.ts`. Keep a hidden switch (`?invx=1&invy=1`) to fix it on the spot.
4. When the phone connects: hide the QR, show "REMOTE CONNECTED" in the HUD and recenter automatically once.
5. Haptics: send a 10 ms `haptic` when the cursor enters a `data-pointable` item (at least 150 ms apart). iOS Safari has no `navigator.vibrate`; do not depend on it.
6. `onPtt(true)` starts voice capture and `onPtt(false)` closes and sends it (guide 07).
7. The QR appears in a HUD panel at start and can be reopened from the menu.
8. If the screen WebSocket drops, reconnect with the same room code so nobody has to rescan.
9. Phone UI labels go through i18n (guide 14); the phone takes its language from a `lang` query parameter that the screen adds to the QR URL. The labels in the HTML block above are Spanish placeholders: replace them with i18n keys.

## Acceptance criteria

- With one Android and one iPhone: scan, tap to connect, move the cursor across the whole HUD and select a menu item.
- Perceived latency under 100 ms on the same network.
- "Recenter" brings the cursor to the center.
- If sensor permission is denied, trackpad mode works.
