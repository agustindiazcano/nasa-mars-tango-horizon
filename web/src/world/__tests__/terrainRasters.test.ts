import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatCoordinates, validateTerrain } from "../terrainValidation";
import {
  DEFAULT_HYDRATION_META,
  decodeHydrationByte,
  decodeHydrationUncByte,
  decodeSlopeByte,
  decodeSvfByte,
  decodeThermalClassByte,
  fillLayerRgba,
  formatHydrationIndex,
  parseHydrationMeta,
  parseHydrationSites,
} from "../terrainRasters";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TERRAIN_DATA_DIR = path.resolve(__dirname, "../../../../web/public/data/terrain");

describe("formatCoordinates & terrain metadata", () => {
  it("prints S for negative latitudes and N for zero/positive latitudes", () => {
    expect(formatCoordinates(-4.5, 137.4)).toBe("4.5000S, 137.4000E");
    expect(formatCoordinates(-4.745, 137.4)).toBe("4.7450S, 137.4000E");
    expect(formatCoordinates(4.745, -10)).toBe("4.7450N, 350.0000E");
    expect(formatCoordinates(0, 360)).toBe("0.0000N, 0.0000E");
    expect(formatCoordinates(-0, 0)).toBe("0.0000N, 0.0000E");
    expect(formatCoordinates(Number.NaN, 137.4)).toBe("--");
  });

  it("validates HiRISE Gale Crater anchor metadata", () => {
    const rawMeta = JSON.parse(readFileSync(path.join(TERRAIN_DATA_DIR, "meta.json"), "utf8"));
    expect(() => validateTerrain(rawMeta, 4000)).not.toThrow();
    expect(rawMeta.center_lat).toBeCloseTo(-4.745, 3);
    expect(rawMeta.center_lon_e).toBeCloseTo(137.4, 3);
  });
});

describe("real hydration metadata & 377 MSL DAN stations", () => {
  it("parses real hydration_meta.json with dimensionless units", () => {
    const raw = JSON.parse(readFileSync(path.join(TERRAIN_DATA_DIR, "hydration_meta.json"), "utf8"));
    const meta = parseHydrationMeta(raw);
    expect(meta.weh_min).toBeCloseTo(3.1406, 4);
    expect(meta.weh_max).toBeCloseTo(4.5024, 4);
    expect(meta.interval_width_max).toBeCloseTo(1.7439, 4);
    expect(meta.units).toContain("dimensionless");
    expect(meta.validation?.n_points).toBe(1567);
    expect(meta.validation?.spearman_blocked_cv).toBeGreaterThan(0.5);
  });

  it("extracts all 377 in-scene DAN stations from hydration_sites.json", () => {
    const raw = JSON.parse(readFileSync(path.join(TERRAIN_DATA_DIR, "hydration_sites.json"), "utf8"));
    const parsed = parseHydrationSites(raw);
    expect(parsed.total_measurements).toBe(1567);
    expect(parsed.dan_in_scene).toHaveLength(377);
    for (const st of parsed.dan_in_scene) {
      expect(st.in_scene).toBe(true);
      expect(Math.abs(st.x)).toBeLessThanOrEqual(2000);
      expect(Math.abs(st.z)).toBeLessThanOrEqual(2000);
      expect(Number.isFinite(st.hydration_index)).toBe(true);
      expect(st.hydration_index).toBeGreaterThan(0);
    }
  });

  it("rejects malformed hydration payloads", () => {
    expect(() => parseHydrationMeta({ weh_min: 5, weh_max: 2, interval_width_max: 1 })).toThrow();
    expect(() => parseHydrationSites({ dan_measurements: null })).toThrow();
  });

  it("formats hydration index without percentage or wt% labels", () => {
    const formatted = formatHydrationIndex(3.467, 2);
    expect(formatted).toBe("3.47 (index)");
    expect(formatted).not.toMatch(/%|wt/i);
    expect(formatHydrationIndex(Number.NaN)).toBe("--");
  });
});

describe("static raster decoders and RGBA layer synthesis", () => {
  it("decodes slope, svf, thermal class, hydration index, and uncertainty bytes", () => {
    expect(decodeSlopeByte(0, 45)).toBe(0);
    expect(decodeSlopeByte(255, 45)).toBe(45);
    expect(decodeSvfByte(255)).toBe(1);
    expect(decodeThermalClassByte(0)).toBe(0);
    expect(decodeThermalClassByte(127)).toBe(1);
    expect(decodeThermalClassByte(255)).toBe(2);

    const meta = { ...DEFAULT_HYDRATION_META, weh_min: 3.1406, weh_max: 4.5024, interval_width_max: 1.7439 };
    expect(decodeHydrationByte(0, meta)).toBeCloseTo(3.1406, 4);
    expect(decodeHydrationByte(255, meta)).toBeCloseTo(4.5024, 4);
    expect(decodeHydrationUncByte(0, meta)).toBe(0);
    expect(decodeHydrationUncByte(255, meta)).toBeCloseTo(1.7439, 4);
  });

  it("renders slope, thermal, radiation, hydration, and hydration_unc RGBA buffers cleanly", () => {
    const n = 2;
    const input = {
      n,
      slopeDeg: new Float32Array([2, 12, 22, 32]),
      svf: new Float32Array([0.55, 0.7, 0.85, 0.99]),
      thermal: new Uint8Array([0, 1, 2, 1]),
      hydration: new Float32Array([3.14, 3.5, 4.0, 4.5]),
      hydrationUnc: new Float32Array([0.1, 0.5, 1.0, 1.7]),
      hydrationMin: 3.14,
      hydrationMax: 4.5,
      hydrationUncMax: 1.74,
      heightM: new Float32Array([0, 2, 4, 6]),
      heightGridN: n,
      realRasters: true,
    };

    const out = new Uint8Array(n * n * 4);
    fillLayerRgba("slope", input, out);
    // Pixel 0 (<8 deg) is green; pixel 3 (>=26 deg) is red
    expect(out[1]).toBeGreaterThan(out[0]);
    expect(out[12]).toBeGreaterThan(out[13]);

    fillLayerRgba("thermal", input, out);
    // Class 0 blue > red; Class 2 red > blue
    expect(out[2]).toBeGreaterThan(out[0]);
    expect(out[8]).toBeGreaterThan(out[10]);

    fillLayerRgba("hydration", input, out);
    // High hydration has higher blue/cyan than low hydration
    expect(out[14]).toBeGreaterThan(out[2]);

    fillLayerRgba("hydration_unc", input, out);
    // High uncertainty has higher red than low uncertainty
    expect(out[12]).toBeGreaterThan(out[0]);
  });
});
