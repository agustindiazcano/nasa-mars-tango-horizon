"""Predict the 1024x1024 Hydration Prospector maps, candidate sites, and CV diagnostics.

Applies the trained GradientBoostingRegressor ensemble (median, q10, q90) to
the 11-feature orbital predictor stack over the 4x4 km Gale Crater scene.

Outputs:
  - web/public/data/terrain/hydration_1024.png (8-bit grayscale, non-interlaced)
  - web/public/data/terrain/hydration_unc_1024.png (8-bit grayscale, q90 - q10)
  - web/public/data/terrain/hydration_meta.json (weh_min, weh_max, interval_width_max, validation, provenance)
  - web/public/data/terrain/hydration_sites.json (top candidate sites + DAN traverse points)
  - docs/hydration_cv.png (spatial-block CV, feature importances, 1024x1024 maps)
  - docs/HYDRATION_METRICS.md (technical summary and scientific scope)
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio
from PIL import Image
from pyproj import CRS, Transformer
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from scipy.ndimage import distance_transform_edt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_dataset import FEATURES, RAW, ROOT  # noqa: E402
from common import OUT  # noqa: E402

N = 1024


def classify_signal(report: dict) -> str:
    """Classify spatial-block CV performance per docs/impl/11_HYDRATION_PROSPECTOR.md."""
    rho = float(report["spearman_blocked_cv"])
    mae_m = float(report["mae_model"])
    mae_b = float(report["mae_baseline_mean"])
    if mae_m < mae_b and rho >= 0.4:
        return "validated"
    if mae_m < mae_b and rho >= 0.2:
        return "weak_signal"
    return "negative"


def rank_candidates(
    mid_2d: np.ndarray,
    unc_2d: np.ndarray,
    slope_2d: np.ndarray,
    bd1900_2d: np.ndarray,
    sindex_2d: np.ndarray,
    elev_2d: np.ndarray,
    meta: dict,
    crs: CRS,
    k: int = 10,
) -> list[dict]:
    """Rank top candidate sampling sites within 1.5 km of scene center with slope <= 20 deg."""
    size_m = float(meta["size_m"])
    bounds = meta["bounds_projected_m"]
    cx = 0.5 * (bounds[0] + bounds[2])
    cy = 0.5 * (bounds[1] + bounds[3])
    to_geo = Transformer.from_crs(crs, crs.geodetic_crs, always_xy=True)

    step_m = 60.0
    max_dist = 1500.0
    half = size_m / 2.0 - 40.0
    candidates: list[dict] = []

    coords = np.arange(-max_dist, max_dist + 1e-6, step_m)
    for x in coords:
        for z in coords:
            dist = float(np.hypot(x, z))
            if dist < 40.0 or dist > max_dist:
                continue
            if abs(x) > half or abs(z) > half:
                continue
            u = (x + size_m / 2.0) / size_m
            v = (z + size_m / 2.0) / size_m
            col = int(np.clip(round(u * (N - 1)), 0, N - 1))
            row = int(np.clip(round(v * (N - 1)), 0, N - 1))
            sl = float(slope_2d[row, col])
            val = float(mid_2d[row, col])
            unc = float(unc_2d[row, col])
            if not (np.isfinite(sl) and np.isfinite(val) and np.isfinite(unc)):
                continue
            if sl > 20.0:
                continue
            score = val - 0.5 * unc - 0.02 * sl
            px_e = cx + x
            px_n = cy - z  # z increases southward while northing increases northward
            lon, lat = to_geo.transform(px_e, px_n)
            candidates.append(
                {
                    "x": round(float(x), 1),
                    "z": round(float(z), 1),
                    "u": round(float(u), 4),
                    "v": round(float(v), 4),
                    "lon": round(float(lon), 6),
                    "lat": round(float(lat), 6),
                    "distance_m": round(dist, 1),
                    "weh_pred": round(val, 3),
                    "uncertainty": round(unc, 3),
                    "slope_deg": round(sl, 2),
                    "elev_m": round(float(elev_2d[row, col]), 2),
                    "crism_bd1900": round(float(bd1900_2d[row, col]), 5),
                    "crism_sindex": round(float(sindex_2d[row, col]), 5),
                    "score": float(score),
                }
            )

    candidates.sort(key=lambda c: -c["score"])
    picked: list[dict] = []
    for c in candidates:
        if all(np.hypot(p["x"] - c["x"], p["z"] - c["z"]) >= 150.0 for p in picked):
            c_out = {key: val for key, val in c.items() if key != "score"}
            c_out["rank"] = len(picked) + 1
            c_out["score"] = round(c["score"], 3)
            picked.append(c_out)
            if len(picked) >= k:
                break
    return picked


def build_dan_overlay(meta: dict, crs: CRS) -> list[dict]:
    """Project real DAN measurements into 4x4 km scene coordinates for HUD overlay."""
    dan_df = pd.read_csv(RAW / "dan" / "dan_points.csv")
    to_proj = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
    px_e, px_n = to_proj.transform(dan_df["lon"].values, dan_df["lat"].values)

    bounds = meta["bounds_projected_m"]
    size_m = float(meta["size_m"])
    cx = 0.5 * (bounds[0] + bounds[2])
    cy = 0.5 * (bounds[1] + bounds[3])

    records: list[dict] = []
    for idx, row in dan_df.iterrows():
        e = float(px_e[idx])
        n = float(px_n[idx])
        x = e - cx
        z = cy - n
        u = (x + size_m / 2.0) / size_m
        v = (z + size_m / 2.0) / size_m
        in_scene = bool(bounds[0] <= e <= bounds[2] and bounds[1] <= n <= bounds[3])
        records.append(
            {
                "sol": int(row["sol"]),
                "lon": round(float(row["lon"]), 6),
                "lat": round(float(row["lat"]), 6),
                "x": round(x, 1),
                "z": round(z, 1),
                "u": round(u, 4),
                "v": round(v, 4),
                "in_scene": in_scene,
                "weh": round(float(row["weh"]), 3),
                "weh_err": round(float(row["weh_err"]), 3),
                "duration_s": int(row["duration_s"]),
            }
        )
    return records


def save_diagnostic_figure(
    oof: pd.DataFrame,
    report: dict,
    mid_2d: np.ndarray,
    unc_2d: np.ndarray,
    dan_points: list[dict],
    candidates: list[dict],
    lo: float,
    hi: float,
    wmax: float,
    meta: dict,
) -> None:
    """Create docs/hydration_cv.png with spatial-block CV, importances, and maps."""
    fig, axes = plt.subplots(2, 2, figsize=(13, 10.5), dpi=160)
    fig.patch.set_facecolor("#0c111a")
    for ax in axes.flat:
        ax.set_facecolor("#121926")
        ax.tick_params(colors="#cbd5e1", labelsize=9)
        for spine in ax.spines.values():
            spine.set_color("#334155")

    # Panel A: Spatial-block CV Predicted vs Observed
    ax = axes[0, 0]
    y_obs = oof["weh"].values
    y_pred = oof["pred_cv"].values
    sc = ax.scatter(y_obs, y_pred, c=oof["sol"].values, cmap="viridis", s=16, alpha=0.8, edgecolors="none")
    vmin = float(min(y_obs.min(), y_pred.min()))
    vmax = float(max(y_obs.max(), y_pred.max()))
    ax.plot([vmin, vmax], [vmin, vmax], "--", color="#38bdf8", lw=1.4, label="1:1 ideal")
    ax.set_xlabel("Observed DAN Passive CTN/CETN Net Ratio", color="#e2e8f0", fontsize=10)
    ax.set_ylabel("Spatial-Block CV Predicted Ratio", color="#e2e8f0", fontsize=10)
    ax.set_title(
        f"A. 500 m Spatial-Block CV (n={report['n_points']}, blocks={report['n_spatial_blocks']})\n"
        f"Spearman r={report['spearman_blocked_cv']:.3f}, R2={report['r2_blocked_cv']:.3f}, "
        f"MAE={report['mae_model']:.3f} vs Base {report['mae_baseline_mean']:.3f}",
        color="#f8fafc",
        fontsize=10.5,
        pad=8,
    )
    cbar = fig.colorbar(sc, ax=ax, pad=0.02)
    cbar.set_label("MSL Sol", color="#cbd5e1", fontsize=9)
    cbar.ax.tick_params(colors="#cbd5e1", labelsize=8)
    ax.legend(frameon=False, labelcolor="#e2e8f0", loc="upper left")

    # Panel B: Feature Importances
    ax = axes[0, 1]
    imp = report["feature_importance"]
    feats = list(imp.keys())[::-1]
    vals = [imp[f] for f in feats]
    colors = ["#22d3ee" if v >= 0.1 else "#64748b" for v in vals]
    ax.barh(feats, vals, color=colors)
    ax.set_xlabel("Gradient Boosting Feature Importance", color="#e2e8f0", fontsize=10)
    ax.set_title("B. Orbital & Topographic Predictor Importances", color="#f8fafc", fontsize=10.5, pad=8)

    # Panel C: Predicted Hydration Map (4x4 km scene)
    half_km = float(meta["size_m"]) / 2000.0
    extent = [-half_km, half_km, half_km, -half_km]
    ax = axes[1, 0]
    im1 = ax.imshow(mid_2d, cmap="YlGnBu", vmin=lo, vmax=hi, extent=extent, origin="upper")
    in_scene = [d for d in dan_points if d["in_scene"]]
    if in_scene:
        ax.scatter(
            [d["x"] / 1000.0 for d in in_scene],
            [d["z"] / 1000.0 for d in in_scene],
            c=[d["weh"] for d in in_scene],
            cmap="YlGnBu",
            vmin=lo,
            vmax=hi,
            s=28,
            edgecolors="#ffffff",
            linewidths=0.7,
            label=f"MSL DAN ({len(in_scene)} sites)",
            zorder=4,
        )
    if candidates:
        ax.scatter(
            [c["x"] / 1000.0 for c in candidates[:5]],
            [c["z"] / 1000.0 for c in candidates[:5]],
            marker="*",
            s=110,
            c="#facc15",
            edgecolors="#0f172a",
            linewidths=0.7,
            label="Top 5 sample candidates",
            zorder=5,
        )
    ax.set_xlabel("East-West X (km)", color="#e2e8f0", fontsize=10)
    ax.set_ylabel("North-South Z (km)", color="#e2e8f0", fontsize=10)
    ax.set_title("C. Predicted Relative Hydrogen Indicator (1024x1024)", color="#f8fafc", fontsize=10.5, pad=8)
    ax.legend(frameon=True, facecolor="#0f172a", edgecolor="#334155", labelcolor="#f8fafc", fontsize=8, loc="lower left")
    cb1 = fig.colorbar(im1, ax=ax, pad=0.02)
    cb1.set_label("CTN/CETN Net Ratio", color="#cbd5e1", fontsize=9)
    cb1.ax.tick_params(colors="#cbd5e1", labelsize=8)

    # Panel D: Uncertainty Map (80% interval width q90 - q10)
    ax = axes[1, 1]
    im2 = ax.imshow(unc_2d, cmap="magma", vmin=0.0, vmax=wmax, extent=extent, origin="upper")
    ax.set_xlabel("East-West X (km)", color="#e2e8f0", fontsize=10)
    ax.set_ylabel("North-South Z (km)", color="#e2e8f0", fontsize=10)
    ax.set_title("D. 80% Prediction Interval Width (q90 - q10)", color="#f8fafc", fontsize=10.5, pad=8)
    cb2 = fig.colorbar(im2, ax=ax, pad=0.02)
    cb2.set_label("Interval Width (ratio units)", color="#cbd5e1", fontsize=9)
    cb2.ax.tick_params(colors="#cbd5e1", labelsize=8)

    fig.suptitle(
        "Tango Horizon Hydration Prospector - Gale Crater / Mount Sharp (Near-Surface Mineral H/OH Proxy)",
        color="#f8fafc",
        fontsize=12.5,
        fontweight="bold",
        y=0.985,
    )
    plt.tight_layout(rect=[0, 0, 1, 0.965])
    out_fig = ROOT / "docs" / "hydration_cv.png"
    out_fig.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_fig, facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Saved diagnostic figure to {out_fig}")


def write_metrics_md(report: dict, signal_tier: str, lo: float, hi: float, wmax: float, dan_points: list[dict], candidates: list[dict]) -> None:
    """Write docs/HYDRATION_METRICS.md with observed CV numbers and limitations."""
    in_scene = sum(1 for d in dan_points if d["in_scene"])
    imp_rows = "\n".join(f"| `{k}` | {v:.4f} |" for k, v in report["feature_importance"].items())
    cand_rows = "\n".join(
        f"| {c['rank']} | ({c['x']:.0f}, {c['z']:.0f}) | {c['lat']:.5f}N, {c['lon']:.5f}E | "
        f"{c['weh_pred']:.3f} | {c['uncertainty']:.3f} | {c['slope_deg']:.1f} deg |"
        for c in candidates[:5]
    )
    md = f"""# Hydration Prospector Validation Metrics (`tango-horizon-hydration-v1`)

