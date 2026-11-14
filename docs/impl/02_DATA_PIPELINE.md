# 02. Data pipeline

**Goal:** turn real NASA/USGS products into small static files under `web/public/data/`, each with its provenance.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 8.1 and 8.3; `data/radiation/RAD_RDR_SIS.html` (RAD format).
**Plan tasks:** 5, 6, 7, 8, 20, 21, 27.

Rule: U.S. Government sources only (NASA, USGS, PDS nodes). Every script adds its entry to `web/public/data/provenance.json`.

## Outputs

| File | Content | Used by |
|------|---------|---------|
| `terrain/height_2048.u16` + `terrain/meta.json` | 4×4 km elevation at ~2 m, quantized to 16 bits | Mesh, physics, routing |
| `terrain/ortho_4096.webp` | HiRISE orthoimage | Texture |
| `terrain/slope_1024.png` | Slope in degrees (0 to 45 → 0 to 255) | Layer, routing |
| `terrain/svf_1024.png` | Sky view factor (0 to 1 → 0 to 255) | Layer, dose |
| `terrain/thermal_class.png` | 3 classes from THEMIS night IR | Layer, ground cost |
| `env/rems_clear.json`, `env/rems_storm2018.json` | Pressure, temperatures, UV per hour | HUD, atmosphere, storm |
| `env/rad_quiet.json`, `env/rad_sep2017.json` | Dose rate vs. time | HUD, radiation |
| `env/ephem.json` | Earth-Mars light time, Sun position | Comms delay, lighting |
| `provenance.json` | Dataset, ID, URL, date, transform | Provenance panel |

## Code

`tools/common.py`:

```python
"""Utilidades compartidas del pipeline."""
from __future__ import annotations
import json, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "web" / "public" / "data"
UA = "tango-horizon-pipeline/1.0"


def add_provenance(key: str, **fields) -> None:
    """Registra de donde salio un archivo. key = ruta relativa dentro de public/data."""
    p = OUT / "provenance.json"
    db = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    db[key] = {**fields, "retrieved": time.strftime("%Y-%m-%d")}
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8")
```

`tools/build_terrain.py`:

