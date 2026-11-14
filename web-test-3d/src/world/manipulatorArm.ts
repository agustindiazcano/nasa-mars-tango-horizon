import * as THREE from "three";
import type { ArmSkillId } from "../core/types";

export type ArmTool = "gripper" | "drill" | "scoop" | "camera";

export interface ArmAngles {
  yaw: number;
  shoulder: number;
  elbow: number;
  wrist: number;
}

const L1 = 0.9;
const L2 = 0.8;
export const ARM_REACH = L1 + L2 - 0.02;
const ARM_MIN = Math.abs(L1 - L2) + 0.05;

/**
 * Procedural 4-DOF manipulator arm (Mars sampling heritage: Curiosity / Perseverance).
 * Dimensions and speeds are design assumptions.
 * Hierarchy: root -> yaw (Y) -> shoulder (X) -> elbow (X) -> wrist (X) -> toolTip.
 */
export class ManipulatorArm {
  readonly root = new THREE.Group();
  readonly toolTip = new THREE.Object3D();
  tool: ArmTool = "gripper";
  drillSpin = 0;

  private yaw = new THREE.Group();
  private shoulder = new THREE.Group();
  private elbow = new THREE.Group();
  private wrist = new THREE.Group();
  private current: ArmAngles = { yaw: 0, shoulder: -1.2, elbow: 2.4, wrist: -1.2 };
  private goal: ArmAngles = { ...this.current };
  private bit: THREE.Mesh;
  private scoopMesh: THREE.Mesh;
  private camMesh: THREE.Mesh;
  private gripperA: THREE.Mesh;
  private gripperB: THREE.Mesh;
  private drillParticles: THREE.Points;
  private drillPhase = 0;

  constructor() {
    const metal = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.65, roughness: 0.35 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xf09d2c, metalness: 0.4, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a313a, metalness: 0.5, roughness: 0.5 });

    const link = (len: number, r: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), metal);
      m.rotation.x = Math.PI / 2;
      m.position.z = len / 2;
      m.castShadow = true;
      return m;
    };
    const joint = (r: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), accent);

    this.root.add(this.yaw);
    this.yaw.add(joint(0.095), this.shoulder);
    this.shoulder.add(link(L1, 0.05), this.elbow);
    this.elbow.position.z = L1;
    this.elbow.add(joint(0.075), link(L2, 0.042), this.wrist);
    this.wrist.position.z = L2;
    this.wrist.add(joint(0.06), this.toolTip);
    this.toolTip.position.z = 0.2;

    // End effector turret tools
    this.bit = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.008, 0.22, 8), dark);
    this.bit.rotation.x = Math.PI / 2;
    this.bit.position.z = 0.11;
    this.wrist.add(this.bit);

    this.scoopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.16), accent);
    this.scoopMesh.position.z = 0.11;
    this.wrist.add(this.scoopMesh);

    this.camMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), dark);
    this.camMesh.position.z = 0.09;
    this.wrist.add(this.camMesh);

    this.gripperA = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.16), metal);
    this.gripperA.position.set(-0.045, 0, 0.11);
    this.gripperB = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.16), metal);
    this.gripperB.position.set(0.045, 0, 0.11);
    this.wrist.add(this.gripperA, this.gripperB);

    // Regolith particles around drill tip
    const pPos = new Float32Array(36 * 3);
    for (let i = 0; i < 36; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 0.18;
      pPos[i * 3 + 1] = Math.random() * 0.14;
      pPos[i * 3 + 2] = 0.18 + (Math.random() - 0.5) * 0.14;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    this.drillParticles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xc97b4b, size: 0.04, transparent: true, opacity: 0.85 }),
    );
    this.drillParticles.visible = false;
    this.wrist.add(this.drillParticles);

    this.apply(this.current);
  }

  /** Analytic 2-bone inverse kinematics in arm root local frame. */
  solve(target: THREE.Vector3, toolPitch = Math.PI / 2): ArmAngles | null {
    const yaw = Math.atan2(target.x, target.z);
    const horiz = Math.hypot(target.x, target.z);
    const r = horiz - Math.cos(toolPitch) * this.toolTip.position.z;
    const h = target.y + Math.sin(toolPitch) * this.toolTip.position.z;
    const d = Math.hypot(r, h);
    if (d > ARM_REACH || d < ARM_MIN) return null;
    const elbowInt = Math.acos(THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const lift = Math.atan2(h, r) + Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const shoulder = -lift;
    const elbow = Math.PI - elbowInt;
    const wrist = toolPitch - (shoulder + elbow);
    return { yaw, shoulder, elbow, wrist };
  }

  reach(targetInRoot: THREE.Vector3, toolPitch = Math.PI / 2): boolean {
    const a = this.solve(targetInRoot, toolPitch);
    if (!a) return false;
    this.goal = a;
    return true;
  }

  stow(): void {
    this.goal = { yaw: 0, shoulder: -1.2, elbow: 2.4, wrist: -1.2 };
  }

  update(dt: number, maxSpeed = 1.15): boolean {
    let done = true;
    for (const k of ["yaw", "shoulder", "elbow", "wrist"] as const) {
      const diff = this.goal[k] - this.current[k];
      const step = maxSpeed * dt;
      if (Math.abs(diff) > step) {
        this.current[k] += Math.sign(diff) * step;
        done = false;
      } else {
        this.current[k] = this.goal[k];
      }
    }
    this.apply(this.current);

    this.bit.visible = this.tool === "drill";
    this.scoopMesh.visible = this.tool === "scoop";
    this.camMesh.visible = this.tool === "camera";
    this.gripperA.visible = this.tool === "gripper";
    this.gripperB.visible = this.tool === "gripper";

    if (this.drillSpin > 0 && this.tool === "drill") {
      this.bit.rotation.z += this.drillSpin * dt;
      this.drillParticles.visible = true;
      this.drillPhase += dt * 12;
      const attr = this.drillParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        const ang = this.drillPhase + i * 0.7;
        const rad = 0.04 + ((i % 5) * 0.025);
        attr.setXYZ(i, Math.cos(ang) * rad, ((this.drillPhase * 0.1 + i * 0.03) % 0.22), 0.18 + Math.sin(ang) * rad);
      }
      attr.needsUpdate = true;
    } else {
      this.drillParticles.visible = false;
    }
    return done;
  }

  private apply(a: ArmAngles): void {
    this.yaw.rotation.y = a.yaw;
    this.shoulder.rotation.x = a.shoulder;
    this.elbow.rotation.x = a.elbow;
    this.wrist.rotation.x = a.wrist;
  }
}

