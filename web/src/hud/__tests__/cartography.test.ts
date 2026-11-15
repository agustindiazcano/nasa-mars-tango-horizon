import { describe, expect, it } from "vitest";
import { BASE_ORIGIN, RESCUE_SITE } from "@th/shared";
import {
  MapProjection,
  contourLevels,
  contourSegments,
  dynamicSymbols,
  formatLatitude,
  formatLongitude,
  graticuleTicks,
  hillshadeAt,
  hypsometricColor,
  isIndexContour,
  niceNumber,
  nominalScaleDenominator,
  placeLabels,
  scaleBarMeters,
  staticSymbols,
} from "../cartography";

describe("hypsometric tint", () => {
  it("clamps and interpolates between stops", () => {
    expect(hypsometricColor(-1)).toEqual(hypsometricColor(0));
    expect(hypsometricColor(2)).toEqual(hypsometricColor(1));
    const mid = hypsometricColor(0.5);
    expect(mid.every((v) => v >= 0 && v <= 255)).toBe(true);
    expect(hypsometricColor(0.1)).not.toEqual(hypsometricColor(0.6));
  });
});

describe("hillshade", () => {
  const n = 5;
  const ramp = (f: (c: number, r: number) => number) => {
    const g = new Float32Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r * n + c] = f(c, r);
    return g;
  };
  it("is flat-lit on level ground and brighter on slopes facing the sun (north-west)", () => {
    const flat = hillshadeAt(ramp(() => 10), n, 2, 2, 5);
    expect(flat).toBeCloseTo(Math.sin((40 * Math.PI) / 180), 6);
    // Terrain falling toward the north-west faces the light: brighter than terrain falling toward the south-east.
    const facingNw = hillshadeAt(ramp((c, r) => 10 + c + r), n, 2, 2, 5);
    const facingSe = hillshadeAt(ramp((c, r) => 10 - c - r), n, 2, 2, 5);
    expect(facingSe).toBeGreaterThan(facingNw);
  });
});

describe("contours", () => {
  it("lists levels at the interval and marks index contours", () => {
    expect(contourLevels(-3, 260, 25)).toEqual([0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
    expect(isIndexContour(100, 100)).toBe(true);
    expect(isIndexContour(125, 100)).toBe(false);
    expect(isIndexContour(-200, 100)).toBe(true);
  });

  it("traces a straight iso-line across a ramp and nothing outside the range", () => {
    const n = 6;
    const g = new Float32Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r * n + c] = c * 10; // rises toward east
    const segs = contourSegments(g, n, 25);
    expect(segs).toHaveLength(n - 1);
    for (const s of segs) {
      expect(s.x0).toBeCloseTo(2.5, 9);
      expect(s.x1).toBeCloseTo(2.5, 9);
    }
    expect(contourSegments(g, n, 100)).toHaveLength(0);
  });

  it("closes a ring around a single peak", () => {
    const n = 7;
    const g = new Float32Array(n * n);
    g[3 * n + 3] = 10;
    const segs = contourSegments(g, n, 5);
    expect(segs).toHaveLength(4);
  });
});

describe("graticule and scale", () => {
  it("rounds to nice numbers", () => {
    expect(niceNumber(0.0031)).toBeCloseTo(0.005, 9);
    expect(niceNumber(7)).toBe(10);
    expect(niceNumber(1.2)).toBe(2);
  });

  it("gives ticks inside the range with a nice step", () => {
    const { step, values } = graticuleTicks(137.38, 137.42, 4);
    expect(step).toBeCloseTo(0.01, 9);
    expect(values[0]).toBeCloseTo(137.38, 9);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(137.38 - 1e-9);
      expect(v).toBeLessThanOrEqual(137.42 + 1e-9);
    }
  });

  it("picks the longest nice scale bar that fits", () => {
    expect(scaleBarMeters(5.71, 240)).toBe(1000);
    expect(scaleBarMeters(1, 240)).toBe(200);
    expect(scaleBarMeters(0.5, 240)).toBe(100);
  });

  it("formats coordinates with hemispheres and a print scale", () => {
    expect(formatLatitude(-4.745)).toBe("4.7450° S");
    expect(formatLongitude(137.4)).toBe("137.4000° E");
    expect(nominalScaleDenominator(5.714)).toBe(21600);
  });
});

describe("projection", () => {
  const p = new MapProjection(4000, { x: 50, y: 40 }, 700);
  it("maps the map centre to the middle of the neatline and round-trips", () => {
    expect(p.toPx(0, 0)).toEqual({ x: 400, y: 390 });
    const w = p.toWorld(p.toPx(123, -456).x, p.toPx(123, -456).y);
    expect(w.x).toBeCloseTo(123, 9);
    expect(w.z).toBeCloseTo(-456, 9);
    expect(p.metersPerPx).toBeCloseTo(4000 / 700, 9);
  });
});

describe("symbols", () => {
  it("lists the base, launch complex, rescue site and S1-S4", () => {
    const ids = staticSymbols().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["base", "launch", "rescue", "S1", "S2", "S3", "S4"]));
    const rescue = staticSymbols().find((s) => s.id === "rescue")!;
    expect(rescue).toMatchObject({ x: RESCUE_SITE.x, z: RESCUE_SITE.z });
    expect(staticSymbols().find((s) => s.id === "base")).toMatchObject({ x: BASE_ORIGIN.x, z: BASE_ORIGIN.z });
  });

  it("labels every unit, drone, crew callsign and the player; injured crew are red", () => {
    const syms = dynamicSymbols({
      fleet: [
        { id: "rover-1", kind: "rover_crew", x: 1, z: 2 },
        { id: "drone-1", kind: "drone", x: 3, z: 4 },
      ],
      crew: [
        { name: "SOTELO", x: 0, z: 0, status: "nominal" },
        { name: "YACONIS", x: 0, z: 0, status: "nominal" },
        { name: "SALERNO", x: 0, z: 0, status: "recovering" },
        { name: "DIAZ-CANO", x: 0, z: 0, status: "incapacitated" },
      ],
      astronaut: { x: 5, z: 6 },
    });
    expect(syms.find((s) => s.id === "drone-1")?.kind).toBe("drone");
    expect(syms.find((s) => s.id === "rover-1")?.kind).toBe("unit");
    expect(syms.filter((s) => s.kind === "crew").map((s) => s.label)).toEqual(["SOTELO", "YACONIS", "SALERNO", "DIAZ-CANO"]);
    expect(syms.find((s) => s.id === "DIAZ-CANO")?.color).toBe("#c1121f");
    expect(syms.find((s) => s.id === "astronaut")).toBeTruthy();
  });
});

describe("label placement", () => {
  it("avoids overlaps between stacked anchors and stays inside the bounds", () => {
    const bounds = { x: 0, y: 0, w: 400, h: 400 };
    const anchors = Array.from({ length: 6 }, () => ({ x: 200, y: 200, w: 60, h: 14 }));
    const boxes = placeLabels(anchors, bounds);
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(400);
      for (let j = i + 1; j < boxes.length; j++) {
        const b = boxes[j];
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
  });
});
