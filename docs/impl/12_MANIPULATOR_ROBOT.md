# 12. Manipulator rover: a wheeled robot with a procedural arm driven by vision

**Goal:** one specific robot, `manip-1` ("HANDS"), a wheeled rover with a robotic arm animated procedurally by inverse kinematics. An SI agent with vision decides what to do; the arm does it on screen: hand a tool to the astronaut, take a sample, drill, photograph.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 7.4; guide 08 (agents, guardrail); guide 09 (`Unit`, fleet).
**Plan tasks:** 41 to 44.
**Location:** `web/src/world/manipulator/`, plus tools in `server/src/agents/tools/`.

## Division of labour

| Layer | Who | Does what |
|-------|-----|-----------|
| Perception and decision | `ROBOT.manip-1` planner (vision model, medium tier) | Sees the rover camera frame with numbered target markers, picks a target and a skill |
| Safety | `GUARDIAN` | Rules (reach, distance to crew, tool state) and judge |
| Skill execution | Skill state machine in the browser | Sequence of arm poses: approach, act, retract |
| Motion | Analytic inverse kinematics | Joint angles for each target point, interpolated every frame |

The model never outputs joint angles. It chooses **which skill on which target**; geometry is solved exactly. This keeps the motion correct and the model's job small.

## Robot

| Part | Spec (design assumptions; show them as such) |
|------|-----------------------------------------------|
| Chassis | 4 wheels, 1.4 × 1.0 m, ground speed 1.0 m/s |
| Arm | 4 joints: base yaw, shoulder pitch, elbow pitch, wrist pitch. Upper arm 0.9 m, forearm 0.8 m. Reach 1.7 m |
| End effector | Tool turret with four tools: gripper, core drill, scoop, camera |
| Sensors | Mast camera (the vision input), wrist camera |
| Tool rack | Carries tools and sample tubes for the crew |

## Code

`web/src/world/manipulator/arm.ts`:

```ts
import * as THREE from "three";

export type Tool = "gripper" | "drill" | "scoop" | "camera";
export interface ArmAngles { yaw: number; shoulder: number; elbow: number; wrist: number }

const L1 = 0.9, L2 = 0.8;                 // upper arm and forearm lengths, metres
export const ARM_REACH = L1 + L2 - 0.02;
const ARM_MIN = Math.abs(L1 - L2) + 0.05;

/**
 * Procedural 4-joint arm. Hierarchy: base (yaw) → shoulder (pitch) → elbow (pitch) → wrist (pitch) → tool.
 * Links extend along local +Z. Rotation about X by a positive angle swings +Z towards -Y, so lifting a link uses a negative angle.
 */
export class Arm {
  readonly root = new THREE.Group();
  private yaw = new THREE.Group(); private shoulder = new THREE.Group();
  private elbow = new THREE.Group(); private wrist = new THREE.Group();
  readonly toolTip = new THREE.Object3D();
  private current: ArmAngles = { yaw: 0, shoulder: -1.2, elbow: 2.4, wrist: -1.2 }; // stowed
  private goal: ArmAngles = { ...this.current };
  tool: Tool = "gripper";
  drillSpin = 0;                           // rad/s, animated when drilling
  private bit: THREE.Mesh;

  constructor() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, metalness: 0.6, roughness: 0.4 });
    const link = (len: number, r: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
      m.rotation.x = Math.PI / 2; m.position.z = len / 2; return m;
    };
    const joint = (r: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
    this.root.add(this.yaw);
    this.yaw.add(joint(0.09), this.shoulder);
    this.shoulder.add(link(L1, 0.05), this.elbow);
    this.elbow.position.z = L1; this.elbow.add(joint(0.07), link(L2, 0.04), this.wrist);
    this.wrist.position.z = L2; this.wrist.add(joint(0.06), this.toolTip);
    this.toolTip.position.z = 0.18;
    this.bit = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.18, 8), mat);
    this.bit.rotation.x = Math.PI / 2; this.bit.position.z = 0.09;
    this.wrist.add(this.bit);
    this.apply(this.current);
  }

  /** Analytic two-bone IK. `target` is in the arm root frame. `toolPitch` is the tool angle below horizontal (π/2 = straight down). */
  solve(target: THREE.Vector3, toolPitch = Math.PI / 2): ArmAngles | null {
    // Step the wrist back from the tool tip along the tool direction.
    const yaw = Math.atan2(target.x, target.z);
    const r = Math.hypot(target.x, target.z) - Math.cos(toolPitch) * this.toolTip.position.z;
    const h = target.y + Math.sin(toolPitch) * this.toolTip.position.z;
    const d = Math.hypot(r, h);
    if (d > ARM_REACH || d < ARM_MIN) return null;                       // out of reach: the rover must reposition
    const elbowInterior = Math.acos(THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const lift = Math.atan2(h, r) + Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const shoulder = -lift;                 // negative X rotation lifts the upper arm
    const elbow = Math.PI - elbowInterior;  // positive bends the forearm back down
    const wrist = toolPitch - (shoulder + elbow);
    return { yaw, shoulder, elbow, wrist };
  }

  /** Sets a pose goal. Returns false if the point cannot be reached. */
  reach(targetInRoot: THREE.Vector3, toolPitch?: number): boolean {
    const a = this.solve(targetInRoot, toolPitch);
    if (!a) return false;
    this.goal = a; return true;
  }

  stow(): void { this.goal = { yaw: 0, shoulder: -1.2, elbow: 2.4, wrist: -1.2 }; }

  /** Moves joints towards the goal with a speed limit, so motion looks mechanical rather than instant. */
  update(dt: number, maxSpeed = 0.9): boolean {
    let done = true;
    for (const k of ["yaw", "shoulder", "elbow", "wrist"] as const) {
      const diff = this.goal[k] - this.current[k], step = maxSpeed * dt;
      if (Math.abs(diff) > step) { this.current[k] += Math.sign(diff) * step; done = false; } else this.current[k] = this.goal[k];
    }
    this.apply(this.current);
    this.bit.visible = this.tool === "drill";
    this.bit.rotation.z += this.drillSpin * dt;
    return done;
  }

  private apply(a: ArmAngles): void {
    this.yaw.rotation.y = a.yaw; this.shoulder.rotation.x = a.shoulder;
    this.elbow.rotation.x = a.elbow; this.wrist.rotation.x = a.wrist;
  }
}
```

