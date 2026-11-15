import type { TerrainIdentity } from "@th/shared";
import type { Action, ConversationTurn, MissionContext, TraceEvent } from "./core/types";

const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/+$/, "");

export type AudioFormat = "wav" | "mp3" | "webm";

export interface VoiceAgentRequest {
  text?: string;
  audio_base64?: string;
  audio_format?: AudioFormat;
  raw_text?: string;
  lang: string;
  context: MissionContext;
  history?: ConversationTurn[];
}

export interface VoiceAgentResponse {
  terrain?: TerrainIdentity;
  transcript?: string;
  speech: string;
  actions?: Action[];
  trace?: TraceEvent[];
  route?: string[];
  offline?: boolean;
  latency_ms?: number;
}

export interface SttRequest {
  audio_base64: string;
  format?: AudioFormat;
  lang: string;
  raw_text?: string;
  fleet_ids?: string[];
}

export interface SttResponse {
  transcript: string;
  source?: "llm_audio" | "normalized_hint" | "raw_hint" | "none";
  fallback?: boolean;
  offline?: boolean;
  latency_ms?: number;
  error?: string;
}

/** Resolves an HTTP backend endpoint against VITE_API_URL for cross-origin Vercel deployments. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Calls /api/stt to transcribe recorded PTT audio with an optional browser ASR hint. */
export function postStt(payload: SttRequest, signal?: AbortSignal): Promise<Response> {
  return fetch(apiUrl("/api/stt"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

/** Calls /api/agent/voice with text and/or audio payload plus optional bounded conversational history. */
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