```python
"""Recorta un DTM HiRISE (COG en USGS) y genera altura, pendiente y sky view factor.

Lee solo la ventana pedida por HTTP (lectura parcial), no baja el GeoTIFF entero.
Uso: python tools/build_terrain.py --item DTEEC_009149_1750_009294_1750_U01 --size-m 4000
     [--center-lon 137.40 --center-lat -4.80]
"""
from __future__ import annotations
import argparse, json
import numpy as np
import rasterio, requests
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from pyproj import CRS, Transformer
from PIL import Image
from common import OUT, UA, add_provenance

STAC = "https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_socet_dtms/items/"


def find_assets(item_id: str) -> tuple[str, str | None]:
    item = requests.get(STAC + item_id, headers={"User-Agent": UA}, timeout=60).json()
    assets = item["assets"]
    dtm = assets["dtm"]["href"]
    ortho = next((a["href"] for k, a in assets.items() if "ortho" in k.lower()), None)
    return dtm, ortho


def window_bounds(ds, size_m, lon, lat):
    """Caja cuadrada de size_m metros en el CRS proyectado del dataset."""
    if lon is None:
        cx = (ds.bounds.left + ds.bounds.right) / 2
        cy = (ds.bounds.bottom + ds.bounds.top) / 2
    else:
        crs = CRS.from_wkt(ds.crs.to_wkt())
        cx, cy = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon, lat)
    h = size_m / 2
    return cx - h, cy - h, cx + h, cy + h


def read_window(href, bounds, out_px, resampling):
    with rasterio.open(href) as ds:
        win = from_bounds(*bounds, transform=ds.transform)
        arr = ds.read(1, window=win, out_shape=(out_px, out_px), resampling=resampling,
                      boundless=True, fill_value=ds.nodata if ds.nodata is not None else 0)
        return arr.astype("float32"), ds.nodata


def sky_view_factor(z, cell_m, n_az=16, max_dist_m=1500.0, eye_m=1.6):
    """SVF = promedio sobre acimuts de cos^2(angulo de horizonte). z en metros."""
    n = z.shape[0]
    acc = np.zeros_like(z)
    dists = np.unique(np.geomspace(cell_m, max_dist_m, 36).round(1))
    for k in range(n_az):
        az = 2 * np.pi * k / n_az
        dx, dy = np.cos(az), np.sin(az)
        tan_max = np.zeros_like(z)
        for d in dists:
            sx, sy = int(round(dx * d / cell_m)), int(round(-dy * d / cell_m))
            if sx == 0 and sy == 0:
                continue
            shifted = np.roll(np.roll(z, -sy, axis=0), -sx, axis=1)
            # fuera del borde: no cuenta como obstaculo
            if sx > 0: shifted[:, -sx:] = -1e9
            if sx < 0: shifted[:, :-sx] = -1e9
            if sy > 0: shifted[-sy:, :] = -1e9
            if sy < 0: shifted[:-sy, :] = -1e9
            tan_max = np.maximum(tan_max, (shifted - (z + eye_m)) / d)
        acc += 1.0 / (1.0 + tan_max ** 2)  # cos^2(atan(t)) = 1/(1+t^2)
    return acc / n_az


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--item", required=True)
    ap.add_argument("--size-m", type=float, default=4000)
    ap.add_argument("--center-lon", type=float)
    ap.add_argument("--center-lat", type=float)
    a = ap.parse_args()

    dtm_href, ortho_href = find_assets(a.item)
    out = OUT / "terrain"
    out.mkdir(parents=True, exist_ok=True)

    with rasterio.open(dtm_href) as ds:
        bounds = window_bounds(ds, a.size_m, a.center_lon, a.center_lat)
        crs = CRS.from_wkt(ds.crs.to_wkt())
        to_geo = Transformer.from_crs(crs, crs.geodetic_crs, always_xy=True)
        lon0, lat0 = to_geo.transform((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)

    z, nodata = read_window(dtm_href, bounds, 2048, Resampling.bilinear)
    bad = ~np.isfinite(z) | (z == nodata) | (z < -1e4)
    hole_pct = 100 * bad.mean()
    if hole_pct > 2:
        raise SystemExit(f"{hole_pct:.1f}% de huecos en la ventana: mover el centro o usar otro DTM")
    z[bad] = np.nanmedian(z[~bad])

    zmin, zmax = float(z.min()), float(z.max())
    q = np.round((z - zmin) / (zmax - zmin) * 65535).astype("<u2")
    q.tofile(out / "height_2048.u16")

    cell = a.size_m / 1024
    z4 = z.reshape(1024, 2, 1024, 2).mean(axis=(1, 3))
    gy, gx = np.gradient(z4, cell)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    Image.fromarray(np.clip(slope / 45 * 255, 0, 255).astype("uint8")).save(out / "slope_1024.png")
    svf = sky_view_factor(z4, cell)
    Image.fromarray(np.clip(svf * 255, 0, 255).astype("uint8")).save(out / "svf_1024.png")

    meta = {"product_id": a.item, "size_m": a.size_m, "height_px": 2048,
            "z_min_m": zmin, "z_max_m": zmax, "center_lon_e": lon0, "center_lat": lat0,
            "bounds_projected_m": bounds, "slope_max_deg": 45, "hole_pct": round(hole_pct, 3)}
    (out / "meta.json").write_text(json.dumps(meta, indent=2))

    if ortho_href:
        o, _ = read_window(ortho_href, bounds, 4096, Resampling.average)
        lo, hi = np.percentile(o[o > 0], [1, 99])
        img = np.clip((o - lo) / (hi - lo) * 255, 0, 255).astype("uint8")
        Image.fromarray(img).save(out / "ortho_4096.webp", quality=88)

    src = "USGS Astrogeology, MRO HiRISE SOCET DTMs (NASA/JPL/University of Arizona/USGS)"
    add_provenance("terrain/height_2048.u16", source=src, product_id=a.item, url=dtm_href,
                   transform=f"ventana {a.size_m:.0f} m, remuestreo bilineal a 2048 px, 16 bits")
    add_provenance("terrain/svf_1024.png", source=src, product_id=a.item, url=dtm_href,
                   transform="sky view factor, 16 acimuts, radio 1500 m, altura de ojos 1,6 m")
    add_provenance("terrain/slope_1024.png", source=src, product_id=a.item, url=dtm_href,
                   transform="pendiente por diferencias centrales sobre grilla de ~4 m")
    if ortho_href:
        add_provenance("terrain/ortho_4096.webp", source=src, product_id=a.item, url=ortho_href,
                       transform="misma ventana, estirado de contraste percentil 1 a 99")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
```

`tools/pds3.py` (generic PDS3 table reader; used for REMS):

