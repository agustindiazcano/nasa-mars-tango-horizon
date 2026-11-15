/**
 * Procedural astronaut animation: pure functions from time and parameters to joint rotations.
 *
 * Conventions (character faces +Z, up is +Y, the character's left side is +X):
 * - Rotations are local Euler XYZ in radians relative to the bind pose (arms down, legs straight).
 * - On a limb that hangs down, a positive X rotation swings it backward (so a forward swing is negative X).
 *   Knee: positive X bends the shin backward. Elbow: negative X bends the forearm forward.
 * - On a limb that hangs down, a positive Z rotation moves it toward +X (left abduction); right limbs use -Z.
 * - `root.offset` is added to the hips position (metres); `root.pitch` tilts the whole body about X
 *   (positive tips the head backward); `root.yaw` turns it about Y.
 */

export const JOINTS = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "shoulderL",
  "upperArmL",
  "forearmL",
  "handL",
  "shoulderR",
  "upperArmR",
  "forearmR",
  "handR",
  "thighL",
  "shinL",
  "footL",
  "thighR",
  "shinR",
  "footR",
] as const;

export type JointName = (typeof JOINTS)[number];

export interface Euler3 {
  x: number;
  y: number;
  z: number;
}

export interface Pose {
  root: { offset: Euler3; pitch: number; yaw: number };
  joints: Record<JointName, Euler3>;
}

export const ANIMATIONS = ["idle", "walk", "run", "look-around", "wave", "kneel", "fall"] as const;
export type AnimationName = (typeof ANIMATIONS)[number];

export interface AnimationParams {
  /** Ground speed in m/s for `walk`, `run` and the locomotion blend. */
  speed: number;
  /** 0..1 progress for one-shot animations (`kneel`, `fall`). */
  progress: number;
  /** Body height in metres (scales the root bob). */
  heightM: number;
}

export const DEFAULT_PARAMS: AnimationParams = { speed: 1.4, progress: 1, heightM: 1.9 };

const TAU = Math.PI * 2;

export function neutralPose(): Pose {
  const joints = {} as Record<JointName, Euler3>;
  for (const j of JOINTS) joints[j] = { x: 0, y: 0, z: 0 };
  return { root: { offset: { x: 0, y: 0, z: 0 }, pitch: 0, yaw: 0 }, joints };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

export function idlePose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const pose = neutralPose();
  const breath = Math.sin(t * TAU * 0.25);
  pose.joints.chest.x = -0.015 * breath;
  pose.joints.spine.x = -0.01 * breath;
  pose.joints.head.x = 0.01 * breath;
  pose.joints.upperArmL.z = 0.06 + 0.01 * breath;
  pose.joints.upperArmR.z = -0.06 - 0.01 * breath;
  pose.joints.forearmL.x = -0.08;
  pose.joints.forearmR.x = -0.08;
  pose.root.offset.y = 0.004 * p.heightM * breath;
  // Slow weight shift.
  pose.joints.hips.z = 0.012 * Math.sin(t * TAU * 0.125);
  return pose;
}

