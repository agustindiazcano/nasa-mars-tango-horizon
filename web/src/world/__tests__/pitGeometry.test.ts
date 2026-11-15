import { describe, expect, it } from "vitest";
import { RESCUE_PIT, RESCUE_PIT_AXIS, RESCUE_SITE, pitOutlineRadiusAt, pitSurfaceOffsetAt } from "@th/shared";
import { buildPitGeometry, pitFrame, pitMeshOffsetAt, pitRampOffset, planPitRubble } from "../pitGeometry";
import { defaultClusters, defaultExclusions, planRocks, rescuePitRockOptions } from "../rockPlacement";

const flatH = () => 100;

describe("pit mesh offset", () => {
  it("matches the contract ramp and floor on the drive lane centre line", () => {
    for (const s of [-3, -1, 0, 1, 2, 3, 4]) {
      const x = RESCUE_SITE.x + RESCUE_PIT_AXIS.x * s;
      const z = RESCUE_SITE.z + RESCUE_PIT_AXIS.z * s;
      expect(pitMeshOffsetAt(x, z)).toBeCloseTo(pitSurfaceOffsetAt(x, z), 9);
      expect(pitRampOffset(s)).toBeCloseTo(pitSurfaceOffsetAt(x, z), 9);
    }
  });

  it("is 0 outside the outline and -depth on the floor", () => {
    expect(pitMeshOffsetAt(RESCUE_SITE.x + 12, RESCUE_SITE.z)).toBe(0);
    expect(pitMeshOffsetAt(RESCUE_SITE.x - RESCUE_PIT_AXIS.x * 0.1, RESCUE_SITE.z - RESCUE_PIT_AXIS.z * 0.1)).toBeCloseTo(
      pitRampOffset(-0.1),
      9,
    );
  });
});

describe("pit surface geometry", () => {
  const geo = buildPitGeometry({ heightAt: flatH, segments: 64, rings: 20 });
  const pos = geo.getAttribute("position");

  it("is textured, coloured and finite", () => {
    expect(geo.getAttribute("uv").count).toBe(pos.count);
    expect(geo.getAttribute("color").count).toBe(pos.count);
    for (let i = 0; i < pos.count; i++) expect(Number.isFinite(pos.getY(i))).toBe(true);
  });

  it("stays between the floor and the terrain surface inside the outline", () => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      minY = Math.min(minY, pos.getY(i));
      maxY = Math.max(maxY, pos.getY(i));
    }
    expect(minY).toBeGreaterThan(100 - RESCUE_PIT.depthM - 0.4);
    expect(maxY).toBeLessThanOrEqual(100.3);
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - RESCUE_SITE.x;
      const dz = pos.getZ(i) - RESCUE_SITE.z;
      expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(pitOutlineRadiusAt(Math.atan2(dz, dx)) + 0.8);
    }
  });
});

describe("pit rubble and rim boulder field", () => {
  it("is deterministic and keeps large stones off the drive lane", () => {
    expect(planPitRubble(5)).toEqual(planPitRubble(5));
    for (const r of planPitRubble(5).filter((q) => q.zone === "ramp")) {
      const f = pitFrame(r.x, r.z);
      if (Math.abs(f.w) < RESCUE_PIT.rampHalfWidthM - 0.5) expect(r.size).toBeLessThan(0.13);
    }
  });

  it("places boulders around the rim but none near the pit centre", () => {
    const extra = rescuePitRockOptions();
    const rocks = planRocks({
      halfSizeM: 2000,
      heightAt: flatH,
      slopeAt: () => 3,
      clusters: [...defaultClusters(), ...extra.clusters],
      exclusions: [...defaultExclusions(), ...extra.exclusions],
    });
    const near = rocks.filter((r) => Math.hypot(r.x - RESCUE_SITE.x, r.z - RESCUE_SITE.z) < 11);
    expect(near).toHaveLength(0);
    const field = rocks.filter((r) => r.cluster?.startsWith("rescue-rim"));
    expect(field.length).toBeGreaterThanOrEqual(12);
  });
});
