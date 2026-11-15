import { fmt, onLangChange, t } from "@th/shared";
import type { SceneDirector } from "../world/sceneDirector";
import { PresentationRecorder, recordingSupported } from "./recorder";
import "./scenePanel.css";

export interface ScenePanelOptions {
  /** Shows or hides the tactical HUD (used for clean takes). */
  setHudVisible(visible: boolean): void;
  /** The 3D canvas, used as a fallback source when tab recording is not available. */
  getCanvas?(): HTMLCanvasElement | null;
}

function clock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Panel to pick a recorded scene, play it, run the whole presentation and record it. It is standalone DOM
 * (not part of the HUD innerHTML) so HUD re-renders never reset it, and it fades out during a take when the HUD is hidden.
 * Key P toggles the panel. Links: `?present=1` opens the panel, `?autoplay=1` also starts the full presentation after loading.
 */
export class ScenePanel {
  private root: HTMLElement;
  private open = false;
  private hideHud = true;
  private lastKey = "";
  private recorder: PresentationRecorder;
  private recordWithPresentation = false;
  private toast = "";
  private toastUntil = 0;

  constructor(
    private director: SceneDirector,
    private opts: ScenePanelOptions,
    parent: HTMLElement = document.body,
  ) {
    this.recorder = new PresentationRecorder(() => this.opts.getCanvas?.() ?? null);
    this.root = document.createElement("div");
    this.root.id = "scene-panel";
    this.root.className = "scene-panel";
    parent.appendChild(this.root);
    this.root.addEventListener("click", (e) => this.onClick(e));
    // P toggles the presentation panel (ignored while typing in a field or with a modifier key).
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyP" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      this.toggle();
    });
    onLangChange(() => {
      this.lastKey = "";
      this.update();
    });
    this.update();
  }

  toggle(): void {
    this.open = !this.open;
    this.lastKey = "";
    this.update();
  }

  /** Opens the panel (used by the `?present=1` link). */
  show(): void {
    this.open = true;
    this.lastKey = "";
    this.update();
  }

  /** Plays every scene in order. With `record`, tab recording starts first and the file downloads at the end. */
  async startPresentation(record: boolean): Promise<void> {
    if (record && !this.recorder.recording) {
      const kind = await this.recorder.start();
      if (!kind) this.say(t("scene.rec_unsupported"));
      this.recordWithPresentation = kind !== null;
    } else {
      this.recordWithPresentation = false;
    }
    this.open = false;
    this.director.playSequence();
    this.syncHud();
    this.lastKey = "";
    this.update();
  }

  private say(text: string): void {
    this.toast = text;
    this.toastUntil = performance.now() + 4000;
    this.lastKey = "";
  }

  private async finishRecording(): Promise<void> {
    const name = await this.recorder.stop();
    this.recordWithPresentation = false;
    if (name) this.say(t("scene.rec_saved", { file: name }));
    this.lastKey = "";
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-scene-act]");
    if (!el) return;
    const act = el.dataset.sceneAct;
    const d = this.director;
    if (act === "toggle") this.open = !this.open;
    else if (act === "select") d.play(el.dataset.sceneId ?? "");
    else if (act === "play") {
      if (d.state === "paused") d.resume();
      else if (d.activeId) d.restart();
      else d.play(d.scenes[0].id);
    } else if (act === "pause") d.pause();
    else if (act === "restart") d.restart();
    else if (act === "stop") {
      d.stop();
      this.opts.setHudVisible(true);
      if (this.recorder.recording) void this.finishRecording();
    } else if (act === "hidehud") this.hideHud = !this.hideHud;
    else if (act === "present") void this.startPresentation(false);
    else if (act === "present-rec") void this.startPresentation(true);
    else if (act === "rec") {
      if (this.recorder.recording) void this.finishRecording();
      else void this.recorder.start().then((k) => (k ? this.say(t("scene.recording")) : this.say(t("scene.rec_unsupported"))));
    } else if (act === "link") {
      const url = `${location.origin}${location.pathname}?autoplay=1`;
      void navigator.clipboard?.writeText(url).then(
        () => this.say(t("scene.link_copied", { url })),
        () => this.say(url),
      );
    }
    this.syncHud();
    this.lastKey = "";
    this.update();
  }

  private syncHud(): void {
    const taking = this.director.state === "playing" || this.director.state === "paused";
    this.opts.setHudVisible(!(taking && this.hideHud));
  }

  /** Call once per frame; the DOM is only rewritten when something visible changed. */
  update(): void {
    const d = this.director;
    if (d.state === "done") {
      this.opts.setHudVisible(true);
      if (this.recordWithPresentation && !d.inSequence) void this.finishRecording();
    }
    const active = d.active;
    const timeS = Math.floor(d.sceneTimeS);
    const toastOn = performance.now() < this.toastUntil;
    const rec = this.recorder.recording;
    const key = [this.open, d.state, d.activeId, timeS, this.hideHud, rec, rec ? Math.floor(this.recorder.elapsedS) : 0, toastOn ? this.toast : ""].join("|");
    if (key === this.lastKey) return;
    this.lastKey = key;

    const taking = d.state === "playing" || d.state === "paused";
    this.root.classList.toggle("clean", taking && this.hideHud);
    this.root.classList.toggle("open", this.open);

    const toastHtml = toastOn ? `<div class="scene-toast">${escapeHtml(this.toast)}</div>` : "";
    const recBadge = rec ? `<span class="scene-rec">● REC ${clock(this.recorder.elapsedS)}</span>` : "";
    const canRec = recordingSupported();

    if (!this.open) {
      this.root.innerHTML = `
        <div class="scene-closed">
          <button class="scene-btn scene-present" data-scene-act="present-rec">▶ ${t("scene.present")}</button>
          <button class="scene-btn scene-open" data-scene-act="toggle">${t("scene.open")}</button>
          ${recBadge}
        </div>${toastHtml}`;
      return;
    }
    const rows = d.scenes
      .map((s) => {
        const sel = s.id === d.activeId ? " active" : "";
        return `<button class="scene-row${sel}" data-scene-act="select" data-scene-id="${s.id}"><span>${s.id}</span><span class="scene-name">${t(s.nameKey)}</span><span class="scene-time">${clock(s.startS)}–${clock(s.startS + s.durationS)}</span></button>`;
      })
      .join("");
    const pct = active ? Math.min(100, (d.sceneTimeS / active.durationS) * 100) : 0;
    const stateLabel = t(`scene.state.${d.state}`);
    const playLabel = d.state === "paused" ? t("scene.resume") : t("scene.play");
    this.root.innerHTML = `
      <div class="scene-head"><span>${t("scene.title")}</span><span class="scene-state ${d.state}">${stateLabel}</span>${recBadge}<button class="scene-btn" data-scene-act="toggle">×</button></div>
      <div class="scene-controls scene-big">
        <button class="scene-btn primary" data-scene-act="present">▶ ${t("scene.play_all")}</button>
        ${canRec ? `<button class="scene-btn primary" data-scene-act="present-rec">● ${t("scene.record_play_all")}</button>` : ""}
      </div>
      <div class="scene-list">${rows}</div>
      <div class="scene-bar"><div style="width:${fmt(pct, 0)}%"></div></div>
      <div class="scene-time-row"><span>${active ? clock(d.sceneTimeS) : "0:00"}</span><span>${active ? clock(active.durationS) : "0:00"}</span></div>
      <div class="scene-controls">
        <button class="scene-btn primary" data-scene-act="play">${playLabel}</button>
        <button class="scene-btn" data-scene-act="pause">${t("scene.pause")}</button>
        <button class="scene-btn" data-scene-act="restart">${t("scene.restart")}</button>
        <button class="scene-btn" data-scene-act="stop">${t("scene.stop")}</button>
      </div>
      <div class="scene-controls">
        ${canRec ? `<button class="scene-btn" data-scene-act="rec">${rec ? "■ " + t("scene.record_stop") : "● " + t("scene.record")}</button>` : ""}
        <button class="scene-btn" data-scene-act="link">${t("scene.copy_link")}</button>
        <a class="scene-btn scene-link" href="models.html" target="_blank" rel="noopener">${t("scene.model_lab")}</a>
      </div>
      <label class="scene-check"><input type="checkbox" data-scene-act="hidehud" ${this.hideHud ? "checked" : ""}/> ${t("scene.hide_hud")}</label>
      <div class="scene-hint">${t("scene.hint")}</div>${toastHtml}`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
