import { ASTRONAUT_START, BASE_ORIGIN } from "@th/shared";
import * as THREE from "three";
import { metabolicRateW, terrainFromThermalClass } from "@th/shared";
import type { TerrainProc } from "./terrainProc";
import { createNasaInsignia } from "./nasaInsignia";

export type PovMode = "1st" | "3rd" | "iso";

export class AstronautProc {
  readonly group = new THREE.Group();
  readonly helmetCamera = new THREE.PerspectiveCamera(62, 512 / 384, 0.25, 2500);
  readonly pos = new THREE.Vector3(ASTRONAUT_START.x, 0, ASTRONAUT_START.z);
  yaw = 0.65;
  pitch = -0.04;
  speed = 0;
  gradePct = 0;
  povMode: PovMode = "1st";
  mouseSensitivity = 0.0028;
  orbitYaw = 0.6;
  orbitPitch = 0.42;
  orbitDist = 11;
  readonly isoTarget = new THREE.Vector3(BASE_ORIGIN.x + 15, 0, BASE_ORIGIN.z - 5);
  isoYaw = Math.PI / 4;
  isoPitch = 0.68;
  isoDist = 145;

  private keys = new Set<string>();
  private velX = 0;
  private velZ = 0;
  private dragDistPx = 0;
  private breathBob = 0;
  private breathFreq = 1.4;
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

