import * as THREE from "three";
import { applySurface, panelMetal, tireTread, wovenCanvas } from "./surfaceTextures";
import { weatherObject } from "./weathering";

/**
 * Rescue litter dragged by `rescue-bot-1`: a flat stretcher under the casualty with a bridle at its head end and a tow
 * cable to the robot hook. Everything is derived each frame from the scenario view (casualty pose) and the robot tow
 * point, so it stays deterministic with the scenario.
 */

/** Litter dimensions (m): design assumption for a flat rescue litter. */
export const LITTER = { lengthM: 2.0, widthM: 0.66, bedY: 0.05, headZ: 1.0 } as const;
/** Bridle apex ahead of the head end, in litter-local coordinates. */
export const BRIDLE_APEX_LOCAL: Readonly<[number, number, number]> = [0, 0.16, LITTER.headZ + 0.45];
/** Cable length when relaxed (m); shorter distances make it sag. */
export const CABLE_REST_LENGTH_M = 3.4;

export type V3 = [number, number, number];

/** World position of a litter-local point for a litter at (x, y, z) turned by `yaw` (front = +Z). */
export function litterPointToWorld(origin: V3, yaw: number, local: V3): V3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [origin[0] + local[0] * c + local[2] * s, origin[1] + local[1], origin[2] - local[0] * s + local[2] * c];
}

/**
 * Cable polyline from `a` to `b`. The ends are exact; the middle sags by `sagM` (parabola) when the distance is below
 * the rest length and is straight when the cable is taut.
 */
export function cablePoints(a: V3, b: V3, segments = 14, restLengthM = CABLE_REST_LENGTH_M): V3[] {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const slack = Math.max(0, restLengthM - dist);
  const sag = Math.min(0.7, 0.3 * Math.sqrt(restLengthM * slack));
  const pts: V3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    pts.push([
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u - 4 * sag * u * (1 - u),
      a[2] + (b[2] - a[2]) * u,
    ]);
  }
  return pts;
}

/** Ground clearance under the litter origin on flat ground (m): the casualty origin sits this high on the terrain. */
export const LITTER_GROUND_CLEARANCE_M = 0.12;
/** Wheel radius (m): the axle sits at the bed height, so the tyre rests on the ground beside the bed. */
export const WHEEL_RADIUS_M = 0.17;

/**
 * Pitch and roll (rad) that lay the litter on the terrain: sampled at the ends and sides of the bed (wide baselines,
 * the DEM is noisy at 1 m). Pitch is about the litter x axis (positive lowers the head end), roll about its z axis
 * (positive raises the +x side), as used by `RescueLitter.update`.
 */
export function litterTilt(heightAt: (x: number, z: number) => number, x: number, z: number, yaw: number): { pitch: number; roll: number } {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const L = 1.4;
  const W = 0.6;
  const front = heightAt(x + fx * L, z + fz * L);
  const back = heightAt(x - fx * L, z - fz * L);
  const right = heightAt(x + rx * W, z + rz * W);
  const left = heightAt(x - rx * W, z - rz * W);
  return { pitch: -Math.atan2(front - back, 2 * L), roll: Math.atan2(right - left, 2 * W) };
}

export interface LitterPose {
  x: number;
  /** Casualty origin height (terrain plus scripted offset). */
  y: number;
  z: number;
  yaw: number;
  /** Tilt that follows the terrain (see `litterTilt`); 0 when omitted. */
  pitch?: number;
  roll?: number;
}

