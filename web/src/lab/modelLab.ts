/**
 * Model lab (web/models.html): inspects the optimized GLBs listed in /models/manifest.json.
 * Separate Vite entry, never imported by the simulator bundle.
 */
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getGltfLoader } from "../world/nasaModels";
import { Viewer, type CameraPreset } from "./viewer";

export interface ManifestModel {
  file: string;
  role: string;
  bytes: number;
  triangles: number;
  triangleBudget: number;
  byteBudget: number;
  boundingBox: { min: number[]; max: number[]; size: number[] };
  heightM: number;
  heightIsReal: boolean;
  up: string;
  front: string;
  anchor: string;
  skinned: boolean;
  joints: number;
  animations: string[];
  source: { bytes: number; triangles: number };
}
export interface Manifest {
  version: number;
  totalBytes: number;
  models: Record<string, ManifestModel>;
}

/** Shared state handed to the close-up section. */
export interface LabContext {
  viewer: Viewer;
  manifest: Manifest;
  log(message: string): void;
  loadGltf(name: string): Promise<GLTF>;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const modelUrl = (file: string) => `/models/${file}`;

const errors: string[] = [];
function log(message: string): void {
  errors.push(message);
  const el = document.getElementById("log");
  if (el) el.textContent = errors.slice(-12).join("\n");
  console.error(`[lab] ${message}`);
}
window.addEventListener("error", (e) => log(`window error: ${e.message}`));
window.addEventListener("unhandledrejection", (e) => log(`unhandled rejection: ${String(e.reason)}`));

function countTriangles(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry as THREE.BufferGeometry;
    n += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  });
  return Math.round(n);
}

