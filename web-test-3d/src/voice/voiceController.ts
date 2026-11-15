import { AIRLOCK_COORD, BASE_ORIGIN, MISSION_SITES_BY_ID, terrainMatches } from "@th/shared";
import { postAgentVoice, type VoiceAgentRequest, type VoiceAgentResponse } from "../api";
import { ASR_LOCALE, getLang, onLangChange, t, type Lang } from "../core/i18n";
import { AIRCRAFT_GROUNDING_TAU, C, surfaceDensity } from "../core/physics";
import type { Action, ConversationTurn, TraceEvent } from "../core/types";
import type { MissionStore } from "../state";
import { Listener, type ListenErrorCode } from "./listen";
import { matchLocalIntent, type LocalIntentId } from "./localIntents";
import { RadioSpeaker } from "./speak";
import { isVisionQuestion } from "./visionIntent";

const OFFLINE_SITES: Record<number, { x: number; z: number; label: string }> = {
  1: { x: MISSION_SITES_BY_ID.S1.x, z: MISSION_SITES_BY_ID.S1.z, label: "S1" },
  2: { x: MISSION_SITES_BY_ID.S2.x, z: MISSION_SITES_BY_ID.S2.z, label: "S2" },
  3: { x: MISSION_SITES_BY_ID.S3.x, z: MISSION_SITES_BY_ID.S3.z, label: "S3" },
  4: { x: MISSION_SITES_BY_ID.S4.x, z: MISSION_SITES_BY_ID.S4.z, label: "S4" },
};
void BASE_ORIGIN;

const ALL_OFFLINE_KINDS = ["rover_crew", "rover_science", "rover_cargo", "scout", "rescue", "drone", "glider", "manipulator"];
const OFFLINE_MAX_SLOPE: Record<string, number> = {
  rover_crew: 20,
  rover_science: 25,
  rover_cargo: 18,
  scout: 28,
  rescue: 25,
  manipulator: 22,
};
const OFFLINE_ACTION_KINDS: Record<string, string[]> = {
  takeoff: ["drone", "glider"],
  land: ["drone", "glider"],
  hover_overwatch: ["drone", "glider"],
  follow_astronaut: ALL_OFFLINE_KINDS,
  return_to_base: ALL_OFFLINE_KINDS,
  hold_position: ALL_OFFLINE_KINDS,
  survey_area: ["rover_science", "scout", "drone", "glider"],
  photograph_area: ["drone", "glider", "scout", "rover_science"],
  relay_comms: ["rover_crew", "rover_science", "drone", "glider"],
  deliver_supplies: ["rover_cargo", "rescue", "rover_crew"],
};

function matchOfflineExplicitUnitId(low: string): string | null {
  const direct = low.match(/\b(rover-[123]|scout-[12]|rescue-1|drone-[12]|glider-1|manip-1)\b/i);
  if (direct) return direct[1].toLowerCase();
  if (/\b(hands|manip(?:ulador|ulator)?(?:\s*(?:uno|one|1))?|brazo|arm)\b/i.test(low)) return "manip-1";
  if (/\b(rescate|rescue)(?:\s*(?:uno|one|1))?\b/i.test(low)) return "rescue-1";
  if (/\b(glider|planeador|planeur|segler|aliante)\b/i.test(low)) return "glider-1";
  if (/\bscout\s*(?:dos|two|deux|zwei|due|2)\b/i.test(low)) return "scout-2";
  if (/\bscout(?:\s*(?:uno|one|un|eins|1))?\b/i.test(low)) return "scout-1";
  if (/\bdron(?:e|a)?\s*(?:dos|two|deux|zwei|due|2)\b/i.test(low)) return "drone-2";
  if (/\bdron(?:e|a)?(?:\s*(?:uno|one|un|eins|1))?\b/i.test(low)) return "drone-1";
  if (/\b(rover\s*(?:dos|two|deux|zwei|due|2)|rvr[- ]?2)\b/i.test(low)) return "rover-2";
  if (/\b(rover\s*(?:tres|three|trois|drei|tre|3)|rvr[- ]?3)\b/i.test(low)) return "rover-3";
  if (/\b(rover(?:\s*(?:uno|one|un|eins|1))?|rvr[- ]?1)\b/i.test(low)) return "rover-1";
  return null;
}

function inferOfflineUnitKind(unitId: string, fleet: { id: string; kind: string }[]): string {
  const found = fleet.find((u) => u.id === unitId);
  if (found) return found.kind;
  if (unitId.startsWith("drone-")) return "drone";
  if (unitId.startsWith("glider-")) return "glider";
  if (unitId.startsWith("rescue-")) return "rescue";
  if (unitId.startsWith("manip-")) return "manipulator";
  if (unitId === "rover-2") return "rover_science";
  if (unitId === "rover-3") return "rover_cargo";
  if (unitId.startsWith("scout-")) return "scout";
  return "rover_crew";
}

function parseOfflineHeading(low: string): "north" | "east" | "south" | "west" | undefined {
  if (/\b(norte|north|nord|norden)\b/i.test(low)) return "north";
  if (/\b(este|east|est|osten)\b/i.test(low)) return "east";
  if (/\b(sur|south|sud|süden|sueden)\b/i.test(low)) return "south";
  if (/\b(oeste|west|ouest|westen|ovest)\b/i.test(low)) return "west";
  return undefined;
}