export class RescueLitter {
  readonly group = new THREE.Group();
  private readonly litter = new THREE.Group();
  private readonly cable: THREE.Mesh;
  private readonly bridle: THREE.Mesh;
  private readonly hook = new THREE.Group();
  private smoothPitch = 0;
  private smoothRoll = 0;
  private readonly cableMat = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.8, metalness: 0.4 });

  constructor(scene: THREE.Scene) {
    this.group.name = "rescue-litter";
    this.group.visible = false;
    const frame = applySurface(new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.55, metalness: 0.6 }), panelMetal("#7a7f85", 31, [1, 6]), 0.8);
    const canvas = applySurface(new THREE.MeshStandardMaterial({ color: 0xa98a56, roughness: 0.95, metalness: 0.0 }), wovenCanvas("#a98a56"), 0.7);
    const tyre = applySurface(new THREE.MeshStandardMaterial({ color: 0x1c1f23, roughness: 0.92, metalness: 0.05 }), tireTread([4, 1]), 1.4);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.35, metalness: 0.85 });
    const strap = new THREE.MeshStandardMaterial({ color: 0x3a2f27, roughness: 0.9 });
    const buckle = new THREE.MeshStandardMaterial({ color: 0xc79436, roughness: 0.4, metalness: 0.7 });
    const { lengthM: L, widthM: W, bedY } = LITTER;
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.litter.add(m);
      return m;
    };
    // Two rigid rails, three cross bars and a canvas bed
    for (const side of [-1, 1]) box(0.045, 0.05, L, frame, (side * W) / 2, bedY, 0);
    for (const z of [-L / 2 + 0.03, 0, L / 2 - 0.03]) box(W, 0.04, 0.04, frame, 0, bedY, z);
    box(W - 0.05, 0.012, L - 0.05, canvas, 0, bedY + 0.012, 0);
    // Side handles at both ends of each rail
    for (const side of [-1, 1]) {
      for (const z of [-L / 2 - 0.12, L / 2 + 0.12]) {
        box(0.04, 0.04, 0.26, frame, (side * W) / 2, bedY, z);
      }
    }
    // Restraint straps across the body with buckles
    for (const z of [-0.55, -0.05, 0.45]) {
      box(W + 0.04, 0.02, 0.09, strap, 0, bedY + 0.035, z);
      box(0.07, 0.03, 0.06, buckle, 0.08, bedY + 0.05, z);
    }
    // Four large wheels beside the bed turn the litter into a cart: tyre with tread, light rim, hub cap, spokes and a
    // stub axle to the rail. The axle sits at the bed height so the tyres rest on the ground (clearance 0.12 m).
    const R = WHEEL_RADIUS_M;
    const axleY = bedY;
    const rim = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.4, metalness: 0.7 });
    for (const z of [-0.62, 0.62]) {
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.11);
        const wheel = new THREE.Group();
        wheel.position.set(x, axleY, z);
        const tyreMesh = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.11, 22), tyre);
        tyreMesh.rotation.z = Math.PI / 2;
        tyreMesh.castShadow = true;
        const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.66, R * 0.66, 0.118, 18), rim);
        rimMesh.rotation.z = Math.PI / 2;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.22, R * 0.22, 0.14, 10), hubMat);
        cap.rotation.z = Math.PI / 2;
        wheel.add(tyreMesh, rimMesh, cap);
        for (let k = 0; k < 5; k++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.124, R * 0.12, R * 1.15), hubMat);
          spoke.rotation.x = (k / 5) * Math.PI;
          wheel.add(spoke);
        }
        this.litter.add(wheel);
        const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), hubMat);
        stub.rotation.z = Math.PI / 2;
        stub.position.set(side * (W / 2 + 0.04), axleY, z);
        this.litter.add(stub);
      }
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.03, 0.05), frame);
      bracket.position.set(0, bedY - 0.03, z);
      this.litter.add(bracket);
    }
    // Same dust and scratches as the optimized vehicle models.
    weatherObject(this.litter, { dust: 0.6, scratches: 0.85, tileM: 0.9 });
    this.group.add(this.litter);

    this.bridle = new THREE.Mesh(new THREE.BufferGeometry(), this.cableMat);
    this.cable = new THREE.Mesh(new THREE.BufferGeometry(), this.cableMat);
    this.bridle.frustumCulled = false;
    this.cable.frustumCulled = false;
    this.group.add(this.bridle, this.cable);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 16), buckle);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 8), buckle);
    shank.position.y = 0.1;
    this.hook.add(ring, shank);
    this.group.add(this.hook);
    scene.add(this.group);
  }

  /** Applies the casualty pose and the world tow point of the robot; hides everything when `active` is false. */
  update(active: boolean, pose: LitterPose, towPoint: V3 | null): void {
    this.group.visible = active && towPoint !== null;
    if (!this.group.visible || !towPoint) return;
    const origin: V3 = [pose.x, pose.y, pose.z];
    this.litter.position.set(...origin);
    // The bed lies on the slope; the tilt is low-passed so the bumps of the DEM do not shake it.
    const k = 0.25;
    this.smoothPitch += ((pose.pitch ?? 0) - this.smoothPitch) * k;
    this.smoothRoll += ((pose.roll ?? 0) - this.smoothRoll) * k;
    this.litter.rotation.order = "YXZ";
    this.litter.rotation.set(this.smoothPitch, pose.yaw, this.smoothRoll);
    this.litter.updateMatrixWorld(true);
    const apex = this.litterWorld([...BRIDLE_APEX_LOCAL] as V3);
    this.hook.position.set(...towPoint);
    this.hook.rotation.y = pose.yaw;
    this.setTube(this.cable, cablePoints(apex, towPoint), 0.022);
    // Bridle: two legs from the head-end rail corners to the apex
    const legs = [-1, 1].map((side) => this.litterWorld([(side * LITTER.widthM) / 2, LITTER.bedY, LITTER.headZ + 0.12]));
    const geos = legs.map((l) => this.tubeGeometry([l, apex], 0.014));
    this.bridle.geometry.dispose();
    this.bridle.geometry = mergeTubes(geos);
  }

  /** World position of a litter-local point with the current tilt. */
  private litterWorld(local: V3): V3 {
    const v = new THREE.Vector3(...local).applyMatrix4(this.litter.matrixWorld);
    return [v.x, v.y, v.z];
  }

  private tubeGeometry(pts: V3[], radius: number): THREE.BufferGeometry {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0);
    return new THREE.TubeGeometry(curve, Math.max(1, pts.length * 2), radius, 5, false);
  }

  private setTube(mesh: THREE.Mesh, pts: V3[], radius: number): void {
    mesh.geometry.dispose();
    mesh.geometry = this.tubeGeometry(pts, radius);
  }
}

function mergeTubes(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const pos: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const g of geos) {
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
    const ix = g.index;
    if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base);
    base += p.count;
    g.dispose();
  }
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}
