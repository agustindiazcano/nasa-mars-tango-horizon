import * as THREE from "three";
import { CREW4_START, CREW_ROSTER, type CrewId } from "@th/shared";
import { models } from "./modelLibrary";
import { attachShoulderPatches } from "./shoulderPatches";
import { makeSpriteLabel, type TerrainProc } from "./terrainProc";

/** Local front axis of every crew group and of the `astronaut-animated` model. */
export const CREW_FRONT_LOCAL = new THREE.Vector3(0, 0, 1);

/** World forward vector (x, z) of a crew group with the given `rotation.y`. */
export function crewForward(groupYaw: number): { x: number; z: number } {
  const v = CREW_FRONT_LOCAL.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), groupYaw);
  return { x: v.x, z: v.z };
}

/**
 * `AstronautProc.yaw` is a camera yaw (forward = (-sin yaw, -cos yaw)); the crew group convention is forward = (sin, cos),
 * so the player model needs a half turn.
 */
export function playerGroupYaw(cameraYaw: number): number {
  return cameraYaw + Math.PI;
}

export type CrewClipName = "Idle_11" | "Walking" | "Running" | "Fall_Dead_from_Abdominal_Injury" | "Dead";

/** Ground speed (m/s) above which the player astronaut plays the run clip (walk 2.4, sprint 4.4 in `AstronautProc`). */
export const RUN_SPEED_MS = 3.2;
const WALK_SPEED_MS = 0.15;

/** Pure clip selection. A fall into the pit plays once, then the incapacitated crew member keeps the lying clip. */
export function clipForState(pose: CrewPose | "run", previous: CrewClipName | null): CrewClipName {
  if (pose === "lying") {
    return previous === "Fall_Dead_from_Abdominal_Injury" || previous === "Dead" ? previous : "Fall_Dead_from_Abdominal_Injury";
  }
  if (pose === "run") return "Running";
  if (pose === "walk") return "Walking";
  return "Idle_11";
}

/** Locomotion clip for a measured ground speed. */
export function poseForSpeed(speedMs: number): CrewPose | "run" {
  return speedMs > RUN_SPEED_MS ? "run" : speedMs > WALK_SPEED_MS ? "walk" : "idle";
}

/** Small `AnimationMixer` state machine over the clips of `astronaut-animated`. */
export class CrewAnimator {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  current: CrewClipName | null = null;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) this.actions.set(c.name, this.mixer.clipAction(c));
    this.mixer.addEventListener("finished", (e) => {
      if ((e as unknown as { action: THREE.AnimationAction }).action === this.actions.get("Fall_Dead_from_Abdominal_Injury")) {
        this.play("Dead", { instant: false });
      }
    });
  }

  /** `instant` skips the fall and shows the last frame of the lying clip (used when a scene is seeked). */
  request(pose: CrewPose | "run", opts: { instant?: boolean } = {}): void {
    let clip = clipForState(pose, this.current);
    if (clip === "Fall_Dead_from_Abdominal_Injury" && opts.instant) clip = "Dead";
    if (clip !== this.current) this.play(clip, { instant: opts.instant });
  }

  private play(clip: CrewClipName, opts: { instant?: boolean }): void {
    const next = this.actions.get(clip);
    if (!next) return;
    const prev = this.current ? this.actions.get(this.current) : undefined;
    next.reset();
    const once = clip === "Fall_Dead_from_Abdominal_Injury" || clip === "Dead";
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    if (clip === "Dead") next.time = Math.max(0, next.getClip().duration - 1e-3);
    next.play();
    if (prev && prev !== next) {
      if (opts.instant) prev.stop();
      else next.crossFadeFrom(prev, 0.25, false);
    }
    this.current = clip;
    if (clip === "Dead") {
      next.paused = true;
      this.mixer.update(0);
    }
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}

/** `crew-1` (SOTELO) is the player astronaut (`AstronautProc`); the others are scripted entities of this module. */
export type CrewPose = "idle" | "walk" | "lying" | "hidden";

interface CrewMember {
  id: CrewId;
  group: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  pose: CrewPose;
  phase: number;
  /** World y offset applied on top of the terrain height (pit floor, stretcher height). */
  yOffset: number;
  x: number;
  z: number;
  anim?: CrewAnimator;
  /** True once the animated GLB replaced the procedural body. */
  modelReady?: boolean;
}

