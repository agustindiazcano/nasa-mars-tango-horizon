import * as THREE from "three";
import { fbm3, mulberry32 } from "./noise";

export interface RockGeometryOptions {
  /** Icosahedron subdivision: faces = 20 * (detail + 1)^2 (1 = 80, 3 = 320, 5 = 720). */
  detail: number;
  seed: number;
  /** Typical world size of the rock (m); sets the texture density (one texture tile per `tileM` metres). */
  worldSizeM: number;
  /** World metres covered by one texture tile. */
  tileM?: number;
  /** Surface displacement relative to the radius, 0..1. */
  roughness?: number;
}

/**
 * Unit-radius rock with a flat base. The shape is an icosphere pushed by fractal noise, stretched by a
 * seeded anisotropic scale and cut flat at the bottom so it can sit partly buried in the terrain.
 * The mesh is non-indexed (faceted) and UVs use a per-face planar projection along the dominant normal axis,
 * which keeps the texture density uniform and avoids spherical-UV seams.
 */
export function buildRockGeometry(opts: RockGeometryOptions): THREE.BufferGeometry {
  const rnd = mulberry32(opts.seed);
  const rough = opts.roughness ?? 0.5;
  const stretch = new THREE.Vector3(0.8 + rnd() * 0.5, 0.85 + rnd() * 0.45, 0.8 + rnd() * 0.5);
  const noiseOffset = rnd() * 50;
  const base = new THREE.IcosahedronGeometry(1, opts.detail);
  const pos = base.getAttribute("position") as THREE.BufferAttribute;

  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const lump = fbm3(v.x * 1.5 + noiseOffset, v.y * 1.5, v.z * 1.5 + noiseOffset, 4, opts.seed);
    // Ridged noise gives angular, fractured faces instead of rounded lumps.
    const ridge = 1 - Math.abs(fbm3(v.x * 3.2, v.y * 3.2 + noiseOffset, v.z * 3.2, 3, opts.seed + 5) - 0.5) * 2;
    const chip = fbm3(v.x * 7, v.y * 7 + noiseOffset, v.z * 7, 3, opts.seed + 9);
    const r = 1 + (lump - 0.5) * 2 * rough + (ridge - 0.6) * rough * 0.7 + (chip - 0.5) * rough * 0.35;
    v.multiplyScalar(r).multiply(stretch);
    // Flat base: squash everything below the cut so the rock rests on the ground.
    if (v.y < -0.55) v.y = -0.55 + (v.y + 0.55) * 0.08;
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  // Smooth normals from the shared vertices, then un-index so each face can carry its own UVs.
  base.computeVertexNormals();
  const geo = base.toNonIndexed();
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  const n = geo.getAttribute("normal") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const fnrm = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const a0 = new THREE.Vector3();
  const a1 = new THREE.Vector3();
  const a2 = new THREE.Vector3();
  const tile = opts.tileM ?? 0.9;
  const scale = opts.worldSizeM / tile;
  for (let f = 0; f < p.count; f += 3) {
    a0.fromBufferAttribute(p, f);
    a1.fromBufferAttribute(p, f + 1);
    a2.fromBufferAttribute(p, f + 2);
    fnrm.crossVectors(e1.subVectors(a1, a0), e2.subVectors(a2, a0)).normalize();
    // Blend the smooth normal with the face normal so rocks keep some angular character.
    for (let k = 0; k < 3; k++) {
      const bx = n.getX(f + k) * 0.55 + fnrm.x * 0.45;
      const by = n.getY(f + k) * 0.55 + fnrm.y * 0.45;
      const bz = n.getZ(f + k) * 0.55 + fnrm.z * 0.45;
      const bl = Math.hypot(bx, by, bz) || 1;
      n.setXYZ(f + k, bx / bl, by / bl, bz / bl);
    }
    const nx = Math.abs(fnrm.x);
    const ny = Math.abs(fnrm.y);
    const nz = Math.abs(fnrm.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(f + k);
      const y = p.getY(f + k);
      const z = p.getZ(f + k);
      let a: number;
      let b: number;
      if (ny >= nx && ny >= nz) {
        a = x;
        b = z;
      } else if (nx >= nz) {
        a = z;
        b = y;
      } else {
        a = x;
        b = y;
      }
      uv[(f + k) * 2] = a * scale;
      uv[(f + k) * 2 + 1] = b * scale;
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  base.dispose();
  return geo;
}
