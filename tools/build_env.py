"""Build static environment, ephemeris, and 3D model assets for web/public/.

Downloads and processes:
  - REMS clear & 2018 global dust storm series (PDS Atmospheres mslrem_1001)
  - RAD quiet week & Sep 2017 SEP event series (PDS PPI MSL-M-RAD-3-RDR-V1.0)
  - Earth-Mars light time & Gale Crater solar ephemerides (JPL Horizons)
  - NASA 3D Resources GLB models (Ingenuity, MRO, Mars rover)

Usage:
  python tools/build_env.py --only all
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import re
from pathlib import Path
import sys
import time

import numpy as np
import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import MODELS_OUT, OUT, RAW, UA, add_provenance, resolve_data_file
from pds3 import read_table

REMS_BASE = "https://atmos.nmsu.edu/PDS/data/mslrem_1001/"
RAD_BASE = "https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DATA/"
HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"

MODELS = {
    "ingenuity.glb": {
        "url": "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Ingenuity%20Mars%20Helicopter/Ingenuity%20Mars%20Helicopter.glb",
        "source": "NASA 3D Resources (Ingenuity Mars Helicopter)",
    },
    "mro.glb": {
        "url": "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(A)/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(A).glb",
        "source": "NASA 3D Resources (Mars Reconnaissance Orbiter)",
    },
    "rover.glb": {
        "url": "https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%202020%20Perseverance%20Rover/Mars%202020%20Perseverance%20Rover.glb",
        "source": "NASA 3D Resources (Mars 2020 Perseverance Rover, MSL/Curiosity-class chassis)",
    },
}


def download_cached(url: str, dest: Path, timeout: int = 120) -> Path:
    """Download URL to dest if not already cached on disk."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    with requests.get(url, headers={"User-Agent": UA}, timeout=timeout, stream=True) as resp:
        resp.raise_for_status()
        tmp = dest.with_name(f"{dest.name}.{os.getpid()}.part")
        with tmp.open("wb") as fh:
            for chunk in resp.iter_content(chunk_size=131072):
                if chunk:
                    fh.write(chunk)
        for attempt in range(8):
            try:
                tmp.replace(dest)
                break
            except PermissionError:
                if dest.exists() and dest.stat().st_size > 0:
                    tmp.unlink(missing_ok=True)
                    break
                if attempt == 7:
                    raise
                time.sleep(0.5)
    return dest


def rems_folder_for_sol(sol: int) -> str:
    """Map an MSL sol number to its mslrem_1001 DATA directory."""
    if 2004 <= sol <= 2127:
        return "SOL_02004_02127"
    html = requests.get(REMS_BASE + "DATA/", headers={"User-Agent": UA}, timeout=30).text
    for folder in re.findall(r'href="(SOL_(\d+)_(\d+)/)"', html):
        name, s0, s1 = folder[0].rstrip("/"), int(folder[1]), int(folder[2])
        if s0 <= sol <= s1:
            return name
    raise ValueError(f"Could not find mslrem_1001 folder for sol {sol}")