/** Gait with arm swing and spine counter-rotation. `stride` is the thigh swing amplitude (rad). */
function gaitPose(t: number, speed: number, cadenceHz: number, stride: number, kneePeak: number, lean: number, p: AnimationParams): Pose {
  const pose = neutralPose();
  const phase = t * TAU * cadenceHz;
  const swing = Math.sin(phase); // left leg forward when positive
  const swingR = Math.sin(phase + Math.PI);
  const h = p.heightM;
  void speed;

  pose.joints.thighL.x = -stride * swing;
  pose.joints.thighR.x = -stride * swingR;
  // Knee flexes while the leg swings forward (after mid-stance).
  pose.joints.shinL.x = kneePeak * Math.max(0, Math.sin(phase - 0.9)) + 0.05;
  pose.joints.shinR.x = kneePeak * Math.max(0, Math.sin(phase + Math.PI - 0.9)) + 0.05;
  pose.joints.footL.x = -0.25 * stride * swing * 0.5;
  pose.joints.footR.x = -0.25 * stride * swingR * 0.5;

  // Arms swing opposite to the legs.
  const armAmp = stride * 0.8;
  pose.joints.upperArmL.x = armAmp * swing;
  pose.joints.upperArmR.x = armAmp * swingR;
  pose.joints.upperArmL.z = 0.07;
  pose.joints.upperArmR.z = -0.07;
  const elbow = -(0.15 + kneePeak * 0.35);
  pose.joints.forearmL.x = elbow;
  pose.joints.forearmR.x = elbow;

  // Counter-rotation: hips yaw with the leading leg, spine/chest opposite.
  pose.joints.hips.y = 0.12 * (stride / 0.45) * swing;
  pose.joints.spine.y = -0.08 * (stride / 0.45) * swing;
  pose.joints.chest.y = -0.08 * (stride / 0.45) * swing;
  pose.joints.head.y = 0.1 * (stride / 0.45) * swing;
  pose.joints.spine.x = -lean * 0.5;
  pose.joints.chest.x = -lean * 0.5;
  pose.joints.head.x = lean * 0.6;

  // Vertical bob: two bounces per cycle.
  pose.root.offset.y = -0.012 * h * (stride / 0.45) * Math.cos(phase * 2) - 0.01 * h * (stride / 0.45);
  pose.root.offset.x = 0.01 * h * swing * (stride / 0.45);
  pose.root.pitch = -lean * 0.3;
  return pose;
}

export function walkPose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const speed = Math.max(0.2, p.speed);
  const cadence = 0.55 + 0.25 * speed; // cycles/s, one cycle = two steps
  const stride = Math.min(0.55, 0.22 + 0.16 * speed);
  return gaitPose(t, speed, cadence, stride, 0.55, 0.04, p);
}

export function runPose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const speed = Math.max(2, p.speed);
  const cadence = 1.1 + 0.25 * speed;
  const stride = Math.min(0.85, 0.35 + 0.12 * speed);
  const pose = gaitPose(t, speed, cadence, stride, 1.25, 0.16, p);
  pose.joints.forearmL.x = -1.2;
  pose.joints.forearmR.x = -1.2;
  return pose;
}

export function lookAroundPose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const pose = idlePose(t, p);
  const sweep = Math.sin(t * TAU * 0.25);
  pose.joints.head.y = 0.7 * sweep;
  pose.joints.neck.y = 0.25 * sweep;
  pose.joints.chest.y = 0.15 * sweep;
  pose.joints.head.x = 0.12 * Math.sin(t * TAU * 0.5 + 1);
  return pose;
}

export function wavePose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const pose = idlePose(t, p);
  const raise = smoothstep(p.progress * 3);
  pose.joints.upperArmR.z = -(0.06 + raise * 2.3);
  pose.joints.upperArmR.x = 0;
  pose.joints.forearmR.x = -0.15;
  pose.joints.forearmR.z = -raise * 0.5 * Math.sin(t * TAU * 1.5);
  pose.joints.handR.z = -raise * 0.3 * Math.sin(t * TAU * 1.5);
  pose.joints.head.z = 0.05 * raise;
  pose.joints.chest.z = 0.04 * raise;
  return pose;
}

/** Kneels on the right knee (progress 0 standing, 1 fully kneeling). */
export function kneelPose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const pose = idlePose(t, p);
  const k = smoothstep(p.progress);
  const h = p.heightM;
  pose.joints.thighL.x = -1.35 * k;
  pose.joints.shinL.x = 1.35 * k;
  pose.joints.thighR.x = 0.25 * k;
  pose.joints.shinR.x = 1.5 * k;
  pose.joints.footR.x = 0.5 * k;
  pose.joints.spine.x = -0.12 * k;
  pose.joints.chest.x = -0.12 * k;
  pose.joints.head.x = 0.2 * k;
  pose.joints.upperArmL.x = -0.5 * k;
  pose.joints.forearmL.x = -0.9 * k;
  pose.root.offset.y += -0.3 * h * k;
  return pose;
}

