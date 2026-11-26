import { overlaysActiveAt, typedText, vitalsAt, type OverlayItem } from "./overlays";
import "./overlay.css";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]);

interface View {
  el: HTMLElement;
  item: OverlayItem;
  leaving: boolean;
}

/**
 * Standalone DOM layer (not part of the HUD) so overlays stay on screen when the HUD is hidden for a clean take.
 * `update` is called every frame with the scene's items and the scene-relative time; the same time always yields
 * the same picture.
 */
export class OverlayLayer {
  private root: HTMLElement;
  private views = new Map<string, View>();
  private voiceStack: HTMLElement;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.id = "demo-overlay";
    this.root.className = "demo-overlay";
    this.voiceStack = document.createElement("div");
    this.voiceStack.className = "ov-voice-stack";
    this.root.appendChild(this.voiceStack);
    parent.appendChild(this.root);
  }

  /** Removes every overlay immediately (scene change or stop). */
  clear(): void {
    for (const v of this.views.values()) v.el.remove();
    this.views.clear();
  }

  update(items: readonly OverlayItem[] | undefined, tRel: number): void {
    const active = items ? overlaysActiveAt(items, tRel) : [];
    const activeIds = new Set(active.map((i) => i.id));
    for (const [id, v] of this.views) {
      if (activeIds.has(id) || v.leaving) continue;
      v.leaving = true;
      v.el.classList.add("out");
      window.setTimeout(() => {
        v.el.remove();
        if (this.views.get(id) === v) this.views.delete(id);
      }, 450);
    }
    for (const item of active) {
      let v = this.views.get(item.id);
      if (!v || v.leaving) {
        if (v) v.el.remove();
        v = { el: this.create(item), item, leaving: false };
        this.views.set(item.id, v);
      }
      this.refresh(v.el, item, tRel);
    }
  }

  private create(item: OverlayItem): HTMLElement {
    const el = document.createElement("div");
    el.className = `ov ov-${item.kind}`;
    el.dataset.id = item.id;
    switch (item.kind) {
      case "card": {
        el.classList.add(`side-${item.side}`);
        const stats = item.stats
          ? `<div class="ov-stats">${item.stats
              .map((s, n) => `<div class="ov-stat" style="animation-delay:${0.9 + n * 0.28}s"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`)
              .join("")}</div>`
          : "";
        const bullets = item.bullets
          ? `<ul class="ov-bullets">${item.bullets.map((b, n) => `<li style="animation-delay:${0.8 + n * 0.55}s">${esc(b)}</li>`).join("")}</ul>`
          : "";
        el.innerHTML =
          `<div class="ov-kicker">${esc(item.kicker)}</div><div class="ov-title">${esc(item.title)}</div>` +
          (item.subtitle ? `<div class="ov-sub">${esc(item.subtitle)}</div>` : "") +
          stats +
          bullets +
          (item.note ? `<div class="ov-note">${esc(item.note)}</div>` : "");
        this.root.appendChild(el);
        break;
      }
      case "flow":
        el.innerHTML =
          `<div class="ov-kicker">${esc(item.kicker)}</div><div class="ov-title">${esc(item.title)}</div><div class="ov-steps">` +
          item.steps
            .map((s, n) => `<div class="ov-step" style="animation-delay:${0.8 + n * 0.9}s"><b>${esc(s.label)}</b><span>${esc(s.detail)}</span></div>`)
            .join('<i class="ov-arrow">&#9654;</i>') +
          "</div>";
        this.root.appendChild(el);
        break;
      case "voice":
        el.classList.add(`who-${item.who}`);
        el.innerHTML =
          `<div class="ov-who">${item.who === "crew" ? '<span class="ov-wave"><i></i><i></i><i></i><i></i><i></i></span>' : ""}${esc(item.speaker)}</div>` +
          '<div class="ov-text"></div>';
        this.voiceStack.appendChild(el);
        break;
      case "coords":
        el.innerHTML = `<span class="ov-pin">&#9673;</span><b>${esc(item.label)}</b><span>${esc(item.lat)} &middot; ${esc(item.lon)}</span>`;
        this.root.appendChild(el);
        break;
      case "lower":
        el.innerHTML = `<b>${esc(item.title)}</b>${item.detail ? `<span>${esc(item.detail)}</span>` : ""}`;
        this.root.appendChild(el);
        break;
      case "decision":
        el.innerHTML =
          `<div class="ov-kicker">${esc(item.kicker)}</div><div class="ov-title">${esc(item.title)}</div>` +
          `<div class="ov-order">&ldquo;${esc(item.order)}&rdquo;</div><div class="ov-stages"></div><div class="ov-verdict"></div>`;
        this.root.appendChild(el);
        break;
      case "grid":
        el.innerHTML =
          `<div class="ov-kicker">${esc(item.kicker)}</div><div class="ov-title">${esc(item.title)}</div><div class="ov-chips">` +
          item.chips
            .map((c, n) => `<div class="ov-chip" style="animation-delay:${0.6 + n * 0.45}s"><b>${esc(c.label)}</b><span>${esc(c.detail)}</span></div>`)
            .join("") +
          "</div>";
        this.root.appendChild(el);
        break;
      case "vitals":
        el.innerHTML = `<div class="ov-vhdr">${esc(item.title)}</div><div class="ov-vrows"></div><div class="ov-vevents"></div>`;
        this.root.appendChild(el);
        break;
    }
    return el;
  }

  private refresh(el: HTMLElement, item: OverlayItem, tRel: number): void {
    if (item.kind === "voice") {
      const text = el.querySelector(".ov-text") as HTMLElement;
      const shown = typedText(item.text, tRel - item.fromS, item.who === "crew" ? 26 : 44);
      if (text.textContent !== shown) text.textContent = shown;
    } else if (item.kind === "decision") {
      const t = tRel - item.fromS;
      const rows = item.stages
        .filter((s) => t >= s.atS)
        .map((s) => {
          const votes = s.votes
            ? `<span class="ov-votes">${s.votes.map((v) => `<i class="${v.approve ? "yes" : "no"}">${esc(v.model)} ${v.approve ? "approve" : "reject"}</i>`).join("")}</span>`
            : "";
          const mark = s.result === "fail" ? "&#10005;" : "&#10003;";
          const cls = s.result === "fail" ? "fail" : s.votes?.some((v) => !v.approve) ? "warn" : "pass";
          return `<div class="ov-stage ${cls}"><span class="ov-mark">${mark}</span><span class="ov-sname">${esc(s.name)}</span><span class="ov-sdet">${esc(s.detail)}</span>${votes}</div>`;
        })
        .join("");
      const pending = item.stages.find((s) => t < s.atS);
      const html = rows + (pending ? `<div class="ov-stage run"><span class="ov-mark">&#8230;</span><span class="ov-sname">${esc(pending.name)}</span><span class="ov-sdet">checking</span></div>` : "");
      const stages = el.querySelector(".ov-stages") as HTMLElement;
      if (stages.dataset.key !== html) {
        stages.dataset.key = html;
        stages.innerHTML = html;
      }
      const verdict = el.querySelector(".ov-verdict") as HTMLElement;
      const vHtml = t >= item.verdict.atS ? `<div class="ov-stamp ${item.verdict.level}">${esc(item.verdict.text)}</div>` : "";
      if (verdict.dataset.key !== vHtml) {
        verdict.dataset.key = vHtml;
        verdict.innerHTML = vHtml;
      }
    } else if (item.kind === "vitals") {
      const v = vitalsAt(item.keys, tRel);
      const row = (label: string, value: string, level: "ok" | "warn" | "crit"): string =>
        `<div class="ov-vrow ${level}"><span>${label}</span><b>${value}</b></div>`;
      const o2Level = v.o2Pct < 25 ? "crit" : v.o2Pct < 60 ? "warn" : "ok";
      const paLevel = v.pao2Kpa < 8 ? "crit" : v.pao2Kpa < 10 ? "warn" : "ok";
      const coLevel = v.co2Pa > 667 ? "crit" : v.co2Pa > 400 ? "warn" : "ok";
      (el.querySelector(".ov-vrows") as HTMLElement).innerHTML =
        row("Primary O2", `${v.o2Pct.toFixed(0)} %`, o2Level) +
        row("Alveolar pO2", `${v.pao2Kpa.toFixed(1)} kPa`, paLevel) +
        row("CO2 partial", `${v.co2Pa.toFixed(0)} Pa`, coLevel) +
        row("Battery", `${v.batteryWh.toFixed(0)} Wh`, "ok");
      const html = (item.events ?? [])
        .filter((e) => tRel >= e.atS)
        .map((e) => `<div class="ov-vevent">${esc(e.text)}</div>`)
        .join("");
      const evEl = el.querySelector(".ov-vevents") as HTMLElement;
      if (evEl.dataset.key !== html) {
        evEl.dataset.key = html;
        evEl.innerHTML = html;
      }
    }
  }
}
