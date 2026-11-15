/** Deterministic noise helpers shared by the procedural rock textures and geometry. */

/** 32-bit integer hash mapped to [0, 1). */
export function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash3(ix: number, iy: number, iz: number, seed: number): number {
  return hash2(ix + Math.imul(iz | 0, 0x1b873593), iy ^ Math.imul(iz | 0, 0x2545f491), seed);
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise in 3D, range [0, 1). */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const fz = smooth(z - z0);
  const c = (dx: number, dy: number, dz: number) => hash3(x0 + dx, y0 + dy, z0 + dz, seed);
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * fx;
  const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * fx;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * fx;
  const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * fx;
  const y0v = x00 + (x10 - x00) * fy;
  const y1v = x01 + (x11 - x01) * fy;
  return y0v + (y1v - y0v) * fz;
}

/** Fractal value noise in 3D, normalized to about [0, 1]. */
export function fbm3(x: number, y: number, z: number, octaves: number, seed: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Tileable 2D value noise: the lattice repeats every `period` cells. Range [0, 1). */
export function periodicNoise2(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const c = (dx: number, dy: number) => hash2(mod(x0 + dx, period), mod(y0 + dy, period), seed);
  const a = c(0, 0) + (c(1, 0) - c(0, 0)) * fx;
  const b = c(0, 1) + (c(1, 1) - c(0, 1)) * fx;
  return a + (b - a) * fy;
}

/** Tileable fractal noise for u, v in [0, 1) at `basePeriod` cells per tile. Range about [0, 1]. */
export function periodicFbm2(u: number, v: number, basePeriod: number, octaves: number, seed: number): number {
  let amp = 0.5;
  let period = basePeriod;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * periodicNoise2(u * period, v * period, period, seed + o * 57);
    norm += amp;
    amp *= 0.5;
    period *= 2;
  }
  return sum / norm;
}

/**
 * Tileable cellular (Worley) noise with `cells` x `cells` jittered points per tile.
 * Returns the distances to the nearest and second nearest point, in cell units.
 */
export function periodicWorley2(u: number, v: number, cells: number, seed: number): { f1: number; f2: number } {
  const x = u * cells;
  const y = v * cells;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  let f1 = Infinity;
  let f2 = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx;
      const gy = cy + dy;
      const wx = mod(gx, cells);
      const wy = mod(gy, cells);
      const px = gx + hash2(wx, wy, seed);
      const py = gy + hash2(wx, wy, seed + 7919);
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return { f1, f2 };
}

/** Small seeded PRNG (mulberry32), range [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