def fetch_rems_sol(sol: int, fmt_path: Path) -> dict:
    """Download, parse with pds3.read_table, and bin one MSL REMS MODRDR sol by local hour."""
    folder = rems_folder_for_sol(sol)
    sol_dir = f"SOL{sol:05d}"
    dir_url = f"{REMS_BASE}DATA/{folder}/{sol_dir}/"
    html = requests.get(dir_url, headers={"User-Agent": UA}, timeout=30).text
    m_tab = re.search(r'href="([^"]*RMD[^"]*\.TAB)"', html)
    m_lbl = re.search(r'href="([^"]*RMD[^"]*\.LBL)"', html)
    if not m_tab or not m_lbl:
        raise RuntimeError(f"No RMD product found at {dir_url}")

    raw_dir = RAW / "rems" / sol_dir
    lbl_path = download_cached(dir_url + m_lbl.group(1), raw_dir / m_lbl.group(1))
    tab_path = download_cached(dir_url + m_tab.group(1), raw_dir / m_tab.group(1))

    lbl_text = lbl_path.read_text(encoding="utf-8", errors="replace")
    m_start = re.search(r"START_TIME\s*=\s*(\S+)", lbl_text)
    start_time = m_start.group(1) if m_start else None

    df = read_table(tab_path, lbl_path, fmt=fmt_path)

    # Extract local solar hour from LTST ("SSSSS HH:MM:SS") or LMST ("SSSSSMHH:MM:SS.sss").
    ltst = df["LTST"].astype(str)
    hours = pd.to_numeric(ltst.str.extract(r"\s(\d{2}):")[0], errors="coerce")
    if hours.isna().all():
        lmst = df["LMST"].astype(str)
        hours = pd.to_numeric(lmst.str.extract(r"M(\d{2}):")[0], errors="coerce")
    df["local_hour"] = hours

    def clean_series(col: str, lo: float, hi: float) -> pd.Series:
        s = pd.to_numeric(df[col], errors="coerce")
        return s.where((s > -900) & (s >= lo) & (s <= hi))

    df["p_pa"] = clean_series("PRESSURE", 400.0, 1500.0)
    df["t_air_k"] = clean_series("AMBIENT_TEMP", 130.0, 320.0)
    df["t_gnd_k"] = clean_series("BRIGHTNESS_TEMP", 120.0, 350.0)
    df["uv_wm2"] = clean_series("UV_ABC", 0.0, 500.0)
    df["wind_ms"] = clean_series("HORIZONTAL_WIND_SPEED", 0.0, 150.0)

    hourly = df.groupby("local_hour")[["p_pa", "t_air_k", "t_gnd_k", "uv_wm2", "wind_ms"]].mean()
    hourly = hourly.reindex(range(24)).interpolate(limit_direction="both")

    p_vals = [round(float(x), 2) if np.isfinite(x) else None for x in hourly["p_pa"]]
    ta_vals = [round(float(x), 2) if np.isfinite(x) else None for x in hourly["t_air_k"]]
    tg_vals = [round(float(x), 2) if np.isfinite(x) else None for x in hourly["t_gnd_k"]]
    uv_vals = [round(float(x), 3) if np.isfinite(x) else None for x in hourly["uv_wm2"]]
    ws_vals = [round(float(x), 2) if np.isfinite(x) else None for x in hourly["wind_ms"]]

    # Verify acceptance bounds on valid entries.
    valid_p = [v for v in p_vals if v is not None]
    valid_t = [v for v in ta_vals if v is not None]
    if not valid_p or min(valid_p) < 600 or max(valid_p) > 1000:
        raise RuntimeError(f"Sol {sol} pressure out of [600, 1000] Pa range: {min(valid_p) if valid_p else None}..{max(valid_p) if valid_p else None}")
    if not valid_t or min(valid_t) < 180 or max(valid_t) > 290:
        raise RuntimeError(f"Sol {sol} air temp out of [180, 290] K range: {min(valid_t) if valid_t else None}..{max(valid_t) if valid_t else None}")

    noon_uv = [uv_vals[h] for h in (11, 12, 13) if uv_vals[h] is not None]
    return {
        "sol": sol,
        "start_time_utc": start_time,
        "lbl_url": dir_url + m_lbl.group(1),
        "tab_url": dir_url + m_tab.group(1),
        "hours": list(range(24)),
        "pressure_pa": p_vals,
        "air_temp_k": ta_vals,
        "ground_temp_k": tg_vals,
        "uv_w_m2": uv_vals,
        "wind_ms": ws_vals,
        "uv_noon_w_m2": round(float(np.mean(noon_uv)), 3) if noon_uv else None,
    }


