"""Generate qualitative 3-class thermal inertia proxy from Mars Odyssey THEMIS night IR.

Reads the same Gale Crater window defined in web/public/data/terrain/meta.json from
USGS STAC collection `mo_themis_controlled_mosaics` item `mc23_aeolis_nir` and segments
nighttime brightness into 3 terciles:
  0 (pixel=0):   cold at night -> loose aeolian material / sinkage risk
  1 (pixel=127): intermediate -> mixed regolith
  2 (pixel=255): warm at night -> consolidated bedrock / firm ground

This is a qualitative proxy; absolute thermal inertia (TIU) values are never inferred.
"""
from __future__ import annotations

import json
import numpy as np
import rasterio
import requests
from PIL import Image
from pyproj import CRS, Transformer
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

from common import OUT, UA, add_provenance

STAC_THEMIS = "https://stac.astrogeology.usgs.gov/api/collections/mo_themis_controlled_mosaics/items/mc23_aeolis_nir"


def main() -> None:
    meta_path = OUT / "terrain" / "meta.json"
    if not meta_path.exists():
        raise SystemExit("Run tools/build_terrain.py first to create terrain/meta.json")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    resp = requests.get(STAC_THEMIS, headers={"User-Agent": UA}, timeout=60)
    resp.raise_for_status()
    item = resp.json()
    href = item["assets"]["image"]["href"]

    # Transform the HiRISE window center into the THEMIS mosaic CRS so both windows align.
    size_m = float(meta["size_m"])
    lon0 = float(meta["center_lon_e"])
    lat0 = float(meta["center_lat"])

    with rasterio.open(href) as ds:
        crs = CRS.from_wkt(ds.crs.to_wkt())
        cx, cy = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon0, lat0)
        half = size_m / 2.0
        bounds = (cx - half, cy - half, cx + half, cy + half)
        win = from_bounds(*bounds, transform=ds.transform)
        arr = ds.read(
            1,
            window=win,
            out_shape=(1024, 1024),
            resampling=Resampling.bilinear,
            boundless=True,
            fill_value=0,
        ).astype("float32")
        nodata = ds.nodata

    valid = np.isfinite(arr) & (arr > 0)
    if nodata is not None:
        valid &= (arr != nodata)
    if not valid.any():
        raise SystemExit("THEMIS window has no valid pixels")

    q1, q2 = np.percentile(arr[valid], [33.333, 66.667])
    classes = np.ones_like(arr, dtype=np.uint8)
    classes[arr <= q1] = 0
    classes[arr >= q2] = 2

    # Encode classes 0, 1, 2 as 0, 127, 255 so both shader textures and discrete readers work cleanly.
    encoded = (classes * 127).clip(0, 255).astype(np.uint8)
    encoded[classes == 2] = 255

    out_path = OUT / "terrain" / "thermal_class.png"
    Image.fromarray(encoded, mode="L").save(out_path)

    add_provenance(
        "terrain/thermal_class.png",
        source="USGS Astrogeology / ASU, Mars Odyssey THEMIS Controlled Night IR Mosaic (mc23_aeolis_nir)",
        product_id="mc23_aeolis_nir",
        url=href,
        transform="Qualitative 3-class tercile proxy (0=cold/loose, 127=medium/mixed, 255=warm/rock) over matching 4x4 km window, 1024x1024 uint8",
        notes="Qualitative proxy only; DN values are not converted to physical TIU units.",
        tercile_thresholds=[round(float(q1), 2), round(float(q2), 2)],
    )
    counts = {int(c): int((classes == c).sum()) for c in (0, 1, 2)}
    print(json.dumps({"output": str(out_path), "thresholds": [float(q1), float(q2)], "counts": counts}, indent=2))


if __name__ == "__main__":
    main()
