export function validateTerrain(meta: { height_px: number; size_m: number; product_id: string; z_min_m: number; z_max_m: number; center_lat: number; center_lon_e: number }, expectedSize: number): void {
  if (!Number.isInteger(meta.height_px) || meta.height_px < 2 || meta.height_px > 8192 ||
      meta.size_m !== expectedSize || typeof meta.product_id !== "string" || !meta.product_id ||
      ![meta.z_min_m, meta.z_max_m, meta.center_lat, meta.center_lon_e].every(Number.isFinite) ||
      meta.z_max_m <= meta.z_min_m || Math.abs(meta.center_lat) > 90) {
    throw new Error("Invalid or incompatible terrain metadata");
  }
}

export function formatCoordinates(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "--";
  const ns = Object.is(lat, -0) || lat >= 0 ? "N" : "S";
  const lonE = ((lon % 360) + 360) % 360;
  return `${Math.abs(lat).toFixed(4)}${ns}, ${lonE.toFixed(4)}E`;
}
