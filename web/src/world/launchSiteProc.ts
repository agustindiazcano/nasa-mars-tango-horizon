import { LAUNCH_SITE_COORD } from "@th/shared";
import * as THREE from "three";
import { models } from "./modelLibrary";
import { makeSpriteLabel, type TerrainProc } from "./terrainProc";

/** Super Heavy booster (70 m) + Starship upper stage (52 m); both 9 m in diameter. */
export const LAUNCH_VEHICLE = {
  radiusM: 4.5,
  boosterHeightM: 70,
  shipBarrelHeightM: 34,
  shipNoseHeightM: 17,
} as const;

const PAD_RADIUS_M = 64;
const MOUNT_HEIGHT_M = 20;
const MOUNT_DECK_M = 4;
const TOWER_HEIGHT_M = 165;
const TOWER_WIDTH_M = 7;
const TOWER_OFFSET_X_M = 34;
/** The vehicle, mount and tower are built 1.4x real size so the complex reads from over a kilometre away. */
const COMPLEX_SCALE = 1.4;

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

/** Large, far-visible Starship-class launch complex: pad, launch mount, tower with chopsticks, tanks, bunker. */
export class LaunchSiteProc {
  readonly group = new THREE.Group();
  readonly padY: number;
  readonly worldX = LAUNCH_SITE_COORD.x;
  readonly worldZ = LAUNCH_SITE_COORD.z;
  private beacons: THREE.Mesh[] = [];
  private target: THREE.Object3D = this.group;
  private procStack: THREE.Object3D | null = null;

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
    const complex = new THREE.Group();
    complex.name = "launch-complex";
    complex.scale.setScalar(COMPLEX_SCALE);
    this.group.add(complex);
    this.target = complex;
    this.buildMount();
    this.buildVehicle(MOUNT_HEIGHT_M + MOUNT_DECK_M);
    // The `rocket` GLB replaces the procedural stack once loaded; the stack stays as fallback.
    void models.attach("rocket", complex, this.procStack, (m) => {
      m.object.position.set(0, MOUNT_HEIGHT_M + MOUNT_DECK_M, 0);
      this.keepVisibleInHaze(m.object);
    });
    this.buildTower();
    this.target = this.group;
    this.buildTankFarm();
    this.buildBunkerAndLights();

    const label = makeSpriteLabel("ROCKET LAUNCH SITE", "#ffb36b");
    (label.material as THREE.SpriteMaterial).fog = false;
    label.position.set(0, TOWER_HEIGHT_M * COMPLEX_SCALE + 34, 0);
    label.scale.set(120, 22.5, 1);
    this.group.add(label);

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

