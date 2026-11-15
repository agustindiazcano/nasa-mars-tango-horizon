import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { getGltfLoader } from "./nasaModels";

/**
 * Manifest-driven library of the optimized GLBs in `/models/` (docs/impl/23, docs/impl/24).
 * Every model is normalized once to world metres by a per-role size rule, anchored with its lowest point on y = 0
 * and centered on x/z, then cloned (shared geometry and materials) or instanced per use.
 * Callers keep a procedural fallback: `attachModel` only swaps it out when the GLB loads.
 */

export type ModelId =
  | "antenna"
  | "asset-1"
  | "asset-2"
  | "asset-3"
  | "asset-4"
  | "astronaut"
  | "astronaut-animated"
  | "building-1"
  | "building-2"
  | "building-3"
  | "building-connector"
  | "conae-base-mars"
  | "rescue-robot-astronaut"
  | "rescue-robot-without-astronaut"
  | "rescue-rover"
  | "rocket"
  | "rover-1"
  | "rover-2"
  | "solar-panel";

/** `maxSpan` fits the largest bounding-box side, the others fit one axis (x width, y height, z length). */
export type SizeRule = { axis: "maxSpan" | "x" | "y" | "z"; metres: number };

/** Load order: 0 loads first (base, crew), larger numbers later. */
export interface ModelSpec {
  size: SizeRule;
  priority: number;
}

/** Design sizes in metres; the GLBs ship normalized to about 1 unit, so each role defines its real-world scale. */
export const MODEL_SPECS: Readonly<Record<ModelId, ModelSpec>> = {
  "conae-base-mars": { size: { axis: "maxSpan", metres: 26 }, priority: 0 },
  "astronaut-animated": { size: { axis: "y", metres: 1.75 }, priority: 0 },
  "asset-1": { size: { axis: "maxSpan", metres: 18 }, priority: 1 },
  "asset-2": { size: { axis: "maxSpan", metres: 14 }, priority: 1 },
  "asset-3": { size: { axis: "maxSpan", metres: 14 }, priority: 1 },
  "building-1": { size: { axis: "maxSpan", metres: 20 }, priority: 1 },
  "building-2": { size: { axis: "maxSpan", metres: 12 }, priority: 1 },
  "building-3": { size: { axis: "maxSpan", metres: 10 }, priority: 1 },
  "building-connector": { size: { axis: "maxSpan", metres: 7 }, priority: 1 },
  "rover-1": { size: { axis: "z", metres: 5.6 }, priority: 1 },
  "rover-2": { size: { axis: "z", metres: 5.6 }, priority: 1 },
  "rescue-rover": { size: { axis: "z", metres: 4.4 }, priority: 1 },
  "rescue-robot-without-astronaut": { size: { axis: "z", metres: 2 }, priority: 1 },
  "rescue-robot-astronaut": { size: { axis: "z", metres: 2.6 }, priority: 2 },
  "asset-4": { size: { axis: "maxSpan", metres: 7 }, priority: 2 },
  "solar-panel": { size: { axis: "maxSpan", metres: 5.5 }, priority: 2 },
  antenna: { size: { axis: "y", metres: 9 }, priority: 2 },
  rocket: { size: { axis: "y", metres: 121 }, priority: 3 },
  astronaut: { size: { axis: "y", metres: 1.9 }, priority: 4 },
};

export interface ManifestEntry {
  file: string;
  bytes: number;
  boundingBox: { size: number[] };
  animations: string[];
  skinned: boolean;
}

export interface ModelManifest {
  version: number;
  totalBytes: number;
  models: Record<string, ManifestEntry>;
}

/** Uniform scale that makes a bounding box of `size` satisfy `rule`. */
export function scaleForRule(size: readonly [number, number, number], rule: SizeRule): number {
  const [sx, sy, sz] = size;
  const ref = rule.axis === "x" ? sx : rule.axis === "y" ? sy : rule.axis === "z" ? sz : Math.max(sx, sy, sz);
  return rule.metres / Math.max(ref, 1e-6);
}

/** Offsets that center a scaled box on x/z and rest its lowest point on y = 0. */
export function groundAnchorOffset(min: readonly [number, number, number], max: readonly [number, number, number], scale: number): THREE.Vector3 {
  return new THREE.Vector3(-((min[0] + max[0]) / 2) * scale, -min[1] * scale, -((min[2] + max[2]) / 2) * scale);
}

/** Axis-aligned world footprint (width along x, depth along z) of a box of `size` after scale and a yaw rotation. */
export function rotatedFootprint(size: readonly [number, number, number], scale: number, yaw: number): { width: number; depth: number } {
  const w = size[0] * scale;
  const d = size[2] * scale;
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  return { width: w * c + d * s, depth: w * s + d * c };
}

/** Footprint in metres of a catalogued model from the manifest box and its `MODEL_SPECS` rule. */
export function modelFootprint(id: ModelId, manifest: ModelManifest, yaw = 0): { width: number; depth: number; height: number } {
  const e = manifest.models[id];
  const size = e.boundingBox.size as [number, number, number];
  const scale = scaleForRule(size, MODEL_SPECS[id].size);
  const f = rotatedFootprint(size, scale, yaw);
  return { ...f, height: size[1] * scale };
}

export interface InstancePlacement {
  x: number;
  y: number;
  z: number;
  yaw?: number;
  scale?: number;
}

export function placementMatrix(p: InstancePlacement, out = new THREE.Matrix4()): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw ?? 0);
  const s = p.scale ?? 1;
  return out.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(s, s, s));
}

