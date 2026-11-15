import * as THREE from "three";

/**
 * Shoulder patches for astronauts: the Argentine flag on the right shoulder and the CONAE
 * patch on the left one.
 *
 * Usage (procedural astronaut):
 *   attachShoulderPatches(group, { arms: { left: leftArmGroup, right: rightArmGroup } });
 * Usage (skinned GLB, also on a SkeletonUtils clone, call after the model sits at its final scale):
 *   attachShoulderPatches(clonedScene);   // finds the upper-arm bones by name
 *
 * CONAE artwork: if `/textures/conae-logo.png` exists it is used automatically (transparent
 * PNG, fitted inside the patch without distortion). Until then a generic placeholder roundel
 * with the text "CONAE" is drawn. The official logo is intentionally not recreated here;
 * the owner only has to drop the PNG at `web/public/textures/conae-logo.png`.
 */

export type ShoulderPatchKind = "flag" | "conae";
export type Side = "left" | "right";

/** Patches are 2:3 (height:width), the usual flag patch proportion. */
export const PATCH_ASPECT = 2 / 3;
export const DEFAULT_PATCH_WIDTH_M = 0.08;
export const CONAE_LOGO_URL = "/textures/conae-logo.png";
/** Astronaut's right shoulder carries the flag, the left one the agency patch. */
export const PATCH_FOR_SIDE: Record<Side, ShoulderPatchKind> = { right: "flag", left: "conae" };

export const FLAG_BLUE = "#74ACDF";
export const FLAG_WHITE = "#FFFFFF";
const SUN_GOLD = "#F6B40E";
const SUN_LINE = "#85340A";

/** Patch size in metres, clamped to the 7 to 9 cm range the suit patches are specified for. */
export function patchSize(widthM: number): { w: number; h: number } {
  const w = Math.min(0.09, Math.max(0.07, widthM));
  return { w, h: w * PATCH_ASPECT };
}

// ---- Flag geometry (pure, no canvas) ---------------------------------------------------

/** Three equal horizontal bands, top to bottom, as fractions of the flag height. */
export function flagStripes(height: number): { y0: number; y1: number; color: string }[] {
  const b = height / 3;
  return [
    { y0: 0, y1: b, color: FLAG_BLUE },
    { y0: b, y1: 2 * b, color: FLAG_WHITE },
    { y0: 2 * b, y1: height, color: FLAG_BLUE },
  ];
}

/** Sol de Mayo placement: centred in the white band; rays span most of its height. */
export function sunGeometry(width: number, height: number): { cx: number; cy: number; discR: number; tipR: number } {
  const tipR = (height / 3) * 0.46;
  return { cx: width / 2, cy: height / 2, discR: tipR * 0.5, tipR };
}

/** 32 rays alternating straight (even index) and wavy (odd index), starting at the top. */
export function sunRays(count = 32): { angle: number; wavy: boolean }[] {
  return Array.from({ length: count }, (_, i) => ({ angle: (i / count) * Math.PI * 2, wavy: i % 2 === 1 }));
}

// ---- Bone matching (pure) ----------------------------------------------------------------

const BASES = ["upperarm", "arm", "shoulder", "clavicle"] as const; // preference order

function normalizeBoneName(name: string): string {
  return name.slice(name.lastIndexOf(":") + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Returns side and preference rank (0 best) of a shoulder/upper-arm bone name, or null. */
export function classifyShoulderBone(name: string): { side: Side; rank: number } | null {
  const n = normalizeBoneName(name);
  for (const [rank, base] of BASES.entries()) {
    if (n === `left${base}` || n === `${base}left` || n === `l${base}` || n === `${base}l`) return { side: "left", rank };
    if (n === `right${base}` || n === `${base}right` || n === `r${base}` || n === `${base}r`) return { side: "right", rank };
  }
  return null;
}

/**
 * Picks the upper-arm bone of each side from a list of names (the shoulder/clavicle only
 * when no upper arm exists). Forearms, hands and fingers never match.
 */
export function matchShoulderBones(names: readonly string[]): { left: string | null; right: string | null } {
  const best: Record<Side, { name: string; rank: number } | null> = { left: null, right: null };
  for (const name of names) {
    const c = classifyShoulderBone(name);
    if (!c) continue;
    const cur = best[c.side];
    if (!cur || c.rank < cur.rank) best[c.side] = { name, rank: c.rank };
  }
  return { left: best.left?.name ?? null, right: best.right?.name ?? null };
}

// ---- Textures ---------------------------------------------------------------------------

const hasDom = () => typeof document !== "undefined" && typeof document.createElement === "function";
const TEX_W = 768;
const TEX_H = 512;

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!hasDom()) return null;
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx } : null;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Deterministic fabric grain and stitch marks, clipped by the caller. */
function addFabricNoise(ctx: CanvasRenderingContext2D): void {
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,40,0.05)";
    ctx.fillRect(rnd() * TEX_W, rnd() * TEX_H, 2 + rnd() * 3, 1);
  }
  ctx.strokeStyle = "rgba(0,0,40,0.035)";
  ctx.lineWidth = 1;
  for (let y = 0; y < TEX_H; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TEX_W, y);
    ctx.stroke();
  }
}