export interface SkillStep {
  tool?: ArmTool;
  point?: THREE.Vector3;
  toolPitch?: number;
  hold?: number;
  drillSpin?: number;
  event?: string;
  stow?: boolean;
}

export function buildSkillSteps(id: ArmSkillId, target: THREE.Vector3): SkillStep[] {
  const above = target.clone().add(new THREE.Vector3(0, 0.26, 0));
  switch (id) {
    case "drill":
      return [
        { tool: "drill", point: above, toolPitch: Math.PI / 2 },
        { point: target, toolPitch: Math.PI / 2, drillSpin: 26, event: "drill_start" },
        { point: target.clone().add(new THREE.Vector3(0, -0.06, 0)), toolPitch: Math.PI / 2, hold: 2.8, drillSpin: 26 },
        { point: above, toolPitch: Math.PI / 2, drillSpin: 0, event: "core_acquired" },
        { stow: true },
      ];
    case "sample":
      return [
        { tool: "scoop", point: above, toolPitch: 1.2 },
        { point: target, toolPitch: 1.2 },
        { point: target.clone().add(new THREE.Vector3(0, 0.06, 0.1)), toolPitch: 0.6, hold: 0.7, event: "sample_acquired" },
        { point: above, toolPitch: 0.9 },
        { stow: true },
      ];
    case "photograph":
      return [
        { tool: "camera", point: target.clone().add(new THREE.Vector3(0, 0.34, -0.08)), toolPitch: 1.25, hold: 1.1, event: "photo_taken" },
        { stow: true },
      ];
    case "handover":
      return [
        { tool: "gripper", point: new THREE.Vector3(-0.32, 0.28, 0.25), toolPitch: 1.35, hold: 0.5, event: "tool_grasped" },
        { point: target, toolPitch: 0.05, hold: 2.2, event: "tool_offered" },
        { event: "tool_released" },
        { stow: true },
      ];
  }
}

export class SkillRunner {
  private steps: SkillStep[] = [];
  private idx = 0;
  private holdLeft = 0;
  private stepStarted = false;
  active: ArmSkillId | null = null;

  constructor(
    private arm: ManipulatorArm,
    private onEvent: (event: string, skill: ArmSkillId) => void,
  ) {}

  start(id: ArmSkillId, targetInRoot: THREE.Vector3): boolean {
    const steps = buildSkillSteps(id, targetInRoot);
    if (steps.some((s) => s.point && !this.arm.solve(s.point, s.toolPitch ?? Math.PI / 2))) {
      return false;
    }
    this.steps = steps;
    this.idx = 0;
    this.stepStarted = false;
    this.active = id;
    return true;
  }

  update(dt: number): void {
    if (!this.active) {
      this.arm.update(dt);
      return;
    }
    const s = this.steps[this.idx];
    if (!s) {
      this.active = null;
      this.arm.update(dt);
      return;
    }
    if (!this.stepStarted) {
      if (s.tool) this.arm.tool = s.tool;
      if (s.drillSpin !== undefined) this.arm.drillSpin = s.drillSpin;
      if (s.stow) this.arm.stow();
      else if (s.point) this.arm.reach(s.point, s.toolPitch ?? Math.PI / 2);
      this.holdLeft = s.hold ?? 0;
      this.stepStarted = true;
    }
    const arrived = this.arm.update(dt);
    if (!arrived) return;
    if (this.holdLeft > 0) {
      this.holdLeft -= dt;
      return;
    }
    if (s.event) this.onEvent(s.event, this.active);
    this.idx++;
    this.stepStarted = false;
  }
}