`web/src/world/manipulator/skills.ts`:

```ts
import * as THREE from "three";
import type { Arm, Tool } from "./arm";

export type SkillId = "handover" | "sample" | "drill" | "photograph";
export interface SkillStep { tool?: Tool; point?: THREE.Vector3; toolPitch?: number; hold?: number; drillSpin?: number; event?: string; stow?: boolean }

/** A skill is a list of waypoints for the tool tip, in the arm root frame, with optional holds and events. */
export function buildSkill(id: SkillId, target: THREE.Vector3): SkillStep[] {
  const above = target.clone().add(new THREE.Vector3(0, 0.25, 0));
  switch (id) {
    case "drill": return [
      { tool: "drill", point: above }, { point: target, drillSpin: 25, event: "drill_start" },
      { point: target.clone().add(new THREE.Vector3(0, -0.06, 0)), hold: 4, drillSpin: 25 },
      { point: above, drillSpin: 0, event: "core_acquired" }, { stow: true } ];
    case "sample": return [
      { tool: "scoop", point: above }, { point: target, toolPitch: 1.2 },
      { point: target.clone().add(new THREE.Vector3(0, 0.05, 0.12)), toolPitch: 0.6, hold: 0.5, event: "sample_acquired" },
      { point: above }, { stow: true } ];
    case "photograph": return [
      { tool: "camera", point: target.clone().add(new THREE.Vector3(0, 0.35, -0.1)), toolPitch: 1.3, hold: 1, event: "photo_taken" },
      { stow: true } ];
    case "handover": return [
      { tool: "gripper", point: new THREE.Vector3(-0.35, 0.3, 0.2), toolPitch: 1.4, hold: 0.6, event: "tool_grasped" }, // pick from the rack
      { point: target, toolPitch: 0, hold: 2.5, event: "tool_offered" },                                             // hold at hand height
      { event: "tool_released" }, { stow: true } ];
  }
}

/** Runs a skill step by step. `onEvent` updates the world: sample mass, photo captured, tool given. */
export class SkillRunner {
  private steps: SkillStep[] = []; private i = 0; private holdLeft = 0; private started = false;
  active: SkillId | null = null;
  constructor(private arm: Arm, private onEvent: (e: string, skill: SkillId) => void) {}

  start(id: SkillId, targetInRoot: THREE.Vector3): boolean {
    const steps = buildSkill(id, targetInRoot);
    // Refuse up front if any waypoint is out of reach, rather than stopping half way.
    if (steps.some((s) => s.point && !this.arm.solve(s.point, s.toolPitch))) return false;
    this.steps = steps; this.i = 0; this.started = false; this.active = id; return true;
  }

  update(dt: number): void {
    if (!this.active) return;
    const s = this.steps[this.i];
    if (!s) { this.active = null; return; }
    if (!this.started) {
      if (s.tool) this.arm.tool = s.tool;
      if (s.drillSpin !== undefined) this.arm.drillSpin = s.drillSpin;
      if (s.stow) this.arm.stow(); else if (s.point) this.arm.reach(s.point, s.toolPitch);
      this.holdLeft = s.hold ?? 0; this.started = true;
    }
    const arrived = this.arm.update(dt);
    if (!arrived) return;
    if (this.holdLeft > 0) { this.holdLeft -= dt; return; }
    if (s.event) this.onEvent(s.event, this.active);
    this.i++; this.started = false;
  }
}
```

Server tools to add to the registry in guide 08 (`mcp-fleet`):

