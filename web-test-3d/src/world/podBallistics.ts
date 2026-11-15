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
import type { TerrainProc } from "./terrainProc";

export class PodBallistics {
  private group = new THREE.Group();
  private arcLine: THREE.Line | null = null;
  private podMesh: THREE.Group;
  private chuteMesh: THREE.Mesh;
  private ellipse1: THREE.Line | null = null;
  private ellipse2: THREE.Line | null = null;
  private keepoutRing: THREE.Line;
  private rangeRing: THREE.Line;
  private activeDelivery: Delivery | null = null;
  private elapsedS = 0;
  private onLanded?: () => void;

  constructor(
    scene: THREE.Scene,
    private terrain: TerrainProc,
    private launcherOrigin: [number, number, number],
  ) {
    this.podMesh = new THREE.Group();
    const capsule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.36, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xff623b, emissive: 0x441206, metalness: 0.4 }),
    );
    this.podMesh.add(capsule);

    this.chuteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0xffe6d0, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    );
    this.chuteMesh.position.y = 2.6;
    this.chuteMesh.visible = false;
    this.podMesh.add(this.chuteMesh);
    this.podMesh.visible = false;
    this.group.add(this.podMesh);

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
    this.chuteMesh.visible = false;

    // Draw trajectory arc
    if (this.arcLine) {
      this.group.remove(this.arcLine);
      this.arcLine.geometry.dispose();
    }
    const pts = aimed.delivery.path.map((s) => new THREE.Vector3(s.p[0], s.p[2], s.p[1]));
    this.arcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xffb800 }),
    );
    this.group.add(this.arcLine);

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
    this.elapsedS += dt;
    tele.elapsedS = Math.min(this.elapsedS, this.activeDelivery.flightTimeS);

    const path = this.activeDelivery.path;
    let state = path[path.length - 1];
    for (let i = 0; i < path.length; i++) {
      if (path[i].t >= this.elapsedS) {
        state = path[i];
        break;
      }
    }

    this.podMesh.position.set(state.p[0], state.p[2], state.p[1]);
    const deployed =
      this.activeDelivery.deployedAtS !== null && this.elapsedS >= this.activeDelivery.deployedAtS;
    this.chuteMesh.visible = deployed;
    tele.chuteDeployed = deployed;

    if (this.elapsedS >= this.activeDelivery.flightTimeS) {
      tele.active = false;
      this.chuteMesh.visible = false;
      const cb = this.onLanded;
      this.onLanded = undefined;
      cb?.();
    }
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
