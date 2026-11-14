# 11. Hydration Prospector: looking for water with SI and orbital data

**Goal:** a light model, trained by the team, that learns from the subsurface hydrogen measurements Curiosity made and predicts from satellite data where sampling is most worthwhile. This is one of the two original science contributions of the project.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 12; guide 02 (terrain window and `provenance`).
**Plan tasks:** 36 to 39.
**Time box: 4 hours of one person.** If there is no validated model after 4 hours, ship plan B (step 8).

## Idea

On Earth, soil moisture measured at a few points is extended to a full map by training a model that relates those measurements to satellite variables (this is how SMAP products are refined), and mineral exploration uses the same scheme for prospectivity maps. Here the same is done on Mars:

| Role | Data | Source |
|------|------|--------|
| **Ground truth** | Curiosity DAN instrument: neutrons that measure hydrogen (water and hydroxyls) in the top half metre of soil, along the whole rover traverse | PDS Geosciences, MSL DAN |
| Orbital predictor | CRISM hydration indices (1.9 μm band depth, hydrated sulfates) | PDS Geosciences, CRISM MTRDR products |
| Orbital predictor | THEMIS night and day infrared brightness | USGS |
| Orbital predictor | Elevation, slope, curvature, aspect, roughness from the DTM | USGS, HiRISE/CTX |
| Orbital predictor | HiRISE or CTX image texture (local mean and standard deviation) | USGS |

Output: a map of expected water-equivalent hydrogen with its uncertainty over the whole scene. The `SCIENCE` agent uses it to pick sampling stations and explains why.

What it is and is not: it predicts **near-surface soil hydration** (water bound in minerals), not liquid water or ice. At Gale, near the equator, there is no shallow ice. Say so in the app and in the README.

## Code

`tools/hydration/build_dataset.py`:

```python
"""Arma la tabla de entrenamiento: una fila por medición DAN, con los predictores orbitales en ese punto.

Entrada: data/raw/dan/dan_points.csv con columnas sol, lon, lat, weh (y weh_err si existe),
         y los rasters de predictores en data/raw/hydration/*.tif (mismo CRS que el DTM).
Salida:  data/raw/hydration/train.parquet
"""
from __future__ import annotations
from pathlib import Path
import numpy as np, pandas as pd, rasterio
from pyproj import CRS, Transformer

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
FEATURES = ["elev", "slope", "curvature", "northness", "roughness", "themis_night", "themis_day",
            "crism_bd1900", "crism_sindex", "img_mean", "img_std"]


def sample(raster: Path, lon: np.ndarray, lat: np.ndarray, radius_px: int = 1) -> np.ndarray:
    """Media en una ventana chica alrededor de cada punto: DAN integra unos metros de suelo."""
    with rasterio.open(raster) as ds:
        crs = CRS.from_wkt(ds.crs.to_wkt())
        x, y = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon, lat)
        band = ds.read(1).astype("float32")
        if ds.nodata is not None:
            band[band == ds.nodata] = np.nan
        rows, cols = rasterio.transform.rowcol(ds.transform, x, y)
        out = np.full(len(lon), np.nan, "float32")
        for i, (r, c) in enumerate(zip(rows, cols)):
            if 0 <= r < ds.height and 0 <= c < ds.width:
                win = band[max(r - radius_px, 0): r + radius_px + 1, max(c - radius_px, 0): c + radius_px + 1]
                if np.isfinite(win).any():
                    out[i] = np.nanmean(win)
        return out


def main():
    pts = pd.read_csv(RAW / "dan" / "dan_points.csv")
    for f in FEATURES:
        pts[f] = sample(RAW / "hydration" / f"{f}.tif", pts.lon.values, pts.lat.values)
    before = len(pts)
    pts = pts.dropna(subset=FEATURES + ["weh"])
    print(f"{len(pts)} de {before} puntos con todos los predictores")
    pts.to_parquet(RAW / "hydration" / "train.parquet")


if __name__ == "__main__":
    main()
```

`tools/hydration/train.py`:

