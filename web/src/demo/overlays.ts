/**
 * Overlay items shown over a recorded take. Each item lives in scene-relative seconds (`fromS` to `toS`), so the
 * same scene always shows the same overlay at the same moment and the take can be re-recorded without changes.
 */

interface Timed {
  /** Unique within a scene. */
  id: string;
  fromS: number;
  toS: number;
}

/** Large explanatory card: kicker, title, optional subtitle, bullets that appear one after another, stat chips. */
export interface CardItem extends Timed {
  kind: "card";
  /** `left` keeps the 3D scene visible on the right; `center` is for covers and closings. */
  side: "left" | "center";
  kicker: string;
  title: string;
  /** Icon shown beside the title (name from `icons.ts`). */
  icon?: string;
  subtitle?: string;
  bullets?: string[];
  /** One icon per bullet, same order. */
  bulletIcons?: string[];
  stats?: { value: string; label: string; icon?: string }[];
  /** Small print under the card (limits, sources). */
  note?: string;
}

/** Left-to-right flow of boxes that appear in order, optionally on several rows. */
export interface FlowItem extends Timed {
  kind: "flow";
  kicker: string;
  title: string;
  steps: { label: string; detail: string; icon?: string }[];
}

/** One line of the scripted voice conversation. `crew` lines show a waveform and type out like speech. */
export interface VoiceItem extends Timed {
  kind: "voice";
  who: "crew" | "agent" | "guardian";
  speaker: string;
  text: string;
  /** Overrides the default icon of the speaker. */
  icon?: string;
}

/** Coordinates chip. */
export interface CoordsItem extends Timed {
  kind: "coords";
  label: string;
  lat: string;
  lon: string;
}

/** Lower-third caption (status line). */
export interface LowerItem extends Timed {
  kind: "lower";
  title: string;
  detail?: string;
  icon?: string;
  /** `alert` draws the caption as a flashing red alarm. */
  level?: "info" | "alert";
}

export interface VitalsKey {
  /** Scene-relative seconds. */
  atS: number;
  o2Pct: number;
  pao2Kpa: number;
  co2Pa: number;
  batteryWh: number;
}

/** Scripted mini life-support panel; values are interpolated between keys. */
export interface VitalsItem extends Timed {
  kind: "vitals";
  title: string;
  keys: VitalsKey[];
  /** Short event captions that appear at `atS` and stay until the item ends. */
  events?: { atS: number; text: string }[];
}

/** One order walked through GUARDIAN: stages light up in order and a verdict stamp closes the case. */
export interface DecisionItem extends Timed {
  kind: "decision";
  kicker: string;
  title: string;
  /** The order being judged. */
  order: string;
  stages: {
    /** Seconds after `fromS` at which the stage resolves. */
    atS: number;
    name: string;
    detail: string;
    result: "pass" | "fail" | "vote";
    votes?: { model: string; approve: boolean }[];
  }[];
  verdict: { atS: number; text: string; level: "allow" | "ask" | "deny" };
}

/** Grid of capability chips that appear one after another. */
export interface GridItem extends Timed {
  kind: "grid";
  kicker: string;
  title: string;
  chips: { label: string; detail: string; icon?: string }[];
  /** Columns of the grid (default 4). */
  cols?: number;
}

export type GraphTone = "crew" | "agent" | "guard" | "robot" | "world";

/** Box of the animated decision graph. Coordinates are in a 100 x 56 drawing space. */
export interface GraphNode {
  id: string;
  label: string;
  detail?: string;
  x: number;
  y: number;
  w?: number;
  tone: GraphTone;
  icon?: string;
  /** Seconds after the item starts at which the box appears. */
  atS: number;
}

/** Arrow that is drawn, with a travelling pulse, at `atS`. */
export interface GraphEdge {
  from: string;
  to: string;
  atS: number;
  /** Short caption on the arrow. */
  label?: string;
}

/** Robot or crew marker moving over the map zone; positions are linear between keys. */
export interface GraphToken {
  id: string;
  label: string;
  tone: GraphTone;
  path: { atS: number; x: number; y: number }[];
}

/** Map zone inside the drawing (top view): a frame plus fixed markers and dashed rings. */
export interface GraphMap {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** Draws the live cartography (real terrain relief, fleet, crew and agent routes) instead of the schematic frame. */
  live?: boolean;
  /** `r` in drawing units; a ring is dashed. */
  marks: { x: number; y: number; label: string; r?: number; tone: GraphTone }[];
}

/** Animated decision logic: boxes and arrows appear in order and robots move over a top-view map. */
export interface GraphItem extends Timed {
  kind: "graph";
  kicker: string;
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  tokens?: GraphToken[];
  map?: GraphMap;
}

/** Still picture with a caption (for example the rescue robot towing a casualty). */
export interface ImageItem extends Timed {
  kind: "image";
  src: string;
  caption: string;
  /** Defaults to the top-right corner; `banner` centres a wide header picture at the top of the screen. */
  place?: "top-right" | "mid-right" | "banner" | "patch";
}

