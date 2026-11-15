import { describe, expect, it } from "vitest";
import { NARRATION, NarrationFeeder, buildNarration, type NarrationCtx, type NarrationLine } from "../rescueNarration";

const EVENTS: Record<string, number> = {
  rover_fault: 50,
  crew3_fall: 55,
  storm_onset: 60,
  base_decision: 62,
  rescue1_dispatch: 64,
  ask_human: 66,
  drones_launch: 68,
  drones_on_station: 90,
  drones_grounded: 122,
  rescue1_arrive: 130,
  robot_deploy: 134,
  robot_descend: 140,
  robot_secure: 150,
  robot_drag: 160,
  crew_boarded: 172,
  convoy_departure: 176,
};

const ctx: NarrationCtx = {
  eventT: (id) => EVENTS[id] ?? null,
  pos: (id) => (id === "pit" || id === "YACONIS" || id === "SOTELO" ? { x: 1420, z: 648 } : { x: 1400, z: 640 }),
  tau: (t) => 0.5 + t / 40,
  coords: (x, z) => `${x},${z}`,
  standoffM: 25,
};

// Echo translator: reveals the key and the filled parameters.
const tr = (key: string, p: Record<string, string | number>) => `${key}|${JSON.stringify(p)}`;

describe("buildNarration", () => {
  it("produces one line per spec, sorted by time, anchored to the events", () => {
    const lines = buildNarration(ctx, tr);
    expect(lines).toHaveLength(NARRATION.length);
    expect([...lines].sort((a, b) => a.tS - b.tS)).toEqual(lines);
    expect(lines.find((l) => l.id === "crew3_fall")!.tS).toBeCloseTo(56, 5);
    expect(lines.find((l) => l.id === "pod_trajectory")!.tS).toBeCloseTo(66.5, 5);
  });

  it("moves with the events when the scenario is re-timed", () => {
    const shifted: NarrationCtx = { ...ctx, eventT: (id) => (EVENTS[id] === undefined ? null : EVENTS[id] + 10) };
    const a = buildNarration(ctx, tr);
    const b = buildNarration(shifted, tr);
    for (const l of a) expect(b.find((x) => x.id === l.id)!.tS).toBeCloseTo(l.tS + 10, 5);
  });

  it("skips specs whose anchor event does not exist", () => {
    const partial: NarrationCtx = { ...ctx, eventT: (id) => (id === "crew3_fall" ? 55 : null) };
    expect(buildNarration(partial, tr).map((l) => l.id)).toEqual(["crew3_fall"]);
  });

  it("fills the computed values the video needs (distances, ETAs, coordinates)", () => {
    const lines = buildNarration(ctx, tr);
    const get = (id: string) => lines.find((l) => l.id === id)!.text;
    expect(get("drones_launch")).toContain('"eta_s":22');
    expect(get("drones_launch")).toContain('"standoff_m":25');
    expect(get("rescue1_dispatch")).toContain('"eta_s":66');
    expect(get("robot_deploy")).toContain('"robot_eta_s":16');
    expect(get("base_decision")).toContain('"coords_yaconis":"1420,648"');
    expect(get("pod_trajectory")).toContain('"impact_m":32');
    expect(get("storm_onset")).toContain("tau_a");
    expect(get("convoy_departure")).toContain("base_eta_min");
  });
});

class FakeChat {
  lines: NarrationLine[] = [];
  push(l: NarrationLine) {
    this.lines.push(l);
  }
  clear() {
    this.lines = [];
  }
}

describe("NarrationFeeder", () => {
  const lines = buildNarration(ctx, tr);

  it("emits lines as the clock crosses them and only once", () => {
    const chat = new FakeChat();
    const f = new NarrationFeeder(lines, chat);
    f.sync(0, true);
    expect(chat.lines).toHaveLength(0);
    f.sync(57, true);
    expect(chat.lines.map((l) => l.id)).toEqual(["rover_fault", "crew3_fall"]);
    f.sync(57.5, true);
    expect(chat.lines).toHaveLength(2);
  });

  it("refills everything already due after a seek and clears when going backwards", () => {
    const chat = new FakeChat();
    const f = new NarrationFeeder(lines, chat);
    f.sync(110, true);
    const upTo110 = lines.filter((l) => l.tS <= 110).length;
    expect(chat.lines).toHaveLength(upTo110);
    f.sync(45, true);
    expect(chat.lines).toHaveLength(0);
    f.sync(60.5, true);
    expect(chat.lines.every((l) => l.tS <= 60.5)).toBe(true);
  });

  it("clears the chat when the scenario stops being active", () => {
    const chat = new FakeChat();
    const f = new NarrationFeeder(lines, chat);
    f.sync(100, true);
    expect(chat.lines.length).toBeGreaterThan(0);
    f.sync(100, false);
    expect(chat.lines).toHaveLength(0);
  });
});
