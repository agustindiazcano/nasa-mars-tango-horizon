export const ARCHIVE_IDS = ["rems_clear", "rems_storm2018", "rad_quiet", "rad_sep2017", "ephem"] as const;
export type ArchiveId = typeof ARCHIVE_IDS[number];
type Category = "observation" | "derived" | "design";
export interface ArchiveVariable {
  key: string;
  unit: string;
  category: Category;
  processing: string;
  values: (number | null)[];
}
export interface HistoricalSeries {
  source: string;
  epochs: string[];
  variables: ArchiveVariable[];
  limitations: string;
}
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object");
  return value as RecordValue;
}
function label(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Missing source or epoch");
  return value;
}
function numeric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid numeric value");
  return value;
}
function rows(value: unknown): unknown[] {
  if (!Array.isArray(value) || !value.length) throw new Error("Empty or invalid series");
  return value;
}
function numbers(value: unknown, count: number): (number | null)[] {
  const array = rows(value);
  if (array.length !== count) throw new Error("Series length mismatch");
  return array.map(v => v === null ? null : numeric(v));
}
function ascending(values: number[]): void {
  if (values.some((v, i) => i > 0 && v <= values[i - 1])) throw new Error("Time must increase");
}

/** Adapts the processed files without replacing null values or joining source epochs. */
export function parseHistoricalSeries(id: ArchiveId, input: unknown): HistoricalSeries {
  const data = record(input);
  const source = label(data.source);
  if (id === "ephem") {
    const entries = rows(data.earth_series).map(record);
    ascending(entries.map(r => numeric(r.jdtdb)));
    const values = entries.map(r => numeric(r.light_time_s));
    if (values.some(v => v < 0)) throw new Error("Negative light time");
    const variables: ArchiveVariable[] = [
      { key: "Earth one-way light time", unit: "s", category: "derived", processing: "Horizons light-time calculation", values },
      { key: "Earth round-trip light time", unit: "s", category: "derived", processing: "2 × one-way; symmetric light-time approximation", values: values.map(v => 2 * v) },
    ];
    if (entries.every(r => r.range_km !== undefined)) {
      const ranges = entries.map(r => numeric(r.range_km));
      if (ranges.some(v => v <= 0)) throw new Error("Invalid Earth-Mars range");
      variables.push({ key: "Earth-Mars range", unit: "km", category: "derived", processing: "Horizons astrometric range", values: ranges });
    }
    return {
      source,
      epochs: entries.map(r => `${label(r.tdb)} TDB`),
      variables,
      limitations: "Ephemeris epochs are independent of REMS and RAD records. No solar geometry or mission defaults are combined with these samples.",
    };
  }
  const hours = rows(data.hours).map(numeric);
  ascending(hours);
  if (id.startsWith("rad_")) {
    if (data.unit !== "uGy/h" || data.quality_factor_applied !== null) throw new Error("Unsupported dose quantity");
    const detector = typeof data.detector === "string" && data.detector.trim() ? data.detector.trim() : "RAD detector B";
    const observations = rows(data.observations).map(record);
    if (observations.length !== hours.length) throw new Error("Observation count mismatch");
    const values = numbers(data.dose_rate_ugy_h, hours.length);
    if (values.some(v => v !== null && v < 0)) throw new Error("Negative absorbed dose");
    return {
      source,
      epochs: observations.map(r => {
        const lmst = typeof r.mars_time === "string" && r.mars_time.trim() ? `; LMST ${r.mars_time.trim()}` : "";
        const qc = typeof r.qc === "string" && r.qc.trim() ? `; qc ${r.qc.trim()}` : "";
        return `${label(r.utc)} UTC (year/day-of-year)${lmst}; sol ${numeric(r.sol)}; observation ${numeric(r.obs_id)}${qc}`;
      }),
      variables: [{ key: "RAD detector B absorbed dose rate", unit: "uGy/h", category: "observation", processing: `Processed silicon ${detector} dose series; no quality factor applied`, values }],
      limitations: "Absorbed dose in silicon is not human equivalent dose. Source gaps are skipped explicitly in sample playback; no interpolation or extrapolation.",
    };
  }
  const sols = rows(data.sols).map(numeric);
  const bySol = record(data.by_sol);
  for (const sol of sols) label(record(bySol[String(sol)]).start_time_utc);
  const clear = id === "rems_clear";
  if (hours.length !== (clear ? 24 : 24 * sols.length)) throw new Error("Unexpected REMS hourly grid");
  if (hours.some((h, i) => h !== i)) throw new Error("Unexpected REMS file hour");
  const epochs = hours.map(h => clear
    ? `Clear-sol aggregate ${sols.join(", ")}; local-hour bin ${h}; not one observed instant`
    : `Sol ${sols[Math.floor(h / 24)]}; local-hour bin ${h % 24}; sol record starts ${label(record(bySol[String(sols[Math.floor(h / 24)])]).start_time_utc)} UTC`);
  const variables: ArchiveVariable[] = [
    ["pressure_pa", "Pa"], ["air_temp_k", "K"], ["ground_temp_k", "K"], ["uv_w_m2", "W/m²"],
  ].map(([key, unit]) => ({ key, unit, category: "derived", processing: clear ? "Hourly aggregate across selected clear sols" : "Processed hourly REMS bins", values: numbers(data[key], hours.length) }));
  if (data.wind_ms !== undefined) {
    variables.push({ key: "wind_ms", unit: "m/s", category: "observation", processing: "Unavailable entries retained as null", values: numbers(data.wind_ms, hours.length) });
  } else if (!clear && sols.every(sol => Array.isArray(record(bySol[String(sol)]).wind_ms))) {
    const windValues = sols.flatMap(sol => numbers(record(bySol[String(sol)]).wind_ms, 24));
    variables.push({ key: "wind_ms", unit: "m/s", category: "observation", processing: "Unavailable entries retained as null", values: windValues });
  }
  variables.push({ key: "tau", unit: "dimensionless", category: clear ? "design" : "derived", processing: clear ? "Assumed clear reference 0.5" : label(data.tau_note), values: numbers(data.tau, hours.length) });
  return { source, epochs, variables, limitations: "Local-hour bins are not UTC timestamps. Nonconsecutive sols are adjacent only in the file sequence. Opacity is a UV proxy relative to an assumed clear reference, not measured Mastcam tau. Missing wind is unavailable." };
}

/** Exact sample replay; one sample per tick, independent of source time intervals. */
export class SampleReplay {
  private position = 0;
  private fraction = 0;
  playing = false;
  constructor(readonly count: number) {
    if (!Number.isInteger(count) || count < 1) throw new Error("Invalid sample count");
  }
  get index(): number { return this.position; }
  seek(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) throw new Error("Invalid sample index");
    this.position = index; this.fraction = 0;
  }
  reset(): void { this.playing = false; this.seek(0); }
  advance(seconds: number, samplesPerSecond = 1): void {
    if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(samplesPerSecond) || samplesPerSecond <= 0) throw new Error("Invalid replay delta/rate");
    if (!this.playing) return;
    this.fraction += seconds * samplesPerSecond;
    const steps = Math.floor(this.fraction + 1e-9);
    this.fraction = Math.max(0, this.fraction - steps);
    this.position = Math.min(this.count - 1, this.position + steps);
    if (this.position === this.count - 1) { this.playing = false; this.fraction = 0; }
  }
}
