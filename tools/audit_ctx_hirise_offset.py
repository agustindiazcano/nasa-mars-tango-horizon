"""Quantify the vertical datum offset between CTX DEM and HiRISE DTM at Gale Crater.

Samples the processed HiRISE DTM (web/public/data/terrain/height_2048.u16) at
the hydration candidate coordinates (elev_m from CTX -DEM.tif) and the 377
in-scene MSL DAN measurement coordinates in hydration_sites.json. When remote
COG access is enabled (default), also queries the USGS Astrogeology CTX COG
products (-DEM.tif and -DEM-geoid-adj.tif) over HTTP range reads to decompose
the ~590 m offset into the MOLA areoid datum shift (dem_geoid --geoid MOLA)
and the residual HiRISE-vs-CTX registration offset.

Usage:
  python tools/audit_ctx_hirise_offset.py
  python tools/audit_ctx_hirise_offset.py --local-only
  python tools/audit_ctx_hirise_offset.py --output docs/evidence/ctx-hirise-offset-audit.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
TERRAIN_DIR = ROOT / "web" / "public" / "data" / "terrain"

CTX_ITEM = "T01_000815_1749_XN_05S222W__P21_009149_1752_XI_04S222W"
CTX_BASE = f"https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/{CTX_ITEM}"
CTX_DEM_URL = f"{CTX_BASE}/{CTX_ITEM}-DEM.tif"
CTX_GEOID_URL = f"{CTX_BASE}/{CTX_ITEM}-DEM-geoid-adj.tif"
HIRISE_ITEM = "DTEEC_009149_1750_009294_1750_U01"


def decode_hirise_grid(meta: dict[str, Any], u16_path: Path) -> np.ndarray:
    """Decode uint16 little-endian HiRISE heights to meters as float64."""
    n = int(meta["height_px"])
    raw = np.fromfile(u16_path, dtype="<u2")
    if raw.size != n * n:
        raise ValueError(f"Expected {n * n} uint16 samples in {u16_path}, got {raw.size}")
    raw = raw.reshape(n, n).astype(np.float64)
    z_min = float(meta["z_min_m"])
    z_max = float(meta["z_max_m"])
    return z_min + (raw / 65535.0) * (z_max - z_min)


def bilinear_sample_grid(grid: np.ndarray, size_m: float, xs: list[float], zs: list[float]) -> np.ndarray:
    """Sample a square scene grid bilinearly at local scene (x, z) meters."""
    n = grid.shape[0]
    out = np.empty(len(xs), dtype=np.float64)
    for idx, (x, z) in enumerate(zip(xs, zs)):
        u = (float(x) + size_m / 2.0) / size_m
        v = (float(z) + size_m / 2.0) / size_m
        col = float(np.clip(u * (n - 1), 0.0, n - 1.000001))
        row = float(np.clip(v * (n - 1), 0.0, n - 1.000001))
        r0, c0 = int(np.floor(row)), int(np.floor(col))
        r1, c1 = min(r0 + 1, n - 1), min(c0 + 1, n - 1)
        fr, fc = row - r0, col - c0
        val = (
            (grid[r0, c0] * (1.0 - fc) + grid[r0, c1] * fc) * (1.0 - fr)
            + (grid[r1, c0] * (1.0 - fc) + grid[r1, c1] * fc) * fr
        )
        out[idx] = float(val)
    return out


def summarize_offsets(diff: np.ndarray) -> dict[str, Any]:
    """Compute summary statistics (count, mean, median, std, min, max) in meters."""
    valid = diff[np.isfinite(diff)]
    if valid.size == 0:
        raise ValueError("No finite offset samples")
    return {
        "n": int(valid.size),
        "mean_m": round(float(np.mean(valid)), 3),
        "median_m": round(float(np.median(valid)), 3),
        "std_m": round(float(np.std(valid)), 3),
        "min_m": round(float(np.min(valid)), 3),
        "max_m": round(float(np.max(valid)), 3),
    }


def _read_ctx_window(url: str, bounds: list[float], out_px: int) -> np.ndarray:
    """Read the 4x4 km scene window from a remote CTX COG via rasterio."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.windows import from_bounds

    with rasterio.Env(
        GDAL_HTTP_TIMEOUT="45",
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
    ):
        with rasterio.open(url) as ds:
            win = from_bounds(*bounds, transform=ds.transform)
            arr = ds.read(
                1,
                window=win,
                out_shape=(out_px, out_px),
                resampling=Resampling.bilinear,
                boundless=True,
                fill_value=np.nan,
            ).astype(np.float64)
            if ds.nodata is not None:
                arr[arr == ds.nodata] = np.nan
            arr[arr < -1e4] = np.nan
            return arr


