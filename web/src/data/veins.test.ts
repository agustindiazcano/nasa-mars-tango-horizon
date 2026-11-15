import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fetchVeins, findVeinImage, parseVeins, veinAssetUrl } from "./veins";

const raw = JSON.parse(readFileSync(resolve(__dirname, "../../public/data/veins/index.json"), "utf8"));
const fixture = () => structuredClone(raw);

describe("published vein data", () => {
  it("loads all eight photos and heatmaps without substituting assets", () => {
    const data = parseVeins(raw);
    expect(data.images).toHaveLength(8);
    for (const image of data.images) {
      expect(existsSync(resolve(__dirname, "../../public/data/veins", image.image))).toBe(true);
      expect(existsSync(resolve(__dirname, "../../public/data/veins", image.heatmap!))).toBe(true);
    }
    expect(data.validation).toMatchObject({ precision: .7941, recall: .6585, roc_auc: .8453, n_images: 117 });
  });
  it("preserves zero probability and does not invent unknown waypoints", () => {
    const data = parseVeins(raw);
    expect(findVeinImage(data, "site-1")?.vein_probability).toBe(0);
    expect(findVeinImage(data, "unknown")).toBeUndefined();
    expect(findVeinImage(data, "WP-1")).toBeUndefined();
  });
  it.each([NaN, Infinity, -.1, 1.1, "0.8", null])("rejects invalid probability %s", (p) => {
    const r = fixture(); r.images[0].vein_probability = p;
    expect(() => parseVeins(r)).toThrow();
  });
  it("rejects invalid peak coordinates and duplicate waypoints", () => {
    const r = fixture(); r.images[0].peak.u = 1.1;
    expect(() => parseVeins(r)).toThrow();
    const d = fixture(); d.images[1].waypoint_id = d.images[0].waypoint_id;
    expect(() => parseVeins(d)).toThrow();
  });
  it("allows absent metrics/heatmap/peak without fabrication", () => {
    const r = fixture(); delete r.validation; delete r.images[0].heatmap; delete r.images[0].peak;
    const data = parseVeins(r);
    expect(data.validation.precision).toBeUndefined();
    expect(data.images[0].peak).toBeUndefined();
  });
  it.each(["../photo.jpg", "https://example.com/photo.jpg", "a.jpg?query", "/photo.jpg"])("rejects non-local asset %s", (name) => {
    expect(() => veinAssetUrl(name)).toThrow();
  });
  it("reports HTTP and malformed JSON failures without fallback predictions", async () => {
    await expect(fetchVeins(vi.fn().mockResolvedValue({ ok: false, status: 404 }))).rejects.toThrow("404");
    await expect(fetchVeins(vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))).rejects.toThrow();
  });
});
