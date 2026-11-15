import { formatCoordinates } from "../world/terrainValidation";
import { ASR_LOCALE, fmt, getLang, LANG_NAME, LANGS, onLangChange, setLang, t } from "../core/i18n";
import { C, leakTimeline } from "../core/physics";
import type { AlertLevel, ArmSkillId, LayerId, PanelId, TraceEvent, VotingTraceDetail } from "../core/types";
import {
  exportSessionJson,
  exportSessionMarkdown,
  type ChatSessionManager,
  type SavedChatSession,
} from "../data/sessionStore";
import type { MissionStore } from "../state";
import type { VoiceController } from "../voice/voiceController";
import { BASE_MODULES } from "../world/baseProc";
import type { TerrainProc } from "../world/terrainProc";
import type { DeckButton } from "./demoDeck";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface HudActions {
  togglePov(): void;
  setLayer(layer: LayerId): void;
  runManipSkill(skill: ArmSkillId, targetId: string): void;
  captureRoverVision(unitId: string, question: string): void;
  getQrCanvas(): HTMLCanvasElement;
  getQrUrlEl(): HTMLElement;
  recenterRemote(): void;
  setRemoteInvert(invX: boolean, invY: boolean): void;
  onToggleDeck(): void;
  sessions?: ChatSessionManager;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class TacticalHud {
  private root: HTMLElement;
  private qrModalOpen = false;
  private roverModalOpen = false;
  private deckVisible = true;
  private qrCanvas: HTMLCanvasElement;
  private qrUrlEl: HTMLElement;
  private qrContainer: HTMLElement;
  private modalEl: HTMLElement;
  private leftEl: HTMLElement;
  private rightEl: HTMLElement;
  private topEl: HTMLElement;
  private bottomEl: HTMLElement;
  private voiceInput!: HTMLInputElement;
  private invX = false;
  private invY = false;
  private lastModalPanel: PanelId = "none";
  private sessionsRenderKey = "";

  constructor(
    private store: MissionStore,
    private terrain: TerrainProc,
    private voice: VoiceController,
    private deck: DeckButton[],
    private actions: HudActions,
  ) {
    this.root = document.getElementById("hud-root")!;
    this.root.innerHTML = `
      <div id="visor-vignette"></div>
      <div id="hud-top" class="hud-panel hud-top"></div>
      <div id="hud-left" class="hud-panel hud-left"></div>
      <div id="hud-right" class="hud-panel hud-right"></div>
      <div id="hud-modal" class="hud-panel hud-modal" style="display:none"></div>
      <div id="hud-qr" class="hud-panel hud-modal" style="display:none; width:300px; text-align:center;"></div>
      <div id="hud-bottom" class="hud-panel hud-bottom"></div>
    `;

    this.topEl = document.getElementById("hud-top")!;
    this.leftEl = document.getElementById("hud-left")!;
    this.rightEl = document.getElementById("hud-right")!;
    this.modalEl = document.getElementById("hud-modal")!;
    this.qrContainer = document.getElementById("hud-qr")!;
    this.bottomEl = document.getElementById("hud-bottom")!;

    this.qrCanvas = document.createElement("canvas");
    this.qrUrlEl = document.createElement("div");
    this.qrUrlEl.style.cssText = "font-size:10px; word-break:break-all; margin:6px 0; color:#8fd8ef;";
    this.buildQrContainer();
    this.buildBottomStatic();

    this.store.subscribe(() => this.renderDynamic());
    this.actions.sessions?.subscribe(() => {
      this.sessionsRenderKey = "";
      this.renderDynamic();
    });
    onLangChange(() => {
      this.sessionsRenderKey = "";
      this.buildBottomStatic();
      this.renderDynamic();
    });
    this.renderDynamic();
  }

  getQrCanvas(): HTMLCanvasElement {
    return this.qrCanvas;
  }

  getQrUrlEl(): HTMLElement {
    return this.qrUrlEl;
  }

  toggleDeck(): void {
    this.deckVisible = !this.deckVisible;
    const el = document.getElementById("deck-bar");
    if (el) el.style.display = this.deckVisible ? "flex" : "none";
  }

  openRoverModal(): void {
    this.roverModalOpen = true;
    this.store.setPanel("none");
    this.renderModal();
  }

  toggleQrModal(force?: boolean): void {
    this.qrModalOpen = force ?? !this.qrModalOpen;
    this.qrContainer.style.display = this.qrModalOpen ? "block" : "none";
  }

  private buildQrContainer(): void {
    this.qrContainer.innerHTML = `
      <div class="panel-hdr">
        <span>${t("remote.title")}</span>
        <button class="hud-btn" data-pointable id="qr-close-btn">X</button>
      </div>
      <div id="qr-status" class="pill" style="margin-bottom:8px;">${t("remote.waiting")}</div>
      <div id="qr-canvas-slot" style="display:flex; justify-content:center;"></div>
    `;
    this.qrContainer.querySelector("#qr-canvas-slot")!.appendChild(this.qrCanvas);
    this.qrContainer.appendChild(this.qrUrlEl);

    const controls = document.createElement("div");
    controls.className = "btn-row";
    controls.style.justifyContent = "center";
    controls.innerHTML = `
      <button class="hud-btn" data-pointable id="qr-recenter">${t("remote.recenter")}</button>
      <button class="hud-btn" data-pointable id="qr-invx">${t("remote.invx")}</button>
      <button class="hud-btn" data-pointable id="qr-invy">${t("remote.invy")}</button>
    `;
    this.qrContainer.appendChild(controls);

    this.qrContainer.querySelector("#qr-close-btn")!.addEventListener("click", () => this.toggleQrModal(false));
    this.qrContainer.querySelector("#qr-recenter")!.addEventListener("click", () => this.actions.recenterRemote());
    this.qrContainer.querySelector("#qr-invx")!.addEventListener("click", () => {
      this.invX = !this.invX;
      this.actions.setRemoteInvert(this.invX, this.invY);
    });
    this.qrContainer.querySelector("#qr-invy")!.addEventListener("click", () => {
      this.invY = !this.invY;
      this.actions.setRemoteInvert(this.invX, this.invY);
    });
  }

  private buildBottomStatic(): void {
    const langBtns = LANGS.map(
      (l) =>
        `<button class="hud-btn ${getLang() === l ? "active" : ""}" data-pointable data-lang="${l}">${LANG_NAME[l]}</button>`,
    ).join("");

    const menuItems: { panel: PanelId; key: string }[] = [
      { panel: "map", key: "menu.map" },
      { panel: "fleet", key: "menu.fleet" },
      { panel: "agents", key: "menu.agents" },
      { panel: "health", key: "menu.health" },
      { panel: "base", key: "menu.base" },
      { panel: "provenance", key: "menu.provenance" },
      { panel: "sessions", key: "menu.sessions" },
    ];
    const menuHtml = menuItems
      .map(
        (m) =>
          `<button class="hud-btn" data-pointable data-panel="${m.panel}">${t(m.key)}</button>`,
      )
      .join("");

    const layerIds: LayerId[] = ["optical", "slope", "thermal", "radiation", "hydration"];
    const layerHtml = layerIds
      .map(
        (l) =>
          `<button class="hud-btn" data-pointable data-layer="${l}">${t(`hud.layer.${l}`)}</button>`,
      )
      .join("");

    const deckHtml = this.deck
      .map((d) => `<button class="hud-btn" data-pointable data-deck="${d.key}">${t(d.labelKey)}</button>`)
      .join("");

    this.bottomEl.innerHTML = `
      <div class="btn-row" style="justify-content:space-between;">
        <div class="btn-row">
          ${menuHtml}
          <button class="hud-btn" data-pointable id="btn-rover-cam">${t("menu.rover_cam")}</button>
          <button class="hud-btn" data-pointable id="btn-qr">${t("menu.remote")}</button>
          <button class="hud-btn" data-pointable id="btn-pov">${this.store.povMode === "1st" ? t("hud.pov_1st") : t("hud.pov_3rd")}</button>
        </div>
        <div class="btn-row">
          <span style="opacity:0.75; font-size:10px;">${t("hud.layers")}:</span>
          ${layerHtml}
          <span style="margin-left:4px;">${langBtns}</span>
        </div>
      </div>

      <div class="voice-row">
        <button class="hud-btn" data-pointable id="btn-ptt">${t("voice.ptt")}</button>
        <button class="hud-btn" data-pointable id="btn-wake">${t("voice.wake")}</button>
        <button class="hud-btn ${this.voice.radio.radioEffect ? "active" : ""}" data-pointable id="btn-radio">${t("voice.radio")}</button>
        <input id="voice-input" type="text" placeholder="${t("voice.placeholder")}" />
        <button class="hud-btn" data-pointable id="btn-send">${t("voice.send")}</button>
        <span id="base-proc-badge" class="pill warn" style="display:none;">${t("voice.processing")}</span>
      </div>

      <div class="comms-bar">
        <span id="comms-session-meta" class="comms-meta"></span>
        <div class="btn-row">
          <button class="hud-btn" data-pointable id="btn-session-new">${t("comms.new_session")}</button>
          <button class="hud-btn" data-pointable id="btn-session-picker">${t("comms.sessions")}</button>
          <button class="hud-btn" data-pointable id="btn-export-json">${t("comms.export_json")}</button>
          <button class="hud-btn" data-pointable id="btn-export-md">${t("comms.export_md")}</button>
        </div>
      </div>

      <div id="transcript-box" class="transcript-box"></div>
      <div id="deck-bar" class="btn-row" style="display:${this.deckVisible ? "flex" : "none"};">${deckHtml}</div>
    `;

    this.voiceInput = document.getElementById("voice-input") as HTMLInputElement;

    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => {
      b.addEventListener("click", () => setLang(b.dataset.lang as (typeof LANGS)[number]));
    });
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((b) => {
      b.addEventListener("click", () => {
        const p = b.dataset.panel as PanelId;
        this.roverModalOpen = false;
        this.store.setPanel(this.store.panel === p ? "none" : p);
      });
    });
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-layer]").forEach((b) => {
      b.addEventListener("click", () => this.actions.setLayer(b.dataset.layer as LayerId));
    });
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-deck]").forEach((b) => {
      b.addEventListener("click", () => {
        const item = this.deck.find((d) => d.key === b.dataset.deck);
        item?.run();
      });
    });

    document.getElementById("btn-pov")!.addEventListener("click", () => this.actions.togglePov());
    document.getElementById("btn-qr")!.addEventListener("click", () => this.toggleQrModal());
    document.getElementById("btn-rover-cam")!.addEventListener("click", () => {
      this.roverModalOpen = true;
      this.actions.captureRoverVision("rover-2", t("deck.say.3"));
    });

    const pttBtn = document.getElementById("btn-ptt")!;
    pttBtn.addEventListener("pointerdown", () => this.voice.pushStart());
    pttBtn.addEventListener("pointerup", () => this.voice.pushEnd());

    const wakeBtn = document.getElementById("btn-wake")!;
    wakeBtn.addEventListener("click", () => {
      const next = !this.voice.listener.wakeEnabled;
      this.voice.listener.setWakeMode(next);
      wakeBtn.classList.toggle("active", next);
    });

    const radioBtn = document.getElementById("btn-radio")!;
    radioBtn.addEventListener("click", () => {
      this.voice.radio.radioEffect = !this.voice.radio.radioEffect;
      radioBtn.classList.toggle("active", this.voice.radio.radioEffect);
    });

    const sendOrder = () => {
      const val = this.voiceInput.value.trim();
      if (!val) return;
      this.voiceInput.value = "";
      void this.voice.handle(val);
    };
    document.getElementById("btn-send")!.addEventListener("click", sendOrder);
    this.voiceInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendOrder();
    });

    document.getElementById("btn-session-new")!.addEventListener("click", () => {
      this.actions.sessions?.newSession();
    });
    document.getElementById("btn-session-picker")!.addEventListener("click", () => {
      this.roverModalOpen = false;
      this.store.setPanel(this.store.panel === "sessions" ? "none" : "sessions");
      void this.actions.sessions?.refreshList();
    });
    document.getElementById("btn-export-json")!.addEventListener("click", () => {
      this.exportActiveSession("json");
    });
    document.getElementById("btn-export-md")!.addEventListener("click", () => {
      this.exportActiveSession("md");
    });
  }

  private exportActiveSession(format: "json" | "md"): void {
    const active = this.actions.sessions?.getActiveSession() ?? this.buildFallbackSessionSnapshot();
    if (format === "json") {
      downloadTextFile(`${active.id}.json`, exportSessionJson(active), "application/json");
    } else {
      downloadTextFile(`${active.id}.md`, exportSessionMarkdown(active), "text/markdown");
    }
  }

  private buildFallbackSessionSnapshot(): SavedChatSession {
    const now = Date.now();
    return {
      id: `sess-${now}`,
      title: "EVA session",
      lang: getLang(),
      scenario: this.store.activeScenario,
      createdAt: now,
      updatedAt: now,
      entries: this.store.transcripts
        .filter((tr) => tr.final)
        .map((tr, idx) => ({
          id: tr.id ?? `tx-${idx}`,
          who: tr.who,
          text: tr.text,
          ts: tr.ts,
          metS: tr.metS ?? Math.round(this.store.metS),
          ...(tr.route?.length ? { route: tr.route } : {}),
          ...(typeof tr.latencyMs === "number" ? { latencyMs: tr.latencyMs } : {}),
        })),
    };
  }

  renderDynamic(): void {
    const s = this.store;
    const suit = s.suit;
    const ll = this.terrain.toLonLat(s.astronaut.x, s.astronaut.z);
    const baseDist = Math.hypot(s.astronaut.x, s.astronaut.z);
    const metH = String(Math.floor(s.metS / 3600)).padStart(2, "0");
    const metM = String(Math.floor((s.metS % 3600) / 60)).padStart(2, "0");
    const metSec = String(Math.floor(s.metS % 60)).padStart(2, "0");

    // Top Mission Bar
    this.topEl.innerHTML = `
      <span style="font-weight:700;">${t("hud.title")}</span>
      <span>${t("hud.met")}: <b>${metH}:${metM}:${metSec}</b></span>
      <span>Sol ${s.env.sol} · ${fmt(s.env.ltst_hours, 2)}h</span>
      <span>${formatCoordinates(ll.lat, ll.lon)}</span>
      <span>${t("hud.dist_base")}: <b>${fmt(baseDist, 0)} m</b></span>
      <span class="pill ${s.remoteConnected ? "" : "warn"}">${s.remoteConnected ? t("remote.connected") : `ROOM ${s.remoteRoom || "---"}`}</span>
      ${s.lastAgentLatencyMs > 0 ? `<span class="pill">${s.lastAgentLatencyMs} ms</span>` : ""}
    `;

    // Left Panel: Suit Telemetry & Leak Countdown
    const o2Pct = (suit.o2_primary_kg / suit.o2_primary_cap_kg) * 100;
    const pKpa = suit.suit_pressure_pa / 1000;
    let suitLevel: AlertLevel = "ok";
    if (s.leakDiameterM > 0 || pKpa < 22 || o2Pct < 20) suitLevel = "crit";
    else if (s.fanDegraded || suit.co2_pa > 650 || o2Pct < 35) suitLevel = "warn";
    this.leftEl.dataset.level = suitLevel;

    let leakHtml = "";
    if (s.leakDiameterM > 0) {
      const tl = leakTimeline(suit.suit_pressure_pa, s.leakDiameterM);
      leakHtml = `
        <div class="alert-banner">
          <b>${t("hud.leak_timer")} (${(s.leakDiameterM * 1000).toFixed(1)} mm)</b><br/>
          ${t("hud.impaired")}: ${fmt(tl.toImpairedS, 0)} s ·
          ${t("hud.critical")}: ${fmt(tl.toCriticalS, 0)} s ·
          ${t("hud.armstrong")}: ${fmt(tl.toArmstrongS, 0)} s
        </div>
      `;
    }
    if (s.podTelemetry.active) {
      const pt = s.podTelemetry;
      leakHtml += `
        <div class="alert-banner" style="border-color:var(--warn); background:rgba(255,184,0,0.16);">
          <b>POD IN FLIGHT</b> (${fmt(pt.elapsedS, 1)} / ${fmt(pt.flightTimeS, 1)} s)<br/>
          Chute: ${pt.chuteDeployed ? "OPEN" : "BALLISTIC"} · Drift: ${fmt(pt.windDriftM, 1)} m<br/>
          1σ Ellipse: ${fmt(pt.ellipseAlongM, 1)}×${fmt(pt.ellipseCrossM, 1)} m
        </div>
      `;
    }

    this.leftEl.innerHTML = `
      <div class="panel-hdr"><span>${t("hud.life_support")}</span><span>${suitLevel.toUpperCase()}</span></div>
      <div class="kv-row"><span>${t("hud.o2_primary")}</span><span class="val">${fmt(o2Pct, 0)}% (${fmt(suit.o2_primary_kg, 2)} kg)</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, o2Pct)}%"></div></div>
      <div class="kv-row"><span>${t("hud.o2_reserve")}</span><span class="val">${fmt((suit.o2_reserve_kg / suit.o2_reserve_cap_kg) * 100, 0)}%</span></div>
      <div class="kv-row"><span>${t("hud.suit_pressure")}</span><span class="val">${fmt(pKpa, 1)} kPa</span></div>
      <div class="kv-row"><span>${t("hud.pao2")}</span><span class="val">${fmt(suit.pao2_pa / 1000, 1)} kPa</span></div>
      <div class="kv-row"><span>${t("hud.co2")}</span><span class="val">${fmt(suit.co2_pa, 0)} Pa</span></div>
      <div class="kv-row"><span>${t("hud.metabolic")}</span><span class="val">${fmt(suit.metabolic_w, 0)} W</span></div>
      <div class="kv-row"><span>${t("hud.fan")}</span><span class="val">${fmt(suit.fan_rpm, 0)} RPM</span></div>
      <div class="kv-row"><span>${t("hud.battery")}</span><span class="val">${fmt(suit.battery_wh, 0)} Wh</span></div>
      <div class="kv-row"><span>${t("hud.coolant")}</span><span class="val">${fmt(suit.coolant_l, 2)} L</span></div>
      ${leakHtml}
    `;

    // Right Panel: Environment, Storm, RAD & Alerts
    const solarPct = s.solarTransmission * 100;
    let envLevel: AlertLevel = "ok";
    if (s.env.tau > 3.5 || s.env.dose_rate_ugy_h > 80) envLevel = "crit";
    else if (s.env.tau > 1.5 || s.env.dose_rate_ugy_h > 25) envLevel = "warn";
    this.rightEl.dataset.level = envLevel;

    const latestAlerts = s.alerts
      .slice(0, 3)
      .map(
        (a) =>
          `<div style="font-size:10px; margin-top:4px; color:${a.level === "crit" ? "#ff6884" : a.level === "warn" ? "#ffd166" : "#9be8ff"}">• ${a.text}</div>`,
      )
      .join("");

    this.rightEl.innerHTML = `
      <div class="panel-hdr"><span>${t("hud.environment")}</span><span>${s.activeScenario.toUpperCase()}</span></div>
      <div class="kv-row"><span>${t("hud.atm_pressure")}</span><span class="val">${fmt(s.env.pressure_pa, 0)} Pa</span></div>
      <div class="kv-row"><span>${t("hud.air_temp")}</span><span class="val">${fmt(s.env.air_temp_k - 273.15, 0)} / ${fmt(s.env.ground_temp_k - 273.15, 0)} C</span></div>
      <div class="kv-row"><span>${t("hud.opacity")}</span><span class="val">${fmt(s.env.tau, 2)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, (s.env.tau / 8) * 100)}%; background:var(--warn);"></div></div>
      <div class="kv-row"><span>${t("hud.solar_power")}</span><span class="val">${fmt(solarPct, 0)}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${solarPct}%; background:var(--good);"></div></div>
      <div class="kv-row"><span>${t("hud.wind")}</span><span class="val">${fmt(s.env.wind_ms, 1)} m/s</span></div>
      <div class="kv-row"><span>${t("hud.dose_rate")}</span><span class="val">${fmt(s.env.dose_rate_ugy_h, 1)} uGy/h</span></div>
      <div class="kv-row"><span>${t("hud.cum_dose")}</span><span class="val">${fmt(suit.cumulative_dose_ugy, 2)} uGy</span></div>
      <div style="font-size:10px; opacity:0.75; margin-top:4px;">${s.env.storm_source}<br>${s.env.rad_source}<br>Terrain: ${this.terrain.meta.product_id}; derived display layers are design approximations.</div>
      ${latestAlerts}
    `;

    // Bottom live controls
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-layer]").forEach((b) => {
      b.classList.toggle("active", b.dataset.layer === s.layer);
    });
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((b) => {
      b.classList.toggle("active", b.dataset.panel === s.panel);
    });
    const povBtn = document.getElementById("btn-pov");
    if (povBtn) povBtn.textContent = s.povMode === "1st" ? t("hud.pov_1st") : t("hud.pov_3rd");
    const pttBtn = document.getElementById("btn-ptt");
    if (pttBtn) pttBtn.classList.toggle("listening", s.micListening);
    const procBadge = document.getElementById("base-proc-badge");
    if (procBadge) procBadge.style.display = s.baseProcessing ? "inline-block" : "none";

    const sessionMeta = document.getElementById("comms-session-meta");
    if (sessionMeta) {
      const active = this.actions.sessions?.getActiveSession();
      if (active) {
        const countLabel = t("comms.entries", { n: active.entries.length });
        sessionMeta.textContent = `${active.title} · ${active.lang.toUpperCase()} · ${countLabel}`;
      } else {
        sessionMeta.textContent = "";
      }
    }

    const txBox = document.getElementById("transcript-box");
    if (txBox) {
      txBox.innerHTML = s.transcripts
        .slice(-4)
        .map(
          (tr) =>
            `<div><b style="color:${tr.who === "you" ? "#ffb800" : "#35e0ff"}">${tr.who.toUpperCase()}:</b> ${escapeHtml(tr.text)}</div>`,
        )
        .join("");
      txBox.scrollTop = txBox.scrollHeight;
    }

    const qrSt = document.getElementById("qr-status");
    if (qrSt) {
      qrSt.textContent = s.remoteConnected ? t("remote.connected") : `${t("remote.waiting")} (${s.remoteRoom})`;
      qrSt.className = `pill ${s.remoteConnected ? "" : "warn"}`;
    }

    this.renderModal();
  }

  private renderVotingCard(tr: TraceEvent, s: MissionStore): string {
    const v = (tr.detail ?? {}) as Partial<VotingTraceDetail>;
    const finalDec = v.finalDecision ?? "ask_human";
    const decLabel =
      finalDec === "allow"
        ? t("agents.vote_allow")
        : finalDec === "deny"
          ? t("agents.vote_deny")
          : t("agents.vote_ask_human");
    const tally = v.tally ?? { allow: 0, deny: 0, ask_human: 0, valid: 0 };
    const votersHtml = (v.voters ?? [])
      .map((voter) => {
        const badgeCls = voter.status === "ok" && voter.vote ? voter.vote : "err";
        const badgeText =
          voter.status === "ok" && voter.vote
            ? voter.vote === "allow"
              ? t("agents.vote_allow")
              : voter.vote === "deny"
                ? t("agents.vote_deny")
                : t("agents.vote_ask_human")
            : voter.status.toUpperCase();
        const conf = voter.confidence !== null && voter.confidence !== undefined ? `${Math.round(voter.confidence * 100)}%` : "--";
        const detailText = voter.rationale || voter.error || "";
        return `
          <div class="esc-voter-row">
            <span class="esc-voter-id"><b>${escapeHtml(voter.voter)}</b> · ${escapeHtml(voter.model)} (${escapeHtml(voter.provider)})</span>
            <span class="esc-vote-pill ${badgeCls}">${escapeHtml(badgeText)} ${conf} · ${voter.latency_ms} ms</span>
            ${detailText ? `<div class="esc-voter-rationale">${escapeHtml(detailText)}</div>` : ""}
          </div>
        `;
      })
      .join("");

    let controlsHtml = "";
    if (finalDec === "ask_human") {
      const pendingIdx = v.actionType ? s.findPendingActionIndex(v.actionType) : -1;
      controlsHtml =
        pendingIdx !== -1
          ? `
            <div class="btn-row" style="margin-top:6px;">
              <button class="hud-btn" data-pointable data-confirm="${pendingIdx}">${t("agents.confirm")}</button>
              <button class="hud-btn danger" data-pointable data-cancel="${pendingIdx}">${t("agents.cancel")}</button>
            </div>
          `
          : `<div class="esc-vote-resolved">${t("agents.resolved")}</div>`;
    }

    return `
      <div class="esc-vote-card vote-${finalDec}">
        <div class="esc-vote-hdr">
          <span><b>${t("agents.esc_vote")}</b> · ${escapeHtml(v.actionType ?? "")}</span>
          <span class="esc-vote-pill ${finalDec}">${escapeHtml(decLabel)}</span>
        </div>
        <div class="esc-vote-meta">
          <span>${escapeHtml(v.consensus ?? "")} (${tally.allow}A/${tally.deny}D/${tally.ask_human}H)</span>
          <span>${v.latency_ms ?? 0} ms</span>
        </div>
        ${v.triggers?.length ? `<div class="esc-vote-triggers">Triggers: ${escapeHtml(v.triggers.join(", "))}</div>` : ""}
        ${votersHtml}
        ${controlsHtml}
      </div>
    `;
  }

  private renderModal(): void {
    const s = this.store;
    if (this.roverModalOpen) {
      this.lastModalPanel = "none";
      this.modalEl.style.display = "block";
      this.modalEl.innerHTML = `
        <div class="panel-hdr">
          <span>RVR-2 / MANIP-1 VISION FEED (POST /api/agent/vision)</span>
          <button class="hud-btn" data-pointable id="modal-close">X</button>
        </div>
        ${s.injectionBlockedBanner ? `<div class="alert-banner"><b>${t("agents.injection_blocked")}</b></div>` : ""}
        <div style="margin:8px 0; text-align:center;">
          ${s.roverPreviewUrl ? `<img src="${s.roverPreviewUrl}" style="width:100%; max-width:480px; border-radius:8px; border:1px solid var(--border);" />` : "Capturing frame..."}
        </div>
        <div style="font-size:12px; color:#fff; margin-bottom:8px;">${s.roverPreviewCaption}</div>
        <div class="btn-row">
          <button class="hud-btn" data-pointable id="rvr-snap-2">Capture RVR-2 Sign</button>
          <button class="hud-btn" data-pointable id="rvr-snap-m">Capture MANIP-1 Targets</button>
        </div>
      `;
      this.modalEl.querySelector("#modal-close")!.addEventListener("click", () => {
        this.roverModalOpen = false;
        this.renderModal();
      });
      this.modalEl.querySelector("#rvr-snap-2")!.addEventListener("click", () =>
        this.actions.captureRoverVision("rover-2", t("deck.say.8")),
      );
      this.modalEl.querySelector("#rvr-snap-m")!.addEventListener("click", () =>
        this.actions.captureRoverVision("manip-1", "Identify numbered rock targets T1, T2, T3"),
      );
      return;
    }

    if (s.panel === "none") {
      this.lastModalPanel = "none";
      this.modalEl.style.display = "none";
      return;
    }

    this.modalEl.style.display = "block";
    const closeHdr = (title: string) => `
      <div class="panel-hdr">
        <span>${title}</span>
        <button class="hud-btn" data-pointable id="modal-close">X</button>
      </div>
    `;

    if (s.panel === "agents") {
      const pendingHtml = s.pendingActions
        .map(
          (a, idx) => `
          <div class="alert-banner" style="border-color:var(--warn);">
            <b>GUARDIAN ask_human:</b> ${a.type} ${JSON.stringify(a.args)}<br/>
            <i>${a.verdict?.reason ?? ""}</i>
            <div class="btn-row" style="margin-top:6px;">
              <button class="hud-btn" data-pointable data-confirm="${idx}">${t("agents.confirm")}</button>
              <button class="hud-btn danger" data-pointable data-cancel="${idx}">${t("agents.cancel")}</button>
            </div>
          </div>
        `,
        )
        .join("");

      const traceHtml = s.trace
        .map((tr) => {
          if (tr.kind === "voting") {
            return this.renderVotingCard(tr, s);
          }
          let cls = "trace-item";
          let summary = escapeHtml(JSON.stringify(tr.detail));
          if (tr.kind === "verdict") {
            const act = tr.detail as { type?: string; verdict?: { decision?: string; reason?: string } };
            const dec = act?.verdict?.decision ?? "allow";
            cls += ` verdict-${dec}`;
            summary = `${escapeHtml(String(act.type ?? ""))} -> <b>${escapeHtml(dec.toUpperCase())}</b> (${escapeHtml(act.verdict?.reason ?? "")})`;
          }
          return `<div class="${cls}"><b>${escapeHtml(tr.agent)}</b> [${escapeHtml(tr.kind)}]: ${summary}</div>`;
        })
        .join("");

      this.modalEl.innerHTML = `
        ${closeHdr(t("agents.title"))}
        <div class="btn-row" style="margin-bottom:8px;">
          <span>Route: <b>${s.routePath.join(" -> ") || "idle"}</b></span>
          <button class="hud-btn ${s.earthLinkDelay ? "active" : ""}" data-pointable id="btn-earth-delay">
            ${t("agents.earth_link")}: ${s.earthLinkDelay ? `${s.env.earth_light_time_s * 2}s RTT [design]` : "LOCAL"}
          </button>
        </div>
        ${pendingHtml}
        <div>${traceHtml || "<i>No agent trace yet. Speak or press keys 1-8.</i>"}</div>
      `;
      this.modalEl.querySelector("#btn-earth-delay")!.addEventListener("click", () => {
        s.earthLinkDelay = !s.earthLinkDelay;
        s.notify();
      });
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-confirm]").forEach((b) =>
        b.addEventListener("click", () => s.confirmPendingAction(Number(b.dataset.confirm), true)),
      );
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-cancel]").forEach((b) =>
        b.addEventListener("click", () => s.confirmPendingAction(Number(b.dataset.cancel), false)),
      );
    } else if (s.panel === "fleet") {
      const rows = s.fleet
        .map(
          (u) => `
          <tr>
            <td><b>${u.id}</b></td>
            <td>${u.kind}</td>
            <td>(${fmt(u.x, 0)}, ${fmt(u.z, 0)})</td>
            <td>${fmt(u.battery * 100, 0)}%</td>
            <td>${u.task ?? "idle"}</td>
          </tr>
        `,
        )
        .join("");
      this.modalEl.innerHTML = `
        ${closeHdr("FLEET & MANIP-1 4-DOF IK")}
        <table class="prov-tbl">
          <thead><tr><th>ID</th><th>Kind</th><th>XZ (m)</th><th>Bat</th><th>Task</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="panel-hdr" style="margin-top:10px;"><span>${t("manip.title")}</span></div>
        <div class="btn-row">
          <button class="hud-btn" data-pointable data-skill="drill" data-tgt="T1">Drill Vein (T1)</button>
          <button class="hud-btn" data-pointable data-skill="sample" data-tgt="T3">Scoop Soil (T3)</button>
          <button class="hud-btn" data-pointable data-skill="photograph" data-tgt="T2">Photo Rock (T2)</button>
          <button class="hud-btn" data-pointable data-skill="handover" data-tgt="astronaut">Handover Tool</button>
        </div>
      `;
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-skill]").forEach((b) =>
        b.addEventListener("click", () =>
          this.actions.runManipSkill(b.dataset.skill as ArmSkillId, b.dataset.tgt!),
        ),
      );
    } else if (s.panel === "map") {
      this.modalEl.innerHTML = `
        ${closeHdr("GALE CRATER TACTICAL MAP")}
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <canvas id="minimap-canvas" width="260" height="260" style="border:1px solid var(--border); border-radius:6px;"></canvas>
          <div style="font-size:11px;">
            <div>Layer: <b>${s.layer}</b></div>
            <div>Grid: 4000×4000 m</div>
            <div>Cyan dot: Astronaut</div>
            <div>Amber dots: Fleet units</div>
            <div>Red ring: 15 m Pod Keep-out</div>
            ${s.activeRoute ? `<div style="margin-top:8px;"><b>Active Route (${s.activeRoute.algorithm})</b><br/>Dist: ${fmt(s.activeRoute.distanceM, 0)} m<br/>Time: ${fmt(s.activeRoute.timeS / 60, 1)} min<br/>O2: ${fmt(s.activeRoute.o2Kg * 1000, 0)} g</div>` : ""}
          </div>
        </div>
      `;
      this.drawMinimap(document.getElementById("minimap-canvas") as HTMLCanvasElement);
    } else if (s.panel === "base") {
      const mod = BASE_MODULES.find((m) => m.id === s.selectedBaseModuleId) ?? BASE_MODULES[0];
      const solarKw = 18 * s.solarTransmission;
      const fissionKw = 40;
      const totalGen = solarKw + fissionKw;
      const loadKw = 36;
      const modButtons = BASE_MODULES.map(
        (m) => `<button class="hud-btn ${m.id === mod.id ? "active" : ""}" data-pointable data-bmod="${m.id}">${m.id}</button>`,
      ).join("");
      const specsHtml = mod.specs
        .map(
          (sp) =>
            `<tr><td>${sp.key}</td><td><b>${sp.value}</b></td><td>${sp.source}${sp.assumption ? ` (${t("prov.assumption")})` : ""}</td></tr>`,
        )
        .join("");

      this.modalEl.innerHTML = `
        ${closeHdr(`BASE MODULE: ${mod.name.toUpperCase()}`)}
        <div class="btn-row" style="margin-bottom:8px;">${modButtons}</div>
        <table class="prov-tbl"><tbody>${specsHtml}</tbody></table>
        <div class="panel-hdr" style="margin-top:10px;"><span>RESOURCE BALANCE</span></div>
        <div class="kv-row"><span>Solar + Fission Gen</span><span class="val">${fmt(totalGen, 1)} kWe (Load ${loadKw} kWe)</span></div>
        <div class="kv-row"><span>O2 Reserve / ISRU</span><span class="val">45 days + 2.4 kg/h MOXIE-scaled</span></div>
      `;
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-bmod]").forEach((b) =>
        b.addEventListener("click", () => {
          s.selectedBaseModuleId = b.dataset.bmod!;
          this.renderModal();
        }),
      );
    } else if (s.panel === "health") {
      this.modalEl.innerHTML = `
        ${closeHdr("SUIT HEALTH & NASA-STD-3001 LIMITS")}
        <table class="prov-tbl">
          <tr><td>Nominal Suit Pressure</td><td>29.6 kPa (4.3 psi)</td><td>NASA Exploration EVA</td></tr>
          <tr><td>PAO2 Impaired / Critical</td><td>8.0 kPa / 4.0 kPa</td><td>Design physiological thresholds</td></tr>
          <tr><td>Armstrong Limit</td><td>6.27 kPa</td><td>Water vapor at 37 C</td></tr>
          <tr><td>CO2 Partial Pressure</td><td>&lt; 667 Pa nominal</td><td>NASA-STD-3001 Vol. 2</td></tr>
          <tr><td>Career Radiation Limit</td><td>600 mSv</td><td>NASA-STD-3001 Vol. 1</td></tr>
        </table>
      `;
    } else if (s.panel === "provenance") {
      const rows = Object.entries(C)
        .map(
          ([k, c]) =>
            `<tr><td>${k}</td><td>${c.value} ${c.unit}</td><td>${c.source}${("assumption" in c && c.assumption) ? " [Design assumption]" : ""}</td></tr>`,
        )
        .join("");
      this.modalEl.innerHTML = `
        ${closeHdr("DATA & PHYSICS PROVENANCE")}
        <div style="margin-bottom:6px;">Terrain DEM: <b>${this.terrain.meta.product_id}</b></div>
        <table class="prov-tbl">
          <thead><tr><th>Constant</th><th>Value</th><th>${t("prov.source")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } else if (s.panel === "sessions") {
      const mgr = this.actions.sessions;
      const active = mgr?.getActiveSession() ?? this.buildFallbackSessionSnapshot();
      const saved = mgr?.getSessionsSnapshot() ?? [];
      const activeLang = getLang();
      const renderKey = [
        activeLang,
        active.id,
        active.updatedAt,
        active.entries.length,
        saved.map((item) => `${item.id}:${item.updatedAt}:${item.entries.length}`).join(","),
      ].join("|");

      if (this.lastModalPanel === "sessions" && this.sessionsRenderKey === renderKey) {
        return;
      }
      this.sessionsRenderKey = renderKey;
      this.lastModalPanel = "sessions";

      const langMismatchBanner =
        active.entries.length > 0 && active.lang !== activeLang
          ? `<div class="alert-banner" style="border-color:var(--warn); background:rgba(255,184,0,0.14); margin-bottom:8px;">${escapeHtml(t("comms.lang_mismatch", { lang: active.lang.toUpperCase() }))}</div>`
          : "";

      const entriesHtml =
        active.entries.length === 0
          ? `<div style="opacity:0.75;">${escapeHtml(t("comms.transcript_empty"))}</div>`
          : active.entries
              .map((e) => {
                const badges: string[] = [`MET ${Math.round(e.metS)}s`];
                if (e.route?.length) badges.push(escapeHtml(e.route.join("->")));
                if (typeof e.latencyMs === "number") badges.push(`${Math.round(e.latencyMs)} ms`);
                return `
                  <div class="session-entry-row">
                    <div>
                      <b style="color:${e.who === "you" ? "#ffb800" : "#35e0ff"}">${e.who.toUpperCase()}</b>
                      <span style="opacity:0.7; font-size:10px; margin-left:6px;">${badges.join(" · ")}</span>
                    </div>
                    <div>${escapeHtml(e.text)}</div>
                  </div>
                `;
              })
              .join("");

      const savedHtml =
        saved.length === 0
          ? `<div style="opacity:0.75; font-size:11px;">${escapeHtml(t("comms.empty"))}</div>`
          : saved
              .map((sess) => {
                const isActive = sess.id === active.id;
                const dateStr = new Date(sess.updatedAt).toLocaleString(ASR_LOCALE[activeLang]);
                return `
                  <div class="session-card ${isActive ? "active" : ""}">
                    <div>
                      <div style="font-weight:700; color:#fff;">${escapeHtml(sess.title)}</div>
                      <div class="session-card-meta">
                        ${isActive ? `<span class="pill">${escapeHtml(t("comms.active"))}</span>` : ""}
                        <span class="pill">${escapeHtml(sess.scenario.toUpperCase())}</span>
                        <span class="pill">${escapeHtml(sess.lang.toUpperCase())}</span>
                        <span>${escapeHtml(t("comms.entries", { n: sess.entries.length }))}</span>
                        <span>· ${escapeHtml(dateStr)}</span>
                      </div>
                    </div>
                    <div class="btn-row">
                      <button class="hud-btn" data-pointable data-load-session="${escapeHtml(sess.id)}">${escapeHtml(t("comms.load"))}</button>
                      <button class="hud-btn danger" data-pointable data-del-session="${escapeHtml(sess.id)}">${escapeHtml(t("comms.delete"))}</button>
                    </div>
                  </div>
                `;
              })
              .join("");

      this.modalEl.innerHTML = `
        ${closeHdr(t("comms.title"))}
        <div class="btn-row" style="justify-content:space-between; margin-bottom:8px;">
          <div>
            <b>${escapeHtml(active.title)}</b>
            <span class="pill" style="margin-left:6px;">${escapeHtml(active.scenario.toUpperCase())}</span>
            <span class="pill">${escapeHtml(active.lang.toUpperCase())}</span>
          </div>
          <div class="btn-row">
            <button class="hud-btn" data-pointable id="modal-session-new">${escapeHtml(t("comms.new_session"))}</button>
            <button class="hud-btn" data-pointable id="modal-export-json">${escapeHtml(t("comms.export_json"))}</button>
            <button class="hud-btn" data-pointable id="modal-export-md">${escapeHtml(t("comms.export_md"))}</button>
          </div>
        </div>
        ${langMismatchBanner}
        <div class="session-entries">${entriesHtml}</div>
        <div class="panel-hdr"><span>${escapeHtml(t("comms.saved_sessions", { n: saved.length }))}</span></div>
        <div class="session-list">${savedHtml}</div>
      `;

      this.modalEl.querySelector("#modal-session-new")?.addEventListener("click", () => {
        this.actions.sessions?.newSession();
      });
      this.modalEl.querySelector("#modal-export-json")?.addEventListener("click", () => {
        this.exportActiveSession("json");
      });
      this.modalEl.querySelector("#modal-export-md")?.addEventListener("click", () => {
        this.exportActiveSession("md");
      });
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-load-session]").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.dataset.loadSession;
          if (id) void this.actions.sessions?.loadSession(id);
        });
      });
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-del-session]").forEach((b) => {
        b.addEventListener("click", () => {
          const id = b.dataset.delSession;
          if (id) void this.actions.sessions?.deleteSession(id);
        });
      });
    }

    if (s.panel !== "sessions") {
      this.lastModalPanel = s.panel;
    }

    this.modalEl.querySelector("#modal-close")?.addEventListener("click", () => s.setPanel("none"));
  }

  private drawMinimap(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const tex = this.terrain.getLayerTexture(this.store.layer);
    const data = tex.image.data as Uint8Array;
    const n = this.terrain.gridN;
    const img = ctx.createImageData(n, n);
    img.data.set(data);
    const tmp = document.createElement("canvas");
    tmp.width = n;
    tmp.height = n;
    tmp.getContext("2d")!.putImageData(img, 0, 0);
    ctx.drawImage(tmp, 0, 0, w, h);

    const toPx = (wx: number, wz: number) => ({
      x: ((wx / this.terrain.sizeM) + 0.5) * w,
      y: ((wz / this.terrain.sizeM) + 0.5) * h,
    });

    // Active route
    if (this.store.activeRoute && this.store.activeRoute.points.length > 1) {
      ctx.strokeStyle = "#35e0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.store.activeRoute.points.forEach((p, idx) => {
        const pt = toPx(p.x, p.z);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    // Fleet
    for (const u of this.store.fleet) {
      const pt = toPx(u.x, u.z);
      ctx.fillStyle = "#ffb800";
      ctx.fillRect(pt.x - 2, pt.y - 2, 5, 5);
    }

    // Astronaut
    const ap = toPx(this.store.astronaut.x, this.store.astronaut.z);
    ctx.fillStyle = "#35e0ff";
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
