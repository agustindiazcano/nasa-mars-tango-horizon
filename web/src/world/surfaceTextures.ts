import * as THREE from "three";

/**
 * Small procedural surface textures (canvas) for the vehicles and props built from boxes and cylinders: painted
 * metal with panel seams and rivets, tyres with tread, woven canvas. Each returns a colour map and a bump map, or null
 * without a DOM (tests). Textures are cached by their parameters.
 */

export interface SurfaceMaps {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

const cache = new Map<string, SurfaceMaps | null>();

function make(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, b: CanvasRenderingContext2D) => void, repeat: [number, number]): SurfaceMaps | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  if (typeof document === "undefined") {
    cache.set(key, null);
    return null;
  }
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const bv = document.createElement("canvas");
  bv.width = w;
  bv.height = h;
  draw(cv.getContext("2d")!, bv.getContext("2d")!);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(bv);
  for (const t of [map, bump]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
  }
  const out = { map, bump };
  cache.set(key, out);
  return out;
}

/** Deterministic pseudo random so the same texture is produced on every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Painted metal plates: panel seams, rivets, dust in the corners and fine scratches. */
export function panelMetal(base: string, seed = 7, repeat: [number, number] = [2, 2]): SurfaceMaps | null {
  return make(`panel:${base}:${seed}:${repeat}`, 512, 512, (c, b) => {
    const r = rng(seed);
    c.fillStyle = base;
    c.fillRect(0, 0, 512, 512);
    b.fillStyle = "#808080";
    b.fillRect(0, 0, 512, 512);
    // Plates of different sizes with slightly different tone.
    const cols = [0, 150, 340, 512];
    const rows = [0, 190, 310, 512];
    for (let j = 0; j < rows.length - 1; j++) {
      for (let i = 0; i < cols.length - 1; i++) {
        const tone = (r() - 0.5) * 26;
        c.fillStyle = tone > 0 ? `rgba(255,255,255,${tone / 255})` : `rgba(0,0,0,${-tone / 255})`;
        c.fillRect(cols[i], rows[j], cols[i + 1] - cols[i], rows[j + 1] - rows[j]);
      }
    }
    // Seams (dark line with a lighter edge) and rivets.
    c.lineWidth = 3;
    b.lineWidth = 5;
    for (const x of cols) {
      c.strokeStyle = "rgba(20,20,24,0.65)";
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 512);
      c.stroke();
      b.strokeStyle = "#383838";
      b.beginPath();
      b.moveTo(x, 0);
      b.lineTo(x, 512);
      b.stroke();
    }
    for (const y of rows) {
      c.strokeStyle = "rgba(20,20,24,0.65)";
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
      b.strokeStyle = "#383838";
      b.beginPath();
      b.moveTo(0, y);
      b.lineTo(512, y);
      b.stroke();
    }
    for (let j = 0; j < rows.length - 1; j++) {
      for (let i = 0; i < cols.length - 1; i++) {
        for (const [px, py] of [[10, 10], [-10, 10], [10, -10], [-10, -10]]) {
          const x = (px > 0 ? cols[i] : cols[i + 1]) + px;
          const y = (py > 0 ? rows[j] : rows[j + 1]) + py;
          c.fillStyle = "rgba(30,30,34,0.7)";
          c.beginPath();
          c.arc(x, y, 3.2, 0, Math.PI * 2);
          c.fill();
          b.fillStyle = "#c8c8c8";
          b.beginPath();
          b.arc(x, y, 3.2, 0, Math.PI * 2);
          b.fill();
        }
      }
    }
    // Scratches and a Mars dust veil toward the bottom edge.
    for (let k = 0; k < 90; k++) {
      c.strokeStyle = `rgba(255,255,255,${0.04 + r() * 0.08})`;
      c.lineWidth = 1;
      const x = r() * 512;
      const y = r() * 512;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 6);
      c.stroke();
    }
    const dust = c.createLinearGradient(0, 300, 0, 512);
    dust.addColorStop(0, "rgba(176,104,60,0)");
    dust.addColorStop(1, "rgba(176,104,60,0.42)");
    c.fillStyle = dust;
    c.fillRect(0, 300, 512, 212);
  }, repeat);
}

/** Tyre rubber with a herringbone tread; the tread runs around the tyre (u around, v across). */
export function tireTread(repeat: [number, number] = [6, 1]): SurfaceMaps | null {
  return make(`tire:${repeat}`, 256, 128, (c, b) => {
    c.fillStyle = "#1c1f23";
    c.fillRect(0, 0, 256, 128);
    b.fillStyle = "#707070";
    b.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * 256;
      for (const [y0, y1, dir] of [[0, 64, 1], [128, 64, -1]] as const) {
        c.strokeStyle = "#08090b";
        c.lineWidth = 9;
        c.beginPath();
        c.moveTo(x + 8, y0);
        c.lineTo(x + 8 + 22 * dir, y1);
        c.stroke();
        b.strokeStyle = "#202020";
        b.lineWidth = 11;
        b.beginPath();
        b.moveTo(x + 8, y0);
        b.lineTo(x + 8 + 22 * dir, y1);
        b.stroke();
      }
    }
    // Sidewall bands and a dusty look.
    c.fillStyle = "rgba(176,120,80,0.18)";
    c.fillRect(0, 0, 256, 128);
  }, repeat);
}

/** Woven canvas (stretcher bed): crossed threads, a centre seam and faded edges. */
export function wovenCanvas(base = "#a98a56"): SurfaceMaps | null {
  return make(`canvas:${base}`, 256, 256, (c, b) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 256, 256);
    b.fillStyle = "#808080";
    b.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 4) {
      c.fillStyle = i % 8 === 0 ? "rgba(60,40,20,0.22)" : "rgba(255,240,200,0.10)";
      c.fillRect(i, 0, 2, 256);
      c.fillRect(0, i, 256, 2);
      b.fillStyle = i % 8 === 0 ? "#9c9c9c" : "#707070";
      b.fillRect(i, 0, 2, 256);
      b.fillRect(0, i, 256, 2);
    }
    c.fillStyle = "rgba(50,35,20,0.5)";
    c.fillRect(126, 0, 4, 256);
    const edge = c.createLinearGradient(0, 0, 256, 0);
    edge.addColorStop(0, "rgba(40,25,10,0.35)");
    edge.addColorStop(0.1, "rgba(40,25,10,0)");
    edge.addColorStop(0.9, "rgba(40,25,10,0)");
    edge.addColorStop(1, "rgba(40,25,10,0.35)");
    c.fillStyle = edge;
    c.fillRect(0, 0, 256, 256);
  }, [1, 1]);
}

/** Applies a map pair to a standard material (no-op when the maps are null). */
export function applySurface<T extends THREE.MeshStandardMaterial>(mat: T, maps: SurfaceMaps | null, bumpScale = 1): T {
  if (!maps) return mat;
  mat.color.setHex(0xffffff); // the base colour is painted into the map
  mat.map = maps.map;
  mat.bumpMap = maps.bump;
  mat.bumpScale = bumpScale;
  mat.needsUpdate = true;
  return mat;
}
