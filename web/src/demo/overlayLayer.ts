import { EDGE_DRAW_S, overlaysActiveAt, tokenAt, typedText, vitalsAt, type GraphItem, type OverlayItem } from "./overlays";
import "./overlay.css";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]);

const NODE_H = 7.6;
const NODE_W = 30;
const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';

/** Anchor points of an arrow between two boxes: bottom to top when the target is below, otherwise side to side. */
function edgeEnds(a: GraphItem["nodes"][number], b: GraphItem["nodes"][number]): { x1: number; y1: number; x2: number; y2: number } {
  const aw = a.w ?? NODE_W;
  const bw = b.w ?? NODE_W;
  if (b.y - a.y >= NODE_H) return { x1: a.x, y1: a.y + NODE_H / 2, x2: b.x, y2: b.y - NODE_H / 2 };
  if (b.x >= a.x) return { x1: a.x + aw / 2, y1: a.y, x2: b.x - bw / 2, y2: b.y };
  return { x1: a.x - aw / 2, y1: a.y, x2: b.x + bw / 2, y2: b.y };
}

function graphSvg(item: GraphItem, uid: string): string {
  const byId = new Map(item.nodes.map((n) => [n.id, n]));
  let out = `<svg ${SVG_NS} viewBox="0 0 100 56" class="ov-graph-svg"><defs><marker id="${uid}-ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="2.4" markerHeight="2.4" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="currentColor"/></marker></defs>`;
  if (item.map) {
    const m = item.map;
    out += `<g class="g-map"><rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}"/><text x="${m.x + 1.2}" y="${m.y + 2.6}" class="g-maplabel">${esc(m.label)}</text>`;
    for (const k of m.marks) {
      if (k.r) out += `<circle cx="${k.x}" cy="${k.y}" r="${k.r}" class="g-ring tone-${k.tone}"/>`;
      out += `<circle cx="${k.x}" cy="${k.y}" r="0.9" class="g-mark tone-${k.tone}"/><text x="${k.x + 1.5}" y="${k.y + 0.7}" class="g-marklabel">${esc(k.label)}</text>`;
    }
    out += "</g>";
  }
  item.edges.forEach((e, i) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) return;
    const { x1, y1, x2, y2 } = edgeEnds(a, b);
    out += `<g class="g-edge" data-i="${i}" style="opacity:0"><path d="M${x1},${y1} L${x2},${y2}" pathLength="1" marker-end="url(#${uid}-ah)"/><circle r="0.75" class="g-pulse" data-x1="${x1}" data-y1="${y1}" data-x2="${x2}" data-y2="${y2}"/>`;
    if (e.label) out += `<text x="${(x1 + x2) / 2 + 1.2}" y="${(y1 + y2) / 2 + 0.6}" class="g-elabel">${esc(e.label)}</text>`;
    out += "</g>";
  });
  item.nodes.forEach((n, i) => {
    const w = n.w ?? NODE_W;
    out += `<g class="g-node tone-${n.tone}" data-i="${i}" style="opacity:0"><rect x="${n.x - w / 2}" y="${n.y - NODE_H / 2}" width="${w}" height="${NODE_H}"/><text x="${n.x}" y="${n.y - (n.detail ? 0.6 : -0.7)}" class="g-label">${esc(n.label)}</text>`;
    if (n.detail) out += `<text x="${n.x}" y="${n.y + 2.1}" class="g-detail">${esc(n.detail)}</text>`;
    out += "</g>";
  });
  (item.tokens ?? []).forEach((k, i) => {
    out += `<g class="g-token tone-${k.tone}" data-i="${i}" style="opacity:0"><circle r="1.5" class="g-tring"/><circle r="0.8"/><text y="-2.1" class="g-tlabel">${esc(k.label)}</text></g>`;
  });
  return out + "</svg>";
}

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
  private brand: HTMLImageElement;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.id = "demo-overlay";
    this.root.className = "demo-overlay";
    this.brand = document.createElement("img");
    this.brand.className = "ov-brand";
    this.brand.src = "/images/th-logo-192.jpg";
    this.brand.alt = "Tango Horizon";
    this.brand.style.display = "none";
    this.root.appendChild(this.brand);
    this.voiceStack = document.createElement("div");
    this.voiceStack.className = "ov-voice-stack";
    this.root.appendChild(this.voiceStack);
    parent.appendChild(this.root);
  }

  /** Shows the project logo in a corner while a take or presentation is running. */
  setBrand(visible: boolean): void {
    this.brand.style.display = visible ? "block" : "none";
  }

  /** Removes every overlay immediately (scene change or stop). */
  clear(): void {
    for (const v of this.views.values()) v.el.remove();
    this.views.clear();
  }

  update(items: readonly OverlayItem[] | undefined, tRel: number): void {
    const active = items ? overlaysActiveAt(items, tRel) : [];
    const activeIds = new Set(active.map((i) => i.id));
    this.root.classList.toggle("has-graph", active.some((i) => i.kind === "graph"));
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
        if (item.level === "alert") el.classList.add("alert");
        el.innerHTML = `<b>${esc(item.title)}</b>${item.detail ? `<span>${esc(item.detail)}</span>` : ""}`;
        this.root.appendChild(el);
        break;
      case "decision":
        el.innerHTML =
          `<div class="ov-kicker">${esc(item.kicker)}</div><div class="ov-title">${esc(item.title)}</div>` +
          `<div class="ov-order">&ldquo;${esc(item.order)}&rdquo;</div><div class="ov-stages"></div><div class="ov-verdict"></div>`;
        this.root.appendChild(el);
        break;
      case "image":
        el.classList.add(item.place ?? "top-right");
        el.innerHTML = `<img src="${esc(item.src)}" alt="${esc(item.caption)}" /><div class="ov-cap">${esc(item.caption)}</div>`;
        this.root.appendChild(el);
        break;
      case "visor":
        el.innerHTML = `<div class="ov-visor-ring"></div><div class="ov-visor-label">${esc(item.label)}</div><div class="ov-visor-reticle"></div>`;
        this.root.insertBefore(el, this.root.firstChild);
        break;
      case "graph":
        el.innerHTML = `<div class="ov-kicker">${esc(item.kicker)}</div><div class="ov-title">${esc(item.title)}</div>${graphSvg(item, `g-${item.id}`)}`;
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
    } else if (item.kind === "graph") {
      this.refreshGraph(el, item, tRel - item.fromS);
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

  /** Deterministic state of the graph at `t` seconds after it started: boxes, arrows, pulses and robot markers. */
  private refreshGraph(el: HTMLElement, item: GraphItem, t: number): void {
    const fade = (since: number): number => Math.max(0, Math.min(1, since / 0.45));
    el.querySelectorAll<SVGGElement>(".g-node").forEach((g) => {
      const n = item.nodes[Number(g.dataset.i)];
      g.style.opacity = String(fade(t - n.atS));
      g.classList.toggle("hot", t >= n.atS && t < n.atS + 2.2);
    });
    el.querySelectorAll<SVGGElement>(".g-edge").forEach((g) => {
      const e = item.edges[Number(g.dataset.i)];
      const p = Math.max(0, Math.min(1, (t - e.atS) / EDGE_DRAW_S));
      g.style.opacity = t >= e.atS ? "1" : "0";
      (g.querySelector("path") as SVGPathElement).style.strokeDashoffset = String(1 - p);
      const dot = g.querySelector(".g-pulse") as SVGCircleElement;
      const u = p < 1 ? p : ((t - e.atS - EDGE_DRAW_S) * 0.7) % 1;
      const x1 = Number(dot.dataset.x1);
      const y1 = Number(dot.dataset.y1);
      dot.setAttribute("cx", String(x1 + (Number(dot.dataset.x2) - x1) * u));
      dot.setAttribute("cy", String(y1 + (Number(dot.dataset.y2) - y1) * u));
    });
    el.querySelectorAll<SVGGElement>(".g-token").forEach((g) => {
      const k = item.tokens?.[Number(g.dataset.i)];
      if (!k) return;
      const pos = tokenAt(k.path, t);
      g.setAttribute("transform", `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`);
      g.style.opacity = String(fade(t - k.path[0].atS));
    });
  }
}