## Scientific Scope & Target Definition

- **What this model predicts:** Relative **near-surface mineral-bound hydrogen** (adsorbed water, OH-bearing clays, and hydrated sulfates in the top ~0.5–1.0 m of soil) across the 4x4 km Gale Crater / Mount Sharp scene (`137.4000E, -4.7450N`).
- **What it does NOT predict:** Liquid water or shallow ground ice (equatorial Gale Crater has no stable shallow ice).
- **Ground-truth observable:** Because the PDS Geosciences `MSL-M-DAN-3/4-RDR-V1.0` archive releases calibrated passive and active neutron detector count rates (`CTN_AVERAGE`, `CETN_AVERAGE`, and backgrounds) rather than a pre-tabulated Level 4 WEH wt% table, the target variable is the **background-subtracted passive thermal-to-epithermal neutron net count ratio** (`(CTN - CTN_BKGD) / (CETN - CETN_BKGD)`), aggregated per ~15 m Curiosity traverse stop and weighted by integration duration. It is a dimensionless **relative hydrogen indicator**, not absolute wt% H2O.

## Spatial-Block Cross-Validation Results

Evaluation uses `GroupKFold` over **{report['block_m']} m x {report['block_m']} m spatial blocks** so adjacent traverse measurements never leak across train and test folds.