const ACCENT: Record<Exclude<CrewId, "crew-1">, number> = {
  "crew-2": 0x2e86ff,
  "crew-3": 0xe8412b,
  "crew-4": 0x34c759,
};

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
    this.place("crew-2", 0, 0, 0, "idle", { visible: false });
    this.place("crew-3", 0, 0, 0, "idle", { visible: false });
    this.place("crew-4", CREW4_START.x, CREW4_START.z, Math.PI * 0.75, "idle");
    this.player = this.build("crew-2");
    this.player.id = "crew-1" as CrewId;
    this.player.group.name = "crew:crew-1";
    for (const c of [...this.player.group.children]) if ((c as THREE.Sprite).isSprite) this.player.group.remove(c);
    const playerLabel = makeSpriteLabel(CREW_ROSTER.find((c) => c.id === "crew-1")?.name ?? "crew-1", "#ff9f40");
    playerLabel.position.y = 2.2;
    playerLabel.scale.set(3.4, 0.64, 1);
    this.player.group.add(playerLabel);
    this.player.group.visible = false;
    this.group.add(this.player.group);
    for (const m of [...this.members.values(), this.player]) void this.attachModel(m);
    scene.add(this.group);
  }

  /** Player astronaut (`crew-1`, SOTELO): only exists as a model for the third-person views; hidden until the GLB loads. */
  private readonly player: CrewMember;

  get playerModelReady(): boolean {
    return this.player.modelReady === true;
  }

  /** Follows the first-person controller. Visible only outside first person and once the model has loaded. */
  syncPlayer(x: number, z: number, yaw: number, speedMs: number, show: boolean): void {
    const m = this.player;
    m.x = x;
    m.z = z;
    m.group.position.set(x, this.terrain.heightAt(x, z), z);
    m.group.rotation.y = playerGroupYaw(yaw);
    m.group.visible = show && m.modelReady === true;
    m.anim?.request(poseForSpeed(speedMs));
  }

  private async attachModel(m: CrewMember): Promise<void> {
    const spawned = await models.spawn("astronaut-animated");
    if (!spawned) return;
    // The GLB front is +Z, the same as the crew group convention (see `CREW_FRONT_LOCAL`): no extra rotation.
    const root = new THREE.Group();
    root.name = `glb:${m.id}`;
    root.add(spawned.object);
    m.group.add(root);
    m.body.visible = false;
    m.anim = new CrewAnimator(spawned.object, spawned.clips);
    m.anim.request(m.pose === "walk" ? "walk" : m.pose === "lying" ? "lying" : "idle", { instant: true });
    m.modelReady = true;
    // SHOULDER-PATCH HOOK (single place): every crew model gets the flag and CONAE patches here.
    attachShoulderPatches(spawned.object);
  }

  private build(id: Exclude<CrewId, "crew-1">): CrewMember {
    const g = new THREE.Group();
    g.name = `crew:${id}`;
    const white = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.55, metalness: 0.08 });
    const trim = new THREE.MeshStandardMaterial({ color: ACCENT[id], roughness: 0.5, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x38424d, roughness: 0.7, metalness: 0.25 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf0b24a, roughness: 0.12, metalness: 0.92, emissive: 0x2a1804 });

    // Convention: a crew group with `rotation.y = atan2(dx, dz)` faces the direction (dx, dz), i.e. its front is local +Z.
    // The procedural suit is modelled facing -Z (visor and chest pack), so it hangs under a half-turn holder.
    const facing = new THREE.Group();
    facing.name = "facing";
    facing.rotation.y = Math.PI;
    g.add(facing);
    const body = new THREE.Group();
    facing.add(body);
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
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.44;
    torso.add(headGroup);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), white);
    helmet.castShadow = true;
    headGroup.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 16, 12, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.5),
      gold,
    );
    visor.position.set(0, 0.01, -0.055);
    headGroup.add(visor);

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

    const label = makeSpriteLabel(CREW_ROSTER.find((c) => c.id === id)?.name ?? id, `#${ACCENT[id].toString(16).padStart(6, "0")}`);
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
      head: headGroup,
      pose: "idle",
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
    opts: { yOffset?: number; visible?: boolean } = {},
  ): void {
    const m = this.members.get(id);
    if (!m) return;
    const wasVisible = m.group.visible;
    m.x = x;
    m.z = z;
    m.pose = pose;
    m.yOffset = opts.yOffset ?? 0;
    m.group.visible = opts.visible !== false && pose !== "hidden";
    m.group.position.set(x, this.terrain.heightAt(x, z) + m.yOffset, z);
    m.group.rotation.y = yaw;
    if (m.anim) m.anim.request(pose === "hidden" ? "idle" : pose, { instant: !wasVisible });
    this.applyPose(m, 0);
  }

  private applyPose(m: CrewMember, dt: number): void {
    if (m.pose === "lying") {
      // Face up, head toward local +z, backpack resting on the ground; the body is centered on the group origin.
      m.body.rotation.set(Math.PI / 2, 0.06, 0);
      m.body.position.set(0, 0.38, -0.8);
      // Relaxed, slightly asymmetric limbs and a head rolled to one side so it reads as unconscious.
      m.leftArm.rotation.set(-0.1, 0, 0.42);
      m.rightArm.rotation.set(0.28, 0, -0.14);
      m.leftLeg.rotation.set(0.05, 0, -0.1);
      m.rightLeg.rotation.set(-0.1, 0, 0.24);
      m.head.rotation.set(0, 0, 0.4);
      return;
    }
    m.body.rotation.set(0, 0, 0);
    m.body.position.set(0, 0, 0);
    m.head.rotation.set(0, 0, 0);
    for (const l of [m.leftLeg, m.rightLeg, m.leftArm, m.rightArm]) l.rotation.set(0, 0, 0);
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
    for (const m of [...this.members.values(), this.player]) {
      if (m.anim) m.anim.update(dt);
      else if (m.pose === "walk") this.applyPose(m, dt);
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
}
