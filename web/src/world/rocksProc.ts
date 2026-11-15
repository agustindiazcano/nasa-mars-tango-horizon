import * as THREE from "three";
import { buildRockGeometry } from "./rockGeometry";
import {
  TIER_SIZE_M,
  defaultClusters,
  defaultExclusions,
  TIER_VARIANTS,
  planRocks,
  type BoulderCluster,
  type Circle,
  type RockPlacement,
  type RockTier,
} from "./rockPlacement";
import { makeRockTextures } from "./rockTextures";

export interface RocksTerrain {
  readonly sizeM: number;
  heightAt(x: number, z: number): number;
  slopeAt(x: number, z: number): number;
}

export interface RocksOptions {
  /** Extra boulder fields (for example around the rescue site). */
  extraClusters?: BoulderCluster[];
  /** Extra keep-clear circles. */
  extraExclusions?: Circle[];
  seed?: number;
}

const TIER_DETAIL: Record<RockTier, number> = { small: 1, medium: 3, large: 5 };
const TIER_ROUGHNESS: Record<RockTier, number> = { small: 0.4, medium: 0.46, large: 0.52 };
/** Fraction of the rock height buried in the terrain so the base never floats over bumps. */
const SINK = 0.3;

const GRAY = new THREE.Color(1.0, 0.98, 1.0);
const RUST = new THREE.Color(1.35, 1.0, 0.8);

/**
 * Rocks and boulders on the terrain: small and medium rocks scattered over the map, plus large boulders
 * grouped in fields at chosen places. Rendered with instancing and procedural basalt textures.
 * Like the base modules, rocks have no collision.
 */
export class RocksProc {
  readonly group = new THREE.Group();
  readonly placements: RockPlacement[];
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly material: THREE.MeshStandardMaterial;

  constructor(
    scene: THREE.Scene,
    private terrain: RocksTerrain,
    opts: RocksOptions = {},
  ) {
    this.group.name = "rocks";
    const tex = makeRockTextures();
    this.material = new THREE.MeshStandardMaterial({
      map: tex.map,
      normalMap: tex.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.93,
      metalness: 0.02,
    });

    const clusters = opts.extraClusters;
    const exclusions = opts.extraExclusions;
    this.placements = planRocks({
      halfSizeM: terrain.sizeM / 2,
      heightAt: (x, z) => terrain.heightAt(x, z),
      slopeAt: (x, z) => terrain.slopeAt(x, z),
      seed: opts.seed,
      ...(clusters ? { clusters: [...defaultClusters(), ...clusters] } : {}),
      ...(exclusions ? { exclusions: [...defaultExclusions(), ...exclusions] } : {}),
    });

    this.build();
    scene.add(this.group);
  }

  private build(): void {
    const tiers: RockTier[] = ["small", "medium", "large"];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();

    for (const tier of tiers) {
      const typical = Math.sqrt(TIER_SIZE_M[tier][0] * TIER_SIZE_M[tier][1]);
      for (let variant = 0; variant < TIER_VARIANTS[tier]; variant++) {
        const list = this.placements.filter((r) => r.tier === tier && r.variant === variant);
        if (list.length === 0) continue;
        const geo = buildRockGeometry({
          detail: TIER_DETAIL[tier],
          seed: 1000 + variant * 37 + tiers.indexOf(tier) * 211,
          worldSizeM: typical,
          roughness: TIER_ROUGHNESS[tier],
        });
        const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
        mesh.name = `rocks:${tier}:${variant}`;
        mesh.castShadow = tier !== "small";
        mesh.receiveShadow = true;
        list.forEach((r, i) => {
          p.set(r.x, this.terrain.heightAt(r.x, r.z) - r.sy * SINK, r.z);
          e.set(r.tiltX, r.rotY, r.tiltZ, "YXZ");
          q.setFromEuler(e);
          s.set(r.sx, r.sy, r.sz);
          m.compose(p, q, s);
          mesh.setMatrixAt(i, m);
          c.copy(GRAY).lerp(RUST, r.tint);
          mesh.setColorAt(i, c);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.computeBoundingBox();
        this.meshes.push(mesh);
        this.group.add(mesh);
      }
    }
  }

  get count(): number {
    return this.placements.length;
  }

  dispose(): void {
    for (const m of this.meshes) {
      m.geometry.dispose();
      m.dispose();
    }
    this.material.map?.dispose();
    this.material.normalMap?.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }
}

