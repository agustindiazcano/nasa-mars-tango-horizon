import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_MODULE_FOOTPRINTS } from "@th/shared";
import { describe, expect, it } from "vitest";
import { BASE_MODULES } from "../baseProc";
import { modelFootprint, type ModelManifest } from "../modelLibrary";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.resolve(here, "../../../public/models/manifest.json"), "utf8"),
) as ModelManifest;

describe("base modules vs shared footprints", () => {
  it("uses the same offsets and footprints as BASE_MODULE_FOOTPRINTS", () => {
    for (const mod of BASE_MODULES) {
      const fp = BASE_MODULE_FOOTPRINTS.find((f) => f.id === mod.id);
      expect(fp, mod.id).toBeDefined();
      expect(mod.offset[0], mod.id).toBeCloseTo(fp!.offsetX, 6);
      expect(mod.offset[1], mod.id).toBeCloseTo(fp!.offsetZ, 6);
      expect(mod.footprint[0], mod.id).toBeCloseTo(fp!.widthM, 6);
      expect(mod.footprint[1], mod.id).toBeCloseTo(fp!.depthM, 6);
    }
  });

  it("keeps every model-backed module footprint within 5% of the scaled model box", () => {
    for (const mod of BASE_MODULES) {
      if (!mod.model) continue;
      const f = modelFootprint(mod.model, manifest, mod.modelYaw ?? 0, mod.modelMetres);
      expect(Math.abs(f.width - mod.footprint[0]) / mod.footprint[0], `${mod.id} width`).toBeLessThan(0.05);
      expect(Math.abs(f.depth - mod.footprint[1]) / mod.footprint[1], `${mod.id} depth`).toBeLessThan(0.05);
      expect(Math.abs(f.height - mod.height) / mod.height, `${mod.id} height`).toBeLessThan(0.05);
    }
  });
});
