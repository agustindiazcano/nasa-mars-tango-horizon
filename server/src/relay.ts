import type { FastifyInstance } from "fastify";
import type {} from "@fastify/websocket";
import type { RawData, WebSocket } from "ws";

interface Room {
  screen?: WebSocket;
  remotes: Set<WebSocket>;
  touched: number;
}

const rooms = new Map<string, Room>();
const ROOM_CODE = /^[A-Z0-9]{6}$/;
const MAX_PAYLOAD_BYTES = 512;
const ROOM_TTL_MS = 600_000;
const WS_OPEN = 1;

function rawToBuffer(raw: RawData): Buffer {
  if (typeof raw === "string") return Buffer.from(raw, "utf8");
  if (Buffer.isBuffer(raw)) return raw;
  if (Array.isArray(raw)) return Buffer.concat(raw);
  return Buffer.from(raw);
}

function sendIfOpen(socket: WebSocket | undefined, payload: string): void {
  if (socket && socket.readyState === WS_OPEN) {
    socket.send(payload);
  }
}

/**
 * In-memory WebSocket relay pairing mobile pointer clients with the desktop 3D screen.
 * Compatible with @fastify/websocket v11 `(socket, req)` handler signature.
 */
export function registerRelay(app: FastifyInstance): void {
  app.get("/ws/remote", { websocket: true }, (socket, req) => {
    const q = (req.query ?? {}) as { room?: string; role?: string };
    const code = (q.room ?? "").toUpperCase();
    const role = q.role === "screen" ? "screen" : "remote";

    if (!ROOM_CODE.test(code)) {
      socket.close(1008, "bad room");
      return;
    }

    const room = rooms.get(code) ?? { remotes: new Set<WebSocket>(), touched: Date.now() };
    room.touched = Date.now();
    rooms.set(code, room);

    if (role === "screen") {
      room.screen?.close(1000, "replaced");
      room.screen = socket;
      if (room.remotes.size > 0) {
        sendIfOpen(room.screen, JSON.stringify({ t: "remote_joined" }));
      }
    } else {
      if (room.remotes.size >= 2) {
        socket.close(1008, "room full");
        return;
      }
      room.remotes.add(socket);
      sendIfOpen(room.screen, JSON.stringify({ t: "remote_joined" }));
    }

    socket.on("message", (raw: RawData) => {
      const buf = rawToBuffer(raw);
      if (buf.byteLength > MAX_PAYLOAD_BYTES) return;
      room.touched = Date.now();
      const msg = buf.toString("utf8");
      if (role === "remote") {
        sendIfOpen(room.screen, msg);
      } else {
        for (const remote of room.remotes) {
          sendIfOpen(remote, msg);
        }
      }
    });

    socket.on("close", () => {
      room.touched = Date.now();
      if (role === "screen") {
        if (room.screen === socket) room.screen = undefined;
      } else {
        room.remotes.delete(socket);
        sendIfOpen(room.screen, JSON.stringify({ t: "remote_left" }));
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (!room.screen && room.remotes.size === 0 && now - room.touched > ROOM_TTL_MS) {
        rooms.delete(code);
      }
    }
  }, 60_000).unref();
}
