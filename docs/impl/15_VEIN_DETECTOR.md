# 15. Vein Detector: a vision model that finds evidence of past water in rover images

**Goal:** a small vision classifier, trained by the team, that finds light-toned mineral veins in real Curiosity images and shows where in the image they are. It tells the manipulator rover which rock to drill. Third original model of the project.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 12.3; guide 12 (manipulator rover); guide 08 (`/api/agent/vision`).
**Plan tasks:** 52 to 55.
**Time box: 3 hours of one person.** If there is no validated classifier by then, ship plan B (step 9).

## Idea

Light-toned veins in Gale are fractures filled by minerals that groundwater left behind (calcium sulfate, confirmed by Curiosity's ChemCam and CheMin). They are visible in ordinary images as bright, thin, branching lines in darker rock. That is a shape-and-texture problem, which vision models do well.

What it is and is not: it detects **the visual signature of veins**. It does **not** identify minerals. Mineral identity comes from spectra; say in the app that composition is confirmed by spectrometer (ChemCam heritage), and never let the model or the agent state a mineral from a photo.

| Piece | Choice | Why |
|-------|--------|-----|
| Feature extractor | DINOv2 small (Meta, open weights), frozen | Strong general features, runs on CPU, no training of the backbone |
| Classifier | Logistic regression on the image embedding | Trains in seconds on a few hundred images |
| Localization | The same linear classifier applied to each patch embedding | Gives a coarse heat map of where the vein is, with no pixel labels |
| Labels | Existing NASA JPL labelled images if their classes fit; otherwise pre-labelled by the vision-language model and **checked by a person** | Fast, and the human check is what makes the labels valid |
| Language model's role | Pre-labelling and describing. It is not the detector | Keeps numbers out of the language model |

Where the model runs: **offline, in Python, on the team's laptop.** The app ships the predictions and heat maps for the real photos used in the demo. Nothing heavy runs in the browser or on Cloud Run.

## Code

`tools/veins/embed.py`:

```python
"""Computes DINOv2 embeddings (one per image, plus one per patch) for a folder of rover images. CPU is enough."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np, torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

MODEL = "facebook/dinov2-small"   # 22 M parameters; patch size 14
SIZE = 448                        # 32 x 32 patches


def main(img_dir: str, out: str):
    proc = AutoImageProcessor.from_pretrained(MODEL, size={"height": SIZE, "width": SIZE}, do_center_crop=False)
    model = AutoModel.from_pretrained(MODEL).eval()
    paths = sorted(p for p in Path(img_dir).iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png"))
    cls, patches = [], []
    with torch.no_grad():
        for i, p in enumerate(paths):
            x = proc(images=Image.open(p).convert("RGB"), return_tensors="pt")
            h = model(**x).last_hidden_state[0]          # [1 + n_patches, dim]
            cls.append(h[0].numpy())
            patches.append(h[1:].numpy().astype("float16"))
            if i % 25 == 0:
                print(i, "/", len(paths), p.name)
    np.savez_compressed(out, names=[p.name for p in paths], cls=np.stack(cls), patches=np.stack(patches))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
```

`tools/veins/train.py`:

```python
"""Trains the vein classifier and validates it with whole sols held out (images from one sol are near-duplicates)."""
from __future__ import annotations
import json, sys
from pathlib import Path
import numpy as np, pandas as pd, joblib
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score

RAW = Path(__file__).resolve().parents[2] / "data" / "raw" / "veins"


def main():
    emb = np.load(RAW / "embeddings.npz", allow_pickle=True)
    labels = pd.read_csv(RAW / "labels.csv")              # columns: name, sol, vein (0/1), reviewed_by
    assert labels.reviewed_by.notna().all(), "every label must be checked by a person before training"
    df = pd.DataFrame({"name": emb["names"]}).merge(labels, on="name")
    X = emb["cls"][[list(emb["names"]).index(n) for n in df.name]]
    y, groups = df.vein.values, df.sol.values
    make = lambda: make_pipeline(StandardScaler(), LogisticRegression(C=0.5, max_iter=2000, class_weight="balanced"))
    prob = np.zeros(len(y))
    for tr, te in GroupKFold(n_splits=min(5, len(set(groups)))).split(X, y, groups):
        prob[te] = make().fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
    p, r, f, _ = precision_recall_fscore_support(y, prob > 0.5, average="binary", zero_division=0)
    report = {"n_images": int(len(y)), "n_positive": int(y.sum()), "n_sols": int(len(set(groups))),
              "validation": "grouped by sol", "precision": float(p), "recall": float(r), "f1": float(f),
              "roc_auc": float(roc_auc_score(y, prob)), "baseline_positive_rate": float(y.mean())}
    joblib.dump(make().fit(X, y), RAW / "model.joblib")
    (RAW / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
```

`tools/veins/predict.py`:

```python
"""Scores the demo images and writes, for each, the vein probability and a coarse heat map from patch scores."""
from __future__ import annotations
import json, sys
from pathlib import Path
import numpy as np, joblib
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "veins"
OUT = ROOT / "web" / "public" / "data" / "veins"
sys.path.append(str(ROOT / "tools"))
from common import add_provenance


def main():
    emb = np.load(RAW / "demo_embeddings.npz", allow_pickle=True)
    model = joblib.load(RAW / "model.joblib")
    report = json.loads((RAW / "report.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for name, cls, patches in zip(emb["names"], emb["cls"], emb["patches"]):
        prob = float(model.predict_proba(cls[None])[0, 1])
        side = int(np.sqrt(len(patches)))
        heat = model.predict_proba(patches.astype("float32"))[:, 1].reshape(side, side)
        Image.fromarray((heat * 255).astype("uint8")).resize((256, 256), Image.BILINEAR).save(OUT / f"{Path(name).stem}_heat.png")
        # Brightest patch = where the arm should aim, as a fraction of image width and height.
        iy, ix = np.unravel_index(heat.argmax(), heat.shape)
        index.append({"image": name, "vein_probability": round(prob, 3),
                      "peak": {"u": round((ix + 0.5) / side, 3), "v": round((iy + 0.5) / side, 3), "score": round(float(heat.max()), 3)}})
    (OUT / "index.json").write_text(json.dumps({"validation": report, "images": index}, indent=2))
    add_provenance("veins/index.json", source="Own classifier (DINOv2 small features + logistic regression) on MSL Mastcam/MAHLI images (NASA/JPL-Caltech/MSSS)",
                   product_id="tango-horizon-veins-v1", url="see README",
                   transform=f"validated with whole sols held out: precision={report['precision']:.2f}, recall={report['recall']:.2f}, n={report['n_images']}")


if __name__ == "__main__":
    main()
```

## Instructions for the coding agent

1. `pip install torch transformers scikit-learn joblib pandas pillow`. Use the CPU build of PyTorch; no GPU is needed. Embedding one image takes about a second on a laptop.
2. **Labels: check existing NASA data first (30 minutes at most).** NASA JPL has published labelled sets of Curiosity images for content classification. Look them up through data.nasa.gov and the PDS Imaging Node. If one has a class for veins (or float rock, layered rock, nodules) with enough examples, use it. These sets are distributed through Zenodo: that is allowed by the event rule as long as the licence on that page is followed. **Read the licence, record it in provenance, and credit the authors in the README.** If the classes do not fit, go to step 3.
3. **Own labels.** From `mars.nasa.gov/api/v1/raw_image_items`, download about 400 Mastcam and MAHLI images across at least 15 different sols, including sols where Curiosity worked on veined bedrock and sols on sand or plain rock. Skip thumbnails, calibration targets and images of the rover itself. Send each image to the vision model (`LLM_MODEL_VISION`) with a fixed prompt asking only: "Does this image show light-toned mineral veins in rock? Answer JSON {vein: true|false, confidence: 0-1}". Write `labels.csv` with an empty `reviewed_by` column.
4. **Human review is mandatory.** Build a one-page local tool that shows each image with its proposed label and lets a person accept or flip it with one key; it fills `reviewed_by`. Ask the user to do the review (about 15 minutes for 400 images). `train.py` refuses to run on unreviewed labels on purpose; do not remove that check.
5. Run `embed.py` on the labelled set, then `train.py`.
6. **Read `report.json` honestly:**

   | Result with whole sols held out | What is shown |
   |---------------------------------|---------------|
   | Precision and recall both ≥ 0.75 | Detector drives target selection; metrics visible |
   | Either between 0.6 and 0.75 | Shown as "candidate veins, to be confirmed"; metrics visible |
   | Below 0.6, or fewer than 40 positive examples | Plan B; report the result in the README |

   Do not switch to a random split. Do not move the decision threshold after looking at test results without saying so.
7. **Look at the heat maps before trusting them.** Open ten of them next to their images. Patch-level scores from an image-level classifier are a rough guide: if the bright area is not on the vein in most of the ten, show only the image-level probability and drop the heat map and the aim point.
8. **Integration:**
   - Pick 6 to 10 real images taken near the scene for the demo, run `embed.py` and `predict.py` on them, and attach each to a traverse waypoint or science station.
   - When the manipulator rover is at such a waypoint and is asked to look, the HUD shows the real Curiosity image with the heat map overlaid and the probability. New read tool `detect_veins(waypoint_id)` in `mcp-terrain` returns probability and peak. `SCIENCE` uses it together with `get_hydration_at` to recommend drilling, and the `arm_skill` target is the marker nearest the peak.
   - The detector is trained on real photographs. Do not run it on frames rendered by the 3D viewer: those are synthetic and the result would mean nothing. State this in the provenance entry.
   - Any sentence the agents speak about a detection says "vein candidate" and adds that composition needs a spectrometer.
9. **Plan B (no classifier):** the vision-language model describes the real image and flags possible veins, labelled in the HUD as "AI description, not a validated detector". Target selection then relies on the hydration map alone.

## Acceptance criteria

- `labels.csv` has every row reviewed by a person, and `report.json` exists with sol-grouped validation.
- The HUD shows a real Curiosity image with probability and, if it passed step 7, the heat map.
- "Hands, find a vein and drill it" runs: detection, recommendation with its numbers, guardian, drill.
- The README states what the detector finds, what it does not, its metrics, and the licence and credit of any dataset used.
