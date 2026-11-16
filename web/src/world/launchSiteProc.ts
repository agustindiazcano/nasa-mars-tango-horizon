import { LAUNCH_SITE_COORD } from "@th/shared";
import * as THREE from "three";
import { models } from "./modelLibrary";
import type { TerrainProc } from "./terrainProc";

const PAD_RADIUS_M = 64;
/** The `rockets` GLB ships at 14 m; the pad display scales it so it reads from several hundred metres. */
const ROCKETS_PAD_SCALE = 3;

type Vec3 = [number, number, number];

function makeScorchedPadTexture(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6b655e";
  g.fillRect(0, 0, size, size);
  // Concrete slab noise
  for (let i = 0; i < 9000; i++) {
    const v = 80 + Math.random() * 60;
    g.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.05 + Math.random() * 0.1})`;
    g.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 14, 2 + Math.random() * 14);
  }
  // Expansion joints
  g.strokeStyle = "rgba(20,18,16,0.35)";
  g.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.moveTo((i / 8) * size, 0);
    g.lineTo((i / 8) * size, size);
    g.moveTo(0, (i / 8) * size);
    g.lineTo(size, (i / 8) * size);
    g.stroke();
  }
  // Engine scorch: dark core and soot rays
  const grad = g.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size * 0.48);
  grad.addColorStop(0, "rgba(8,6,5,0.96)");
  grad.addColorStop(0.35, "rgba(16,13,11,0.82)");
  grad.addColorStop(0.7, "rgba(30,25,21,0.32)");
  grad.addColorStop(1, "rgba(30,25,21,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const len = size * (0.16 + Math.random() * 0.3);
    g.strokeStyle = `rgba(10,8,6,${0.12 + Math.random() * 0.2})`;
    g.lineWidth = 3 + Math.random() * 9;
    g.beginPath();
    g.moveTo(size / 2 + Math.cos(a) * 40, size / 2 + Math.sin(a) * 40);
    g.lineTo(size / 2 + Math.cos(a) * len, size / 2 + Math.sin(a) * len);
    g.stroke();
  }
  // Painted hazard ring near the edge
  g.strokeStyle = "rgba(255,179,107,0.75)";
  g.lineWidth = 8;
  g.setLineDash([36, 24]);
  g.beginPath();
  g.arc(size / 2, size / 2, size * 0.455, 0, Math.PI * 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Launch pad with the generic `rockets` model, tank farm, control bunker and floodlights. */
export class LaunchSiteProc {
  readonly group = new THREE.Group();
  readonly padY: number;
  readonly worldX = LAUNCH_SITE_COORD.x;
  readonly worldZ = LAUNCH_SITE_COORD.z;
  private beacons: THREE.Mesh[] = [];
  private target: THREE.Object3D = this.group;

  constructor(scene: THREE.Scene, private terrain: TerrainProc) {
    this.group.name = "launch-site";
    const cx = this.worldX;
    const cz = this.worldZ;

    // Grade the pad to the highest terrain sample so no part of the slab floats
    let hMax = -Infinity;
    let hMin = Infinity;
    for (let ring = 0; ring <= 6; ring++) {
      const r = (ring / 6) * (PAD_RADIUS_M + 6);
      const steps = ring === 0 ? 1 : 24;
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        const h = terrain.heightAt(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
        hMax = Math.max(hMax, h);
        hMin = Math.min(hMin, h);
      }
    }
    this.padY = hMax + 0.5;
    this.group.position.set(cx, this.padY, cz);

    this.buildPad(hMin);
    void models.attach("rockets", this.group, null, (m) => {
      m.object.scale.multiplyScalar(ROCKETS_PAD_SCALE);
      m.object.position.set(0, 0, 0);
      this.keepVisibleInHaze(m.object);
    });
    this.buildTankFarm();
    this.buildBunkerAndLights();

    this.keepVisibleInHaze(this.group);
    scene.add(this.group);
  }

  /** The complex is a landmark over 1 km away: thin the dust haze on it so the skyline stays readable. */
  private keepVisibleInHaze(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) (m as THREE.Material & { fog?: boolean }).fog = false;
    });
  }

  update(timeS: number): void {
    const on = Math.floor(timeS * 1.1) % 2 === 0;
    for (const b of this.beacons) b.visible = on;
  }

  private std(color: number, roughness = 0.5, metalness = 0.3): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  private add(mesh: THREE.Object3D, pos: Vec3, parent: THREE.Object3D = this.target): void {
    mesh.position.set(...pos);
    parent.add(mesh);
  }

  /** Foundation skirt reaching the lowest terrain sample, topped by a scorched concrete deck. */
  private buildPad(hMin: number): void {
    const depth = this.padY - hMin + 8;
    const found = new THREE.Mesh(
      new THREE.CylinderGeometry(PAD_RADIUS_M, PAD_RADIUS_M + 9, depth, 56, 1, true),
      this.std(0x4a443f, 0.95, 0.05),
    );
    this.add(found, [0, -depth / 2, 0]);

    const deck = new THREE.Mesh(
      new THREE.CircleGeometry(PAD_RADIUS_M, 64),
      new THREE.MeshStandardMaterial({ map: makeScorchedPadTexture(), roughness: 0.92, metalness: 0.02 }),
    );
    deck.rotation.x = -Math.PI / 2;
    this.add(deck, [0, 0, 0]);
  }

  /** Cryogenic propellant farm: vertical LOX/CH4 tanks and two spheres west of the pad. */
  private buildTankFarm(): void {
    const white = this.std(0xf1f3f5, 0.45, 0.25);
    const base = this.std(0x4a443f, 0.95, 0.05);
    const placeOnGround = (lx: number, lz: number, radius: number, build: (y: number) => void): void => {
      const wx = this.worldX + lx;
      const wz = this.worldZ + lz;
      let top = -Infinity;
      for (let k = 0; k < 9; k++) {
        const a = (k / 8) * Math.PI * 2;
        const r = k === 8 ? 0 : radius;
        top = Math.max(top, this.terrain.heightAt(wx + Math.cos(a) * r, wz + Math.sin(a) * r));
      }
      const y = top + 0.6 - this.padY;
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.5, radius + 2.2, 5, 24), base);
      this.add(plinth, [lx, y - 2.5, lz]);
      build(y);
    };

    const tanks: [number, number][] = [
      [-96, -30],
      [-96, 0],
      [-96, 30],
      [-124, -15],
    ];
    for (const [lx, lz] of tanks) {
      placeOnGround(lx, lz, 7, (y) => {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 24, 28), white);
        this.add(body, [lx, y + 12, lz]);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), white);
        this.add(dome, [lx, y + 24, lz]);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(7.05, 7.05, 1.2, 28), this.std(0xff7a3a, 0.5, 0.2));
        this.add(band, [lx, y + 20, lz]);
      });
    }
    for (const [lx, lz] of [
      [-124, 18],
      [-124, 46],
    ] as [number, number][]) {
      placeOnGround(lx, lz, 9, (y) => {
        const sph = new THREE.Mesh(new THREE.SphereGeometry(9, 28, 20), white);
        this.add(sph, [lx, y + 11, lz]);
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 8), this.std(0x6c7279, 0.6, 0.4));
          this.add(leg, [lx + Math.cos(a) * 5.6, y + 3.5, lz + Math.sin(a) * 5.6]);
        }
      });
    }
  }

  /** Control bunker, floodlight poles and red aviation beacons. */
  private buildBunkerAndLights(): void {
    const wx = this.worldX + 78;
    const wz = this.worldZ + 34;
    let top = -Infinity;
    for (const [dx, dz] of [
      [-8, -6],
      [8, -6],
      [8, 6],
      [-8, 6],
      [0, 0],
    ]) top = Math.max(top, this.terrain.heightAt(wx + dx, wz + dz));
    const y = top + 0.5 - this.padY;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 13), this.std(0x4a443f, 0.95, 0.05));
    this.add(plinth, [78, y - 2.5, 34]);
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 11), this.std(0xcfd3d6, 0.7, 0.1));
    this.add(bunker, [78, y + 2.75, 34]);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.6, 11.6), this.std(0x9d7a58, 0.8, 0.1));
    this.add(roof, [78, y + 5.8, 34]);

    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false });
    const poleMat = this.std(0x9aa0a6, 0.5, 0.5);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(a) * (PAD_RADIUS_M - 5);
      const pz = Math.sin(a) * (PAD_RADIUS_M - 5);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 46, 8), poleMat);
      this.add(pole, [px, 23, pz]);
      const head = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 1.6), lampMat);
      this.add(head, [px, 46.6, pz]);
      head.rotation.y = -a;
      this.addBeacon([px, 48.2, pz], 0.9);
    }
  }

  private addBeacon(pos: Vec3, radius: number): void {
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false }),
    );
    this.add(beacon, pos);
    this.beacons.push(beacon);
  }
}
