import * as THREE from "three";

/**
 * Parachute: a gored canopy (alternating orange and white panels) with a scalloped rim and suspension lines that
 * meet at the payload (the origin of the group). `update` opens the canopy from a packed streamer and sways it.
 */

const GORES = 16;
const RADIUS = 2.4;
/** Height of the canopy attachment above the payload (lines run from the rim down to the origin). */
const LINE_LEN = 2.9;

export interface Parachute {
  group: THREE.Group;
  /** `inflate` 0 packed to 1 open; `timeS` drives a gentle sway. */
  update(inflate: number, timeS: number): void;
  /**
   * Deflates the canopy onto the ground: `k` 0 open to 1 lying flat beside the payload along local +x; `groundDy` is the
   * terrain height under the canopy centre relative to the payload base (the group origin).
   */
  collapse(k: number, groundDy?: number): void;
  dispose(): void;
}

/**
 * Ripstop nylon: panels alternate international orange and off-white, with dark seams between gores, a woven grid and
 * a little fabric noise. Returns the colour map and a matching bump map (null without a DOM, e.g. in tests).
 */
function makeFabric(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null {
  if (typeof document === "undefined") return null;
  const W = 1024;
  const H = 256;
  const colorCv = document.createElement("canvas");
  colorCv.width = W;
  colorCv.height = H;
  const bumpCv = document.createElement("canvas");
  bumpCv.width = W;
  bumpCv.height = H;
  const c = colorCv.getContext("2d")!;
  const b = bumpCv.getContext("2d")!;
  const gw = W / GORES;
  for (let g = 0; g < GORES; g++) {
    const orange = g % 2 === 0;
    const grad = c.createLinearGradient(0, 0, 0, H);
    if (orange) {
      grad.addColorStop(0, "#c8441a");
      grad.addColorStop(0.5, "#ec5f22");
      grad.addColorStop(1, "#f06a2a");
    } else {
      grad.addColorStop(0, "#d9d0c0");
      grad.addColorStop(0.5, "#f1e9da");
      grad.addColorStop(1, "#f7f0e4");
    }
    c.fillStyle = grad;
    c.fillRect(g * gw, 0, gw + 1, H);
  }
  // Ripstop grid: slightly darker threads every 6 px, heavier every 24 px.
  for (let x = 0; x < W; x += 6) {
    c.fillStyle = x % 24 === 0 ? "rgba(40,20,10,0.20)" : "rgba(40,20,10,0.07)";
    c.fillRect(x, 0, 1, H);
  }
  for (let y = 0; y < H; y += 6) {
    c.fillStyle = y % 24 === 0 ? "rgba(40,20,10,0.20)" : "rgba(40,20,10,0.07)";
    c.fillRect(0, y, W, 1);
  }
  // Seams and a soft shadow on each side of them.
  for (let g = 0; g <= GORES; g++) {
    const x = g * gw;
    c.fillStyle = "rgba(25,15,10,0.55)";
    c.fillRect(x - 1, 0, 2, H);
    const sh = c.createLinearGradient(x - 10, 0, x + 10, 0);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(0.5, "rgba(0,0,0,0.16)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sh;
    c.fillRect(x - 10, 0, 20, H);
  }
  // Reinforcement tape around the rim and the vent.
  c.fillStyle = "rgba(30,20,14,0.6)";
  c.fillRect(0, H - 10, W, 10);
  c.fillRect(0, 0, W, 8);
  // Fabric noise.
  const img = c.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  c.putImageData(img, 0, 0);

  b.fillStyle = "#808080";
  b.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 3) {
    b.fillStyle = x % 6 === 0 ? "#9a9a9a" : "#767676";
    b.fillRect(x, 0, 1, H);
  }
  for (let y = 0; y < H; y += 3) {
    b.fillStyle = y % 6 === 0 ? "#8e8e8e" : "#787878";
    b.fillRect(0, y, W, 1);
  }
  for (let g = 0; g <= GORES; g++) {
    b.fillStyle = "#404040";
    b.fillRect(g * gw - 1.5, 0, 3, H);
  }

  const map = new THREE.CanvasTexture(colorCv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(bumpCv);
  bump.wrapS = THREE.RepeatWrapping;
  bump.anisotropy = 8;
  return { map, bump };
}

export function buildParachute(): Parachute {
  const group = new THREE.Group();
  group.name = "parachute";

  // Canopy: a dome whose grid columns are the panels; each gore gets its own colour.
  const rings = 10;
  const cols = GORES * 3;
  const pos: number[] = [];
  const col: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const orange = new THREE.Color(0xff7a2f);
  const white = new THREE.Color(0xf6efe6);
  const phiMax = Math.PI * 0.5 * 0.92 + 0.12;
  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const phi = v * Math.PI * 0.5 * 0.92 + 0.12;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const th = u * Math.PI * 2;
      const gore = Math.floor(u * GORES) % GORES;
      const within = (u * GORES) % 1;
      // Scalloped rim: the cloth rises between the suspension lines. Panels bulge slightly outward.
      const scallop = r === rings ? Math.sin(within * Math.PI) * -0.16 : 0;
      const bulge = 1 + Math.sin(within * Math.PI) * 0.045 * Math.sin(v * Math.PI * 0.9);
      const rad = Math.sin(phi) * RADIUS * bulge;
      pos.push(Math.cos(th) * rad, Math.cos(phi) * RADIUS * 0.82 + scallop, Math.sin(th) * rad);
      const k = gore % 2 === 0 ? orange : white;
      col.push(k.r, k.g, k.b);
      uvs.push(u, 1 - v);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  let fabric: ReturnType<typeof makeFabric> = null;
  try {
    fabric = makeFabric();
  } catch {
    fabric = null; // a canvas without the needed 2D features: the vertex colours keep the gore pattern
  }
  const canopyMat = new THREE.MeshPhysicalMaterial({
    // With the fabric texture the vertex colours are not needed; without a DOM they keep the gore pattern.
    ...(fabric ? { map: fabric.map, bumpMap: fabric.bump, bumpScale: 1.2 } : { vertexColors: true }),
    side: THREE.DoubleSide,
    roughness: 0.82,
    metalness: 0,
    sheen: 0.8,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffd9b8),
    transparent: true,
    opacity: 0.96,
  });
  const canopy = new THREE.Mesh(geo, canopyMat);
  canopy.castShadow = true;

  // Suspension lines: from every gore seam on the rim to the payload. They live in the group frame and are rebuilt
  // each update so they stay attached to the rim while the canopy opens.
  const rimR = Math.sin(phiMax) * RADIUS;
  const rimY = Math.cos(phiMax) * RADIUS * 0.82 - 0.04;
  const linePts = new Float32Array(GORES * 6);
  const lineGeo = new THREE.BufferGeometry();
  const lineAttr = new THREE.BufferAttribute(linePts, 3);
  lineGeo.setAttribute("position", lineAttr);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe9e1d3, transparent: true, opacity: 0.85 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  const setLines = (kx: number, ky: number, ox = 0, lineY = LINE_LEN, oy = 0): void => {
    for (let i = 0; i < GORES; i++) {
      const th = (i / GORES) * Math.PI * 2;
      const o = i * 6;
      linePts[o] = ox + Math.cos(th) * rimR * kx;
      linePts[o + 1] = lineY + rimY * ky + oy;
      linePts[o + 2] = Math.sin(th) * rimR * kx;
      linePts[o + 3] = 0;
      linePts[o + 4] = 0;
      linePts[o + 5] = 0;
    }
    lineAttr.needsUpdate = true;
  };
  setLines(1, 1);

  // The canopy swings about its own base point; the group origin is the payload attachment.
  const swing = new THREE.Group();
  swing.add(canopy);
  swing.position.y = LINE_LEN;
  group.add(swing, lines);

  return {
    group,
    update(inflate, timeS) {
      const k = Math.max(0.05, Math.min(1, inflate));
      const ky = 0.35 + 0.65 * k;
      swing.scale.set(k, ky, k);
      setLines(k, ky);
      swing.rotation.z = Math.sin(timeS * 1.4) * 0.05 * k;
      swing.rotation.x = Math.cos(timeS * 1.1) * 0.04 * k;
    },
    collapse(k, groundDy = 0) {
      const u = Math.min(1, Math.max(0, k));
      // The canopy slides downwind, flattens and spreads; the lines trail from the payload to its rim.
      const sx = 1 + 0.45 * u;
      const sy = 1 - 0.93 * u;
      const ox = u * RADIUS * 1.5;
      const baseY = 0.06 + groundDy * u;
      swing.scale.set(sx, sy, sx);
      swing.position.set(ox, LINE_LEN * (1 - u) + baseY, 0);
      swing.rotation.set(0, 0, 0);
      setLines(sx, sy, ox, LINE_LEN * (1 - u), baseY);
    },
    dispose() {
      geo.dispose();
      fabric?.map.dispose();
      fabric?.bump.dispose();
      canopyMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    },
  };
}