def build_rems() -> None:
    """Generate env/rems_clear.json and env/rems_storm2018.json."""
    env_dir = OUT / "env"
    env_dir.mkdir(parents=True, exist_ok=True)
    fmt_url = REMS_BASE + "LABEL/MODRDR6.FMT"
    fmt_path = download_cached(fmt_url, RAW / "rems" / "MODRDR6.FMT")

    clear_sols = [2004, 2005, 2006]
    storm_sols = [2060, 2070, 2075, 2078, 2080, 2083, 2086, 2090]

    all_sols = clear_sols + storm_sols
    print(f"Downloading/parsing {len(all_sols)} REMS MODRDR sols sequentially...", flush=True)
    results = []
    for sol in all_sols:
        print(f"  REMS sol {sol}...", flush=True)
        results.append(fetch_rems_sol(sol, fmt_path))
    by_sol = {r["sol"]: r for r in results}

    # Build clear baseline averaged over the 3 clear sols (May 2018 pre-storm).
    clear_records = [by_sol[s] for s in clear_sols]
    def avg_hour(recs: list[dict], key: str) -> list[float | None]:
        out = []
        for h in range(24):
            vals = [r[key][h] for r in recs if r[key][h] is not None]
            out.append(round(float(np.mean(vals)), 3) if vals else None)
        return out

    clear_noon_uvs = [r["uv_noon_w_m2"] for r in clear_records if r["uv_noon_w_m2"] is not None]
    uv_clear_noon = float(np.mean(clear_noon_uvs))

    clear_payload = {
        "source": "NASA/CAB PDS Atmospheres MSL REMS MODRDR (mslrem_1001)",
        "sols": clear_sols,
        "hours": list(range(24)),
        "pressure_pa": avg_hour(clear_records, "pressure_pa"),
        "air_temp_k": avg_hour(clear_records, "air_temp_k"),
        "ground_temp_k": avg_hour(clear_records, "ground_temp_k"),
        "uv_w_m2": avg_hour(clear_records, "uv_w_m2"),
        "wind_ms": avg_hour(clear_records, "wind_ms"),
        "uv_noon_baseline_w_m2": round(uv_clear_noon, 3),
        "tau": [0.5] * 24,
        "by_sol": {str(r["sol"]): r for r in clear_records},
    }
    (env_dir / "rems_clear.json").write_text(json.dumps(clear_payload, indent=2), encoding="utf-8")

    # Build 2018 global dust storm series with relative optical depth proxy derived from noon UV attenuation.
    storm_records = [by_sol[s] for s in storm_sols]
    hours_seq: list[float] = []
    tau_seq: list[float] = []
    p_seq: list[float | None] = []
    ta_seq: list[float | None] = []
    tg_seq: list[float | None] = []
    uv_seq: list[float | None] = []

    sol_taus = []
    for r in storm_records:
        uv_n = max(float(r["uv_noon_w_m2"] or uv_clear_noon), 0.05)
        tau_rel = max(0.3, min(8.0, 0.5 - math.log(uv_n / uv_clear_noon)))
        sol_taus.append((r["sol"], tau_rel))

    for idx, r in enumerate(storm_records):
        sol_tau = sol_taus[idx][1]
        next_tau = sol_taus[min(idx + 1, len(sol_taus) - 1)][1]
        for h in range(24):
            hours_seq.append(float(idx * 24 + h))
            frac = h / 24.0
            tau_seq.append(round(sol_tau * (1.0 - frac) + next_tau * frac, 3))
            p_seq.append(r["pressure_pa"][h])
            ta_seq.append(r["air_temp_k"][h])
            tg_seq.append(r["ground_temp_k"][h])
            uv_seq.append(r["uv_w_m2"][h])

    storm_payload = {
        "source": "NASA/CAB PDS Atmospheres MSL REMS MODRDR (mslrem_1001), 2018 Global Dust Storm (UV-attenuation relative tau indicator)",
        "tau_note": "Relative storm opacity proxy derived from REMS noon UV_ABC attenuation vs. clear sols 2004-2006 (tau_clear=0.5); Mastcam tau not present in MODRDR.",
        "sols": storm_sols,
        "uv_clear_noon_w_m2": round(uv_clear_noon, 3),
        "hours": hours_seq,
        "tau": tau_seq,
        "pressure_pa": p_seq,
        "air_temp_k": ta_seq,
        "ground_temp_k": tg_seq,
        "uv_w_m2": uv_seq,
        "by_sol": {str(r["sol"]): r for r in storm_records},
    }
    (env_dir / "rems_storm2018.json").write_text(json.dumps(storm_payload, indent=2), encoding="utf-8")

    add_provenance(
        "env/rems_clear.json",
        source="NASA/CAB PDS Atmospheres, MSL REMS MODRDR V1.0 (mslrem_1001)",
        product_id="SOL02004-SOL02006 RMD",
        url=REMS_BASE + "DATA/SOL_02004_02127/",
        transform="Parsed via MODRDR6.FMT with missing-value filtering; hourly means across 3 clear pre-storm sols (May 2018).",
    )
    add_provenance(
        "env/rems_storm2018.json",
        source="NASA/CAB PDS Atmospheres, MSL REMS MODRDR V1.0 (mslrem_1001)",
        product_id="SOL02060-SOL02090 RMD",
        url=REMS_BASE + "DATA/SOL_02004_02127/",
        transform="8-sol 2018 global dust storm sequence; relative opacity tau derived from REMS noon UV_ABC drop relative to clear baseline.",
    )
    print(f"REMS done: clear noon UV={uv_clear_noon:.2f} W/m2, storm peak tau_rel={max(tau_seq):.2f}", flush=True)


