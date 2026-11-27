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
  subtitle?: string;
  bullets?: string[];
  stats?: { value: string; label: string }[];
  /** Small print under the card (limits, sources). */
  note?: string;
}

/** Left-to-right flow of boxes that appear in order, optionally on several rows. */
export interface FlowItem extends Timed {
  kind: "flow";
  kicker: string;
  title: string;
  steps: { label: string; detail: string }[];
}

/** One line of the scripted voice conversation. `crew` lines show a waveform and type out like speech. */
export interface VoiceItem extends Timed {
  kind: "voice";
  who: "crew" | "agent" | "guardian";
  speaker: string;
  text: string;
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
  chips: { label: string; detail: string }[];
}

export type OverlayItem = CardItem | FlowItem | VoiceItem | CoordsItem | LowerItem | VitalsItem | DecisionItem | GridItem;

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

/** Throws a readable message when a scene's overlay list is inconsistent (used by tests). */
export function validateOverlays(items: readonly OverlayItem[], durationS: number): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const i of items) {
    if (ids.has(i.id)) problems.push(`duplicate id ${i.id}`);
    ids.add(i.id);
    if (!(i.fromS >= 0 && i.toS > i.fromS)) problems.push(`${i.id}: bad window`);
    if (i.toS > durationS + 1e-9) problems.push(`${i.id}: ends after the scene`);
    if (i.kind === "vitals" && i.keys.some((k, n) => n > 0 && k.atS <= i.keys[n - 1].atS)) problems.push(`${i.id}: keys not increasing`);
  }
  return problems;
}
