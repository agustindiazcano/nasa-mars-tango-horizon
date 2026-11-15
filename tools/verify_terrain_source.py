"""Compare the processed height asset with the authoritative USGS COG crop.

Run from the repository root: python tools/verify_terrain_source.py
No raw raster is written to disk. Network reads have a 45 second timeout.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

root = Path(__file__).resolve().parents[1]
meta = json.loads((root / "web/public/data/terrain/meta.json").read_text())
url = "https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/" + meta["product_id"]
response = requests.get(url, timeout=30)
response.raise_for_status()
href = response.json()["assets"]["dtm"]["href"]
with rasterio.Env(GDAL_HTTP_TIMEOUT="45", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
    with rasterio.open(href) as source:
        crop = source.read(1, window=from_bounds(*meta["bounds_projected_m"], transform=source.transform),
                           out_shape=(meta["height_px"], meta["height_px"]), resampling=Resampling.bilinear,
                           boundless=True, fill_value=source.nodata)
        raw = np.fromfile(root / "web/public/data/terrain/height_2048.u16", dtype="<u2").reshape(crop.shape)
        decoded = meta["z_min_m"] + raw.astype(float) / 65535 * (meta["z_max_m"] - meta["z_min_m"])
        residual = decoded - crop
        evidence = dict(source_url=href, stac_url=url, crs=str(source.crs), transform=list(source.transform),
                        nodata=source.nodata, scales=source.scales, offsets=source.offsets,
                        source_bounds=list(source.bounds), source_shape=[source.height, source.width],
                        processed_sha256=hashlib.sha256(raw.tobytes()).hexdigest(),
                        method="build_terrain.py boundless bilinear crop; full 2048-square comparison",
                        residual_m=dict(min=float(residual.min()), max=float(residual.max()),
                                        mean=float(residual.mean()), rmse=float(np.sqrt(np.mean(residual ** 2)))),
                        vertical_datum="Not established by CRS alone; CTX discrepancy unresolved")
output = root / "docs/evidence/nasa-terrain-source-check.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(evidence, indent=2) + "\n")
print(json.dumps(evidence["residual_m"]))
