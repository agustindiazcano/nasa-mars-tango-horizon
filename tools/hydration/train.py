"""Train and validate the Hydration Prospector model using spatial-block CV.

Spatial block cross-validation (GroupKFold over 500 m grid blocks) prevents
nearby traverse measurements from leaking between train and test folds.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_dataset import FEATURES, RAW  # noqa: E402

BLOCK_M = 500  # Spatial block size in meters (> autocorrelation scale of DAN stops)


def blocks(df: pd.DataFrame) -> np.ndarray:
    """Assign each measurement to a 500 m x 500 m spatial block ID."""
    m_per_deg = np.pi / 180.0 * 3396190.0
    bx = np.floor(df["lon"].values * m_per_deg * np.cos(np.radians(df["lat"].mean())) / BLOCK_M).astype(int)
    by = np.floor(df["lat"].values * m_per_deg / BLOCK_M).astype(int)
    return np.array([f"{x}_{y}" for x, y in zip(bx, by)])


def make(q: float | None = None) -> GradientBoostingRegressor:
    """Create a GradientBoostingRegressor for mean/median or quantile estimation."""
    kw = dict(n_estimators=300, max_depth=3, learning_rate=0.05, subsample=0.8, random_state=0)
    if q is not None:
        return GradientBoostingRegressor(loss="quantile", alpha=q, **kw)
    return GradientBoostingRegressor(**kw)


def main() -> None:
    df = pd.read_parquet(RAW / "hydration" / "train.parquet")
    X = df[FEATURES].values
    y = df["weh"].values
    g = blocks(df)
    n_groups = len(set(g))
    n_splits = min(5, n_groups)

    pred = np.zeros_like(y, dtype=float)
    base = np.zeros_like(y, dtype=float)
    for tr, te in GroupKFold(n_splits=n_splits).split(X, y, g):
        pred[te] = make().fit(X[tr], y[tr]).predict(X[te])
        base[te] = y[tr].mean()  # Baseline: spatial-block training fold mean

    sp_res = spearmanr(y, pred)
    report = {
        "n_points": int(len(y)),
        "n_spatial_blocks": int(n_groups),
        "n_folds": int(n_splits),
        "block_m": BLOCK_M,
        "r2_blocked_cv": float(r2_score(y, pred)),
        "spearman_blocked_cv": float(sp_res.statistic),
        "spearman_pvalue": float(sp_res.pvalue),
        "mae_model": float(mean_absolute_error(y, pred)),
        "mae_baseline_mean": float(mean_absolute_error(y, base)),
        "target_quantity": "thermal_epithermal_net_ratio",
        "target_units": "dimensionless ratio",
        "y_min": float(np.min(y)),
        "y_max": float(np.max(y)),
        "y_mean": float(np.mean(y)),
        "y_std": float(np.std(y)),
    }

    final_mid = make().fit(X, y)
    final_lo = make(0.1).fit(X, y)
    final_hi = make(0.9).fit(X, y)

    report["feature_importance"] = dict(
        sorted(zip(FEATURES, map(float, final_mid.feature_importances_)), key=lambda kv: -kv[1])
    )

    out_dir = RAW / "hydration"
    joblib.dump({"mid": final_mid, "lo": final_lo, "hi": final_hi}, out_dir / "model.joblib")
    (out_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    oof = df[["sol", "lon", "lat", "weh"]].copy()
    oof["pred_cv"] = pred
    oof["base_cv"] = base
    oof["block_id"] = g
    oof.to_parquet(out_dir / "cv_oof.parquet", index=False)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
