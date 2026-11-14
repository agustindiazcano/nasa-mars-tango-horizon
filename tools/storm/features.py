"""Build multi-year per-sol REMS feature table and Mastcam 880 nm opacity target.

Extracts diurnal (S1) and semidiurnal (S2) pressure-tide harmonics, daily mean
pressure, diurnal air/ground temperature ranges, noon UV irradiance, seasonal
solar longitude (Ls) encodings, and 1-, 3-, and 7-sol differences from NASA PDS
Atmospheres MSL REMS MODRDR (mslrem_1001) and Mastcam-100 optical depth
(msl_mmm_tau_bundle, Lemmon 2024).
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import io
from pathlib import Path
import re
import threading
import time
from typing import Any

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parents[2]
RAW_STORM = ROOT / "data" / "raw" / "storm"
ENV_OUT = ROOT / "web" / "public" / "data" / "env"

REMS_DATA_URL = "https://atmos.nmsu.edu/PDS/data/mslrem_1001/DATA/"
REMS_INV_URL = (
    "https://atmos.nmsu.edu/PDS/data/PDS4/msl_rems_bundle/"
    "data_calibrated/collection_mslrems_data_calibrated_inventory.csv"
)
TAU_880_URL = (
    "https://atmos.nmsu.edu/PDS/review/PDS4/msl_mmm_tau_bundle/"
    "data_derived/msl_tau_880.csv"
)
TAU_440_URL = (
    "https://atmos.nmsu.edu/PDS/review/PDS4/msl_mmm_tau_bundle/"
    "data_derived/msl_tau_440.csv"
)

UA = "tango-horizon-storm-pipeline/1.0"
LAG_BASE_COLS = ["s1_amp", "s2_amp", "p_mean", "air_range", "ground_range", "uv_noon"]
LAGS = (1, 3, 7)

# 120 byte-range windows (2,000 B each) spanning 0..23.6 MB yield ~300-500 rows/sol
# across all 24 local hours in one HTTP 206 request (~150 KB instead of ~13 MB/sol).
_RANGE_OFFSETS = list(range(0, 10_800_000, 120_000)) + list(range(11_200_000, 23_200_000, 400_000))
_CHUNK_BYTES = 2000
_RANGE_HEADER = "bytes=" + ",".join(f"{o}-{o + _CHUNK_BYTES - 1}" for o in _RANGE_OFFSETS)

_thread_local = threading.local()


def _get_session() -> requests.Session:
    sess = getattr(_thread_local, "session", None)
    if sess is None:
        sess = requests.Session()
        sess.headers.update({"User-Agent": UA})
        retry = Retry(
            total=5,
            backoff_factor=0.6,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET", "HEAD"),
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=16, pool_maxsize=16)
        sess.mount("https://", adapter)
        sess.mount("http://", adapter)
        _thread_local.session = sess
    return sess


def tide_harmonics(lst_hours: np.ndarray, pressure: np.ndarray) -> dict[str, float]:
    """Least-squares fit p(t) = p0 + sum_{k=1,2} (a_k cos(k w t) + b_k sin(k w t)) over one sol."""
    ok = np.isfinite(lst_hours) & np.isfinite(pressure)
    # Require coverage of most of the day; a partial sol biases tidal amplitudes.
    if ok.sum() < 200 or np.unique(lst_hours[ok].astype(int)).size < 18:
        return {}
    w = 2.0 * np.pi * lst_hours[ok] / 24.0
    design = np.column_stack([
        np.ones(int(ok.sum())),
        np.cos(w),
        np.sin(w),
        np.cos(2.0 * w),
        np.sin(2.0 * w),
    ])
    coef, *_ = np.linalg.lstsq(design, pressure[ok], rcond=None)
    p0 = float(coef[0])
    if p0 <= 0.0:
        return {}
    return {
        "p_mean": p0,
        "s1_amp": float(np.hypot(coef[1], coef[2]) / p0),
        "s1_phase": float(np.arctan2(coef[2], coef[1])),
        "s2_amp": float(np.hypot(coef[3], coef[4]) / p0),
        "s2_phase": float(np.arctan2(coef[4], coef[3])),
    }


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Reindex onto a contiguous integer sol grid and append 1-, 3-, and 7-sol differences."""
    out = df.sort_index()
    out = out.reindex(range(int(out.index.min()), int(out.index.max()) + 1))
    for col in LAG_BASE_COLS:
        if col in out.columns:
            for lag in LAGS:
                out[f"{col}_d{lag}"] = out[col] - out[col].shift(lag)
    return out


