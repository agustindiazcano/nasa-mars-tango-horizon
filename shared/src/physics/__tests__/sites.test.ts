import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ASTRONAUT_START,
  BASE_MODULE_FOOTPRINTS,
  BASE_ORIGIN,
  CURIOSITY_TRAVERSE,
  FLEET_START_OFFSETS,
  LAUNCH_SITE_COORD,
  MANIP_TARGETS,
  RESCUE_PIT,
  RESCUE_PIT_AXIS,
  RESCUE_SITE,
  pitSurfaceOffsetAt,
  MISSION_SITES,
  MISSION_SITES_BY_ID,
  fleetStartPos,
  getMissionSite,
  planRoute,
  terrainFromThermalClass,
} from "../index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const TERRAIN_DIR = path.join(REPO_ROOT, "web/public/data/terrain");

interface TerrainMeta {
  size_m: number;
  height_px: number;
  z_min_m: number;
  z_max_m: number;
  slope_max_deg: number;
}

interface DanMeasurement {
  sol: number;
  lon: number;
  lat: number;
  x: number;
  z: number;
  in_scene: boolean;
  weh: number;
  weh_err: number;
  duration_s: number;
}

interface DecodedPng {
  width: number;
  height: number;
  channels: number;
  data: Uint8Array;
}

function decodePng(buf: Buffer): DecodedPng {
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    }
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 6 ? 4 : 1;
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i++) {
      const x = raw[rowStart + i];
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = y > 0 && i >= channels ? out[(y - 1) * stride + i - channels] : 0;
      let v = x;
      if (filter === 1) v = (x + a) & 255;
      else if (filter === 2) v = (x + b) & 255;
      else if (filter === 3) v = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) v = (x + paeth(a, b, c)) & 255;
      out[y * stride + i] = v;
    }
  }
  return { width, height, channels, data: out };
}