| Metric | Value |
|---|---|
| Aggregated DAN stops (`n_points`) | {report['n_points']} ({in_scene} inside the 4x4 km scene) |
| Spatial blocks (`{report['block_m']} m`) | {report['n_spatial_blocks']} ({report['n_folds']}-fold GroupKFold) |
| **Spearman rank correlation (`spearman_blocked_cv`)** | **{report['spearman_blocked_cv']:.4f}** (p = {report['spearman_pvalue']:.3e}) |
| **Blocked-CV R^2 (`r2_blocked_cv`)** | **{report['r2_blocked_cv']:.4f}** |
| **Model MAE (`mae_model`)** | **{report['mae_model']:.4f}** |
| **Spatial-block mean baseline MAE (`mae_baseline_mean`)** | **{report['mae_baseline_mean']:.4f}** |
| Decision table tier (`11_HYDRATION_PROSPECTOR.md` §6) | `{signal_tier}` |
| Map dynamic range (2nd–98th percentile) | {lo:.3f} – {hi:.3f} (80% interval width 98th pct: {wmax:.3f}) |

## Feature Importances (GradientBoostingRegressor)

| Predictor | Importance |
|---|---|
{imp_rows}

## Top 5 Candidate Sampling Sites (<= 1.5 km from scene center, slope <= 20 deg)