```python
"""Entrena y valida. La validación es por bloques espaciales: puntos vecinos nunca quedan repartidos
entre entrenamiento y prueba, porque eso infla el resultado."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np, pandas as pd, joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import GroupKFold
from sklearn.metrics import r2_score, mean_absolute_error
from scipy.stats import spearmanr
from build_dataset import FEATURES, RAW

BLOCK_M = 500  # tamaño del bloque espacial; mayor que la escala de correlación entre mediciones vecinas


def blocks(df: pd.DataFrame) -> np.ndarray:
    m_per_deg = np.pi / 180 * 3396190
    bx = (df.lon * m_per_deg * np.cos(np.radians(df.lat.mean())) // BLOCK_M).astype(int)
    by = (df.lat * m_per_deg // BLOCK_M).astype(int)
    return (bx.astype(str) + "_" + by.astype(str)).values


def make(q: float | None = None):
    kw = dict(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=0)
    return GradientBoostingRegressor(loss="quantile", alpha=q, **kw) if q else GradientBoostingRegressor(**kw)


def main():
    df = pd.read_parquet(RAW / "hydration" / "train.parquet")
    X, y, g = df[FEATURES].values, df.weh.values, blocks(df)
    n_groups = len(set(g))
    pred, base = np.zeros_like(y, dtype=float), np.zeros_like(y, dtype=float)
    for tr, te in GroupKFold(n_splits=min(5, n_groups)).split(X, y, g):
        pred[te] = make().fit(X[tr], y[tr]).predict(X[te])
        base[te] = y[tr].mean()  # línea de base: predecir siempre la media
    report = {
        "n_points": int(len(y)), "n_spatial_blocks": int(n_groups), "block_m": BLOCK_M,
        "r2_blocked_cv": float(r2_score(y, pred)),
        "spearman_blocked_cv": float(spearmanr(y, pred).statistic),
        "mae_model": float(mean_absolute_error(y, pred)),
        "mae_baseline_mean": float(mean_absolute_error(y, base)),
    }
    final = make().fit(X, y)
    report["feature_importance"] = dict(sorted(zip(FEATURES, map(float, final.feature_importances_)), key=lambda kv: -kv[1]))
    joblib.dump({"mid": final, "lo": make(0.1).fit(X, y), "hi": make(0.9).fit(X, y)}, RAW / "hydration" / "model.joblib")
    (RAW / "hydration" / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
```

`tools/hydration/predict_map.py`:

```python
"""Aplica el modelo a toda la ventana de la escena y guarda el mapa y su incertidumbre."""
from __future__ import annotations
import json
import numpy as np, joblib, rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from PIL import Image
from build_dataset import FEATURES, RAW
import sys; sys.path.append(str(RAW.parents[1] / "tools"))
from common import OUT, add_provenance

N = 1024


def main():
    meta = json.loads((OUT / "terrain" / "meta.json").read_text())
    stack = []
    for f in FEATURES:
        with rasterio.open(RAW / "hydration" / f"{f}.tif") as ds:
            win = from_bounds(*meta["bounds_projected_m"], transform=ds.transform)
            stack.append(ds.read(1, window=win, out_shape=(N, N), resampling=Resampling.bilinear, boundless=True, fill_value=np.nan))
    X = np.stack(stack, -1).reshape(-1, len(FEATURES)).astype("float32")
    ok = np.isfinite(X).all(1)
    m = joblib.load(RAW / "hydration" / "model.joblib")
    mid, width = np.full(N * N, np.nan), np.full(N * N, np.nan)
    mid[ok] = m["mid"].predict(X[ok])
    width[ok] = m["hi"].predict(X[ok]) - m["lo"].predict(X[ok])
    lo, hi = np.nanpercentile(mid, [2, 98])
    wmax = np.nanpercentile(width, 98)
    to8 = lambda a, a0, a1: np.nan_to_num(np.clip((a - a0) / (a1 - a0) * 255, 0, 255)).astype("uint8").reshape(N, N)
    Image.fromarray(to8(mid, lo, hi)).save(OUT / "terrain" / "hydration_1024.png")
    Image.fromarray(to8(width, 0, wmax)).save(OUT / "terrain" / "hydration_unc_1024.png")
    report = json.loads((RAW / "hydration" / "report.json").read_text())
    (OUT / "terrain" / "hydration_meta.json").write_text(json.dumps(
        {"weh_min": float(lo), "weh_max": float(hi), "interval_width_max": float(wmax), "validation": report}, indent=2))
    add_provenance("terrain/hydration_1024.png", source="Modelo propio (gradient boosting) entrenado con MSL DAN (PDS Geosciences) "
                   "y predictores de MRO CRISM, Odyssey THEMIS y HiRISE/CTX (USGS)", product_id="tango-horizon-hydration-v1",
                   url="ver README", transform=f"validación por bloques espaciales de {report['block_m']} m: "
                   f"R2={report['r2_blocked_cv']:.2f}, Spearman={report['spearman_blocked_cv']:.2f}, n={report['n_points']}")


if __name__ == "__main__":
    main()
```

