// Splits the rotor geometry of web/public/models/drone-new.glb into independent pivot nodes so the runtime can spin it.
// The source scan fuses everything into one mesh. Each of the four coaxial rotor stacks has an upper and a lower
// two-blade rotor; triangles inside a vertical band and a horizontal radius around each hub move to their own mesh.
// Usage: node split-drone-rotors.mjs [in.glb] [out.glb] [--debug-angle=<rad>]
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO, Accessor } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { quantize, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const input = resolve(args[0] ?? join(here, "../../web/public/models/drone-new.glb"));
const output = resolve(args[1] ?? input);

/** Hubs in mesh-local units (normalized scan space), measured from the vertex density of the rotor discs. */
const HUBS = [
  { id: "fl", x: -0.73, z: -0.57, dir: 1 },
  { id: "fr", x: 0.74, z: -0.57, dir: -1 },
  { id: "bl", x: -0.73, z: 0.57, dir: -1 },
  { id: "br", x: 0.74, z: 0.57, dir: 1 },
];
/** Vertical bands of the upper and lower rotor planes. Neighbouring rotors counter-rotate; so do the two layers. */
const LAYERS = [
  { id: "up", y0: 0.14, y1: 0.25, yc: 0.18, dir: 1 },
  { id: "low", y0: -0.07, y1: 0.04, yc: -0.01, dir: -1 },
];
const RADIUS = Number(flags.radius ?? 0.5); // fused geometry: hub, motor bell and blade roots
const COMP_RADIUS = Number(flags.compRadius ?? 0.85); // separate blade pieces: the whole piece moves when its centre is this close

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});
const doc = await io.read(input);
const root = doc.getRoot();
const bodyNode = root.listNodes().find((n) => n.getMesh());
const bodyMesh = bodyNode.getMesh();
const prim = bodyMesh.listPrimitives()[0];
const idx = prim.getIndices().getArray();
const semantics = prim.listSemantics();
const attrs = Object.fromEntries(semantics.map((s) => [s, prim.getAttribute(s)]));
const pos = attrs.POSITION;
const n = pos.getCount();
const P = new Float32Array(n * 3);
{
  const e = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, e);
    P.set(e, i * 3);
  }
}

/** Group of a vertex: nearest hub within the radius and the layer band, or -1. */
const groupOf = (i, radius = RADIUS) => {
  const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
  let best = -1, bestD = radius;
  for (let h = 0; h < HUBS.length; h++) {
    const d = Math.hypot(x - HUBS[h].x, z - HUBS[h].z);
    if (d <= bestD) { best = h; bestD = d; }
  }
  if (best < 0) return -1;
  for (let l = 0; l < LAYERS.length; l++) if (y >= LAYERS[l].y0 && y <= LAYERS[l].y1) return best * LAYERS.length + l;
  return -1;
};
// Connected components of the whole mesh: a blade that is its own component moves as one piece even when its tip is
// farther than RADIUS from the hub.
const parent = new Int32Array(n).map((_, i) => i);
const find = (a) => {
  while (parent[a] !== a) {
    parent[a] = parent[parent[a]];
    a = parent[a];
  }
  return a;
};
for (let t = 0; t < idx.length; t += 3) {
  const a = find(idx[t]);
  parent[find(idx[t + 1])] = a;
  parent[find(idx[t + 2])] = a;
}
const compSize = new Map();
for (let i = 0; i < n; i++) compSize.set(find(i), (compSize.get(find(i)) ?? 0) + 1);
const giant = [...compSize.entries()].sort((a, b) => b[1] - a[1])[0][0];
// A non-giant component (a blade piece) joins the rotor whose hub is nearest to its centre when it is flat and inside
// one layer band. The check uses the centre only, so tips beyond the radius still move with their blade.
const stats = new Map();
for (let i = 0; i < n; i++) {
  const c = find(i);
  if (c === giant) continue;
  let st = stats.get(c);
  if (!st) stats.set(c, (st = { n: 0, x: 0, y: 0, z: 0, y0: 9, y1: -9 }));
  st.n++;
  st.x += P[i * 3];
  st.y += P[i * 3 + 1];
  st.z += P[i * 3 + 2];
  st.y0 = Math.min(st.y0, P[i * 3 + 1]);
  st.y1 = Math.max(st.y1, P[i * 3 + 1]);
}
const compGroup = new Map();
for (const [c, st] of stats) {
  if (st.y1 - st.y0 > 0.12) continue;
  const cx = st.x / st.n, cy = st.y / st.n, cz = st.z / st.n;
  let h = -1, hd = COMP_RADIUS;
  HUBS.forEach((hub, k) => {
    const d = Math.hypot(cx - hub.x, cz - hub.z);
    if (d < hd) { h = k; hd = d; }
  });
  const l = LAYERS.findIndex((L) => cy >= L.y0 && cy <= L.y1);
  if (h >= 0 && l >= 0) compGroup.set(c, h * LAYERS.length + l);
}

