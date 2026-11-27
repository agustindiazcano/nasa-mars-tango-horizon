import * as THREE from "three";
import {
  aimDelivery,
  C,
  DEFAULT_CHUTE,
  DEFAULT_LAUNCHER,
  DEFAULT_POD,
  landingEllipse,
  maxRangeVacuum,
  simulateDelivery,
  surfaceDensity,
  type Delivery,
  type PodEnv,
} from "@th/shared";
import type { PodTelemetry } from "@th/shared";
import { buildParachute, type Parachute } from "./parachuteProc";
import { ProjectileTrail } from "./projectileTrail";
import type { TerrainProc } from "./terrainProc";

export class PodBallistics {
  private group = new THREE.Group();
  private trail = new ProjectileTrail();
  private chuteFadeS = -1;
  /** Flight speed-up for short takes (1 = real time). */
  timeScale = 1;
  private podMesh: THREE.Group;
  /** The procedural capsule, hidden once the GLB rocket model is attached. */
  private procPod = new THREE.Group();
  private chute: Parachute;
  private chuteOpenS = 0;
  private ellipse1: THREE.Line | null = null;
  private ellipse2: THREE.Line | null = null;
  private keepoutRing: THREE.Line;
  private rangeRing: THREE.Line;
  private activeDelivery: Delivery | null = null;
  private elapsedS = 0;
  private onLanded?: () => void;
  private lastPos: THREE.Vector3 | null = null;