/** Falls backward onto the ground (progress 0 standing, 1 lying on the back). */
export function fallPose(t: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  void t;
  const pose = neutralPose();
  const f = clamp01(p.progress);
  const topple = f * f; // accelerates as it tips
  const h = p.heightM;
  pose.root.pitch = Math.PI / 2 * topple;
  // Hips drop from 47 % of the height to about 15 cm above the ground (lying on the back).
  pose.root.offset.y = -(0.47 * h - 0.15) * topple;
  const flail = Math.sin(f * Math.PI);
  pose.joints.upperArmL.z = 0.06 + 1.2 * flail;
  pose.joints.upperArmR.z = -(0.06 + 1.2 * flail);
  pose.joints.upperArmL.x = -0.5 * flail;
  pose.joints.upperArmR.x = -0.5 * flail;
  pose.joints.thighL.x = -0.3 * flail;
  pose.joints.thighR.x = 0.2 * flail;
  pose.joints.head.x = 0.4 * flail;
  return pose;
}

export function blendPoses(a: Pose, b: Pose, w: number): Pose {
  const k = clamp01(w);
  const out = neutralPose();
  const mix = (x: number, y: number) => x + (y - x) * k;
  out.root.offset = { x: mix(a.root.offset.x, b.root.offset.x), y: mix(a.root.offset.y, b.root.offset.y), z: mix(a.root.offset.z, b.root.offset.z) };
  out.root.pitch = mix(a.root.pitch, b.root.pitch);
  out.root.yaw = mix(a.root.yaw, b.root.yaw);
  for (const j of JOINTS) {
    out.joints[j] = { x: mix(a.joints[j].x, b.joints[j].x), y: mix(a.joints[j].y, b.joints[j].y), z: mix(a.joints[j].z, b.joints[j].z) };
  }
  return out;
}

/** Idle -> walk -> run blend by ground speed (idle below 0.2 m/s, walk at 1.4 m/s, run from 3.5 m/s). */
export function locomotionPose(t: number, speed: number, p: AnimationParams = DEFAULT_PARAMS): Pose {
  const params = { ...p, speed };
  if (speed <= 0.2) return idlePose(t, params);
  if (speed < 1.4) return blendPoses(idlePose(t, params), walkPose(t, params), (speed - 0.2) / 1.2);
  if (speed < 3.5) return blendPoses(walkPose(t, params), runPose(t, params), (speed - 1.4) / 2.1);
  return runPose(t, params);
}

export function samplePose(name: AnimationName, t: number, p: Partial<AnimationParams> = {}): Pose {
  const params = { ...DEFAULT_PARAMS, ...p };
  switch (name) {
    case "idle":
      return idlePose(t, params);
    case "walk":
      return walkPose(t, params);
    case "run":
      return runPose(t, { ...params, speed: Math.max(params.speed, 3.5) });
    case "look-around":
      return lookAroundPose(t, params);
    case "wave":
      return wavePose(t, params);
    case "kneel":
      return kneelPose(t, params);
    case "fall":
      return fallPose(t, params);
  }
}

/** Period of the looping animations in seconds (0 for one-shot animations). */
export function animationPeriod(name: AnimationName, p: Partial<AnimationParams> = {}): number {
  const params = { ...DEFAULT_PARAMS, ...p };
  switch (name) {
    case "walk":
      return 1 / (0.55 + 0.25 * Math.max(0.2, params.speed));
    case "run":
      return 1 / (1.1 + 0.25 * Math.max(3.5, params.speed));
    case "idle":
      return 8;
    case "look-around":
      return 8;
    case "wave":
      return 8;
    default:
      return 0;
  }
}