  /** Orbital launch mount: elevated ring deck on six legs over the flame trench. */
  private buildMount(): void {
    const legMat = this.std(0x7b828a, 0.55, 0.4);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3.2, MOUNT_HEIGHT_M, 3.2), legMat);
      this.add(leg, [Math.cos(a) * 17, MOUNT_HEIGHT_M / 2, Math.sin(a) * 17]);
    }
    const shape = new THREE.Shape().absarc(0, 0, 23, 0, Math.PI * 2, false);
    shape.holes.push(new THREE.Path().absarc(0, 0, 8.5, 0, Math.PI * 2, true));
    const deckGeo = new THREE.ExtrudeGeometry(shape, { depth: MOUNT_DECK_M, bevelEnabled: false, curveSegments: 48 });
    deckGeo.rotateX(-Math.PI / 2);
    const deck = new THREE.Mesh(deckGeo, this.std(0x9aa1a8, 0.5, 0.45));
    this.add(deck, [0, MOUNT_HEIGHT_M, 0]);

    // Hold-down clamp ring
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.7, 8, 32), this.std(0x32363b, 0.6, 0.6));
    clamp.rotation.x = Math.PI / 2;
    this.add(clamp, [0, MOUNT_HEIGHT_M + MOUNT_DECK_M + 0.8, 0]);
  }

  /** Super Heavy + Starship stack standing on the mount. */
  private buildVehicle(baseY: number): void {
    const { radiusM: R, boosterHeightM, shipBarrelHeightM, shipNoseHeightM } = LAUNCH_VEHICLE;
    const steel = this.std(0xe9edf0, 0.34, 0.28);
    const dark = this.std(0x111315, 0.7, 0.15);
    const weld = this.std(0x8d949b, 0.5, 0.3);
    const stack = new THREE.Group();
    stack.position.y = baseY;
    this.target.add(stack);
    this.procStack = stack;

    // Booster, engine skirt, interstage band
    const booster = new THREE.Mesh(new THREE.CylinderGeometry(R, R, boosterHeightM, 40), steel);
    this.add(booster, [0, boosterHeightM / 2, 0], stack);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.4, 3.2, 40), this.std(0x2a2d31, 0.6, 0.4));
    this.add(skirt, [0, 1.6, 0], stack);
    const interstage = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R + 0.06, 6, 40), this.std(0xc3c8cd, 0.4, 0.3));
    this.add(interstage, [0, boosterHeightM - 3, 0], stack);

    // Raptor cluster: 3 inner + 10 middle + 20 outer
    const engineGeo = new THREE.CylinderGeometry(0.28, 0.62, 2.4, 12);
    const engines = new THREE.InstancedMesh(engineGeo, this.std(0x15171a, 0.5, 0.6), 33);
    const m = new THREE.Matrix4();
    let e = 0;
    const place = (x: number, z: number): void => {
      m.makeTranslation(x, -1.0, z);
      engines.setMatrixAt(e++, m);
    };
    for (let k = 0; k < 3; k++) place(Math.cos((k / 3) * Math.PI * 2) * 0.95, Math.sin((k / 3) * Math.PI * 2) * 0.95);
    for (let k = 0; k < 10; k++) place(Math.cos((k / 10) * Math.PI * 2) * 2.1, Math.sin((k / 10) * Math.PI * 2) * 2.1);
    for (let k = 0; k < 20; k++) place(Math.cos((k / 20) * Math.PI * 2) * 3.35, Math.sin((k / 20) * Math.PI * 2) * 3.35);
    engines.instanceMatrix.needsUpdate = true;
    stack.add(engines);

    // Grid fins on the upper booster
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 2.4), dark);
      fin.position.set(Math.cos(a) * (R + 1.6), boosterHeightM - 8, Math.sin(a) * (R + 1.6));
      fin.rotation.y = -a;
      stack.add(fin);
    }

    // Ship: barrel + ogive nose
    const shipBase = boosterHeightM;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, shipBarrelHeightM, 40), steel);
    this.add(barrel, [0, shipBase + shipBarrelHeightM / 2, 0], stack);

    const rho = (R * R + shipNoseHeightM * shipNoseHeightM) / (2 * R);
    const profile: THREE.Vector2[] = [];
    for (let k = 0; k <= 24; k++) {
      const y = (k / 24) * shipNoseHeightM;
      const r = Math.sqrt(Math.max(0, rho * rho - (shipNoseHeightM - y) ** 2)) + R - rho;
      profile.push(new THREE.Vector2(Math.max(r, 0.02), y));
    }
    const nose = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), steel);
    this.add(nose, [0, shipBase + shipBarrelHeightM, 0], stack);

    // Heat-shield tile side faces Mars Base Alpha (west-south-west of the pad): theta center -1.08 rad
    const tileStart = -1.08 - Math.PI / 2;
    const tileBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.07, R + 0.07, shipBarrelHeightM, 40, 1, true, tileStart, Math.PI),
      dark,
    );
    this.add(tileBarrel, [0, shipBase + shipBarrelHeightM / 2, 0], stack);
    const noseProfile = profile.map((p) => new THREE.Vector2(p.x + 0.07, p.y));
    const tileNose = new THREE.Mesh(new THREE.LatheGeometry(noseProfile, 40, tileStart, Math.PI), dark);
    this.add(tileNose, [0, shipBase + shipBarrelHeightM, 0], stack);

    // Flaps: forward pair near the nose, aft pair at the ship base
    const flapDark = this.std(0x1b1d20, 0.6, 0.2);
    for (const side of [-1, 1]) {
      const fwd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.5, 2.4), flapDark);
      fwd.position.set(0, shipBase + shipBarrelHeightM + 3, side * (R + 0.9));
      stack.add(fwd);
      const aft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9.5, 3.8), flapDark);
      aft.position.set(0, shipBase + 5.6, side * (R + 1.3));
      stack.add(aft);
    }

    // Weld seams every ~1.9 m for scale and realism
    const seamCount = Math.floor((boosterHeightM + shipBarrelHeightM) / 1.9);
    const seams = new THREE.InstancedMesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.1, 40, 1, true), weld, seamCount);
    for (let k = 0; k < seamCount; k++) {
      m.makeTranslation(0, 4 + k * 1.9, 0);
      seams.setMatrixAt(k, m);
    }
    seams.instanceMatrix.needsUpdate = true;
    stack.add(seams);
  }

  /** Lattice launch tower with two catch arms ("chopsticks") reaching the booster. */
  private buildTower(): void {
    const tower = new THREE.Group();
    tower.position.x = TOWER_OFFSET_X_M;
    this.target.add(tower);

    const half = TOWER_WIDTH_M / 2;
    const segH = 8;
    const segs = Math.floor(TOWER_HEIGHT_M / segH);
    const corners: [number, number][] = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ];
    const beams: { a: THREE.Vector3; b: THREE.Vector3; w: number }[] = [];
    for (const [x, z] of corners) beams.push({ a: new THREE.Vector3(x, 0, z), b: new THREE.Vector3(x, segs * segH, z), w: 1.1 });
    for (let s = 0; s <= segs; s++) {
      for (let c = 0; c < 4; c++) {
        const [x0, z0] = corners[c];
        const [x1, z1] = corners[(c + 1) % 4];
        beams.push({ a: new THREE.Vector3(x0, s * segH, z0), b: new THREE.Vector3(x1, s * segH, z1), w: 0.4 });
        if (s < segs) {
          const flip = (s + c) % 2 === 0;
          beams.push({
            a: new THREE.Vector3(flip ? x0 : x1, s * segH, flip ? z0 : z1),
            b: new THREE.Vector3(flip ? x1 : x0, (s + 1) * segH, flip ? z1 : z0),
            w: 0.34,
          });
        }
      }
    }
    const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.std(0xb5b9bd, 0.5, 0.45), beams.length);
    const up = new THREE.Vector3(0, 1, 0);
    const dummy = new THREE.Object3D();
    beams.forEach((bm, i) => {
      const dir = bm.b.clone().sub(bm.a);
      const len = dir.length();
      dummy.position.copy(bm.a).addScaledVector(dir, 0.5);
      dummy.quaternion.setFromUnitVectors(up, dir.normalize());
      dummy.scale.set(bm.w, len, bm.w);
      dummy.updateMatrix();
      lattice.setMatrixAt(i, dummy.matrix);
    });
    lattice.instanceMatrix.needsUpdate = true;
    tower.add(lattice);

    // Chopstick carriage and arms reaching toward the booster axis
    const carriageY = MOUNT_HEIGHT_M + MOUNT_DECK_M + 62;
    const armMat = this.std(0x8c9298, 0.5, 0.45);
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(TOWER_WIDTH_M + 3, 6, TOWER_WIDTH_M + 3), armMat);
    this.add(carriage, [0, carriageY, 0], tower);
    const reach = TOWER_OFFSET_X_M - LAUNCH_VEHICLE.radiusM - 1.4;
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(reach, 3.2, 2.2), armMat);
      this.add(arm, [-(half + 1.5 + reach / 2), carriageY, side * (LAUNCH_VEHICLE.radiusM + 1.6)], tower);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 4.4), this.std(0x2b2e32, 0.7, 0.3));
      this.add(pad, [-(half + 1.5 + reach) + 0.4, carriageY, side * (LAUNCH_VEHICLE.radiusM - 0.2)], tower);
    }

    // Lightning mast and top beacon
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.4, 22, 8), this.std(0xd4d8dc, 0.4, 0.5));
    this.add(mast, [0, TOWER_HEIGHT_M + 11, 0], tower);
    this.addBeacon([TOWER_OFFSET_X_M, TOWER_HEIGHT_M + 22.5, 0], 2.0);
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