function loadTerrainAssets() {
  const meta = JSON.parse(fs.readFileSync(path.join(TERRAIN_DIR, "meta.json"), "utf8")) as TerrainMeta;
  const heightBuf = fs.readFileSync(path.join(TERRAIN_DIR, "height_2048.u16"));
  const slopePng = decodePng(fs.readFileSync(path.join(TERRAIN_DIR, "slope_1024.png")));
  const svfPng = decodePng(fs.readFileSync(path.join(TERRAIN_DIR, "svf_1024.png")));
  const tcPng = decodePng(fs.readFileSync(path.join(TERRAIN_DIR, "thermal_class.png")));
  const hyd = JSON.parse(fs.readFileSync(path.join(TERRAIN_DIR, "hydration_sites.json"), "utf8")) as {
    dan_measurements: DanMeasurement[];
  };
  const half = meta.size_m / 2;
  const nPx = meta.height_px;
  const mPerPx = meta.size_m / (nPx - 1);

  const heightAt = (wx: number, wz: number) => {
    const u = Math.min(1, Math.max(0, (wx + half) / meta.size_m));
    const v = Math.min(1, Math.max(0, (wz + half) / meta.size_m));
    const fx = u * (nPx - 1);
    const fy = v * (nPx - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(nPx - 1, x0 + 1);
    const y1 = Math.min(nPx - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const readM = (px: number, py: number) => {
      const u16 = heightBuf.readUInt16LE((py * nPx + px) * 2);
      return (u16 / 65535) * (meta.z_max_m - meta.z_min_m) + meta.z_min_m;
    };
    const z00 = readM(x0, y0);
    const z10 = readM(x1, y0);
    const z01 = readM(x0, y1);
    const z11 = readM(x1, y1);
    return (z00 * (1 - tx) + z10 * tx) * (1 - ty) + (z01 * (1 - tx) + z11 * tx) * ty;
  };

  const demSlopeDegAt = (wx: number, wz: number) => {
    const step = mPerPx;
    const dzdx = (heightAt(wx + step, wz) - heightAt(wx - step, wz)) / (2 * step);
    const dzdz = (heightAt(wx, wz + step) - heightAt(wx, wz - step)) / (2 * step);
    return (Math.atan(Math.hypot(dzdx, dzdz)) * 180) / Math.PI;
  };

  const mapSlopeDegAt = (wx: number, wz: number) => {
    const u = Math.min(1, Math.max(0, (wx + half) / meta.size_m));
    const v = Math.min(1, Math.max(0, (wz + half) / meta.size_m));
    const px = Math.min(slopePng.width - 1, Math.max(0, Math.round(u * (slopePng.width - 1))));
    const py = Math.min(slopePng.height - 1, Math.max(0, Math.round(v * (slopePng.height - 1))));
    return (slopePng.data[(py * slopePng.width + px) * slopePng.channels] / 255) * meta.slope_max_deg;
  };

  return { meta, hyd, svfPng, tcPng, heightAt, demSlopeDegAt, mapSlopeDegAt };
}

describe("Canonical mission sites and flat base site (B34)", () => {
  const assets = loadTerrainAssets();

  it("places every base module footprint, astronaut, fleet start, and manip target on <5 deg real HiRISE DEM slope", () => {
    const checkPoint = (label: string, x: number, z: number) => {
      const mapSlope = assets.mapSlopeDegAt(x, z);
      const demSlope = assets.demSlopeDegAt(x, z);
      expect(mapSlope, `${label} slope_1024.png at (${x}, ${z})`).toBeLessThan(5);
      expect(demSlope, `${label} height_2048.u16 slope at (${x}, ${z})`).toBeLessThan(5);
    };

    checkPoint("BASE_ORIGIN", BASE_ORIGIN.x, BASE_ORIGIN.z);
    checkPoint("ASTRONAUT_START", ASTRONAUT_START.x, ASTRONAUT_START.z);

    for (const mod of BASE_MODULE_FOOTPRINTS) {
      const cx = BASE_ORIGIN.x + mod.offsetX;
      const cz = BASE_ORIGIN.z + mod.offsetZ;
      const hw = mod.widthM / 2;
      const hd = mod.depthM / 2;
      const stepsX = Math.max(2, Math.ceil(mod.widthM / 4));
      const stepsZ = Math.max(2, Math.ceil(mod.depthM / 4));
      for (let ix = 0; ix <= stepsX; ix++) {
        for (let iz = 0; iz <= stepsZ; iz++) {
          const sx = cx - hw + (ix / stepsX) * mod.widthM;
          const sz = cz - hd + (iz / stepsZ) * mod.depthM;
          checkPoint(`module ${mod.id}`, sx, sz);
        }
      }
    }

    for (const id of Object.keys(FLEET_START_OFFSETS)) {
      const pos = fleetStartPos(id);
      checkPoint(`fleet ${id}`, pos.x, pos.z);
    }

    for (const t of MANIP_TARGETS) {
      checkPoint(`target ${t.id}`, t.x, t.z);
    }
  });

  it("derives S1-S4 from real in_scene MSL DAN measurements in hydration_sites.json", () => {
    expect(MISSION_SITES).toHaveLength(4);
    for (const site of MISSION_SITES) {
      const dan = assets.hyd.dan_measurements[site.danIndex];
      expect(dan, `${site.id} DAN index ${site.danIndex}`).toBeDefined();
      expect(dan.in_scene).toBe(true);
      expect(site.evidenceKind).toBe("dan_measurement");
      expect(site.sol).toBe(dan.sol);
      expect(site.x).toBe(dan.x);
      expect(site.z).toBe(dan.z);
      expect(site.lon).toBe(dan.lon);
      expect(site.lat).toBe(dan.lat);
      expect(site.weh).toBe(dan.weh);
      expect(site.wehErr).toBe(dan.weh_err);
      expect(site.durationS).toBe(dan.duration_s);
      expect(getMissionSite(site.id)).toBe(site);
      expect(getMissionSite(site.number)).toBe(site);
      expect(MISSION_SITES_BY_ID[site.id]).toBe(site);
    }
  });

  it("derives CURIOSITY_TRAVERSE chronologically from in_scene DAN measurements", () => {
    expect(CURIOSITY_TRAVERSE.length).toBeGreaterThanOrEqual(12);
    let prevSol = -1;
    for (const wp of CURIOSITY_TRAVERSE) {
      const dan = assets.hyd.dan_measurements[wp.danIndex];
      expect(dan).toBeDefined();
      expect(dan.in_scene).toBe(true);
      expect(wp.sol).toBe(dan.sol);
      expect(wp.sol).toBeGreaterThanOrEqual(prevSol);
      prevSol = wp.sol;
      expect(wp.x).toBe(dan.x);
      expect(wp.z).toBe(dan.z);
      expect(wp.lon).toBe(dan.lon);
      expect(wp.lat).toBe(dan.lat);
      expect(wp.weh).toBe(dan.weh);
    }
  });

  it("confirms all S1-S4 sites are A* reachable from BASE_ORIGIN within 20 deg slope", () => {
    const n = 256;
    const cellM = assets.meta.size_m / n;
    const half = assets.meta.size_m / 2;
    const z = new Float32Array(n * n);
    const terrain = new Float32Array(n * n);
    const doseRel = new Float32Array(n * n);
    for (let gz = 0; gz < n; gz++) {
      for (let gx = 0; gx < n; gx++) {
        const wx = -half + (gx + 0.5) * cellM;
        const wz = -half + (gz + 0.5) * cellM;
        z[gz * n + gx] = assets.heightAt(wx, wz);
        const u = (wx + half) / assets.meta.size_m;
        const v = (wz + half) / assets.meta.size_m;
        const tx = Math.min(assets.tcPng.width - 1, Math.max(0, Math.round(u * (assets.tcPng.width - 1))));
        const ty = Math.min(assets.tcPng.height - 1, Math.max(0, Math.round(v * (assets.tcPng.height - 1))));
        const tcRaw = assets.tcPng.data[(ty * assets.tcPng.width + tx) * assets.tcPng.channels];
        const tcClass: 0 | 1 | 2 = tcRaw === 1 ? 1 : tcRaw === 2 ? 2 : 0;
        terrain[gz * n + gx] = terrainFromThermalClass(tcClass);
        const sx = Math.min(assets.svfPng.width - 1, Math.max(0, Math.round(u * (assets.svfPng.width - 1))));
        const sy = Math.min(assets.svfPng.height - 1, Math.max(0, Math.round(v * (assets.svfPng.height - 1))));
        doseRel[gz * n + gx] = assets.svfPng.data[(sy * assets.svfPng.width + sx) * assets.svfPng.channels] / 255;
      }
    }
    const grid = { n, cellM, z, terrain, doseRel };
    const idxAt = (wx: number, wz: number) => {
      const gx = Math.min(n - 1, Math.max(0, Math.floor((wx + half) / cellM)));
      const gz = Math.min(n - 1, Math.max(0, Math.floor((wz + half) / cellM)));
      return gz * n + gx;
    };
    const startIdx = idxAt(BASE_ORIGIN.x, BASE_ORIGIN.z);
    for (const site of MISSION_SITES) {
      const res = planRoute(grid, startIdx, idxAt(site.x, site.z), {
        bodyKg: 80,
        loadKg: 60,
        speed: 1.0,
        maxSlopeDeg: 20,
        doseWeight: 0.25,
      });
      expect(res, `${site.id} should be reachable from BASE_ORIGIN`).not.toBeNull();
      expect(res!.distanceM).toBeGreaterThan(0);
    }
  });
});

describe("LAUNCH_SITE_COORD", () => {
  it("sits 0.9-1.9 km from the base inside the 4 km scene", () => {
    const d = Math.hypot(LAUNCH_SITE_COORD.x - BASE_ORIGIN.x, LAUNCH_SITE_COORD.z - BASE_ORIGIN.z);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1900);
    expect(Math.abs(LAUNCH_SITE_COORD.x)).toBeLessThan(1900);
    expect(Math.abs(LAUNCH_SITE_COORD.z)).toBeLessThan(1900);
  });

  it("has under 8 m relief within 70 m on the real HiRISE DEM", () => {
    const n = 2048;
    const meta = JSON.parse(fs.readFileSync(path.join(TERRAIN_DIR, "meta.json"), "utf8")) as {
      z_min_m: number;
      z_max_m: number;
    };
    const buf = fs.readFileSync(path.join(TERRAIN_DIR, "height_2048.u16"));
    const raw = new Uint16Array(buf.buffer, buf.byteOffset, n * n);
    const span = meta.z_max_m - meta.z_min_m;
    const ci = Math.round((LAUNCH_SITE_COORD.x / 4000 + 0.5) * (n - 1));
    const cj = Math.round((LAUNCH_SITE_COORD.z / 4000 + 0.5) * (n - 1));
    const r = Math.round(70 / (4000 / (n - 1)));
    let lo = Infinity;
    let hi = -Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (di * di + dj * dj > r * r) continue;
        const h = meta.z_min_m + (raw[(cj + dj) * n + ci + di] / 65535) * span;
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    }
    expect(hi - lo).toBeLessThan(8);
  });
});

