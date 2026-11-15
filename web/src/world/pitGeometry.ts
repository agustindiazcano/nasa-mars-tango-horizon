import * as THREE from "three";
import {
  PIT_WALL_RUN_M,
  RESCUE_PIT,
  RESCUE_PIT_AXIS,
  RESCUE_SITE,
  pitOutlineRadiusAt,
  pitWallOffset,
} from "@th/shared";
import { fbm3, mulberry32 } from "./noise";

/** World metres covered by one texture tile on the pit walls and floor. */
const TILE_M = 1.3;
/** The pit mesh extends this far past the outline, hidden under the terrain surface. */
const OVERLAP_M = 0.25;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Components of a world point in the pit frame: `s` along the ramp axis (toward the base), `w` across it. */
export function pitFrame(x: number, z: number): { s: number; w: number; dist: number; theta: number } {
  const dx = x - RESCUE_SITE.x;
  const dz = z - RESCUE_SITE.z;
  return {
    s: dx * RESCUE_PIT_AXIS.x + dz * RESCUE_PIT_AXIS.z,
    w: -dx * RESCUE_PIT_AXIS.z + dz * RESCUE_PIT_AXIS.x,
    dist: Math.hypot(dx, dz),
    theta: Math.atan2(dz, dx),
  };
}

/** Ramp height (m, relative to the terrain) at axis coordinate `s`: the contract slope, capped at the floor. */
export function pitRampOffset(s: number): number {
  const { depthM, radiusM, rampSlopeDeg, rampHalfWidthM } = RESCUE_PIT;
  const sTop = Math.sqrt(radiusM * radiusM - rampHalfWidthM * rampHalfWidthM);
  if (s >= sTop) return 0;
  return Math.max(-depthM, -(sTop - s) * Math.tan((rampSlopeDeg * Math.PI) / 180));
}

/**
 * Visual pit surface (m, relative to the terrain): the crumbling wall and floor of `pitSurfaceOffsetAt`, with the
 * ramp lane (exactly the contract slope inside `rampHalfWidthM`) shouldered by a talus embankment on both sides.
 */
export function pitMeshOffsetAt(x: number, z: number): number {
  const { s, w, dist, theta } = pitFrame(x, z);
  const rim = pitOutlineRadiusAt(theta);
  if (dist >= rim) return 0;
  const wall = pitWallOffset(dist, rim);
  const lane = Math.max(wall, pitRampOffset(s));
  const a = 1 - smoothstep(RESCUE_PIT.rampHalfWidthM, RESCUE_PIT.rampHalfWidthM + 1.6, Math.abs(w));
  return wall + (lane - wall) * a;
}

export interface PitGeometryOptions {
  heightAt(x: number, z: number): number;
  segments?: number;
  rings?: number;
  seed?: number;
}

/**
 * Natural sinkhole surface: a polar grid over the irregular outline carrying the wall, floor and ramp, with
 * noise-displaced relief (more on the walls than on the floor), strata bands and a dark floor as vertex colours,
 * and per-face planar UVs for the basalt textures. Vertex colours are multipliers of the basalt albedo.
 */