def parse_rad_txt(txt_path: Path, sol: int) -> list[dict]:
    """Parse [OBSERVATION: NN] dose rate entries (uGy/h in detectors B and E) from a RAD RDR file."""
    text = txt_path.read_text(encoding="utf-8", errors="replace")
    obs_blocks = re.split(r"\[OBSERVATION:\s*(\d+)\]", text)[1:]
    rows: list[dict] = []
    for i in range(0, len(obs_blocks), 2):
        obs_id = int(obs_blocks[i])
        body = obs_blocks[i + 1]
        m_mars = re.search(r"START_OBS_MARS\s*=\s*([^\r\n]+)", body)
        m_utc = re.search(r"START_OBS_UTC\s*=\s*([^\r\n]+)", body)
        m_qc = re.search(r"QC\s*=\s*([^\r\n]+)", body)
        m_b = re.search(r"\[DOSIMETRY_TOTAL_DOSE_B:\s*\d+\]\s*([-+]?\d+(?:\.\d+)?)", body)
        m_e = re.search(r"\[DOSIMETRY_TOTAL_DOSE_E:\s*\d+\]\s*([-+]?\d+(?:\.\d+)?)", body)
        if not m_b:
            continue
        dose_b = float(m_b.group(1))
        dose_e = float(m_e.group(1)) if m_e else None
        if dose_b < 0 or dose_b > 1e5:
            continue
        rows.append({
            "sol": sol,
            "obs_id": obs_id,
            "mars_time": m_mars.group(1).strip().strip('"\'') if m_mars else None,
            "utc": m_utc.group(1).strip().strip('"\'') if m_utc else None,
            "qc": m_qc.group(1).strip().strip('"\'') if m_qc else None,
            "dose_b_ugy_h": round(dose_b, 5),
            "dose_e_ugy_h": round(dose_e, 5) if dose_e is not None and dose_e >= 0 else None,
        })
    return rows


def fetch_rad_range(doys: range, label: str) -> dict:
    """Download and parse RAD RDR files for a range of 2017 day-of-year values."""
    folder_url = RAD_BASE + "SOL_01773_01869/"
    idx_html = requests.get(folder_url, headers={"User-Agent": UA}, timeout=30).text
    raw_dir = RAW / "rad"
    observations: list[dict] = []

    files_to_get: list[tuple[int, str, str]] = []
    for doy in doys:
        m = re.search(rf'href="(RAD_RDR_2017_{doy}_[^"]+_(\d{{4}})_V\d+\.TXT)"', idx_html)
        if m:
            txt_name = m.group(1)
            sol = int(m.group(2))
            lbl_name = txt_name[:-4] + ".LBL"
            files_to_get.append((sol, txt_name, lbl_name))

    def _get(item: tuple[int, str, str]) -> list[dict]:
        sol, txt_name, lbl_name = item
        download_cached(folder_url + lbl_name, raw_dir / lbl_name, timeout=60)
        txt_path = download_cached(folder_url + txt_name, raw_dir / txt_name, timeout=60)
        return parse_rad_txt(txt_path, sol)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for chunk in pool.map(_get, files_to_get):
            observations.extend(chunk)

    # Parse UTC YYYY-DDD HH:MM:SS and sort chronologically so hours is monotonic.
    from datetime import datetime, timedelta
    def parse_utc(s: str) -> datetime:
        parts = s.split()
        year, doy = map(int, parts[0].split("-"))
        hh, mm, ss = map(int, parts[1].split(":"))
        return datetime(year, 1, 1) + timedelta(days=doy - 1, hours=hh, minutes=mm, seconds=ss)

    observations.sort(key=lambda r: parse_utc(r["utc"]) if r["utc"] else datetime.min)
    b_rates = [r["dose_b_ugy_h"] for r in observations]
    e_rates = [r["dose_e_ugy_h"] for r in observations if r["dose_e_ugy_h"] is not None]

    t0 = parse_utc(observations[0]["utc"]) if observations and observations[0]["utc"] else None
    hours: list[float] = []
    for idx, obs in enumerate(observations):
        if t0 and obs["utc"]:
            dt_h = (parse_utc(obs["utc"]) - t0).total_seconds() / 3600.0
            hours.append(round(dt_h, 3))
        else:
            hours.append(float(idx))

    mean_b = float(np.mean(b_rates))
    return {
        "source": f"NASA/SwRI PDS-PPI MSL RAD RDR V1.0 (MSL-M-RAD-3-RDR-V1.0) — {label}",
        "detector": "B (300 um silicon diode, RAD_RDR_SIS section 4.2.1.6)",
        "unit": "uGy/h",
        "quality_factor_applied": None,
        "summary": {
            "count": len(observations),
            "mean_dose_b_ugy_h": round(mean_b, 4),
            "mean_dose_b_mgy_day": round(mean_b * 24.0 / 1000.0, 4),
            "min_dose_b_ugy_h": round(float(min(b_rates)), 4),
            "max_dose_b_ugy_h": round(float(max(b_rates)), 4),
            "mean_dose_e_ugy_h": round(float(np.mean(e_rates)), 4) if e_rates else None,
        },
        "hours": hours,
        "dose_rate_ugy_h": b_rates,
        "observations": observations,
    }