describe("RESCUE_SITE", () => {
  const n = 2048;
  const meta = JSON.parse(fs.readFileSync(path.join(TERRAIN_DIR, "meta.json"), "utf8")) as {
    size_m: number;
    z_min_m: number;
    z_max_m: number;
  };
  const buf = fs.readFileSync(path.join(TERRAIN_DIR, "height_2048.u16"));
  const raw = new Uint16Array(buf.buffer, buf.byteOffset, n * n);
  const span = meta.z_max_m - meta.z_min_m;
  const mpp = meta.size_m / (n - 1);
  const hAt = (x: number, z: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.round((x / meta.size_m + 0.5) * (n - 1))));
    const j = Math.min(n - 1, Math.max(0, Math.round((z / meta.size_m + 0.5) * (n - 1))));
    return meta.z_min_m + (raw[j * n + i] / 65535) * span;
  };
  const slopeDeg = (x: number, z: number) => {
    const dx = (hAt(x + mpp, z) - hAt(x - mpp, z)) / (2 * mpp);
    const dz = (hAt(x, z + mpp) - hAt(x, z - mpp)) / (2 * mpp);
    return (Math.atan(Math.hypot(dx, dz)) * 180) / Math.PI;
  };

  it("sits 1.5-2.5 km from the base inside the scene", () => {
    const d = Math.hypot(RESCUE_SITE.x - BASE_ORIGIN.x, RESCUE_SITE.z - BASE_ORIGIN.z);
    expect(d).toBeGreaterThan(1500);
    expect(d).toBeLessThan(2500);
    expect(Math.abs(RESCUE_SITE.x)).toBeLessThan(1900);
    expect(Math.abs(RESCUE_SITE.z)).toBeLessThan(1900);
  });

  it("is flat within 35 m on the real HiRISE DEM", () => {
    let lo = Infinity;
    let hi = -Infinity;
    let maxSlope = 0;
    for (let dx = -35; dx <= 35; dx += 3) {
      for (let dz = -35; dz <= 35; dz += 3) {
        if (dx * dx + dz * dz > 35 * 35) continue;
        const h = hAt(RESCUE_SITE.x + dx, RESCUE_SITE.z + dz);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
        maxSlope = Math.max(maxSlope, slopeDeg(RESCUE_SITE.x + dx, RESCUE_SITE.z + dz));
      }
    }
    expect(hi - lo).toBeLessThan(2);
    expect(maxSlope).toBeLessThan(6);
  });

  it("is reachable from the base over terrain at or below 18 deg", () => {
    const cell = 8;
    const m = Math.floor(meta.size_m / cell);
    const half = meta.size_m / 2;
    const center = (i: number) => -half + (i + 0.5) * cell;
    const idx = (x: number, z: number) => Math.floor((z + half) / cell) * m + Math.floor((x + half) / cell);
    const passable = new Uint8Array(m * m);
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) passable[j * m + i] = slopeDeg(center(i), center(j)) <= 18 ? 1 : 0;
    const seen = new Uint8Array(m * m);
    const queue = [idx(BASE_ORIGIN.x, BASE_ORIGIN.z)];
    seen[queue[0]] = 1;
    for (let h = 0; h < queue.length; h++) {
      const ci = queue[h] % m;
      const cj = Math.floor(queue[h] / m);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= m || nj >= m) continue;
          const k = nj * m + ni;
          if (seen[k] || !passable[k]) continue;
          seen[k] = 1;
          queue.push(k);
        }
      }
    }
    expect(seen[idx(RESCUE_SITE.x, RESCUE_SITE.z)]).toBe(1);
    for (let a = 0; a < 8; a++) {
      const rx = RESCUE_SITE.x + 30 * Math.cos((a * Math.PI) / 4);
      const rz = RESCUE_SITE.z + 30 * Math.sin((a * Math.PI) / 4);
      expect(seen[idx(rx, rz)], `approach ring ${a}`).toBe(1);
    }
  });
});

