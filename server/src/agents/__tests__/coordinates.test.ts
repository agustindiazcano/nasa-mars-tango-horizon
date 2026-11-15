import { describe, expect, it } from "vitest";
import { meta, worldToPlanetocentric } from "../tools/terrainData.js";

describe("worldToPlanetocentric", () => {
  it("anchors the local frame at the center of the loaded DTM window", () => {
    const origin = worldToPlanetocentric(0, 0);
    expect(origin.lat_deg).toBeCloseTo(meta.center_lat, 6);
    expect(origin.lon_e_deg).toBeCloseTo(meta.center_lon_e, 6);
    // Shipped HiRISE window DTEEC_009149_1750_009294_1750_U01: lower Mount Sharp, Gale Crater.
    expect(origin.lat_deg).toBeCloseTo(-4.745, 3);
    expect(origin.lon_e_deg).toBeCloseTo(137.4, 3);
  });

  it("moves north for negative z and east for positive x at about 59.27 km per degree", () => {
    const north = worldToPlanetocentric(0, -2000);
    const east = worldToPlanetocentric(2000, 0);
    expect(north.lat_deg - meta.center_lat).toBeCloseTo(2000 / 59274.7, 5);
    expect(east.lon_e_deg - meta.center_lon_e).toBeCloseTo(2000 / (59274.7 * Math.cos((meta.center_lat * Math.PI) / 180)), 5);
  });

  it("matches a real MSL DAN measurement position from the hydration pipeline", () => {
    // hydration_sites.json: x=-600, z=-900 -> lon 137.389878 E, lat -4.729816.
    const p = worldToPlanetocentric(-600, -900);
    expect(p.lat_deg).toBeCloseTo(-4.729816, 4);
    expect(p.lon_e_deg).toBeCloseTo(137.389878, 3);
  });
});
