"""Build the training table for the Mars Hydration Prospector model.

Downloads and caches:
  1. MSL DAN passive-mode neutron count rates (MSL-M-DAN-3/4-RDR-V1.0,
     DAN_AVERAGED_PASSIV `rap` files, Sols 3-2958) from PDS Geosciences,
     yielding the background-subtracted thermal-to-epithermal ratio
     (relative near-surface hydrogen indicator, stored in column `weh`).
  2. Wide-coverage orbital predictor stack (20 m/px, Mars Equirectangular):
     - CTX controlled DTM (`elev`, `slope`, `curvature`, `northness`, `roughness`)
       and co-registered CTX orthoimage (`img_mean`, `img_std`) via USGS STAC
     - THEMIS controlled Night IR (`themis_night`) and Day IR (`themis_day`)
       mosaics (`mc23_aeolis_nir`, `mc23_aeolis_dir`) via USGS STAC
     - MRO CRISM MTRDR refined spectral summary parameters (`crism_bd1900` =
       BD1900_2, `crism_sindex` = SINDEX2) from PDS Geosciences

Outputs:
  - data/raw/dan/dan_points.csv
  - data/raw/hydration/<feature>.tif (11 predictors on common 20 m/px grid)
  - data/raw/hydration/train.parquet
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import struct
import sys
import threading
from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
import requests
from pyproj import CRS, Transformer
from rasterio.enums import Resampling
from rasterio.transform import from_bounds as transform_from_bounds
from rasterio.windows import from_bounds
from requests.adapters import HTTPAdapter
from scipy.ndimage import uniform_filter
from urllib3.util.retry import Retry

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import OUT, ROOT, UA  # noqa: E402

RAW = ROOT / "data" / "raw"
DAN_BASE = "https://pds-geosciences.wustl.edu/msl/msl-m-dan-3_4-rdr-v1/msldan_1xxx"

FEATURES = [
    "elev",
    "slope",
    "curvature",
    "northness",
    "roughness",
    "themis_night",
    "themis_day",
    "crism_bd1900",
    "crism_sindex",
    "img_mean",
    "img_std",
]

# Study window covering the full Curiosity traverse (Bradbury Landing to Mount Sharp)
# and the 4x4 km HiRISE 3D mission scene in Mars Equirectangular (clon=0, R=3396190 m).
STUDY_BOUNDS = (8139500.0, -288500.0, 8149500.0, -270000.0)
GRID_RES_M = 20.0

CTX_ITEM = "T01_000815_1749_XN_05S222W__P21_009149_1752_XI_04S222W"
CTX_DEM_URL = (
    f"https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/{CTX_ITEM}/{CTX_ITEM}-DEM.tif"
)
CTX_DRG_URL = (
    f"https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/ctx/controlled/usgs/{CTX_ITEM}/{CTX_ITEM}-DRG.tif"
)
THEMIS_NIR_URL = (
    "https://astrogeo-ard.s3.us-west-2.amazonaws.com/mars/mo/themis/controlled_mosaics/mc23_aeolis_nir/mc23_aeolis_nir.tif"
)
THEMIS_DIR_URL = (
    "https://astrogeo-ard.s3.us-west-2.amazonaws.com/mars/mo/themis/controlled_mosaics/mc23_aeolis_dir/mc23_aeolis_dir.tif"
)

# CRISM MTRDR cubes covering Gale Crater traverse & 4x4 km Mount Sharp window (FRT ~18 m/px, HRL ~36 m/px).
CRISM_CUBES_FRT = [
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2007/2007_112/frt000058a3/frt000058a3_07_sr165j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2008/2008_191/frt0000b6f1/frt0000b6f1_07_sr165j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2011/2011_342/frt00021c92/frt00021c92_07_sr164j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2008/2008_246/frt0000c518/frt0000c518_07_sr165j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2011/2011_254/frt0002037a/frt0002037a_07_sr165j_mtr3",
]
CRISM_CUBES_HRL = [
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2008/2008_202/hrl0000baba/hrl0000baba_07_sr182j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2008/2008_302/hrl0000d21c/hrl0000d21c_07_sr183j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2008/2008_307/hrl0000d349/hrl0000d349_07_sr182j_mtr3",
    "https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/mtrdr/2009/2009_113/hrl0001233b/hrl0001233b_07_sr183j_mtr3",
]


_THREAD_LOCAL = threading.local()


def _get_session() -> requests.Session:
    """Return a per-thread keep-alive HTTP session with retry."""
    sess = getattr(_THREAD_LOCAL, "session", None)
    if sess is None:
        sess = requests.Session()
        retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
        adapter = HTTPAdapter(pool_connections=16, pool_maxsize=16, max_retries=retry)
        sess.mount("https://", adapter)
        sess.mount("http://", adapter)
        sess.headers.update({"User-Agent": UA})
        _THREAD_LOCAL.session = sess
    return sess


def _download_bytes(url: str, dest: Path, timeout: int = 30) -> bytes:
    """Download URL to dest if not cached, returning bytes."""
    if dest.exists() and dest.stat().st_size > 0:
        return dest.read_bytes()
    dest.parent.mkdir(parents=True, exist_ok=True)
    resp = _get_session().get(url, timeout=timeout)
    resp.raise_for_status()
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(resp.content)
    tmp.replace(dest)
    return resp.content


def _parse_rap_product(pid: str) -> list[dict]:
    """Download and parse one DAN_AVERAGED_PASSIV (`rap`) binary table."""
    m = re.search(r"rap(\d{4})", pid)
    if not m:
        return []
    sol_str = m.group(1)
    sol = int(sol_str)
    cache_dir = RAW / "dan" / "rap" / f"sol{sol_str}"
    lbl_bytes = _download_bytes(f"{DAN_BASE}/data/sol{sol_str}/{pid}.lbl", cache_dir / f"{pid}.lbl")
    dat_bytes = _download_bytes(f"{DAN_BASE}/data/sol{sol_str}/{pid}.dat", cache_dir / f"{pid}.dat")

    lbl_text = lbl_bytes.decode("ascii", errors="replace")
    m_rows = re.search(r"ROWS\s*=\s*(\d+)", lbl_text)
    m_rb = re.search(r"ROW_BYTES\s*=\s*(\d+)", lbl_text)
    n_rows = int(m_rows.group(1)) if m_rows else 0
    row_bytes = int(m_rb.group(1)) if m_rb else 122

    records: list[dict] = []
    for i in range(n_rows):
        off = i * row_bytes
        if off + 106 > len(dat_bytes):
            break
        rec = dat_bytes[off : off + row_bytes]
        blat, blon, elat, elon = struct.unpack(">ffff", rec[54:70])
        dur = struct.unpack(">I", rec[70:74])[0]
        ctn_avg, ctn_bkgd, ctn_err, _ = struct.unpack(">ffff", rec[74:90])
        cetn_avg, cetn_bkgd, cetn_err, _ = struct.unpack(">ffff", rec[90:106])

        lat = 0.5 * (blat + elat)
        lon = 0.5 * (blon + elon)
        if not (-5.5 <= lat <= -4.0 and 137.0 <= lon <= 138.0):
            continue
        if dur < 60:
            continue

        ctn_net = ctn_avg - ctn_bkgd
        cetn_net = cetn_avg - cetn_bkgd
        if not (np.isfinite(ctn_net) and np.isfinite(cetn_net)):
            continue
        # Reject non-physical passive intervals (noise/pulsing bleed-through).
        if ctn_net <= 5.0 or cetn_net <= 2.0 or cetn_avg > 150.0 or cetn_avg > 60.0:
            continue

        ratio = ctn_net / cetn_net
        if not (1.0 <= ratio <= 12.0):
            continue

        rel_err = float(np.hypot(ctn_err / max(ctn_net, 1e-3), cetn_err / max(cetn_net, 1e-3)))
        records.append(
            {
                "sol": sol,
                "lon": float(lon),
                "lat": float(lat),
                "duration_s": int(dur),
                "ctn_net": float(ctn_net),
                "cetn_net": float(cetn_net),
                "h_ratio": float(ratio),
                "h_ratio_err": float(ratio * rel_err),
            }
        )
    return records


def fetch_dan_points(force: bool = False) -> pd.DataFrame:
    """Download DAN passive measurements and aggregate by rover stop location (~15 m bin)."""
    out_csv = RAW / "dan" / "dan_points.csv"
    if out_csv.exists() and not force:
        df = pd.read_csv(out_csv)
        if len(df) > 100:
            return df

    inv_url = f"{DAN_BASE}/data/collection_data_science_derived_inventory.csv"
    inv_text = _download_bytes(inv_url, RAW / "dan" / "derived_inventory.csv").decode("utf-8", errors="replace")
    rap_ids = [line.split(":")[-3] for line in inv_text.splitlines() if "rap" in line]
    print(f"Downloading and parsing {len(rap_ids)} DAN_AVERAGED_PASSIV (rap) products...")

    rows: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        for idx, recs in enumerate(pool.map(_parse_rap_product, rap_ids), 1):
            rows.extend(recs)
            if idx % 100 == 0 or idx == len(rap_ids):
                print(f"  parsed {idx}/{len(rap_ids)} DAN files ({len(rows)} frames)...")

    raw_df = pd.DataFrame(rows)
    if raw_df.empty:
        raise RuntimeError("No valid DAN passive measurements parsed from PDS Geosciences")

    # Aggregate stationary/repeated frames at the same ~15 m stop (0.00025 deg ~ 15 m on Mars)
    # weighted by collection duration to suppress single-frame Poisson noise.
    raw_df["lat_bin"] = (raw_df["lat"] / 0.00025).round().astype(int)
    raw_df["lon_bin"] = (raw_df["lon"] / 0.00025).round().astype(int)

    grouped: list[dict] = []
    for (_, _), grp in raw_df.groupby(["lat_bin", "lon_bin"]):
        w = grp["duration_s"].values.astype(float)
        w_sum = w.sum()
        ctn_w = float(np.sum(grp["ctn_net"].values * w) / w_sum)
        cetn_w = float(np.sum(grp["cetn_net"].values * w) / w_sum)
        ratio = ctn_w / cetn_w
        # Propagate inverse-variance error across combined frames
        err = float(np.sqrt(np.sum((grp["h_ratio_err"].values * w) ** 2)) / w_sum)
        grouped.append(
            {
                "sol": int(grp["sol"].median()),
                "lon": float(np.sum(grp["lon"].values * w) / w_sum),
                "lat": float(np.sum(grp["lat"].values * w) / w_sum),
                "duration_s": int(w_sum),
                "n_frames": int(len(grp)),
                "ctn_net": ctn_w,
                "cetn_net": cetn_w,
                "weh": float(ratio),
                "weh_err": err,
            }
        )

    pts = pd.DataFrame(grouped).sort_values("sol").reset_index(drop=True)
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    pts.to_csv(out_csv, index=False)
    print(f"Saved {len(pts)} aggregated DAN measurement sites (from {len(raw_df)} frames) to {out_csv}")
    return pts


def _nan_box_stats(arr: np.ndarray, size: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """Compute NaN-aware local window mean and standard deviation."""
    valid = np.isfinite(arr).astype("float64")
    filled = np.where(np.isfinite(arr), arr.astype("float64"), 0.0)
    w_sum = uniform_filter(valid, size=size, mode="nearest") * (size * size)
    s1 = uniform_filter(filled, size=size, mode="nearest") * (size * size)
    s2 = uniform_filter(filled * filled, size=size, mode="nearest") * (size * size)
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.where(w_sum > 0, s1 / w_sum, np.nan)
        var = np.where(w_sum > 1, np.maximum(0.0, s2 / w_sum - mean * mean), 0.0)
    return mean.astype("float32"), np.sqrt(var).astype("float32")


def _parse_crism_bands(hdr_text: str) -> tuple[int, int, float]:
    """Return 1-based band indices for BD1900_2 and SINDEX2 plus ignore value."""
    m_ign = re.search(r"data ignore value\s*=\s*([0-9eE.+\-]+)", hdr_text)
    ignore = float(m_ign.group(1)) if m_ign else 65535.0
    m_bands = re.search(r"band names\s*=\s*\{([^}]+)\}", hdr_text, re.S)
    if not m_bands:
        raise ValueError("Missing band names in CRISM HDR")
    names = [b.strip() for b in m_bands.group(1).split(",") if b.strip()]
    bd1900_idx = names.index("BD1900_2") + 1
    sindex_idx = names.index("SINDEX2") + 1
    return bd1900_idx, sindex_idx, ignore


def _read_crism_band_pair(base_url: str, width: int, height: int) -> tuple[np.ndarray, np.ndarray]:
    """Fetch BD1900_2 and SINDEX2 bands from one CRISM MTRDR SR cube onto the study grid."""
    cube_name = base_url.rsplit("/", 1)[-1]
    cache_npz = RAW / "crism" / f"{cube_name}.npz"
    if cache_npz.exists():
        d = np.load(cache_npz)
        return d["bd1900"], d["sindex"]

    hdr_text = _download_bytes(base_url + ".hdr", RAW / "crism" / f"{cube_name}.hdr").decode("utf-8", errors="replace")
    b1900, bsidx, ignore = _parse_crism_bands(hdr_text)

    img_url = "/vsicurl/" + base_url + ".img"
    with rasterio.open(img_url) as ds:
        win = from_bounds(*STUDY_BOUNDS, transform=ds.transform)
        arr = ds.read(
            [b1900, bsidx],
            window=win,
            out_shape=(height, width),
            resampling=Resampling.bilinear,
            boundless=True,
            fill_value=ignore,
        ).astype("float32")

    bd1900, sindex = arr[0], arr[1]
    for a in (bd1900, sindex):
        bad = (~np.isfinite(a)) | (np.abs(a - ignore) < 1.0) | (np.abs(a) > 1.0)
        a[bad] = np.nan

    cache_npz.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(cache_npz, bd1900=bd1900, sindex=sindex)
    return bd1900, sindex


def _write_geotiff(path: Path, data: np.ndarray, crs: CRS, transform) -> None:
    """Save a single-band float32 GeoTIFF with NaN nodata."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=data.shape[0],
        width=data.shape[1],
        count=1,
        dtype="float32",
        crs=crs,
        transform=transform,
        nodata=np.nan,
        compress="deflate",
    ) as dst:
        dst.write(data.astype("float32"), 1)