```ts
def({ name: "arm_skill", server: "fleet", effect: true,
  schema: z.object({ unit_id: z.literal("manip-1"), skill: z.enum(["handover", "sample", "drill", "photograph"]),
    target_id: z.string().describe("id of a target marker visible in the camera frame, or 'astronaut'"),
    item: z.enum(["hammer", "sample_tube", "patch_kit", "o2_bottle"]).optional() }),
  description: "Runs an arm skill on a visible target. The rover drives into reach first if needed.",
  run: (a, _c, caller) => ({ type: "arm_skill", args: a, proposedBy: caller }) }),
```

Guardian rules to add to `ruleCheck`:

```ts
if (a.type === "arm_skill") {
  const { skill, target_id } = a.args as { skill: string; target_id: string };
  const unit = ctx.fleet.find((u) => u.id === "manip-1");
  if (!unit) return deny("manipulator rover not available");
  const dCrew = Math.hypot(unit.x - ctx.astronaut.x, unit.z - ctx.astronaut.z);
  // Drilling or scooping near a person is never allowed; handing over is the only skill that approaches crew.
  if (skill !== "handover" && dCrew < 2) return deny("crew within 2 m of the tool");
  if (skill === "handover" && target_id !== "astronaut") return deny("handover target must be the astronaut");
  if (skill === "handover" && ctx.astronaut.speed > 0.1) return deny("astronaut must be standing still for a handover");
}
```

## Instructions for the coding agent

1. **Build the arm first, alone.** A test page with the arm, a draggable target sphere and `arm.reach()` every frame. Check: the tool tip touches the sphere anywhere inside reach, the elbow stays above the line from shoulder to wrist, and `reach()` returns false outside the reach envelope. **If the tip misses the target, fix the sign conventions in `solve` and document them; the angle signs were derived on paper and need this visual check.**
2. **Chassis:** box body, four wheels that spin with travelled distance, mast with a camera head that turns to look at the current target. Mount `arm.root` at the front of the deck. Register it as fleet unit `manip-1`, kind `manipulator`, with its own slope limit in the guardian table.
3. **Targets:** the world keeps a list of interactable targets near the rover (rock, vein outcrop, soil patch, instrument, astronaut hand), each with an id and a position. Convert a world position to the arm root frame with `arm.root.worldToLocal`.
4. **Vision loop (task 43):**
   - Render the mast camera to a 512×384 target. Draw numbered markers on the frame for the targets in view (project each target to screen and draw `T1`, `T2`…).
   - Send the frame, the marker list `{ id, kind, distance_m }` and the crew request to `/api/agent/run` with agent `ROBOT.manip-1`.
   - The planner replies with an `arm_skill` tool call naming a `target_id`. It may only name ids from the list; anything else is rejected by schema.
   - After the action passes `GUARDIAN`, the browser drives the rover until the target is within 1.4 m and in front, then starts the skill.
   - On completion, the rover sends a fresh frame and reports in one spoken sentence what it did and what it sees.
5. **Skill effects (`onEvent`):**
   - `core_acquired` / `sample_acquired`: add a sample to the mission log with position, station and time; show a small cylinder moving into the rover sample rack.
   - `photo_taken`: capture the wrist camera frame, show it in a HUD panel, and optionally send it to `/api/agent/vision` for a description.
   - `tool_offered`: the item appears in the gripper at the astronaut hand height (about 1.1 m, 0.5 m in front of the astronaut). The crew confirms by voice ("got it") or pointer; then `tool_released` adds the item to the astronaut inventory.
   - Drilling: particles at the bit, a drilling sound, and the HUD shows depth increasing.
6. **Handover target point:** computed from the astronaut position and facing, not from the model. The rover parks 1.2 m in front of the astronaut and stops before extending the arm.
7. **Emergency use:** in the `leak` scenario (guide 09), if `manip-1` is the closest unit, `BASE` may send it to hand over the `patch_kit` or `o2_bottle`. This ties the arm to the rescue story.
8. **Voice examples that must work** (Spanish and English): "Hands, bring me the hammer", "Hands, drill the vein on your left", "Hands, take a sample of that soil", "Hands, photograph the outcrop".
9. **Honest labelling:** the arm dimensions, speeds and tool set are design assumptions; list them in the technical card of the robot with that label. Mention that sampling-arm heritage is the Curiosity and Perseverance arms.
10. Add `SkillRunner.update` and `arm.update` to the simulation clock (guide 09).

## Acceptance criteria

- On the test page the tool tip follows the target anywhere inside reach.
- "Hands, drill the vein" produces: vision frame with markers, a tool call naming a valid marker, guardian approval, drive, full drill sequence, a logged core, a spoken report.
- "Hands, bring me the hammer" ends with the item offered at hand height, and the guardian refuses it while the astronaut is walking.
- An order to drill with the astronaut within 2 m is refused by rules, with the reason shown.
- The agents panel shows the whole chain for each of these.
