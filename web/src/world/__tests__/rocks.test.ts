import { describe, expect, it } from "vitest";
import { BASE_ORIGIN, LAUNCH_SITE_COORD } from "@th/shared";
import { generateRockMaps } from "../rockTextures";
import { buildRockGeometry } from "../rockGeometry";
import { defaultClusters, defaultExclusions, planRocks } from "../rockPlacement";

const flat = { halfSizeM: 2000, heightAt: () => 0, slopeAt: () => 3 };

describe("rock placement", () => {
  it("is deterministic for the same seed", () => {
    const a = planRocks({ ...flat, seed: 5 });
    const b = planRocks({ ...flat, seed: 5 });
    expect(a).toEqual(b);
    expect(planRocks({ ...flat, seed: 6 })).not.toEqual(a);
  });

  it("keeps clear of the base, launch complex, fleet starts and stations", () => {
    const ex = defaultExclusions();
    for (const r of planRocks(flat)) {
      for (const c of ex) {
        expect(Math.hypot(r.x - c.x, r.z - c.z)).toBeGreaterThanOrEqual(c.r);
      }
    }
  });

  it("places large boulders in the named fields and stays inside the map", () => {
    const rocks = planRocks(flat);
    const large = rocks.filter((r) => r.tier === "large");
    expect(large.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(large.map((r) => r.cluster));
    for (const c of defaultClusters()) expect(ids.has(c.id)).toBe(true);
    for (const r of rocks) {
      expect(Math.abs(r.x)).toBeLessThanOrEqual(2000);
      expect(Math.abs(r.z)).toBeLessThanOrEqual(2000);
    }
    expect(Math.min(...large.map((r) => Math.max(r.sx, r.sz)))).toBeGreaterThan(1.2);
  });

  it("skips ground steeper than the limit", () => {
    const steep = planRocks({ ...flat, slopeAt: () => 40 });
    expect(steep).toHaveLength(0);
  });

  it("puts a dense scatter around the base and some rocks far from it", () => {
    const rocks = planRocks(flat).filter((r) => r.cluster === null);
    const near = rocks.filter((r) => Math.hypot(r.x - BASE_ORIGIN.x, r.z - BASE_ORIGIN.z) < 600).length;
    expect(near / rocks.length).toBeGreaterThan(0.7);
    expect(rocks.some((r) => Math.hypot(r.x - LAUNCH_SITE_COORD.x, r.z - LAUNCH_SITE_COORD.z) > 800)).toBe(true);
  });
});

describe("rock geometry", () => {
  it("builds a faceted rock with UVs and a flat base", () => {
    const g = buildRockGeometry({ detail: 2, seed: 3, worldSizeM: 1 });
    const pos = g.getAttribute("position");
    expect(pos.count).toBe(180 * 3);
    expect(g.getAttribute("uv").count).toBe(pos.count);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeGreaterThan(-0.7);
    expect(g.boundingBox!.max.y).toBeGreaterThan(0.2);
    for (let i = 0; i < pos.count; i++) expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))).toBe(true);
  });

  it("differs between seeds", () => {
    const a = buildRockGeometry({ detail: 1, seed: 1, worldSizeM: 1 }).getAttribute("position").array;
    const b = buildRockGeometry({ detail: 1, seed: 2, worldSizeM: 1 }).getAttribute("position").array;
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe("rock textures", () => {
  const maps = generateRockMaps(64, 9);

  it("produces opaque RGBA maps of the requested size", () => {
    expect(maps.albedo).toHaveLength(64 * 64 * 4);
    expect(maps.normal).toHaveLength(64 * 64 * 4);
    for (let i = 3; i < maps.albedo.length; i += 4) expect(maps.albedo[i]).toBe(255);
  });

  it("keeps the albedo dark like basalt with variation", () => {
    let sum = 0;
    let min = 255;
    let max = 0;
    for (let i = 0; i < maps.albedo.length; i += 4) {
      const lum = (maps.albedo[i] + maps.albedo[i + 1] + maps.albedo[i + 2]) / 3;
      sum += lum;
      min = Math.min(min, lum);
      max = Math.max(max, lum);
    }
    const mean = sum / (maps.albedo.length / 4);
    expect(mean).toBeGreaterThan(25);
    expect(mean).toBeLessThan(120);
    expect(max - min).toBeGreaterThan(40);
  });

  it("is tileable: height wraps without a seam step larger than the interior step", () => {
    const n = 64;
    const h = maps.height;
    let edge = 0;
    let inner = 0;
    for (let y = 0; y < n; y++) {
      edge += Math.abs(h[y * n] - h[y * n + n - 1]);
      inner += Math.abs(h[y * n + 1] - h[y * n]);
    }
    expect(edge / n).toBeLessThan((inner / n) * 3);
  });

  it("encodes upward-facing unit normals", () => {
    for (let i = 0; i < maps.normal.length; i += 4) {
      const nx = (maps.normal[i] / 255) * 2 - 1;
      const ny = (maps.normal[i + 1] / 255) * 2 - 1;
      const nz = (maps.normal[i + 2] / 255) * 2 - 1;
      expect(nz).toBeGreaterThan(0);
      expect(Math.hypot(nx, ny, nz)).toBeGreaterThan(0.97);
      expect(Math.hypot(nx, ny, nz)).toBeLessThan(1.03);
    }
  });
});
