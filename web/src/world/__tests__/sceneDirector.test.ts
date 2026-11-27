import { describe, expect, it } from "vitest";
import { SCENES, SceneDirector, scenePose, segmentIndexAt, type SceneScenario } from "../sceneDirector";

class FakeScenario implements SceneScenario {
  readonly durationS = 180;
  elapsedS = 0;
  running = false;
  seeks: number[] = [];
  seekTo(tS: number): void {
    this.elapsedS = tS;
    this.seeks.push(tS);
  }
  resume(): void {
    this.running = true;
  }
  pause(): void {
    this.running = false;
  }
  getEntityPosition(id: string) {
    const known: Record<string, { x: number; y: number; z: number }> = {
      base: { x: 0, y: 0, z: 0 },
      "crew-2": { x: 100, y: 0, z: 100 },
      "crew-3": { x: 102, y: -3, z: 100 },
      pit: { x: 102, y: -3, z: 100 },
      "rescue-site": { x: 100, y: 0, z: 100 },
    };
    return known[id] ?? null;
  }
}

const flat = (x: number, z: number) => 0 * x * z;

describe("scene table", () => {
  it("has unique ids and fits inside the 180 s scenario", () => {
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    for (const s of SCENES) {
      expect(s.startS).toBeGreaterThanOrEqual(0);
      expect(s.startS + s.durationS).toBeLessThanOrEqual(180);
      expect(s.segments[0].fromS).toBe(0);
      const froms = s.segments.map((g) => g.fromS);
      expect([...froms].sort((a, b) => a - b)).toEqual(froms);
      expect(froms[froms.length - 1]).toBeLessThan(s.durationS);
    }
  });
});

describe("scenePose", () => {
  const ctx = (sc: FakeScenario) => ({ getPos: (id: string) => sc.getEntityPosition(id), heightAt: flat });

  it("selects the segment active at tRel", () => {
    const s3 = SCENES.find((s) => s.id === "S3")!;
    expect(segmentIndexAt(s3, 0)).toBe(0);
    expect(segmentIndexAt(s3, 9)).toBe(1);
    expect(segmentIndexAt(s3, 24)).toBe(2);
  });

  it("keeps the camera above the terrain and falls back to the base for unknown targets", () => {
    const sc = new FakeScenario();
    for (const s of SCENES) {
      for (let t = 0; t <= s.durationS; t += 2.5) {
        const p = scenePose(s, t, { getPos: (id) => sc.getEntityPosition(id), heightAt: () => 10 });
        expect(Number.isFinite(p.pos.x + p.pos.y + p.pos.z)).toBe(true);
        expect(p.pos.y).toBeGreaterThanOrEqual(12.5 - 1e-9);
      }
    }
  });

  it("orbits at the requested radius around the target", () => {
    const sc = new FakeScenario();
    const s1 = SCENES.find((s) => s.id === "S1")!;
    const p = scenePose(s1, 4, ctx(sc));
    expect(Math.hypot(p.pos.x - p.target.x, p.pos.z - p.target.z)).toBeCloseTo(95, 5);
  });
});

describe("SceneDirector", () => {
  const ctx = (sc: FakeScenario) => ({ getPos: (id: string) => sc.getEntityPosition(id), heightAt: flat });

  it("seeks to the scene start, plays, and finishes after the scene duration", () => {
    const sc = new FakeScenario();
    let finished = 0;
    const d = new SceneDirector(sc, { onFinish: () => finished++ });
    expect(d.play("S3")).toBe(true);
    expect(sc.seeks).toEqual([45]);
    expect(sc.running).toBe(true);
    expect(d.update(0.016, ctx(sc))).not.toBeNull();
    sc.elapsedS = 45 + 25.1;
    d.update(0.016, ctx(sc));
    expect(d.state).toBe("done");
    expect(sc.running).toBe(false);
    expect(finished).toBe(1);
  });

  it("restart seeks again and pause/resume toggles the scenario", () => {
    const sc = new FakeScenario();
    const d = new SceneDirector(sc);
    d.play("S6");
    d.pause();
    expect(d.state).toBe("paused");
    expect(sc.running).toBe(false);
    d.resume();
    expect(sc.running).toBe(true);
    d.restart();
    expect(sc.seeks).toEqual([142, 142]);
  });

  it("returns null when idle and rejects unknown scenes", () => {
    const sc = new FakeScenario();
    const d = new SceneDirector(sc);
    expect(d.update(0.016, ctx(sc))).toBeNull();
    expect(d.play("nope")).toBe(false);
  });

  it("cuts on segment change and smooths inside a segment", () => {
    const sc = new FakeScenario();
    const d = new SceneDirector(sc);
    d.play("S1");
    const a = d.update(0.016, ctx(sc))!;
    sc.elapsedS = 3;
    const b = d.update(0.016, ctx(sc))!;
    const raw = scenePose(SCENES[0], 3, ctx(sc));
    // Smoothed pose lags the raw orbit pose after the first frame.
    expect(Math.hypot(b.pos.x - raw.pos.x, b.pos.z - raw.pos.z)).toBeGreaterThan(0.01);
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z)).toBeGreaterThan(0);
  });
});

describe("stepping between scenes", () => {
  it("moves forward and back in the deck order and keeps the rest queued", () => {
    const d = new SceneDirector(new FakeScenario());
    d.playSequence(["C0", "P0", "A1"]);
    expect(d.activeId).toBe("C0");
    expect(d.step(-1)).toBe(false);
    expect(d.step(1)).toBe(true);
    expect(d.activeId).toBe("P0");
    expect(d.step(1)).toBe(true);
    expect(d.activeId).toBe("A1");
    expect(d.step(1)).toBe(false);
    expect(d.step(-2)).toBe(true);
    expect(d.activeId).toBe("C0");
  });

  it("steps through the deck from a single take", () => {
    const d = new SceneDirector(new FakeScenario());
    d.play("A1");
    expect(d.step(1)).toBe(true);
    expect(d.activeId).not.toBe("A1");
  });
});