def build_rad() -> None:
    """Generate env/rad_quiet.json and env/rad_sep2017.json."""
    env_dir = OUT / "env"
    env_dir.mkdir(parents=True, exist_ok=True)
    print("Downloading/parsing MSL RAD RDR quiet week + Sep 2017 SEP event...", flush=True)

    quiet = fetch_rad_range(range(213, 220), "Quiet GCR baseline week (2017 DOY 213-219, Sols 1773-1779)")
    mgy_day = quiet["summary"]["mean_dose_b_mgy_day"]
    if not (0.1 <= mgy_day <= 0.5):
        raise RuntimeError(f"Quiet RAD mean {mgy_day} mGy/day outside expected ~0.2 mGy/day range")
    (env_dir / "rad_quiet.json").write_text(json.dumps(quiet, indent=2), encoding="utf-8")

    sep = fetch_rad_range(range(252, 259), "September 2017 SEP event (2017-09-09 to 2017-09-15, Sols 1811-1817)")
    (env_dir / "rad_sep2017.json").write_text(json.dumps(sep, indent=2), encoding="utf-8")

    add_provenance(
        "env/rad_quiet.json",
        source="NASA/SwRI PDS-PPI, MSL RAD RDR V1.0 (MSL-M-RAD-3-RDR-V1.0)",
        product_id="RAD_RDR_2017_213-219 (Sols 1773-1779)",
        url=RAD_BASE + "SOL_01773_01869/",
        transform="Extracted [DOSIMETRY_TOTAL_DOSE_B] absorbed dose rate in silicon (uGy/h) per observation; no quality factor applied.",
    )
    add_provenance(
        "env/rad_sep2017.json",
        source="NASA/SwRI PDS-PPI, MSL RAD RDR V1.0 (MSL-M-RAD-3-RDR-V1.0)",
        product_id="RAD_RDR_2017_252-258 (Sols 1811-1817)",
        url=RAD_BASE + "SOL_01773_01869/",
        transform="Extracted [DOSIMETRY_TOTAL_DOSE_B] absorbed dose rate in silicon (uGy/h) during Sep 2017 SEP event; no quality factor applied.",
    )
    print(f"RAD done: quiet mean={mgy_day:.3f} mGy/day, sep2017 peak={sep['summary']['max_dose_b_ugy_h']:.2f} uGy/h", flush=True)


