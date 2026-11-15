import { config } from "../config.js";
import { chat, llmAvailable, type ChatMessage } from "../llm/provider.js";
import { normalizeLang, type Lang, type MissionContext } from "./types.js";

export type AudioFormat = "wav" | "mp3" | "webm";

export interface SttContextHint {
  fleet?: Array<{ id: string }>;
  targets?: Array<{ id: string }>;
  fleet_ids?: string[];
  lang?: string;
}

export interface SttResult {
  transcript: string;
  source: "llm_audio" | "normalized_hint" | "raw_hint" | "none";
  fallback: boolean;
}

const DEFAULT_FLEET_IDS = [
  "rover-1",
  "rover-2",
  "rescue-1",
  "drone-1",
  "drone-2",
  "glider-1",
  "manip-1",
  "scout-1",
];

const DEFAULT_SITE_IDS = ["S1", "S2", "S3", "S4", "T1", "T2", "T3", "T4"];

const BASE64_BODY_RE = /^[A-Za-z0-9+/]+={0,2}$/;

const ASR_NOISE_RE =
  /(?:\b(?:rover|rober|rubber|robber|dron|drone|rescue|rescate|glider|scout|manip|manipulador|manipulator)\s+(?:one|two|three|four|uno|dos|tres|cuatro|\d+)\b|\b(?:rober|rubber|robber|drones?\s+\d|gail\s+crater|gay\s+crater|jail\s+crater|girl\s+crater|firm\s*al|eslope|eslou|escruber|moxy|laider|bacons|valizas|o\s+dos|oh\s+two|astro\s+not|air\s+lock|high\s+ration)\b|\b(?:site|sitio|target|objetivo|s|t|ese|te)\s+(?:one|two|three|four|uno|dos|tres|cuatro|[1-4])\b|\b(\p{L}{2,})\s+\1\b)/iu;

const CLEAN_DOMAIN_RE =
  /(?<![\p{L}])(?:suit|traje|oxygen|ox[ií]geno|o2|margin|margen|pressure|presi[oó]n|co2|pao2|battery|bater[ií]a|coolant|refrigerante|heart|pulso|fan|ventilador|layer|capa|thermal|t[eé]rmic[ao]?|slope|pendiente|hydration|hidrat\p{L}*|radiation|radiaci[oó]n|optical|[oó]ptic[ao]?|svf|panel|map|mapa|route|ruta|weather|clima|storm|tormenta|forecast|pron[oó]st\p{L}*|vitals|signos|biomed\p{L}*|fdir|moxie|scrubber|depurador|manipulador|manipulator|hands|rover-\d+|drone-\d+|rescue-\d+|glider-\d+|scout-\d+|manip-1|[st][1-4]|position|posici[oó]n|dispatch|despach\p{L}*|send|manda|env[ií]a|launch|lanza|pod|beacon|baliza|leak|fuga|emergency|emergencia|abort\p{L}*|stop|alto|status|estado|hola|hello|repeat|repit\p{L}*|what|how|where|c[oó]mo|d[oó]nde|qu[eé]|cu[aá]nto|check|revis\p{L}*|verif\p{L}*|vein|veta|sample|muestra|drill|taladr\p{L}*|take\s*off|despeg\p{L}*|land|aterriz\p{L}*|follow|sigu\p{L}*|return|vuelv\p{L}*|regres\p{L}*)(?![\p{L}])/iu;

/** Validates and strips optional data-URL headers from base64 audio payloads. */
export function normalizeAudioBase64(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/^data:audio\/[a-z0-9.+-]+(?:;[a-z0-9=.-]+)*;base64,/i, "").replace(/\s+/g, "");
  if (stripped.length < 8 || stripped.length % 4 !== 0) return null;
  if (!BASE64_BODY_RE.test(stripped)) return null;
  return stripped;
}

/** Builds a concise Mars-mission domain glossary for STT and ASR normalization prompts. */
export function buildDomainGlossary(ctx?: SttContextHint | MissionContext | null): string {
  const fleetSet = new Set<string>(DEFAULT_FLEET_IDS);
  for (const u of ctx?.fleet ?? []) {
    if (u?.id) fleetSet.add(u.id);
  }
  if (ctx && "fleet_ids" in ctx && Array.isArray(ctx.fleet_ids)) {
    for (const id of ctx.fleet_ids) {
      if (id) fleetSet.add(id);
    }
  }
  const targetSet = new Set<string>(DEFAULT_SITE_IDS);
  for (const t of ctx?.targets ?? []) {
    if (t?.id) targetSet.add(t.id);
  }

  return [
    `Fleet IDs: ${Array.from(fleetSet).join(", ")}`,
    `Sites/Targets: ${Array.from(targetSet).join(", ")}`,
    "Location: Gale Crater, coordinates (x, z), airlock, habitat",
    "Layers: optical, thermal, slope, radiation, hydration, svf",
    "Systems: PLSS, O2 primary/reserve, CO2 scrubber, coolant, MOXIE, UWB beacons, LiDAR, O2 pod, EVA, NASA-STD-3001",
  ].join("; ");
}

