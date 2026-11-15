import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { en, es, fr, de, it as itDict } from "../../../../shared/src/i18n/index.js";
import { ARCHIVE_IDS, parseHistoricalSeries, SampleReplay } from "../../../../web/src/data/historicalSeries";
import { MissionStore } from "../../../../web/src/state";
function asset(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../web/public/data/env/${id}.json`, import.meta.url)), "utf8"));
}
describe("historical archive adapters", () => {
  it.each(ARCHIVE_IDS)("validates %s without changing source values", id => {
    const data = asset(id);
    const series = parseHistoricalSeries(id, data);
    const key = id === "ephem" ? "Earth one-way light time" : id.startsWith("rad") ? "RAD detector B absorbed dose rate" : "tau";
    const actual = series.variables.find(v => v.key === key)!.values;
    const expected = id === "ephem" ? (data.earth_series as { light_time_s: number }[]).map(r => r.light_time_s) : data[id.startsWith("rad") ? "dose_rate_ugy_h" : "tau"];
    expect(actual).toEqual(expected);
    expect(series.epochs.length).toBe(actual.length);
  });
  it("keeps missing wind unavailable and clear tau a design assumption", () => {
    const series = parseHistoricalSeries("rems_clear", asset("rems_clear"));
    expect(series.variables.find(v => v.key === "wind_ms")!.values.every(v => v === null)).toBe(true);
    expect(series.variables.find(v => v.key === "tau")!.category).toBe("design");
  });
  it("retains the individual RAD epoch and measured peak", () => {
    const series = parseHistoricalSeries("rad_sep2017", asset("rad_sep2017"));
    expect(series.epochs[0]).toContain("2017-252");
    expect(series.epochs[0]).toContain("LMST");
    expect(series.epochs[0]).toContain("qc ");
    expect(series.variables[0].unit).toBe("uGy/h");
    expect(series.variables[0].processing).toContain("silicon");
    expect(Math.max(...series.variables[0].values as number[])).toBeCloseTo(25.8919, 4);
  });
  it("keeps the ephemeris epoch with one-way, round-trip, and range variables", () => {
    const series = parseHistoricalSeries("ephem", asset("ephem"));
    expect(series.epochs[0]).toContain("2026-Nov-14");
    expect(series.epochs[0]).toContain("TDB");
    expect(series.variables[0].values[0]).toBe(660.9);
    expect(series.variables[1].values[0]).toBe(1321.8);
    const rangeVar = series.variables.find(v => v.key === "Earth-Mars range");
    expect(rangeVar).toBeDefined();
    expect(rangeVar!.unit).toBe("km");
    expect(rangeVar!.values[0]).toBeGreaterThan(0);
  });
  it("retains by_sol wind_ms nulls and exact units on rems_storm2018", () => {
    const series = parseHistoricalSeries("rems_storm2018", asset("rems_storm2018"));
    expect(series.epochs[23]).toContain("Sol 2060");
    expect(series.epochs[24]).toContain("Sol 2070");
    const windVar = series.variables.find(v => v.key === "wind_ms");
    expect(windVar).toBeDefined();
    expect(windVar!.unit).toBe("m/s");
    expect(windVar!.values.length).toBe(192);
    expect(windVar!.values.every(v => v === null)).toBe(true);
    const tauVar = series.variables.find(v => v.key === "tau")!;
    expect(Math.max(...(tauVar.values as number[]))).toBeCloseTo(4.243, 3);
  });
  it("tags MissionStore runtime env and scenario labels as design models separate from archive records", () => {
    const store = new MissionStore();
    expect(store.env.data_category).toBe("design");
    expect(store.env.radiation_quantity).toBe("absorbed_dose_silicon");
    const ctx = store.toContext([]);
    expect(ctx.env.data_category).toBe("design");
    expect(ctx.env.radiation_quantity).toBe("absorbed_dose_silicon");
    expect(en["scenario.storm_source"]).toContain("REMS 2018");
    expect(en["scenario.sep2017_source"]).toContain("RAD Sep 2017");
    for (const dict of [en, es, fr, de, itDict]) {
      expect(dict["scenario.storm_source"].toLowerCase()).toMatch(/rems[- ]2018/);
      expect(dict["scenario.sep2017_source"].toLowerCase()).toMatch(/rad[- ](sep(t)?|set)[- ]2017/);
      expect(dict["scenario.storm_source"]).not.toMatch(/^Data:/i);
      expect(dict["scenario.sep2017_source"]).not.toMatch(/^Data:/i);
    }
  });
  it.each([
    { hours: [0, 0] }, { source: "" }, { unit: "uSv/h" }, { quality_factor_applied: 2 },
    { dose_rate_ugy_h: [NaN] }, { observations: [] },
  ])("rejects invalid radiation data %j", patch => {
    expect(() => parseHistoricalSeries("rad_quiet", { ...asset("rad_quiet"), ...patch })).toThrow();
  });
});
describe("deterministic sample replay", () => {
  it("is invariant to frame partition and stops at the final sample", () => {
    const a = new SampleReplay(5); const b = new SampleReplay(5);
    a.playing = b.playing = true;
    for (let i = 0; i < 30; i++) a.advance(0.1);
    b.advance(3);
    expect(a.index).toBe(b.index); expect(a.index).toBe(3);
    a.advance(100); expect(a.index).toBe(4); expect(a.playing).toBe(false);
  });
  it("pauses, seeks and resets without retaining elapsed fractions", () => {
    const replay = new SampleReplay(5);
    replay.playing = true; replay.advance(0.9); replay.reset();
    replay.advance(10); expect(replay.index).toBe(0);
    replay.playing = true; replay.advance(0.2); expect(replay.index).toBe(0);
    replay.seek(3); replay.advance(0.9); expect(replay.index).toBe(3);
    expect(() => replay.advance(-1)).toThrow();
    expect(() => replay.seek(5)).toThrow();
  });
});
