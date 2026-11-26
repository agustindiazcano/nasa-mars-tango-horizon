import { clampAboveTerrain, type Vec3 } from "./cinematicCams";

/**
 * Scene director for recorded takes. A scene seeks the deterministic rescue scenario to a start time,
 * plays it for a fixed duration and drives the camera through a list of shot segments.
 * All shot parameters live in the SCENES table so they can be tuned without code changes.
 */

/** Minimal contract of the rescue scenario the director needs (implemented by `RescueScenario`). */
export interface SceneScenario {
  readonly durationS: number;
  readonly elapsedS: number;
  readonly running: boolean;
  seekTo(tS: number): void;
  resume(): void;
  pause(): void;
  getEntityPosition(id: string): Vec3 | null;
}

export type ShotKind = "aerial" | "orbit" | "follow";

export interface ShotSegment {
  /** Segment start, seconds from the scene start. The segment runs until the next one starts. */
  fromS: number;
  kind: ShotKind;
  /** Entity id, or several ids whose midpoint is used. */
  target: string | string[];
  /** aerial/follow: world-frame offset from the target (m). */
  offset?: Vec3;
  /** orbit: horizontal radius (m), camera height above the target (m) and angular speed (rad/s). */
  radius?: number;
  height?: number;
  speed?: number;
  /** Height above the target at which the camera looks (m). */
  lookAboveM?: number;
}

export interface SceneDef {
  id: string;
  /** i18n key of the scene name. */
  nameKey: string;
  startS: number;
  durationS: number;
  segments: ShotSegment[];
}

export const SCENES: readonly SceneDef[] = [
  {
    id: "S0",
    nameKey: "scene.s0",
    startS: 0,
    durationS: 18,
    segments: [
      // Slow orbit around the stack on the pad (about 170 m tall), then a low wide shot with the tower.
      { fromS: 0, kind: "orbit", target: "launch-site", radius: 260, height: 60, speed: 0.1, lookAboveM: 90 },
      { fromS: 10, kind: "aerial", target: "launch-site", offset: { x: 150, y: 25, z: -190 }, lookAboveM: 110 },
    ],
  },
  {
    id: "S1",
    nameKey: "scene.s1",
    startS: 0,
    durationS: 20,
    segments: [
      { fromS: 0, kind: "orbit", target: "base", radius: 95, height: 60, speed: 0.07, lookAboveM: 2 },
      // From the base apron toward the Starship on its pad, 1.1 km east-north-east.
      { fromS: 12, kind: "aerial", target: "launch-site", offset: { x: -960, y: 48, z: 500 }, lookAboveM: 95 },
    ],
  },
  {
    id: "S2",
    nameKey: "scene.s2",
    startS: 20,
    durationS: 30,
    segments: [
      { fromS: 0, kind: "orbit", target: ["base", "rescue-site"], radius: 900, height: 700, speed: 0.04 },
      { fromS: 15, kind: "aerial", target: "rescue-site", offset: { x: 45, y: 40, z: 55 }, lookAboveM: 1 },
    ],
  },
  {
    id: "S3",
    nameKey: "scene.s3",
    startS: 45,
    durationS: 25,
    segments: [
      { fromS: 0, kind: "orbit", target: "crew-2", radius: 9, height: 2.4, speed: 0.3, lookAboveM: 1.2 },
      { fromS: 8, kind: "follow", target: "rover-1", offset: { x: 11, y: 4.5, z: 12 }, lookAboveM: 1.5 },
      { fromS: 16, kind: "aerial", target: "pit", offset: { x: 7, y: 6, z: 7 }, lookAboveM: -1 },
    ],
  },
  {
    id: "S4",
    nameKey: "scene.s4",
    startS: 60,
    durationS: 30,
    segments: [
      { fromS: 0, kind: "follow", target: "drone-1", offset: { x: 10, y: 5, z: 12 }, lookAboveM: 0 },
      { fromS: 12, kind: "follow", target: "rescue-1", offset: { x: -14, y: 6, z: 10 }, lookAboveM: 1.5 },
    ],
  },
  {
    id: "S5",
    nameKey: "scene.s5",
    startS: 124,
    durationS: 22,
    segments: [
      { fromS: 0, kind: "follow", target: "rescue-1", offset: { x: 12, y: 2.5, z: 8 }, lookAboveM: 1.5 },
      // The robot reverses out of the bay (132-137) and starts down the pit ramp.
      { fromS: 7, kind: "follow", target: "rescue-bot-1", offset: { x: 9, y: 3, z: 9 }, lookAboveM: 0.6 },
      { fromS: 14, kind: "aerial", target: "pit", offset: { x: 10, y: 9, z: 10 }, lookAboveM: -2 },
    ],
  },
  {
    id: "S6",
    nameKey: "scene.s6",
    startS: 142,
    durationS: 30,
    segments: [
      // At the ramp bottom: arm reaches, hooks the harness (142-152).
      { fromS: 0, kind: "orbit", target: "crew-3", radius: 6.5, height: 2.6, speed: 0.3, lookAboveM: 0.4 },
      // Drag up the ramp (152-168): side-on to the travel direction, storm behind.
      { fromS: 10, kind: "follow", target: "rescue-bot-1", offset: { x: 7, y: 3.5, z: -7 }, lookAboveM: 0.5 },
      { fromS: 22, kind: "aerial", target: "rescue-1", offset: { x: 12, y: 5, z: -12 }, lookAboveM: 1 },
    ],
  },
  {
    id: "S7",
    nameKey: "scene.s7",
    startS: 166,
    durationS: 14,
    segments: [{ fromS: 0, kind: "aerial", target: "rescue-1", offset: { x: 25, y: 6, z: 30 }, lookAboveM: 2 }],
  },
];

