import { BASE_ORIGIN, LAUNCH_SITE_COORD } from "@th/shared";
import * as THREE from "three";

export type CinematicCamId = 1 | 2 | 3 | 4 | 5;
export const CINEMATIC_CAM_IDS: readonly CinematicCamId[] = [1, 2, 3, 4, 5];

/** Minimum camera clearance above the terrain (m). */
export const CINEMATIC_MIN_AGL_M = 2.5;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CinematicUnit {
  id: string;
  x: number;
  z: number;
}

export interface CinematicContext {
  /** Mission time (s) driving the orbiter path. */
  timeS: number;
  heightAt(x: number, z: number): number;
  units: readonly CinematicUnit[];
  astronaut: { x: number; z: number };
}

export interface CinematicShot {
  pos: Vec3;
  target: Vec3;
}

/** Keeps a camera height at least `minAgl` metres above the ground. */
export function clampAboveTerrain(y: number, groundY: number, minAgl = CINEMATIC_MIN_AGL_M): number {
  return Math.max(y, groundY + minAgl);
}

function findUnit(ctx: CinematicContext, ids: readonly string[]): CinematicUnit {
  for (const id of ids) {
    const u = ctx.units.find((v) => v.id === id);
    if (u) return u;
  }
  return { id: "astronaut", x: ctx.astronaut.x, z: ctx.astronaut.z };
}

/**
 * Desired (unsmoothed) camera pose for a cinematic shot.
 * CAM-1 base overview, CAM-2 drone chase, CAM-3 launch-site wide,
 * CAM-4 orbiter high (circles the base), CAM-5 rover follow (low).
 */
export function cinematicShot(id: CinematicCamId, ctx: CinematicContext): CinematicShot {
  const g = ctx.heightAt;
  let px: number, pz: number, aglY: number, tx: number, tz: number, tAgl: number;
  switch (id) {
    case 1:
      px = BASE_ORIGIN.x + 70;
      pz = BASE_ORIGIN.z + 80;
      aglY = 38;
      tx = BASE_ORIGIN.x;
      tz = BASE_ORIGIN.z;
      tAgl = 4;
      break;
    case 2: {
      const u = findUnit(ctx, ["drone-1", "rescue-1", "rover-1"]);
      px = u.x - 16;
      pz = u.z + 16;
      aglY = 26;
      tx = u.x;
      tz = u.z;
      tAgl = u.id.startsWith("drone") ? 14 : 1;
      break;
    }
    case 3:
      px = LAUNCH_SITE_COORD.x + 300;
      pz = LAUNCH_SITE_COORD.z - 220;
      aglY = 55;
      tx = LAUNCH_SITE_COORD.x;
      tz = LAUNCH_SITE_COORD.z;
      tAgl = 60;
      break;
    case 4: {
      const a = ctx.timeS * 0.05;
      px = BASE_ORIGIN.x + Math.cos(a) * 520;
      pz = BASE_ORIGIN.z + Math.sin(a) * 520;
      aglY = 380;
      tx = BASE_ORIGIN.x;
      tz = BASE_ORIGIN.z;
      tAgl = 0;
      break;
    }
    default: {
      const u = findUnit(ctx, ["rover-2", "rover-1", "rover-3"]);
      px = u.x + 6;
      pz = u.z + 5;
      aglY = 1.8;
      tx = u.x;
      tz = u.z;
      tAgl = 1.2;
    }
  }
  return {
    pos: { x: px, y: clampAboveTerrain(g(px, pz) + aglY, g(px, pz)), z: pz },
    target: { x: tx, y: g(tx, tz) + tAgl, z: tz },
  };
}

/** Frame-rate independent exponential smoothing factor. */
export function dampFactor(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * Math.max(dt, 0));
}

/** Drives the main camera along smoothed cinematic shots. */
export class CinematicCams {
  active: CinematicCamId = 1;
  private readonly pos = new THREE.Vector3();
  private readonly target = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  /** Selects a shot; the blend starts from the current camera pose. */
  begin(id: CinematicCamId): void {
    this.active = id;
    this.pos.copy(this.camera.position);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.target.copy(this.camera.position).addScaledVector(dir, 40);
  }

  update(dt: number, ctx: CinematicContext): void {
    const shot = cinematicShot(this.active, ctx);
    const k = dampFactor(1.8, dt);
    this.pos.lerp(new THREE.Vector3(shot.pos.x, shot.pos.y, shot.pos.z), k);
    this.target.lerp(new THREE.Vector3(shot.target.x, shot.target.y, shot.target.z), k);
    this.pos.y = clampAboveTerrain(this.pos.y, ctx.heightAt(this.pos.x, this.pos.z));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.target);
  }
}