def build_ephem() -> None:
    """Generate env/ephem.json from earth_wrt_mars.json and JPL Horizons Sun Az/El at Gale."""
    env_dir = OUT / "env"
    env_dir.mkdir(parents=True, exist_ok=True)
    meta = json.loads((OUT / "terrain" / "meta.json").read_text(encoding="utf-8"))
    lon_e = float(meta["center_lon_e"])
    lat = float(meta["center_lat"])
    alt_km = 0.5 * (float(meta["z_min_m"]) + float(meta["z_max_m"])) / 1000.0

    earth_path = resolve_data_file("horizons", "earth_wrt_mars.json")
    earth_raw = json.loads(earth_path.read_text(encoding="utf-8"))["result"]
    soe = earth_raw.find("$$SOE")
    eoe = earth_raw.find("$$EOE")
    earth_block = earth_raw[soe + 5 : eoe].strip()
    earth_series: list[dict] = []
    lines = [l.strip() for l in earth_block.splitlines() if l.strip()]
    for i in range(0, len(lines), 4):
        if i + 3 >= len(lines):
            break
        hdr = lines[i]
        m_dt = re.match(r"([\d.]+)\s*=\s*A\.D\.\s*(.+?)\s+TDB", hdr)
        m_lt = re.search(r"LT=\s*([+-]?\d+\.\d+E[+-]\d+)", lines[i + 3])
        m_rg = re.search(r"RG=\s*([+-]?\d+\.\d+E[+-]\d+)", lines[i + 3])
        m_rr = re.search(r"RR=\s*([+-]?\d+\.\d+E[+-]\d+)", lines[i + 3])
        if m_dt and m_lt and m_rg:
            earth_series.append({
                "jdtdb": float(m_dt.group(1)),
                "tdb": m_dt.group(2),
                "light_time_s": round(float(m_lt.group(1)), 3),
                "range_km": round(float(m_rg.group(1)), 1),
                "range_rate_km_s": round(float(m_rr.group(1)), 4) if m_rr else None,
            })

    # JPL Horizons uses west-positive longitude for Mars (body 499), so east longitude is negative.
    site_coord = f"'{-lon_e:.4f},{lat:.4f},{alt_km:.3f}'"
    resp = requests.get(
        HORIZONS_API,
        params={
            "format": "json",
            "COMMAND": "'10'",
            "OBJ_DATA": "'NO'",
            "MAKE_EPHEM": "'YES'",
            "EPHEM_TYPE": "'OBSERVER'",
            "CENTER": "'coord@499'",
            "COORD_TYPE": "'GEODETIC'",
            "SITE_COORD": site_coord,
            "START_TIME": "'2026-11-14 00:00'",
            "STOP_TIME": "'2026-11-15 00:00'",
            "STEP_SIZE": "'1 h'",
            "QUANTITIES": "'4'",
        },
        headers={"User-Agent": UA},
        timeout=30,
    )
    resp.raise_for_status()
    sun_raw = resp.json()["result"]
    s0 = sun_raw.find("$$SOE")
    s1 = sun_raw.find("$$EOE")
    sun_series: list[dict] = []
    for line in sun_raw[s0 + 5 : s1].splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(\d{4}-\w{3}-\d{2}\s+\d{2}:\d{2})\s*[*A-Za-z]*\s+([+-]?\d+\.\d+)\s+([+-]?\d+\.\d+)", line)
        if m:
            sun_series.append({
                "utc": m.group(1),
                "azimuth_deg": round(float(m.group(2)), 3),
                "elevation_deg": round(float(m.group(3)), 3),
            })

    # Pick a representative daytime sun vector (highest elevation) for default scene lighting.
    day_peak = max(sun_series, key=lambda s: s["elevation_deg"])
    owlt = earth_series[0]["light_time_s"]
    ephem = {
        "source": "NASA/JPL Horizons API (DE441 / mar099)",
        "site": {"lon_e": round(lon_e, 5), "lat": round(lat, 5), "alt_km": round(alt_km, 3)},
        "earth_light_time_s": owlt,
        "round_trip_light_time_s": round(owlt * 2.0, 3),
        "earth_distance_km": earth_series[0]["range_km"],
        "sun_noon_reference": day_peak,
        "earth_series": earth_series,
        "sun_series": sun_series,
    }
    (env_dir / "ephem.json").write_text(json.dumps(ephem, indent=2), encoding="utf-8")

    add_provenance(
        "env/ephem.json",
        source="NASA/JPL Horizons System (DE441 / mar099)",
        product_id="Target 399 (Earth) w.r.t. 499 (Mars) + Target 10 (Sun) at Gale site",
        url=HORIZONS_API,
        transform="Extracted Earth-Mars one-way/round-trip light time (LT) and hourly solar azimuth/elevation at Gale scene center.",
    )
    print(f"Ephem done: OWLT={owlt:.1f} s, sun peak el={day_peak['elevation_deg']} deg", flush=True)


def build_models() -> None:
    """Download official NASA 3D Resources GLB models under 15 MB each."""
    MODELS_OUT.mkdir(parents=True, exist_ok=True)
    for fname, info in MODELS.items():
        dest = MODELS_OUT / fname
        download_cached(info["url"], dest, timeout=120)
        size_mb = dest.stat().st_size / (1024 * 1024)
        if size_mb > 15.0:
            raise RuntimeError(f"{fname} exceeds 15 MB limit ({size_mb:.2f} MB)")
        print(f"Model {fname}: {size_mb:.2f} MB", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["all", "rems", "rad", "ephem", "models"], default="all")
    args = ap.parse_args()

    if args.only in ("all", "ephem"):
        build_ephem()
    if args.only in ("all", "models"):
        build_models()
    if args.only in ("all", "rad"):
        build_rad()
    if args.only in ("all", "rems"):
        build_rems()


if __name__ == "__main__":
    main()