export interface ShotPose {
  pos: Vec3;
  target: Vec3;
  /** Index of the active segment; a change means a hard cut. */
  segment: number;
}

export interface PoseContext {
  getPos(id: string): Vec3 | null;
  heightAt(x: number, z: number): number;
}

/** Index of the segment active at `tRel` seconds after the scene start. */
export function segmentIndexAt(scene: SceneDef, tRel: number): number {
  let idx = 0;
  for (let i = 0; i < scene.segments.length; i++) {
    if (tRel >= scene.segments[i].fromS) idx = i;
  }
  return idx;
}

function resolveTarget(target: string | string[], ctx: PoseContext): Vec3 {
  const ids = Array.isArray(target) ? target : [target];
  const pts = ids.map((id) => ctx.getPos(id)).filter((p): p is Vec3 => p !== null);
  if (pts.length === 0) return ctx.getPos("base") ?? { x: 0, y: 0, z: 0 };
  const n = pts.length;
  return {
    x: pts.reduce((a, p) => a + p.x, 0) / n,
    y: pts.reduce((a, p) => a + p.y, 0) / n,
    z: pts.reduce((a, p) => a + p.z, 0) / n,
  };
}

/** Desired (unsmoothed) camera pose for a scene at `tRel` seconds after its start. */
export function scenePose(scene: SceneDef, tRel: number, ctx: PoseContext): ShotPose {
  const segment = segmentIndexAt(scene, tRel);
  const seg = scene.segments[segment];
  const tgt = resolveTarget(seg.target, ctx);
  const lookY = tgt.y + (seg.lookAboveM ?? 0);
  const target: Vec3 = { x: tgt.x, y: lookY, z: tgt.z };
  let pos: Vec3;
  if (seg.kind === "orbit") {
    const ang = (seg.speed ?? 0.2) * (tRel - seg.fromS);
    const r = seg.radius ?? 20;
    pos = { x: tgt.x + Math.cos(ang) * r, y: tgt.y + (seg.height ?? 10), z: tgt.z + Math.sin(ang) * r };
  } else {
    const o = seg.offset ?? { x: 10, y: 6, z: 10 };
    pos = { x: tgt.x + o.x, y: tgt.y + o.y, z: tgt.z + o.z };
  }
  pos.y = clampAboveTerrain(pos.y, ctx.heightAt(pos.x, pos.z));
  return { pos, target, segment };
}

export type SceneState = "idle" | "playing" | "paused" | "done";

export interface SceneDirectorHooks {
  /** Called when a take starts or restarts (e.g. leave first person, reset smoothing). */
  onStart?(scene: SceneDef): void;
  onFinish?(scene: SceneDef): void;
}