export function buildPitGeometry(opts: PitGeometryOptions): THREE.BufferGeometry {
  const segments = opts.segments ?? 128;
  const rings = opts.rings ?? 36;
  const seed = opts.seed ?? 77;
  const { depthM } = RESCUE_PIT;
  const cx = RESCUE_SITE.x;
  const cz = RESCUE_SITE.z;

  const vCount = segments * (rings + 1);
  const pos = new Float32Array(vCount * 3);
  const col = new Float32Array(vCount * 3);
  const tmp = new THREE.Color();

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2 - Math.PI;
    const rim = pitOutlineRadiusAt(theta);
    const reach = rim + OVERLAP_M;
    for (let j = 0; j <= rings; j++) {
      let d = (j / rings) * reach;
      let x = cx + Math.cos(theta) * d;
      let z = cz + Math.sin(theta) * d;
      let off = pitMeshOffsetAt(x, z);
      const wallK = smoothstep(0, 1, 1 - Math.abs(off) / depthM) * (d < rim ? 1 : 0);
      const lipK = Math.sin(Math.PI * Math.min(1, Math.max(0, (d - (rim - PIT_WALL_RUN_M)) / PIT_WALL_RUN_M)));
      // Crumble: push wall points sideways so the wall has ledges and an irregular face.
      if (lipK > 0 && d < rim) {
        const jitter = (fbm3(x * 1.7, 3.1, z * 1.7, 3, seed) - 0.5) * 0.55 * lipK;
        d += jitter;
        x = cx + Math.cos(theta) * d;
        z = cz + Math.sin(theta) * d;
        off = pitMeshOffsetAt(x, z);
      }
      const bump = (fbm3(x * 2.3, 1.7, z * 2.3, 4, seed + 3) - 0.5) * (0.1 + 0.42 * wallK);
      const edgeFade = d < rim ? smoothstep(0, 0.35, rim - d) : 0;
      let y = opts.heightAt(x, z) + off + bump * edgeFade;
      // Past the outline the skirt sits slightly under the terrain surface so it never z-fights with it.
      if (d >= rim) y -= 0.01 + (d - rim) * 0.2;
      const k = (i * (rings + 1) + j) * 3;
      pos[k] = x;
      pos[k + 1] = y;
      pos[k + 2] = z;

      // Colour: dark floor, banded strata on the walls, dusty regolith tint toward the rim top.
      const depthBelow = Math.min(depthM, Math.max(0, -off));
      const warp = (fbm3(x * 0.6, 9.2, z * 0.6, 3, seed + 7) - 0.5) * 2.4;
      const band = 0.5 + 0.5 * Math.sin((depthBelow + warp) * 5.2);
      const thin = 0.5 + 0.5 * Math.sin((depthBelow + warp * 0.6) * 17 + 2);
      const strata = 0.78 + 0.34 * band + 0.1 * thin;
      const floorK = smoothstep(depthM * 0.85, depthM, depthBelow);
      const dust = smoothstep(0.9, 0, depthBelow) * 0.85;
      const base = strata * (1 - floorK * 0.62);
      tmp.setRGB(base * (1.3 + dust * 0.35), base * (1.02 + dust * 0.1), base * (0.82 - dust * 0.08));
      col[k] = tmp.r;
      col[k + 1] = tmp.g;
      col[k + 2] = tmp.b;
    }
  }

  const index: number[] = [];
  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments;
    for (let j = 0; j < rings; j++) {
      const a = i * (rings + 1) + j;
      const b = n * (rings + 1) + j;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  indexed.setAttribute("color", new THREE.BufferAttribute(col, 3));
  indexed.setIndex(index);
  indexed.computeVertexNormals();
  const geo = indexed.toNonIndexed();
  indexed.dispose();

  // Per-face planar UVs along the dominant normal axis (uniform texture density, no seams from a polar map).
  const p = geo.getAttribute("position") as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const a0 = new THREE.Vector3();
  const a1 = new THREE.Vector3();
  const a2 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    a0.fromBufferAttribute(p, f);
    a1.fromBufferAttribute(p, f + 1);
    a2.fromBufferAttribute(p, f + 2);
    fn.crossVectors(e1.subVectors(a1, a0), e2.subVectors(a2, a0)).normalize();
    const nx = Math.abs(fn.x);
    const ny = Math.abs(fn.y);
    const nz = Math.abs(fn.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(f + k);
      const y = p.getY(f + k);
      const z = p.getZ(f + k);
      let u: number;
      let v: number;
      if (ny >= nx && ny >= nz) {
        u = x;
        v = z;
      } else if (nx >= nz) {
        u = z;
        v = y;
      } else {
        u = x;
        v = y;
      }
      uv[(f + k) * 2] = u / TILE_M;
      uv[(f + k) * 2 + 1] = v / TILE_M;
    }
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}

export interface PitRock {
  x: number;
  z: number;
  /** Surface height offset (m, relative to the terrain) the rock rests on. */
  off: number;
  size: number;
  rotY: number;
  tiltX: number;
  tiltZ: number;
  variant: number;
  zone: "ramp" | "floor" | "talus" | "rim";
}

