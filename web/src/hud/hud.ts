import { BASE_ORIGIN } from "@th/shared";
import { CartographyRenderer, MAP_HEIGHT, MAP_WIDTH } from "./cartography";
import { formatCoordinates } from "../world/terrainValidation";
import { estimateCassonTwin } from "../world/cassonTwin";
import { ASR_LOCALE, fmt, getLang, LANGS, onLangChange, setLang, t } from "@th/shared";
import { C, leakTimeline } from "@th/shared";
import type { AlertLevel, ArmSkillId, LayerId, PanelId, TraceEvent, VotingTraceDetail } from "@th/shared";
import {
  categorizeProvenanceKey,
  fetchProvenanceManifest,
  formatProvenanceUrl,
  type ProvenanceCategory,
  type ProvenanceManifest,
} from "../data/provenance";
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
import { crewDistanceM } from "../world/crewTracker";
import {
  buildChartModel,
  drawStormChart,
  fetchStormForecast,
  stormVerdict,
  type StormForecastData,
} from "./stormForecast";
import { barHeight } from "../voice/spectrum";
import { VeinDetector } from "./veinDetector";

export interface HudActions {
  togglePov(): void;
  toggleIso(): void;
  setCinematic(id: number): void;
  setLayer(layer: LayerId): void;
  runManipSkill(skill: ArmSkillId, targetId: string): void;
  captureRoverVision(unitId: string, question: string): void;
  getQrCanvas(): HTMLCanvasElement;
  getQrUrlEl(): HTMLElement;
  recenterRemote(): void;
  setRemoteInvert(invX: boolean, invY: boolean): void;
  onToggleDeck(): void;
  startScenario?(id: "storm" | "sep2017" | "leak" | "rescue"): void;
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

function scenarioLabel(value: string): string {
  const keys: Record<string, string> = { none: "scenario.none", storm: "deck.5.label", sep2017: "deck.6.label", leak: "scenario.leak", rescue: "scenario.rescue" };
  return keys[value] ? t(keys[value]) : value;
}

function speakerLabel(value: string): string {
  const keys: Record<string, string> = { you: "voice.you", base: "voice.base", system: "common.system" };
  return keys[value] ? t(keys[value]) : value;
}

function taskLabel(value: string | null | undefined): string {
  const keys: Record<string, string> = { goto: "task.goto", rescue: "task.rescue", takeoff: "task.takeoff", land: "task.land", photograph: "task.photograph", overwatch: "task.overwatch", follow: "task.follow", return: "task.return", deliver: "task.deliver", survey: "task.survey", hold: "task.hold", relay: "task.relay" };
  return value ? (keys[value] ? t(keys[value]) : value) : t("common.idle");
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
  private mapCanvas: HTMLCanvasElement | null = null;
  private cartography: CartographyRenderer | null = null;
  private leftEl: HTMLElement;
  private rightEl: HTMLElement;
  private crewEl: HTMLElement;
  private topEl: HTMLElement;
  private bottomEl: HTMLElement;
  private confirmEl: HTMLElement;
  private voiceInput!: HTMLInputElement;
  private invX = false;
  private invY = false;
  private lastModalPanel: PanelId = "none";
  private lastConfirmKey = "";
  private sessionsRenderKey = "";
  private provenanceRenderKey = "";
  private provenanceState: "idle" | "loading" | "ready" | "error" = "idle";
  private provenanceData: ProvenanceManifest | null = null;
  private provenanceError = "";
  private veinDetector = new VeinDetector();
  private stormData: StormForecastData | null = null;
  private crewKey = "";
  private stormState: "loading" | "ready" | "error" = "loading";

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
      <button id="hud-restore-pill" data-pointable style="display:none">${t("hud.restore")}</button>
      <div id="hud-top" class="hud-panel hud-top"></div>
      <div id="hud-confirm" class="hud-panel hud-confirm" data-level="warn" style="display:none"></div>
      <div id="hud-left" class="hud-panel hud-left"></div>
      <div id="hud-right" class="hud-panel hud-right"></div>
      <div id="hud-crew" class="hud-panel hud-crew"></div>
      <div id="hud-modal" class="hud-panel hud-modal" style="display:none"></div>
      <div id="hud-qr" class="hud-panel hud-modal" style="display:none; width:300px; text-align:center;"></div>
      <div id="hud-bottom" class="hud-panel hud-bottom"></div>
    `;

    this.topEl = document.getElementById("hud-top")!;
    this.confirmEl = document.getElementById("hud-confirm")!;
    this.leftEl = document.getElementById("hud-left")!;
    this.rightEl = document.getElementById("hud-right")!;
    this.crewEl = document.getElementById("hud-crew")!;
    this.modalEl = document.getElementById("hud-modal")!;
    this.qrContainer = document.getElementById("hud-qr")!;
    this.bottomEl = document.getElementById("hud-bottom")!;
    document.getElementById("hud-restore-pill")?.addEventListener("click", () => {
      this.store.setHudVisible(true);
    });

    this.qrCanvas = document.createElement("canvas");
    this.qrUrlEl = document.createElement("div");
    this.qrUrlEl.style.cssText = "font-size:10px; word-break:break-all; margin:6px 0; color:#e8c9a8;";
    this.buildQrContainer();
    this.buildBottomStatic();

    void fetchStormForecast().then((data) => {
      this.stormData = data;
      this.stormState = data ? "ready" : "error";
      this.renderDynamic();
    });
    this.startFft();
    this.store.subscribe(() => this.renderDynamic());
    this.actions.sessions?.subscribe(() => {
      this.sessionsRenderKey = "";
      this.renderDynamic();
    });
    onLangChange(() => {
      this.sessionsRenderKey = "";
      this.provenanceRenderKey = "";
      this.lastConfirmKey = "";
      this.buildQrContainer();
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

  private startFft(): void {
    const bins = new Uint8Array(32);
    const loop = () => {
      requestAnimationFrame(loop);
      const cv = document.getElementById("voice-fft") as HTMLCanvasElement | null;
      if (!cv || !this.store.hudVisible) return;
      const g = cv.getContext("2d");
      if (!g) return;
      const live = this.voice.radio.getSpectrum(bins);
      const color = getComputedStyle(cv).getPropertyValue("--ok").trim() || "#e8a33d";
      const w = cv.width / bins.length;
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = color;
      for (let i = 0; i < bins.length; i++) {
        const h = barHeight(live ? bins[i] : 0, cv.height);
        g.fillRect(i * w + 1, cv.height - h, w - 2, h);
      }
    };
    requestAnimationFrame(loop);
  }

  private buildBottomStatic(): void {
    const langBtns = LANGS.map(
      (l) =>
        `<button class="hud-btn ${getLang() === l ? "active" : ""}" data-pointable data-lang="${l}">${l.toUpperCase()}</button>`,
    ).join("");

    const menuItems: { panel: PanelId; key: string }[] = [
      { panel: "map", key: "menu.map" },
      { panel: "fleet", key: "menu.fleet" },
      { panel: "agents", key: "menu.agents" },
      { panel: "health", key: "menu.health" },
      { panel: "base", key: "menu.base" },
      { panel: "provenance", key: "menu.provenance" },
      { panel: "sessions", key: "menu.sessions" },
      { panel: "casson", key: "menu.casson" },
      { panel: "veins", key: "veins.title" },
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
          <button class="hud-btn" data-pointable data-panel="menu">${t("menu.open")}</button>
          ${menuHtml}
          <button class="hud-btn" data-pointable id="btn-rover-cam">${t("menu.rover_cam")}</button>
          <button class="hud-btn" data-pointable id="btn-qr">${t("menu.remote")}</button>
          <button class="hud-btn" data-pointable id="btn-pov">${this.store.povMode === "1st" ? t("hud.pov_1st") : this.store.povMode === "3rd" ? t("hud.pov_3rd") : this.store.povMode === "cinematic" ? t("hud.pov_cinematic") : t("hud.pov_iso")}</button>
          <button class="hud-btn ${this.store.povMode === "iso" ? "active" : ""}" data-pointable id="btn-iso" title="${t("hud.iso_hint")}">${t("hud.btn_iso")}</button>
          ${[1, 2, 3, 4, 5].map((n) => `<button class="hud-btn" data-pointable data-cam="${n}" title="${t("hud.cam_hint")}">CAM-${n}</button>`).join("")}
          <button class="hud-btn" data-pointable id="btn-hud-toggle" title="${t("hud.visibility_hint")}">HUD</button>
        </div>
        <div class="btn-row">
          <span style="opacity:0.75; font-size:10px;">${t("hud.layers")}:</span>
          ${layerHtml}
          <button class="hud-btn ${this.terrain.hydrationUncMode ? "active" : ""}" data-pointable id="btn-hyd-unc" style="display:${this.store.layer === "hydration" ? "inline-block" : "none"};">${t("hud.layer.hydration_unc")}</button>
          <span style="margin-left:4px;">${langBtns}</span>
        </div>
      </div>

      <div class="voice-row">
        <button class="hud-btn" data-pointable id="btn-ptt">${t("voice.ptt")}</button>
        <button class="hud-btn" data-pointable id="btn-wake">${t("voice.wake")}</button>
        <button class="hud-btn ${this.voice.radio.radioEffect ? "active" : ""}" data-pointable id="btn-radio">${t("voice.radio")}</button>
        <input id="voice-input" type="text" placeholder="${t("voice.placeholder")}" />
        <button class="hud-btn" data-pointable id="btn-send">${t("voice.send")}</button>
        <canvas id="voice-fft" class="voice-fft" width="200" height="28"></canvas>
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
    document.getElementById("btn-hyd-unc")?.addEventListener("click", () => {
      this.terrain.setHydrationUncMode(!this.terrain.hydrationUncMode);
      this.store.notify();
    });
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-deck]").forEach((b) => {
      b.addEventListener("click", () => {
        const item = this.deck.find((d) => d.key === b.dataset.deck);
        item?.run();
      });
    });

    document.getElementById("btn-pov")!.addEventListener("click", () => this.actions.togglePov());
    document.getElementById("btn-iso")!.addEventListener("click", () => this.actions.toggleIso());
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-cam]").forEach((b) =>
      b.addEventListener("click", () => this.actions.setCinematic(Number(b.dataset.cam))),
    );
    document.getElementById("btn-hud-toggle")?.addEventListener("click", () => {
      this.store.setHudVisible(!this.store.hudVisible);
    });
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
      title: t("comms.default_title"),
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
    const baseDist = Math.hypot(s.astronaut.x - BASE_ORIGIN.x, s.astronaut.z - BASE_ORIGIN.z);
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
      <span class="pill ${s.remoteConnected ? "" : "warn"}">${s.remoteConnected ? t("remote.connected") : t("hud.room", { room: s.remoteRoom || "---" })}</span>
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
          <b>${t("pod.flight")}</b> (${fmt(pt.elapsedS, 1)} / ${fmt(pt.flightTimeS, 1)} s)<br/>
          ${t("pod.chute")}: ${pt.chuteDeployed ? t("pod.open") : t("pod.ballistic")} · ${t("pod.drift")}: ${fmt(pt.windDriftM, 1)} m<br/>
          ${t("pod.ellipse")}: ${fmt(pt.ellipseAlongM, 1)}×${fmt(pt.ellipseCrossM, 1)} m
        </div>
      `;
    }