const SMOOTH_RATE = 3.5;

/** Drives a scene: seeks the scenario, plays it for the scene duration and computes the camera pose. */
export class SceneDirector {
  state: SceneState = "idle";
  activeId: string | null = null;
  private smoothedPos: Vec3 | null = null;
  private smoothedTarget: Vec3 | null = null;
  private lastSegment = -1;
  private queue: string[] = [];
  /** True from the start of a sequence until its last scene finishes. */
  inSequence = false;

  constructor(
    private scenario: SceneScenario,
    private hooks: SceneDirectorHooks = {},
    readonly scenes: readonly SceneDef[] = SCENES,
  ) {}

  get active(): SceneDef | null {
    return this.scenes.find((s) => s.id === this.activeId) ?? null;
  }

  /** Seconds elapsed inside the active scene (0 when idle). */
  get sceneTimeS(): number {
    const s = this.active;
    return s ? Math.min(Math.max(this.scenario.elapsedS - s.startS, 0), s.durationS) : 0;
  }

  play(id: string): boolean {
    const s = this.scenes.find((x) => x.id === id);
    if (!s) return false;
    this.activeId = id;
    this.scenario.seekTo(s.startS);
    this.scenario.resume();
    this.state = "playing";
    this.smoothedPos = null;
    this.smoothedTarget = null;
    this.lastSegment = -1;
    this.hooks.onStart?.(s);
    return true;
  }

  /** Plays the given scenes (default: all) one after another, hard cut between them. */
  playSequence(ids: readonly string[] = this.scenes.map((x) => x.id)): boolean {
    const list = ids.filter((id) => this.scenes.some((x) => x.id === id));
    if (list.length === 0) return false;
    this.queue = list.slice(1);
    this.inSequence = true;
    return this.play(list[0]);
  }

  restart(): boolean {
    return this.activeId ? this.play(this.activeId) : false;
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.scenario.pause();
    this.state = "paused";
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.scenario.resume();
    this.state = "playing";
  }

  /** Stops the take and releases the camera. */
  stop(): void {
    if (this.state === "idle") return;
    this.scenario.pause();
    this.state = "idle";
    this.activeId = null;
    this.queue = [];
    this.inSequence = false;
  }

  /**
   * Advances the director. Returns the camera pose to apply, or null when no scene is driving the camera.
   * Call once per rendered frame after the scenario has been stepped.
   */
  update(realDt: number, ctx: PoseContext): { pos: Vec3; target: Vec3 } | null {
    const s = this.active;
    if (!s || this.state === "idle") return null;
    if (this.state === "playing" && this.scenario.elapsedS >= s.startS + s.durationS) {
      this.scenario.pause();
      this.state = "done";
      this.hooks.onFinish?.(s);
      const next = this.queue.shift();
      if (next) this.play(next);
      else this.inSequence = false;
    }
    const cur = this.active ?? s;
    const tRel = Math.min(Math.max(this.scenario.elapsedS - cur.startS, 0), cur.durationS);
    const pose = scenePose(cur, tRel, ctx);
    const cut = pose.segment !== this.lastSegment || !this.smoothedPos || !this.smoothedTarget;
    this.lastSegment = pose.segment;
    if (cut) {
      this.smoothedPos = { ...pose.pos };
      this.smoothedTarget = { ...pose.target };
    } else {
      const k = 1 - Math.exp(-SMOOTH_RATE * Math.max(realDt, 0));
      const sp = this.smoothedPos as Vec3;
      const st = this.smoothedTarget as Vec3;
      sp.x += (pose.pos.x - sp.x) * k;
      sp.y += (pose.pos.y - sp.y) * k;
      sp.z += (pose.pos.z - sp.z) * k;
      st.x += (pose.target.x - st.x) * k;
      st.y += (pose.target.y - st.y) * k;
      st.z += (pose.target.z - st.z) * k;
    }
    const sp = this.smoothedPos as Vec3;
    sp.y = clampAboveTerrain(sp.y, ctx.heightAt(sp.x, sp.z));
    return { pos: { ...sp }, target: { ...(this.smoothedTarget as Vec3) } };
  }
}
