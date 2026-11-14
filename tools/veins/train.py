"""Train the mineral-vein classifier with sol-grouped CV and a 500-run permutation test."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "veins"


def _make_clf():
    return make_pipeline(
        StandardScaler(),
        LogisticRegression(C=0.5, max_iter=2000, class_weight="balanced", random_state=42),
    )


def _cv_oof_probs(X: np.ndarray, y: np.ndarray, groups: np.ndarray, n_splits: int) -> np.ndarray:
    gkf = GroupKFold(n_splits=n_splits)
    prob = np.zeros(len(y), dtype=np.float64)
    for tr, te in gkf.split(X, y, groups):
        if len(np.unique(y[tr])) < 2:
            prob[te] = float(y[tr].mean())
        else:
            prob[te] = _make_clf().fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
    return prob


def train_vein_model(raw_dir: Path = RAW, n_permutations: int = 500, seed: int = 42) -> dict:
    emb_path = raw_dir / "embeddings.npz"
    labels_path = raw_dir / "labels.csv"
    if not emb_path.exists():
        raise FileNotFoundError(f"Missing embeddings file: {emb_path}")
    if not labels_path.exists():
        raise FileNotFoundError(f"Missing labels file: {labels_path}")

    emb = np.load(emb_path, allow_pickle=True)
    labels = pd.read_csv(labels_path)
    required_cols = {"name", "sol", "vein", "reviewed_by"}
    missing_cols = required_cols - set(labels.columns)
    if missing_cols:
        raise ValueError(f"labels.csv missing columns: {sorted(missing_cols)}")

    # Human/audit review check is mandatory per docs/impl/15_VEIN_DETECTOR.md
    reviewed = labels["reviewed_by"].notna() & (labels["reviewed_by"].astype(str).str.strip() != "")
    assert reviewed.all(), "Every row in labels.csv must have a non-empty reviewed_by value before training."

    emb_names = [str(n) for n in emb["names"]]
    name_to_idx = {n: i for i, n in enumerate(emb_names)}
    df = labels[labels["name"].isin(name_to_idx)].copy().reset_index(drop=True)
    if df.empty:
        raise ValueError("No overlap between labels.csv and embeddings.npz")

    X = emb["cls"][[name_to_idx[n] for n in df["name"]]].astype(np.float32)
    y = df["vein"].astype(int).values
    groups = df["sol"].astype(int).values
    n_sols = int(len(set(groups)))
    n_splits = min(5, n_sols)
    if n_splits < 2:
        raise ValueError(f"Need at least 2 distinct sols for GroupKFold; got {n_sols}")

    oof_prob = _cv_oof_probs(X, y, groups, n_splits=n_splits)
    pred = (oof_prob >= 0.5).astype(int)
    p, r, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    obs_auc = float(roc_auc_score(y, oof_prob))
    pr_auc = float(average_precision_score(y, oof_prob))
    pos_rate = float(y.mean())

    # 500-run label permutation test under the identical GroupKFold CV procedure
    rng = np.random.default_rng(seed)
    null_aucs = np.empty(n_permutations, dtype=np.float64)
    for k in range(n_permutations):
        y_perm = rng.permutation(y)
        perm_prob = _cv_oof_probs(X, y_perm, groups, n_splits=n_splits)
        null_aucs[k] = roc_auc_score(y_perm, perm_prob)
    p_value = float((1 + int((null_aucs >= obs_auc).sum())) / (n_permutations + 1))

    backend = str(emb["backend"].item()) if "backend" in emb.files else "unknown"
    report = {
        "n_images": int(len(y)),
        "n_positive": int(y.sum()),
        "n_negative": int((1 - y).sum()),
        "n_sols": n_sols,
        "n_splits": n_splits,
        "feature_backend": backend,
        "feature_dim": int(X.shape[1]),
        "classifier": "StandardScaler + LogisticRegression(C=0.5, class_weight='balanced')",
        "validation": "GroupKFold grouped by sol",
        "precision": round(float(p), 4),
        "recall": round(float(r), 4),
        "f1": round(float(f1), 4),
        "roc_auc": round(obs_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "baseline_positive_rate": round(pos_rate, 4),
        "n_permutations": int(n_permutations),
        "permutation_p_value": round(p_value, 6),
        "null_auc_mean": round(float(null_aucs.mean()), 4),
        "null_auc_std": round(float(null_aucs.std()), 4),
    }

    final_model = _make_clf().fit(X, y)
    joblib.dump(final_model, raw_dir / "model.joblib")
    (raw_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    np.savez_compressed(
        raw_dir / "cv_diagnostics.npz",
        y_true=y.astype(np.int32),
        oof_prob=oof_prob.astype(np.float32),
        sols=groups.astype(np.int32),
        null_aucs=null_aucs.astype(np.float32),
    )
    print(json.dumps(report, indent=2))
    return report


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Train sol-grouped mineral-vein classifier.")
    parser.add_argument("--raw-dir", type=Path, default=RAW, help="Directory with embeddings.npz and labels.csv")
    parser.add_argument("--permutations", type=int, default=500, help="Number of label permutations (default: 500)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args(argv)
    train_vein_model(raw_dir=args.raw_dir, n_permutations=args.permutations, seed=args.seed)


if __name__ == "__main__":
    main(sys.argv[1:])