    this.leftEl.innerHTML = `
      <div class="panel-hdr"><span>${t("hud.life_support")}</span><span>${t(`hud.status.${suitLevel}`)}</span></div>
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
          `<div style="font-size:10px; margin-top:4px; color:${a.level === "crit" ? "#ff6884" : a.level === "warn" ? "#ffd166" : "#e8c9a8"}">• ${a.text}</div>`,
      )
      .join("");

    const hydVal = this.terrain.hydrationAt(s.astronaut.x, s.astronaut.z);
    const hydUnc = this.terrain.hydrationUncAt(s.astronaut.x, s.astronaut.z);
    const hydMeta = this.terrain.hydrationMeta;
    const hydValBlock =
      s.layer === "hydration"
        ? `
          <div class="kv-row" style="margin-top:4px; border-top:1px solid rgba(255,255,255,0.12); padding-top:4px;">
            <span>${t("hud.hydration_index")}</span>
            <span class="val">${fmt(hydVal, 2)} ± ${fmt(hydUnc, 2)}</span>
          </div>
          <div style="font-size:10px; opacity:0.8;">
            ${this.terrain.hydrationUncMode ? `${t("hud.hydration_unc")}: 0.00–${fmt(hydMeta.interval_width_max, 2)}` : `${t("common.range")}: ${fmt(hydMeta.weh_min, 2)}–${fmt(hydMeta.weh_max, 2)}`} · ${t("hud.dan_stations")}: ${this.terrain.danPoints.length}
            ${hydMeta.validation?.r2_blocked_cv !== undefined && hydMeta.validation?.spearman_blocked_cv !== undefined ? `<br>CV: R²=${fmt(hydMeta.validation.r2_blocked_cv, 2)}, ρ=${fmt(hydMeta.validation.spearman_blocked_cv, 2)} (n=${hydMeta.validation.n_points ?? 0})` : ""}
            <br>${escapeHtml(t("hud.hydration_note"))}
          </div>
        `
        : "";
    const terrainProvenanceLine = this.terrain.realRastersLoaded
      ? `${t("prov.terrain")}: ${escapeHtml(this.terrain.meta.product_id)} · ${t("prov.layers")}: HiRISE/THEMIS/DAN (${t("prov.points", { n: this.terrain.danPoints.length })})`
      : `${t("prov.terrain")}: ${escapeHtml(this.terrain.meta.product_id)}; ${t("prov.derived")}`;

    this.rightEl.innerHTML = `
      <div class="panel-hdr"><span>${t("hud.environment")}</span><span>${scenarioLabel(s.activeScenario)}</span></div>
      <div class="kv-row"><span>${t("hud.atm_pressure")}</span><span class="val">${fmt(s.env.pressure_pa, 0)} Pa</span></div>
      <div class="kv-row"><span>${t("hud.air_temp")}</span><span class="val">${fmt(s.env.air_temp_k - 273.15, 0)} / ${fmt(s.env.ground_temp_k - 273.15, 0)} C</span></div>
      <div class="kv-row"><span>${t("hud.opacity")}</span><span class="val">${fmt(s.env.tau, 2)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, (s.env.tau / 8) * 100)}%; background:var(--warn);"></div></div>
      <div class="kv-row"><span>${t("hud.solar_power")}</span><span class="val">${fmt(solarPct, 0)}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${solarPct}%; background:var(--good);"></div></div>
      <div class="kv-row"><span>${t("hud.wind")}</span><span class="val">${fmt(s.env.wind_ms, 1)} m/s</span></div>
      <div class="kv-row"><span>${t("hud.dose_rate")}</span><span class="val">${fmt(s.env.dose_rate_ugy_h, 1)} uGy/h</span></div>
      <div class="kv-row"><span>${t("hud.cum_dose")}</span><span class="val">${fmt(suit.cumulative_dose_ugy, 2)} uGy</span></div>
      ${hydValBlock}
      ${this.stormBlockHtml(s.env.tau)}
      <div style="font-size:10px; opacity:0.75; margin-top:4px;">[${escapeHtml(s.env.data_category ?? "design")}] ${escapeHtml(s.env.storm_source)}<br>${escapeHtml(s.env.rad_source)} (${escapeHtml(s.env.radiation_quantity ?? "absorbed_dose_silicon")})<br>${terrainProvenanceLine} (${this.terrain.heightGridN} DEM)</div>
      ${latestAlerts}
    `;

    this.drawStormCanvas();
    this.renderCrew();

    // Bottom live controls
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-layer]").forEach((b) => {
      b.classList.toggle("active", b.dataset.layer === s.layer);
    });
    const uncBtn = document.getElementById("btn-hyd-unc");
    if (uncBtn) {
      uncBtn.style.display = s.layer === "hydration" ? "inline-block" : "none";
      uncBtn.classList.toggle("active", this.terrain.hydrationUncMode);
    }
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((b) => {
      b.classList.toggle("active", b.dataset.panel === s.panel);
    });
    const povBtn = document.getElementById("btn-pov");
    if (povBtn) {
      povBtn.textContent =
        s.povMode === "1st" ? t("hud.pov_1st") : s.povMode === "3rd" ? t("hud.pov_3rd") : s.povMode === "cinematic" ? t("hud.pov_cinematic") : t("hud.pov_iso");
    }
    this.bottomEl.querySelectorAll<HTMLButtonElement>("[data-cam]").forEach((b) => {
      b.classList.toggle("active", s.povMode === "cinematic" && Number(b.dataset.cam) === s.cinematicCam);
    });
    const isoBtn = document.getElementById("btn-iso");
    if (isoBtn) isoBtn.classList.toggle("active", s.povMode === "iso");
    const hudVis = s.hudVisible;
    this.topEl.style.display = hudVis ? "flex" : "none";
    this.leftEl.style.display = hudVis ? "block" : "none";
    this.rightEl.style.display = hudVis ? "block" : "none";
    this.crewEl.style.display = hudVis ? "block" : "none";
    this.bottomEl.style.display = hudVis ? "flex" : "none";
    const restorePill = document.getElementById("hud-restore-pill");
    if (restorePill) {
      restorePill.style.display = hudVis ? "none" : "block";
      restorePill.textContent = t("hud.restore");
    }
    const visorEl = document.getElementById("visor-vignette");
    if (visorEl) visorEl.style.display = s.povMode === "1st" && hudVis ? "block" : "none";
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
            `<div><b style="color:${tr.who === "you" ? "#f3ece3" : "#ffb36b"}">${escapeHtml(speakerLabel(tr.who))}:</b> ${escapeHtml(tr.text)}</div>`,
        )
        .join("");
      txBox.scrollTop = txBox.scrollHeight;
    }

    const qrSt = document.getElementById("qr-status");
    if (qrSt) {
      qrSt.textContent = s.remoteConnected ? t("remote.connected") : `${t("remote.waiting")} (${s.remoteRoom})`;
      qrSt.className = `pill ${s.remoteConnected ? "" : "warn"}`;
    }

    const confirmKey = s.pendingActions.map((a) => `${a.type}:${JSON.stringify(a.args)}:${a.verdict?.reason ?? ""}`).join("|");
    if (confirmKey !== this.lastConfirmKey) {
      this.lastConfirmKey = confirmKey;
      if (s.pendingActions.length === 0) {
        this.confirmEl.style.display = "none";
        this.confirmEl.innerHTML = "";
      } else {
        this.confirmEl.style.display = "block";
        this.confirmEl.innerHTML = s.pendingActions
          .map(
            (a, idx) => `
            <div style="margin-bottom:${idx < s.pendingActions.length - 1 ? 8 : 0}px;">
              <div style="font-weight:700;">GUARDIAN · ${escapeHtml(a.type.toUpperCase())}</div>
              <div style="font-size:11px; color:#fff; margin:3px 0;">${escapeHtml(a.verdict?.reason || JSON.stringify(a.args))}</div>
              <div class="btn-row" style="margin-top:5px;">
                <button class="hud-btn" data-pointable data-hud-confirm="${idx}">${t("agents.confirm")}</button>
                <button class="hud-btn danger" data-pointable data-hud-cancel="${idx}">${t("agents.cancel")}</button>
              </div>
            </div>
          `,
          )
          .join("");
        this.confirmEl.querySelectorAll<HTMLButtonElement>("[data-hud-confirm]").forEach((b) =>
          b.addEventListener("click", () => s.confirmPendingAction(Number(b.dataset.hudConfirm), true)),
        );
        this.confirmEl.querySelectorAll<HTMLButtonElement>("[data-hud-cancel]").forEach((b) =>
          b.addEventListener("click", () => s.confirmPendingAction(Number(b.dataset.hudCancel), false)),
        );
      }
    }

    this.renderModal();
  }

  /** Bottom-left roster: the four astronauts by callsign with assignment, location, status and distance to base. */
  private renderCrew(): void {
    const rows = this.store.crew
      .map((c) => {
        const d = crewDistanceM(c, BASE_ORIGIN);
        const level = c.status === "nominal" ? "good" : c.status === "recovering" ? "warn" : "crit";
        const badge = t(`crew.assignment.${c.assignment}`);
        return `<div class="crew-row ${level}">
          <div class="crew-name"><span class="crew-dot"></span>${escapeHtml(c.name)}<span class="crew-badge">${escapeHtml(badge)}</span></div>
          <div class="crew-line">${escapeHtml(t(`crew.location.${c.location}`))} · ${escapeHtml(t(`crew.status.${c.status}`))}</div>
          <div class="crew-line">${escapeHtml(t("crew.dist", { m: fmt(d, 0) }))}</div>
        </div>`;
      })
      .join("");
    const key = rows;
    if (key === this.crewKey) return;
    this.crewKey = key;
    this.crewEl.innerHTML = `<div class="panel-hdr"><span>${t("crew.title")}</span><span>${this.store.crew.length}</span></div>${rows}`;
  }

  private stormBlockHtml(tau: number): string {
    if (this.stormState === "loading") return "";
    if (!this.stormData) {
      return `<div class="storm-block"><div class="panel-hdr"><span>${t("hud.storm_forecast")}</span></div><div class="storm-note">${escapeHtml(t("storm.chart.unavailable"))}</div></div>`;
    }
    const d = this.stormData;
    const verdict = stormVerdict(d, tau);
    const cov = d.coverage80.filter((c): c is number => c !== null);
    const covLine = cov.length
      ? `<div class="storm-note">${escapeHtml(t("storm.chart.coverage", { lo: fmt(Math.min(...cov) * 100, 0), hi: fmt(Math.max(...cov) * 100, 0) }))}</div>`
      : "";
    const level = verdict.verdict === "go" ? "good" : verdict.verdict === "no_go" ? "crit" : "warn";
    return `
      <div class="storm-block">
        <div class="panel-hdr"><span>${t("hud.storm_forecast")}</span><span>Sol ${d.forecast_sol}</span></div>
        <canvas id="storm-chart" width="236" height="96"></canvas>
        <div class="storm-note">${escapeHtml(t("storm.chart.legend"))}</div>
        <div class="kv-row"><span>${escapeHtml(t("storm.chart.verdict"))}</span><span class="val storm-verdict ${level}">${t(`storm.verdict.${verdict.verdict}`)}</span></div>
        ${verdict.reasons.map((r) => `<div class="storm-note">• ${escapeHtml(t(r))}</div>`).join("")}
        ${covLine}
        <div class="storm-note">${escapeHtml(t("storm.nowcast_disclaimer"))}</div>
      </div>`;
  }

  private drawStormCanvas(): void {
    const canvas = document.getElementById("storm-chart") as HTMLCanvasElement | null;
    if (!canvas || !this.stormData) return;
    drawStormChart(canvas, buildChartModel(this.stormData));
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
            : voter.status === "ok" ? t("hud.status.ok") : t(`agents.${voter.status}`);
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
          <span>${escapeHtml(v.consensus ? t(`agents.consensus.${v.consensus}`) : "")} (${tally.allow}A/${tally.deny}D/${tally.ask_human}H)</span>
          <span>${v.latency_ms ?? 0} ms</span>
        </div>
        ${v.triggers?.length ? `<div class="esc-vote-triggers">${t("agents.triggers")}: ${escapeHtml(v.triggers.join(", "))}</div>` : ""}
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
      const camSources: Array<{ id: string; label: string; defaultQ: string }> = [
        { id: "astronaut", label: t("hud.view_helmet"), defaultQ: "Describe what I am seeing right in front of me" },
        { id: "rover-1", label: "RVR-1", defaultQ: "Describe terrain and crew rover surroundings" },
        { id: "rover-2", label: "RVR-2", defaultQ: t("deck.say.8") },
        { id: "rover-3", label: "RVR-3 (HANDS)", defaultQ: "Identify numbered rock targets T1, T2, T3" },
        { id: "rescue-1", label: "RESCUE-1", defaultQ: "Describe terrain and emergency path ahead" },
        { id: "drone-1", label: "DRONE-1", defaultQ: "Describe overhead Gale Crater terrain and hazards" },
        { id: "drone-2", label: "DRONE-2", defaultQ: "Describe aerial view of base and fleet units" },
      ];
      const activeCam = s.activeVisionUnitId || "astronaut";
      const camButtons = camSources
        .map(
          (c) =>
            `<button class="hud-btn ${c.id === activeCam ? "active" : ""}" data-pointable data-vis-cam="${c.id}">${c.label}</button>`,
        )
        .join("");

      this.modalEl.innerHTML = `
        <div class="panel-hdr">
          <span>${t("vision.title")} · ${escapeHtml(activeCam.toUpperCase())} (POST /api/agent/vision)</span>
          <button class="hud-btn" data-pointable id="modal-close">X</button>
        </div>
        <div class="btn-row" style="margin-bottom:6px; flex-wrap:wrap;">${camButtons}</div>
        ${s.injectionBlockedBanner ? `<div class="alert-banner"><b>${t("agents.injection_blocked")}</b></div>` : ""}
        <div style="margin:8px 0; text-align:center;">
          ${s.roverPreviewUrl ? `<img src="${s.roverPreviewUrl}" style="width:100%; max-width:480px; border-radius:8px; border:1px solid var(--border);" />` : t("vision.capturing")}
        </div>
        <div style="font-size:12px; color:#fff; margin-bottom:8px;">${s.roverPreviewCaption}</div>
        <div class="btn-row">
          <button class="hud-btn" data-pointable id="rvr-snap-helmet">${t("hud.view_helmet")}</button>
          <button class="hud-btn" data-pointable id="rvr-snap-2">${t("vision.sign")}</button>
          <button class="hud-btn" data-pointable id="rvr-snap-m">${t("vision.targets")}</button>
        </div>
      `;
      this.modalEl.querySelector("#modal-close")!.addEventListener("click", () => {
        this.roverModalOpen = false;
        this.renderModal();
      });
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-vis-cam]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.visCam!;
          const found = camSources.find((c) => c.id === id);
          this.actions.captureRoverVision(id, found?.defaultQ ?? "Describe the camera frame");
        });
      });
      this.modalEl.querySelector("#rvr-snap-helmet")!.addEventListener("click", () =>
        this.actions.captureRoverVision("astronaut", "Describe what I am seeing right in front of me"),
      );
      this.modalEl.querySelector("#rvr-snap-2")!.addEventListener("click", () =>
        this.actions.captureRoverVision("rover-2", t("deck.say.8")),
      );
      this.modalEl.querySelector("#rvr-snap-m")!.addEventListener("click", () =>
        this.actions.captureRoverVision("rover-3", "Identify numbered rock targets T1, T2, T3"),
      );
      return;
    }

    if (s.panel === "none") {
      this.lastModalPanel = "none";
      this.modalEl.style.display = "none";
      return;
    }

    this.modalEl.style.display = "block";
    this.modalEl.classList.toggle("hud-modal-map", s.panel === "map");
    const closeHdr = (title: string) => `
      <div class="panel-hdr">
        <span>${title}</span>
        <button class="hud-btn" data-pointable id="modal-close">X</button>
      </div>
    `;

    if (s.panel === "veins") {
      this.veinDetector.show(this.modalEl, () => s.setPanel("none"));
      this.lastModalPanel = s.panel;
      return;
    }

    if (s.panel === "agents") {
      const pendingHtml = s.pendingActions
        .map(
          (a, idx) => `
          <div class="alert-banner" style="border-color:var(--warn);">
            <b>GUARDIAN · ${t("hud.ask_human_title")}:</b> ${a.type} ${JSON.stringify(a.args)}<br/>
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
            summary = `${escapeHtml(String(act.type ?? ""))} -> <b>${escapeHtml(t(`guard.${dec}`))}</b> (${escapeHtml(act.verdict?.reason ?? "")})`;
          }
          return `<div class="${cls}"><b>${escapeHtml(tr.agent)}</b> [${escapeHtml(tr.kind)}]: ${summary}</div>`;
        })
        .join("");

      this.modalEl.innerHTML = `
        ${closeHdr(t("agents.title"))}
        <div class="btn-row" style="margin-bottom:8px;">
          <span>${t("agents.route")}: <b>${s.routePath.join(" -> ") || t("common.idle")}</b></span>
          <button class="hud-btn ${s.earthLinkDelay ? "active" : ""}" data-pointable id="btn-earth-delay">
            ${t("agents.earth_link")}: ${s.earthLinkDelay ? `${t("hud.earth_delay", { s: s.env.earth_light_time_s * 2 })} [${t("prov.design_assumption")}]` : t("agents.local")}
          </button>
        </div>
        ${pendingHtml}
        <div>${traceHtml || `<i>${t("agents.empty")}</i>`}</div>
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
            <td>${escapeHtml(["rover_crew", "rover_science", "rover_cargo", "scout", "rescue", "drone", "glider", "manipulator", "robot", "rescue_robot"].includes(u.kind) ? t(`fleet.${u.kind}`) : u.kind)}</td>
            <td>(${fmt(u.x, 0)}, ${fmt(u.z, 0)})</td>
            <td>${fmt(u.battery * 100, 0)}%</td>
            <td>${escapeHtml(taskLabel(u.task))}</td>
            <td><button class="hud-btn" data-pointable data-fleet-cam="${u.id}">${t("vision.camera_label")}</button></td>
          </tr>
        `,
        )
        .join("");
      this.modalEl.innerHTML = `
        ${closeHdr(t("fleet.title"))}
        <table class="prov-tbl hud-fleet-table">
          <thead><tr><th>ID</th><th>${t("fleet.kind")}</th><th>XZ (m)</th><th>${t("hud.battery")}</th><th>${t("fleet.task")}</th><th>${t("vision.camera_label")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="panel-hdr" style="margin-top:10px;"><span>${t("manip.title")}</span></div>
        <div class="btn-row">
          <button class="hud-btn" data-pointable data-skill="drill" data-tgt="T1">${t("manip.drill")}</button>
          <button class="hud-btn" data-pointable data-skill="sample" data-tgt="T3">${t("manip.sample")}</button>
          <button class="hud-btn" data-pointable data-skill="photograph" data-tgt="T2">${t("manip.photo")}</button>
          <button class="hud-btn" data-pointable data-skill="handover" data-tgt="astronaut">${t("manip.handover")}</button>
        </div>
      `;
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-fleet-cam]").forEach((b) =>
        b.addEventListener("click", () => {
          const uid = b.dataset.fleetCam!;
          this.actions.captureRoverVision(uid, `Describe what ${uid} camera sees`);
        }),
      );
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-skill]").forEach((b) =>
        b.addEventListener("click", () =>
          this.actions.runManipSkill(b.dataset.skill as ArmSkillId, b.dataset.tgt!),
        ),
      );
    } else if (s.panel === "map") {
      const hydMeta = this.terrain.hydrationMeta;
      const hydHere = this.terrain.hydrationAt(s.astronaut.x, s.astronaut.z);
      const uncHere = this.terrain.hydrationUncAt(s.astronaut.x, s.astronaut.z);
      this.modalEl.innerHTML = `
        ${closeHdr(t("map.title"))}
        <div id="map-host"></div>
        <div class="hud-map-foot">
          <span>${t("map.circles", { n: this.terrain.danPoints.length })}: ${escapeHtml(t("hud.dan_stations"))}</span>
          ${s.activeRoute ? `<span><b>${t("map.route")} (${s.activeRoute.algorithm})</b>: ${fmt(s.activeRoute.distanceM, 0)} m, ${fmt(s.activeRoute.timeS / 60, 1)} min, O2 ${fmt(s.activeRoute.o2Kg * 1000, 0)} g</span>` : ""}
          ${s.layer === "hydration" ? `<span><b>${escapeHtml(t("hud.hydration_index"))}:</b> ${fmt(hydHere, 2)} ± ${fmt(uncHere, 2)} (${t("common.range")} ${fmt(hydMeta.weh_min, 2)}–${fmt(hydMeta.weh_max, 2)}) <button class="hud-btn ${this.terrain.hydrationUncMode ? "active" : ""}" data-pointable id="map-hyd-unc">${escapeHtml(t("hud.layer.hydration_unc"))}</button></span>` : ""}
        </div>
      `;
      this.modalEl.querySelector("#map-hyd-unc")?.addEventListener("click", () => {
        this.terrain.setHydrationUncMode(!this.terrain.hydrationUncMode);
        this.store.notify();
      });
      // The base map is rendered once and cached; every update only repaints the moving symbols.
      if (!this.mapCanvas) {
        this.mapCanvas = document.createElement("canvas");
        this.mapCanvas.width = MAP_WIDTH;
        this.mapCanvas.height = MAP_HEIGHT;
        this.mapCanvas.className = "hud-map-canvas";
        this.cartography = new CartographyRenderer(this.terrain);
      }
      this.modalEl.querySelector("#map-host")!.appendChild(this.mapCanvas);
      const mapCtx = this.mapCanvas.getContext("2d");
      if (mapCtx && this.cartography) {
        this.cartography.draw(
          mapCtx,
          { fleet: s.fleet, crew: s.crew, astronaut: s.astronaut },
          s.activeRoute ? { algorithm: s.activeRoute.algorithm, points: s.activeRoute.points } : null,
        );
      }
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
        ${closeHdr(escapeHtml(t("base.module", { name: mod.name })))}
        <div class="btn-row" style="margin-bottom:8px;">${modButtons}</div>
        <table class="prov-tbl"><tbody>${specsHtml}</tbody></table>
        <div class="panel-hdr" style="margin-top:10px;"><span>${t("base.resource_balance")}</span></div>
        <div class="kv-row"><span>${t("base.generation")}</span><span class="val">${fmt(totalGen, 1)} kWe (${t("base.power_out")} ${loadKw} kWe)</span></div>
        <div class="kv-row"><span>${t("base.isru")}</span><span class="val">${t("base.oxygen_summary")}</span></div>
      `;
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-bmod]").forEach((b) =>
        b.addEventListener("click", () => {
          s.selectedBaseModuleId = b.dataset.bmod!;
          this.renderModal();
        }),
      );
    } else if (s.panel === "health") {
      this.modalEl.innerHTML = `
        ${closeHdr(t("health.title"))}
        <table class="prov-tbl">
          <tr><td>${t("health.nominal_pressure")}</td><td>29.6 kPa (4.3 psi)</td><td>NASA Exploration EVA</td></tr>
          <tr><td>${t("health.pao2")}</td><td>8.0 kPa / 4.0 kPa</td><td>${t("health.thresholds")}</td></tr>
          <tr><td>${t("health.armstrong")}</td><td>6.27 kPa</td><td>${t("health.vapor")}</td></tr>
          <tr><td>${t("hud.co2")}</td><td>&lt; 667 Pa ${t("health.nominal")}</td><td>NASA-STD-3001 Vol. 2</td></tr>
          <tr><td>${t("health.radiation")}</td><td>600 mSv</td><td>NASA-STD-3001 Vol. 1</td></tr>
        </table>
      `;
    } else if (s.panel === "casson") {
      const tw = estimateCassonTwin({
        helmetCo2Pa: s.suit.co2_pa,
        metabolicW: s.suit.metabolic_w,
        evaTimeS: s.metS,
      });
      const statusCls = tw.status === "crit" ? "crit" : tw.status === "warn" ? "warn" : "ok";
      this.modalEl.innerHTML = `
        ${closeHdr(t("casson.title"))}
        <table class="prov-tbl">
          <tr><td>${t("casson.status")}</td><td class="val ${statusCls}">${t(`casson.status.${tw.status}`)}</td><td>PaCO2 &ge; 45 / 55 mmHg</td></tr>
          <tr><td>${t("casson.paco2")}</td><td>${fmt(tw.paco2Mmhg, 1)} mmHg</td><td>${t("casson.paco2_src")}</td></tr>
          <tr><td>${t("casson.hct")}</td><td>${fmt(tw.hematocrit * 100, 1)} %</td><td>${t("casson.hct_src")}</td></tr>
          <tr><td>${t("casson.yield")}</td><td>${fmt(tw.yieldStressPa * 1000, 2)} mPa</td><td>Casson &tau;<sub>y</sub></td></tr>
          <tr><td>${t("casson.eta_c")}</td><td>${fmt(tw.cassonViscosityPaS * 1000, 2)} mPa&middot;s</td><td>Casson &eta;<sub>c</sub></td></tr>
          <tr><td>${t("casson.visc_high")}</td><td>${fmt(tw.viscosityHighShearPaS * 1000, 2)} mPa&middot;s</td><td>&gamma;&#775; = 100 s<sup>-1</sup></td></tr>
          <tr><td>${t("casson.visc_low")}</td><td>${fmt(tw.viscosityLowShearPaS * 1000, 2)} mPa&middot;s</td><td>&gamma;&#775; = 1 s<sup>-1</sup></td></tr>
          <tr><td>${t("casson.relative")}</td><td>${fmt(tw.relativeViscosity, 3)}x</td><td>${t("casson.baseline")}</td></tr>
        </table>
        <div style="margin-top:6px; font-size:11px; opacity:0.8;">&radic;&tau; = &radic;&tau;<sub>y</sub> + &radic;(&eta;<sub>c</sub>&middot;&gamma;&#775;) &mdash; ${t("casson.note")}</div>
      `;
    } else if (s.panel === "provenance") {
      this.ensureProvenanceLoaded();
      const datasetCount = this.provenanceData ? Object.keys(this.provenanceData).length : 0;
      const provRenderKey = [
        getLang(),
        this.provenanceState,
        this.provenanceError,
        this.terrain.meta.product_id,
        datasetCount,
      ].join("|");
      if (this.lastModalPanel === "provenance" && this.provenanceRenderKey === provRenderKey) {
        return;
      }
      this.provenanceRenderKey = provRenderKey;
      this.lastModalPanel = "provenance";

      const constRows = Object.entries(C)
        .map(
          ([k, c]) =>
            `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(c.value))} ${escapeHtml(c.unit)}</td><td>${escapeHtml(c.source)}${("assumption" in c && c.assumption) ? ` [${escapeHtml(t("prov.assumption"))}]` : ""}</td></tr>`,
        )
        .join("");

      this.modalEl.innerHTML = `
        ${closeHdr(t("prov.title"))}
        <div style="margin-bottom:6px;">${t("prov.terrain")} DEM: <b>${escapeHtml(this.terrain.meta.product_id)}</b> (${t("prov.samples", { n: this.terrain.heightGridN })})</div>
        <div style="margin-bottom:6px; font-size:11px; opacity:0.85;">
          ${t("prov.mission_env")} [${escapeHtml(s.env.data_category ?? "design")}]: ${escapeHtml(s.env.storm_source)}; ${escapeHtml(s.env.rad_source)}; ${t("prov.one_way", { s: s.env.earth_light_time_s })} [${t("prov.design_assumption")}].
          ${t("prov.archive_note")}
        </div>
        ${this.buildProvenanceManifestHtml(datasetCount)}
        <div class="prov-section">
          <div class="panel-hdr"><span>${escapeHtml(t("prov.constants"))}</span></div>
          <table class="prov-tbl">
            <thead><tr><th>${t("prov.constant")}</th><th>${t("common.value")}</th><th>${escapeHtml(t("prov.source"))}</th></tr></thead>
            <tbody>${constRows}</tbody>
          </table>
        </div>
      `;

      this.modalEl.querySelector("#prov-retry")?.addEventListener("click", () => {
        this.ensureProvenanceLoaded(true);
        this.renderDynamic();
      });
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
                      <b style="color:${e.who === "you" ? "#f3ece3" : "#ffb36b"}">${escapeHtml(speakerLabel(e.who))}</b>
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
                        <span class="pill">${escapeHtml(scenarioLabel(sess.scenario))}</span>
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
            <span class="pill" style="margin-left:6px;">${escapeHtml(scenarioLabel(active.scenario))}</span>
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
    } else if (s.panel === "menu") {
      const activeLang = getLang();
      const langNames: Record<string, string> = {
        es: "ES · Español",
        en: "EN · English",
        fr: "FR · Français",
        de: "DE · Deutsch",
        it: "IT · Italiano",
      };
      this.modalEl.innerHTML = `
        ${closeHdr(t("menu.quick"))}
        <div class="quick-menu-grid">
          <div class="quick-menu-section">
            <div class="quick-menu-title">${t("menu.panels")}</div>
            <div class="quick-menu-cards">
              <button class="quick-card-btn" data-pointable data-qm-panel="map">${t("menu.map")}</button>
              <button class="quick-card-btn" data-pointable data-qm-panel="fleet">${t("menu.fleet")}</button>
              <button class="quick-card-btn" data-pointable data-qm-panel="agents">${t("menu.agents")}</button>
              <button class="quick-card-btn" data-pointable data-qm-panel="health">${t("menu.health")}</button>
              <button class="quick-card-btn" data-pointable data-qm-panel="base">${t("menu.base")}</button>
              <button class="quick-card-btn" data-pointable data-qm-panel="provenance">${t("menu.provenance")}</button>
              <button class="quick-card-btn" data-pointable data-qm-panel="sessions">${t("menu.sessions")}</button>
              <button class="quick-card-btn" data-pointable id="qm-remote-qr">${t("menu.remote")}</button>
            </div>
          </div>

          <div class="quick-menu-section">
            <div class="quick-menu-title">${t("menu.terrain")}</div>
            <div class="quick-menu-cards">
              <button class="quick-card-btn ${s.layer === "optical" ? "active" : ""}" data-pointable data-qm-layer="optical">${t("hud.layer.optical")}</button>
              <button class="quick-card-btn ${s.layer === "slope" ? "active" : ""}" data-pointable data-qm-layer="slope">${t("hud.layer.slope")}</button>
              <button class="quick-card-btn ${s.layer === "thermal" ? "active" : ""}" data-pointable data-qm-layer="thermal">${t("hud.layer.thermal")}</button>
              <button class="quick-card-btn ${s.layer === "radiation" ? "active" : ""}" data-pointable data-qm-layer="radiation">${t("hud.layer.radiation")}</button>
              <button class="quick-card-btn ${s.layer === "hydration" ? "active" : ""}" data-pointable data-qm-layer="hydration">${t("hud.layer.hydration")}</button>
            </div>
          </div>

          <div class="quick-menu-section">
            <div class="quick-menu-title">${t("menu.cameras")}</div>
            <div class="quick-menu-cards">
              <button class="quick-card-btn" data-pointable id="qm-cam-helmet">${t("hud.view_helmet")}</button>
              <button class="quick-card-btn" data-pointable id="qm-cam-rvr2">${t("menu.rover_cam")}</button>
              <button class="quick-card-btn" data-pointable id="qm-cam-rvr3">${t("vision.camera", { unit: "RVR-3" })}</button>
              <button class="quick-card-btn" data-pointable id="qm-cam-drone1">${t("vision.camera", { unit: "DRONE-1" })}</button>
              <button class="quick-card-btn" data-pointable id="qm-pov-cycle">${t("hud.cycle_pov")}</button>
              <button class="quick-card-btn ${s.povMode === "iso" ? "active" : ""}" data-pointable id="qm-pov-iso">${t("hud.isometric")}</button>
              <button class="quick-card-btn ${!s.hudVisible ? "active" : ""}" data-pointable id="qm-toggle-hud" style="grid-column: span 2;">
                ${s.hudVisible ? t("hud.hide") : t("hud.show")}
              </button>
            </div>
          </div>

          <div class="quick-menu-section">
            <div class="quick-menu-title">${t("menu.scenarios")}</div>
            <div class="quick-menu-cards">
              ${LANGS.map((l) => `<button class="quick-card-btn ${activeLang === l ? "active" : ""}" data-pointable data-qm-lang="${l}">${langNames[l] ?? l.toUpperCase()}</button>`).join("")}
              <button class="quick-card-btn" data-pointable data-qm-scen="storm">${t("deck.5.label")}</button>
              <button class="quick-card-btn" data-pointable data-qm-scen="sep2017">${t("deck.6.label")}</button>
              <button class="quick-card-btn" data-pointable data-qm-scen="leak">${t("scenario.leak")}</button>
              <button class="quick-card-btn" data-pointable data-qm-scen="rescue">${t("scenario.rescue")}</button>
            </div>
          </div>
        </div>
      `;

      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-qm-panel]").forEach((b) =>
        b.addEventListener("click", () => s.setPanel(b.dataset.qmPanel as PanelId)),
      );
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-qm-layer]").forEach((b) =>
        b.addEventListener("click", () => {
          this.actions.setLayer(b.dataset.qmLayer as LayerId);
          s.setPanel("none");
        }),
      );
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-qm-lang]").forEach((b) =>
        b.addEventListener("click", () => {
          setLang(b.dataset.qmLang as (typeof LANGS)[number]);
          this.renderModal();
        }),
      );
      this.modalEl.querySelectorAll<HTMLButtonElement>("[data-qm-scen]").forEach((b) =>
        b.addEventListener("click", () => {
          this.actions.startScenario?.(b.dataset.qmScen as "storm" | "sep2017" | "leak" | "rescue");
          s.setPanel("none");
        }),
      );
      this.modalEl.querySelector("#qm-remote-qr")?.addEventListener("click", () => {
        s.setPanel("none");
        this.toggleQrModal(true);
      });
      this.modalEl.querySelector("#qm-cam-helmet")?.addEventListener("click", () =>
        this.actions.captureRoverVision("astronaut", "Describe what I am seeing right in front of me"),
      );
      this.modalEl.querySelector("#qm-cam-rvr2")?.addEventListener("click", () =>
        this.actions.captureRoverVision("rover-2", t("deck.say.8")),
      );
      this.modalEl.querySelector("#qm-cam-rvr3")?.addEventListener("click", () =>
        this.actions.captureRoverVision("rover-3", "Identify numbered rock targets T1, T2, T3"),
      );
      this.modalEl.querySelector("#qm-cam-drone1")?.addEventListener("click", () =>
        this.actions.captureRoverVision("drone-1", "Describe overhead Gale Crater terrain and hazards"),
      );
      this.modalEl.querySelector("#qm-pov-cycle")?.addEventListener("click", () => {
        this.actions.togglePov();
        s.setPanel("none");
      });
      this.modalEl.querySelector("#qm-pov-iso")?.addEventListener("click", () => {
        this.actions.toggleIso();
        s.setPanel("none");
      });
      this.modalEl.querySelector("#qm-toggle-hud")?.addEventListener("click", () => {
        s.setHudVisible(!s.hudVisible);
        s.setPanel("none");
      });
    }

    if (s.panel !== "sessions" && s.panel !== "provenance") {
      this.lastModalPanel = s.panel;
    }

    this.modalEl.querySelector("#modal-close")?.addEventListener("click", () => s.setPanel("none"));
  }

  private ensureProvenanceLoaded(force = false): void {
    if (!force && (this.provenanceState === "loading" || this.provenanceState === "ready")) {
      return;
    }
    this.provenanceState = "loading";
    this.provenanceError = "";
    fetchProvenanceManifest()
      .then((manifest) => {
        this.provenanceData = manifest;
        this.provenanceState = "ready";
        if (this.store.panel === "provenance") {
          this.renderDynamic();
        }
      })
      .catch((err: unknown) => {
        this.provenanceState = "error";
        this.provenanceError = err instanceof Error ? err.message : String(err);
        if (this.store.panel === "provenance") {
          this.renderDynamic();
        }
      });
  }

  private buildProvenanceManifestHtml(datasetCount: number): string {
    const hdr = `<div class="panel-hdr"><span>${escapeHtml(t("prov.datasets", { n: datasetCount }))}</span></div>`;
    if (this.provenanceState === "loading" || this.provenanceState === "idle") {
      return `<div class="prov-section">${hdr}<div class="prov-detail">${escapeHtml(t("prov.loading"))}</div></div>`;
    }
    if (this.provenanceState === "error" || !this.provenanceData) {
      return `
        <div class="prov-section">
          ${hdr}
          <div class="alert-banner" style="border-color:var(--warn); background:rgba(255,184,0,0.14); margin:6px 0;">
            ${escapeHtml(t("prov.unavailable", { msg: this.provenanceError || t("common.unknown_error") }))}
          </div>
          <button class="hud-btn" data-pointable id="prov-retry">${escapeHtml(t("prov.retry"))}</button>
        </div>
      `;
    }

    const catOrder: Record<ProvenanceCategory, number> = {
      terrain: 0,
      env: 1,
      veins: 2,
      models: 3,
      other: 4,
    };
    const entries = Object.entries(this.provenanceData).sort(([ka], [kb]) => {
      const ca = catOrder[categorizeProvenanceKey(ka)];
      const cb = catOrder[categorizeProvenanceKey(kb)];
      return ca !== cb ? ca - cb : ka.localeCompare(kb);
    });

    const rows = entries
      .map(([key, entry]) => {
        const cat = categorizeProvenanceKey(key);
        const safeUrl = formatProvenanceUrl(entry.url);
        const linkHtml = safeUrl
          ? `<div class="prov-detail"><a class="prov-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a></div>`
          : "";
        const notesHtml = entry.notes
          ? `<div class="prov-detail">${escapeHtml(entry.notes)}</div>`
          : "";
        const licenseHtml = entry.license
          ? `<div class="prov-detail">${escapeHtml(entry.license)}</div>`
          : "";
        const offset = entry.vertical_datum_offset;
        const offsetHtml = offset?.summary
          ? `<div class="prov-offset-note">${escapeHtml(offset.summary)}</div>`
          : "";
        return `
          <tr>
            <td>
              <span class="prov-cat">${escapeHtml(t(`prov.cat.${cat}`))}</span>
              <div><b>${escapeHtml(key)}</b></div>
              <div class="prov-detail">${escapeHtml(entry.retrieved)}</div>
            </td>
            <td>
              <div><b>${escapeHtml(entry.product_id)}</b></div>
              <div class="prov-detail">${escapeHtml(entry.transform)}</div>
              ${notesHtml}
              ${licenseHtml}
              ${offsetHtml}
            </td>
            <td>
              <div>${escapeHtml(entry.source)}</div>
              ${linkHtml}
            </td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="prov-section">
        ${hdr}
        <table class="prov-tbl">
          <thead>
            <tr>
              <th>${escapeHtml(t("prov.asset"))}</th>
              <th>${escapeHtml(t("prov.details"))}</th>
              <th>${escapeHtml(t("prov.source"))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}