def build(per_sol: dict[int, pd.DataFrame], ls_by_sol: dict[int, float]) -> pd.DataFrame:
    """Build daily REMS feature rows from per-sol tables (`lst_h`, `pressure_pa`, `air_temp_k`, `ground_temp_k`, `uv`)."""
    rows: list[dict[str, float | int]] = []
    for sol, d in sorted(per_sol.items()):
        if sol not in ls_by_sol:
            continue
        harm = tide_harmonics(d["lst_h"].to_numpy(), d["pressure_pa"].to_numpy())
        if not harm:
            continue
        noon = d[(d["lst_h"] > 11.0) & (d["lst_h"] < 13.0)]
        ls_deg = float(ls_by_sol[sol]) % 360.0
        ls_rad = np.radians(ls_deg)
        rows.append({
            "sol": int(sol),
            **harm,
            "air_range": float(d["air_temp_k"].max() - d["air_temp_k"].min()),
            "ground_range": float(d["ground_temp_k"].max() - d["ground_temp_k"].min()),
            "uv_noon": float(noon["uv"].mean()) if len(noon) else float("nan"),
            "ls_sin": float(np.sin(ls_rad)),
            "ls_cos": float(np.cos(ls_rad)),
            "ls_deg": ls_deg,
        })
    f = pd.DataFrame(rows).set_index("sol")
    return add_lag_features(f)


def _download_text_cached(url: str, dest: Path, timeout: int = 30) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest.read_text(encoding="utf-8", errors="replace")
    resp = _get_session().get(url, timeout=timeout)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return resp.text


