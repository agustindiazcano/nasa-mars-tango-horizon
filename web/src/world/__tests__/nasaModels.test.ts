import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { collectDroneRotorPivots, extractIngenuityRotorPivots } from "../nasaModels";

describe("extractIngenuityRotorPivots", () => {
  it("wraps coaxial rotors along the mast axis without altering world positions", () => {
    const root = new THREE.Group();
    const bus = new THREE.Group();
    bus.name = "bus";
    bus.quaternion.set(0, 0, Math.SQRT1_2, Math.SQRT1_2); // +90 deg Z: local +X -> world +Y
    root.add(bus);

    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2));
    r1.name = "rotors_01";
    r1.position.set(3.5, 0.01, 0.0);

    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2));
    r2.name = "rotors_02";
    r2.position.set(2.7, 0.01, 0.0);

    bus.add(r1, r2);
    root.updateMatrixWorld(true);
    const before1 = new THREE.Vector3();
    const before2 = new THREE.Vector3();
    r1.getWorldPosition(before1);
    r2.getWorldPosition(before2);

    const pivots = extractIngenuityRotorPivots(root);
    expect(pivots).toHaveLength(2);
    expect(pivots[0].axis).toBe("x");
    expect(pivots[1].axis).toBe("x");

    root.updateMatrixWorld(true);
    const after1 = new THREE.Vector3();
    const after2 = new THREE.Vector3();
    r1.getWorldPosition(after1);
    r2.getWorldPosition(after2);

    expect(after1.distanceTo(before1)).toBeLessThan(1e-6);
    expect(after2.distanceTo(before2)).toBeLessThan(1e-6);
  });

  it("returns empty array when rotor nodes are absent", () => {
    const empty = new THREE.Group();
    expect(extractIngenuityRotorPivots(empty)).toEqual([]);
  });
});

describe("collectDroneRotorPivots", () => {
  it("returns the eight shaft pivots with their spin sense and ignores other nodes", () => {
    const root = new THREE.Group();
    for (const corner of ["fl", "fr", "bl", "br"]) {
      for (const layer of ["up", "low"]) {
        const n = new THREE.Group();
        n.name = `rotor_${corner}_${layer}`;
        n.userData.spinDir = layer === "low" ? -1 : 1;
        root.add(n);
      }
    }
    root.add(new THREE.Group());
    const pivots = collectDroneRotorPivots(root);
    expect(pivots).toHaveLength(8);
    expect(pivots.every((p) => p.axis === "y")).toBe(true);
    expect(pivots.filter((p) => p.dir === -1)).toHaveLength(4);
  });
});
