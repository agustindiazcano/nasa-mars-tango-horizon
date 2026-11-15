export type ProvenanceCategory = "terrain" | "env" | "veins" | "models" | "other";

export interface ProvenanceDatasetRef {
  id?: string;
  url?: string;
  description?: string;
  notes?: string;
}

export interface ProvenanceOffsetStats {
  n: number;
  mean_m: number;
  median_m: number;
  std_m: number;
  min_m: number;
  max_m: number;
}

export interface ProvenanceDatumOffset {
  hirise_datum?: string;
  ctx_dem_datum?: string;
  ctx_geoid_adj_datum?: string;
  summary?: string;
  top_candidates_hirise_minus_ctx_dem?: ProvenanceOffsetStats;
  dan_in_scene_hirise_minus_ctx_dem?: ProvenanceOffsetStats;
  dan_in_scene_ctx_geoid_minus_ctx_dem?: ProvenanceOffsetStats;
  dan_in_scene_hirise_minus_ctx_geoid?: ProvenanceOffsetStats;
  scene_grid_hirise_minus_ctx_dem?: ProvenanceOffsetStats;
  scene_grid_ctx_geoid_minus_ctx_dem?: ProvenanceOffsetStats;
  scene_grid_hirise_minus_ctx_geoid?: ProvenanceOffsetStats;
  datum_explanation?: string;
}

export interface ProvenanceEntry {
  source: string;
  product_id: string;
  url?: string;
  datasets?: ProvenanceDatasetRef[];
  transform: string;
  notes?: string;
  license?: string;
  vertical_datum_offset?: ProvenanceDatumOffset;
  retrieved: string;
}

export type ProvenanceManifest = Record<string, ProvenanceEntry>;

/**
 * Group provenance asset keys by their top-level data category for display ordering.
 */
export function categorizeProvenanceKey(key: string): ProvenanceCategory {
  if (key.startsWith("terrain/")) return "terrain";
  if (key.startsWith("env/")) return "env";
  if (key.startsWith("veins/")) return "veins";
  if (key.startsWith("models/")) return "models";
  return "other";
}

/**
 * Return a validated HTTP(S) URL for safe anchor rendering, or null otherwise.
 */
export function formatProvenanceUrl(url: string | undefined): string | null {
  if (typeof url !== "string" || url.trim().length === 0) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(record: Record<string, unknown>, field: string, key: string): string {
  const val = record[field];
  if (typeof val !== "string" || val.trim().length === 0) {
    throw new Error(`Provenance entry "${key}" is missing non-empty string "${field}".`);
  }
  return val.trim();
}

/**
 * Validate and normalize a parsed provenance.json payload into a typed manifest.
 */
export function parseProvenanceManifest(input: unknown): ProvenanceManifest {
  if (!isPlainRecord(input)) {
    throw new Error("Provenance manifest must be a JSON object.");
  }
  const keys = Object.keys(input);
  if (keys.length === 0) {
    throw new Error("Provenance manifest must not be empty.");
  }

  const manifest: ProvenanceManifest = {};
  for (const key of keys) {
    const raw = input[key];
    if (!isPlainRecord(raw)) {
      throw new Error(`Provenance entry "${key}" must be an object.`);
    }

    const source = readNonEmptyString(raw, "source", key);
    const product_id = readNonEmptyString(raw, "product_id", key);
    const transform = readNonEmptyString(raw, "transform", key);
    const retrieved = readNonEmptyString(raw, "retrieved", key);

    const url = typeof raw.url === "string" && raw.url.trim().length > 0 ? raw.url.trim() : undefined;
    const datasets = Array.isArray(raw.datasets)
      ? (raw.datasets.filter(isPlainRecord) as ProvenanceDatasetRef[])
      : undefined;

    if (!url && (!datasets || datasets.length === 0)) {
      throw new Error(`Provenance entry "${key}" must include a non-empty "url" or "datasets" list.`);
    }

    const entry: ProvenanceEntry = {
      source,
      product_id,
      transform,
      retrieved,
    };
    if (url) entry.url = url;
    if (datasets && datasets.length > 0) entry.datasets = datasets;
    if (typeof raw.notes === "string" && raw.notes.trim().length > 0) {
      entry.notes = raw.notes.trim();
    }
    if (typeof raw.license === "string" && raw.license.trim().length > 0) {
      entry.license = raw.license.trim();
    }
    if (isPlainRecord(raw.vertical_datum_offset)) {
      entry.vertical_datum_offset = raw.vertical_datum_offset as ProvenanceDatumOffset;
    }

    manifest[key] = entry;
  }

  return manifest;
}

/**
 * Fetch and validate the static provenance manifest served by the frontend.
 */
export async function fetchProvenanceManifest(
  url = "/data/provenance.json",
  signal?: AbortSignal,
): Promise<ProvenanceManifest> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const json: unknown = await res.json();
  return parseProvenanceManifest(json);
}