def load_tau_records() -> tuple[pd.DataFrame, dict[int, float], dict[int, float], dict[int, int]]:
    """Load Mastcam 880 nm daily tau observations and continuous Ls / Mars Year mapping."""
    RAW_STORM.mkdir(parents=True, exist_ok=True)
    tau_txt = _download_text_cached(TAU_880_URL, RAW_STORM / "msl_tau_880.csv")
    # Also cache 440 nm for provenance completeness.
    _download_text_cached(TAU_440_URL, RAW_STORM / "msl_tau_440.csv")

    raw = pd.read_csv(
        io.StringIO(tau_txt),
        names=["pid", "sol_dec", "ls", "tau", "sigma"],
    ).sort_values("sol_dec").reset_index(drop=True)
    raw["sol"] = raw["sol_dec"].astype(int)

    # Unwrap Ls monotonically; MSL landed in MY 31 at Ls ~150.6 deg (MY 29 Ls=0 is 0 => MY 31 starts at 720).
    ls_unwrap = np.rad2deg(np.unwrap(np.deg2rad(raw["ls"].to_numpy())))
    raw["ls_cont"] = ls_unwrap + 720.0

    daily_tau = (
        raw.groupby("sol", as_index=True)
        .agg(
            tau=("tau", "mean"),
            tau_sigma=("sigma", "mean"),
            tau_n=("tau", "count"),
            ls_cont_obs=("ls_cont", "mean"),
        )
    )

    # Interpolate ls_cont smoothly across all integer sols from Sol 1 to max observed sol.
    max_sol = int(raw["sol"].max())
    all_sols = np.arange(1, max_sol + 1, dtype=float)
    sol_pts = raw["sol_dec"].to_numpy()
    lsc_pts = raw["ls_cont"].to_numpy()
    mean_dls = (lsc_pts[-1] - lsc_pts[0]) / (sol_pts[-1] - sol_pts[0])
    ls_cont_all = np.interp(all_sols, sol_pts, lsc_pts)
    # Linear extrapolation for sols 1..33 before first Mastcam tau observation.
    before = all_sols < sol_pts[0]
    ls_cont_all[before] = lsc_pts[0] + (all_sols[before] - sol_pts[0]) * mean_dls

    ls_deg_by_sol: dict[int, float] = {}
    ls_cont_by_sol: dict[int, float] = {}
    my_by_sol: dict[int, int] = {}
    for sol_i, lsc in zip(all_sols.astype(int), ls_cont_all):
        ls_cont_by_sol[int(sol_i)] = float(lsc)
        ls_deg_by_sol[int(sol_i)] = float(lsc % 360.0)
        my_by_sol[int(sol_i)] = int(lsc // 360.0) + 29

    return daily_tau, ls_deg_by_sol, ls_cont_by_sol, my_by_sol


def _load_rems_catalog() -> tuple[dict[int, str], list[tuple[int, int, str]]]:
    inv_txt = _download_text_cached(REMS_INV_URL, RAW_STORM / "rems_inventory.csv", timeout=60)
    by_sol: dict[int, str] = {}
    for line in inv_txt.splitlines():
        m = re.search(r":(rme_\d+rmd(\d{4})[^:]+)::", line)
        if m:
            by_sol[int(m.group(2))] = m.group(1).upper()

    folders_file = RAW_STORM / "rems_folders.txt"
    if folders_file.exists() and folders_file.stat().st_size > 0:
        folders = [
            (int(a), int(b), c)
            for a, b, c in (line.split(",") for line in folders_file.read_text().splitlines() if line.strip())
        ]
    else:
        html = _get_session().get(REMS_DATA_URL, timeout=30).text
        folders = sorted(
            set((int(s0), int(s1), f"SOL_{s0}_{s1}") for s0, s1 in re.findall(r"SOL_(\d+)_(\d+)", html))
        )
        folders_file.write_text("\n".join(f"{a},{b},{c}" for a, b, c in folders), encoding="utf-8")
    return by_sol, folders


def _parse_ltst_hour(pc: list[str]) -> float | None:
    ltst = pc[2].strip(' "')
    m = re.search(r"\s(\d{2}):(\d{2}):(\d{2})", ltst)
    if not m:
        lmst = pc[1].strip(' "')
        m = re.search(r"M(\d{2}):(\d{2}):(\d{2})", lmst)
    if not m:
        return None
    return int(m.group(1)) + int(m.group(2)) / 60.0 + int(m.group(3)) / 3600.0


def _fetch_rems_sol_summary(
    sol: int,
    by_sol: dict[int, str],
    folders: list[tuple[int, int, str]],
) -> dict[str, Any] | None:
    if sol not in by_sol:
        return None
    fld = next((f for s0, s1, f in folders if s0 <= sol <= s1), None)
    if fld is None:
        return None
    url = f"{REMS_DATA_URL}{fld}/SOL{sol:05d}/{by_sol[sol]}.TAB"

    try:
        resp = _get_session().get(url, headers={"Range": _RANGE_HEADER}, timeout=25)
        if resp.status_code not in (200, 206):
            return None
    except Exception:
        return None

    ct = resp.headers.get("Content-Type", "")
    m_b = re.search(r"boundary=([^\s;]+)", ct)
    parts = resp.content.split(b"--" + m_b.group(1).encode()) if m_b else [resp.content]

    rows: list[str] = []
    for part in parts:
        idx = part.find(b"\r\n\r\n")
        body = part[idx + 4:] if idx != -1 else part
        lines = body.decode("ascii", errors="ignore").splitlines()
        # Drop first and last lines in each range window so split rows are excluded.
        if len(lines) >= 3:
            rows.extend(lines[1:-1])

    # MODRDR6.FMT indices: 1=LMST, 2=LTST, 7=BRIGHTNESS_TEMP, 15=AMBIENT_TEMP, 20=UV_ABC, 37=PRESSURE.
    recs: list[tuple[float, float, float, float, float]] = []
    for line in rows:
        pc = line.split(",")
        if len(pc) < 38:
            continue
        lst_h = _parse_ltst_hour(pc)
        if lst_h is None:
            continue
        try:
            recs.append((lst_h, float(pc[37]), float(pc[15]), float(pc[7]), float(pc[20])))
        except ValueError:
            continue

    if not recs:
        return None

    df = pd.DataFrame(recs, columns=["lst_h", "pressure_pa", "air_temp_k", "ground_temp_k", "uv"])
    for col, lo, hi in (
        ("pressure_pa", 400.0, 1500.0),
        ("air_temp_k", 130.0, 320.0),
        ("ground_temp_k", 120.0, 350.0),
        ("uv", 0.0, 500.0),
    ):
        df[col] = df[col].where((df[col] > -900.0) & (df[col] >= lo) & (df[col] <= hi))

    harm = tide_harmonics(df["lst_h"].to_numpy(), df["pressure_pa"].to_numpy())
    if not harm:
        return None

    noon = df[(df["lst_h"] > 11.0) & (df["lst_h"] < 13.0)]
    ok_p = np.isfinite(df["lst_h"].to_numpy()) & np.isfinite(df["pressure_pa"].to_numpy())
    air_min, air_max = df["air_temp_k"].min(), df["air_temp_k"].max()
    gnd_min, gnd_max = df["ground_temp_k"].min(), df["ground_temp_k"].max()
    return {
        "sol": int(sol),
        **harm,
        "air_range": float(air_max - air_min) if np.isfinite(air_min) and np.isfinite(air_max) else float("nan"),
        "ground_range": float(gnd_max - gnd_min) if np.isfinite(gnd_min) and np.isfinite(gnd_max) else float("nan"),
        "uv_noon": float(noon["uv"].mean()) if len(noon) else float("nan"),
        "n_ok": int(ok_p.sum()),
        "n_hrs": int(np.unique(df["lst_h"].to_numpy()[ok_p].astype(int)).size),
    }


def _select_target_sols(daily_tau: pd.DataFrame, by_sol: dict[int, str]) -> list[int]:
    tau_sols = set(daily_tau.index.astype(int))
    pair_sols = {s for s in tau_sols if any((s + h) in tau_sols for h in (1, 2, 3))}
    needed: set[int] = set()
    for s in pair_sols:
        for lag in (0, 1, 3, 7):
            if s - lag >= 1:
                needed.add(s - lag)
    # Ensure dense continuous coverage across MY 34 storm window (Ls_cont ~1850..2150 -> Sol ~1780..2340)
    # and especially the 2018 global dust storm onset/decay (Sols 2040..2140).
    for s in range(2030, 2145):
        needed.add(s)
    return sorted(s for s in needed if s in by_sol)


def build_and_save(max_workers: int = 10, force: bool = False) -> pd.DataFrame:
    """Download/cache multi-year REMS + Mastcam tau data and save `data/raw/storm/features.parquet`."""
    out_parquet = RAW_STORM / "features.parquet"
    if out_parquet.exists() and not force:
        return pd.read_parquet(out_parquet)

    daily_tau, ls_deg_by_sol, ls_cont_by_sol, my_by_sol = load_tau_records()
    by_sol, folders = _load_rems_catalog()
    target_sols = _select_target_sols(daily_tau, by_sol)

    cache_path = RAW_STORM / "rems_daily_cache.parquet"
    cached: dict[int, dict[str, Any]] = {}
    if cache_path.exists() and not force:
        cdf = pd.read_parquet(cache_path)
        for rec in cdf.to_dict(orient="records"):
            cached[int(rec["sol"])] = rec

    missing_sols = [s for s in target_sols if s not in cached]
    print(
        f"REMS multi-year fetch: {len(target_sols)} target sols, "
        f"{len(cached)} cached, {len(missing_sols)} to fetch...",
        flush=True,
    )

    if missing_sols:
        t0 = time.time()
        done = 0
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futs = {pool.submit(_fetch_rems_sol_summary, s, by_sol, folders): s for s in missing_sols}
            for fut in as_completed(futs):
                sol = futs[fut]
                res = fut.result()
                if res is not None:
                    cached[sol] = res
                done += 1
                if done % 150 == 0 or done == len(missing_sols):
                    pd.DataFrame(list(cached.values())).sort_values("sol").to_parquet(cache_path, index=False)
                    rate = done / max(time.time() - t0, 0.1)
                    print(
                        f"  Fetched {done}/{len(missing_sols)} sols "
                        f"({len(cached)} valid, {rate:.1f} sols/s)",
                        flush=True,
                    )

    df = pd.DataFrame([cached[s] for s in sorted(cached)]).set_index("sol").sort_index()
    df["ls_deg"] = [ls_deg_by_sol.get(int(s), float("nan")) for s in df.index]
    df["ls_cont"] = [ls_cont_by_sol.get(int(s), float("nan")) for s in df.index]
    df["mars_year"] = [my_by_sol.get(int(s), -1) for s in df.index]
    df["ls_sin"] = np.sin(np.radians(df["ls_deg"]))
    df["ls_cos"] = np.cos(np.radians(df["ls_deg"]))

    # Reindex to contiguous integer sols so shift(1/3/7) and shift(-1/-2/-3) are true sol offsets.
    df = add_lag_features(df)
    df["ls_deg"] = [ls_deg_by_sol.get(int(s), float("nan")) for s in df.index]
    df["ls_cont"] = [ls_cont_by_sol.get(int(s), float("nan")) for s in df.index]
    df["mars_year"] = [my_by_sol.get(int(s), -1) for s in df.index]
    df["ls_sin"] = np.sin(np.radians(df["ls_deg"]))
    df["ls_cos"] = np.cos(np.radians(df["ls_deg"]))

    # Join Mastcam 880 nm daily tau observations strictly (no interpolation of target).
    df = df.join(daily_tau[["tau", "tau_sigma", "tau_n"]], how="left")
    df.to_parquet(out_parquet)
    print(
        f"Saved {out_parquet} ({len(df)} sol index rows, "
        f"{df['s1_amp'].notna().sum()} valid REMS sols, "
        f"{df['tau'].notna().sum()} Mastcam tau sols)",
        flush=True,
    )
    return df


if __name__ == "__main__":
    build_and_save()
