// Offline GLB optimizer: raw scans -> web-sized GLBs + manifest.json.
// Usage: node optimize.mjs [inputDir] [outputDir] [name ...]
// Defaults: inputDir = $TH_RAW_ASSETS_DIR or ../../3d-mars-assets,
//           outputDir = ../../web/public/models. Names filter the run (without .glb).
import { readdirSync, mkdirSync, statSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  weld,
  prune,
  dedup,
  quantize,
  meshopt,
  textureCompress,
  compactPrimitive,
  getBounds,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const inputDir = resolve(args[0] ?? process.env.TH_RAW_ASSETS_DIR ?? join(here, "../../3d-mars-assets"));
const outputDir = resolve(args[1] ?? join(here, "../../web/public/models"));
const only = args.slice(2);

/** Per-model settings. Budgets follow docs/impl/23_3D_ASSETS_PIPELINE.md section 2. */
const PROP = { triangles: 40_000, texture: 1024, maxBytes: 2 * 1024 * 1024 };
const HERO = { triangles: 80_000, texture: 1024, maxBytes: 3 * 1024 * 1024 };
const CONFIG = {
  rocket: { ...HERO, role: "hero" },
  // Whole base complex seen from above: more detail and larger textures than a single prop.
  "conae-base-mars": { triangles: 100_000, texture: 2048, maxBytes: 4 * 1024 * 1024, role: "hero" },
  "astronaut-animated": {
    simplify: false,
    triangles: Infinity,
    texture: 1024,
    maxBytes: 4 * 1024 * 1024,
    role: "animated-astronaut",
    realHeightM: 1.7,
    anchor: "feet",
  },
  astronaut: {
    triangles: 100_000,
    texture: 2048,
    maxBytes: 5 * 1024 * 1024,
    role: "rigid-astronaut",
    realHeightM: 1.9,
    anchor: "center",
  },
};
const configFor = (name) => ({ role: "prop", anchor: "unknown", realHeightM: null, ...PROP, ...CONFIG[name] });

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

function triangleCount(doc) {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) n += (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3;
  return Math.round(n);
}

/** Attribute-aware simplification (keeps UV seams and normals) down to targetTris. */
function simplifyDoc(doc, targetTris) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const nrm = prim.getAttribute("NORMAL");
      const uv = prim.getAttribute("TEXCOORD_0");
      const idx = prim.getIndices();
      const positions = new Float32Array(pos.getArray());
      const indices = new Uint32Array(idx.getArray());
      const attrs = new Float32Array(pos.getCount() * 5);
      for (let i = 0; i < pos.getCount(); i++) {
        if (nrm) {
          attrs[i * 5] = nrm.getArray()[i * 3];
          attrs[i * 5 + 1] = nrm.getArray()[i * 3 + 1];
          attrs[i * 5 + 2] = nrm.getArray()[i * 3 + 2];
        }
        if (uv) {
          attrs[i * 5 + 3] = uv.getArray()[i * 2];
          attrs[i * 5 + 4] = uv.getArray()[i * 2 + 1];
        }
      }
      let [out] = MeshoptSimplifier.simplifyWithAttributes(
        indices,
        positions,
        3,
        attrs,
        5,
        [0.5, 0.5, 0.5, 1.0, 1.0],
        null,
        targetTris * 3,
        1.0, // error cap (relative to extent): the triangle target decides, not the error
        ["Permissive"], // allow collapses across UV seams, otherwise scans stall far above the target
      );
      // Seam-locked vertices can stall the attribute-aware pass above the target:
      // finish with a position-only pass (still no new vertices, so UVs stay on existing ones).
      if (out.length > targetTris * 3 * 1.02) {
        [out] = MeshoptSimplifier.simplify(out, positions, 3, targetTris * 3, 1.0, []);
      }
      idx.setArray(out);
      compactPrimitive(prim);
    }
  }
}

function describe(doc) {
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const b = getBounds(scene);
  const size = b.max.map((v, i) => v - b.min[i]);
  return {
    triangles: triangleCount(doc),
    boundingBox: { min: b.min.map(round), max: b.max.map(round), size: size.map(round) },
    heightM: round(size[1]),
    animations: root.listAnimations().map((a) => a.getName()),
    skinned: root.listSkins().length > 0,
    joints: root.listSkins().reduce((n, s) => n + s.listJoints().length, 0),
  };
}
const round = (v) => Math.round(v * 1000) / 1000;

mkdirSync(outputDir, { recursive: true });
const files = readdirSync(inputDir)
  .filter((f) => f.endsWith(".glb"))
  .filter((f) => only.length === 0 || only.includes(basename(f, ".glb")))
  .sort();
if (files.length === 0) throw new Error(`no .glb files found in ${inputDir}`);

const manifestPath = join(outputDir, "manifest.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { models: {} };
const models = { ...previous.models };

for (const file of files) {
  const name = basename(file, ".glb");
  const cfg = configFor(name);
  const src = join(inputDir, file);
  const t0 = Date.now();
  const doc = await io.read(src);
  const before = { triangles: triangleCount(doc), bytes: statSync(src).size };
  const info = describe(doc); // bounds of the untouched scan (quantization changes accessor ranges)

  if (cfg.simplify !== false) {
    await doc.transform(weld());
    simplifyDoc(doc, cfg.triangles);
  }
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [cfg.texture, cfg.texture], quality: 85 }),
    quantize({ quantizePosition: 14, quantizeTexcoord: 14, quantizeNormal: 10 }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );

  const out = join(outputDir, file);
  await io.write(out, doc);
  const bytes = statSync(out).size;
  info.triangles = triangleCount(doc);
  const heightM = cfg.realHeightM ?? info.heightM;
  models[name] = {
    file,
    role: cfg.role,
    bytes,
    triangles: info.triangles,
    triangleBudget: Number.isFinite(cfg.triangles) ? cfg.triangles : info.triangles,
    byteBudget: cfg.maxBytes,
    boundingBox: info.boundingBox,
    heightM,
    heightIsReal: cfg.realHeightM !== null,
    up: "+Y",
    front: "+Z",
    anchor: cfg.anchor,
    skinned: info.skinned,
    joints: info.joints,
    animations: info.animations,
    source: { bytes: before.bytes, triangles: before.triangles },
  };
  const ok = bytes <= cfg.maxBytes ? "ok" : "OVER BUDGET";
  console.log(
    `${name.padEnd(24)} ${String(before.triangles).padStart(8)} -> ${String(info.triangles).padStart(6)} tris  ` +
      `${(before.bytes / 1e6).toFixed(1).padStart(5)} -> ${(bytes / 1e6).toFixed(2)} MB  ${ok}  ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
}

const sorted = Object.fromEntries(Object.entries(models).sort(([a], [b]) => a.localeCompare(b)));
const totalBytes = Object.values(sorted).reduce((n, m) => n + m.bytes, 0);
writeFileSync(manifestPath, JSON.stringify({ version: 1, totalBytes, models: sorted }, null, 1) + "\n");
console.log(`total ${(totalBytes / 1e6).toFixed(2)} MB in ${Object.keys(sorted).length} models`);
