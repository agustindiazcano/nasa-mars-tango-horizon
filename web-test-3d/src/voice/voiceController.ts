import { AIRLOCK_COORD, MISSION_SITES_BY_ID, terrainMatches } from "@th/shared";
import { postAgentVoice, type VoiceAgentResponse } from "../api";
import { ASR_LOCALE, getLang, onLangChange, t } from "../core/i18n";
import { C } from "../core/physics";
import type { Action, ConversationTurn, TraceEvent } from "../core/types";
import type { MissionStore } from "../state";
import { Listener, type ListenErrorCode } from "./listen";
import { matchLocalIntent, type LocalIntentId } from "./localIntents";
import { RadioSpeaker } from "./speak";
import { isVisionQuestion } from "./visionIntent";

export interface VoiceHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceControllerHooks {
  onVisionRequest?(unitId: string, question: string): Promise<{ speech: string; injection: boolean }>;
  onLoadHistory?(turns: VoiceHistoryTurn[]): void;
  onClearHistory?(): void;
}

const MAX_BRIDGE_HISTORY_TURNS = 6;
const MAX_BRIDGE_TURN_CHARS = 400;

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

    this.store.baseProcessing = true;
    this.store.notify();
    void this.radio.beep(820, 0.06);
    const reqStart = performance.now();

    if (this.store.earthLinkDelay) {
      this.store.earthDelayRemainingS = this.store.env.earth_light_time_s * 2;
    }

    let replyRoute: string[] | undefined;
    let excludeReplyFromHistory = false;

    try {
      const lang = getLang();
      const apiLang = ASR_LOCALE[lang];
      const history = this.getHistory();
      const res = await postAgentVoice(
        {
          text: clean,
          lang: apiLang,
          context: this.store.toContext(),
          ...(history.length ? { history } : {}),
        },
        AbortSignal.timeout(70000),
      );
      if (res.status === 409) {
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
        this.lastReply = "Terrain identity missing or incompatible; agent result discarded.";
        this.store.pushAlert("crit", this.lastReply);
        this.store.pushTranscript("base", this.lastReply, true, {
          lang: activeLang,
          excludeFromHistory: true,
        });
        return;
      }
      this.store.lastAgentLatencyMs = Math.round(performance.now() - reqStart);
      if (out.trace) this.store.setTrace(out.trace, out.route ?? []);
      if (out.actions?.length) this.store.applyActions(out.actions);
      replyRoute = out.route;
      const speech = (out.speech ?? "").trim();
      this.lastReply = speech || "Acknowledged.";
      if (res.status === 200 && speech) {
        this.appendHistoryTurn(clean, speech);
      }
    } catch {
      // Deterministic local simulation fallback when backend :8080 is offline
      this.store.lastAgentLatencyMs = Math.round(performance.now() - reqStart);
      const sim = this.offlineFallback(clean);
      this.store.setTrace(sim.trace, sim.route);
      this.store.applyActions(sim.actions);
      replyRoute = sim.route;
      excludeReplyFromHistory = true;
      this.lastReply = sim.speech;
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

  private offlineFallback(text: string): {
    speech: string;
    actions: Action[];
    trace: TraceEvent[];
    route: string[];
  } {
    const now = Date.now();
    const low = text.toLowerCase();
    const es = getLang() === "es";

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

    if (/route|ruta|site two|sitio.*dos|s2/.test(low)) {
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
      /\b(rescue|rescate)(?:\s*(?:uno|one|1|-1))?\b/i.test(low) &&
      /\b(volv|regres|return|base|trae|bring|deliver|segu|follow|quedate|hold)\b/i.test(low);
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

    if (/hands|manip|drill|sample|hammer|martillo|taladr|muestra/.test(low)) {
      const skill = /drill|taladr/.test(low)
        ? "drill"
        : /hammer|martillo|hand|trae|bring/.test(low)
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
          { t: now, agent: "BASE", kind: "delegate", detail: { to: "ROBOT.manip-1" } },
          { t: now + 4, agent: "ROBOT.manip-1", kind: "tool", detail: { tool: "arm_skill", args: act.args } },
          { t: now + 6, agent: "GUARDIAN", kind: "verdict", detail: act },
        ],
        route: ["SUIT.VOICE-EXEC", "BASE", "ROBOT.manip-1"],
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
