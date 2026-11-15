import { describe, expect, it } from "vitest";
import { clampAboveTerrain, cinematicShot, CINEMATIC_CAM_IDS, CINEMATIC_MIN_AGL_M, dampFactor } from "../cinematicCams";

const ctx = {
  timeS: 10,
  heightAt: (x: number, z: number) => 100 + 0.01 * x + 0.02 * z,
  units: [
    { id: "drone-1", x: 5, z: 5 },
    { id: "rover-2", x: -20, z: 30 },
  ],
  astronaut: { x: 0, z: 0 },
};

describe("cinematicCams", () => {
  it("clamps below-ground heights to the AGL minimum", () => {
    expect(clampAboveTerrain(90, 100)).toBe(100 + CINEMATIC_MIN_AGL_M);
    expect(clampAboveTerrain(200, 100)).toBe(200);
  });

  it("keeps every shot above terrain", () => {
    for (const id of CINEMATIC_CAM_IDS) {
      const s = cinematicShot(id, ctx);
      expect(s.pos.y).toBeGreaterThanOrEqual(ctx.heightAt(s.pos.x, s.pos.z) + CINEMATIC_MIN_AGL_M);
    }
  });

  it("falls back to the astronaut when a unit is missing", () => {
    const s = cinematicShot(5, { ...ctx, units: [] });
    expect(Number.isFinite(s.pos.x)).toBe(true);
  });

  it("orbiter moves with time", () => {
    const a = cinematicShot(4, ctx).pos;
    const b = cinematicShot(4, { ...ctx, timeS: 60 }).pos;
    expect(a.x).not.toBeCloseTo(b.x, 3);
  });

  it("damp factor is bounded", () => {
    expect(dampFactor(2, 0)).toBe(0);
    expect(dampFactor(2, 0.1)).toBeGreaterThan(0);
    expect(dampFactor(2, 100)).toBeLessThanOrEqual(1);
  });
});
