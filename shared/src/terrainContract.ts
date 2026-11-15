/** Identity pins the source crop; it does not assert equal rendering or routing resolution. */
export const TERRAIN_VERSION = "hirise-crop-v1";
export const TERRAIN_META_SHA256 = "41906c6d6d9f04ee0bfda88be2db2acd90723642dc7dbfaf6be6a2ca902269e8";
export const TERRAIN_HEIGHT_SHA256 = "3d303465fe9d5261d6ac107a60b8a54819df43aa964a70249f213bc14c3bc39a";
export interface TerrainIdentity {
  status: "loading" | "ready" | "error" | "cancelled";
  version: string;
  metaSha256: string;
  heightSha256: string;
}
export const READY_TERRAIN: TerrainIdentity = {
  status: "ready", version: TERRAIN_VERSION,
  metaSha256: TERRAIN_META_SHA256, heightSha256: TERRAIN_HEIGHT_SHA256,
};
export function terrainMatches(value: unknown): value is TerrainIdentity {
  const t = value as Partial<TerrainIdentity> | undefined;
  return t?.status === "ready" && t.version === TERRAIN_VERSION &&
    t.metaSha256 === TERRAIN_META_SHA256 && t.heightSha256 === TERRAIN_HEIGHT_SHA256;
}