function cleanTranscriptOutput(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = raw.trim();
  text = text.replace(/^(?:transcript|command|normalized)\s*:\s*/i, "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith("«") && text.endsWith("»")) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/\s+/g, " ").trim();
}

function isOfflineMode(): boolean {
  return config.offline || process.env.AGENTS_OFFLINE === "1";
}

/** Fast heuristic deciding whether text needs LLM ASR normalization or already cleanly matches canonical mission terms. */
export function needsTranscriptNormalization(rawText: string): boolean {
  const trimmed = rawText.trim();
  if (!trimmed) return false;
  if (ASR_NOISE_RE.test(trimmed)) return true;
  if (!CLEAN_DOMAIN_RE.test(trimmed)) return true;
  return false;
}

/** Normalizes noisy browser ASR text across enabled fast-tier providers (Vertex, Gemini, Meta Muse), falling back safely to rawText. */
export async function normalizeVoiceTranscript(
  rawText: string,
  lang: Lang | string,
  ctx?: SttContextHint | MissionContext | null,
  opts?: { force?: boolean },
): Promise<string> {
  const trimmed = rawText.trim();
  if (!trimmed) return "";
  if (isOfflineMode() || !llmAvailable()) return trimmed;
  if (!opts?.force && !needsTranscriptNormalization(trimmed)) return trimmed;

  const targetLang = normalizeLang(typeof lang === "string" ? lang : ctx?.lang);
  const glossary = buildDomainGlossary(ctx);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `You repair noisy voice-recognition transcripts for a Mars EVA mission simulator.\n` +
        `Glossary: ${glossary}.\n` +
        `Output ONLY the cleaned mission command or question in language "${targetLang}". ` +
        `Fix phonetic ASR slips and normalize spoken unit/site names (e.g. "rover 1"/"rover uno" -> "rover-1", "drone 1"/"dron uno" -> "drone-1", "site 2"/"sitio dos" -> "S2"). ` +
        `Preserve the speaker's intent and language; do not answer the question, add quotes, or add commentary.`,
    },
    {
      role: "user",
      content: trimmed,
    },
  ];

  try {
    const msg = await chat("fast", messages, {
      maxTokens: 256,
      reasoning_effort: "low",
      timeoutMs: config.sttTimeoutMs,
    });
    const cleaned = cleanTranscriptOutput(msg.content);
    if (!cleaned || cleaned.length > Math.max(400, trimmed.length * 3)) {
      return trimmed;
    }
    return cleaned;
  } catch {
    return trimmed;
  }
}

/** Transcribes audio with Google fast-tier multimodal LLMs (Vertex -> Gemini) and falls back to normalized rawHint if audio fails. */
export async function transcribeAudioDetailed(
  audioBase64: string,
  format: AudioFormat,
  lang: Lang | string,
  ctx?: SttContextHint | MissionContext | null,
  rawHint?: string,
): Promise<SttResult> {
  const hint = rawHint?.trim() ?? "";
  const cleanB64 = normalizeAudioBase64(audioBase64);
  if (!cleanB64) {
    if (hint) {
      const normalized = await normalizeVoiceTranscript(hint, lang, ctx);
      return {
        transcript: normalized,
        source: normalized !== hint ? "normalized_hint" : "raw_hint",
        fallback: true,
      };
    }
    return { transcript: "", source: "none", fallback: true };
  }

  if (isOfflineMode() || !llmAvailable()) {
    return hint
      ? { transcript: hint, source: "raw_hint", fallback: true }
      : { transcript: "", source: "none", fallback: true };
  }

  const targetLang = normalizeLang(typeof lang === "string" ? lang : ctx?.lang);
  const glossary = buildDomainGlossary(ctx);
  const userPrompt = hint
    ? `Transcribe the spoken Mars mission command or question in language "${targetLang}". ` +
      `Noisy browser ASR hint (verify against the audio, fix any errors): "${hint}".`
    : `Transcribe the spoken Mars mission command or question in language "${targetLang}".`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `You are a verbatim voice-to-text transcriber for a Mars EVA mission simulator.\n` +
        `Glossary: ${glossary}.\n` +
        `Output ONLY the clean verbatim normalized mission command or question in the speaker's language. ` +
        `Fix mixed EN/ES phonetic slips and normalize spoken unit/site names (e.g. "rover 1"/"rover uno" -> "rover-1", "drone 1"/"dron uno" -> "drone-1", "site 2"/"sitio dos" -> "S2"). ` +
        `No quotes, no markdown, no explanation, and do not answer the command.`,
    },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "input_audio",
          input_audio: {
            data: cleanB64,
            format: format as "wav" | "mp3",
          },
        },
      ],
    },
  ];

  try {
    const msg = await chat("fast", messages, {
      providers: ["vertex", "gemini"],
      maxTokens: 600,
      reasoning_effort: "low",
      timeoutMs: config.sttTimeoutMs,
    });
    const cleaned = cleanTranscriptOutput(msg.content);
    if (cleaned) {
      return { transcript: cleaned, source: "llm_audio", fallback: false };
    }
  } catch {
    // Google audio failed or timed out; fall back to text-only normalizer on browser ASR hint.
  }

  if (hint) {
    const normalized = await normalizeVoiceTranscript(hint, lang, ctx);
    return {
      transcript: normalized,
      source: normalized !== hint ? "normalized_hint" : "raw_hint",
      fallback: true,
    };
  }
  return { transcript: "", source: "none", fallback: true };
}

/** Transcribes WAV/audio via Google LLM with automatic fallback to normalized rawHint. */
export async function transcribeAudioWithLLM(
  audioBase64: string,
  format: AudioFormat,
  lang: Lang | string,
  ctx?: SttContextHint | MissionContext | null,
  rawHint?: string,
): Promise<string> {
  const res = await transcribeAudioDetailed(audioBase64, format, lang, ctx, rawHint);
  return res.transcript;
}