function drawSun(ctx: CanvasRenderingContext2D): void {
  const { cx, cy, discR, tipR } = sunGeometry(TEX_W, TEX_H);
  ctx.fillStyle = SUN_GOLD;
  ctx.strokeStyle = SUN_LINE;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  const step = (Math.PI * 2) / 32;
  for (const { angle, wavy } of sunRays()) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    const r0 = discR * 0.95;
    const baseHalf = r0 * step * 0.5;
    if (!wavy) {
      ctx.moveTo(r0, -baseHalf);
      ctx.lineTo(tipR, 0);
      ctx.lineTo(r0, baseHalf);
    } else {
      // Tapered flame: both edges follow a sine around the ray axis.
      const n = 14;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const r = r0 + (tipR * 0.92 - r0) * t;
        const half = baseHalf * (1 - t) * 0.9;
        const wob = Math.sin(t * Math.PI * 3) * baseHalf * 0.55;
        if (k === 0) ctx.moveTo(r, wob - half);
        else ctx.lineTo(r, wob - half);
      }
      for (let k = n; k >= 0; k--) {
        const t = k / n;
        const r = r0 + (tipR * 0.92 - r0) * t;
        const half = baseHalf * (1 - t) * 0.9;
        const wob = Math.sin(t * Math.PI * 3) * baseHalf * 0.55;
        ctx.lineTo(r, wob + half);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Disc with the face: eyes, nose and mouth.
  ctx.fillStyle = SUN_GOLD;
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = SUN_LINE;
  ctx.fillStyle = SUN_LINE;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * discR * 0.36, cy - discR * 0.18, discR * 0.11, discR * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy - discR * 0.12);
  ctx.quadraticCurveTo(cx - discR * 0.08, cy + discR * 0.14, cx + discR * 0.04, cy + discR * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + discR * 0.12, discR * 0.38, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
}

/** Embroidered edge: dark merrow band plus a dashed stitch line inside it. */
function drawBorder(ctx: CanvasRenderingContext2D, band: string, stitch: string): void {
  const inset = 12;
  ctx.lineWidth = 22;
  ctx.strokeStyle = band;
  roundRectPath(ctx, inset, inset, TEX_W - 2 * inset, TEX_H - 2 * inset, 34);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 6]);
  ctx.strokeStyle = stitch;
  roundRectPath(ctx, inset + 22, inset + 22, TEX_W - 2 * (inset + 22), TEX_H - 2 * (inset + 22), 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawFlagTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas();
  if (!c) return null;
  const { canvas, ctx } = c;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  roundRectPath(ctx, 2, 2, TEX_W - 4, TEX_H - 4, 40);
  ctx.clip();
  for (const s of flagStripes(TEX_H)) {
    ctx.fillStyle = s.color;
    ctx.fillRect(0, s.y0, TEX_W, s.y1 - s.y0);
  }
  drawSun(ctx);
  addFabricNoise(ctx);
  drawBorder(ctx, "#2F5F8F", "#F2F6FA");
  ctx.restore();
  return finishTexture(canvas);
}

