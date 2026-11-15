import type { TerrainIdentity } from "@th/shared";
import type { Action, ConversationTurn, MissionContext, TraceEvent } from "./core/types";

const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/+$/, "");

export interface VoiceAgentRequest {
  text: string;
  lang: string;
  context: MissionContext;
  history?: ConversationTurn[];
}

export interface VoiceAgentResponse {
  terrain?: TerrainIdentity;
  speech: string;
  actions?: Action[];
  trace?: TraceEvent[];
  route?: string[];
  offline?: boolean;
  latency_ms?: number;
}

/** Resolves an HTTP backend endpoint against VITE_API_URL for cross-origin Vercel deployments. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Calls /api/agent/voice with optional bounded conversational history. */
export function postAgentVoice(payload: VoiceAgentRequest, signal?: AbortSignal): Promise<Response> {
  return fetch(apiUrl("/api/agent/voice"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

/** Resolves a WebSocket backend endpoint against VITE_API_URL for cross-origin Vercel deployments. */
export function wsUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE.replace(/^http/, "ws")}${path}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}
