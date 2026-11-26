import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export interface NormalizedGlb {
  group: THREE.Group;
  size: THREE.Vector3;
}

export interface RotorPivot {
  pivot: THREE.Object3D;
  axis: "x" | "y" | "z";
  /** +1 or -1: spin sense, so neighbouring rotors and the two layers of a coaxial stack counter-rotate. */
  dir?: 1 | -1;
}

let sharedLoader: GLTFLoader | null = null;
const templateCache = new Map<string, Promise<THREE.Group>>();

/**
 * Shared GLTFLoader: Draco (existing NASA models), EXT_meshopt_compression and
 * EXT_texture_webp (optimized models in `/models/`, see docs/impl/23_3D_ASSETS_PIPELINE.md).
 */
export function getGltfLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/gltf/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  sharedLoader = loader;
  return loader;
}

function loadTemplate(url: string): Promise<THREE.Group> {
  const cached = templateCache.get(url);
  if (cached) return cached;
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    getGltfLoader().load(
      url,
      (gltf) => {
        resolve(gltf.scene);
      },
      undefined,
      (err) => reject(err),
    );
  });
  templateCache.set(url, promise);
  return promise;
}

/**
 * Loads a NASA GLB asset (Draco or Meshopt compressed) and normalizes it
 * into a centered wrapper group scaled to `targetMaxSpanM`.
 */
export async function loadNormalizedNasaGlb(
  url: string,
  options: { targetMaxSpanM: number; anchor: "bottom" | "center"; castShadow?: boolean },
): Promise<NormalizedGlb> {
  const template = await loadTemplate(url);
  const model = template.clone(true);
  const castShadow = options.castShadow ?? true;
  model.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = castShadow;
      obj.receiveShadow = true;
    }
  });

  model.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(model);
  const rawSize = new THREE.Vector3();
  rawBox.getSize(rawSize);
  const maxSpan = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.001);
  const scale = options.targetMaxSpanM / maxSpan;
  model.scale.multiplyScalar(scale);

  model.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  scaledBox.getCenter(center);
  scaledBox.getSize(size);

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= options.anchor === "bottom" ? scaledBox.min.y : center.y;

  const wrapper = new THREE.Group();
  wrapper.add(model);
  return { group: wrapper, size };
}

/**
 * Wraps Ingenuity's coaxial rotor meshes (`rotors_01`, `rotors_02`) in mast-aligned
 * pivot groups so they spin cleanly around the rotor shaft axis.
 */
/**
 * Pivots of `drone-new`: the GLB ships eight `rotor_<corner>_<layer>` nodes whose origin is on the rotor shaft
 * (see tools/assets/split-drone-rotors.mjs). The node extras carry the spin sense.
 */
export function collectDroneRotorPivots(root: THREE.Object3D): RotorPivot[] {
  const pivots: RotorPivot[] = [];
  root.traverse((o) => {
    if (!/^rotor_(fl|fr|bl|br)_(up|low)$/.test(o.name)) return;
    pivots.push({ pivot: o, axis: "y", dir: o.userData.spinDir === -1 ? -1 : 1 });
  });
  return pivots;
}

export function extractIngenuityRotorPivots(root: THREE.Object3D): RotorPivot[] {
  const r1 = root.getObjectByName("rotors_01");
  const r2 = root.getObjectByName("rotors_02");
  if (!r1 && !r2) return [];

  let axis: "x" | "y" | "z" = "y";
  if (r1 && r2) {
    const diff = r1.position.clone().sub(r2.position);
    const ax = Math.abs(diff.x);
    const ay = Math.abs(diff.y);
    const az = Math.abs(diff.z);
    axis = ax >= ay && ax >= az ? "x" : ay >= az ? "y" : "z";
  }

  const pivots: RotorPivot[] = [];
  for (const rotor of [r1, r2]) {
    if (!rotor || !rotor.parent) continue;
    const parent = rotor.parent;
    const pivot = new THREE.Group();
    pivot.name = `${rotor.name}_pivot`;
    pivot.position.copy(rotor.position);
    rotor.position.set(0, 0, 0);
    parent.add(pivot);
    pivot.add(rotor);
    pivots.push({ pivot, axis });
  }
  return pivots;
}
