import { normalizeTerrainMetadata, READY_TERRAIN, TERRAIN_HEIGHT_SHA256, TERRAIN_META_SHA256, type TerrainIdentity } from "@th/shared";
import { validateTerrain } from "./terrainValidation";
import type { TerrainMeta } from "./terrainProc";

export interface TerrainAsset { meta: TerrainMeta; raw: Uint16Array; identity: TerrainIdentity }
export async function sha256(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
}
/** One startup owner. Repeated calls after success reuse validated data; cancellation invalidates late work. */
export class TerrainLoader {
  state: TerrainIdentity["status"] = "cancelled";
  error = "";
  private generation = 0;
  private controller?: AbortController;
  private asset?: TerrainAsset;
  get signal(): AbortSignal | undefined { return this.controller?.signal; }
  cancel(): void {
    this.generation++;
    this.controller?.abort();
    if (this.state !== "ready") this.state = "cancelled";
  }
  async load(base = "/data/terrain", report: (message: string) => void = () => {}): Promise<TerrainAsset | null> {
    if (this.asset) return this.asset;
    this.cancel();
    const generation = this.generation;
    const controller = this.controller = new AbortController();
    this.state = "loading";
    this.error = "";
    const current = () => generation === this.generation && !controller.signal.aborted;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        report(`Loading HiRISE terrain (attempt ${attempt}/3). Mission controls wait for validation.`);
        const read = async (name: string) => {
          const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
          const response = await fetch(`${base}/${name}`, { signal });
          if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
          return response.arrayBuffer();
        };
        const metaBytes = await read("meta.json");
        if (await sha256(new TextEncoder().encode(normalizeTerrainMetadata(new TextDecoder().decode(metaBytes))).buffer) !== TERRAIN_META_SHA256) throw new Error("Terrain metadata identity mismatch");
        const meta = JSON.parse(new TextDecoder().decode(metaBytes)) as TerrainMeta;
        validateTerrain(meta, 4000);
        const bytes = await read("height_2048.u16");
        if (bytes.byteLength !== meta.height_px ** 2 * 2) throw new Error("Incorrect DEM byte length");
        if (await sha256(bytes) !== TERRAIN_HEIGHT_SHA256) throw new Error("Terrain height identity mismatch");
        const view = new DataView(bytes);
        const raw = new Uint16Array(meta.height_px ** 2);
        for (let i = 0; i < raw.length; i++) raw[i] = view.getUint16(i * 2, true);
        if (!current()) return null;
        this.asset = { meta, raw, identity: { ...READY_TERRAIN } };
        this.state = "ready";
        return this.asset;
      } catch (error) {
        if (!current()) return null;
        this.error = error instanceof Error ? error.message : String(error);
        if (attempt < 3) {
          report(`Terrain attempt failed: ${this.error}. Retrying in ${attempt} s.`);
          if (!current()) return null;
          await new Promise<void>(resolve => {
            const finish = () => { clearTimeout(timer); controller.signal.removeEventListener("abort", finish); resolve(); };
            const timer = setTimeout(finish, attempt * 1000);
            controller.signal.addEventListener("abort", finish, { once: true });
          });
          if (!current()) return null;
        }
      }
    }
    this.state = "error";
    return null;
  }
}
