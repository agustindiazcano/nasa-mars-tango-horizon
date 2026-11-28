/**
 * Minimal client for the obs-websocket v5 protocol (built into OBS Studio 28 and later). It starts and stops the OBS
 * recording so the presentation can be recorded with OBS instead of the browser's own recorder.
 * Protocol: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
 */

const OP_HELLO = 0;
const OP_IDENTIFY = 1;
const OP_IDENTIFIED = 2;
const OP_REQUEST = 6;
const OP_REQUEST_RESPONSE = 7;

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  let bin = "";
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Authentication string of the Identify message: base64(sha256(base64(sha256(password + salt)) + challenge)). */
export async function obsAuthString(password: string, salt: string, challenge: string): Promise<string> {
  const secret = await sha256Base64(password + salt);
  return sha256Base64(secret + challenge);
}

export interface ObsOptions {
  url: string;
  password?: string;
  /** Milliseconds to wait for the connection and the handshake. */
  timeoutMs?: number;
}

interface Pending {
  resolve: (data: Record<string, unknown>) => void;
  reject: (err: Error) => void;
}

export class ObsClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private nextId = 1;

  /** Connects and identifies; rejects when OBS is not running, the WebSocket server is off or the password is wrong. */
  async connect(opts: ObsOptions): Promise<void> {
    const timeoutMs = opts.timeoutMs ?? 2000;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = (err?: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) {
          try {
            this.ws?.close();
          } catch {
            // already closed
          }
          this.ws = null;
          reject(err);
        } else resolve();
      };
      const timer = setTimeout(() => done(new Error("OBS did not answer")), timeoutMs);
      let ws: WebSocket;
      try {
        ws = new WebSocket(opts.url);
      } catch (e) {
        done(e instanceof Error ? e : new Error("bad OBS url"));
        return;
      }
      this.ws = ws;
      ws.onerror = () => done(new Error("OBS WebSocket is not reachable"));
      ws.onclose = () => {
        done(new Error("OBS closed the connection"));
        for (const p of this.pending.values()) p.reject(new Error("OBS closed the connection"));
        this.pending.clear();
      };
      ws.onmessage = (ev) => {
        void (async () => {
          const msg = JSON.parse(String(ev.data)) as { op: number; d: Record<string, unknown> };
          if (msg.op === OP_HELLO) {
            const d: Record<string, unknown> = { rpcVersion: 1 };
            const auth = msg.d.authentication as { challenge: string; salt: string } | undefined;
            if (auth) {
              if (!opts.password) {
                done(new Error("OBS needs a password (add ?obspw=... to the address)"));
                return;
              }
              d.authentication = await obsAuthString(opts.password, auth.salt, auth.challenge);
            }
            ws.send(JSON.stringify({ op: OP_IDENTIFY, d }));
          } else if (msg.op === OP_IDENTIFIED) {
            done();
          } else if (msg.op === OP_REQUEST_RESPONSE) {
            const id = String(msg.d.requestId);
            const p = this.pending.get(id);
            if (!p) return;
            this.pending.delete(id);
            const status = msg.d.requestStatus as { result: boolean; comment?: string };
            if (status.result) p.resolve((msg.d.responseData as Record<string, unknown>) ?? {});
            else p.reject(new Error(status.comment ?? "OBS request failed"));
          }
        })();
      };
    });
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private request(requestType: string, requestData?: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("OBS is not connected"));
        return;
      }
      const requestId = `th-${this.nextId++}`;
      this.pending.set(requestId, { resolve, reject });
      this.ws.send(JSON.stringify({ op: OP_REQUEST, d: { requestType, requestId, ...(requestData ? { requestData } : {}) } }));
    });
  }

  async startRecord(): Promise<void> {
    await this.request("StartRecord");
  }

  /** Stops the recording and returns the path of the file OBS wrote (empty when OBS does not report it). */
  async stopRecord(): Promise<string> {
    const data = await this.request("StopRecord");
    return typeof data.outputPath === "string" ? data.outputPath : "";
  }

  close(): void {
    try {
      this.ws?.close();
    } catch {
      // already closed
    }
    this.ws = null;
  }
}
