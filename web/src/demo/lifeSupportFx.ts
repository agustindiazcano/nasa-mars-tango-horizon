import * as THREE from "three";

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