## Instructions for the coding agent

1. `pip install scikit-learn scipy joblib pyarrow`. Training runs on CPU in seconds: there are a few thousand points at most.
2. **DAN first (60 minutes at most).** Open the MSL DAN page at PDS Geosciences (`pds-geosciences.wustl.edu/missions/msl/dan.htm`) and read the product documentation before downloading anything. Look for, in this order of preference:
   - a derived product with hydrogen or water-equivalent hydrogen per measurement;
   - failing that, passive-mode neutron count rates: use the thermal/epithermal ratio as a **relative hydrogen indicator**, and call it that everywhere in the app (not "percent water").
   Each measurement needs its position: join by sol with the Curiosity localization waypoints. Save `data/raw/dan/dan_points.csv`.
   **If there is no usable product, do not invent values or copy them from figures in papers: go to plan B (step 8).**
3. **CRISM.** Use already-processed products (MTRDR with spectral parameters, or their summary products) covering the window, from PDS Geosciences or ODE. Do not process raw cubes. Extract the 1.9 μm band depth (`BD1900` or equivalent) and the sulfate index (`SINDEX2` or equivalent). CRISM is ~18 m/px: together with THEMIS (100 m) it is the lowest-resolution predictor; record this under limitations.
4. **Other predictors:** derive from the DTM and orthoimage already downloaded. All rasters go to `data/raw/hydration/<name>.tif`, reprojected to the DTM CRS. The training area is the whole Curiosity traverse covered by the rasters, not only the 4×4 km window: use the CTX DTM for wide coverage.
5. Run `build_dataset.py` → `train.py` → `predict_map.py`.
6. **Read `report.json` honestly and decide:**

   | Result under spatial-block validation | What is shown |
   |---------------------------------------|---------------|
   | Spearman ≥ 0.4 and model error below the baseline | Prediction map + uncertainty, with the metrics visible |
   | Spearman between 0.2 and 0.4 | Map labelled "weak signal", with the metrics; used only to rank candidates |
   | Spearman < 0.2 or worse than the baseline | The map is not published. Plan B, and the README reports the negative result with its numbers |

   **Do not switch to random validation to improve the number.** Do not tune hyperparameters against the test result more than once.
7. **Integration:** `hydration` layer in the viewer (already in `set_layer`), with legend, units and a second uncertainty layer. The real DAN points are drawn on top as circles, so it is clear where there is a measurement and where a prediction. New read tool `get_hydration_at(x, z)` in `mcp-terrain` and `rank_sample_sites(k)` returning the `k` points with the highest prediction, low uncertainty, drivable slope and under 1.5 km away. `SCIENCE` uses it and explains by voice why it chose the site, naming the most important variables.
8. **Plan B (no model):** a layer with the CRISM hydration index as is, plus the real DAN points along the traverse. `SCIENCE` picks stations from those two. It is still real data from two missions; only the model is lost.
9. **Optional, only with time to spare:** terrain classifier on Navcam images. Check whether Hugging Face hosts a segmentation model already trained on AI4Mars (a NASA JPL dataset) that runs in the browser with `transformers.js`. Verify the license and that it really exists before planning around it. Training one from scratch this weekend does not fit.
10. Translate the Spanish comments and strings in these scripts to English as you copy them.

## Acceptance criteria

- `report.json` exists, with spatial-block validation and a comparison against the baseline.
- The viewer shows the layer with legend, uncertainty and the real DAN points.
- The provenance panel of the layer shows the validation metrics.
- The README states what the model predicts, what it does not, and its numbers.
