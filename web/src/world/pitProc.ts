import * as THREE from "three";
import { RESCUE_PIT, RESCUE_PIT_AXIS, RESCUE_SITE } from "@th/shared";
import { makeSpriteLabel, type TerrainProc } from "./terrainProc";

export interface PitSpec {
  x: number;
  z: number;
  depthM: number;
  radiusM: number;
}

/**
 * Designed open shaft for the crew rescue scenario (design assumption: the HiRISE DEM has no pit at the site).
 * The terrain surface is cut with a circular hole (`TerrainProc.setPitHole`); the shaft wall, floor and rim skirt
 * are drawn under it. No collision: the scenario script moves the astronaut in and out of the pit.
 */
export class PitProc {
  readonly group = new THREE.Group();
  readonly spec: PitSpec;
  /** World y of the rim (highest terrain sample around the opening). */
  readonly rimY: number;
  /** World y of the shaft floor. */
  readonly floorY: number;

  constructor(scene: THREE.Scene, terrain: TerrainProc, spec: Partial<PitSpec> = {}) {
    this.spec = {
      x: spec.x ?? RESCUE_SITE.x,
      z: spec.z ?? RESCUE_SITE.z,
      depthM: spec.depthM ?? RESCUE_PIT.depthM,
      radiusM: spec.radiusM ?? RESCUE_PIT.radiusM,
    };
    const { x, z, depthM, radiusM } = this.spec;
    this.group.name = "rescue-pit";

    let rim = -Infinity;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      rim = Math.max(rim, terrain.heightAt(x + Math.cos(a) * (radiusM + 1.2), z + Math.sin(a) * (radiusM + 1.2)));
    }
    this.rimY = rim;
    this.floorY = rim - depthM;

    const rock = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.95, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusM, radiusM, depthM + 0.6, 36, 1, true),
      rock,
    );
    wall.position.set(x, this.floorY + (depthM + 0.6) / 2, z);
    wall.receiveShadow = true;
    this.group.add(wall);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(radiusM, 36),
      new THREE.MeshStandardMaterial({ color: 0x1a110c, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, this.floorY, z);
    this.group.add(floor);

    // Rim skirt: flat flange that hides the terrain-mesh seam around the opening, plus a raised lip.
    const flange = new THREE.Mesh(
      new THREE.RingGeometry(radiusM - 0.02, radiusM + 1.2, 36),
      new THREE.MeshStandardMaterial({
        color: 0x7a4b33,
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    flange.rotation.x = -Math.PI / 2;
    flange.position.set(x, this.rimY + 0.04, z);
    this.group.add(flange);

    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(radiusM + 0.12, 0.12, 6, 36),
      new THREE.MeshStandardMaterial({ color: 0x8a5a40, roughness: 0.9 }),
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.set(x, this.rimY + 0.1, z);
    this.group.add(lip);

    // Access ramp on the side facing the base: slopes from the rim (axis +s) down to the floor.
    const slope = (RESCUE_PIT.rampSlopeDeg * Math.PI) / 180;
    const halfW = RESCUE_PIT.rampHalfWidthM;
    const sTop = Math.sqrt(radiusM * radiusM - halfW * halfW);
    const runM = depthM / Math.tan(slope);
    const rampLen = depthM / Math.sin(slope);
    const ramp = new THREE.Group();
    ramp.position.set(x, 0, z);
    ramp.rotation.y = Math.atan2(RESCUE_PIT_AXIS.x, RESCUE_PIT_AXIS.z);
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.12, rampLen),
      new THREE.MeshStandardMaterial({ color: 0x8c6a52, roughness: 0.95 }),
    );
    // Box long axis is local z; rising toward +z needs a negative x rotation.
    plate.rotation.x = -slope;
    plate.position.set(0, rim - depthM / 2 - 0.06, sTop - runM / 2);
    plate.castShadow = true;
    plate.receiveShadow = true;
    ramp.add(plate);
    this.group.add(ramp);

    const label = makeSpriteLabel("PIT 4 m + ramp (design)", "#ff4d6d");
    label.position.set(x, this.rimY + 3.2, z);
    label.scale.set(6.5, 1.25, 1);
    this.group.add(label);

    terrain.setPitHole(x, z, radiusM);
    scene.add(this.group);
  }
}
