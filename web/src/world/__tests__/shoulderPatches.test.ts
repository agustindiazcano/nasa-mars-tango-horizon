import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  PATCH_FOR_SIDE,
  attachShoulderPatches,
  classifyShoulderBone,
  createShoulderPatch,
  flagStripes,
  matchShoulderBones,
  patchSize,
  sunGeometry,
  sunRays,
} from "../shoulderPatches";

const MIXAMO = [
  "mixamorig:Hips",
  "mixamorig:Spine2",
  "mixamorig:LeftShoulder",
  "mixamorig:LeftArm",
  "mixamorig:LeftForeArm",
  "mixamorig:LeftHand",
  "mixamorig:LeftHandIndex1",
  "mixamorig:RightShoulder",
  "mixamorig:RightArm",
  "mixamorig:RightForeArm",
  "mixamorig:RightHand",
  "mixamorig:RightHandPinky4",
  "mixamorig:LeftUpLeg",
  "mixamorig:RightUpLeg",
];

describe("patchSize", () => {
  it("keeps 2:3 proportions and clamps to 7-9 cm", () => {
    expect(patchSize(0.08).h).toBeCloseTo(0.08 * (2 / 3));
    expect(patchSize(0.02).w).toBe(0.07);
    expect(patchSize(0.5).w).toBe(0.09);
  });
});

describe("matchShoulderBones", () => {
  it("picks the upper arm over the clavicle on Mixamo names", () => {
    expect(matchShoulderBones(MIXAMO)).toEqual({ left: "mixamorig:LeftArm", right: "mixamorig:RightArm" });
  });
  it("never matches forearms, hands or fingers", () => {
    expect(matchShoulderBones(["mixamorig:LeftForeArm", "mixamorig:RightHand", "mixamorig:LeftHandThumb1"])).toEqual({ left: null, right: null });
  });
  it("matches the lab rig and common naming schemes", () => {
    expect(matchShoulderBones(["shoulderL", "upperArmL", "forearmL", "shoulderR", "upperArmR"])).toEqual({ left: "upperArmL", right: "upperArmR" });
    expect(matchShoulderBones(["upperarm_l", "upperarm_r", "clavicle_l"])).toEqual({ left: "upperarm_l", right: "upperarm_r" });
    expect(matchShoulderBones(["Shoulder.L", "Shoulder.R"])).toEqual({ left: "Shoulder.L", right: "Shoulder.R" });
  });
  it("classifies sides", () => {
    expect(classifyShoulderBone("mixamorig:RightArm")?.side).toBe("right");
    expect(classifyShoulderBone("Spine")).toBeNull();
  });
});

describe("side assignment", () => {
  it("puts the flag on the right and CONAE on the left", () => {
    expect(PATCH_FOR_SIDE).toEqual({ right: "flag", left: "conae" });
  });
});

describe("flag geometry", () => {
  it("has three equal bands, light blue outside", () => {
    const s = flagStripes(300);
    expect(s.map((b) => b.color)).toEqual(["#74ACDF", "#FFFFFF", "#74ACDF"]);
    expect(s.map((b) => b.y1 - b.y0)).toEqual([100, 100, 100]);
  });
  it("centres the sun inside the white band", () => {
    const g = sunGeometry(768, 512);
    expect(g.cx).toBe(384);
    expect(g.cy).toBe(256);
    expect(g.tipR).toBeLessThan(512 / 6);
    expect(g.discR).toBeLessThan(g.tipR);
  });
  it("has 32 alternating straight and wavy rays", () => {
    const r = sunRays();
    expect(r).toHaveLength(32);
    expect(r.filter((x) => x.wavy)).toHaveLength(16);
    expect(r[0].wavy).toBe(false);
    expect(r[1].wavy).toBe(true);
  });
});

function limb(x: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0.22, 0);
  return g;
}

describe("attachShoulderPatches", () => {
  it("parents the flag to the right arm and CONAE to the left, facing outward", () => {
    const root = new THREE.Group();
    const left = limb(-0.31);
    const right = limb(0.31);
    root.add(left, right);
    const res = attachShoulderPatches(root, { arms: { left, right, armRadiusM: 0.075 } })!;
    expect(res.flag.parent).toBe(right);
    expect(res.conae.parent).toBe(left);
    root.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(res.flag.getWorldQuaternion(new THREE.Quaternion()));
    expect(n.x).toBeCloseTo(1);
    const nl = new THREE.Vector3(0, 0, 1).applyQuaternion(res.conae.getWorldQuaternion(new THREE.Quaternion()));
    expect(nl.x).toBeCloseTo(-1);
    expect(res.flag.getWorldPosition(new THREE.Vector3()).x).toBeGreaterThan(0.31 + 0.07);
  });

  it("is idempotent and stays on the bone of a skinned clone", () => {
    const root = new THREE.Group();
    const mk = (name: string, x: number, child: string) => {
      const b = new THREE.Bone();
      b.name = name;
      b.position.set(x, 1.4, 0);
      const c = new THREE.Bone();
      c.name = child;
      c.position.set(x * 0.5, -0.3, 0);
      b.add(c);
      return b;
    };
    root.add(mk("mixamorig:LeftArm", 0.2, "mixamorig:LeftForeArm"), mk("mixamorig:RightArm", -0.2, "mixamorig:RightForeArm"));
    const clone = root.clone(true);
    attachShoulderPatches(clone);
    attachShoulderPatches(clone);
    const patches: THREE.Object3D[] = [];
    clone.traverse((o) => o.userData.shoulderPatch && patches.push(o));
    expect(patches).toHaveLength(2);
    expect(patches.map((p) => p.parent?.name).sort()).toEqual(["mixamorig:LeftArm", "mixamorig:RightArm"]);
    expect(attachShoulderPatches(new THREE.Group())).toBeNull();
  });

  it("creates patches with a shared material", () => {
    const a = createShoulderPatch("flag", 0.08);
    const b = createShoulderPatch("flag", 0.09);
    expect(a.material).toBe(b.material);
    expect(a.scale.x).toBeCloseTo(0.08);
  });
});
