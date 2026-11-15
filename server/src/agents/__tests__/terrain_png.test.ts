import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  decodePng,
  heightAt,
  hydrationAt,
  meta,
  slopeAt,
  svfAt,
  terrainIdentity,
  thermalClassAt,
} from "../tools/terrainData.js";

function findTerrainDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "web/public/data/terrain"),
    path.resolve(process.cwd(), "../web/public/data/terrain"),
    path.resolve(process.cwd(), "../../web/public/data/terrain"),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, "meta.json"))) return dir;
  }
  throw new Error(`Unable to locate web/public/data/terrain from cwd ${process.cwd()}`);
}

const TERRAIN_DIR = findTerrainDir();

function assetPath(file: string): string {
  return path.join(TERRAIN_DIR, file);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodeGrayscalePngWithFilters(width: number, height: number, pixels: Uint8Array, filters: number[]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bitDepth
  ihdr[9] = 0; // grayscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width + 1));
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let y = 0; y < height; y++) {
    const filter = filters[y % filters.length];
    const rowOut = y * (width + 1);
    raw[rowOut] = filter;
    for (let x = 0; x < width; x++) {
      const val = pixels[y * width + x];
      const left = x > 0 ? pixels[y * width + x - 1] : 0;
      const up = y > 0 ? pixels[(y - 1) * width + x] : 0;
      const upLeft = y > 0 && x > 0 ? pixels[(y - 1) * width + x - 1] : 0;
      let diff = val;
      if (filter === 1) diff = (val - left) & 0xff;
      else if (filter === 2) diff = (val - up) & 0xff;
      else if (filter === 3) diff = (val - ((left + up) >> 1)) & 0xff;
      else if (filter === 4) diff = (val - paeth(left, up, upLeft)) & 0xff;
      raw[rowOut + 1 + x] = diff;
    }
  }

  return Buffer.concat([sig, makeChunk("IHDR", ihdr), makeChunk("IDAT", deflateSync(raw)), makeChunk("IEND", Buffer.alloc(0))]);
}

