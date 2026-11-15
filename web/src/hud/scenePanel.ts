import { fmt, onLangChange, t } from "@th/shared";
import type { SceneDirector } from "../world/sceneDirector";
import "./scenePanel.css";

export interface ScenePanelOptions {
  /** Shows or hides the tactical HUD (used for clean takes). */
  setHudVisible(visible: boolean): void;
}

function clock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Panel to pick a recorded scene and play it. It is standalone DOM (not part of the HUD innerHTML)
 * so HUD re-renders never reset it, and it fades out during a take when the HUD is hidden.
 */
export class ScenePanel {
  private root: HTMLElement;
  private open = false;
  private hideHud = true;
  private lastKey = "";

  constructor(
    private director: SceneDirector,
    private opts: ScenePanelOptions,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement("div");
    this.root.id = "scene-panel";
    this.root.className = "scene-panel";
    parent.appendChild(this.root);
    this.root.addEventListener("click", (e) => this.onClick(e));
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
    } else if (act === "hidehud") this.hideHud = !this.hideHud;
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
    if (d.state === "done") this.opts.setHudVisible(true);
    const active = d.active;
    const timeS = Math.floor(d.sceneTimeS);
    const key = [this.open, d.state, d.activeId, timeS, this.hideHud].join("|");
    if (key === this.lastKey) return;
    this.lastKey = key;

    const taking = d.state === "playing" || d.state === "paused";
    this.root.classList.toggle("clean", taking && this.hideHud);
    this.root.classList.toggle("open", this.open);

    if (!this.open) {
      this.root.innerHTML = `<button class="scene-btn scene-open" data-scene-act="toggle">${t("scene.open")}</button>`;
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
      <div class="scene-head"><span>${t("scene.title")}</span><span class="scene-state ${d.state}">${stateLabel}</span><button class="scene-btn" data-scene-act="toggle">×</button></div>
      <div class="scene-list">${rows}</div>
      <div class="scene-bar"><div style="width:${fmt(pct, 0)}%"></div></div>
      <div class="scene-time-row"><span>${active ? clock(d.sceneTimeS) : "0:00"}</span><span>${active ? clock(active.durationS) : "0:00"}</span></div>
      <div class="scene-controls">
        <button class="scene-btn primary" data-scene-act="play">${playLabel}</button>
        <button class="scene-btn" data-scene-act="pause">${t("scene.pause")}</button>
        <button class="scene-btn" data-scene-act="restart">${t("scene.restart")}</button>
        <button class="scene-btn" data-scene-act="stop">${t("scene.stop")}</button>
      </div>
      <label class="scene-check"><input type="checkbox" data-scene-act="hidehud" ${this.hideHud ? "checked" : ""}/> ${t("scene.hide_hud")}</label>
      <div class="scene-hint">${t("scene.hint")}</div>`;
  }
}