describe("RESCUE_PIT access ramp", () => {
  const at = (sAlong: number, w = 0) => ({
    x: RESCUE_SITE.x + RESCUE_PIT_AXIS.x * sAlong - RESCUE_PIT_AXIS.z * w,
    z: RESCUE_SITE.z + RESCUE_PIT_AXIS.z * sAlong + RESCUE_PIT_AXIS.x * w,
  });
  const off = (sAlong: number, w = 0) => pitSurfaceOffsetAt(at(sAlong, w).x, at(sAlong, w).z);

  it("points the axis at the base", () => {
    expect(Math.hypot(RESCUE_PIT_AXIS.x, RESCUE_PIT_AXIS.z)).toBeCloseTo(1, 9);
    const toBase = { x: BASE_ORIGIN.x - RESCUE_SITE.x, z: BASE_ORIGIN.z - RESCUE_SITE.z };
    expect(toBase.x * RESCUE_PIT_AXIS.x + toBase.z * RESCUE_PIT_AXIS.z).toBeGreaterThan(1000);
  });

  it("is 0 outside, the floor at -depth, and a 27 deg slope in the ramp lane", () => {
    expect(off(RESCUE_PIT.radiusM + 1)).toBe(0);
    expect(off(-4)).toBe(-RESCUE_PIT.depthM);
    expect(off(0, 4)).toBe(-RESCUE_PIT.depthM);
    expect(off(4.5)).toBeGreaterThan(-0.3);
    const slope = Math.atan((off(2) - off(0)) / 2) * (180 / Math.PI);
    expect(slope).toBeCloseTo(RESCUE_PIT.rampSlopeDeg, 3);
    expect(off(-2)).toBeLessThan(off(0));
    expect(off(-2)).toBeGreaterThan(-RESCUE_PIT.depthM);
  });
});
