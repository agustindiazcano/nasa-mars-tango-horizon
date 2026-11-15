/** Offline predictions for real Curiosity photographs, never renderer frames. */
export interface VeinImage {
  waypoint_id: string;
  image: string;
  heatmap?: string;
  sol: number;
  instrument: string;
  vein_probability: number;
  peak?: { u: number; v: number; score: number };
  image_credit: string;
  nasa_url?: string;
}

export interface VeinData {
  model: string;
  validation: { precision?: number; recall?: number; roc_auc?: number; n_images?: number; n_positive?: number; n_sols?: number; method?: string };
  images: VeinImage[];
}

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid vein data");
  return v as Record<string, unknown>;
};
const text = (v: unknown): string => {
  if (typeof v !== "string" || !v.trim()) throw new Error("Missing vein field");
  return v;
};
const probability = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) throw new Error("Invalid probability or coordinate");
  return v;
};
const count = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new Error("Invalid count");
  return v;
};

export function veinAssetUrl(filename: string): string {
  if (!/^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png)$/i.test(filename)) throw new Error("Invalid vein asset name");
  return `/data/veins/${filename}`;
}

export function parseVeins(raw: unknown): VeinData {
  const r = record(raw);
  if (!Array.isArray(r.images) || !r.images.length) throw new Error("No vein photographs");
  const seen = new Set<string>();
  const images = r.images.map((item): VeinImage => {
    const v = record(item);
    const id = text(v.waypoint_id);
    if (seen.has(id)) throw new Error("Duplicate waypoint");
    seen.add(id);
    const image = text(v.image);
    veinAssetUrl(image);
    const heatmap = v.heatmap === undefined ? undefined : text(v.heatmap);
    if (heatmap) veinAssetUrl(heatmap);
    const p = v.peak === undefined ? undefined : record(v.peak);
    const nasaUrl = typeof v.nasa_url === "string" && /^https:\/\/[a-z0-9.-]*\bnasa\.(?:gov|jpl\.nasa\.gov)\//i.test(v.nasa_url) ? v.nasa_url : undefined;
    return {
      waypoint_id: id, image, heatmap, sol: count(v.sol), instrument: text(v.instrument),
      vein_probability: probability(v.vein_probability),
      peak: p ? { u: probability(p.u), v: probability(p.v), score: probability(p.score) } : undefined,
      image_credit: text(v.image_credit), nasa_url: nasaUrl,
    };
  });
  const v = r.validation === undefined ? {} : record(r.validation);
  return {
    model: text(r.model), images,
    validation: {
      precision: v.precision === undefined ? undefined : probability(v.precision),
      recall: v.recall === undefined ? undefined : probability(v.recall),
      roc_auc: v.roc_auc === undefined ? undefined : probability(v.roc_auc),
      n_images: v.n_images === undefined ? undefined : count(v.n_images),
      n_positive: v.n_positive === undefined ? undefined : count(v.n_positive),
      n_sols: v.n_sols === undefined ? undefined : count(v.n_sols),
      method: typeof v.validation === "string" ? v.validation : undefined,
    },
  };
}

export function findVeinImage(data: VeinData, waypointId: string): VeinImage | undefined {
  return data.images.find((image) => image.waypoint_id === waypointId);
}

export async function fetchVeins(fetcher: typeof fetch = fetch): Promise<VeinData> {
  const response = await fetcher("/data/veins/index.json");
  if (!response.ok) throw new Error(`Vein data HTTP ${response.status}`);
  return parseVeins(await response.json());
}
