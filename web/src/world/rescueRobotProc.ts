import * as THREE from "three";

/** Rescue robot skills, run in this order by the rescue scenario. Dimensions and speeds are design assumptions. */
export type RescueSkillId = "descend" | "secure" | "winch";

export const RESCUE_SKILL_DURATION_S: Readonly<Record<RescueSkillId, number>> = {
  descend: 10,
  secure: 8,
  winch: 12,
};

export type StretcherState = "stowed" | "lowering" | "loaded";

export interface RescuePose {
  /** Boom pitch above horizontal (rad). */
  armPitch: number;
  /** Tether length paid out below the boom tip (m). */
  winchM: number;
  stretcher: StretcherState;
}

export const RESCUE_POSE_STOWED: RescuePose = { armPitch: 0.15, winchM: 0.2, stretcher: "stowed" };

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * Pure pose of the winch arm and stretcher for a skill at progress `u` in [0, 1].
 * `pitDepthM` is the tether length needed to reach the casualty on the pit floor.
 */
export function rescuePoseFor(skill: RescueSkillId, u: number, pitDepthM: number): RescuePose {
  const k = clamp01(u);
  const reach = pitDepthM + 0.9;
  switch (skill) {
    case "descend":
      return { armPitch: lerp(0.15, -0.35, k), winchM: lerp(0.2, reach, k), stretcher: "lowering" };
    case "secure":
      return { armPitch: -0.35, winchM: reach, stretcher: k < 0.5 ? "lowering" : "loaded" };
    case "winch":
      return { armPitch: lerp(-0.35, 0.15, k), winchM: lerp(reach, 0.8, k), stretcher: "loaded" };
  }
}

export interface RescueRobotModel {
  group: THREE.Group;
  /** Contact points in group-local coordinates for terrain placement. */
  contactPoints: { x: number; y: number; z: number }[];
  applyPose(pose: RescuePose): void;
  /** Tether tip (hook) in group-local coordinates. */
  hook: THREE.Object3D;
}

/** Procedural tracked rescue robot: two tracks, chassis, camera mast, boom with winch tether and a stretcher. */
export function buildRescueRobotModel(): RescueRobotModel {
  const g = new THREE.Group();
  g.name = "model:rescue-robot";
  const body = new THREE.MeshStandardMaterial({ color: 0xe8ebef, roughness: 0.45, metalness: 0.35 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.45, metalness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23282f, roughness: 0.85, metalness: 0.2 });

  for (const side of [-1, 1]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 1.5), dark);
    track.position.set(side * 0.52, 0.17, 0);
    track.castShadow = true;
    g.add(track);
    for (const z of [-0.6, 0.6]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 12), body);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.52, 0.17, z);
      g.add(wheel);
    }
  }
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.3, 1.2), body);
  chassis.position.set(0, 0.45, 0);
  chassis.castShadow = true;
  g.add(chassis);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.9), accent);
  stripe.position.set(0, 0.62, 0);
  g.add(stripe);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), body);
  mast.position.set(0, 0.85, 0.45);
  g.add(mast);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x35e0ff }));
  lens.position.set(0, 1.12, 0.45);
  g.add(lens);

  // Boom pivots at the rear of the chassis and points backward (-z); the tether hangs from its tip.
  const boomPivot = new THREE.Group();
  boomPivot.position.set(0, 0.7, -0.35);
  g.add(boomPivot);
  const BOOM_LEN = 1.4;
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, BOOM_LEN), accent);
  boom.position.z = -BOOM_LEN / 2;
  boom.castShadow = true;
  boomPivot.add(boom);
  const tip = new THREE.Object3D();
  tip.position.z = -BOOM_LEN;
  boomPivot.add(tip);

  const tether = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
  );
  g.add(tether);
  const stretcher = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 1.7), new THREE.MeshStandardMaterial({ color: 0xffb800, roughness: 0.6 }));
  g.add(stretcher);
  const hook = new THREE.Object3D();
  g.add(hook);

  const tmp = new THREE.Vector3();
  const applyPose = (pose: RescuePose): void => {
    boomPivot.rotation.x = -pose.armPitch;
    g.updateMatrixWorld(true);
    // Tip in group-local space (group is the parent of the pivot).
    tip.getWorldPosition(tmp);
    g.worldToLocal(tmp);
    const len = Math.max(0.05, pose.winchM);
    tether.scale.y = len;
    tether.position.set(tmp.x, tmp.y - len / 2, tmp.z);
    hook.position.set(tmp.x, tmp.y - len, tmp.z);
    stretcher.visible = pose.stretcher !== "stowed";
    stretcher.position.set(tmp.x, tmp.y - len - 0.05, tmp.z);
  };
  applyPose(RESCUE_POSE_STOWED);

  const contactPoints: { x: number; y: number; z: number }[] = [];
  for (const x of [-0.52, 0.52]) for (const z of [-0.7, 0, 0.7]) contactPoints.push({ x, y: 0, z });
  return { group: g, contactPoints, applyPose, hook };
}

/** Time-stepped skill sequencer that mirrors the `SkillRunner` pattern of the manipulator arm. */
export class RescueSkillRunner {
  active: RescueSkillId | null = null;
  private elapsed = 0;

  constructor(
    private model: RescueRobotModel,
    private pitDepthM: number,
    private onEvent: (event: string, skill: RescueSkillId) => void = () => {},
  ) {}

  start(skill: RescueSkillId): void {
    this.active = skill;
    this.elapsed = 0;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    const dur = RESCUE_SKILL_DURATION_S[this.active];
    const u = clamp01(this.elapsed / dur);
    this.model.applyPose(rescuePoseFor(this.active, u, this.pitDepthM));
    if (u >= 1) {
      const done = this.active;
      this.active = null;
      this.onEvent(`${done}_done`, done);
    }
  }
}