  constructor(
    scene: THREE.Scene,
    private terrain: TerrainProc,
    private launcherOrigin: [number, number, number],
  ) {
    this.podMesh = new THREE.Group();
    this.podMesh.add(this.procPod);
    const capsule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xff623b, emissive: 0x441206, metalness: 0.4 }),
    );
    this.procPod.add(capsule);
    // Detail: nose cone, white band, rocket-orange base ring and four stabilizing fins.
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xe9eef2, metalness: 0.5, roughness: 0.4 });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.45, 12), noseMat);
    nose.position.y = 0.78;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.12, 12), noseMat);
    band.position.y = 0.2;
    const finMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, metalness: 0.6, roughness: 0.5 });
    for (let k = 0; k < 4; k++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.26), finMat);
      const a = (k / 4) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.4, -0.4, Math.sin(a) * 0.4);
      fin.rotation.y = -a;
      this.procPod.add(fin);
    }
    this.procPod.add(nose, band);

    this.chute = buildParachute();
    this.chute.group.visible = false;
    // The canopy hangs in world space (always upright) from the pod nose; it is not a child of the tilting pod.
    this.group.add(this.chute.group);
    this.podMesh.visible = false;
    this.group.add(this.podMesh);
    this.group.add(this.trail.group);

    // 15 m astronaut keep-out ring
    this.keepoutRing = this.makeCircle(C.pod_keepout_m.value, 0xff2a55);
    this.group.add(this.keepoutRing);

    // Launcher max vacuum range ring (~2183 m at 90 m/s)
    const maxR = Math.min(maxRangeVacuum(DEFAULT_LAUNCHER.maxMuzzleSpeed), 1850);
    this.rangeRing = this.makeCircle(maxR, 0xffb800);
    this.rangeRing.position.set(launcherOrigin[0], terrain.heightAt(launcherOrigin[0], launcherOrigin[1]) + 0.8, launcherOrigin[1]);
    this.group.add(this.rangeRing);

    scene.add(this.group);
  }

  /** Replaces the procedural capsule by a model (upright, bottom on y = 0, scaled by the caller). */
  setPodModel(model: THREE.Object3D): void {
    model.position.y -= 0.95;
    this.podMesh.add(model);
    this.procPod.visible = false;
  }

  /** The flight being shown (path in world metres, y up), or null before the first launch. */
  profile(): { points: { x: number; y: number; z: number; t: number }[]; deployedAtS: number | null; flightTimeS: number; elapsedS: number; launcher: { x: number; z: number } } | null {
    const d = this.activeDelivery;
    if (!d) return null;
    return {
      points: d.path.map((s) => ({ x: s.p[0], y: s.p[2], z: s.p[1], t: s.t })),
      deployedAtS: d.deployedAtS,
      flightTimeS: d.flightTimeS,
      elapsedS: Math.min(this.elapsedS, d.flightTimeS),
      launcher: { x: this.launcherOrigin[0], z: this.launcherOrigin[1] },
    };
  }

  /** Moves the smoke and dust and fades the canopy after touchdown (call every frame). */
  tick(dt: number): void {
    this.trail.update(dt);
    if (this.chuteFadeS >= 0) {
      this.chuteFadeS += dt;
      const k = Math.min(1, this.chuteFadeS / 1.6);
      this.chute.group.scale.setScalar(1 - k * 0.85);
      if (k >= 1) {
        this.chute.group.visible = false;
        this.chute.group.scale.setScalar(1);
        this.chuteFadeS = -1;
      }
    }
  }

  /** World position of the pod while it is shown (in flight or lying at the impact point), else null. */
  position(): THREE.Vector3 | null {
    return this.podMesh.visible ? this.podMesh.position.clone() : (this.lastPos?.clone() ?? null);
  }

  /** Hides the pod and clears the flight state (scene change or restart). */
  reset(): void {
    this.activeDelivery = null;
    this.onLanded = undefined;
    this.podMesh.visible = false;
    this.chute.group.visible = false;
    this.podMesh.quaternion.identity();
    this.lastPos = null;
    this.chuteFadeS = -1;
    this.chute.group.scale.setScalar(1);
    this.trail.reset();
  }

  updateKeepoutRing(astroX: number, astroZ: number): void {
    this.keepoutRing.position.set(astroX, this.terrain.heightAt(astroX, astroZ) + 0.4, astroZ);
  }

  launch(
    targetX: number,
    targetZ: number,
    pressurePa: number,
    airTempK: number,
    windMs: number,
    windDirRad: number,
    onLanded?: () => void,
  ): PodTelemetry | null {
    const [lx, lz, ly] = this.launcherOrigin;
    const rho0 = surfaceDensity(pressurePa, airTempK);
    const env: PodEnv = {
      rho0,
      windRef: windMs,
      windDirRad,
      groundZ: (x, y) => this.terrain.heightAt(x, y),
    };
    const targetElev = this.terrain.heightAt(targetX, targetZ);
    const aimed = aimDelivery([lx, lz, ly], [targetX, targetZ, targetElev], Math.PI / 4, DEFAULT_POD, DEFAULT_CHUTE, env);
    if (!aimed) return null;

    this.activeDelivery = aimed.delivery;
    this.elapsedS = 0;
    this.onLanded = onLanded;
    this.podMesh.visible = true;
    this.podMesh.quaternion.identity();
    this.chute.group.visible = false;

    // The track is the pod itself: ember and smoke are emitted behind it as it flies (see `update`).
    this.trail.reset();
    this.chuteFadeS = -1;

    // Compute 1-sigma & 2-sigma landing dispersion ellipse
    const ell = landingEllipse(
      (wRef, wDir) =>
        simulateDelivery(
          [lx, lz, ly],
          aimed.v0,
          DEFAULT_POD,
          DEFAULT_CHUTE,
          { rho0, windRef: wRef, windDirRad: wDir, groundZ: env.groundZ },
          0.12,
        ).impact,
      {
        speed: windMs,
        speedSigma: Math.max(1.2, windMs * 0.25),
        dirRad: windDirRad,
        dirSigmaRad: 0.28,
      },
      70,
      2026,
    );

    this.drawEllipses(ell.center[0], ell.center[1], ell.alongM, ell.crossM, windDirRad);

    const noWind = simulateDelivery(
      [lx, lz, ly],
      aimed.v0,
      DEFAULT_POD,
      DEFAULT_CHUTE,
      { rho0, windRef: 0, windDirRad: 0, groundZ: env.groundZ },
      0.1,
    );
    const windDriftM = Math.hypot(
      aimed.delivery.impact[0] - noWind.impact[0],
      aimed.delivery.impact[1] - noWind.impact[1],
    );

    return {
      active: true,
      flightTimeS: aimed.delivery.flightTimeS,
      elapsedS: 0,
      impactX: aimed.delivery.impact[0],
      impactZ: aimed.delivery.impact[1],
      impactSpeed: aimed.delivery.impactSpeed,
      chuteDeployed: false,
      ellipseAlongM: ell.alongM,
      ellipseCrossM: ell.crossM,
      windDriftM,
    };
  }

  update(dt: number, tele: PodTelemetry): void {
    if (!this.activeDelivery || !tele.active) return;
    dt *= this.timeScale;
    this.elapsedS += dt;
    tele.elapsedS = Math.min(this.elapsedS, this.activeDelivery.flightTimeS);

    const path = this.activeDelivery.path;
    // Interpolate between the two path samples around the current time (the samples are 0.1 s or more apart).
    let hi = path.findIndex((s) => s.t >= this.elapsedS);
    if (hi < 0) hi = path.length - 1;
    const b = path[hi];
    const a = path[Math.max(0, hi - 1)];
    const u = b.t > a.t ? Math.min(1, Math.max(0, (this.elapsedS - a.t) / (b.t - a.t))) : 1;

    const prev = this.podMesh.position.clone();
    this.podMesh.position.set(
      a.p[0] + (b.p[0] - a.p[0]) * u,
      a.p[2] + (b.p[2] - a.p[2]) * u,
      a.p[1] + (b.p[1] - a.p[1]) * u,
    );
    this.lastPos = this.podMesh.position.clone();
    const deployed =
      this.activeDelivery.deployedAtS !== null && this.elapsedS >= this.activeDelivery.deployedAtS;
    // Nose along the flight path until the parachute opens, then upright under the canopy.
    const vel = this.podMesh.position.clone().sub(prev);
    if (!deployed && vel.lengthSq() > 1e-8) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vel.normalize());
      this.podMesh.quaternion.slerp(q, 0.25);
    } else if (deployed) {
      this.podMesh.quaternion.slerp(new THREE.Quaternion(), 0.3);
    }
    if (!deployed) this.trail.emit(this.podMesh.position, true);
    else this.trail.endStream();
    if (deployed && !this.chute.group.visible) this.chuteOpenS = this.elapsedS;
    this.chute.group.visible = deployed;
    if (deployed) this.attachChute();
    if (deployed) this.chute.update(Math.min(1, (this.elapsedS - this.chuteOpenS) / 0.9), this.elapsedS);
    tele.chuteDeployed = deployed;

    if (this.elapsedS >= this.activeDelivery.flightTimeS) {
      tele.active = false;
      // Touchdown: the pod stands upright on its base, dust rises and the canopy settles.
      const gx = this.podMesh.position.x;
      const gz = this.podMesh.position.z;
      this.podMesh.quaternion.identity();
      this.podMesh.position.y = this.terrain.heightAt(gx, gz) + 0.95;
      this.lastPos = this.podMesh.position.clone();
      this.trail.dustBurst(new THREE.Vector3(gx, this.terrain.heightAt(gx, gz), gz));
      this.chuteFadeS = 0;
      this.attachChute();
      const cb = this.onLanded;
      this.onLanded = undefined;
      cb?.();
    }
  }

  /** Puts the canopy base on the nose of the pod (the top of the model, 0.95 m above its centre). */
  private attachChute(): void {
    const top = new THREE.Vector3(0, 0.95, 0).applyQuaternion(this.podMesh.quaternion);
    this.chute.group.position.copy(this.podMesh.position).add(top);
  }

  private drawEllipses(cx: number, cz: number, along: number, cross: number, rotRad: number): void {
    if (this.ellipse1) {
      this.group.remove(this.ellipse1);
      this.ellipse1.geometry.dispose();
    }
    if (this.ellipse2) {
      this.group.remove(this.ellipse2);
      this.ellipse2.geometry.dispose();
    }
    this.ellipse1 = this.makeEllipse(cx, cz, along, cross, rotRad, 0x35e0ff);
    this.ellipse2 = this.makeEllipse(cx, cz, along * 2, cross * 2, rotRad, 0xffb800);
    this.group.add(this.ellipse1, this.ellipse2);
  }

  private makeEllipse(cx: number, cz: number, rx: number, rz: number, rotRad: number, color: number): THREE.Line {
    const pts: THREE.Vector3[] = [];
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const lx = Math.cos(a) * rx;
      const lz = Math.sin(a) * rz;
      const wx = cx + lx * cos - lz * sin;
      const wz = cz + lx * sin + lz * cos;
      pts.push(new THREE.Vector3(wx, this.terrain.heightAt(wx, wz) + 0.5, wz));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));
  }

  private makeCircle(radius: number, color: number): THREE.Line {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));
  }
}