/**
 * Turns every mesh of a normalized template into one `InstancedMesh` (shared geometry and material) and returns them
 * in a group. Skinned meshes are not supported; use `spawn` for those.
 */
export function buildInstanced(template: THREE.Object3D, placements: readonly InstancePlacement[]): THREE.Group {
  const group = new THREE.Group();
  if (placements.length === 0) return group;
  template.updateMatrixWorld(true);
  const place = placements.map((p) => placementMatrix(p));
  template.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, placements.length);
    const rel = mesh.matrixWorld;
    const m = new THREE.Matrix4();
    for (let i = 0; i < place.length; i++) inst.setMatrixAt(i, m.multiplyMatrices(place[i], rel));
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    group.add(inst);
  });
  return group;
}

/** Runs async tasks lowest priority number first with a concurrency limit; ties keep insertion order. */
export class PriorityLoader {
  private queue: { priority: number; seq: number; run: () => Promise<void> }[] = [];
  private active = 0;
  private seq = 0;

  constructor(private concurrency = 2) {}

  /** Number of tasks waiting (not yet started). */
  get pending(): number {
    return this.queue.length;
  }

  enqueue<T>(priority: number, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        priority,
        seq: this.seq++,
        run: () => task().then(resolve, reject),
      });
      this.queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      this.pump();
    });
  }

  private pump(): void {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.active++;
      void next.run().finally(() => {
        this.active--;
        this.pump();
      });
    }
  }
}

export interface ModelTemplate {
  /** Normalized wrapper: centered on x/z, lowest point at y = 0, scaled to metres. */
  root: THREE.Group;
  size: THREE.Vector3;
  clips: THREE.AnimationClip[];
  skinned: boolean;
}

export interface SpawnedModel {
  object: THREE.Group;
  size: THREE.Vector3;
  clips: THREE.AnimationClip[];
}

export class ModelLibrary {
  /** Bytes of GLB files requested so far (from the manifest), for the download budget check. */
  loadedBytes = 0;
  private manifestPromise: Promise<ModelManifest> | null = null;
  private templates = new Map<ModelId, Promise<ModelTemplate | null>>();
  private readonly loader = new PriorityLoader(2);

  manifest(): Promise<ModelManifest> {
    if (!this.manifestPromise) {
      this.manifestPromise = fetch("/models/manifest.json").then((r) => {
        if (!r.ok) throw new Error(`manifest HTTP ${r.status}`);
        return r.json() as Promise<ModelManifest>;
      });
    }
    return this.manifestPromise;
  }

  /** Loads, normalizes and caches a model. Resolves null (never rejects) when the file cannot be loaded. */
  template(id: ModelId): Promise<ModelTemplate | null> {
    let p = this.templates.get(id);
    if (!p) {
      p = this.loader.enqueue(MODEL_SPECS[id].priority, () => this.build(id)).catch((err) => {
        console.warn(`Model "${id}" failed to load; keeping the procedural fallback`, err);
        return null;
      });
      this.templates.set(id, p);
    }
    return p;
  }

  private async build(id: ModelId): Promise<ModelTemplate> {
    const manifest = await this.manifest();
    const entry = manifest.models[id];
    if (!entry) throw new Error(`"${id}" is not in the manifest`);
    const gltf = await getGltfLoader().loadAsync(`/models/${entry.file}`);
    this.loadedBytes += entry.bytes;
    const inner = gltf.scene;
    const scale = scaleForRule(entry.boundingBox.size as [number, number, number], MODEL_SPECS[id].size);
    inner.scale.multiplyScalar(scale);
    inner.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    if (!entry.skinned) {
      const c = box.getCenter(new THREE.Vector3());
      inner.position.x -= c.x;
      inner.position.z -= c.z;
      inner.position.y -= box.min.y;
    }
    const root = new THREE.Group();
    root.name = `model:${id}`;
    root.add(inner);
    root.updateMatrixWorld(true);
    inner.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = !entry.skinned;
      }
    });
    const size = entry.skinned
      ? new THREE.Vector3(entry.boundingBox.size[0], entry.boundingBox.size[1], entry.boundingBox.size[2]).multiplyScalar(scale)
      : box.getSize(new THREE.Vector3());
    return { root, size, clips: gltf.animations, skinned: entry.skinned };
  }

  /** A clone that shares geometry and materials with the cached template (skeleton-aware for skinned models). */
  async spawn(id: ModelId): Promise<SpawnedModel | null> {
    const t = await this.template(id);
    if (!t) return null;
    const object = (t.skinned ? cloneSkinned(t.root) : t.root.clone(true)) as THREE.Group;
    return { object, size: t.size.clone(), clips: t.clips };
  }

  /**
   * Adds the model to `parent` when it loads and hides `fallback`. On failure the fallback stays visible.
   * `onLoaded` can adjust the model (yaw offset, position) before it is added.
   */
  async attach(
    id: ModelId,
    parent: THREE.Object3D,
    fallback: THREE.Object3D | null,
    onLoaded?: (m: SpawnedModel) => void,
  ): Promise<SpawnedModel | null> {
    const m = await this.spawn(id);
    if (!m) return null;
    m.object.name = `glb:${id}`;
    onLoaded?.(m);
    parent.add(m.object);
    if (fallback) fallback.visible = false;
    return m;
  }

  /** One `InstancedMesh` group per model mesh for the given placements; null on load failure. */
  async instanced(id: ModelId, placements: readonly InstancePlacement[]): Promise<THREE.Group | null> {
    const t = await this.template(id);
    if (!t) return null;
    const g = buildInstanced(t.root, placements);
    g.name = `instances:${id}`;
    return g;
  }
}

/** Shared library for the whole simulator. */
export const models = new ModelLibrary();