    const insignia = createNasaInsignia(0.14);
    insignia.position.set(0, 0.05, -0.234);
    insignia.rotation.y = Math.PI;
    this.torsoGroup.add(insignia);

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

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        this.keys.add(e.code);
      });
      window.addEventListener("keyup", (e) => this.keys.delete(e.code));
      window.addEventListener("blur", () => this.keys.clear());
    }

    this.dom.addEventListener("mousedown", () => {
      this.dragDistPx = 0;
    });

    this.dom.addEventListener("contextmenu", (e) => {
      if (this.povMode === "iso" || this.povMode === "3rd") {
        e.preventDefault();
      }
    });

    this.dom.addEventListener("mousemove", (e) => {
      if (e.buttons !== 0) {
        this.dragDistPx += Math.hypot(e.movementX, e.movementY);
      }
      if (this.povMode === "1st") {
        if (typeof document === "undefined" || document.pointerLockElement !== this.dom) return;
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - e.movementY * this.mouseSensitivity,
          -1.45,
          1.45,
        );
        this.syncCamera();
      } else if (this.povMode === "3rd") {
        if ((e.buttons & 1) !== 0 || (typeof document !== "undefined" && document.pointerLockElement === this.dom)) {
          this.orbitYaw -= e.movementX * 0.004;
          this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + e.movementY * 0.004, 0.08, 1.35);
          this.syncCamera();
        }
      } else if (this.povMode === "iso") {
        if ((e.buttons & 1) !== 0 && !e.shiftKey) {
          this.isoYaw -= e.movementX * 0.005;
          this.isoPitch = THREE.MathUtils.clamp(this.isoPitch + e.movementY * 0.005, 0.18, 1.48);
          this.syncCamera();
        } else if ((e.buttons & 2) !== 0 || (e.buttons & 4) !== 0 || ((e.buttons & 1) !== 0 && e.shiftKey)) {
          const panScale = Math.max(0.06, this.isoDist * 0.0016);
          const fwdX = -Math.sin(this.isoYaw);
          const fwdZ = -Math.cos(this.isoYaw);
          const rightX = Math.cos(this.isoYaw);
          const rightZ = -Math.sin(this.isoYaw);
          const half = this.terrain.sizeM / 2 - 20;
          this.isoTarget.x = THREE.MathUtils.clamp(
            this.isoTarget.x - (rightX * e.movementX - fwdX * e.movementY) * panScale,
            -half,
            half,
          );
          this.isoTarget.z = THREE.MathUtils.clamp(
            this.isoTarget.z - (rightZ * e.movementX - fwdZ * e.movementY) * panScale,
            -half,
            half,
          );
          this.isoTarget.y = this.terrain.heightAt(this.isoTarget.x, this.isoTarget.z);
          this.syncCamera();
        }
      }
    });

    this.dom.addEventListener(
      "wheel",
      (e) => {
        if (this.povMode === "3rd") {
          this.orbitDist = THREE.MathUtils.clamp(this.orbitDist + e.deltaY * 0.012, 3.5, 55);
          this.syncCamera();
        } else if (this.povMode === "iso") {
          this.isoDist = THREE.MathUtils.clamp(
            this.isoDist * Math.exp(e.deltaY * 0.0012),
            10,
            1800,
          );
          this.syncCamera();
        }
      },
      { passive: true },
    );
  }

  consumeWasDragged(thresholdPx = 6): boolean {
    const dragged = this.dragDistPx >= thresholdPx;
    this.dragDistPx = 0;
    return dragged;
  }

  setKeyForTest(code: string, down: boolean): void {
    if (down) this.keys.add(code);
    else this.keys.delete(code);
  }

  setPovMode(mode: PovMode): void {
    this.povMode = mode;
    if (mode !== "1st" && typeof document !== "undefined" && document.pointerLockElement === this.dom) {
      document.exitPointerLock?.();
    }
    if (mode === "iso") {
      const bx = BASE_ORIGIN.x + 15;
      const bz = BASE_ORIGIN.z - 5;
      this.isoTarget.set(bx, this.terrain.heightAt(bx, bz), bz);
      this.isoYaw = Math.PI / 4;
      this.isoPitch = 0.68;
      this.isoDist = 145;
    }
    // Hide own head/visor in 1st person so camera never clips inside helmet mesh
    const showBody = mode !== "1st";
    this.headGroup.visible = showBody;
    this.torsoGroup.visible = showBody;
    this.leftLeg.visible = showBody;
    this.rightLeg.visible = showBody;
    this.syncCamera();
  }

  togglePov(): PovMode {
    if (this.povMode === "1st") this.setPovMode("3rd");
    else this.setPovMode("1st");
    return this.povMode;
  }

  toggleIso(): PovMode {
    this.setPovMode(this.povMode === "iso" ? "1st" : "iso");
    return this.povMode;
  }

  /** High-rate (60+ FPS) movement and camera integration for crisp Half-Life / aerial responsiveness. */
  updateMovement(dt: number): void {
    const safeDt = Math.min(Math.max(dt, 0), 0.1);
    const f =
      (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
      (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
    const s =
      (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const half = this.terrain.sizeM / 2 - 20;

    if (this.povMode === "iso") {
      const panDir = new THREE.Vector3(s, 0, -f);
      if (panDir.lengthSq() > 0) {
        panDir.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.isoYaw);
        const panSpeed = Math.max(24, this.isoDist * 0.85) * (sprint ? 2.2 : 1.0);
        this.isoTarget.x = THREE.MathUtils.clamp(this.isoTarget.x + panDir.x * panSpeed * safeDt, -half, half);
        this.isoTarget.z = THREE.MathUtils.clamp(this.isoTarget.z + panDir.z * panSpeed * safeDt, -half, half);
        this.isoTarget.y = this.terrain.heightAt(this.isoTarget.x, this.isoTarget.z);
      }
      this.velX = 0;
      this.velZ = 0;
      this.speed = 0;
      this.gradePct = 0;
      this.relaxLimbs(safeDt);
      this.syncCamera();
      return;
    }

    const maxSpeed = sprint ? 4.4 : 2.4;
    const wishDir = new THREE.Vector3(s, 0, -f);
    const hasInput = wishDir.lengthSq() > 0;
    const refYaw = this.povMode === "1st" ? this.yaw : this.orbitYaw;
    if (hasInput) {
      wishDir.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, refYaw);
      // In 3rd person, rotate character toward travel vector; in 1st person, keep FPS aim untouched.
      if (this.povMode === "3rd") {
        this.yaw = Math.atan2(-wishDir.x, -wishDir.z);
      }
    }

    // Half-Life style crisp ground acceleration & high stopping friction
    const wishVx = hasInput ? wishDir.x * maxSpeed : 0;
    const wishVz = hasInput ? wishDir.z * maxSpeed : 0;
    const rate = hasInput ? 18 : 15;
    const blend = 1 - Math.exp(-rate * safeDt);
    this.velX += (wishVx - this.velX) * blend;
    this.velZ += (wishVz - this.velZ) * blend;
    if (!hasInput && Math.hypot(this.velX, this.velZ) < 0.04) {
      this.velX = 0;
      this.velZ = 0;
    }

    const beforeY = this.terrain.heightAt(this.pos.x, this.pos.z);
    const dx = this.velX * safeDt;
    const dz = this.velZ * safeDt;
    const step = Math.hypot(dx, dz);
    this.pos.x = THREE.MathUtils.clamp(this.pos.x + dx, -half, half);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z + dz, -half, half);
    const afterY = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.pos.y = afterY;

    this.speed = Math.hypot(this.velX, this.velZ);
    this.gradePct = step > 0.0005 ? THREE.MathUtils.clamp(((afterY - beforeY) / step) * 100, -45, 45) : 0;

    this.breathPhase += safeDt * this.breathFreq;
    this.breathBob = Math.sin(this.breathPhase) * 0.011;

    if (this.speed > 0.08) {
      this.gaitPhase += safeDt * this.speed * 4.4;
      const swing = Math.sin(this.gaitPhase) * 0.55;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.65;
      this.rightArm.rotation.x = swing * 0.65;
    } else {
      this.relaxLimbs(safeDt);
    }

    this.torsoGroup.position.y = 0.96 + this.breathBob;
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.syncCamera();
  }

  private relaxLimbs(dt: number): void {
    const factor = Math.pow(0.82, dt * 60);
    this.leftLeg.rotation.x *= factor;
    this.rightLeg.rotation.x *= factor;
    this.leftArm.rotation.x *= factor;
    this.rightArm.rotation.x *= factor;
  }

  syncCamera(): void {
    this.helmetCamera.position.set(this.pos.x, this.pos.y + this.eyeHeight + this.breathBob, this.pos.z);
    this.helmetCamera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    if (this.povMode === "1st") {
      this.camera.position.set(this.pos.x, this.pos.y + this.eyeHeight + this.breathBob, this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    } else if (this.povMode === "3rd") {
      const cx = this.pos.x + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
      const cy = this.pos.y + 1.5 + Math.sin(this.orbitPitch) * this.orbitDist;
      const cz = this.pos.z + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
      const minGround = this.terrain.heightAt(cx, cz) + 1.2;
      this.camera.position.set(cx, Math.max(cy, minGround), cz);
      this.camera.lookAt(this.pos.x, this.pos.y + 1.4, this.pos.z);
    } else {
      const cx = this.isoTarget.x + Math.sin(this.isoYaw) * Math.cos(this.isoPitch) * this.isoDist;
      const cy = this.isoTarget.y + Math.sin(this.isoPitch) * this.isoDist;
      const cz = this.isoTarget.z + Math.cos(this.isoYaw) * Math.cos(this.isoPitch) * this.isoDist;
      const minGround = this.terrain.heightAt(cx, cz) + 4.0;
      this.camera.position.set(cx, Math.max(cy, minGround), cz);
      this.camera.lookAt(this.isoTarget.x, this.isoTarget.y + 2.0, this.isoTarget.z);
    }
  }

  captureHelmetCamera(renderer: THREE.WebGLRenderer, scene: THREE.Scene): string {
    const w = 512;
    const h = 384;
    this.helmetCamera.position.set(this.pos.x, this.pos.y + this.eyeHeight + this.breathBob, this.pos.z);
    this.helmetCamera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.helmetCamera.updateMatrixWorld(true);

    const prevGroupVisible = this.group.visible;
    this.group.visible = false;
    const rt = new THREE.WebGLRenderTarget(w, h);
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, this.helmetCamera);

    const pixels = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
    renderer.setRenderTarget(prevTarget);
    rt.dispose();
    this.group.visible = prevGroupVisible;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const srcRow = (h - 1 - y) * w * 4;
      const dstRow = y * w * 4;
      imgData.data.set(pixels.subarray(srcRow, srcRow + w * 4), dstRow);
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.fillStyle = "rgba(6, 12, 18, 0.72)";
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = "#35e0ff";
    ctx.font = "11px monospace";
    ctx.fillText(`HELMET VISOR CAM // ASTRONAUT // ${w}x${h}`, 8, h - 7);

    return canvas.toDataURL("image/jpeg", 0.78);
  }

  computeBioMetrics(
    bodyKg: number,
    loadKg: number,
    leakActive: boolean,
  ): { metabolicW: number; svf: number; thermalClass: 0 | 1 | 2 } {
    const tc = this.terrain.thermalClassAt(this.pos.x, this.pos.z);
    const svf = this.terrain.svfAt(this.pos.x, this.pos.z);
    const metabolicW = metabolicRateW({
      bodyKg,
      loadKg,
      speed: this.speed,
      gradePct: this.gradePct,
      terrain: terrainFromThermalClass(tc),
    });
    this.breathFreq = 1.4 + (metabolicW - 150) * 0.004;

    const ledMat = this.plssLed.material as THREE.MeshBasicMaterial;
    if (leakActive) {
      ledMat.color.setHex(Math.sin(this.breathPhase * 5) > 0 ? 0xff2a55 : 0x440814);
    } else {
      ledMat.color.setHex(0x35e0ff);
    }

    return { metabolicW, svf, thermalClass: tc };
  }

  update(
    dt: number,
    bodyKg: number,
    loadKg: number,
    leakActive: boolean,
  ): { metabolicW: number; svf: number; thermalClass: 0 | 1 | 2 } {
    this.updateMovement(dt);
    return this.computeBioMetrics(bodyKg, loadKg, leakActive);
  }
}