def build_predictor_rasters(force: bool = False) -> None:
    """Build all 11 aligned 20 m/px predictor GeoTIFFs in data/raw/hydration/."""
    hyd_dir = RAW / "hydration"
    if not force and all((hyd_dir / f"{f}.tif").exists() for f in FEATURES):
        print("All 11 predictor GeoTIFFs already exist in data/raw/hydration/")
        return

    left, bottom, right, top = STUDY_BOUNDS
    width = int(round((right - left) / GRID_RES_M))
    height = int(round((top - bottom) / GRID_RES_M))
    dst_transform = transform_from_bounds(left, bottom, right, top, width, height)

    # 1. CTX DEM -> elev, slope, curvature, northness, roughness
    print("Reading CTX controlled DEM window...")
    with rasterio.open(CTX_DEM_URL) as ds:
        dst_crs = CRS.from_wkt(ds.crs.to_wkt())
        win = from_bounds(*STUDY_BOUNDS, transform=ds.transform)
        elev = ds.read(
            1, window=win, out_shape=(height, width), resampling=Resampling.bilinear, boundless=True, fill_value=np.nan
        ).astype("float32")
        if ds.nodata is not None:
            elev[elev == ds.nodata] = np.nan
    elev[elev < -1e4] = np.nan

    gy, gx = np.gradient(elev, GRID_RES_M)
    grad_mag = np.hypot(gx, gy)
    slope = np.degrees(np.arctan(grad_mag)).astype("float32")
    # Row index increases southward, so d(elev)/d(northing) = -gy; downhill north-facing component = gy / |grad|.
    northness = np.where(grad_mag > 1e-5, gy / np.maximum(grad_mag, 1e-5), 0.0).astype("float32")
    northness[~np.isfinite(elev)] = np.nan

    d2x = np.gradient(gx, GRID_RES_M, axis=1)
    d2y = np.gradient(gy, GRID_RES_M, axis=0)
    curvature = (d2x + d2y).astype("float32")
    _, roughness = _nan_box_stats(elev, size=3)

    # 2. CTX DRG orthoimage -> img_mean, img_std
    print("Reading CTX controlled DRG orthoimage window...")
    with rasterio.open(CTX_DRG_URL) as ds:
        win = from_bounds(*STUDY_BOUNDS, transform=ds.transform)
        drg = ds.read(
            1, window=win, out_shape=(height, width), resampling=Resampling.bilinear, boundless=True, fill_value=np.nan
        ).astype("float32")
        if ds.nodata is not None:
            drg[drg == ds.nodata] = np.nan
    drg[drg <= 0] = np.nan
    img_mean, img_std = _nan_box_stats(drg, size=3)

    # 3. THEMIS Night IR & Day IR
    print("Reading THEMIS Night & Day IR controlled mosaics...")
    themis_maps: dict[str, np.ndarray] = {}
    for name, url in [("themis_night", THEMIS_NIR_URL), ("themis_day", THEMIS_DIR_URL)]:
        with rasterio.open(url) as ds:
            win = from_bounds(*STUDY_BOUNDS, transform=ds.transform)
            arr = ds.read(
                1, window=win, out_shape=(height, width), resampling=Resampling.bilinear, boundless=True, fill_value=0
            ).astype("float32")
            arr[arr <= 0] = np.nan
            themis_maps[name] = arr

    # 4. CRISM MTRDR BD1900_2 & SINDEX2 (FRT 18 m/px priority, HRL 36 m/px gap-fill)
    print("Reading CRISM MTRDR summary parameter cubes (FRT + HRL)...")
    frt_bd, frt_si = [], []
    for url in CRISM_CUBES_FRT:
        print(f"  FRT: {url.rsplit('/', 1)[-1]}")
        b, s = _read_crism_band_pair(url, width, height)
        frt_bd.append(b)
        frt_si.append(s)

    hrl_bd, hrl_si = [], []
    for url in CRISM_CUBES_HRL:
        print(f"  HRL: {url.rsplit('/', 1)[-1]}")
        b, s = _read_crism_band_pair(url, width, height)
        hrl_bd.append(b)
        hrl_si.append(s)

    with np.errstate(all="ignore"):
        bd_frt_med = np.nanmedian(np.stack(frt_bd, axis=0), axis=0)
        si_frt_med = np.nanmedian(np.stack(frt_si, axis=0), axis=0)
        bd_hrl_med = np.nanmedian(np.stack(hrl_bd, axis=0), axis=0)
        si_hrl_med = np.nanmedian(np.stack(hrl_si, axis=0), axis=0)

    crism_bd1900 = np.where(np.isfinite(bd_frt_med), bd_frt_med, bd_hrl_med).astype("float32")
    crism_sindex = np.where(np.isfinite(si_frt_med), si_frt_med, si_hrl_med).astype("float32")

    rasters = {
        "elev": elev,
        "slope": slope,
        "curvature": curvature,
        "northness": northness,
        "roughness": roughness,
        "themis_night": themis_maps["themis_night"],
        "themis_day": themis_maps["themis_day"],
        "crism_bd1900": crism_bd1900,
        "crism_sindex": crism_sindex,
        "img_mean": img_mean,
        "img_std": img_std,
    }
    for feat, arr in rasters.items():
        _write_geotiff(hyd_dir / f"{feat}.tif", arr, dst_crs, dst_transform)
        valid_pct = float(100.0 * np.isfinite(arr).mean())
        print(f"  wrote {feat}.tif ({valid_pct:.1f}% valid)")


