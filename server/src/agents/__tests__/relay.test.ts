import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { registerRelay } from "../../relay.js";

class MockSocket extends EventEmitter {
  readyState = 1;
  sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.closed = true;
    this.emit("close");
  }
}

describe("WebSocket /ws/remote relay", () => {
  it("notifies a replacement screen when a remote is already in the room", () => {
    let wsHandler: ((socket: any, req: any) => void) | undefined;
    const fakeApp = {
      get: vi.fn((_path: string, _opts: unknown, handler: (socket: any, req: any) => void) => {
        wsHandler = handler;
      }),
    };

    registerRelay(fakeApp as any);
    expect(wsHandler).toBeDefined();

    const screen1 = new MockSocket();
    wsHandler!(screen1, { query: { room: "ABC123", role: "screen" } });
    expect(screen1.sent).toEqual([]);

    const remote = new MockSocket();
    wsHandler!(remote, { query: { room: "ABC123", role: "remote" } });
    expect(screen1.sent).toEqual([JSON.stringify({ t: "remote_joined" })]);

    const screen2 = new MockSocket();
    wsHandler!(screen2, { query: { room: "ABC123", role: "screen" } });
    expect(screen1.closed).toBe(true);
    expect(screen2.sent).toEqual([JSON.stringify({ t: "remote_joined" })]);
  });
});
