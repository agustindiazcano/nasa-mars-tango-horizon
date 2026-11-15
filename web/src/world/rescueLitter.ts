import * as THREE from "three";

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

export interface LitterPose {
  x: number;
  /** Casualty origin height (terrain plus scripted offset). */
  y: number;
  z: number;
  yaw: number;
}

export class RescueLitter {
  readonly group = new THREE.Group();
  private readonly litter = new THREE.Group();
  private readonly cable: THREE.Mesh;
  private readonly bridle: THREE.Mesh;
  private readonly hook = new THREE.Group();
  private readonly cableMat = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.8, metalness: 0.4 });

  constructor(scene: THREE.Scene) {
    this.group.name = "rescue-litter";
    this.group.visible = false;
    const frame = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.62, metalness: 0.55 });
    const canvas = new THREE.MeshStandardMaterial({ color: 0xa98a56, roughness: 0.95, metalness: 0.0 });
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
    this.litter.rotation.y = pose.yaw;
    const apex = litterPointToWorld(origin, pose.yaw, [...BRIDLE_APEX_LOCAL] as V3);
    this.hook.position.set(...towPoint);
    this.hook.rotation.y = pose.yaw;
    this.setTube(this.cable, cablePoints(apex, towPoint), 0.022);
    // Bridle: two legs from the head-end rail corners to the apex
    const legs = [-1, 1].map((side) => litterPointToWorld(origin, pose.yaw, [(side * LITTER.widthM) / 2, LITTER.bedY, LITTER.headZ + 0.12]));
    const geos = legs.map((l) => this.tubeGeometry([l, apex], 0.014));
    this.bridle.geometry.dispose();
    this.bridle.geometry = mergeTubes(geos);
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
