import * as THREE from "three";
import { ProjectileTrail } from "./projectileTrail";

/**
 * Dust cloud behind every moving ground vehicle: puffs are emitted at the rear wheels in proportion to the speed
 * measured from the unit's displacement, then drift, grow and fade over a few seconds, so the track disperses.
 */

/** Puffs per metre travelled, per rear wheel. */
export const PUFFS_PER_M = 1.1;
/** Speeds (m/s) outside this range emit nothing: standing still, or a teleport between scenes. */
export const MIN_SPEED_MS = 0.6;
export const MAX_SPEED_MS = 40;

export interface DustUnit {
  id: string;
  flies: boolean;
  object: THREE.Object3D;
}

/** Number of puffs for a step of `distM` metres, carrying the fraction to the next call. */
export function puffCount(distM: number, carry: number): { n: number; carry: number } {
  const total = carry + distM * PUFFS_PER_M;
  const n = Math.floor(total);
  return { n, carry: total - n };
}

export class VehicleDust {
  readonly group: THREE.Group;
  private readonly trail = new ProjectileTrail(2200);
  private readonly last = new Map<string, { x: number; z: number }>();
  private readonly carry = new Map<string, number>();

  constructor() {
    this.group = this.trail.group;
    this.group.name = "vehicle-dust";
  }

  /** Clears every cloud and the speed history (scene change). */
  reset(): void {
    this.trail.reset();
    this.last.clear();
    this.carry.clear();
  }

  update(dt: number, units: Iterable<DustUnit>, groundY: (x: number, z: number) => number): void {
    this.trail.update(dt);
    if (dt <= 0) return;
    const list = [...units].filter((u) => !u.flies && u.object.visible);
    const byId = new Map(list.map((u) => [u.id, u]));
    for (const u of list) {
      const p = u.object.position;
      const prev = this.last.get(u.id);
      this.last.set(u.id, { x: p.x, z: p.z });
      if (!prev) continue;
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;
      const dist = Math.hypot(dx, dz);
      const speed = dist / dt;
      if (speed < MIN_SPEED_MS || speed > MAX_SPEED_MS) continue;
      // The rescue robot rides inside the bay of rescue-1 while stowed: only the carrier raises dust.
      if (u.id === "rescue-bot-1") {
        const carrier = byId.get("rescue-1");
        if (carrier && Math.hypot(carrier.object.position.x - p.x, carrier.object.position.z - p.z) < 3) continue;
      }
      const c = puffCount(dist, this.carry.get(u.id) ?? 0);
      this.carry.set(u.id, c.carry);
      if (c.n === 0) continue;
      const backX = -dx / dist;
      const backZ = -dz / dist;
      const sideX = -backZ;
      const sideZ = backX;
      for (let i = 0; i < c.n; i++) {
        for (const side of [-0.7, 0.7]) {
          const x = p.x + backX * 1.2 + sideX * side;
          const z = p.z + backZ * 1.2 + sideZ * side;
          this.trail.dustPuff(x, groundY(x, z), z, backX, backZ, speed);
        }
      }
    }
  }
}
