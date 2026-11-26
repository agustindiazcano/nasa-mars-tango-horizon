import * as THREE from "three";
import { makeSpriteLabel, type TerrainProc } from "../world/terrainProc";

/** Radial soft-edged sprite texture shared by flash and smoke. */
function softDisc(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Puff {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  age: number;
  life: number;
  size0: number;
  size1: number;
  opacity0: number;
}

/**
 * Muzzle flash, light pulse and a smoke plume for the life-support cannon. The cannon GLB is one fused mesh, so
 * the shot is shown with effects around the muzzle instead of a moving barrel.
 */
export class CannonFx {
  private group = new THREE.Group();
  private tex = softDisc();
  private puffs: Puff[] = [];
  private light = new THREE.PointLight(0xffb36b, 0, 60, 2);
  private flash: THREE.Sprite;
  private flashAge = 99;

  constructor(scene: THREE.Scene) {
    this.group.name = "cannon-fx";
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.tex, color: 0xffd9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.flash.visible = false;
    this.group.add(this.flash, this.light);
    scene.add(this.group);
  }

  /** Fires from `muzzle` along the unit vector `dir`. */
  fire(muzzle: THREE.Vector3, dir: THREE.Vector3): void {
    this.flashAge = 0;
    this.flash.position.copy(muzzle);
    this.flash.visible = true;
    this.light.position.copy(muzzle);
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.tex, color: i % 3 === 0 ? 0xc9a27a : 0x9c8f84, transparent: true, depthWrite: false, opacity: 0.7 });
      const s = new THREE.Sprite(mat);
      const spread = new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 1.6, (Math.random() - 0.5) * 2.4);
      s.position.copy(muzzle).addScaledVector(dir, Math.random() * 1.5);
      this.group.add(s);
      this.puffs.push({
        sprite: s,
        vel: dir.clone().multiplyScalar(4 + Math.random() * 7).add(spread),
        age: 0,
        life: 2.6 + Math.random() * 2.2,
        size0: 1.2,
        size1: 7 + Math.random() * 6,
        opacity0: 0.65,
      });
    }
  }

  update(dt: number): void {
    if (this.flash.visible) {
      this.flashAge += dt;
      const u = this.flashAge / 0.35;
      if (u >= 1) {
        this.flash.visible = false;
        this.light.intensity = 0;
      } else {
        const s = 14 * (1 - u * 0.4);
        this.flash.scale.set(s, s, 1);
        (this.flash.material as THREE.SpriteMaterial).opacity = 1 - u;
        this.light.intensity = 900 * (1 - u) * (1 - u);
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        this.group.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).dispose();
        this.puffs.splice(i, 1);
        continue;
      }
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(Math.exp(-1.1 * dt));
      p.vel.y += 0.35 * dt;
      const size = p.size0 + (p.size1 - p.size0) * Math.sqrt(u);
      p.sprite.scale.set(size, size, 1);
      (p.sprite.material as THREE.SpriteMaterial).opacity = p.opacity0 * (1 - u);
    }
  }

  reset(): void {
    for (const p of this.puffs) {
      this.group.remove(p.sprite);
      (p.sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.puffs = [];
    this.flash.visible = false;
    this.light.intensity = 0;
    this.flashAge = 99;
  }
}

interface PayloadItem {
  mesh: THREE.Object3D;
  label: THREE.Sprite;
  delayS: number;
  rise: THREE.Vector3;
}

/**
 * Opens the landed pod and lifts its four payload items out one after another: O2 COPV, LiOH scrubber, battery
 * and suit patch, with labels carrying the masses used by the ballistics model (4.0, 1.2, 1.0 and 0.35 kg).
 */
export class PodPayloadFx {
  private group = new THREE.Group();
  private items: PayloadItem[] = [];
  private lids: THREE.Mesh[] = [];
  private t = -1;

  constructor(scene: THREE.Scene, private terrain: TerrainProc) {
    this.group.name = "pod-payload";
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Builds the opened pod at the impact point and starts the animation. */
  deploy(x: number, z: number): void {
    this.reset();
    const y = this.terrain.heightAt(x, z);
    this.group.position.set(x, y, z);
    this.group.visible = true;

    const shellMat = new THREE.MeshStandardMaterial({ color: 0xe9eef2, metalness: 0.5, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.1, 20), shellMat);
    body.position.y = 0.55;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0xff623b, emissive: 0x441206 }));
    band.position.y = 0.9;
    this.group.add(body, band);
    // Two hinged lids that swing open.
    for (const side of [-1, 1]) {
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20, 1, false, 0, Math.PI), shellMat);
      lid.position.set(0, 1.12, 0);
      lid.userData.side = side;
      lid.rotation.y = side < 0 ? Math.PI : 0;
      this.group.add(lid);
      this.lids.push(lid);
    }

    const specs: { name: string; mass: string; color: number; geo: THREE.BufferGeometry; rise: THREE.Vector3 }[] = [
      { name: "O2 COPV", mass: "4.0 kg", color: 0x4aa8ff, geo: new THREE.CylinderGeometry(0.18, 0.18, 0.7, 16), rise: new THREE.Vector3(-3.2, 2.4, 0.6) },
      { name: "LiOH scrubber", mass: "1.2 kg", color: 0x8ee6a0, geo: new THREE.BoxGeometry(0.5, 0.35, 0.35), rise: new THREE.Vector3(3.2, 3.2, 0.5) },
      { name: "Battery", mass: "1.0 kg", color: 0xffd23f, geo: new THREE.BoxGeometry(0.4, 0.22, 0.3), rise: new THREE.Vector3(-1.2, 4.0, -1.4) },
      { name: "Suit patch", mass: "0.35 kg", color: 0xf3ece3, geo: new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), rise: new THREE.Vector3(1.4, 4.8, -1.2) },
    ];
    specs.forEach((s, n) => {
      const mesh = new THREE.Mesh(s.geo, new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.5 }));
      mesh.position.set(0, 1.0, 0);
      mesh.visible = false;
      const label = makeSpriteLabel(`${s.name} ${s.mass}`, "#35e0ff");
      label.scale.set(5.2, 0.95, 1);
      label.visible = false;
      this.group.add(mesh, label);
      this.items.push({ mesh, label, delayS: 1.2 + n * 0.9, rise: s.rise });
    });
    this.t = 0;
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const open = Math.min(1, Math.max(0, (this.t - 0.4) / 1.0));
    for (const lid of this.lids) {
      const side = lid.userData.side as number;
      lid.rotation.z = side * open * 1.35;
      lid.position.x = side * (0.42 + open * 0.05);
    }
    for (const it of this.items) {
      const u = Math.min(1, Math.max(0, (this.t - it.delayS) / 1.4));
      const e = 1 - (1 - u) * (1 - u);
      it.mesh.visible = u > 0;
      it.label.visible = u > 0.2;
      it.mesh.position.set(it.rise.x * e, 1.0 + (it.rise.y - 1.0) * e, it.rise.z * e);
      it.mesh.rotation.y += dt * 1.8;
      it.label.position.set(it.mesh.position.x, it.mesh.position.y + 0.9, it.mesh.position.z);
    }
  }

  reset(): void {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose());
      }
    }
    this.items = [];
    this.lids = [];
    this.t = -1;
    this.group.visible = false;
  }
}
