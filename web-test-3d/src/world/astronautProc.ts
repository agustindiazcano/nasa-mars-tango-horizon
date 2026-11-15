import { ASTRONAUT_START } from "@th/shared";
import * as THREE from "three";
import { metabolicRateW, terrainFromThermalClass } from "../core/physics";
import type { TerrainProc } from "./terrainProc";

export class AstronautProc {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3(ASTRONAUT_START.x, 0, ASTRONAUT_START.z);
  yaw = 0.4;
  pitch = -0.05;
  speed = 0;
  gradePct = 0;
  povMode: "1st" | "3rd" = "1st";
  orbitYaw = 0.6;
  orbitPitch = 0.42;
  orbitDist = 11;

  private keys = new Set<string>();
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private torsoGroup: THREE.Group;
  private headGroup: THREE.Group;
  private plssLed: THREE.Mesh;
  private gaitPhase = 0;
  private breathPhase = 0;
  private readonly eyeHeight = 1.68;

  constructor(
    private terrain: TerrainProc,
    private camera: THREE.PerspectiveCamera,
    private dom: HTMLElement,
  ) {
    const suitWhite = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.55, metalness: 0.08 });
    const suitTrim = new THREE.MeshStandardMaterial({ color: 0xd96b27, roughness: 0.5, metalness: 0.15 });
    const darkJoint = new THREE.MeshStandardMaterial({ color: 0x38424d, roughness: 0.7, metalness: 0.25 });
    const visorGold = new THREE.MeshStandardMaterial({
      color: 0xf0b24a,
      roughness: 0.12,
      metalness: 0.92,
      emissive: 0x2a1804,
    });

    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 0.96;
    this.group.add(this.torsoGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.3), suitWhite);
    torso.castShadow = true;
    this.torsoGroup.add(torso);

    const chestPack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.1), suitTrim);
    chestPack.position.set(0, 0.05, -0.18);
    this.torsoGroup.add(chestPack);

    // PLSS Backpack
    const plss = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.22), suitWhite);
    plss.position.set(0, 0.04, 0.25);
    plss.castShadow = true;
    this.torsoGroup.add(plss);

    const plssStripe = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.08, 0.23), suitTrim);
    plssStripe.position.set(0, 0.16, 0.25);
    this.torsoGroup.add(plssStripe);

    this.plssLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x35e0ff }),
    );
    this.plssLed.position.set(0.14, 0.24, 0.37);
    this.torsoGroup.add(this.plssLed);

    // Helmet
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.44, 0);
    this.torsoGroup.add(this.headGroup);

    const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), suitWhite);
    helmetShell.castShadow = true;
    this.headGroup.add(helmetShell);

    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 16, 12, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.5),
      visorGold,
    );
    visor.position.set(0, 0.01, -0.055);
    this.headGroup.add(visor);

    // Arms
    const makeLimb = (r: number, len: number, mat: THREE.Material) => {
      const g = new THREE.Group();
      const joint = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 10, 8), darkJoint);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 10), mat);
      seg.position.y = -len / 2;
      seg.castShadow = true;
      g.add(joint, seg);
      return g;
    };

    this.leftArm = makeLimb(0.075, 0.55, suitWhite);
    this.leftArm.position.set(-0.31, 0.22, 0);
    this.torsoGroup.add(this.leftArm);

    this.rightArm = makeLimb(0.075, 0.55, suitWhite);
    this.rightArm.position.set(0.31, 0.22, 0);
    this.torsoGroup.add(this.rightArm);

    // Legs
    this.leftLeg = makeLimb(0.095, 0.76, suitWhite);
    this.leftLeg.position.set(-0.14, 0.78, 0);
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.25), darkJoint);
    bootL.position.set(0, -0.74, -0.04);
    this.leftLeg.add(bootL);
    this.group.add(this.leftLeg);

    this.rightLeg = makeLimb(0.095, 0.76, suitWhite);
    this.rightLeg.position.set(0.14, 0.78, 0);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.25), darkJoint);
    bootR.position.set(0, -0.74, -0.04);
    this.rightLeg.add(bootR);
    this.group.add(this.rightLeg);

    this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.group.position.copy(this.pos);
    this.setPovMode("1st");

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    this.dom.addEventListener("mousemove", (e) => {
      if (this.povMode === "1st") {
        if (document.pointerLockElement !== this.dom) return;
        this.yaw -= e.movementX * 0.0022;
        this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.25, 1.25);
      } else if (e.buttons === 1 || document.pointerLockElement === this.dom) {
        this.orbitYaw -= e.movementX * 0.004;
        this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + e.movementY * 0.004, 0.08, 1.35);
      }
    });

    this.dom.addEventListener(
      "wheel",
      (e) => {
        if (this.povMode === "3rd") {
          this.orbitDist = THREE.MathUtils.clamp(this.orbitDist + e.deltaY * 0.012, 3.5, 55);
        }
      },
      { passive: true },
    );
  }

  setPovMode(mode: "1st" | "3rd"): void {
    this.povMode = mode;
    // Hide own head/visor in 1st person so camera never clips inside helmet mesh
    this.headGroup.visible = mode === "3rd";
    this.torsoGroup.visible = mode === "3rd";
    this.leftLeg.visible = mode === "3rd";
    this.rightLeg.visible = mode === "3rd";
  }

  togglePov(): "1st" | "3rd" {
    this.setPovMode(this.povMode === "1st" ? "3rd" : "1st");
    return this.povMode;
  }

  update(
    dt: number,
    bodyKg: number,
    loadKg: number,
    leakActive: boolean,
  ): { metabolicW: number; svf: number; thermalClass: 0 | 1 | 2 } {
    const f = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const s = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const maxSpeed = sprint ? 2.1 : 1.25;

    const dir = new THREE.Vector3(s, 0, -f);
    const moving = dir.lengthSq() > 0;
    if (moving) {
      const refYaw = this.povMode === "1st" ? this.yaw : this.orbitYaw;
      dir.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, refYaw);
      this.yaw = Math.atan2(-dir.x, -dir.z);
    }

    const beforeY = this.terrain.heightAt(this.pos.x, this.pos.z);
    const step = moving ? maxSpeed * dt : 0;
    const half = this.terrain.sizeM / 2 - 20;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x + dir.x * step, -half, half);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z + dir.z * step, -half, half);
    const afterY = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.pos.y = afterY;

    this.speed = moving ? maxSpeed : 0;
    this.gradePct = step > 0 ? THREE.MathUtils.clamp(((afterY - beforeY) / step) * 100, -45, 45) : 0;

    const tc = this.terrain.thermalClassAt(this.pos.x, this.pos.z);
    const svf = this.terrain.svfAt(this.pos.x, this.pos.z);
    const metabolicW = metabolicRateW({
      bodyKg,
      loadKg,
      speed: this.speed,
      gradePct: this.gradePct,
      terrain: terrainFromThermalClass(tc),
    });

    // Articulated limb gait + breathing oscillation
    const breathFreq = 1.4 + (metabolicW - 150) * 0.004;
    this.breathPhase += dt * breathFreq;
    const breathBob = Math.sin(this.breathPhase) * 0.011;

    if (moving) {
      this.gaitPhase += dt * this.speed * 5.2;
      const swing = Math.sin(this.gaitPhase) * 0.55;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.65;
      this.rightArm.rotation.x = swing * 0.65;
    } else {
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
    }

    this.torsoGroup.position.y = 0.96 + breathBob;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;

    // PLSS status LED pulses red during suit leak
    const ledMat = this.plssLed.material as THREE.MeshBasicMaterial;
    if (leakActive) {
      ledMat.color.setHex(Math.sin(this.breathPhase * 5) > 0 ? 0xff2a55 : 0x440814);
    } else {
      ledMat.color.setHex(0x35e0ff);
    }

    // Update camera
    if (this.povMode === "1st") {
      this.camera.position.set(this.pos.x, afterY + this.eyeHeight + breathBob, this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    } else {
      const cx = this.pos.x + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
      const cy = afterY + 1.5 + Math.sin(this.orbitPitch) * this.orbitDist;
      const cz = this.pos.z + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
      const minGround = this.terrain.heightAt(cx, cz) + 1.2;
      this.camera.position.set(cx, Math.max(cy, minGround), cz);
      this.camera.lookAt(this.pos.x, afterY + 1.4, this.pos.z);
    }

    return { metabolicW, svf, thermalClass: tc };
  }
}
