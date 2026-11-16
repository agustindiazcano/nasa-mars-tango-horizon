import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  buildInstanced,
  groundAnchorOffset,
  MODEL_SPECS,
  modelFootprint,
  PriorityLoader,
  rotatedFootprint,
  scaleForRule,
  type ModelId,
  type ModelManifest,
} from "../modelLibrary";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(here, "../../../public/models/manifest.json"), "utf8"),
) as ModelManifest;

describe("scaleForRule", () => {
  it("fits the largest side, a named axis, and ignores the other sides", () => {
    expect(scaleForRule([1, 0.5, 2], { axis: "maxSpan", metres: 10 })).toBeCloseTo(5);
    expect(scaleForRule([1, 0.5, 2], { axis: "y", metres: 1 })).toBeCloseTo(2);
    expect(scaleForRule([1, 0.5, 2], { axis: "x", metres: 3 })).toBeCloseTo(3);
    expect(scaleForRule([1, 0.5, 2], { axis: "z", metres: 4 })).toBeCloseTo(2);
  });
});

describe("groundAnchorOffset", () => {
  it("centers x/z and rests the lowest point on y = 0", () => {
    const o = groundAnchorOffset([-1, 0.5, 2], [3, 4, 6], 2);
    expect(o.x).toBeCloseTo(-2);
    expect(o.y).toBeCloseTo(-1);
    expect(o.z).toBeCloseTo(-8);
  });
});

describe("rotatedFootprint", () => {
  it("swaps width and depth for a quarter turn", () => {
    const f = rotatedFootprint([2, 1, 6], 1, Math.PI / 2);
    expect(f.width).toBeCloseTo(6);
    expect(f.depth).toBeCloseTo(2);
  });
});

describe("manifest and size table", () => {
  it("has a size rule for every manifest model and a manifest entry for every rule", () => {
    expect(Object.keys(MODEL_SPECS).sort()).toEqual(Object.keys(manifest.models).sort());
  });

  it("keeps the base models at plausible real-world sizes", () => {
    for (const id of Object.keys(MODEL_SPECS) as ModelId[]) {
      const f = modelFootprint(id, manifest);
      expect(f.width, id).toBeGreaterThan(0.3);
      expect(Math.max(f.width, f.depth, f.height), id).toBeLessThan(130);
    }
    expect(modelFootprint("astronaut-animated", manifest).height).toBeCloseTo(1.75, 1);
  });
});

describe("PriorityLoader", () => {
  it("starts lower priority numbers first and respects the concurrency limit", async () => {
    const loader = new PriorityLoader(1);
    const order: string[] = [];
    const task = (name: string) => async () => {
      order.push(name);
      await Promise.resolve();
      return name;
    };
    const first = loader.enqueue(5, task("first")); // starts immediately: nothing else is queued yet
    const late = loader.enqueue(3, task("late"));
    const urgent = loader.enqueue(0, task("urgent"));
    const tie = loader.enqueue(3, task("tie"));
    await Promise.all([first, late, urgent, tie]);
    expect(order).toEqual(["first", "urgent", "late", "tie"]);
  });

  it("keeps running after a task fails", async () => {
    const loader = new PriorityLoader(1);
    const bad = loader.enqueue(0, async () => {
      throw new Error("boom");
    });
    const good = loader.enqueue(1, async () => "ok");
    await expect(bad).rejects.toThrow("boom");
    await expect(good).resolves.toBe("ok");
  });
});

describe("buildInstanced", () => {
  it("creates one InstancedMesh per template mesh with composed matrices", () => {
    const template = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    a.position.set(0, 0.5, 0);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    b.position.set(2, 0.5, 0);
    template.add(a, b);
    const g = buildInstanced(template, [
      { x: 10, y: 1, z: 0 },
      { x: 0, y: 0, z: 5, yaw: Math.PI / 2, scale: 2 },
    ]);
    expect(g.children).toHaveLength(2);
    const inst = g.children[1] as THREE.InstancedMesh;
    expect(inst.count).toBe(2);
    expect(inst.geometry).toBe(b.geometry);
    const m = new THREE.Matrix4();
    inst.getMatrixAt(0, m);
    expect(new THREE.Vector3().setFromMatrixPosition(m).toArray()).toEqual([12, 1.5, 0]);
    inst.getMatrixAt(1, m);
    const p = new THREE.Vector3().setFromMatrixPosition(m);
    // b sits at (2, 0.5, 0): scaled by 2 and turned +90 deg about y it lands at (0, 1, -4) relative to the placement.
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(1);
  });

  it("returns an empty group for no placements", () => {
    expect(buildInstanced(new THREE.Group(), []).children).toHaveLength(0);
  });
});
