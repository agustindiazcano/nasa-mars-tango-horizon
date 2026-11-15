import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BASE_ORIGIN } from "@th/shared";
import { defaultExclusions } from "../rockPlacement";
import { patrolAt, planDecorRobots } from "../decorRobots";
import { generateWeatherMaps, isWeatherable, weatherMaterial } from "../weathering";

const flat = { slopeAt: () => 2 };

describe("planDecorRobots", () => {
  it("is deterministic and places the requested number on a ring around the base", () => {
    const a = planDecorRobots({ ...flat, seed: 3 });
    expect(a).toEqual(planDecorRobots({ ...flat, seed: 3 }));
    expect(a).toHaveLength(7);
    for (const p of a) {
      const d = Math.hypot(p.x - BASE_ORIGIN.x, p.z - BASE_ORIGIN.z);
      expect(d).toBeGreaterThanOrEqual(38);
      expect(d).toBeLessThanOrEqual(150);
    }
  });

  it("keeps clear of exclusions, rocks, each other and steep ground", () => {
    const ex = defaultExclusions();
    const rock = { x: BASE_ORIGIN.x + 60, z: BASE_ORIGIN.z + 40, r: 40 };
    const plan = planDecorRobots({ ...flat, avoid: [rock] });
    for (const p of plan) {
      for (const c of ex) expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeGreaterThanOrEqual(c.r);
      expect(Math.hypot(p.x - rock.x, p.z - rock.z)).toBeGreaterThanOrEqual(rock.r);
    }
    for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) expect(Math.hypot(plan[i].x - plan[j].x, plan[i].z - plan[j].z)).toBeGreaterThanOrEqual(14);
    expect(planDecorRobots({ slopeAt: () => 30 })).toHaveLength(0);
  });

  it("makes some robots patrol and keeps patrols within their line", () => {
    const plan = planDecorRobots(flat);
    const patrolling = plan.filter((p) => p.patrol);
    expect(patrolling.length).toBeGreaterThan(0);
    expect(plan.some((p) => !p.patrol)).toBe(true);
    for (const p of patrolling) {
      let maxOff = 0;
      for (let t = 0; t < 400; t += 5) {
        const q = patrolAt(p, t);
        maxOff = Math.max(maxOff, Math.hypot(q.x - p.x, q.z - p.z));
      }
      expect(maxOff).toBeLessThanOrEqual(p.patrol!.halfM + 1e-6);
      expect(maxOff).toBeGreaterThan(p.patrol!.halfM * 0.9);
    }
  });
});

describe("weathering maps", () => {
  const maps = generateWeatherMaps(64, 9);

  it("generates deterministic opaque RGBA masks with real variation", () => {
    expect(maps.mask).toHaveLength(64 * 64 * 4);
    expect(Array.from(generateWeatherMaps(64, 9).mask.slice(0, 64))).toEqual(Array.from(maps.mask.slice(0, 64)));
    let dust = 0;
    let scratch = 0;
    for (let i = 0; i < maps.mask.length; i += 4) {
      expect(maps.mask[i + 3]).toBe(255);
      dust = Math.max(dust, maps.mask[i]);
      scratch = Math.max(scratch, maps.mask[i + 1]);
    }
    expect(dust).toBeGreaterThan(150);
    expect(scratch).toBeGreaterThan(100);
  });

  it("only weathers opaque, non-transmissive standard materials, and only once", () => {
    const paint = new THREE.MeshStandardMaterial();
    const glass = new THREE.MeshPhysicalMaterial({ transmission: 0.9 });
    const decal = new THREE.MeshStandardMaterial({ transparent: true });
    expect(isWeatherable(paint)).toBe(true);
    expect(isWeatherable(glass)).toBe(false);
    expect(isWeatherable(decal)).toBe(false);
    weatherMaterial(paint);
    const patched = paint.onBeforeCompile;
    weatherMaterial(paint);
    expect(paint.onBeforeCompile).toBe(patched);
    weatherMaterial(glass);
    expect(glass.userData.weathered).toBeUndefined();
  });
});