function parseOfflineTarget(
  low: string,
  ax: number,
  az: number,
): { x: number; z: number; label: string; isAstronaut: boolean } {
  const siteMatch = low.match(
    /(?<![\p{L}\d])(?:sitio|site|estaci[oó]n|station|s)\s*[-#]?\s*(1|2|3|4|uno|un|one|dos|two|tres|three|cuatro|four)(?![\p{L}\d])/iu,
  );
  if (siteMatch) {
    const map: Record<string, number> = {
      "1": 1, uno: 1, un: 1, one: 1,
      "2": 2, dos: 2, two: 2,
      "3": 3, tres: 3, three: 3,
      "4": 4, cuatro: 4, four: 4,
    };
    const site = OFFLINE_SITES[map[siteMatch[1].toLowerCase()] ?? 2];
    return { x: site.x, z: site.z, label: site.label, isAstronaut: false };
  }
  const sanitized = low.replace(
    /\b(?:rover|drone|dron|rescue|rescate|manip(?:ulador|ulator)?|scout|glider)\s*[- ]?\s*\d+\b/gi,
    " ",
  );
  const coords = sanitized.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
  if (coords) {
    const x = Number(coords[1]);
    const z = Number(coords[2]);
    return { x, z, label: `(${x}, ${z})`, isAstronaut: false };
  }
  if (
    /(?<![\p{L}\d])(mi posici[oó]n|mi ubicaci[oó]n|d[oó]nde estoy|ad[oó]nde estoy|hacia m[ií]|conmigo|a mi lado|my position|my location|where i am|to me|here|aqu[ií]|ac[aá]|ven[ií]?|ac[eé]rcate|acercate|come|approach|ma position|vers moi|ici|meine position|zu mir|hier|la mia posizione|da me|qui)(?![\p{L}\d])/iu.test(
      low,
    )
  ) {
    return {
      x: Math.round(ax),
      z: Math.round(az),
      label: `(${Math.round(ax)}, ${Math.round(az)})`,
      isAstronaut: true,
    };
  }
  if (/\b(base|hab|habitat|refugio|shelter)\b/i.test(low)) {
    return { x: 0, z: 0, label: "Base", isAstronaut: false };
  }
  return {
    x: Math.round(ax),
    z: Math.round(az),
    label: `(${Math.round(ax)}, ${Math.round(az)})`,
    isAstronaut: true,
  };
}

function pickOfflineSpeech(lang: Lang, esText: string, enText: string): string {
  return lang === "es" ? esText : enText;
}

export interface VoiceHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceControllerHooks {
  onVisionRequest?(unitId: string, question: string): Promise<{ speech: string; injection: boolean }>;
  onLoadHistory?(turns: VoiceHistoryTurn[]): void;
  onClearHistory?(): void;
  slopeAt?(x: number, z: number): number;
}

const MAX_BRIDGE_HISTORY_TURNS = 6;
const MAX_BRIDGE_TURN_CHARS = 400;
const VOICE_REQUEST_TIMEOUT_MS = 45000;

export class VoiceController {
  private static readonly MAX_HISTORY = 6;
  readonly radio = new RadioSpeaker();
  readonly listener: Listener;
  private lastReply = "";
  private history: ConversationTurn[] = [];

  constructor(
    private store: MissionStore,
    private hooks: VoiceControllerHooks = {},
  ) {
    this.listener = new Listener({
      onInterim: (txt) => this.store.pushTranscript("you", txt, false),
      onFinal: (txt) => void this.handle(txt),
      onFinalAudio: (wavBase64, fallbackText) => void this.handleAudio(wavBase64, fallbackText),
      onState: (listening) => {
        this.store.micListening = listening;
        this.store.notify();
      },
      onError: (code: ListenErrorCode) => {
        const key =
          code === "unsupported"
            ? "voice.err_unsupported"
            : code === "not-allowed"
              ? "voice.err_mic_denied"
              : "voice.err_mic_failed";
        const msg = t(key);
        this.store.pushAlert("warn", msg);
        this.store.pushTranscript("system", msg, true);
      },
    });

    onLangChange((lang) => {
      this.listener.lang = ASR_LOCALE[lang];
      this.radio.lang = lang;
      this.clearHistory();
    });

    this.store.onReset?.(() => this.clearHistory());
  }

  /** Replaces the rolling voice history buffer, sanitized and bounded to 6 entries. */
  setHistory(turns: ConversationTurn[]): void {
    const next: ConversationTurn[] = [];
    for (const turn of turns) {
      if (turn.role !== "user" && turn.role !== "assistant") continue;
      const content = String(turn.content ?? "").trim().slice(0, MAX_BRIDGE_TURN_CHARS).trim();
      if (!content) continue;
      if (turn.role === "assistant" && /^ESCALATE$/i.test(content)) continue;
      next.push({ role: turn.role, content });
    }
    this.history = next.slice(-MAX_BRIDGE_HISTORY_TURNS);
    this.hooks.onLoadHistory?.(this.getHistory());
  }

  /** Clears the rolling conversational history buffer. */
  clearHistory(): void {
    this.history = [];
    this.hooks.onClearHistory?.();
  }

  /** Returns a shallow copy of the bounded conversational history buffer. */
  getHistory(): ConversationTurn[] {
    return this.history.map((turn) => ({ ...turn }));
  }

  private appendHistoryTurn(userText: string, assistantText: string): void {
    const userContent = userText.trim().slice(0, MAX_BRIDGE_TURN_CHARS);
    const assistantContent = assistantText
      .replace(/\bESCALATE\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, MAX_BRIDGE_TURN_CHARS);
    if (!userContent || !assistantContent) return;
    this.history.push(
      { role: "user", content: userContent },
      { role: "assistant", content: assistantContent },
    );
    if (this.history.length > VoiceController.MAX_HISTORY) {
      this.history = this.history.slice(-VoiceController.MAX_HISTORY);
    }
  }

  pushStart(): void {
    void this.radio.unlock();
    this.radio.cancel();
    this.listener.pushStart();
  }

  pushEnd(): void {
    this.listener.pushEnd();
  }

  /** Handles recorded PTT WAV audio with optional Web Speech interim text as hint/fallback. */
  async handleAudio(wavBase64: string, fallbackText = ""): Promise<void> {
    const cleanAudio = wavBase64.trim();
    const hint = fallbackText.trim();
    if (!cleanAudio) {
      if (hint) await this.handle(hint);
      return;
    }

    await this.radio.unlock();
    // Preserve <5 ms local critical intents and explicit camera vision checks when browser ASR captured them.
    if (hint && (matchLocalIntent(hint) || (isVisionQuestion(hint) && this.hooks.onVisionRequest))) {
      await this.handle(hint);
      return;
    }

    this.store.pushTranscript("you", hint || "...", false);
    await this.dispatchVoiceRequest({
      cleanText: hint,
      audioBase64: cleanAudio,
      isAudioTurn: true,
    });
  }

  async handle(text: string): Promise<void> {
    const clean = text.trim();
    if (!clean) return;
    await this.radio.unlock();

    // <5 ms local critical intents
    const t0 = performance.now();
    const activeLang = getLang();
    const local = matchLocalIntent(clean);
    this.store.pushTranscript("you", clean, true, {
      lang: activeLang,
      excludeFromHistory: Boolean(local && local !== "emergency"),
    });

    if (local === "repeat") {
      if (this.lastReply) {
        this.store.pushTranscript("base", this.lastReply, true, {
          lang: activeLang,
          excludeFromHistory: true,
        });
        void this.radio.say(this.lastReply);
      }
      return;
    }
    if (local) {
      const reply = this.runLocalIntent(local);
      this.store.lastAgentLatencyMs = Math.max(1, Math.round(performance.now() - t0));
      this.lastReply = reply;
      this.store.pushTranscript("base", reply, true, {
        latencyMs: this.store.lastAgentLatencyMs,
        route: ["LOCAL"],
        lang: activeLang,
        excludeFromHistory: true,
      });
      void this.radio.say(reply);
      if (local !== "emergency") return;
      // For emergency, trigger local instant alert AND escalate to BASE for pod + rescue
    }

    // Intercept explicit vision questions so the 3D mast camera frame goes to /api/agent/vision.
    // A bare unit mention ("rover dos, scout the north") must reach the agent instead.
    if (isVisionQuestion(clean) && this.hooks.onVisionRequest) {
      this.store.baseProcessing = true;
      this.store.notify();
      void this.radio.beep(740, 0.06);
      const start = performance.now();
      try {
        const res = await this.hooks.onVisionRequest("rover-2", clean);
        this.store.lastAgentLatencyMs = Math.round(performance.now() - start);
        this.lastReply = res.speech;
        this.store.pushTranscript("base", res.speech, true, {
          latencyMs: this.store.lastAgentLatencyMs,
          route: this.store.routePath.length ? this.store.routePath : ["ROBOT.rover-2"],
          lang: activeLang,
        });
        void this.radio.say(res.speech);
      } finally {
        this.store.baseProcessing = false;
        this.store.notify();
      }
      return;
    }

    await this.dispatchVoiceRequest({
      cleanText: clean,
      isAudioTurn: false,
    });
  }

  private async dispatchVoiceRequest(opts: {
    cleanText: string;
    audioBase64?: string;
    isAudioTurn: boolean;
  }): Promise<void> {
    const activeLang = getLang();
    this.store.baseProcessing = true;
    this.store.notify();
    void this.radio.beep(820, 0.06);
    const reqStart = performance.now();

    if (this.store.earthLinkDelay) {
      this.store.earthDelayRemainingS = this.store.env.earth_light_time_s * 2;
    }

    let replyRoute: string[] | undefined;
    let excludeReplyFromHistory = false;

    const finalizeAudioUserLine = (text: string, excludeFromHistory = false) => {
      if (!opts.isAudioTurn) return;
      const trimmed = text.trim();
      if (trimmed) {
        this.store.pushTranscript("you", trimmed, true, {
          lang: activeLang,
          ...(excludeFromHistory ? { excludeFromHistory: true } : {}),
        });
      } else {
        this.store.discardInterimTranscript("you");
      }
    };

    try {
      const apiLang = ASR_LOCALE[activeLang];
      const history = this.getHistory();
      const payload: VoiceAgentRequest = {
        lang: apiLang,
        context: this.store.toContext(),
        ...(history.length ? { history } : {}),
      };
      if (opts.audioBase64) {
        payload.audio_base64 = opts.audioBase64;
        payload.audio_format = "wav";
        if (opts.cleanText) payload.raw_text = opts.cleanText;
      } else {
        payload.text = opts.cleanText;
      }

      const res = await postAgentVoice(payload, AbortSignal.timeout(VOICE_REQUEST_TIMEOUT_MS));
      if (res.status === 409) {
        finalizeAudioUserLine(opts.cleanText, true);
        this.lastReply = "Terrain unavailable or incompatible. Reload and verify server assets.";
        this.store.pushAlert("crit", this.lastReply);
        this.store.pushTranscript("base", this.lastReply, true, {
          lang: activeLang,
          excludeFromHistory: true,
        });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const out = (await res.json()) as VoiceAgentResponse;
      if (!terrainMatches(out.terrain) || !terrainMatches(this.store.terrain)) {
        finalizeAudioUserLine(opts.cleanText, true);
        this.lastReply = "Terrain identity missing or incompatible; agent result discarded.";
        this.store.pushAlert("crit", this.lastReply);
        this.store.pushTranscript("base", this.lastReply, true, {
          lang: activeLang,
          excludeFromHistory: true,
        });
        return;
      }

      this.store.lastAgentLatencyMs = Math.round(performance.now() - reqStart);
      const resolvedUserText = (out.transcript ?? opts.cleanText).trim();
      if (opts.isAudioTurn) {
        finalizeAudioUserLine(resolvedUserText);
      } else if (resolvedUserText && resolvedUserText !== opts.cleanText) {
        this.store.updateLastTranscriptText("you", resolvedUserText);
      }

      if (out.trace) this.store.setTrace(out.trace, out.route ?? []);
      if (out.actions?.length) this.store.applyActions(out.actions);
      replyRoute = out.route;
      const speech = (out.speech ?? "").trim();
      this.lastReply = speech || "Acknowledged.";
      if (res.status === 200 && speech && resolvedUserText) {
        this.appendHistoryTurn(resolvedUserText, speech);
      }
    } catch {
      // Deterministic local simulation fallback when backend :8080 is offline
      this.store.lastAgentLatencyMs = Math.round(performance.now() - reqStart);
      const fallbackText = opts.cleanText.trim();
      if (fallbackText) {
        finalizeAudioUserLine(fallbackText, true);
        const sim = this.offlineFallback(fallbackText);
        this.store.setTrace(sim.trace, sim.route);
        this.store.applyActions(sim.actions);
        replyRoute = sim.route;
        excludeReplyFromHistory = true;
        this.lastReply = sim.speech;
      } else {
        this.store.discardInterimTranscript("you");
        replyRoute = ["SUIT.VOICE-EXEC"];
        excludeReplyFromHistory = true;
        this.lastReply = t("voice.no_link");
      }
    } finally {
      this.store.baseProcessing = false;
      this.store.notify();
    }

    this.store.pushTranscript("base", this.lastReply, true, {
      route: replyRoute,
      latencyMs: this.store.lastAgentLatencyMs,
      lang: activeLang,
      excludeFromHistory: excludeReplyFromHistory,
    });
    void this.radio.say(this.lastReply);
  }

  private runLocalIntent(intent: LocalIntentId): string {
    switch (intent) {
      case "emergency":
        this.store.pushAlert("crit", "EMERGENCY DECLARED (<5 ms local intent)");
        return getLang() === "es"
          ? "Emergencia activada. Escalando rescate a BASE."
          : "Emergency declared. Escalating rescue to BASE.";
      case "abort_eva":
        this.store.pushAlert("warn", "EVA ABORTED (<5 ms local intent)");
        this.store.executeApprovedAction({
          type: "show_route",
          args: { to_x: AIRLOCK_COORD.x, to_z: AIRLOCK_COORD.z },
          proposedBy: "LOCAL",
        });
        return getLang() === "es" ? "EVA abortada. Ruta directa al airlock." : "EVA aborted. Direct route to airlock.";
      case "stop_all":
        this.store.executeApprovedAction({ type: "stop_all", args: {}, proposedBy: "LOCAL" });
        this.store.pushAlert("warn", "ALL FLEET STOPPED (<5 ms local intent)");
        return getLang() === "es" ? "Toda la flota detenida." : "All fleet units stopped.";
      case "open_map":
        this.store.setPanel("map");
        return getLang() === "es" ? "Mapa táctico abierto." : "Tactical map opened.";
      case "close_panel":
        this.store.setPanel("none");
        return getLang() === "es" ? "Paneles cerrados." : "Panels closed.";
      case "repeat":
        return this.lastReply;
    }
  }

  offlineFallback(text: string): {
    speech: string;
    actions: Action[];
    trace: TraceEvent[];
    route: string[];
  } {
    const now = Date.now();
    const low = text.toLowerCase();
    const lang = getLang();
    const es = lang === "es";
    const explicitUnit = matchOfflineExplicitUnitId(low);

    if (/thermal|t[eé]rmic/.test(low)) {
      const a: Action = {
        type: "set_layer",
        args: { layer: "thermal" },
        proposedBy: "SUIT.VOICE-EXEC",
        verdict: { decision: "allow", reason: "HUD layer change", by: "rules" },
      };
      return {
        speech: es ? "Capa termica activada." : "Thermal layer active.",
        actions: [a],
        trace: [
          { t: now, agent: "SUIT.VOICE-EXEC", kind: "tool", detail: { tool: "set_layer", args: a.args } },
          { t: now + 2, agent: "GUARDIAN", kind: "verdict", detail: a },
        ],
        route: ["SUIT.VOICE-EXEC"],
      };
    }

    if (!explicitUnit && /route|ruta|site two|sitio.*dos|s2/.test(low)) {
      const s2 = MISSION_SITES_BY_ID.S2;
      const a: Action = {
        type: "show_route",
        args: { to_x: s2.x, to_z: s2.z },
        proposedBy: "EVA-PLANNER",
        verdict: { decision: "allow", reason: "Safe EVA route", by: "rules" },
      };
      return {
        speech: es ? "Ruta al sitio S2 trazada sobre el terreno." : "Route to site S2 plotted on terrain.",
        actions: [a],
        trace: [
          { t: now, agent: "SUIT", kind: "delegate", detail: { to: "BASE" } },
          { t: now + 3, agent: "BASE", kind: "delegate", detail: { to: "EVA-PLANNER" } },
          { t: now + 6, agent: "EVA-PLANNER", kind: "tool", detail: { tool: "plan_route", args: a.args } },
          { t: now + 8, agent: "GUARDIAN", kind: "verdict", detail: a },
        ],
        route: ["SUIT.VOICE-EXEC", "BASE", "EVA-PLANNER"],
      };
    }

    if (/fan|ventilador|trend|tendencia/.test(low)) {
      this.store.fanDegraded = true;
      const a: Action = {
        type: "show_alert",
        args: { level: "warn", text: "PLSS fan RPM drop detected (-35%). Per NASA-STD-3001 Vol 2, monitor CO2.", source: "NASA-STD-3001 Vol 2" },
        proposedBy: "MAINTENANCE",
        verdict: { decision: "allow", reason: "Advisory alert", by: "rules" },
      };
      return {
        speech: es
          ? "Tendencia anomala en ventilador PLSS: 18200 RPM. Monitorear CO2."
          : "PLSS fan RPM trending down to 18200. Monitor CO2 scrubber.",
        actions: [a],
        trace: [
          { t: now, agent: "SUIT", kind: "delegate", detail: { to: "BASE" } },
          { t: now + 2, agent: "BASE", kind: "delegate", detail: { to: "MAINTENANCE" } },
          { t: now + 5, agent: "MAINTENANCE", kind: "tool", detail: { tool: "search_docs", args: { query: "CO2 fan" } } },
          { t: now + 8, agent: "GUARDIAN", kind: "verdict", detail: a },
        ],
        route: ["SUIT.VOICE-EXEC", "BASE", "MAINTENANCE"],
      };
    }

    const isUnitRescueOrder =
      /(?<![\p{L}\d])(rescue|rescate)(?:\s*(?:uno|one|un|1|-1))?(?![\p{L}\d])/iu.test(low) &&
      /(?<![\p{L}\d])(volv[\p{L}]*|vuelv[\p{L}]*|regres[\p{L}]*|return|base|trae[\p{L}]*|tr[aá]eme|bring|deliver|suministr[\p{L}]*|ox[ií]geno|oxygen|segu[\p{L}]*|s[ií]gu[\p{L}]*|follow|qu[eé]date|quedate|hold|repetidor|relay|go\s+to|ir\s+a|ven[ií]?|come|ac[eé]rcate|acercate|approach|posici[oó]n|position|here|aqu[ií]|ac[aá]|overwatch|vigil[\p{L}]*|survey|relev[\p{L}]*)(?![\p{L}\d])/iu.test(
        low,
      );
    const isEmergencyQuery =
      !isUnitRescueOrder &&
      /(?<![\p{L}])(emerg[\p{L}]*|leak|fuga|rescat[aáe]?me|mayday|socorro|auxilio|urgence|notfall|emergenza|send rescue)(?![\p{L}])/iu.test(
        low,
      );

    if (isEmergencyQuery) {
      if (this.store.emergencyResponseActive) {
        return {
          speech: es
            ? "Respuesta de emergencia ya activa; pod y rescue-1 ya despachados."
            : "Emergency response already active; pod and rescue-1 already dispatched.",
          actions: [],
          trace: [{ t: now, agent: "SUIT", kind: "delegate", detail: { to: "BASE" } }],
          route: ["SUIT.VOICE-EXEC", "BASE"],
        };
      }
      const podX = this.store.astronaut.x + C.pod_keepout_m.value + 5;
      const podZ = this.store.astronaut.z + 4;
      const podAct: Action = {
        type: "launch_pod",
        args: { target_x: podX, target_z: podZ, payload: "o2" },
        proposedBy: "BASE",
        verdict: {
          decision: "ask_human",
          reason: "Backend offline: confirm emergency pod launch outside 15 m keep-out ring",
          by: "rules",
        },
      };
      const rescueAct: Action = {
        type: "dispatch",
        args: { unit_id: "rescue-1", x: this.store.astronaut.x, z: this.store.astronaut.z, task: "rescue" },
        proposedBy: "BASE",
        verdict: {
          decision: "ask_human",
          reason: "Backend offline: confirm rescue-1 dispatch",
          by: "rules",
        },
      };
      return {
        speech: es
          ? "Enlace offline: confirmá el lanzamiento del pod O2 y despacho de rescue-1 en el panel."
          : "Backend offline: confirm O2 pod launch and rescue-1 dispatch in the panel.",
        actions: [podAct, rescueAct],
        trace: [
          { t: now, agent: "SUIT", kind: "delegate", detail: { to: "BASE" } },
          { t: now + 2, agent: "BASE", kind: "tool", detail: { tool: "time_to_hypoxia", args: {} } },
          { t: now + 4, agent: "BASE", kind: "tool", detail: { tool: "launch_pod", args: podAct.args } },
          { t: now + 5, agent: "GUARDIAN", kind: "verdict", detail: podAct },
          { t: now + 7, agent: "BASE", kind: "tool", detail: { tool: "dispatch", args: rescueAct.args } },
          { t: now + 8, agent: "GUARDIAN", kind: "verdict", detail: rescueAct },
        ],
        route: ["SUIT.VOICE-EXEC", "BASE"],
      };
    }

    const hasArmSkillVerb =
      /(?<![\p{L}\d])(drill|taladr[\p{L}]*|sample|muestra|hammer|martillo|handover|entreg[\p{L}]*|grab|agarr[\p{L}]*)(?![\p{L}\d])/iu.test(
        low,
      );
    const hasNavVerb =
      /(?<![\p{L}\d])(go\s+to|ir\s+a|come|komm|vieni|ven[ií]?|ac[eé]rcate|acercate|approach|avvicinati|a\s+mi\s+posici[oó]n|my\s+position|follow|suivre|suis[- ]moi|folg[\p{L}]*|segu[\p{L}]*|s[ií]gu[\p{L}]*|overwatch|vigil[\p{L}]*|hover|sobrevol[\p{L}]*|take\s*off|despeg[\p{L}]*|d[eé]coll[\p{L}]*|abheb[\p{L}]*|decoll[\p{L}]*|land|aterriz[\p{L}]*|atterr[\p{L}]*|return|retour[\p{L}]*|zur[uü]ck|torna|volv[\p{L}]*|vuelv[\p{L}]*|regres[\p{L}]*|hold|quedate|qu[eé]date|halte|survey|relev[\p{L}]*|inspeccion[\p{L}]*|erkund[\p{L}]*|relay|repetidor|relais|ripetitore|send|env[ií][\p{L}]*|m[aá]nd[\p{L}]*|dispatch|despach[\p{L}]*|here|aqu[ií]|ac[aá]|ici|hier|qui)(?![\p{L}\d])/iu.test(
        low,
      );

    if (hasArmSkillVerb || (/hands|manip/i.test(low) && !hasNavVerb)) {
      const skill = /drill|taladr/.test(low)
        ? "drill"
        : /hammer|martillo|handover|entreg/.test(low)
          ? "handover"
          : /sample|muestra/.test(low)
            ? "sample"
            : "photograph";
      const targetId = skill === "handover" ? "astronaut" : "T1";
      const manipUnit = this.store.fleet.find((u) => u.id === "manip-1");
      const distCrew = manipUnit
        ? Math.hypot(manipUnit.x - this.store.astronaut.x, manipUnit.z - this.store.astronaut.z)
        : 99;
      let verdict: Action["verdict"] = { decision: "allow", reason: "Target verified in mast cam", by: "rules" };
      if (skill !== "handover" && distCrew < 2.0) {
        verdict = { decision: "deny", reason: t("guard.crew_near_tool"), by: "rules" };
      } else if (skill === "handover" && this.store.astronaut.speed > 0.1) {
        verdict = { decision: "deny", reason: "Astronaut must stand still for handover", by: "rules" };
      }
      const act: Action = {
        type: "arm_skill",
        args: { unit_id: "manip-1", skill, target_id: targetId },
        proposedBy: "ROBOT.manip-1",
        verdict,
      };
      return {
        speech:
          verdict.decision === "deny"
            ? verdict.reason
            : es
              ? `ROBOT.manip-1 ejecutando ${skill} en ${targetId}.`
              : `ROBOT.manip-1 executing ${skill} on ${targetId}.`,
        actions: [act],
        trace: [
          { t: now, agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } },
          { t: now + 2, agent: "BASE", kind: "delegate", detail: { to: "ROBOT.manip-1" } },
          { t: now + 4, agent: "ROBOT.manip-1", kind: "tool", detail: { tool: "arm_skill", args: act.args } },
          { t: now + 6, agent: "GUARDIAN", kind: "verdict", detail: act },
        ],
        route: ["SUIT.VOICE-EXEC", "BASE", "ROBOT.manip-1"],
      };
    }

    const isFleetOrder = Boolean(explicitUnit) || hasNavVerb;
    if (isFleetOrder) {
      let unitAction: string | null = null;
      if (/(?<![\p{L}\d])(take\s*off|despeg[\p{L}]*|d[eé]coll[\p{L}]*|abheb[\p{L}]*|decoll[\p{L}]*)(?![\p{L}\d])/iu.test(low)) unitAction = "takeoff";
      else if (/(?<![\p{L}\d])(land|aterriz[\p{L}]*|atterr[\p{L}]*)(?![\p{L}\d])/iu.test(low)) unitAction = "land";
      else if (/(?<![\p{L}\d])(overwatch|vigil[\p{L}]*|hover|sobrevol[\p{L}]*)(?![\p{L}\d])/iu.test(low)) unitAction = "hover_overwatch";
      else if (/(?<![\p{L}\d])(follow(?:\s+me)?|segu[\p{L}]*|s[ií]gu[\p{L}]*|suis[- ]moi|suivre|folg[\p{L}]*)(?![\p{L}\d])/iu.test(low)) unitAction = "follow_astronaut";
      else if (/(?<![\p{L}\d])(return(?:\s+to\s+base)?|volv[\p{L}]*|vuelv[\p{L}]*|regres[\p{L}]*|back\s+to\s+base|retour[\p{L}]*|zur[uü]ck|torna)(?![\p{L}\d])/iu.test(low)) unitAction = "return_to_base";
      else if (/(?<![\p{L}\d])(hold(?:\s+position)?|stay(?:\s+there)?|qu[eé]date|quedate|halte)(?![\p{L}\d])/iu.test(low)) unitAction = "hold_position";
      else if (/(?<![\p{L}\d])(survey|relev[\p{L}]*|inspeccion[\p{L}]*|erkund[\p{L}]*)(?![\p{L}\d])/iu.test(low)) unitAction = "survey_area";
      else if (/(?<![\p{L}\d])(photograph[\p{L}]*|fotograf[\p{L}]*|foto|photo)(?![\p{L}\d])/iu.test(low)) unitAction = "photograph_area";
      else if (/(?<![\p{L}\d])(relay|repetidor|relais|ripetitore)(?![\p{L}\d])/iu.test(low)) unitAction = "relay_comms";
      else if (/(?<![\p{L}\d])(deliver|supplies|suministr[\p{L}]*|tr[aá]eme(?:\s+ox[ií]geno)?|bring\s+oxygen)(?![\p{L}\d])/iu.test(low)) unitAction = "deliver_supplies";

      let unitId = explicitUnit;
      if (!unitId) {
        for (let i = this.history.length - 1; i >= 0; i--) {
          const fromHist = matchOfflineExplicitUnitId(this.history[i].content.toLowerCase());
          if (fromHist) {
            unitId = fromHist;
            break;
          }
        }
      }
      if (!unitId) {
        unitId =
          unitAction === "takeoff" || unitAction === "land" || unitAction === "hover_overwatch"
            ? (this.store.fleet.find((u) => u.kind === "drone")?.id ?? "drone-1")
            : (this.store.fleet[0]?.id ?? "rover-1");
      }

      const unitKind = inferOfflineUnitKind(unitId, this.store.fleet);
      const unitObj = this.store.fleet.find((u) => u.id === unitId);
      const isFlyer = unitKind === "drone" || unitKind === "glider";
      const battery = unitObj?.battery ?? 0.94;
      const robotAgent = `ROBOT.${unitId}`;
      const route = ["SUIT.VOICE-EXEC", "BASE", robotAgent];

      const checkFlightAndBattery = (what: string, allowGrounded: boolean): NonNullable<Action["verdict"]> => {
        if (battery < 0.1) {
          return { decision: "deny", reason: `Battery of ${unitId} is below 10%`, by: "rules" };
        }
        if (isFlyer && !allowGrounded) {
          if (battery < 0.15) {
            return { decision: "deny", reason: `Battery of ${unitId} is too low for ${what}`, by: "rules" };
          }
          if (this.store.env.tau >= AIRCRAFT_GROUNDING_TAU) {
            return {
              decision: "deny",
              reason: `Dust opacity tau=${this.store.env.tau.toFixed(2)} exceeds ${AIRCRAFT_GROUNDING_TAU} aircraft grounding limit`,
              by: "rules",
            };
          }
          if (this.store.env.wind_ms >= 20) {
            return {
              decision: "deny",
              reason: `Wind speed ${this.store.env.wind_ms.toFixed(1)} m/s exceeds 20 m/s aircraft flight limit`,
              by: "rules",
            };
          }
          if (surfaceDensity(this.store.env.pressure_pa, this.store.env.air_temp_k) < 0.01) {
            return { decision: "deny", reason: "Air density below 0.01 kg/m^3 minimum flight density", by: "rules" };
          }
        }
        return { decision: "allow", reason: "Offline safety rule check passed", by: "rules" };
      };

      if (unitAction) {
        const allowedKinds = OFFLINE_ACTION_KINDS[unitAction] ?? [];
        const allowGrounded = unitAction === "land" || unitAction === "hold_position";
        const verdict: NonNullable<Action["verdict"]> = !allowedKinds.includes(unitKind)
          ? { decision: "deny", reason: `${unitId} (${unitKind}) cannot perform ${unitAction}`, by: "rules" }
          : checkFlightAndBattery(unitAction, allowGrounded);
        const heading = parseOfflineHeading(low);
        const args: Record<string, unknown> = { unit_id: unitId, action: unitAction };
        if (unitAction === "takeoff") args.altitude_m = 14;
        if ((unitAction === "photograph_area" || unitAction === "survey_area") && heading) args.heading = heading;
        const act: Action = { type: "unit_action", args, proposedBy: robotAgent, verdict };
        const speech =
          verdict.decision === "deny"
            ? pickOfflineSpeech(lang, `Orden rechazada por GUARDIAN: ${verdict.reason}.`, `Order rejected by GUARDIAN: ${verdict.reason}.`)
            : pickOfflineSpeech(lang, `${unitId} ejecutando ${unitAction}.`, `${unitId} executing ${unitAction}.`);
        return {
          speech,
          actions: [act],
          trace: [
            { t: now, agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } },
            { t: now + 2, agent: "BASE", kind: "delegate", detail: { to: robotAgent } },
            { t: now + 4, agent: robotAgent, kind: "tool", detail: { tool: "unit_action", args: act.args } },
            { t: now + 6, agent: "GUARDIAN", kind: "verdict", detail: act },
          ],
          route,
        };
      }

      const target = parseOfflineTarget(low, this.store.astronaut.x, this.store.astronaut.z);
      let destX = target.x;
      let destZ = target.z;
      if (target.isAstronaut && !isFlyer && unitObj) {
        const dx = unitObj.x - this.store.astronaut.x;
        const dz = unitObj.z - this.store.astronaut.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 5) {
          destX = Number((this.store.astronaut.x + (dx / dist) * 5).toFixed(1));
          destZ = Number((this.store.astronaut.z + (dz / dist) * 5).toFixed(1));
        }
      }
      let verdict = checkFlightAndBattery("dispatch", false);
      if (verdict.decision === "allow" && !isFlyer && this.hooks.slopeAt) {
        const maxSlope = OFFLINE_MAX_SLOPE[unitKind] ?? 20;
        if (this.hooks.slopeAt(destX, destZ) > maxSlope) {
          if (target.isAstronaut) {
            let foundSafe = false;
            const radii = [5, 10, 15, 25];
            outer: for (const r of radii) {
              for (let k = 0; k < 16; k++) {
                const ang = (2 * Math.PI * k) / 16;
                const cx = Number((this.store.astronaut.x + r * Math.cos(ang)).toFixed(1));
                const cz = Number((this.store.astronaut.z + r * Math.sin(ang)).toFixed(1));
                if (this.hooks.slopeAt(cx, cz) <= maxSlope) {
                  destX = cx;
                  destZ = cz;
                  foundSafe = true;
                  break outer;
                }
              }
            }
            if (!foundSafe) {
              verdict = {
                decision: "deny",
                reason: `Terrain slope at (${destX}, ${destZ}) exceeds ${maxSlope} deg limit for ${unitId}`,
                by: "rules",
              };
            }
          } else {
            verdict = {
              decision: "deny",
              reason: `Target slope ${this.hooks.slopeAt(destX, destZ).toFixed(1)} deg exceeds ${maxSlope} deg limit for ${unitId}`,
              by: "rules",
            };
          }
        }
      }
      const act: Action = {
        type: "dispatch",
        args: { unit_id: unitId, x: destX, z: destZ, task: "goto" },
        proposedBy: robotAgent,
        verdict,
      };
      const speech =
        verdict.decision === "deny"
          ? pickOfflineSpeech(lang, `Orden rechazada por GUARDIAN: ${verdict.reason}.`, `Dispatch rejected by GUARDIAN: ${verdict.reason}.`)
          : pickOfflineSpeech(
              lang,
              `Despachando ${unitId} a (${destX}, ${destZ})${isFlyer ? " a 14 m de altitud" : ""}.`,
              `Dispatching ${unitId} to (${destX}, ${destZ})${isFlyer ? " at 14 m altitude" : ""}.`,
            );
      return {
        speech,
        actions: [act],
        trace: [
          { t: now, agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } },
          { t: now + 2, agent: "BASE", kind: "delegate", detail: { to: robotAgent } },
          { t: now + 4, agent: robotAgent, kind: "tool", detail: { tool: "dispatch", args: act.args } },
          { t: now + 6, agent: "GUARDIAN", kind: "verdict", detail: act },
        ],
        route,
      };
    }

    const pKpa = (this.store.suit.suit_pressure_pa / 1000).toFixed(1);
    const o2Pct = Math.round((this.store.suit.o2_primary_kg / this.store.suit.o2_primary_cap_kg) * 100);
    return {
      speech: es
        ? `Traje nominal: ${pKpa} kPa, O2 primario ${o2Pct} por ciento. (Modo local sin servidor)`
        : `Suit nominal: ${pKpa} kPa, primary O2 ${o2Pct} percent. (${t("voice.no_link")})`,
      actions: [],
      trace: [
        { t: now, agent: "SUIT.VOICE-EXEC", kind: "tool", detail: { tool: "get_suit_telemetry", args: {} } },
      ],
      route: ["SUIT.VOICE-EXEC"],
    };
  }
}