function samplePngBilinear(data: Uint8Array, n: number, sizeM: number, x: number, z: number, scale = 1, offset = 0): number {
  const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
  const half = sizeM / 2;
  const u = clamp((x + half) / sizeM, 0, 1);
  const v = clamp((z + half) / sizeM, 0, 1);
  const fx = u * (n - 1);
  const fy = v * (n - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(n - 1, x0 + 1);
  const y1 = Math.min(n - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const val = (idx: number) => offset + (data[idx] / 255) * scale;
  const v00 = val(y0 * n + x0);
  const v10 = val(y0 * n + x1);
  const v01 = val(y1 * n + x0);
  const v11 = val(y1 * n + x1);
  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
}

describe("terrainData PNG decoder and static raster lookups", () => {
  const slopePng = decodePng(readFileSync(assetPath("slope_1024.png")));
  const svfPng = decodePng(readFileSync(assetPath("svf_1024.png")));
  const thermalPng = decodePng(readFileSync(assetPath("thermal_class.png")));
  const hydPng = decodePng(readFileSync(assetPath("hydration_1024.png")));
  const hydUncPng = decodePng(readFileSync(assetPath("hydration_unc_1024.png")));
  const hydMeta = JSON.parse(readFileSync(assetPath("hydration_meta.json"), "utf8")) as {
    weh_min: number;
    weh_max: number;
    interval_width_max: number;
  };

  it("loads real static terrain assets from web/public/data/terrain/", () => {
    expect(terrainIdentity.status).toBe("ready");
    expect(meta.synthetic).toBe(false);
    expect(meta.size_m).toBe(4000);
    for (const img of [slopePng, svfPng, thermalPng, hydPng, hydUncPng]) {
      expect(img.width).toBe(1024);
      expect(img.height).toBe(1024);
      expect(img.data.length).toBe(1024 * 1024);
    }
  });

  it("matches slopeAt, svfAt, thermalClassAt, and hydrationAt against real decoded PNG rasters", () => {
    const sampleCoords: Array<[number, number]> = [
      [0, 0],
      [500, 500],
      [-1000, 1000],
      [-1800, -1500],
    ];

    for (const [x, z] of sampleCoords) {
      const expectedSlope = Number(samplePngBilinear(slopePng.data, 1024, meta.size_m, x, z, meta.slope_max_deg).toFixed(2));
      expect(slopeAt(x, z)).toBeCloseTo(expectedSlope, 2);

      const expectedSvf = Number(samplePngBilinear(svfPng.data, 1024, meta.size_m, x, z, 1).toFixed(3));
      const actualSvf = svfAt(x, z);
      expect(actualSvf).toBeGreaterThanOrEqual(0);
      expect(actualSvf).toBeLessThanOrEqual(1);
      expect(actualSvf).toBeCloseTo(expectedSvf, 3);

      const u = (x + meta.size_m / 2) / meta.size_m;
      const v = (z + meta.size_m / 2) / meta.size_m;
      const col = Math.floor(u * 1023);
      const row = Math.floor(v * 1023);
      const rawThermal = thermalPng.data[row * 1024 + col];
      const expectedThermal = rawThermal <= 2 ? rawThermal : rawThermal < 85 ? 0 : rawThermal < 170 ? 1 : 2;
      expect(thermalClassAt(x, z)).toBe(expectedThermal);

      const hyd = hydrationAt(x, z);
      const expectedHyd = Number(
        samplePngBilinear(hydPng.data, 1024, meta.size_m, x, z, hydMeta.weh_max - hydMeta.weh_min, hydMeta.weh_min).toFixed(2),
      );
      const expectedUnc = Number(
        samplePngBilinear(hydUncPng.data, 1024, meta.size_m, x, z, hydMeta.interval_width_max, 0).toFixed(2),
      );
      expect(hyd.source).toBe("hydration_model_v1");
      expect(hyd.slope_deg).toBe(slopeAt(x, z));
      expect(hyd.hydration_index).toBeCloseTo(expectedHyd, 2);
      expect(hyd.uncertainty_index).toBeCloseTo(expectedUnc, 2);
    }
  });

  it("clamps out-of-bounds world coordinates to the 4000x4000 m terrain boundary", () => {
    const half = meta.size_m / 2;

    expect(heightAt(-5000, -5000)).toBe(heightAt(-half, -half));
    expect(heightAt(5000, 5000)).toBe(heightAt(half, half));

    expect(slopeAt(-9999, -9999)).toBe(slopeAt(-half, -half));
    expect(slopeAt(9999, 9999)).toBe(slopeAt(half, half));

    expect(svfAt(-9999, 9999)).toBe(svfAt(-half, half));
    expect(svfAt(9999, -9999)).toBe(svfAt(half, -half));

    expect(thermalClassAt(-9999, -9999)).toBe(thermalClassAt(-half, -half));
    expect(thermalClassAt(9999, 9999)).toBe(thermalClassAt(half, half));

    expect(hydrationAt(-9999, -9999)).toEqual(hydrationAt(-half, -half));
    expect(hydrationAt(9999, 9999)).toEqual(hydrationAt(half, half));
  });

  it("reconstructs all PNG scanline filter modes (0..4) and rejects malformed buffers", () => {
    const width = 4;
    const height = 5;
    const pixels = new Uint8Array([
      10, 25, 40, 80,
      15, 35, 60, 120,
      50, 75, 110, 160,
      90, 130, 175, 220,
      12, 48, 96, 200,
    ]);
    const pngBuf = encodeGrayscalePngWithFilters(width, height, pixels, [0, 1, 2, 3, 4]);
    const decoded = decodePng(pngBuf);
    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect(Array.from(decoded.data)).toEqual(Array.from(pixels));

    expect(() => decodePng(Buffer.from("not-a-png"))).toThrow("Invalid PNG signature");
    expect(() => decodePng(pngBuf.subarray(0, 20))).toThrow("Invalid PNG signature");
  });
});
