import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { BASE_ORIGIN } from "@th/shared";
import { getGltfLoader } from "./nasaModels";
import { defaultExclusions, type Circle } from "./rockPlacement";
import { mulberry32 } from "./noise";
import { weatherObject } from "./weathering";

/**
 * Small decorative ground robots around the base (the team's `rover-new.glb` at robot scale). They are scenery:
 * most stand still at different headings, a few patrol a short back-and-forth line at walking pace.
 */
export interface DecorPlacement {
  x: number;
  z: number;
  yaw: number;
  /** Model length in metres (longest span). */
  lengthM: number;
  /** Patrol line direction (unit) and half length, or null for a parked robot. */
  patrol: { dx: number; dz: number; halfM: number; speedMs: number } | null;
}

export interface DecorPlanOptions {
  count?: number;
  seed?: number;
  slopeAt(x: number, z: number): number;
  exclusions?: Circle[];
  /** Points to keep clear of (for example placed rocks), with the radius to respect. */
  avoid?: Array<{ x: number; z: number; r: number }>;
}

const RING_MIN_M = 38;
const RING_MAX_M = 150;
const MAX_SLOPE_DEG = 7;

/** Deterministic layout of decorative robots around the base. */
export function planDecorRobots(opts: DecorPlanOptions): DecorPlacement[] {
  const rnd = mulberry32(opts.seed ?? 77);
  const ex = opts.exclusions ?? defaultExclusions();
  const avoid = opts.avoid ?? [];
  const count = opts.count ?? 7;
  const out: DecorPlacement[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 200) {
    const ang = rnd() * Math.PI * 2;
    const dist = RING_MIN_M + Math.sqrt(rnd()) * (RING_MAX_M - RING_MIN_M);
    const x = BASE_ORIGIN.x + Math.cos(ang) * dist;
    const z = BASE_ORIGIN.z + Math.sin(ang) * dist;
    if (ex.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 6)) continue;
    if (avoid.some((a) => Math.hypot(x - a.x, z - a.z) < a.r + 3)) continue;
    if (out.some((o) => Math.hypot(x - o.x, z - o.z) < 14)) continue;
    if (opts.slopeAt(x, z) > MAX_SLOPE_DEG) continue;
    const patrols = out.length % 3 === 1;
    const heading = rnd() * Math.PI * 2;
    out.push({
      x,
      z,
      yaw: heading,
      lengthM: 1.1 + rnd() * 0.9,
      patrol: patrols ? { dx: Math.sin(heading), dz: Math.cos(heading), halfM: 7 + rnd() * 8, speedMs: 0.18 + rnd() * 0.12 } : null,
    });
  }
  return out;
}

/** Position along a patrol line at time `t` (triangle wave), plus the heading of travel. */
export function patrolAt(p: DecorPlacement, t: number): { x: number; z: number; yaw: number } {
  if (!p.patrol) return { x: p.x, z: p.z, yaw: p.yaw };
  const { dx, dz, halfM, speedMs } = p.patrol;
  const period = (4 * halfM) / speedMs;
  const u = ((t % period) + period) % period;
  const q = u / period; // 0..1
  const s = q < 0.5 ? -halfM + 4 * halfM * q : halfM - 4 * halfM * (q - 0.5); // -half..half..-half
  const forward = q < 0.5;
  return { x: p.x + dx * s, z: p.z + dz * s, yaw: forward ? p.yaw : p.yaw + Math.PI };
}

export interface DecorTerrain {
  heightAt(x: number, z: number): number;
  slopeAt(x: number, z: number): number;
}

export class DecorRobots {
  readonly group = new THREE.Group();
  readonly placements: DecorPlacement[];
  private robots: Array<{ obj: THREE.Group; place: DecorPlacement }> = [];
  private t = 0;

  constructor(
    scene: THREE.Scene,
    private terrain: DecorTerrain,
    opts: Partial<DecorPlanOptions> = {},
  ) {
    this.group.name = "decor-robots";
    this.placements = planDecorRobots({ slopeAt: (x, z) => terrain.slopeAt(x, z), ...opts });
    scene.add(this.group);
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const gltf = await getGltfLoader().loadAsync("/models/rover-new.glb");
      weatherObject(gltf.scene, { dust: 0.6, scratches: 0.85, tileM: 0.9 });
      const probe = new THREE.Box3().setFromObject(gltf.scene);
      const span = Math.max(probe.getSize(new THREE.Vector3()).x, probe.getSize(new THREE.Vector3()).z, 0.001);
      for (const place of this.placements) {
        const inner = cloneSkinned(gltf.scene) as THREE.Group;
        const scale = place.lengthM / span;
        inner.rotation.y = Math.PI / 2; // authored front on -X, robots drive along +Z
        inner.scale.setScalar(scale);
        inner.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(inner);
        const wrap = new THREE.Group();
        inner.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
        wrap.add(inner);
        inner.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.frustumCulled = false;
          }
        });
        this.robots.push({ obj: wrap, place });
        this.group.add(wrap);
        this.apply(wrap, place, 0);
      }
    } catch (err) {
      console.warn("Decorative robots unavailable (rover-new.glb failed to load)", err);
    }
  }

  private apply(obj: THREE.Group, place: DecorPlacement, t: number): void {
    const p = patrolAt(place, t);
    const half = place.lengthM * 0.4;
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const hF = this.terrain.heightAt(p.x + fx * half, p.z + fz * half);
    const hB = this.terrain.heightAt(p.x - fx * half, p.z - fz * half);
    const hR = this.terrain.heightAt(p.x + fz * half, p.z - fx * half);
    const hL = this.terrain.heightAt(p.x - fz * half, p.z + fx * half);
    const y = (hF + hB + hR + hL) / 4 - 0.02;
    obj.position.set(p.x, y, p.z);
    obj.rotation.set(0, 0, 0);
    obj.rotateY(p.yaw);
    obj.rotateX(-Math.atan2(hF - hB, 2 * half));
    obj.rotateZ(Math.atan2(hR - hL, 2 * half));
  }

  update(dt: number): void {
    this.t += dt;
    for (const r of this.robots) if (r.place.patrol) this.apply(r.obj, r.place, this.t);
  }
}
