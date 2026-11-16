import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatProvenanceUrl, parseProvenanceManifest } from "../../../../web/src/data/provenance.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "web", "public");
const DATA_DIR = path.join(PUBLIC_DIR, "data");
const MODELS_DIR = path.join(PUBLIC_DIR, "models");

function listFiles(dir: string, prefixBase: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, prefixBase));
    } else if (entry.isFile()) {
      out.push(path.relative(prefixBase, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

function sampleHeightBilinear(
  u16: Uint16Array,
  px: number,
  zMin: number,
  zMax: number,
  u: number,
  v: number,
): number {
  const fx = Math.max(0, Math.min(1, u)) * (px - 1);
  const fz = Math.max(0, Math.min(1, v)) * (px - 1);
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(px - 1, x0 + 1);
  const z1 = Math.min(px - 1, z0 + 1);
  const tx = fx - x0;
  const tz = fz - z0;

  const h00 = u16[z0 * px + x0] / 65535;
  const h10 = u16[z0 * px + x1] / 65535;
  const h01 = u16[z1 * px + x0] / 65535;
  const h11 = u16[z1 * px + x1] / 65535;
  const norm =
    h00 * (1 - tx) * (1 - tz) +
    h10 * tx * (1 - tz) +
    h01 * (1 - tx) * tz +
    h11 * tx * tz;
  return zMin + norm * (zMax - zMin);
}

function summarize(values: number[]): { mean: number; median: number; std: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return { mean, median, std: Math.sqrt(variance) };
}

describe("web/public data provenance manifest", () => {
  it("covers every runtime asset under web/public/data and web/public/models", () => {
    const rawProv = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "provenance.json"), "utf8"));
    const manifest = parseProvenanceManifest(rawProv);

    const dataFiles = listFiles(DATA_DIR, DATA_DIR).filter((rel) => rel !== "provenance.json");
    const modelFiles = fs.existsSync(MODELS_DIR) ? listFiles(MODELS_DIR, PUBLIC_DIR) : [];
    const expectedAssets = [...dataFiles, ...modelFiles].sort();

    expect(Object.keys(manifest).sort()).toEqual(expectedAssets);
    expect(manifest["terrain/hydration_meta.json"]).toBeDefined();
    expect(manifest["terrain/hydration_sites.json"]).toBeDefined();
    expect(manifest["terrain/hydration_1024.png"].vertical_datum_offset).toBeDefined();
    expect(manifest["terrain/hydration_unc_1024.png"]).toBeDefined();
    expect(manifest["veins/manifest.json"]).toBeDefined();
    expect(manifest["models/drone-new.glb"]).toBeDefined();
    expect(manifest["models/mro.glb"]).toBeDefined();

    for (const [key, entry] of Object.entries(manifest)) {
      expect(entry.source.length, `${key} source`).toBeGreaterThan(0);
      expect(entry.product_id.length, `${key} product_id`).toBeGreaterThan(0);
      expect(entry.transform.length, `${key} transform`).toBeGreaterThan(0);
      expect(entry.retrieved, `${key} retrieved`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (entry.url) {
        expect(formatProvenanceUrl(entry.url), `${key} url`).not.toBeNull();
      } else {
        expect(entry.datasets?.length ?? 0, `${key} datasets`).toBeGreaterThan(0);
      }
    }
  });
});

describe("CTX vs HiRISE vertical datum offset documentation", () => {
  it("matches bilinear sampling of height_2048.u16 against hydration_sites.json", () => {
    const meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "terrain", "meta.json"), "utf8")) as {
      height_px: number;
      z_min_m: number;
      z_max_m: number;
    };
    const hydMeta = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "terrain", "hydration_meta.json"), "utf8"),
    ) as {
      vertical_datum_offset: {
        datum_explanation: string;
        top_candidates_hirise_minus_ctx_dem: { n: number; mean_m: number; median_m: number; std_m: number };
        dan_in_scene_hirise_minus_ctx_dem: { n: number; mean_m: number; median_m: number; std_m: number };
        dan_in_scene_ctx_geoid_minus_ctx_dem: { n: number; mean_m: number };
        dan_in_scene_hirise_minus_ctx_geoid: { n: number; mean_m: number };
      };
    };
    const hydSites = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "terrain", "hydration_sites.json"), "utf8"),
    ) as {
      top_candidates: Array<{ u: number; v: number; elev_m: number }>;
      dan_measurements: Array<{ u: number; v: number; in_scene: boolean }>;
    };

    const rawBytes = fs.readFileSync(path.join(DATA_DIR, "terrain", "height_2048.u16"));
    const u16 = new Uint16Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength / 2);

    const topDiffs = hydSites.top_candidates.map((site) => {
      const hirise = sampleHeightBilinear(u16, meta.height_px, meta.z_min_m, meta.z_max_m, site.u, site.v);
      return hirise - site.elev_m;
    });
    const topStats = summarize(topDiffs);

    const danInScene = hydSites.dan_measurements.filter((d) => d.in_scene);
    const danHiriseElevs = danInScene.map((site) =>
      sampleHeightBilinear(u16, meta.height_px, meta.z_min_m, meta.z_max_m, site.u, site.v),
    );
    expect(danHiriseElevs.every((elev) => Number.isFinite(elev) && elev >= meta.z_min_m && elev <= meta.z_max_m)).toBe(true);

    const docTop = hydMeta.vertical_datum_offset.top_candidates_hirise_minus_ctx_dem;
    const docDan = hydMeta.vertical_datum_offset.dan_in_scene_hirise_minus_ctx_dem;
    const docGeoidShift = hydMeta.vertical_datum_offset.dan_in_scene_ctx_geoid_minus_ctx_dem;
    const docResidual = hydMeta.vertical_datum_offset.dan_in_scene_hirise_minus_ctx_geoid;

    expect(docTop.n).toBe(hydSites.top_candidates.length);
    expect(Math.abs(topStats.mean - docTop.mean_m)).toBeLessThan(0.05);
    expect(Math.abs(topStats.median - docTop.median_m)).toBeLessThan(0.05);
    expect(Math.abs(topStats.std - docTop.std_m)).toBeLessThan(0.05);
    expect(topStats.mean).toBeGreaterThan(585);
    expect(topStats.mean).toBeLessThan(595);

    expect(docDan.n).toBe(danInScene.length);
    expect(docGeoidShift.n).toBe(danInScene.length);
    expect(docResidual.n).toBe(danInScene.length);
    expect(Math.abs(docGeoidShift.mean_m + docResidual.mean_m - docDan.mean_m)).toBeLessThan(0.01);

    expect(hydMeta.vertical_datum_offset.datum_explanation).toContain("3396190");
    expect(hydMeta.vertical_datum_offset.datum_explanation).toContain("MOLA");
  });
});