def sample(raster: Path, lon: np.ndarray, lat: np.ndarray, radius_px: int = 1) -> np.ndarray:
    """Mean over a small window around each point: DAN integrates ~1-3 m of soil."""
    with rasterio.open(raster) as ds:
        crs = CRS.from_wkt(ds.crs.to_wkt())
        x, y = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon, lat)
        band = ds.read(1).astype("float32")
        if ds.nodata is not None and not np.isnan(ds.nodata):
            band[band == ds.nodata] = np.nan
        rows, cols = rasterio.transform.rowcol(ds.transform, x, y)
        out = np.full(len(lon), np.nan, "float32")
        for i, (r, c) in enumerate(zip(rows, cols)):
            if 0 <= r < ds.height and 0 <= c < ds.width:
                win = band[max(r - radius_px, 0) : r + radius_px + 1, max(c - radius_px, 0) : c + radius_px + 1]
                if np.isfinite(win).any():
                    out[i] = float(np.nanmean(win))
        return out


def main() -> None:
    pts = fetch_dan_points()
    build_predictor_rasters()

    for f in FEATURES:
        pts[f] = sample(RAW / "hydration" / f"{f}.tif", pts.lon.values, pts.lat.values, radius_px=1)
    before = len(pts)
    pts = pts.dropna(subset=FEATURES + ["weh"]).reset_index(drop=True)
    print(f"{len(pts)} of {before} DAN points have all {len(FEATURES)} orbital predictors")

    # Verify coverage over the 4x4 km HiRISE scene bounds too
    meta = json.loads((OUT / "terrain" / "meta.json").read_text(encoding="utf-8"))
    b = meta["bounds_projected_m"]
    for f in FEATURES:
        with rasterio.open(RAW / "hydration" / f"{f}.tif") as ds:
            win = from_bounds(*b, transform=ds.transform)
            arr = ds.read(1, window=win)
            pct = float(100.0 * np.isfinite(arr).mean())
            if pct < 95.0:
                print(f"WARNING: {f}.tif covers only {pct:.1f}% of the 4x4 km scene")

    pts.to_parquet(RAW / "hydration" / "train.parquet", index=False)


if __name__ == "__main__":
    main()
