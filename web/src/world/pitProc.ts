import * as THREE from "three";
import { RESCUE_PIT, RESCUE_SITE } from "@th/shared";
import { makeSpriteLabel, type TerrainProc } from "./terrainProc";
import { buildPitGeometry, planPitRubble } from "./pitGeometry";
import { buildRockGeometry } from "./rockGeometry";
import { makeRockTextures } from "./rockTextures";

export interface PitSpec {
  x: number;
  z: number;
  depthM: number;
}

const RUBBLE_VARIANTS = 3;

/**
 * Designed natural sinkhole for the crew rescue scenario (design assumption: the HiRISE DEM has no pit at the site).
 * The terrain surface is cut with the irregular outline of `pitOutlineRadiusAt` (`TerrainProc.setPitHole`); the
 * crumbling wall, dark floor, talus ramp and strata are one textured mesh under it, with loose rubble on top.
 * No collision: the scenario script moves the astronaut in and out of the pit using `pitSurfaceOffsetAt`.
 */
export class PitProc {
  readonly group = new THREE.Group();
  readonly spec: PitSpec;
  /** World y of the rim (highest terrain sample around the opening). */
  readonly rimY: number;
  /** World y of the shaft floor under the pit centre. */
  readonly floorY: number;

  constructor(scene: THREE.Scene, terrain: TerrainProc) {
    this.spec = { x: RESCUE_SITE.x, z: RESCUE_SITE.z, depthM: RESCUE_PIT.depthM };
    const { x, z, depthM } = this.spec;
    this.group.name = "rescue-pit";

    let rim = -Infinity;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      rim = Math.max(rim, terrain.heightAt(x + Math.cos(a) * 9, z + Math.sin(a) * 9));
    }
    this.rimY = rim;
    this.floorY = terrain.heightAt(x, z) - depthM;

    const tex = makeRockTextures(512, 2411);
    const heightAt = (px: number, pz: number) => terrain.heightAt(px, pz);
    const surface = new THREE.Mesh(
      buildPitGeometry({ heightAt }),
      new THREE.MeshStandardMaterial({
        map: tex.map,
        normalMap: tex.normalMap,
        normalScale: new THREE.Vector2(1.3, 1.3),
        vertexColors: true,
        roughness: 0.96,
        metalness: 0.02,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    );
    surface.name = "rescue-pit:surface";
    surface.receiveShadow = true;
    surface.castShadow = false;
    this.group.add(surface);

    this.addRubble(terrain, tex.map, tex.normalMap);

    const label = makeSpriteLabel("PIT 4 m + ramp (design)", "#ff4d6d");
    label.position.set(x, this.rimY + 3.2, z);
    label.scale.set(6.5, 1.25, 1);
    this.group.add(label);

    terrain.setPitHole(x, z);
    scene.add(this.group);
  }

  /** Loose rock on the ramp, floor, wall foot and rim, instanced per variant with the shared basalt textures. */
  private addRubble(terrain: TerrainProc, map: THREE.Texture, normalMap: THREE.Texture): void {
    const material = new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.94, metalness: 0.02 });
    const rocks = planPitRubble(5, RUBBLE_VARIANTS);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const tint = new THREE.Color();
    for (let variant = 0; variant < RUBBLE_VARIANTS; variant++) {
      const list = rocks.filter((r) => r.variant === variant);
      if (list.length === 0) continue;
      const geo = buildRockGeometry({ detail: 2, seed: 4000 + variant * 53, worldSizeM: 0.4, roughness: 0.46 });
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      mesh.name = `rescue-pit:rubble:${variant}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      list.forEach((r, i) => {
        const flat = 0.7 + ((i * 37) % 10) / 25;
        p.set(r.x, terrain.heightAt(r.x, r.z) + r.off - r.size * flat * 0.3, r.z);
        e.set(r.tiltX, r.rotY, r.tiltZ, "YXZ");
        q.setFromEuler(e);
        s.set(r.size * 1.1, r.size * flat, r.size);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
        tint.setRGB(1.05 + (i % 3) * 0.12, 0.95 + (i % 3) * 0.05, 0.9);
        mesh.setColorAt(i, tint);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
  }
}
