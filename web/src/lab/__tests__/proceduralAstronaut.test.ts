import { describe, expect, it } from "vitest";
import {
  ANIMATIONS,
  JOINTS,
  animationPeriod,
  blendPoses,
  idlePose,
  locomotionPose,
  neutralPose,
  samplePose,
} from "../proceduralAstronaut";

function allFinite(name: (typeof ANIMATIONS)[number], t: number): boolean {
  const pose = samplePose(name, t, { progress: 0.6 });
  const values = [pose.root.pitch, pose.root.yaw, pose.root.offset.x, pose.root.offset.y, pose.root.offset.z];
  for (const j of JOINTS) values.push(pose.joints[j].x, pose.joints[j].y, pose.joints[j].z);
  return values.every(Number.isFinite);
}

describe("proceduralAstronaut", () => {
  it("returns finite values for every animation and time", () => {
    for (const name of ANIMATIONS) for (const t of [0, 0.37, 1.5, 12.9]) expect(allFinite(name, t)).toBe(true);
  });

  it("loops: looping animations repeat after one period", () => {
    for (const name of ["idle", "walk", "run", "look-around", "wave"] as const) {
      const period = animationPeriod(name);
      expect(period).toBeGreaterThan(0);
      const a = samplePose(name, 0.3);
      const b = samplePose(name, 0.3 + period);
      for (const j of JOINTS) {
        expect(b.joints[j].x).toBeCloseTo(a.joints[j].x, 4);
        expect(b.joints[j].y).toBeCloseTo(a.joints[j].y, 4);
        expect(b.joints[j].z).toBeCloseTo(a.joints[j].z, 4);
      }
    }
  });

  it("swings opposite legs and counter-swings the arms while walking", () => {
    const pose = samplePose("walk", 0.2);
    expect(pose.joints.thighL.x * pose.joints.thighR.x).toBeLessThan(0);
    expect(pose.joints.upperArmL.x * pose.joints.thighL.x).toBeLessThan(0);
    expect(pose.joints.upperArmR.x * pose.joints.thighR.x).toBeLessThan(0);
  });

  it("never bends the knees backward past straight (forward flexion only)", () => {
    for (let t = 0; t < 3; t += 0.05) {
      const p = samplePose("run", t);
      expect(p.joints.shinL.x).toBeGreaterThanOrEqual(0);
      expect(p.joints.shinR.x).toBeGreaterThanOrEqual(0);
    }
  });

  it("running swings further than walking", () => {
    const peak = (name: "walk" | "run") => {
      let m = 0;
      for (let t = 0; t < 2; t += 0.02) m = Math.max(m, Math.abs(samplePose(name, t).joints.thighL.x));
      return m;
    };
    expect(peak("run")).toBeGreaterThan(peak("walk"));
  });

  it("blendPoses hits both endpoints", () => {
    const a = idlePose(0);
    const b = samplePose("walk", 0.2);
    const at0 = blendPoses(a, b, 0);
    const at1 = blendPoses(a, b, 1);
    expect(at0.joints.thighL.x).toBeCloseTo(a.joints.thighL.x, 9);
    expect(at1.joints.thighL.x).toBeCloseTo(b.joints.thighL.x, 9);
  });

  it("locomotion blend: idle at zero speed, walk at 1.4 m/s, bigger stride when faster", () => {
    const idle = idlePose(0.2);
    const still = locomotionPose(0.2, 0);
    expect(still.joints.thighL.x).toBeCloseTo(idle.joints.thighL.x, 9);
    const walk = locomotionPose(0.2, 1.4);
    expect(walk.joints.thighL.x).toBeCloseTo(samplePose("walk", 0.2, { speed: 1.4 }).joints.thighL.x, 9);
    let slow = 0;
    let fast = 0;
    for (let t = 0; t < 2; t += 0.02) {
      slow = Math.max(slow, Math.abs(locomotionPose(t, 0.7).joints.thighL.x));
      fast = Math.max(fast, Math.abs(locomotionPose(t, 4).joints.thighL.x));
    }
    expect(fast).toBeGreaterThan(slow);
  });

  it("fall ends lying on the back, lowered toward the ground", () => {
    const start = samplePose("fall", 0, { progress: 0 });
    const end = samplePose("fall", 0, { progress: 1 });
    expect(start.root.pitch).toBe(0);
    expect(end.root.pitch).toBeCloseTo(Math.PI / 2, 6);
    expect(end.root.offset.y).toBeLessThan(-0.5);
  });

  it("kneel lowers the hips and flexes the knees", () => {
    const stand = samplePose("kneel", 0, { progress: 0 });
    const down = samplePose("kneel", 0, { progress: 1 });
    expect(down.root.offset.y).toBeLessThan(stand.root.offset.y - 0.3);
    expect(down.joints.shinR.x).toBeGreaterThan(1);
  });

  it("neutral pose has every joint at zero", () => {
    const n = neutralPose();
    for (const j of JOINTS) expect(n.joints[j]).toEqual({ x: 0, y: 0, z: 0 });
  });
});
