"""Crop a HiRISE DTM COG from USGS Astrogeology STAC and generate terrain assets.

Reads only the requested spatial window via HTTP range requests rather than
downloading the full GeoTIFF.

Usage:
  python tools/build_terrain.py --item DTEEC_009149_1750_009294_1750_U01 \
      --size-m 4000 --center-lon 137.400 --center-lat -4.745
"""
from __future__ import annotations

import argparse
import json
import numpy as np
import rasterio
import requests
from PIL import Image
from pyproj import CRS, Transformer
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

from common import OUT, UA, add_provenance

STAC = "https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/"


def find_assets(item_id: str) -> tuple[str, str | None]:
    """Resolve DTM and highest-resolution orthoimage asset URLs from STAC."""
    resp = requests.get(STAC + item_id, headers={"User-Agent": UA}, timeout=60)
    resp.raise_for_status()
    item = resp.json()
    assets = item["assets"]
    dtm = assets["dtm"]["href"]

    # Prefer full-resolution ortho GeoTIFFs (e.g., ortho_1 at 0.25 m/px over ortho_0 at 1 m/px).
    ortho_candidates = [
        (k, a["href"])
        for k, a in assets.items()
        if "ortho" in k.lower()
        and "thumbnail" not in k.lower()
        and "label" not in k.lower()
        and a["href"].lower().endswith(".tif")
    ]
    ortho_candidates.sort(key=lambda kv: kv[0], reverse=True)
    ortho = ortho_candidates[0][1] if ortho_candidates else None
    return dtm, ortho


def window_bounds(ds: rasterio.DatasetReader, size_m: float, lon: float | None, lat: float | None) -> tuple[float, float, float, float]:
    """Compute a square bounding box of size_m meters in the dataset's projected CRS."""
    if lon is None or lat is None:
        cx = (ds.bounds.left + ds.bounds.right) / 2.0
        cy = (ds.bounds.bottom + ds.bounds.top) / 2.0
    else:
        crs = CRS.from_wkt(ds.crs.to_wkt())
        cx, cy = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon, lat)
    half = size_m / 2.0
    return (cx - half, cy - half, cx + half, cy + half)


def read_window(href: str, bounds: tuple[float, float, float, float], out_px: int, resampling: Resampling) -> tuple[np.ndarray, float | None]:
    """Read a resampled single-band window from a remote COG."""
    with rasterio.open(href) as ds:
        win = from_bounds(*bounds, transform=ds.transform)
        fill = ds.nodata if ds.nodata is not None else 0
        arr = ds.read(
            1,
            window=win,
            out_shape=(out_px, out_px),
            resampling=resampling,
            boundless=True,
            fill_value=fill,
        )
        return arr.astype("float32"), ds.nodata