/**
 * Deterministic loose rock on the pit surfaces: rubble on the access ramp, scattered stones on the floor, a talus
 * band at the foot of the walls and chips on the rim. The drive line of the rescue robot and the casualty spot stay clear.
 */
export function planPitRubble(seed = 5, variants = 3): PitRock[] {
  const rnd = mulberry32(seed);
  const out: PitRock[] = [];
  const hw = RESCUE_PIT.rampHalfWidthM;
  const sCasualty = -3.85;
  const place = (zone: PitRock["zone"], x: number, z: number, size: number) => {
    out.push({
      x,
      z,
      off: pitMeshOffsetAt(x, z),
      size,
      rotY: rnd() * Math.PI * 2,
      tiltX: (rnd() - 0.5) * 0.5,
      tiltZ: (rnd() - 0.5) * 0.5,
      variant: Math.floor(rnd() * variants),
      zone,
    });
  };
  const world = (s: number, w: number) => ({
    x: RESCUE_SITE.x + RESCUE_PIT_AXIS.x * s - RESCUE_PIT_AXIS.z * w,
    z: RESCUE_SITE.z + RESCUE_PIT_AXIS.z * s + RESCUE_PIT_AXIS.x * w,
  });

  // Ramp rubble: fine stones everywhere, larger ones only on the shoulders so the lane stays drivable.
  for (let n = 0; n < 46; n++) {
    const s = -3.2 + rnd() * 7.6;
    const w = (rnd() * 2 - 1) * (hw + 0.9);
    const shoulder = Math.abs(w) > hw - 0.5;
    const size = shoulder ? 0.14 + rnd() * 0.3 : 0.05 + rnd() * 0.07;
    const p = world(s, w);
    place("ramp", p.x, p.z, size);
  }
  // Floor stones, clear of the drive lane and the casualty position.
  for (let n = 0, guard = 0; n < 16 && guard++ < 400; ) {
    const a = rnd() * Math.PI * 2;
    const r = 0.8 + rnd() * 3.2;
    const x = RESCUE_SITE.x + Math.cos(a) * r;
    const z = RESCUE_SITE.z + Math.sin(a) * r;
    const f = pitFrame(x, z);
    if (Math.abs(f.w) < 1.4 && f.s > -5) continue;
    if (Math.hypot(f.s - sCasualty, f.w) < 1.6) continue;
    place("floor", x, z, 0.12 + rnd() * 0.36);
    n++;
  }
  // Talus at the foot of the walls and fallen blocks on the wall faces.
  for (let n = 0, guard = 0; n < 38 && guard++ < 600; ) {
    const theta = rnd() * Math.PI * 2 - Math.PI;
    const rim = pitOutlineRadiusAt(theta);
    const d = rim - PIT_WALL_RUN_M - 0.3 + rnd() * (PIT_WALL_RUN_M + 0.3);
    const x = RESCUE_SITE.x + Math.cos(theta) * d;
    const z = RESCUE_SITE.z + Math.sin(theta) * d;
    const f = pitFrame(x, z);
    if (Math.abs(f.w) < hw + 0.6 && f.s > -5.5) continue;
    place("talus", x, z, 0.2 + rnd() * 0.5);
    n++;
  }
  // Chips and blocks along the rim, outside the ramp mouth.
  for (let n = 0, guard = 0; n < 34 && guard++ < 600; ) {
    const theta = rnd() * Math.PI * 2 - Math.PI;
    const rim = pitOutlineRadiusAt(theta);
    const d = rim + 0.1 + rnd() * 1.6;
    const x = RESCUE_SITE.x + Math.cos(theta) * d;
    const z = RESCUE_SITE.z + Math.sin(theta) * d;
    const f = pitFrame(x, z);
    if (Math.abs(f.w) < hw + 1.2 && f.s > 0) continue;
    place("rim", x, z, 0.18 + rnd() * 0.55);
    n++;
  }
  return out;
}
