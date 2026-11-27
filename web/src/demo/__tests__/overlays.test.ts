import { describe, expect, it } from "vitest";
import { SCENES } from "../../world/sceneDirector";
import { DECK_ORDER } from "../demoScenes";
import { overlaysActiveAt, tokenAt, typedText, validateOverlays, vitalsAt, type OverlayItem } from "../overlays";

describe("overlay timing helpers", () => {
  const items: OverlayItem[] = [
    { id: "a", kind: "lower", fromS: 1, toS: 3, title: "A" },
    { id: "b", kind: "lower", fromS: 2, toS: 5, title: "B" },
  ];

  it("returns the items whose window contains the time", () => {
    expect(overlaysActiveAt(items, 0.5)).toHaveLength(0);
    expect(overlaysActiveAt(items, 2.5).map((i) => i.id)).toEqual(["a", "b"]);
    expect(overlaysActiveAt(items, 3).map((i) => i.id)).toEqual(["b"]);
  });

  it("types text at a fixed rate and clamps", () => {
    expect(typedText("hello", 0)).toBe("");
    expect(typedText("hello", 0.1, 20)).toBe("he");
    expect(typedText("hello", 10)).toBe("hello");
  });

  it("interpolates the scripted vitals and clamps outside the keys", () => {
    const keys = [
      { atS: 0, o2Pct: 100, pao2Kpa: 10, co2Pa: 100, batteryWh: 500 },
      { atS: 10, o2Pct: 50, pao2Kpa: 6, co2Pa: 300, batteryWh: 400 },
    ];
    expect(vitalsAt(keys, -1).o2Pct).toBe(100);
    expect(vitalsAt(keys, 5).o2Pct).toBeCloseTo(75);
    expect(vitalsAt(keys, 5).co2Pa).toBeCloseTo(200);
    expect(vitalsAt(keys, 99).batteryWh).toBe(400);
  });

  it("reports inconsistent windows", () => {
    const bad: OverlayItem[] = [
      { id: "x", kind: "lower", fromS: 5, toS: 4, title: "bad" },
      { id: "x", kind: "lower", fromS: 0, toS: 99, title: "dup" },
    ];
    expect(validateOverlays(bad, 10)).toHaveLength(3);
  });
});

describe("graph overlays", () => {
  it("moves a token linearly between keys and clamps at the ends", () => {
    const path = [
      { atS: 2, x: 0, y: 0 },
      { atS: 6, x: 40, y: 20 },
    ];
    expect(tokenAt(path, 0)).toEqual({ x: 0, y: 0 });
    expect(tokenAt(path, 4)).toEqual({ x: 20, y: 10 });
    expect(tokenAt(path, 99)).toEqual({ x: 40, y: 20 });
  });

  it("reports arrows that point at a missing box", () => {
    const g: OverlayItem[] = [
      { id: "g", kind: "graph", fromS: 0, toS: 10, kicker: "k", title: "t", nodes: [{ id: "a", label: "A", x: 10, y: 10, tone: "agent", atS: 1 }], edges: [{ from: "a", to: "zz", atS: 2 }] },
    ];
    expect(validateOverlays(g, 10)).toHaveLength(1);
  });
});

describe("explained-video scenes", () => {
  it("defines every deck scene and keeps each overlay inside its scene", () => {
    const ids = new Set(SCENES.map((s) => s.id));
    for (const id of DECK_ORDER) expect(ids.has(id), id).toBe(true);
    for (const s of SCENES) {
      if (s.overlay) expect(validateOverlays(s.overlay, s.durationS), s.id).toEqual([]);
    }
  });

  it("plays under ten minutes of footage", () => {
    const total = DECK_ORDER.reduce((sum, id) => sum + (SCENES.find((s) => s.id === id)?.durationS ?? 0), 0);
    expect(total).toBeGreaterThan(300);
    expect(total).toBeLessThan(660);
  });
});
