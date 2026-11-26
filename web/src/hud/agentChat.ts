import type { NarrationLine, NarrationSink } from "../world/rescueNarration";
import "./agentChat.css";

const MAX_VISIBLE = 7;

function clock(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Chat log of the orchestrator agent for the rescue video. It is standalone DOM (not part of the HUD innerHTML)
 * so it stays on screen when the HUD is hidden for a clean take; it moves down to use the freed space.
 */
export class AgentChat implements NarrationSink {
  private root: HTMLElement;
  private list: HTMLElement;
  private shown = 0;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement("div");
    this.root.id = "agent-chat";
    this.root.className = "agent-chat";
    this.root.style.display = "none";
    this.root.innerHTML = `<div class="agent-chat-hdr"><span>BASE · AGENT</span><span class="agent-chat-live">●</span></div><div class="agent-chat-list"></div>`;
    this.list = this.root.querySelector(".agent-chat-list") as HTMLElement;
    parent.appendChild(this.root);
  }

  push(line: NarrationLine): void {
    const row = document.createElement("div");
    row.className = "agent-chat-row";
    const meta = document.createElement("div");
    meta.className = "agent-chat-meta";
    meta.textContent = `${clock(line.tS)} · ${line.agent}`;
    const text = document.createElement("div");
    text.className = "agent-chat-text";
    text.textContent = line.text;
    row.append(meta, text);
    this.list.appendChild(row);
    while (this.list.children.length > MAX_VISIBLE) this.list.firstElementChild?.remove();
    this.shown = this.list.children.length;
    this.root.style.display = "block";
    this.list.scrollTop = this.list.scrollHeight;
  }

  clear(): void {
    this.list.replaceChildren();
    this.shown = 0;
    this.root.style.display = "none";
  }

  /** Hides the log while an explained-video scene shows its own conversation overlay. */
  setSuppressed(suppressed: boolean): void {
    this.root.style.visibility = suppressed ? "hidden" : "visible";
  }

  /** Call every frame: lifts the chat above the crew roster while the HUD is visible. */
  update(hudVisible: boolean): void {
    this.root.classList.toggle("hud-on", hudVisible);
  }

  get lineCount(): number {
    return this.shown;
  }
}