/** Generic placeholder only: a navy roundel with the word CONAE, not the agency logo. */
function drawConaePlaceholderTexture(): THREE.CanvasTexture | null {
  const c = makeCanvas();
  if (!c) return null;
  const { canvas, ctx } = c;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  roundRectPath(ctx, 2, 2, TEX_W - 4, TEX_H - 4, 40);
  ctx.clip();
  ctx.fillStyle = "#0B2A55";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  const cx = TEX_W / 2;
  const cy = TEX_H / 2;
  const r = TEX_H * 0.36;
  ctx.fillStyle = "#123E7C";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#E8EEF6";
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(r * 0.62)}px Rajdhani, Arial, sans-serif`;
  ctx.fillText("CONAE", cx, cy);
  addFabricNoise(ctx);
  drawBorder(ctx, "#E8EEF6", "#74ACDF");
  ctx.restore();
  return finishTexture(canvas);
}

function finishTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Fits an arbitrary-aspect logo image inside the patch canvas without distortion. */
function containFitTexture(image: CanvasImageSource & { width: number; height: number }): THREE.CanvasTexture | null {
  const c = makeCanvas();
  if (!c) return null;
  const { canvas, ctx } = c;
  const k = Math.min(TEX_W / image.width, TEX_H / image.height);
  const w = image.width * k;
  const h = image.height * k;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.drawImage(image, (TEX_W - w) / 2, (TEX_H - h) / 2, w, h);
  return finishTexture(canvas);
}

// ---- Shared mesh resources ---------------------------------------------------------------

const geometry = new THREE.PlaneGeometry(1, PATCH_ASPECT);
const materials: Partial<Record<ShoulderPatchKind, THREE.MeshStandardMaterial>> = {};

function makeMaterial(map: THREE.Texture | null): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.92,
    metalness: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  m.visible = map !== null;
  return m;
}

function getMaterial(kind: ShoulderPatchKind): THREE.MeshStandardMaterial {
  const existing = materials[kind];
  if (existing) return existing;
  const material = makeMaterial(kind === "flag" ? drawFlagTexture() : drawConaePlaceholderTexture());
  materials[kind] = material;
  if (kind === "conae" && hasDom() && typeof document.createElementNS === "function") {
    // Official artwork wins when the owner provides it; a missing file keeps the placeholder.
    new THREE.TextureLoader().load(
      CONAE_LOGO_URL,
      (loaded) => {
        const fitted = containFitTexture(loaded.image as HTMLImageElement);
        if (!fitted) return;
        material.map?.dispose();
        material.map = fitted;
        material.visible = true;
        material.needsUpdate = true;
      },
      undefined,
      () => undefined,
    );
  }
  return material;
}

/** Creates a patch mesh `widthM` wide facing +Z, top edge toward +Y. Materials are shared. */
export function createShoulderPatch(kind: ShoulderPatchKind, widthM: number): THREE.Mesh {
  const { w } = patchSize(widthM);
  const mesh = new THREE.Mesh(geometry, getMaterial(kind));
  mesh.name = `shoulder-patch-${kind}`;
  mesh.userData.shoulderPatch = kind;
  mesh.scale.set(w, w, 1);
  mesh.renderOrder = 2;
  return mesh;
}

// ---- Attachment ---------------------------------------------------------------------------

export interface ShoulderPatchOptions {
  /** Patch width in metres, 7 to 9 cm (default 8 cm). */
  widthM?: number;
  /**
   * Procedural limbs: pivot groups hanging down their local -Y. When omitted, the upper-arm
   * bones are looked up by name under `root`.
   */
  arms?: { left: THREE.Object3D; right: THREE.Object3D; armRadiusM?: number; armLengthM?: number };
}

export interface ShoulderPatchResult {
  flag: THREE.Mesh;
  conae: THREE.Mesh;
  nodes: { left: THREE.Object3D; right: THREE.Object3D };
}

const FRACTION_ALONG_ARM = 0.22; // over the shoulder cap, below the joint
const SURFACE_GAP_M = 0.003;
const FALLBACK_RADIUS_M = 0.065;

const isBone = (o: THREE.Object3D): o is THREE.Bone => (o as THREE.Bone).isBone === true;

/** Removes patches added earlier so repeated calls (cached scenes) never stack them. */
function removeExisting(root: THREE.Object3D): void {
  const old: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.shoulderPatch) old.push(o);
  });
  for (const o of old) o.removeFromParent();
}

function skinnedMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.userData.shoulderPatch) return;
    (o as THREE.SkinnedMesh).skeleton?.update();
    meshes.push(m);
  });
  return meshes;
}

function place(
  patch: THREE.Mesh,
  node: THREE.Object3D,
  other: THREE.Object3D,
  meshes: THREE.Mesh[],
  widthM: number,
  armRadiusM: number | undefined,
  armLengthM: number,
): void {
  const p = node.getWorldPosition(new THREE.Vector3());
  const q = other.getWorldPosition(new THREE.Vector3());
  const nodeQuat = node.getWorldQuaternion(new THREE.Quaternion());
  const nodeScale = node.getWorldScale(new THREE.Vector3());
  const childBone = node.children.find(isBone);
  const axis = childBone
    ? childBone.getWorldPosition(new THREE.Vector3()).sub(p)
    : new THREE.Vector3(0, -1, 0).applyQuaternion(nodeQuat);
  const length = childBone ? axis.length() : armLengthM;
  axis.normalize();

  // Outward = away from the other shoulder, perpendicular to the limb.
  const out = p.clone().sub(q);
  out.addScaledVector(axis, -out.dot(axis));
  if (out.lengthSq() < 1e-10) out.set(1, 0, 0).applyQuaternion(nodeQuat);
  out.normalize();

  const onArm = p.clone().addScaledVector(axis, length * FRACTION_ALONG_ARM);
  let radius = armRadiusM ?? FALLBACK_RADIUS_M;
  if (armRadiusM === undefined && meshes.length > 0) {
    const reach = 0.4;
    const ray = new THREE.Raycaster(onArm.clone().addScaledVector(out, reach), out.clone().negate(), 0, reach * 2);
    const hit = ray.intersectObjects(meshes, false)[0];
    if (hit && hit.distance > reach - 0.2 && hit.distance < reach) radius = reach - hit.distance;
  }
  const worldPos = onArm.addScaledVector(out, radius + SURFACE_GAP_M);

  // Patch frame: +Z outward, +Y toward the shoulder (up when the arm hangs), +X completes it.
  const up = axis.clone().negate();
  up.addScaledVector(out, -up.dot(out)).normalize();
  const right = new THREE.Vector3().crossVectors(up, out);
  const worldQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, out));

  patch.position.copy(node.worldToLocal(worldPos));
  patch.quaternion.copy(nodeQuat.invert().multiply(worldQuat));
  const w = patchSize(widthM).w;
  patch.scale.set(w / nodeScale.x, w / nodeScale.y, 1);
  node.add(patch);
}

/**
 * Parents the flag to the astronaut's right shoulder and the CONAE patch to the left one.
 * Placement is derived from the current world pose (limb axis, outward side, mesh surface),
 * then stored in the node's local frame, so it follows every animation clip. Returns null
 * when no shoulder nodes are found.
 */
export function attachShoulderPatches(root: THREE.Object3D, options: ShoulderPatchOptions = {}): ShoulderPatchResult | null {
  removeExisting(root);
  root.updateWorldMatrix(true, true);
  let left: THREE.Object3D | undefined;
  let right: THREE.Object3D | undefined;
  if (options.arms) {
    left = options.arms.left;
    right = options.arms.right;
  } else {
    const bones = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      if (isBone(o)) bones.set(o.name, o);
    });
    const m = matchShoulderBones([...bones.keys()]);
    left = m.left ? bones.get(m.left) : undefined;
    right = m.right ? bones.get(m.right) : undefined;
  }
  if (!left || !right) return null;

  const widthM = options.widthM ?? DEFAULT_PATCH_WIDTH_M;
  const meshes = skinnedMeshes(root);
  const flag = createShoulderPatch(PATCH_FOR_SIDE.right, widthM);
  const conae = createShoulderPatch(PATCH_FOR_SIDE.left, widthM);
  const radius = options.arms?.armRadiusM;
  const length = options.arms?.armLengthM ?? 0.55;
  place(flag, right, left, meshes, widthM, radius, length);
  place(conae, left, right, meshes, widthM, radius, length);
  return { flag, conae, nodes: { left, right } };
}
