/**
 * Auto-skin for the rigid astronaut scan: humanoid skeleton fitted to the bounding box and
 * capsule-distance skin weights. Pure math (no three.js) so it can be unit-tested.
 *
 * Space: geometry-local, +Y up, character faces +Z, character's left is +X.
 * The scan is in an A-pose (arms angled outward), so arm bones follow that direction and
 * `ARM_REST_ABDUCTION` tells the animation layer how far to drop the arms to hang down.
 */
import { JOINTS, type JointName } from "./proceduralAstronaut";

export type Vec3 = [number, number, number];

export interface BoneSpec {
  name: JointName;
  parent: JointName | null;
  /** Joint position (rotation pivot) in geometry space. */
  head: Vec3;
  /** End of the bone segment (used for the capsule). */
  tail: Vec3;
  /** Capsule radius: vertices within it are fully owned by the bone. */
  radius: number;
  /** Falloff softness beyond the radius (larger = softer, smaller = stiffer). */
  softness: number;
  /** +1 left (+X), -1 right (-X), 0 centre: penalises vertices on the wrong side of the midline. */
  side: -1 | 0 | 1;
  /** Tie-break when capsules overlap: small, specific parts (head, hands, feet) win over big ones. */
  priority: number;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export interface SkinWeights {
  /** 4 bone indices per vertex (index into `spec` order). */
  skinIndex: Uint16Array;
  /** 4 normalized weights per vertex. */
  skinWeight: Float32Array;
}

/**
 * Landmarks as fractions of the body height (from the soles). Measured on `astronaut.glb`
 * (A-pose, suit with backpack): hip joint at 47 %, knee 26 %, ankle 6 %, shoulder 80 %, neck 86 %.
 */
export const LANDMARKS = {
  hipY: 0.47,
  spineY: 0.56,
  chestY: 0.67,
  shoulderY: 0.79,
  neckY: 0.86,
  headY: 0.9,
  kneeY: 0.26,
  ankleY: 0.06,
  toeY: 0.025,
  legX: 0.065,
  shoulderX: 0.11,
  elbow: [0.205, 0.64],
  wrist: [0.27, 0.53],
  handTip: [0.295, 0.47],
} as const;

/** Arm direction of the scan: angle from straight down toward +X (radians), about 32 degrees. */
export const ARM_REST_ABDUCTION = Math.atan2(LANDMARKS.elbow[0] - LANDMARKS.shoulderX, LANDMARKS.shoulderY - LANDMARKS.elbow[1]);

export function buildSkeletonSpec(bounds: Bounds): BoneSpec[] {
  const H = bounds.max[1] - bounds.min[1];
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cz = (bounds.min[2] + bounds.max[2]) / 2;
  const y = (f: number) => bounds.min[1] + f * H;
  const p = (xFrac: number, yFrac: number, z = 0): Vec3 => [cx + xFrac * H, y(yFrac), cz + z * H];
  const L = LANDMARKS;
  const spec: BoneSpec[] = [];
  const add = (name: JointName, parent: JointName | null, head: Vec3, tail: Vec3, radius: number, softness: number, side: -1 | 0 | 1 = 0, priority = 1) =>
    spec.push({ name, parent, head, tail, radius: radius * H, softness: softness * H, side, priority });

  // Torso and head: wide capsules, stiff falloff (suit shell and backpack move as one piece).
  add("hips", null, p(0, L.hipY), p(0, L.spineY), 0.13, 0.02);
  add("spine", "hips", p(0, L.spineY), p(0, L.chestY), 0.13, 0.03);
  add("chest", "spine", p(0, L.chestY), p(0, L.neckY), 0.15, 0.03);
  add("neck", "chest", p(0, L.neckY), p(0, L.headY), 0.05, 0.02, 0, 2);
  add("head", "neck", p(0, L.headY), p(0, 1.0), 0.1, 0.02, 0, 4);

  for (const [side, s, name] of [
    [1, 1, "L"],
    [-1, -1, "R"],
  ] as const) {
    const n = (base: string) => `${base}${name}` as JointName;
    add(n("shoulder"), "chest", p(s * 0.05, L.shoulderY), p(s * L.shoulderX, L.shoulderY), 0.04, 0.02, side);
    add(n("upperArm"), n("shoulder"), p(s * L.shoulderX, L.shoulderY), p(s * L.elbow[0], L.elbow[1]), 0.045, 0.03, side);
    add(n("forearm"), n("upperArm"), p(s * L.elbow[0], L.elbow[1]), p(s * L.wrist[0], L.wrist[1]), 0.045, 0.03, side);
    add(n("hand"), n("forearm"), p(s * L.wrist[0], L.wrist[1]), p(s * L.handTip[0], L.handTip[1]), 0.04, 0.02, side, 2);
    add(n("thigh"), "hips", p(s * L.legX, L.hipY), p(s * L.legX, L.kneeY), 0.07, 0.035, side);
    add(n("shin"), n("thigh"), p(s * L.legX, L.kneeY), p(s * L.legX, L.ankleY), 0.065, 0.03, side);
    add(n("foot"), n("shin"), p(s * L.legX, L.ankleY), p(s * L.legX, L.toeY, 0.07), 0.05, 0.02, side, 2);
  }
  // Keep the order identical to JOINTS so bone indices match pose arrays.
  const index = new Map(JOINTS.map((j, i) => [j, i]));
  return spec.sort((a, b) => index.get(a.name)! - index.get(b.name)!);
}

/** Distance from point `p` to segment `a`-`b`. */
export function distanceToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby + (p[2] - a[2]) * abz) / len2 : 0;
  t = Math.min(1, Math.max(0, t));
  const dx = p[0] - (a[0] + abx * t);
  const dy = p[1] - (a[1] + aby * t);
  const dz = p[2] - (a[2] + abz * t);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Effective distance of a vertex to a bone: capsule distance minus radius, plus a wrong-side penalty. */
export function boneDistance(p: Vec3, bone: BoneSpec, midlineX: number): number {
  let d = Math.max(0, distanceToSegment(p, bone.head, bone.tail) - bone.radius);
  if (bone.side !== 0) {
    const across = -bone.side * (p[0] - midlineX); // > 0 on the wrong side
    if (across > 0) d += across * 3;
  }
  return d;
}

/**
 * Weights each vertex to the 4 nearest bones with an inverse-power falloff (power 4 keeps the torso
 * stiff, the per-bone softness controls how long the blend is around joints), then normalizes.
 */
export function computeSkinWeights(positions: ArrayLike<number>, spec: BoneSpec[], midlineX: number): SkinWeights {
  const count = Math.floor(positions.length / 3);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const p: Vec3 = [0, 0, 0];
  const best: Array<{ i: number; w: number }> = spec.map((_, i) => ({ i, w: 0 }));
  for (let v = 0; v < count; v++) {
    p[0] = positions[v * 3];
    p[1] = positions[v * 3 + 1];
    p[2] = positions[v * 3 + 2];
    for (let b = 0; b < spec.length; b++) {
      const d = boneDistance(p, spec[b], midlineX);
      const s = spec[b].softness;
      const r = d / s;
      best[b].i = b;
      best[b].w = spec[b].priority / (1 + r * r * r * r);
    }
    best.sort((x, y) => y.w - x.w);
    let sum = 0;
    for (let k = 0; k < 4; k++) sum += best[k].w;
    for (let k = 0; k < 4; k++) {
      skinIndex[v * 4 + k] = best[k].i;
      skinWeight[v * 4 + k] = sum > 0 ? best[k].w / sum : k === 0 ? 1 : 0;
    }
  }
  return { skinIndex, skinWeight };
}