/** Large live map of the zone (the NASA and USGS style map of the HUD) with crew, robots and the planned route. */
export interface MapItem extends Timed {
  kind: "map";
  kicker: string;
  title: string;
  /** Short lines under the map (algorithm, distance, what the markers are). */
  caption?: string;
}

/** Row of partner logos with a heading, for the cover and the closing slide. */
export interface LogosItem extends Timed {
  kind: "logos";
  heading: string;
  /** One line under the logos (for example the local node of the event). */
  footer?: string;
  logos: { src: string; name: string; sub?: string }[];
}

/** Helmet visor frame: vignette, reticle and a label, for point-of-view shots. */
export interface VisorItem extends Timed {
  kind: "visor";
  label: string;
}

/**
 * Glow on a part of the live HUD, with a short callout (icon and label) beside it. `target` is a CSS selector of
 * the HUD element; the glow follows the item window, so the tour is identical on every take.
 */
export interface GlowItem extends Timed {
  kind: "glow";
  target: string;
  label: string;
  detail?: string;
  icon?: string;
  /** Callout side relative to the element (default: the side with more room). */
  side?: "left" | "right" | "above" | "below";
}

export type OverlayItem = MapItem | LogosItem | GlowItem | CardItem | FlowItem | VoiceItem | CoordsItem | LowerItem | VitalsItem | DecisionItem | GridItem | GraphItem | ImageItem | VisorItem;

/** Items visible at `tRel` seconds after the scene start. */
export function overlaysActiveAt(items: readonly OverlayItem[], tRel: number): OverlayItem[] {
  return items.filter((i) => tRel >= i.fromS && tRel < i.toS);
}

/** Part of `text` revealed `elapsedS` seconds after the line started, at `cps` characters per second. */
export function typedText(text: string, elapsedS: number, cps = 32): string {
  return text.slice(0, Math.max(0, Math.min(text.length, Math.floor(elapsedS * cps))));
}

/** Linear interpolation of the scripted vitals at `tRel`; clamps before the first and after the last key. */
export function vitalsAt(keys: readonly VitalsKey[], tRel: number): VitalsKey {
  if (keys.length === 0) throw new Error("vitals keys are empty");
  if (tRel <= keys[0].atS) return keys[0];
  const last = keys[keys.length - 1];
  if (tRel >= last.atS) return last;
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].atS <= tRel) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const u = (tRel - a.atS) / (b.atS - a.atS);
  const mix = (x: number, y: number) => x + (y - x) * u;
  return {
    atS: tRel,
    o2Pct: mix(a.o2Pct, b.o2Pct),
    pao2Kpa: mix(a.pao2Kpa, b.pao2Kpa),
    co2Pa: mix(a.co2Pa, b.co2Pa),
    batteryWh: mix(a.batteryWh, b.batteryWh),
  };
}

/** Position of a token at `t` seconds after the item start; clamps before the first and after the last key. */
export function tokenAt(path: GraphToken["path"], t: number): { x: number; y: number } {
  if (path.length === 0) throw new Error("token path is empty");
  if (t <= path[0].atS) return { x: path[0].x, y: path[0].y };
  const last = path[path.length - 1];
  if (t >= last.atS) return { x: last.x, y: last.y };
  let i = 0;
  while (i + 1 < path.length && path[i + 1].atS <= t) i++;
  const a = path[i];
  const b = path[i + 1];
  const u = (t - a.atS) / (b.atS - a.atS);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** Seconds a graph arrow takes to draw. */
export const EDGE_DRAW_S = 0.9;

/** Throws a readable message when a scene's overlay list is inconsistent (used by tests). */
export function validateOverlays(items: readonly OverlayItem[], durationS: number): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const i of items) {
    if (ids.has(i.id)) problems.push(`duplicate id ${i.id}`);
    ids.add(i.id);
    if (!(i.fromS >= 0 && i.toS > i.fromS)) problems.push(`${i.id}: bad window`);
    if (i.toS > durationS + 1e-9) problems.push(`${i.id}: ends after the scene`);
    if (i.kind === "graph") {
      const nodeIds = new Set(i.nodes.map((n) => n.id));
      for (const e of i.edges) if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) problems.push(`${i.id}: edge ${e.from}->${e.to} has no box`);
      for (const k of i.tokens ?? []) if (k.path.some((p, n) => n > 0 && p.atS <= k.path[n - 1].atS)) problems.push(`${i.id}: token ${k.id} keys not increasing`);
      for (const n of i.nodes) if (n.atS > i.toS - i.fromS) problems.push(`${i.id}: box ${n.id} appears after the item ends`);
    }
    if (i.kind === "vitals" && i.keys.some((k, n) => n > 0 && k.atS <= i.keys[n - 1].atS)) problems.push(`${i.id}: keys not increasing`);
  }
  return problems;
}