```python
"""Lee una tabla ASCII PDS3 usando las columnas declaradas en su etiqueta .LBL."""
from __future__ import annotations
import re
from pathlib import Path
import pandas as pd


def parse_columns(lbl_text: str) -> list[dict]:
    cols = []
    for block in re.findall(r"OBJECT\s*=\s*COLUMN(.*?)END_OBJECT\s*=\s*COLUMN", lbl_text, re.S):
        def g(key):
            m = re.search(rf"^\s*{key}\s*=\s*\"?([^\"\r\n]+)\"?", block, re.M)
            return m.group(1).strip() if m else None
        cols.append({"name": g("NAME"), "start": int(g("START_BYTE")), "bytes": int(g("BYTES")),
                     "unit": g("UNIT"), "missing": g("MISSING_CONSTANT")})
    return cols


def read_table(tab: Path, lbl: Path) -> pd.DataFrame:
    cols = parse_columns(lbl.read_text(errors="replace"))
    specs = [(c["start"] - 1, c["start"] - 1 + c["bytes"]) for c in cols]
    df = pd.read_fwf(tab, colspecs=specs, names=[c["name"] for c in cols], header=None)
    for c in cols:
        s = df[c["name"]]
        if s.dtype == object:
            s = s.astype(str).str.strip().str.strip(',"')
            conv = pd.to_numeric(s, errors="coerce")
            df[c["name"]] = conv if conv.notna().mean() > 0.5 else s
    return df
```

## Instructions for the coding agent

1. **Download nothing that is not in plan table 8.1.** Raw files go to `data/raw/<dataset>/`. Run scripts that read downloaded files with `python -I`.
2. Install what is missing: `pip install rasterio pyproj pillow pandas requests numpy`.
3. **Terrain.** Run `build_terrain.py` with the item in row 1 of the plan. Before fixing the center, get Curiosity's recent position (traverse, row 7) and center the window there if it falls inside the DTM; otherwise try the alternative DTMs. Open `slope_1024.png` and `ortho_4096.webp` and check for stripes or holes.
   - The script assumes the asset key is `dtm` and that the orthoimage key contains `ortho`. Print `item["assets"].keys()` and adjust if needed.
   - If the orthoimage does not cover the window, use the HiRISE image from `mro_hirise_uncontrolled_observations` that does.
4. **THEMIS.** Write `build_thermal.py` with the same window logic over `mc23_aeolis_nir` (collection `mo_themis_controlled_mosaics`). Output: 3 classes by terciles of brightness inside the window (cold at night = loose material, medium, warm = rock). This is a **qualitative proxy**: never print thermal inertia values.
5. **REMS.** List `https://atmos.nmsu.edu/PDS/data/mslrem_1001/DATA/`, find the MODRDR products (`*RMD*`), download `.TAB` and `.LBL` for 3 clear sols and a stretch of the 2018 storm. Read the `.LBL` to confirm dates before choosing sols. Parse with `pds3.read_table`. If the file is comma-separated and `read_fwf` fails, use `pd.read_csv` with the names from `parse_columns`. Output per sol: arrays by local solar hour of pressure (Pa), air and ground temperature (K), UV. Filter values flagged as missing in the label.
   - Dust opacity is not in MODRDR. Look in PDS Atmospheres for the MSL Mastcam/REMS opacity product. If it does not turn up in 30 minutes, use the REMS UV drop as a relative storm indicator and label it as such in the HUD.
   - Guide 13 (storm nowcaster) needs the full multi-year REMS record; if that guide is in scope, download all sols once here.
6. **RAD.** Read `data/radiation/RAD_RDR_SIS.html` first to learn which table holds dose rate and in which units. Download from the PPI node one quiet week and 10 to 15 September 2017. Output: dose-rate series (μGy/h in the detector named by the SIS) with timestamps. If converting to dose equivalent, use the quality factor provided by the RDR itself and record it in provenance; do not invent the factor.
7. **Ephemerides.** `data/horizons/*.json` already exist. Extract Earth-Mars light time and ask Horizons for Sun elevation and azimuth at the site (observer on the surface of Mars, body 499, scene-center coordinates).
8. **SUITS.** Download the JSON files in `TSS_2024/public/json_data` and generate `shared/src/types/suit.ts` with the real telemetry names and units. Do not invent fields.
9. **GLB models** of Curiosity, Ingenuity and MRO from `science.nasa.gov/3d-resources` into `web/public/models/`. If one is over 15 MB, compress it (for example `gltf-transform optimize`).
10. Every output registers itself with `add_provenance`.

## Acceptance criteria

- `web/public/data/terrain/meta.json` exists with `hole_pct` under 2.
- REMS pressure falls between 600 and 1,000 Pa and air temperature between 180 and 290 K. Otherwise the parse is wrong.
- Quiet-time RAD dose rate is on the order of 0.2 mGy/day. Otherwise check units.
- `provenance.json` has one entry per file in `public/data`.
- `web/public/data` is under 80 MB.
