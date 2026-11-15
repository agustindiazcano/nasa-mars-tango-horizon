import * as THREE from "three";

/** Visual-only LiDAR coverage disc draped on the terrain around a unit. It does not drive any sensing logic. */
export const LIDAR_RING_RADIUS_M = { ground: 12, air: 9 } as const;

const RADIAL_STEPS = 4;
const SEGMENTS = 48;
const LIFT_M = 0.12;
const MOVE_EPS_M = 0.25;

let sharedTexture: THREE.CanvasTexture | null = null;

function gradientTexture(): THREE.CanvasTexture {
  if (sharedTexture) return sharedTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255, 214, 64, 0.04)");
    g.addColorStop(0.8, "rgba(255, 214, 64, 0.14)");
    g.addColorStop(0.93, "rgba(255, 224, 96, 0.5)");
    g.addColorStop(0.98, "rgba(255, 224, 96, 0.35)");
    g.addColorStop(1, "rgba(255, 224, 96, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  sharedTexture = new THREE.CanvasTexture(canvas);
  return sharedTexture;
}

export class LidarRing {
  readonly mesh: THREE.Mesh;
  private positions: Float32Array;
  private lastX = Number.NaN;
  private lastZ = Number.NaN;

  constructor(
    private readonly radius: number,
    private readonly heightAt: (x: number, z: number) => number,
  ) {
    const count = 1 + RADIAL_STEPS * SEGMENTS;
    this.positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const index: number[] = [];
    uvs[0] = 0.5;
    uvs[1] = 0.5;
    for (let r = 1; r <= RADIAL_STEPS; r++) {
      for (let s = 0; s < SEGMENTS; s++) {
        const a = (s / SEGMENTS) * Math.PI * 2;
        const k = 1 + (r - 1) * SEGMENTS + s;
        const rr = r / RADIAL_STEPS;
        uvs[k * 2] = 0.5 + Math.cos(a) * rr * 0.5;
        uvs[k * 2 + 1] = 0.5 + Math.sin(a) * rr * 0.5;
        const next = 1 + (r - 1) * SEGMENTS + ((s + 1) % SEGMENTS);
        if (r === 1) {
          index.push(0, k, next);
        } else {
          const kIn = 1 + (r - 2) * SEGMENTS + s;
          const nextIn = 1 + (r - 2) * SEGMENTS + ((s + 1) % SEGMENTS);
          index.push(kIn, k, next, kIn, next, nextIn);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(index);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        map: gradientTexture(),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    this.mesh.name = "lidar-ring";
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Re-drapes the disc over the terrain only when the unit moved. */
  update(x: number, z: number, visible: boolean): void {
    this.mesh.visible = visible;
    if (!visible) return;
    if (Math.hypot(x - this.lastX, z - this.lastZ) < MOVE_EPS_M) return;
    this.lastX = x;
    this.lastZ = z;
    const p = this.positions;
    p[0] = x;
    p[1] = this.heightAt(x, z) + LIFT_M;
    p[2] = z;
    for (let r = 1; r <= RADIAL_STEPS; r++) {
      const rad = (r / RADIAL_STEPS) * this.radius;
      for (let s = 0; s < SEGMENTS; s++) {
        const a = (s / SEGMENTS) * Math.PI * 2;
        const px = x + Math.cos(a) * rad;
        const pz = z + Math.sin(a) * rad;
        const k = (1 + (r - 1) * SEGMENTS + s) * 3;
        p[k] = px;
        p[k + 1] = this.heightAt(px, pz) + LIFT_M;
        p[k + 2] = pz;
      }
    }
    (this.mesh.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