| Rank | Scene (x, z) m | Mars Coords | Pred. Indicator | 80% Unc. Width | Slope |
|---|---|---|---|---|---|
{cand_rows}

## Known Limitations

1. **Resolution floor:** CRISM MTRDR summary parameters (`BD1900_2`, `SINDEX2`) are ~18 m/px (36 m/px for HRL gap-fill), CTX DTM/DRG are 20 m/px, and THEMIS Night/Day IR mosaics are 100 m/px. Sub-20 m outcrops and narrow mineral veins are below orbital sensor resolution.
2. **Relative indicator:** Passive thermal/epithermal neutron count ratios reflect bulk H/OH moderation convolved with soil Fe/Cl neutron-absorbing chemistry and rover geometry, and are not converted to absolute WEH wt% without site-specific Monte Carlo MCNPX inversion.
3. **Traverse bias:** Curiosity measurements sample the Bradbury-to-Mount-Sharp ascent path; high-elevation slopes off-traverse carry larger quantile uncertainty (`q90 - q10`).
"""
    out_md = ROOT / "docs" / "HYDRATION_METRICS.md"
    out_md.write_text(md, encoding="utf-8")
    print(f"Saved metrics report to {out_md}")


def main() -> None:
    meta = json.loads((OUT / "terrain" / "meta.json").read_text(encoding="utf-8"))
    bounds = meta["bounds_projected_m"]
    stack = []
    crs_ref: CRS | None = None

    for f in FEATURES:
        with rasterio.open(RAW / "hydration" / f"{f}.tif") as ds:
            if crs_ref is None:
                crs_ref = CRS.from_wkt(ds.crs.to_wkt())
            win = from_bounds(*bounds, transform=ds.transform)
            arr = ds.read(
                1,
                window=win,
                out_shape=(N, N),
                resampling=Resampling.bilinear,
                boundless=True,
                fill_value=np.nan,
            ).astype("float32")
            stack.append(arr)

    assert crs_ref is not None
    X_grid = np.stack(stack, axis=-1)  # (N, N, 11)
    raw_ok = np.isfinite(X_grid).all(axis=2)
    raw_valid_pct = float(100.0 * raw_ok.mean())
    print(f"Scene 1024x1024 raw valid predictor coverage: {raw_valid_pct:.2f}%")

    # Nearest-neighbor fill for isolated sensor nodata holes (e.g., 0.08% CTX shadow gap in img_mean)
    for b in range(X_grid.shape[2]):
        band = X_grid[:, :, b]
        invalid = ~np.isfinite(band)
        if np.any(invalid) and not np.all(invalid):
            _, indices = distance_transform_edt(invalid, return_indices=True)
            band[invalid] = band[tuple(indices)][invalid]

    X_flat = X_grid.reshape(-1, len(FEATURES))
    ok = np.isfinite(X_flat).all(axis=1)
    valid_pct = float(100.0 * ok.mean())
    print(f"Scene 1024x1024 filled predictor coverage: {valid_pct:.2f}%")

    models = joblib.load(RAW / "hydration" / "model.joblib")
    mid = np.full(N * N, np.nan, dtype=np.float32)
    width = np.full(N * N, np.nan, dtype=np.float32)
    mid[ok] = models["mid"].predict(X_flat[ok])
    lo_pred = models["lo"].predict(X_flat[ok])
    hi_pred = models["hi"].predict(X_flat[ok])
    width[ok] = np.maximum(0.0, hi_pred - lo_pred)

    lo, hi = [float(v) for v in np.nanpercentile(mid, [2, 98])]
    wmax = float(np.nanpercentile(width, 98))

    def to_u8(arr: np.ndarray, a0: float, a1: float) -> np.ndarray:
        span = max(a1 - a0, 1e-6)
        scaled = np.clip((arr - a0) / span * 255.0, 0.0, 255.0)
        return np.nan_to_num(scaled, nan=0.0).astype("uint8").reshape(N, N)

    terrain_out = OUT / "terrain"
    terrain_out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(to_u8(mid, lo, hi), mode="L").save(terrain_out / "hydration_1024.png", optimize=True)
    Image.fromarray(to_u8(width, 0.0, wmax), mode="L").save(terrain_out / "hydration_unc_1024.png", optimize=True)

    report = json.loads((RAW / "hydration" / "report.json").read_text(encoding="utf-8"))
    signal_tier = classify_signal(report)

    provenance_entry = {
        "source": (
            "Gradient Boosting ensemble (tango-horizon-hydration-v1) trained on MSL DAN passive neutron "
            "counts (PDS Geosciences MSL-M-DAN-3/4-RDR-V1.0) with MRO CRISM MTRDR (BD1900_2, SINDEX2), "
            "Mars Odyssey THEMIS IR (mc23_aeolis_nir, mc23_aeolis_dir), and MRO CTX DTM/DRG (USGS STAC)"
        ),
        "product_id": "tango-horizon-hydration-v1",
        "datasets": [
            "MSL-M-DAN-3/4-RDR-V1.0",
            "mro_crism_mtrdr (frt000058a3, frt0000b6f1, frt00021c92, frt0000c518, frt0002037a, hrl0000baba, hrl0000d21c, hrl0000d349, hrl0001233b)",
            "mc23_aeolis_nir",
            "mc23_aeolis_dir",
            "T01_000815_1749_XN_05S222W__P21_009149_1752_XI_04S222W",
        ],
        "transform": (
            f"500 m spatial-block GroupKFold CV: R2={report['r2_blocked_cv']:.3f}, "
            f"Spearman={report['spearman_blocked_cv']:.3f}, MAE={report['mae_model']:.3f} vs baseline "
            f"{report['mae_baseline_mean']:.3f} (n={report['n_points']}, blocks={report['n_spatial_blocks']})"
        ),
        "limitations": (
            "Predicts near-surface mineral-bound hydrogen indicator (passive thermal/epithermal neutron ratio) "
            "in the top ~0.5 m, not liquid water or shallow ice. Limited to orbital predictor resolution "
            "(CRISM 18-36 m/px, CTX 20 m/px, THEMIS 100 m/px)."
        ),
        "retrieved": time.strftime("%Y-%m-%d"),
    }

    hyd_meta = {
        "weh_min": round(lo, 4),
        "weh_max": round(hi, 4),
        "interval_width_max": round(wmax, 4),
        "target_name": "thermal_epithermal_net_ratio",
        "target_label": "Relative Hydrogen Indicator (DAN passive CTN/CETN net ratio)",
        "units": "dimensionless ratio (not absolute wt% H2O)",
        "signal_tier": signal_tier,
        "validation": report,
        "provenance": provenance_entry,
    }
    (terrain_out / "hydration_meta.json").write_text(json.dumps(hyd_meta, indent=2), encoding="utf-8")

    mid_2d = mid.reshape(N, N)
    unc_2d = width.reshape(N, N)
    elev_2d = X_grid[:, :, FEATURES.index("elev")]
    slope_2d = X_grid[:, :, FEATURES.index("slope")]
    bd1900_2d = X_grid[:, :, FEATURES.index("crism_bd1900")]
    sindex_2d = X_grid[:, :, FEATURES.index("crism_sindex")]

    dan_points = build_dan_overlay(meta, crs_ref)
    candidates = rank_candidates(mid_2d, unc_2d, slope_2d, bd1900_2d, sindex_2d, elev_2d, meta, crs_ref, k=10)

    sites_doc = {
        "product_id": "tango-horizon-hydration-v1",
        "signal_tier": signal_tier,
        "target_label": hyd_meta["target_label"],
        "units": hyd_meta["units"],
        "note": "Near-surface bound mineral hydration indicator (top ~0.5 m), not liquid water or shallow ice.",
        "scene_size_m": float(meta["size_m"]),
        "top_candidates": candidates,
        "dan_measurements": dan_points,
    }
    (terrain_out / "hydration_sites.json").write_text(json.dumps(sites_doc, indent=2), encoding="utf-8")

    oof = pd.read_parquet(RAW / "hydration" / "cv_oof.parquet")
    save_diagnostic_figure(oof, report, mid_2d, unc_2d, dan_points, candidates, lo, hi, wmax, meta)
    write_metrics_md(report, signal_tier, lo, hi, wmax, dan_points, candidates)
    print(f"Done. Signal tier: {signal_tier}")


if __name__ == "__main__":
    main()
