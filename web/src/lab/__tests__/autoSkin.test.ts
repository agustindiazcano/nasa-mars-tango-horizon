import { describe, expect, it } from "vitest";
import { ARM_REST_ABDUCTION, LANDMARKS, boneDistance, buildSkeletonSpec, computeSkinWeights, distanceToSegment } from "../autoSkin";
import { JOINTS } from "../proceduralAstronaut";

// Bounding box of astronaut.glb in geometry units (normalized, 2 tall).
const BOUNDS = { min: [-0.572, -1, -0.312] as [number, number, number], max: [0.572, 1, 0.312] as [number, number, number] };
const spec = buildSkeletonSpec(BOUNDS);
const H = 2;
const yAt = (f: number) => BOUNDS.min[1] + f * H;
const boneIndex = (name: string) => spec.findIndex((b) => b.name === name);

function dominantBone(p: [number, number, number]): string {
  const { skinIndex, skinWeight } = computeSkinWeights(p, spec, 0);
  let best = 0;
  for (let k = 1; k < 4; k++) if (skinWeight[k] > skinWeight[best]) best = k;
  return spec[skinIndex[best]].name;
}

describe("buildSkeletonSpec", () => {
  it("returns every joint once, in JOINTS order", () => {
    expect(spec.map((b) => b.name)).toEqual([...JOINTS]);
  });

  it("parents come before children and the root is the hips", () => {
    expect(spec[0].parent).toBeNull();
    for (const b of spec.slice(1)) expect(JOINTS.indexOf(b.parent!)).toBeLessThan(JOINTS.indexOf(b.name));
  });

  it("fits landmarks to the bounding box (hips mid-body, feet near the sole, head on top)", () => {
    const hips = spec[boneIndex("hips")];
    expect(hips.head[1]).toBeCloseTo(yAt(LANDMARKS.hipY), 6);
    expect(spec[boneIndex("head")].tail[1]).toBeCloseTo(BOUNDS.max[1], 6);
    expect(spec[boneIndex("footL")].head[1]).toBeLessThan(yAt(0.1));
  });

  it("mirrors left and right across the midline", () => {
    for (const base of ["upperArm", "forearm", "hand", "thigh", "shin", "foot"]) {
      const l = spec[boneIndex(`${base}L`)];
      const r = spec[boneIndex(`${base}R`)];
      expect(l.head[0]).toBeCloseTo(-r.head[0], 6);
      expect(l.head[1]).toBeCloseTo(r.head[1], 6);
    }
  });

  it("measures an A-pose arm of roughly 32 degrees", () => {
    expect(ARM_REST_ABDUCTION).toBeGreaterThan(0.45);
    expect(ARM_REST_ABDUCTION).toBeLessThan(0.7);
  });
});

describe("distanceToSegment", () => {
  it("handles interior, end-point and degenerate segments", () => {
    expect(distanceToSegment([1, 1, 0], [0, 0, 0], [2, 0, 0])).toBeCloseTo(1);
    expect(distanceToSegment([4, 0, 0], [0, 0, 0], [2, 0, 0])).toBeCloseTo(2);
    expect(distanceToSegment([3, 4, 0], [0, 0, 0], [0, 0, 0])).toBeCloseTo(5);
  });
});

describe("boneDistance", () => {
  it("is zero inside the capsule radius and penalises the wrong side of the midline", () => {
    const thighL = spec[boneIndex("thighL")];
    const inside: [number, number, number] = [thighL.head[0], yAt(0.35), 0];
    expect(boneDistance(inside, thighL, 0)).toBe(0);
    const wrongSide: [number, number, number] = [-0.15, yAt(0.35), 0];
    expect(boneDistance(wrongSide, thighL, 0)).toBeGreaterThan(0.2);
  });
});

describe("computeSkinWeights", () => {
  const sample: number[] = [];
  for (let i = 0; i < 400; i++) sample.push(((i * 37) % 100) / 100 - 0.5, ((i * 53) % 200) / 100 - 1, ((i * 71) % 60) / 100 - 0.3);
  const { skinIndex, skinWeight } = computeSkinWeights(sample, spec, 0);

  it("normalizes weights to 1 with at most 4 distinct influences and valid indices", () => {
    for (let v = 0; v < 400; v++) {
      let sum = 0;
      const seen = new Set<number>();
      for (let k = 0; k < 4; k++) {
        sum += skinWeight[v * 4 + k];
        seen.add(skinIndex[v * 4 + k]);
        expect(skinIndex[v * 4 + k]).toBeLessThan(spec.length);
        expect(skinWeight[v * 4 + k]).toBeGreaterThanOrEqual(0);
      }
      expect(sum).toBeCloseTo(1, 5);
      expect(seen.size).toBe(4);
    }
  });

  it("sorts influences by descending weight", () => {
    for (let v = 0; v < 400; v++) for (let k = 1; k < 4; k++) expect(skinWeight[v * 4 + k]).toBeLessThanOrEqual(skinWeight[v * 4 + k - 1] + 1e-9);
  });

  it("assigns limb vertices to their bone and keeps the torso and head stiff", () => {
    const elbowL = spec[boneIndex("forearmL")].head;
    const wristL = spec[boneIndex("handL")].head;
    expect(dominantBone([(elbowL[0] + wristL[0]) / 2, (elbowL[1] + wristL[1]) / 2, 0])).toBe("forearmL");
    expect(dominantBone([0.13, yAt(0.15), 0])).toBe("shinL");
    expect(dominantBone([-0.13, yAt(0.32), 0])).toBe("thighR");
    expect(dominantBone([0, yAt(0.97), 0])).toBe("head");
    expect(["chest", "spine"]).toContain(dominantBone([0, yAt(0.7), 0.1]));
  });

  it("does not bind a left-leg vertex to the right leg across the midline", () => {
    const { skinIndex: si, skinWeight: sw } = computeSkinWeights([0.1, yAt(0.35), 0], spec, 0);
    const right = new Set(["thighR", "shinR", "footR"]);
    for (let k = 0; k < 4; k++) if (right.has(spec[si[k]].name)) expect(sw[k]).toBeLessThan(0.2);
  });
});