const triGroups = new Map();
const keep = [];
for (let t = 0; t < idx.length; t += 3) {
  const c = find(idx[t]);
  let g = c !== giant && compGroup.has(c) ? compGroup.get(c) : -1;
  if (g < 0) {
    const gs = [groupOf(idx[t]), groupOf(idx[t + 1]), groupOf(idx[t + 2])];
    if (gs[0] >= 0 && gs[0] === gs[1] && gs[1] === gs[2]) g = gs[0];
  }
  if (g >= 0) {
    if (!triGroups.has(g)) triGroups.set(g, []);
    triGroups.get(g).push(idx[t], idx[t + 1], idx[t + 2]);
  } else keep.push(idx[t], idx[t + 1], idx[t + 2]);
}

const buffer = root.listBuffers()[0];
const material = prim.getMaterial();
const makeMesh = (name, tris) => {
  const remap = new Map();
  const order = [];
  const out = new Uint32Array(tris.length);
  tris.forEach((v, k) => {
    if (!remap.has(v)) {
      remap.set(v, order.length);
      order.push(v);
    }
    out[k] = remap.get(v);
  });
  const mesh = doc.createMesh(name);
  const p = doc.createPrimitive().setMaterial(material);
  for (const [sem, acc] of Object.entries(attrs)) {
    const ncomp = acc.getElementSize();
    const arr = new Float32Array(order.length * ncomp);
    const e = new Array(ncomp).fill(0);
    order.forEach((v, k) => {
      acc.getElement(v, e);
      arr.set(e, k * ncomp);
    });
    p.setAttribute(sem, doc.createAccessor(`${name}_${sem}`).setType(acc.getType()).setArray(arr).setBuffer(buffer));
  }
  p.setIndices(doc.createAccessor(`${name}_idx`).setType(Accessor.Type.SCALAR).setArray(out).setBuffer(buffer));
  return mesh.addPrimitive(p);
};

// Body keeps everything that is not a rotor.
const body = makeMesh("drone_body", keep);
bodyNode.setMesh(body);
bodyMesh.dispose();

// Wrapper node keeps the scan transform; mesh nodes below it may be re-quantized without moving the pivots.
const wrapper = doc.createNode("drone").setTranslation(bodyNode.getTranslation()).setRotation(bodyNode.getRotation()).setScale(bodyNode.getScale());
bodyNode.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
const parentOfBody = bodyNode.getParentNode();
if (parentOfBody) parentOfBody.removeChild(bodyNode);
else doc.getRoot().getDefaultScene().removeChild(bodyNode);
(parentOfBody ?? doc.getRoot().getDefaultScene()).addChild(wrapper);
wrapper.addChild(bodyNode);

let spun = 0;
for (let h = 0; h < HUBS.length; h++) {
  for (let l = 0; l < LAYERS.length; l++) {
    const tris = triGroups.get(h * LAYERS.length + l);
    if (!tris || tris.length === 0) continue;
    const hub = HUBS[h], layer = LAYERS[l];
    const name = `rotor_${hub.id}_${layer.id}`;
    const pivot = doc.createNode(name).setTranslation([hub.x, layer.yc, hub.z]);
    // Direction (+1 / -1) is stored for the runtime, which reads it from the node extras.
    pivot.setExtras({ spinDir: hub.dir * layer.dir });
    if (flags["debug-angle"]) pivot.setRotation([0, Math.sin(Number(flags["debug-angle"]) / 2), 0, Math.cos(Number(flags["debug-angle"]) / 2)]);
    const child = doc.createNode(`${name}_mesh`).setMesh(makeMesh(name, tris)).setTranslation([-hub.x, -layer.yc, -hub.z]);
    pivot.addChild(child);
    wrapper.addChild(pivot);
    spun++;
    console.log(name, tris.length / 3, "triangles");
  }
}
console.log("body triangles", keep.length / 3, "rotors", spun);
await doc.transform(
  quantize({ quantizePosition: 14, quantizeTexcoord: 14, quantizeNormal: 10 }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
await io.write(output, doc);
console.log("wrote", output);
