import * as THREE from "three";
import { hash2, periodicFbm2 } from "./noise";

/**
 * Procedural weathering for hard-surface models: windblown dust that settles on upward faces, fine scratches that
 * show bare metal, and micro grain in the roughness. The maps are generated here (tileable, no external assets) and
 * sampled triplanar in world space, so they do not depend on the model's own UV layout.
 */
export interface WeatherMaps {
  size: number;
  /** RGBA8: R dust noise, G scratch mask, B grain. */
  mask: Uint8Array<ArrayBuffer>;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Draws one tileable thin line into a scratch buffer (wrapping at the edges). */
function drawScratch(buf: Float32Array, size: number, x0: number, y0: number, angle: number, len: number, strength: number): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let s = 0; s < len; s++) {
    const fade = Math.sin((s / len) * Math.PI);
    const x = (Math.round(x0 + dx * s) + size * 4) % size;
    const y = (Math.round(y0 + dy * s) + size * 4) % size;
    const i = y * size + x;
    buf[i] = Math.max(buf[i], strength * fade);
  }
}

export function generateWeatherMaps(size = 256, seed = 4242): WeatherMaps {
  const scratch = new Float32Array(size * size);
  // Seeded scratch field: many short faint lines and a few long deep ones, mostly along two preferred directions.
  const count = Math.floor((size * size) / 90);
  for (let k = 0; k < count; k++) {
    const x = hash2(k, 1, seed) * size;
    const y = hash2(k, 2, seed) * size;
    const long = hash2(k, 3, seed) > 0.9;
    const dir = hash2(k, 4, seed) > 0.5 ? 0.35 : 1.9;
    const angle = dir + (hash2(k, 5, seed) - 0.5) * 0.7;
    const len = long ? 30 + hash2(k, 6, seed) * 60 : 6 + hash2(k, 7, seed) * 18;
    drawScratch(scratch, size, x, y, angle, len, long ? 1 : 0.45 + hash2(k, 8, seed) * 0.4);
  }

  const mask = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const i = y * size + x;
      const dust = clamp01((periodicFbm2(u, v, 4, 5, seed + 3) - 0.25) * 1.9);
      const grain = periodicFbm2(u, v, 48, 2, seed + 9);
      const o = i * 4;
      mask[o] = Math.round(dust * 255);
      mask[o + 1] = Math.round(clamp01(scratch[i]) * 255);
      mask[o + 2] = Math.round(grain * 255);
      mask[o + 3] = 255;
    }
  }
  return { size, mask };
}

export interface WeatherOptions {
  /** Dust amount on upward-facing surfaces, 0..1. */
  dust?: number;
  /** World metres covered by one texture tile. */
  tileM?: number;
  /** Dust colour (linear sRGB). */
  dustColor?: THREE.ColorRepresentation;
  /** Scratch visibility, 0..1. */
  scratches?: number;
}

let sharedMask: THREE.DataTexture | null = null;

function weatherMaskTexture(): THREE.DataTexture {
  if (sharedMask) return sharedMask;
  const maps = generateWeatherMaps();
  const tex = new THREE.DataTexture(maps.mask, maps.size, maps.size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  sharedMask = tex;
  return tex;
}

const VERTEX_DECL = /* glsl */ `
varying vec3 vWeatherPos;
varying vec3 vWeatherNormal;
`;

const VERTEX_BODY = /* glsl */ `
vWeatherPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWeatherNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const FRAGMENT_DECL = /* glsl */ `
varying vec3 vWeatherPos;
varying vec3 vWeatherNormal;
uniform sampler2D uWeatherMask;
uniform float uWeatherScale;
uniform float uWeatherDust;
uniform float uWeatherScratch;
uniform vec3 uWeatherDustColor;
vec3 weatherSample() {
  vec3 p = vWeatherPos * uWeatherScale;
  vec3 n = normalize(vWeatherNormal);
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-4);
  return texture2D(uWeatherMask, p.zy).rgb * w.x + texture2D(uWeatherMask, p.xz).rgb * w.y + texture2D(uWeatherMask, p.xy).rgb * w.z;
}
`;

const ALBEDO_PATCH = /* glsl */ `
#include <map_fragment>
vec3 wm = weatherSample();
float wUp = smoothstep(0.1, 0.9, normalize(vWeatherNormal).y);
float wDust = clamp(uWeatherDust * (0.3 + 1.0 * wm.r) * (0.2 + 0.8 * wUp), 0.0, 0.88);
float wScr = smoothstep(0.55, 0.9, wm.g) * uWeatherScratch * (1.0 - wDust);
diffuseColor.rgb = mix(diffuseColor.rgb, uWeatherDustColor, wDust);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.62, 0.64), wScr * 0.55);
`;

const ROUGHNESS_PATCH = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (wm.b - 0.5) * 0.3 + wDust * 0.45 - wScr * 0.25, 0.05, 1.0);
`;

/** True for opaque, non-transmissive standard/physical materials (glass and decals are left alone). */
export function isWeatherable(mat: THREE.Material): mat is THREE.MeshStandardMaterial {
  const m = mat as THREE.MeshStandardMaterial & { transmission?: number };
  return (
    (m as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial === true &&
    !m.transparent &&
    !(typeof m.transmission === "number" && m.transmission > 0.01)
  );
}

/** Patches one material in place. Safe to call twice: the second call does nothing. */
export function weatherMaterial(mat: THREE.Material, opts: WeatherOptions = {}): void {
  if (!isWeatherable(mat) || mat.userData.weathered) return;
  mat.userData.weathered = true;
  const tile = opts.tileM ?? 1.2;
  const dust = opts.dust ?? 0.55;
  const scratches = opts.scratches ?? 0.8;
  const dustColor = new THREE.Color(opts.dustColor ?? 0x9a6b4a);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWeatherMask = { value: weatherMaskTexture() };
    shader.uniforms.uWeatherScale = { value: 1 / tile };
    shader.uniforms.uWeatherDust = { value: dust };
    shader.uniforms.uWeatherScratch = { value: scratches };
    shader.uniforms.uWeatherDustColor = { value: new THREE.Vector3(dustColor.r, dustColor.g, dustColor.b) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_DECL}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_DECL}`)
      .replace("#include <map_fragment>", ALBEDO_PATCH)
      .replace("#include <roughnessmap_fragment>", ROUGHNESS_PATCH);
  };
  mat.customProgramCacheKey = () => `weathered-${tile}-${dust}-${scratches}`;
  mat.needsUpdate = true;
}

/** Weathers every eligible material under an object. Returns how many materials were patched. */
export function weatherObject(root: THREE.Object3D, opts: WeatherOptions = {}): number {
  const seen = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) seen.add(m);
  });
  let n = 0;
  for (const m of seen) {
    if (isWeatherable(m) && !m.userData.weathered) {
      weatherMaterial(m, opts);
      n++;
    }
  }
  return n;
}