def sky_view_factor(z: np.ndarray, cell_m: float, n_az: int = 16, max_dist_m: float = 1500.0, eye_m: float = 1.6) -> np.ndarray:
    """Compute Sky View Factor as mean cos^2(horizon_angle) across n_az azimuths."""
    acc = np.zeros_like(z, dtype=np.float32)
    dists = np.unique(np.geomspace(cell_m, max_dist_m, 36).round(1))
    for k in range(n_az):
        az = 2.0 * np.pi * k / n_az
        dx, dy = np.cos(az), np.sin(az)
        tan_max = np.zeros_like(z, dtype=np.float32)
        for d in dists:
            sx = int(round(dx * d / cell_m))
            sy = int(round(-dy * d / cell_m))
            if sx == 0 and sy == 0:
                continue
            shifted = np.roll(np.roll(z, -sy, axis=0), -sx, axis=1)
            # Out-of-bounds pixels do not cast horizon obstruction.
            if sx > 0:
                shifted[:, -sx:] = -1e9
            elif sx < 0:
                shifted[:, :-sx] = -1e9
            if sy > 0:
                shifted[-sy:, :] = -1e9
            elif sy < 0:
                shifted[:-sy, :] = -1e9
            tan_max = np.maximum(tan_max, (shifted - (z + eye_m)) / float(d))
        acc += 1.0 / (1.0 + tan_max ** 2)
    return acc / float(n_az)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--item", default="DTEEC_009149_1750_009294_1750_U01")
    ap.add_argument("--size-m", type=float, default=4000.0)
    ap.add_argument("--center-lon", type=float, default=137.400)
    ap.add_argument("--center-lat", type=float, default=-4.745)
    args = ap.parse_args()

    dtm_href, ortho_href = find_assets(args.item)
    out = OUT / "terrain"
    out.mkdir(parents=True, exist_ok=True)

    with rasterio.open(dtm_href) as ds:
        bounds = window_bounds(ds, args.size_m, args.center_lon, args.center_lat)
        crs = CRS.from_wkt(ds.crs.to_wkt())
        to_geo = Transformer.from_crs(crs, crs.geodetic_crs, always_xy=True)
        lon0, lat0 = to_geo.transform((bounds[0] + bounds[2]) / 2.0, (bounds[1] + bounds[3]) / 2.0)

    z, nodata = read_window(dtm_href, bounds, 2048, Resampling.bilinear)
    bad = ~np.isfinite(z) | (z < -1e4)
    if nodata is not None:
        bad |= (z == nodata)
    hole_pct = float(100.0 * bad.mean())
    if hole_pct > 2.0:
        raise SystemExit(f"{hole_pct:.2f}% holes in window exceeds 2% limit; shift center or use another DTM")
    if bad.any():
        z[bad] = float(np.nanmedian(z[~bad]))

    zmin, zmax = float(z.min()), float(z.max())
    q = np.round((z - zmin) / max(zmax - zmin, 1e-6) * 65535.0).astype("<u2")
    q.tofile(out / "height_2048.u16")

    cell = args.size_m / 1024.0
    z4 = z.reshape(1024, 2, 1024, 2).mean(axis=(1, 3))
    gy, gx = np.gradient(z4, cell)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    Image.fromarray(np.clip(slope / 45.0 * 255.0, 0, 255).astype("uint8")).save(out / "slope_1024.png")

    svf = sky_view_factor(z4, cell)
    Image.fromarray(np.clip(svf * 255.0, 0, 255).astype("uint8")).save(out / "svf_1024.png")

    meta = {
        "product_id": args.item,
        "size_m": args.size_m,
        "height_px": 2048,
        "z_min_m": zmin,
        "z_max_m": zmax,
        "center_lon_e": lon0,
        "center_lat": lat0,
        "bounds_projected_m": list(bounds),
        "slope_max_deg": 45,
        "hole_pct": round(hole_pct, 3),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    if ortho_href:
        o, _ = read_window(ortho_href, bounds, 4096, Resampling.average)
        valid_o = o[o > 0]
        if valid_o.size == 0:
            raise SystemExit("Orthoimage window is empty")
        lo, hi = np.percentile(valid_o, [1, 99])
        img = np.clip((o - lo) / max(float(hi - lo), 1e-6) * 255.0, 0, 255).astype("uint8")
        Image.fromarray(img).save(out / "ortho_4096.webp", quality=85)

    src = "USGS Astrogeology, MRO HiRISE SOCET DTMs (NASA/JPL/University of Arizona/USGS)"
    add_provenance(
        "terrain/height_2048.u16",
        source=src,
        product_id=args.item,
        url=dtm_href,
        transform=f"{args.size_m:.0f} m square window centered at ({lon0:.4f}E, {lat0:.4f}N), bilinear resample to 2048x2048 uint16",
    )
    add_provenance(
        "terrain/meta.json",
        source=src,
        product_id=args.item,
        url=dtm_href,
        transform="Bounding box, elevation range, and hole percentage metadata for the 4x4 km Gale Crater Mount Sharp window",
    )
    add_provenance(
        "terrain/svf_1024.png",
        source=src,
        product_id=args.item,
        url=dtm_href,
        transform="Sky View Factor (cos^2 horizon angle), 16 azimuths, 1500 m radius, 1.6 m eye height, 1024x1024 uint8",
    )
    add_provenance(
        "terrain/slope_1024.png",
        source=src,
        product_id=args.item,
        url=dtm_href,
        transform="Terrain slope in degrees (0-45 deg mapped to 0-255) by central differences on ~3.9 m grid",
    )
    if ortho_href:
        add_provenance(
            "terrain/ortho_4096.webp",
            source=src,
            product_id=args.item,
            url=ortho_href,
            transform="Co-registered HiRISE orthoimage window, 1-99 percentile contrast stretch, 4096x4096 WebP",
        )
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
