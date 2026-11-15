import { describe, expect, it } from "vitest";
import { formatCoordinates, validateTerrain } from "../../../../web/src/world/terrainValidation";

const meta = { height_px: 2048, size_m: 4000, product_id: "HiRISE", z_min_m: -4300, z_max_m: -3500, center_lat: -4.745, center_lon_e: 137.4 };
describe("frontend terrain input contract", () => {
  it("accepts the supported crop", () => expect(() => validateTerrain(meta, 4000)).not.toThrow());
  it.each([{ height_px: 0 }, { height_px: 8193 }, { size_m: 5000 }, { z_min_m: NaN }, { z_max_m: -5000 }, { center_lat: 91 }, { product_id: "" }])("rejects incompatible metadata %j", patch => {
    expect(() => validateTerrain({ ...meta, ...patch }, 4000)).toThrow();
  });
  it("formats hemispheres and east-positive longitudes including zero and wrapping", () => {
    expect(formatCoordinates(-4.745, 137.4)).toBe("4.7450S, 137.4000E");
    expect(formatCoordinates(4.745, -10)).toBe("4.7450N, 350.0000E");
    expect(formatCoordinates(0, 360)).toBe("0.0000N, 0.0000E");
  });
});
