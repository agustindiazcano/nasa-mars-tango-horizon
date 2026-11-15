import * as THREE from "three";
import { BASE_ORIGIN, type CrewSnapshot, type CrewStatus } from "@th/shared";
import { makeSpriteLabel, type TerrainProc } from "./terrainProc";

/** Crew ids: `crew-1` is the player astronaut (`AstronautProc`); the others are scripted entities of this module. */
export type CrewId = "crew-1" | "crew-2" | "crew-3" | "crew-4";
export type CrewPose = "idle" | "walk" | "lying" | "hidden";

interface CrewMember {
  id: CrewId;
  group: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  status: CrewStatus;
  pose: CrewPose;
  inPit: boolean;
  phase: number;
  /** World y offset applied on top of the terrain height (pit floor, stretcher height). */
  yOffset: number;
  x: number;
  z: number;
}

const ACCENT: Record<Exclude<CrewId, "crew-1">, number> = {
  "crew-2": 0x2e86ff,
  "crew-3": 0xe8412b,
  "crew-4": 0x34c759,
};

/** `crew-4` idles beside the habitat (`hab-1`), outside its footprint. */
export const CREW4_POS = { x: BASE_ORIGIN.x + 8, z: BASE_ORIGIN.z + 7 } as const;

/**
 * Procedural crew entities `crew-2`, `crew-3` (traverse) and `crew-4` (base). Each wears the same suit as the player
 * astronaut with a distinct accent color and a name label. GLB models replace the body later (plan 22, section 2).
 */
export class CrewProc {
  readonly group = new THREE.Group();
  private readonly members = new Map<CrewId, CrewMember>();

  constructor(
    scene: THREE.Scene,
    private terrain: TerrainProc,
  ) {
    this.group.name = "crew";
    for (const id of ["crew-2", "crew-3", "crew-4"] as const) {
      const m = this.build(id);
      this.members.set(id, m);
      this.group.add(m.group);
    }
    // crew-2/3 only exist during the traverse; crew-4 stands by the habitat.
    this.place("crew-2", 0, 0, 0, "idle", "active", { visible: false });
    this.place("crew-3", 0, 0, 0, "idle", "active", { visible: false });
    this.place("crew-4", CREW4_POS.x, CREW4_POS.z, Math.PI * 0.75, "idle", "idle");
    scene.add(this.group);
  }

  private build(id: Exclude<CrewId, "crew-1">): CrewMember {
    const g = new THREE.Group();
    g.name = `crew:${id}`;
    const white = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.55, metalness: 0.08 });
    const trim = new THREE.MeshStandardMaterial({ color: ACCENT[id], roughness: 0.5, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x38424d, roughness: 0.7, metalness: 0.25 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf0b24a, roughness: 0.12, metalness: 0.92, emissive: 0x2a1804 });

    const body = new THREE.Group();
    g.add(body);
    const torso = new THREE.Group();
    torso.position.y = 0.96;
    body.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.3), white);
    chest.castShadow = true;
    torso.add(chest);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.32), trim);
    band.position.y = 0.18;
    torso.add(band);
    const plss = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.22), white);
    plss.position.set(0, 0.04, 0.25);
    plss.castShadow = true;
    torso.add(plss);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), white);
    head.position.y = 0.44;
    head.castShadow = true;
    torso.add(head);
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 16, 12, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.5),
      gold,
    );
    visor.position.set(0, 0.45, -0.055);
    torso.add(visor);

    const limb = (r: number, len: number, x: number, y: number, parent: THREE.Object3D) => {
      const l = new THREE.Group();
      l.position.set(x, y, 0);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 10), white);
      seg.position.y = -len / 2;
      seg.castShadow = true;
      l.add(seg);
      parent.add(l);
      return l;
    };
    const leftArm = limb(0.075, 0.55, -0.31, 0.22, torso);
    const rightArm = limb(0.075, 0.55, 0.31, 0.22, torso);
    const leftLeg = limb(0.095, 0.76, -0.14, 0.78, body);
    const rightLeg = limb(0.095, 0.76, 0.14, 0.78, body);
    for (const leg of [leftLeg, rightLeg]) {
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.25), dark);
      boot.position.set(0, -0.74, -0.04);
      leg.add(boot);
    }

    const label = makeSpriteLabel(id.toUpperCase(), `#${ACCENT[id].toString(16).padStart(6, "0")}`);
    label.position.y = 2.2;
    label.scale.set(3.4, 0.64, 1);
    g.add(label);

    return {
      id,
      group: g,
      body,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      status: "idle",
      pose: "idle",
      inPit: false,
      phase: 0,
      yOffset: 0,
      x: 0,
      z: 0,
    };
  }

  /** Places a crew member. `yOffset` is added on top of the terrain height (negative inside the pit). */
  place(
    id: Exclude<CrewId, "crew-1">,
    x: number,
    z: number,
    yaw: number,
    pose: CrewPose,
    status: CrewStatus,
    opts: { yOffset?: number; inPit?: boolean; visible?: boolean } = {},
  ): void {
    const m = this.members.get(id);
    if (!m) return;
    m.x = x;
    m.z = z;
    m.pose = pose;
    m.status = status;
    m.inPit = opts.inPit ?? false;
    m.yOffset = opts.yOffset ?? 0;
    m.group.visible = opts.visible !== false && pose !== "hidden";
    m.group.position.set(x, this.terrain.heightAt(x, z) + m.yOffset, z);
    m.group.rotation.y = yaw;
    this.applyPose(m, 0);
  }

  private applyPose(m: CrewMember, dt: number): void {
    if (m.pose === "lying") {
      m.body.rotation.x = -Math.PI / 2;
      m.body.position.set(0, 0.22, 0.45);
      for (const l of [m.leftLeg, m.rightLeg, m.leftArm, m.rightArm]) l.rotation.x = 0;
      return;
    }
    m.body.rotation.x = 0;
    m.body.position.set(0, 0, 0);
    if (m.pose === "walk") {
      m.phase += dt * 5;
      const s = Math.sin(m.phase) * 0.55;
      m.leftLeg.rotation.x = s;
      m.rightLeg.rotation.x = -s;
      m.leftArm.rotation.x = -s * 0.7;
      m.rightArm.rotation.x = s * 0.7;
    } else {
      for (const l of [m.leftLeg, m.rightLeg, m.leftArm, m.rightArm]) l.rotation.x = 0;
    }
  }

  update(dt: number): void {
    for (const m of this.members.values()) {
      if (m.pose === "walk") this.applyPose(m, dt);
    }
  }

  setVisible(id: Exclude<CrewId, "crew-1">, visible: boolean): void {
    const m = this.members.get(id);
    if (m) m.group.visible = visible;
  }

  position(id: Exclude<CrewId, "crew-1">): THREE.Vector3 | null {
    const m = this.members.get(id);
    if (!m) return null;
    return new THREE.Vector3(m.x, this.terrain.heightAt(m.x, m.z) + m.yOffset, m.z);
  }

  /** Snapshots of the visible scripted crew members for `MissionContext.crew`. */
  snapshots(): CrewSnapshot[] {
    const out: CrewSnapshot[] = [];
    for (const m of this.members.values()) {
      if (!m.group.visible && m.status !== "boarded") continue;
      out.push({
        id: m.id,
        x: Number(m.x.toFixed(1)),
        z: Number(m.z.toFixed(1)),
        status: m.status,
        ...(m.inPit ? { in_pit: true } : {}),
      });
    }
    return out;
  }
}
