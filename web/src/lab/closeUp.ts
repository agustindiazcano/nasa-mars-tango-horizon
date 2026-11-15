/**
 * Close-up section: the rigid astronaut scan, auto-skinned and driven by the procedural
 * animation functions, next to the skinned astronaut-animated.glb for comparison.
 */
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { LabContext } from "./modelLab";
import { ANIMATIONS, JOINTS, animationPeriod, samplePose, type AnimationName, type JointName } from "./proceduralAstronaut";
import { buildRigidAstronautRig, type RigidAstronautRig } from "./rigidAstronautRig";

const RIGID_X = -0.9;
const ANIMATED_X = 0.9;

/** Clip of astronaut-animated.glb that best matches each procedural animation. */
const CLIP_FOR: Record<AnimationName, string> = {
  idle: "Idle_11",
  walk: "walking_2_inplace",
  run: "Running",
  "look-around": "Idle_11",
  wave: "Idle_11",
  kneel: "Step_to_Sit_Transition",
  fall: "Fall_Dead_from_Abdominal_Injury",
};

const stage = new THREE.Group();
let active = false;

export function setCloseUpActive(on: boolean): void {
  active = on;
  stage.visible = on;
}

export async function initCloseUp(ctx: LabContext, container: HTMLElement): Promise<void> {
  const { viewer } = ctx;
  container.innerHTML = `
    <h2>Rigid astronaut (auto-skin)</h2>
    <select id="cu-anim"></select>
    <label><span>Ground speed <b id="cu-speed-val">1.4</b> m/s</span></label>
    <input id="cu-speed" type="range" min="0" max="4.5" step="0.05" value="1.4" />
    <label><span>Progress <b id="cu-prog-val">1.00</b></span></label>
    <input id="cu-prog" type="range" min="0" max="1" step="0.01" value="1" />
    <label><span>Auto-play progress</span><input id="cu-auto" type="checkbox" checked /></label>
    <label><span>Arm drop <b id="cu-drop-val">0.75</b></span></label>
    <input id="cu-drop" type="range" min="0" max="1" step="0.05" value="0.75" />
    <label><span>Compare with astronaut-animated</span><input id="cu-compare" type="checkbox" checked /></label>
    <h2>Debug</h2>
    <label><span>Skeleton</span><input id="cu-skel" type="checkbox" /></label>
    <label><span>Weight heat map</span><input id="cu-weights" type="checkbox" /></label>
    <select id="cu-bone"></select>
    <label><span>Wireframe</span><input id="cu-wire" type="checkbox" /></label>
    <h2>Camera</h2>
    <div class="row">
      <button class="act" data-cu-cam="full">Full</button>
      <button class="act" data-cu-cam="head">Head</button>
      <button class="act" data-cu-cam="shoulders">Shoulders</button>
      <button class="act" data-cu-cam="hips">Hips</button>
      <button class="act" data-cu-cam="knees">Knees</button>
      <button class="act" data-cu-cam="back">Back</button>
    </div>
    <div id="cu-info" class="readout">building rig...</div>`;
  const $ = <T extends HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;

  const animSel = $<HTMLSelectElement>("cu-anim");
  for (const a of ANIMATIONS) animSel.add(new Option(a, a));
  const boneSel = $<HTMLSelectElement>("cu-bone");
  for (const j of JOINTS) boneSel.add(new Option(j, j));
  boneSel.value = "upperArmL";

  // Rigid astronaut -> skinned mesh.
  const rigidGltf = await ctx.loadGltf("astronaut");
  rigidGltf.scene.removeFromParent();
  rigidGltf.scene.updateMatrixWorld(true);
  const t0 = performance.now();
  const rig: RigidAstronautRig = buildRigidAstronautRig(rigidGltf.scene);
  const skinMs = performance.now() - t0;
  rig.root.position.set(RIGID_X, 0, 0);
  rig.root.updateMatrixWorld(true);
  // Stand the feet on the grid (the scan is centered at the origin).
  const rigBox = new THREE.Box3().setFromObject(rig.mesh);
  rig.root.position.y = -rigBox.min.y;
  stage.add(rig.root);

  // Skinned reference.
  const animGltf = await ctx.loadGltf("astronaut-animated");
  const refRoot = new THREE.Group();
  const ref = cloneSkinned(animGltf.scene);
  refRoot.add(ref);
  refRoot.position.set(ANIMATED_X, 0, 0);
  stage.add(refRoot);
  const mixer = new THREE.AnimationMixer(ref);
  const refActions = new Map(animGltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
  let refActive: THREE.AnimationAction | null = null;
  const playRef = (anim: AnimationName) => {
    const next = refActions.get(CLIP_FOR[anim]);
    if (!next || next === refActive) return;
    refActive?.fadeOut(0.25);
    next.reset().fadeIn(0.25).play();
    next.clampWhenFinished = true;
    refActive = next;
  };

  viewer.scene.add(stage);
  stage.visible = active;

  let time = 0;
  let progress = 1;
  const state = {
    anim: "idle" as AnimationName,
    speed: 1.4,
    drop: 0.75,
  };

  function update(dt: number): void {
    if (!stage.visible) return;
    time += dt;
    if ($<HTMLInputElement>("cu-auto").checked && (state.anim === "kneel" || state.anim === "fall" || state.anim === "wave")) {
      progress = (time % 4) / 3; // 3 s action, 1 s hold
      progress = Math.min(1, progress);
      $<HTMLInputElement>("cu-prog").value = String(progress);
      $("cu-prog-val").textContent = progress.toFixed(2);
    }
    const pose = samplePose(state.anim, time, { speed: state.speed, progress, heightM: 1.9 });
    rig.applyPose(pose, { armDrop: state.drop });
    mixer.update(dt);
    // Fall clip: keep the reference from looping the death animation.
    $("cu-info").textContent =
      `bones ${rig.skeleton.bones.length}, verts ${rig.mesh.geometry.getAttribute("position").count.toLocaleString("en-US")}\n` +
      `auto-skin ${skinMs.toFixed(0)} ms, loop ${animationPeriod(state.anim, { speed: state.speed }).toFixed(2)} s`;
  }
  viewer.onTick(update);

  animSel.addEventListener("change", () => {
    state.anim = animSel.value as AnimationName;
    time = 0;
    if (state.anim === "kneel" || state.anim === "fall") progress = 0;
    playRef(state.anim);
  });
  $("cu-speed").addEventListener("input", (e) => {
    state.speed = Number((e.target as HTMLInputElement).value);
    $("cu-speed-val").textContent = state.speed.toFixed(2);
  });
  $("cu-prog").addEventListener("input", (e) => {
    progress = Number((e.target as HTMLInputElement).value);
    $("cu-prog-val").textContent = progress.toFixed(2);
    $<HTMLInputElement>("cu-auto").checked = false;
  });
  $("cu-drop").addEventListener("input", (e) => {
    state.drop = Number((e.target as HTMLInputElement).value);
    $("cu-drop-val").textContent = state.drop.toFixed(2);
  });
  $("cu-compare").addEventListener("change", (e) => {
    refRoot.visible = (e.target as HTMLInputElement).checked;
  });
  $("cu-skel").addEventListener("change", (e) => {
    rig.helper.visible = (e.target as HTMLInputElement).checked;
  });
  const applyWeights = () => rig.showWeights($<HTMLInputElement>("cu-weights").checked ? (boneSel.value as JointName) : null);
  $("cu-weights").addEventListener("change", applyWeights);
  boneSel.addEventListener("change", applyWeights);
  $("cu-wire").addEventListener("change", (e) => {
    const on = (e.target as HTMLInputElement).checked;
    for (const m of Array.isArray(rig.mesh.material) ? rig.mesh.material : [rig.mesh.material]) (m as THREE.MeshStandardMaterial).wireframe = on;
  });

  const shot = (target: THREE.Vector3, dist: number, az = 20, el = 6) => viewer.lookAt(target.add(new THREE.Vector3(RIGID_X, 0, 0)), dist, az, el);
  const presets: Record<string, () => void> = {
    full: () => {
      viewer.lookAt(new THREE.Vector3(0, 0.95, 0), 4.6, 15, 6);
    },
    head: () => shot(new THREE.Vector3(0, 1.72, 0), 0.9),
    shoulders: () => shot(new THREE.Vector3(0, 1.45, 0), 1.3, 35, 10),
    hips: () => shot(new THREE.Vector3(0, 0.95, 0), 1.4, 30, 8),
    knees: () => shot(new THREE.Vector3(0, 0.5, 0), 1.3, 30, 8),
    back: () => viewer.lookAt(new THREE.Vector3(RIGID_X, 1.0, 0), 3.2, 180, 8),
  };
  container.querySelectorAll<HTMLButtonElement>("button[data-cu-cam]").forEach((b) => b.addEventListener("click", () => presets[b.dataset.cuCam!]()));

  playRef("idle");
  viewer.grid.scale.setScalar(0.25);
  viewer.grid.position.y = 0;
  presets.full();
  (window as unknown as { __closeUp: unknown }).__closeUp = {
    rig,
    state,
    presets,
    setAnim: (a: AnimationName, p?: number) => {
      animSel.value = a;
      animSel.dispatchEvent(new Event("change"));
      if (p !== undefined) {
        $<HTMLInputElement>("cu-auto").checked = false;
        progress = p;
      }
    },
  };
}
