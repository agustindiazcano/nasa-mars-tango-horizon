"""Score demo Curiosity images, write 256x256 patch heatmaps, index.json/manifest.json, and docs/veins_eval.png."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import sys

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score, roc_curve

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "veins"
OUT = ROOT / "web" / "public" / "data" / "veins"
EVAL_FIG = ROOT / "docs" / "veins_eval.png"

DISCLAIMER = (
    "Visual mineral-vein candidate signature only; mineral identity (e.g., calcium sulfate) "
    "requires spectrometer confirmation (ChemCam/CheMin heritage). Trained on real Curiosity "
    "Mastcam/MAHLI photographs only; never apply to synthetic 3D viewer renders."
)


def _load_waypoint_table(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Missing waypoint assignment table: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError(f"Expected non-empty JSON list in {path}")
    return data


def _render_eval_figure(
    report: dict,
    diag_path: Path,
    entries: list[dict],
    out_dir: Path,
    fig_path: Path,
) -> None:
    diag = np.load(diag_path)
    y_true = diag["y_true"]
    oof_prob = diag["oof_prob"]
    null_aucs = diag["null_aucs"]

    fig = plt.figure(figsize=(14, 10), dpi=160)
    gs = fig.add_gridspec(2, 2, hspace=0.34, wspace=0.25)

    # Panel 1: Sol-grouped ROC curve
    ax_roc = fig.add_subplot(gs[0, 0])
    fpr, tpr, _ = roc_curve(y_true, oof_prob)
    auc_val = roc_auc_score(y_true, oof_prob)
    ax_roc.plot(fpr, tpr, color="#d95f02", lw=2.4, label=f"Sol-grouped CV (AUC = {auc_val:.3f})")
    ax_roc.plot([0, 1], [0, 1], "--", color="#666666", lw=1.2, label="Chance (AUC = 0.500)")
    ax_roc.set_title("Sol-Grouped Cross-Validation ROC", fontsize=11, fontweight="bold")
    ax_roc.set_xlabel("False Positive Rate")
    ax_roc.set_ylabel("True Positive Rate")
    ax_roc.legend(loc="lower right", frameon=True)
    ax_roc.grid(alpha=0.25)

    # Panel 2: Precision-Recall curve
    ax_pr = fig.add_subplot(gs[0, 1])
    prec, rec, _ = precision_recall_curve(y_true, oof_prob)
    ap = average_precision_score(y_true, oof_prob)
    pos_rate = float(y_true.mean())
    ax_pr.plot(rec, prec, color="#1b9e77", lw=2.4, label=f"Detector (AP = {ap:.3f})")
    ax_pr.axhline(pos_rate, linestyle="--", color="#666666", lw=1.2, label=f"Baseline pos. rate = {pos_rate:.3f}")
    ax_pr.set_title("Sol-Grouped Precision-Recall Curve", fontsize=11, fontweight="bold")
    ax_pr.set_xlabel("Recall")
    ax_pr.set_ylabel("Precision")
    ax_pr.set_xlim(0.0, 1.02)
    ax_pr.set_ylim(0.0, 1.05)
    ax_pr.legend(loc="lower left", frameon=True)
    ax_pr.grid(alpha=0.25)

    # Panel 3: Permutation null distribution vs observed AUC
    ax_perm = fig.add_subplot(gs[1, 0])
    ax_perm.hist(null_aucs, bins=24, color="#7570b3", alpha=0.78, edgecolor="#ffffff", label="Null permutations (n=500)")
    ax_perm.axvline(
        auc_val,
        color="#d95f02",
        lw=2.5,
        label=f"Observed AUC = {auc_val:.3f} (p = {report['permutation_p_value']:.4f})",
    )
    ax_perm.set_title("500-Run Label Permutation Test (GroupKFold by Sol)", fontsize=11, fontweight="bold")
    ax_perm.set_xlabel("Permuted Sol-Grouped ROC-AUC")
    ax_perm.set_ylabel("Count")
    ax_perm.legend(loc="upper left", frameon=True)
    ax_perm.grid(alpha=0.25)

    # Panel 4: Patch heatmap localization examples (top 2 positive + 1 negative waypoint)
    ax_ex_container = fig.add_subplot(gs[1, 1])
    ax_ex_container.axis("off")
    ax_ex_container.set_title("Demo Waypoint Patch Heatmap Localization Examples", fontsize=11, fontweight="bold", pad=12)

    sorted_pos = sorted([e for e in entries if e["vein_probability"] >= 0.5], key=lambda e: -e["vein_probability"])
    sorted_neg = sorted([e for e in entries if e["vein_probability"] < 0.5], key=lambda e: e["vein_probability"])
    examples = (sorted_pos[:2] + sorted_neg[:1])[:3]
    if len(examples) < 3:
        examples = entries[:3]

    sub_gs = gs[1, 1].subgridspec(1, len(examples), wspace=0.08)
    for idx, entry in enumerate(examples):
        ax_sub = fig.add_subplot(sub_gs[0, idx])
        img = Image.open(out_dir / entry["image"]).convert("RGB").resize((256, 256), Image.Resampling.BILINEAR)
        heat = np.asarray(Image.open(out_dir / entry["heatmap"]).convert("L"), dtype=np.float32) / 255.0
        ax_sub.imshow(img)
        ax_sub.imshow(heat, cmap="inferno", alpha=0.45, vmin=0.0, vmax=1.0)
        px = entry["peak"]["u"] * 256.0
        py = entry["peak"]["v"] * 256.0
        ax_sub.plot(px, py, marker="+", color="#00ffff", markersize=11, markeredgewidth=2.0)
        ax_sub.set_title(
            f"{entry['waypoint_id']}\nSol {entry.get('sol', '?')} | p={entry['vein_probability']:.2f}",
            fontsize=8.5,
        )
        ax_sub.set_xticks([])
        ax_sub.set_yticks([])

    fig.suptitle(
        f"Tango Horizon Vein Detector ({report.get('feature_backend', 'dinov2')}) — "
        f"n={report['n_images']} images across {report['n_sols']} sols | "
        f"P={report['precision']:.2f}, R={report['recall']:.2f}, F1={report['f1']:.2f}, AUC={report['roc_auc']:.3f}",
        fontsize=12,
        fontweight="bold",
        y=0.98,
    )
    fig_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(fig_path, bbox_inches="tight", dpi=160)
    plt.close(fig)
    print(f"[predict] saved evaluation chart -> {fig_path}")


def predict_demo(
    raw_dir: Path = RAW,
    out_dir: Path = OUT,
    eval_fig: Path = EVAL_FIG,
    waypoints_file: Path | None = None,
) -> dict:
    emb_path = raw_dir / "demo_embeddings.npz"
    model_path = raw_dir / "model.joblib"
    report_path = raw_dir / "report.json"
    diag_path = raw_dir / "cv_diagnostics.npz"
    wp_path = waypoints_file or (raw_dir / "demo_waypoints.json")

    emb = np.load(emb_path, allow_pickle=True)
    model = joblib.load(model_path)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    waypoints = _load_waypoint_table(wp_path)

    emb_names = [str(n) for n in emb["names"]]
    name_to_idx = {n: i for i, n in enumerate(emb_names)}

    out_dir.mkdir(parents=True, exist_ok=True)
    entries = []

    for wp in waypoints:
        img_name = wp["image"]
        if img_name not in name_to_idx:
            raise KeyError(f"Demo image {img_name} not found in {emb_path}")
        idx = name_to_idx[img_name]
        cls_vec = emb["cls"][idx].astype(np.float32)
        patches = emb["patches"][idx].astype(np.float32)

        prob = float(model.predict_proba(cls_vec[None])[0, 1])
        side = int(round(np.sqrt(len(patches))))

        # Score each patch via linear logistic weights; apply contrast-preserving calibration
        # centered at the patch mean when raw probabilities compress into a narrow band.
        raw_patch_prob = model.predict_proba(patches)[:, 1].reshape(side, side)
        if float(raw_patch_prob.max() - raw_patch_prob.min()) < 0.12:
            logits = model.decision_function(patches)
            z_logits = (logits - logits.mean()) / (logits.std() + 1e-6)
            # Modulate spatial salience by image-level probability so negatives remain subdued
            heat = (1.0 / (1.0 + np.exp(-1.2 * z_logits))).reshape(side, side) * (0.35 + 0.65 * prob)
        else:
            heat = raw_patch_prob

        heat = np.clip(heat, 0.0, 1.0)
        heat_name = f"{Path(img_name).stem}_heat.png"
        heat_u8 = np.clip(np.round(heat * 255.0), 0, 255).astype(np.uint8)
        Image.fromarray(heat_u8, mode="L").resize((256, 256), Image.Resampling.BILINEAR).save(
            out_dir / heat_name, format="PNG"
        )

        # Copy real Curiosity rover photograph into web/public/data/veins/ for offline/CORS-free HUD rendering
        src_img = raw_dir / "demo" / img_name
        if not src_img.exists():
            src_img = raw_dir / "images" / img_name
        if src_img.exists():
            shutil.copy2(src_img, out_dir / img_name)

        iy, ix = np.unravel_index(int(np.argmax(heat)), heat.shape)
        peak = {
            "u": round((int(ix) + 0.5) / side, 3),
            "v": round((int(iy) + 0.5) / side, 3),
            "score": round(float(heat.max()), 3),
        }
        entries.append(
            {
                "waypoint_id": wp["waypoint_id"],
                "image": img_name,
                "heatmap": heat_name,
                "sol": int(wp["sol"]),
                "instrument": wp["instrument"],
                "vein_probability": round(prob, 3),
                "peak": peak,
                "classification": "vein_candidate" if prob >= 0.5 else "low_probability",
                "image_credit": wp.get("image_credit", "NASA/JPL-Caltech/MSSS"),
                "nasa_url": wp.get("https_url", ""),
                "note": wp.get("note", ""),
            }
        )

    payload = {
        "model": f"tango-horizon-veins-v1 ({report.get('feature_backend', 'dinov2')})",
        "disclaimer": DISCLAIMER,
        "provenance": {
            "source": "Own classifier (frozen DINOv2-small features + sol-grouped logistic regression) on MSL Mastcam/MAHLI images (NASA/JPL-Caltech/MSSS)",
            "product_id": "tango-horizon-veins-v1",
            "api_url": "https://mars.nasa.gov/api/v1/raw_image_items/",
            "ai4mars_checked": "Zenodo 15995036 (Swan et al., 2022, CC-BY-4.0) checked; lacks mineral-vein class so MSL Mastcam/MAHLI frames were curated and visually audited.",
            "transform": (
                f"448x448 resize, {report.get('feature_backend', 'dinov2')} CLS + 32x32 patch tokens, "
                f"GroupKFold(sol) precision={report['precision']:.3f}, recall={report['recall']:.3f}, "
                f"roc_auc={report['roc_auc']:.3f}, p={report['permutation_p_value']:.4f}, n={report['n_images']}"
            ),
        },
        "validation": report,
        "images": entries,
    }

    serialized = json.dumps(payload, indent=2)
    (out_dir / "index.json").write_text(serialized, encoding="utf-8")
    (out_dir / "manifest.json").write_text(serialized, encoding="utf-8")

    if diag_path.exists():
        _render_eval_figure(report, diag_path, entries, out_dir, eval_fig)

    print(f"[predict] wrote {len(entries)} waypoints to {out_dir / 'index.json'} and manifest.json")
    return payload


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Generate Vein Detector predictions, heatmaps, and evaluation plots.")
    parser.add_argument("--raw-dir", type=Path, default=RAW)
    parser.add_argument("--out-dir", type=Path, default=OUT)
    parser.add_argument("--eval-fig", type=Path, default=EVAL_FIG)
    parser.add_argument("--waypoints", type=Path, default=None)
    args = parser.parse_args(argv)
    predict_demo(raw_dir=args.raw_dir, out_dir=args.out_dir, eval_fig=args.eval_fig, waypoints_file=args.waypoints)


if __name__ == "__main__":
    main(sys.argv[1:])
