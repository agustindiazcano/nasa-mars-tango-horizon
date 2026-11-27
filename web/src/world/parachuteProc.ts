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
  dispose(): void;
}

export function buildParachute(): Parachute {
  const group = new THREE.Group();
  group.name = "parachute";

  // Canopy: a dome whose grid columns are the panels; each gore gets its own colour.
  const rings = 10;
  const cols = GORES * 3;
  const pos: number[] = [];
  const col: number[] = [];
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
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const canopyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.75,
    metalness: 0,
    transparent: true,
    opacity: 0.94,
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
  const setLines = (kx: number, ky: number): void => {
    for (let i = 0; i < GORES; i++) {
      const th = (i / GORES) * Math.PI * 2;
      const o = i * 6;
      linePts[o] = Math.cos(th) * rimR * kx;
      linePts[o + 1] = LINE_LEN + rimY * ky;
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
    dispose() {
      geo.dispose();
      canopyMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    },
  };
}