def run_audit(local_only: bool = False) -> dict[str, Any]:
    """Run the CTX-vs-HiRISE vertical offset audit and return structured results."""
    meta = json.loads((TERRAIN_DIR / "meta.json").read_text(encoding="utf-8"))
    sites = json.loads((TERRAIN_DIR / "hydration_sites.json").read_text(encoding="utf-8"))
    hi_grid = decode_hirise_grid(meta, TERRAIN_DIR / "height_2048.u16")

    size_m = float(meta["size_m"])
    n = int(meta["height_px"])

    candidates = sites["top_candidates"]
    cand_xs = [float(c["x"]) for c in candidates]
    cand_zs = [float(c["z"]) for c in candidates]
    cand_ctx = np.array([float(c["elev_m"]) for c in candidates], dtype=np.float64)
    cand_hi = bilinear_sample_grid(hi_grid, size_m, cand_xs, cand_zs)
    cand_diff = cand_hi - cand_ctx

    dan_in = [d for d in sites["dan_measurements"] if d.get("in_scene")]
    dan_xs = [float(d["x"]) for d in dan_in]
    dan_zs = [float(d["z"]) for d in dan_in]
    dan_hi = bilinear_sample_grid(hi_grid, size_m, dan_xs, dan_zs)

    report: dict[str, Any] = {
        "hirise_product_id": meta["product_id"],
        "ctx_product_id": CTX_ITEM,
        "datum_explanation": (
            "tools/hydration/build_dataset.py sampled the un-geoid-adjusted USGS CTX DEM "
            "(-DEM.tif), whose heights are relative to the IAU Mars (2015) Sphere (R=3396190 m) "
            "prior to ASP dem_geoid --geoid MOLA adjustment. Both the companion USGS CTX "
            "geoid-adjusted product (-DEM-geoid-adj.tif) and the HiRISE SOCET DTM "
            f"({HIRISE_ITEM}) are referenced to the MOLA areoid, which lies ~562-564 m below "
            "the 3396190 m sphere at Gale Crater (-4.745N, 137.400E). The remaining ~25-28 m "
            "between HiRISE and CTX -DEM-geoid-adj.tif reflects independent bundle/MOLA-control "
            "registration and 1 m vs 20 m posting differences."
        ),
        "top_candidates_hirise_minus_ctx_dem": summarize_offsets(cand_diff),
        "top_candidates_samples": [
            {
                "rank": int(c["rank"]),
                "x": float(c["x"]),
                "z": float(c["z"]),
                "ctx_elev_m": round(float(c["elev_m"]), 3),
                "hirise_elev_m": round(float(hi_val), 3),
                "hirise_minus_ctx_m": round(float(diff_val), 3),
            }
            for c, hi_val, diff_val in zip(candidates, cand_hi, cand_diff)
        ],
        "dan_in_scene_count": len(dan_in),
        "dan_in_scene_hirise_elev_summary": summarize_offsets(dan_hi),
    }

    if not local_only:
        bounds = [float(v) for v in meta["bounds_projected_m"]]
        ctx_dem_grid = _read_ctx_window(CTX_DEM_URL, bounds, n)
        ctx_geo_grid = _read_ctx_window(CTX_GEOID_URL, bounds, n)

        dan_ctx_dem = bilinear_sample_grid(ctx_dem_grid, size_m, dan_xs, dan_zs)
        dan_ctx_geo = bilinear_sample_grid(ctx_geo_grid, size_m, dan_xs, dan_zs)

        report["dan_in_scene_hirise_minus_ctx_dem"] = summarize_offsets(dan_hi - dan_ctx_dem)
        report["dan_in_scene_ctx_geoid_minus_ctx_dem"] = summarize_offsets(dan_ctx_geo - dan_ctx_dem)
        report["dan_in_scene_hirise_minus_ctx_geoid"] = summarize_offsets(dan_hi - dan_ctx_geo)

        report["scene_grid_hirise_minus_ctx_dem"] = summarize_offsets(hi_grid - ctx_dem_grid)
        report["scene_grid_ctx_geoid_minus_ctx_dem"] = summarize_offsets(ctx_geo_grid - ctx_dem_grid)
        report["scene_grid_hirise_minus_ctx_geoid"] = summarize_offsets(hi_grid - ctx_geo_grid)

    return report


def main() -> None:
    ap = argparse.ArgumentParser(description="Audit vertical datum offset between CTX and HiRISE DTMs.")
    ap.add_argument("--local-only", action="store_true", help="Skip remote USGS CTX COG queries.")
    ap.add_argument("--output", type=Path, default=None, help="Optional JSON file path to write the report.")
    args = ap.parse_args()

    report = run_audit(local_only=args.local_only)
    serialized = json.dumps(report, indent=2) + "\n"
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
    print(serialized)


if __name__ == "__main__":
    main()
