import * as THREE from "three";
import { hash2, periodicFbm2, periodicWorley2 } from "./noise";

/**
 * Procedural, tileable basalt maps (no external assets, no network).
 * Surface model: fractal relief, thin cooling cracks (Worley F2-F1), gas vesicles (Worley pits),
 * mineral speckle and a thin rust-colored dust film on the upward-facing relief.
 */
export interface RockMaps {
  size: number;
  /** RGBA8 sRGB albedo. */
  albedo: Uint8Array<ArrayBuffer>;
  /** RGBA8 tangent-space normal map. */
  normal: Uint8Array<ArrayBuffer>;
  /** Height field, 0..1, one float per texel (kept for tests and bump use). */
  height: Float32Array;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function generateRockMaps(size = 512, seed = 1337, normalStrength = 4.2): RockMaps {
  const height = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const i = y * size + x;

      const relief = periodicFbm2(u, v, 4, 6, seed);
      const w = periodicWorley2(u, v, 7, seed + 11);
      // Cooling cracks are broken up by a noise mask so they do not read as a regular net.
      const crackMask = smoothstep(0.5, 0.68, periodicFbm2(u, v, 3, 4, seed + 13));
      const crack = (1 - smoothstep(0.0, 0.06, w.f2 - w.f1)) * crackMask;
      const wv = periodicWorley2(u, v, 22, seed + 29);
      const vesicleR = 0.18 + 0.18 * hash2(Math.floor(u * 22), Math.floor(v * 22), seed + 3);
      const vesicle = 1 - smoothstep(vesicleR * 0.55, vesicleR, wv.f1);
      const vesicleMask = periodicFbm2(u, v, 3, 3, seed + 41) > 0.6 ? 1 : 0.08;

      const strata = 0.5 + 0.5 * Math.sin((v + relief * 0.35) * Math.PI * 14);
      const h = clamp01(0.15 + relief * 0.72 + strata * 0.08 - crack * 0.2 - vesicle * 0.22 * vesicleMask);
      height[i] = h;

      const dustMask = clamp01((periodicFbm2(u, v, 5, 4, seed + 77) - 0.35) * 2.2) * smoothstep(0.25, 0.7, h);

      const grain = hash2(x, y, seed + 5);
      const speckle = grain > 0.985 ? 0.16 : grain < 0.02 ? -0.06 : 0;
      const patch = periodicFbm2(u, v, 2, 5, seed + 91);
      const tone = 0.15 + h * 0.3 + (patch - 0.5) * 0.28 + (grain - 0.5) * 0.06 + speckle;

      // Dark basalt (slightly warm gray) mixed toward a rusty dust film.
      const baseR = tone * 1.0;
      const baseG = tone * 0.93;
      const baseB = tone * 0.88;
      const dustR = 0.5;
      const dustG = 0.29;
      const dustB = 0.17;
      const k = dustMask * 0.7;
      const ao = 1 - crack * 0.5 - vesicle * 0.3 * vesicleMask;
      const o = i * 4;
      albedo[o] = Math.round(clamp01((baseR * (1 - k) + dustR * k * (0.7 + h * 0.5)) * ao) * 255);
      albedo[o + 1] = Math.round(clamp01((baseG * (1 - k) + dustG * k * (0.7 + h * 0.5)) * ao) * 255);
      albedo[o + 2] = Math.round(clamp01((baseB * (1 - k) + dustB * k * (0.7 + h * 0.5)) * ao) * 255);
      albedo[o + 3] = 255;
    }
  }

  // Tangent-space normals from the (wrapping) height field.
  const normal = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * normalStrength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * normalStrength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      normal[o] = Math.round((-dx / len * 0.5 + 0.5) * 255);
      normal[o + 1] = Math.round((-dy / len * 0.5 + 0.5) * 255);
      normal[o + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
      normal[o + 3] = 255;
    }
  }

  return { size, albedo, normal, height };
}

export interface RockTextures {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
}

function toTexture(data: Uint8Array<ArrayBuffer>, size: number, srgb: boolean): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Builds GPU textures from freshly generated maps (about 100 ms at 512 px). */
export function makeRockTextures(size = 512, seed = 1337): RockTextures {
  const maps = generateRockMaps(size, seed);
  return { map: toTexture(maps.albedo, size, true), normalMap: toTexture(maps.normal, size, false) };
}
