import { describe, expect, it } from "vitest";
import { buildChartModel, parseStormForecast, stormVerdict } from "./stormForecast";

const raw = {
  storm_level: 1.5,
  forecast_sol: 2079,
  forecast_note: "note",
  forecast: [
    { horizonSol: 3, q10: 0.7, q50: 1.0, q90: 1.4 },
    { horizonSol: 1, q10: 0.75, q50: 1.1, q90: 1.6 },
    { horizonSol: 2, q10: 0.71, q50: 1.02, q90: 1.28 },
  ],
  replay_my34: [
    { sol: 2070, observed_tau: 0.6 },
    { sol: 2075, observed_tau: null },
    { sol: 2079, observed_tau: 0.9 },
    { sol: 2090, observed_tau: 3 },
  ],
  validation: { horizons: { "1": { interval_80_coverage: 0.44 }, "3": { interval_80_coverage: 0.52 } } },
};

describe("stormForecast", () => {
  it("parses, sorts horizons and reads held-out coverage", () => {
    const d = parseStormForecast(raw)!;
    expect(d.forecast.map((f) => f.horizonSol)).toEqual([1, 2, 3]);
    expect(d.coverage80).toEqual([0.44, null, 0.52]);
  });

  it("rejects malformed input", () => {
    expect(parseStormForecast(null)).toBeNull();
    expect(parseStormForecast({ forecast: [{ horizonSol: 1 }], replay_my34: [] })).toBeNull();
  });

  it("builds unit-square coordinates and leaves sols after the origin out of the observed series", () => {
    const m = buildChartModel(parseStormForecast(raw)!);
    expect(m.observed).toHaveLength(2);
    expect(m.median).toHaveLength(3);
    expect(m.band).toHaveLength(6);
    for (const p of [...m.observed, ...m.median, ...m.band]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    expect(m.median[0].x).toBeLessThan(m.median[2].x);
  });

  it("does not report go when the q90 forecast drops solar output below demand", () => {
    const v = stormVerdict(parseStormForecast(raw)!, 0.9);
    expect(v.verdict).not.toBe("go");
    expect(v.reasons).toContain("storm.reason.power");
  });
});