async function main(): Promise<void> {
  const manifest: Manifest = await (await fetch("/models/manifest.json")).json();
  const names = Object.keys(manifest.models);
  const viewer = new Viewer($<HTMLCanvasElement>("canvas"));
  viewer.start();

  const gltfCache = new Map<string, Promise<GLTF>>();
  const loadGltf = (name: string): Promise<GLTF> => {
    let p = gltfCache.get(name);
    if (!p) {
      p = getGltfLoader().loadAsync(modelUrl(manifest.models[name].file));
      gltfCache.set(name, p);
    }
    return p;
  };
  const ctx: LabContext = { viewer, manifest, log, loadGltf };

  // ---- Models tab ----------------------------------------------------------------------
  const select = $<HTMLSelectElement>("model");
  for (const n of names) select.add(new Option(`${n}  (${manifest.models[n].role})`, n));

  let current: { name: string; root: THREE.Group; mixer: THREE.AnimationMixer | null; clips: THREE.AnimationClip[]; actions: Map<string, THREE.AnimationAction> } | null = null;
  let activeClip: THREE.AnimationAction | null = null;
  let preset: CameraPreset = "orbit";

  const clipSel = $<HTMLSelectElement>("clip");
  const speedIn = $<HTMLInputElement>("speed");
  const blendChk = $<HTMLInputElement>("blend");
  const gsIn = $<HTMLInputElement>("gs");

  function showModel(name: string, gltf: GLTF): void {
    if (current) {
      viewer.scene.remove(current.root);
      current.mixer?.stopAllAction();
      // Cached GLTF is reused, so geometry is kept; only the wrapper leaves the scene.
    }
    const info = manifest.models[name];
    const root = new THREE.Group();
    const model = gltf.scene;
    const holder = new THREE.Group(); // fit transform lives here so the cached scene stays untouched
    holder.add(model);
    root.add(holder);
    // Real height for the animated astronaut, otherwise a 4 unit span so every prop is comparable.
    root.updateMatrixWorld(true);
    const box0 = new THREE.Box3().setFromObject(root);
    const size0 = box0.getSize(new THREE.Vector3());
    const scale = info.heightIsReal ? info.heightM / Math.max(size0.y, 1e-6) : 4 / Math.max(size0.x, size0.y, size0.z, 1e-6);
    holder.scale.setScalar(scale);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    holder.position.set(-c.x, -box.min.y, -c.z);
    viewer.scene.add(root);
    root.updateMatrixWorld(true);
    const framed = new THREE.Box3().setFromObject(root);
    viewer.frame(framed, preset);

    let mixer: THREE.AnimationMixer | null = null;
    const actions = new Map<string, THREE.AnimationAction>();
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) actions.set(clip.name, mixer.clipAction(clip));
    }
    current = { name, root, mixer, clips: gltf.animations, actions };
    $("anim-box").classList.toggle("hidden", gltf.animations.length === 0);
    clipSel.replaceChildren(...gltf.animations.map((c) => new Option(`${c.name} (${c.duration.toFixed(2)} s)`, c.name)));
    blendChk.checked = false;
    updateBlendUi();
    if (gltf.animations.length > 0) playClip(gltf.animations[0].name);
    applyWire();
    const tris = countTriangles(model);
    const sz = framed.getSize(new THREE.Vector3());
    $("readout").textContent = [
      `file       ${info.file}`,
      `size       ${(info.bytes / 1e6).toFixed(2)} MB (source ${(info.source.bytes / 1e6).toFixed(1)} MB)`,
      `triangles  ${tris.toLocaleString("en-US")} (source ${info.source.triangles.toLocaleString("en-US")}, budget ${Number.isFinite(info.triangleBudget) ? info.triangleBudget.toLocaleString("en-US") : "n/a"})`,
      `extent     ${sz.x.toFixed(2)} x ${sz.y.toFixed(2)} x ${sz.z.toFixed(2)} (shown)`,
      info.skinned ? `skin       ${info.joints} joints, ${info.animations.length} clips` : "skin       none",
    ].join("\n");
  }

  function playClip(clipName: string): void {
    if (!current?.mixer) return;
    activeClip?.fadeOut(0.2);
    const a = current.actions.get(clipName);
    if (!a) return;
    a.reset().fadeIn(0.2).play();
    activeClip = a;
    a.timeScale = Number(speedIn.value);
  }

  function applyWire(): void {
    const on = $<HTMLInputElement>("wire").checked;
    current?.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) (mat as THREE.MeshStandardMaterial).wireframe = on;
    });
  }

  // Locomotion blend: Idle -> Walking -> Running weighted by ground speed.
  const LOCO = { idle: "Idle_11", walk: "walking_2_inplace", run: "Running" };
  function updateBlendUi(): void {
    const on = blendChk.checked;
    $("blend-row").classList.toggle("hidden", !on);
    gsIn.classList.toggle("hidden", !on);
    clipSel.disabled = on;
    if (!current?.mixer) return;
    if (on) {
      activeClip?.fadeOut(0.2);
      for (const n of Object.values(LOCO)) current.actions.get(n)?.reset().play();
      applyLocomotion();
    } else {
      for (const n of Object.values(LOCO)) current.actions.get(n)?.stop();
      playClip(clipSel.value);
    }
  }
  function applyLocomotion(): void {
    if (!current) return;
    const v = Number(gsIn.value);
    $("gs-val").textContent = v.toFixed(2);
    const idle = current.actions.get(LOCO.idle);
    const walk = current.actions.get(LOCO.walk);
    const run = current.actions.get(LOCO.run);
    if (!idle || !walk || !run) return;
    const wWalk = v <= 1.4 ? Math.min(1, v / 1.4) : Math.max(0, 1 - (v - 1.4) / 2.1);
    const wRun = v <= 1.4 ? 0 : Math.min(1, (v - 1.4) / 2.1);
    const wIdle = Math.max(0, 1 - Math.min(1, v / 0.8));
    const total = wIdle + wWalk * (v > 0.8 ? 1 : v / 0.8) + wRun || 1;
    idle.setEffectiveWeight(wIdle / total);
    walk.setEffectiveWeight((wWalk * (v > 0.8 ? 1 : v / 0.8)) / total);
    run.setEffectiveWeight(wRun / total);
    // Match playback rates to the ground speed so feet do not skate.
    walk.setEffectiveTimeScale(Math.max(0.4, v / 1.4) * Number(speedIn.value));
    run.setEffectiveTimeScale(Math.max(0.6, v / 3.5) * Number(speedIn.value));
    idle.setEffectiveTimeScale(Number(speedIn.value));
  }

  viewer.onTick((dt) => current?.mixer?.update(dt));

  async function selectModel(name: string): Promise<void> {
    select.value = name;
    try {
      preset = name === "conae-base-mars" ? "top" : "orbit";
      showModel(name, await loadGltf(name));
    } catch (e) {
      log(`load ${name}: ${String(e)}`);
    }
  }

  select.addEventListener("change", () => void selectModel(select.value));
  clipSel.addEventListener("change", () => playClip(clipSel.value));
  speedIn.addEventListener("input", () => {
    $("speed-val").textContent = Number(speedIn.value).toFixed(1);
    if (blendChk.checked) applyLocomotion();
    else if (activeClip) activeClip.timeScale = Number(speedIn.value);
  });
  blendChk.addEventListener("change", updateBlendUi);
  gsIn.addEventListener("input", applyLocomotion);
  $("wire").addEventListener("change", applyWire);
  document.querySelectorAll<HTMLButtonElement>("button[data-cam]").forEach((b) =>
    b.addEventListener("click", () => {
      preset = b.dataset.cam as CameraPreset;
      if (current) viewer.frame(new THREE.Box3().setFromObject(current.root), preset);
    }),
  );

  // ---- Contact sheet -------------------------------------------------------------------
  async function renderContactSheet(): Promise<void> {
    const out = $("sheet");
    out.replaceChildren();
    const W = 480;
    const H = 360;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a1d16);
    scene.add(new THREE.HemisphereLight(0xffd9b8, 0x4a2a1c, 1.0));
    const sun = new THREE.DirectionalLight(0xfff0dd, 3);
    sun.position.set(6, 10, 7);
    scene.add(sun);
    const cam = new THREE.PerspectiveCamera(35, W / H, 0.01, 100);
    for (const [i, name] of names.entries()) {
      $("sheet-status").textContent = `rendering ${i + 1}/${names.length}: ${name}`;
      try {
        const gltf = await loadGltf(name);
        const wrapper = new THREE.Group();
        const inst = gltf.scene;
        wrapper.add(inst);
        scene.add(wrapper);
        wrapper.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(wrapper);
        const center = box.getCenter(new THREE.Vector3());
        const r = box.getSize(new THREE.Vector3()).length() / 2;
        const dir = name === "conae-base-mars" ? new THREE.Vector3(0.2, 1, 0.55) : new THREE.Vector3(0.8, 0.45, 1);
        dir.normalize();
        cam.position.copy(center).addScaledVector(dir, (r / Math.tan(THREE.MathUtils.degToRad(17.5))) * 1.05);
        cam.near = r / 100;
        cam.far = r * 20;
        cam.updateProjectionMatrix();
        cam.lookAt(center);
        renderer.render(scene, cam);
        const fig = document.createElement("figure");
        const img = new Image();
        img.src = canvas.toDataURL("image/jpeg", 0.85);
        img.alt = name;
        const cap = document.createElement("figcaption");
        const m = manifest.models[name];
        cap.textContent = `${name}  ${(m.triangles / 1000).toFixed(0)}k tris  ${(m.bytes / 1e6).toFixed(2)} MB`;
        fig.append(img, cap);
        out.append(fig);
        scene.remove(wrapper);
        wrapper.remove(inst);
      } catch (e) {
        log(`contact sheet ${name}: ${String(e)}`);
      }
    }
    renderer.dispose();
    if (current) showModel(current.name, await loadGltf(current.name)); // the sheet reparented the cached scenes
    $("sheet-status").textContent = `done: ${names.length} models`;
  }
  $("sheet-run").addEventListener("click", () => void renderContactSheet());

  // ---- Tabs ----------------------------------------------------------------------------
  type Tab = "models" | "sheet" | "closeup";
  let closeUpLoaded = false;
  async function setTab(tab: Tab): Promise<void> {
    document.body.classList.toggle("sheet", tab === "sheet");
    for (const t of ["models", "sheet", "closeup"] as const) {
      $(`tab-${t}`).classList.toggle("on", t === tab);
      $(`sec-${t}`).classList.toggle("hidden", t !== tab);
    }
    if (current) current.root.visible = tab === "models";
    viewer.resize();
    if (tab === "closeup") {
      const mod = await import("./closeUp");
      if (!closeUpLoaded) {
        closeUpLoaded = true;
        await mod.initCloseUp(ctx, $("sec-closeup"));
      }
      mod.setCloseUpActive(true);
    } else if (closeUpLoaded) {
      (await import("./closeUp")).setCloseUpActive(false);
      if (tab === "models" && current) viewer.frame(new THREE.Box3().setFromObject(current.root), preset);
    }
  }
  $("tab-models").addEventListener("click", () => void setTab("models"));
  $("tab-sheet").addEventListener("click", () => void setTab("sheet"));
  $("tab-closeup").addEventListener("click", () => void setTab("closeup"));

  // ---- Self-check: every model and every clip, errors collected ---------------------------
  async function selfCheck(): Promise<{ checked: number; clips: number; errors: string[] }> {
    const before = errors.length;
    let clips = 0;
    for (const name of names) {
      $("check-status").textContent = `checking ${name}`;
      await selectModel(name);
      await new Promise((r) => setTimeout(r, 120));
      if (!current) continue;
      for (const clip of current.clips) {
        clipSel.value = clip.name;
        playClip(clip.name);
        clips++;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    const result = { checked: names.length, clips, errors: errors.slice(before) };
    $("check-status").textContent = `done: ${result.checked} models, ${result.clips} clips, ${result.errors.length} errors`;
    return result;
  }
  $("selfcheck").addEventListener("click", () => void selfCheck());

  (window as unknown as { __lab: unknown }).__lab = { selectModel, selfCheck, renderContactSheet, setTab, errors, ctx };
  await selectModel(names.includes("rover-1") ? "rover-1" : names[0]);
}

void main().catch((e) => log(`init: ${String(e)}`));
