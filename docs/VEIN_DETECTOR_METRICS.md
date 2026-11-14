# Vein Detector Validation Metrics (`tango-horizon-veins-v1`)

## Scientific Scope & Target Definition

- **What this model predicts:** Visual **mineral-vein candidate signatures** (`vein_probability` and 256x256 spatial patch localization heatmaps) in real NASA Curiosity rover Mastcam (`MAST_LEFT`, `MAST_RIGHT`) and `MAHLI` close-up photographs across Gale Crater.
- **What it does NOT predict:** Chemical or mineral identity (e.g., calcium sulfate / gypsum / bassanite vs. silica or halite), which requires active laser/X-ray spectrometry (`ChemCam` LIBS or `CheMin` XRD heritage).
- **Camera-domain constraint:** Trained and evaluated strictly on real Curiosity Mastcam/MAHLI photographs (`NASA/JPL-Caltech/MSSS`). It is never applied to synthetic 3D viewer renders.

## Dataset Curation & AI4Mars Audit

- **AI4Mars check:** `data/ai4mars/ai4mars-dataset-merged-0.1.zip` (Zenodo `15995036`, Swan et al. 2022, CC-BY-4.0) was audited first; because AI4Mars only labels 4 traversability terrain classes (`soil`, `bedrock`, `sand`, `big rock`) and has no mineral-vein class, we curated and visually audited `n = 117` real Curiosity Mastcam/MAHLI frames across `22` distinct sols (`41` positive mineral-vein frames across Garden City, Sheepbed mudstone, and Yellowknife Bay; `76` negative control frames across Bagnold Dunes, Bradbury regolith, and unfractured bedrock) with mandatory `reviewed_by` verification on every row.

## Sol-Grouped Cross-Validation & 500-Run Permutation Test

Evaluation uses 5-fold `GroupKFold` grouped by **Curiosity Sol (`sol`)**, ensuring that stereo pairs or adjacent frames acquired on the same sol never leak between training and test folds.

| Metric | Value |
|---|---|
| Audited Mastcam/MAHLI images (`n_images`) | 117 (`41` positive, `76` negative) |
| Distinct Curiosity sols (`n_sols`) | 22 (5-fold `GroupKFold` by sol) |
| Backbone & feature dimension | `dinov2-small-vits14` (`384`-d CLS + `32x32` patch tokens at `448x448`) |
| Classifier | `StandardScaler + LogisticRegression(C=0.5, class_weight='balanced')` |
| **Sol-grouped CV Precision** | **0.7941** |
| **Sol-grouped CV Recall** | **0.6585** |
| **Sol-grouped CV F1** | **0.7200** |
| **Sol-grouped CV ROC-AUC** | **0.8453** |
| **Sol-grouped CV PR-AUC** | **0.7961** (vs. `0.3504` positive-rate baseline) |
| **500-Run Permutation Test p-value** | **0.0020** (`p = 0.001996`, null AUC `0.4925 +/- 0.0710`) |

## Demo Traverse Waypoint Predictions (`web/public/data/veins/index.json`)

| Waypoint ID | Sol | Instrument | Image | Vein Prob. | Classification | Peak `(u, v)` | Geological Context |
|---|---:|---|---|---:|---|---|---|
| `wp-1` | 925 | `MAST_LEFT` | `0925ML0040680180402771E01_DXXX.jpg` | **0.864** | `vein_candidate` | `(0.141, 0.016)` | Garden City light-toned mineral vein network |
| `wp-2` | 170 | `MAST_LEFT` | `0170ML0009051090104788E01_DXXX.jpg` | **0.972** | `vein_candidate` | `(0.141, 0.484)` | Sheepbed fractured mudstone outcrop |
| `wp-3` | 1190 | `MAST_LEFT` | `1190ML0053920190502837E01_DXXX.jpg` | **0.048** | `low_probability` | `(0.984, 0.047)` | Bagnold Dunes basaltic sand ripples (negative control) |
| `site-1` | 931 | `MAST_LEFT` | `0931ML0040940390402909C00_DXXX.jpg` | **0.000** | `low_probability` | `(0.016, 0.016)` | Bradbury pebbly regolith without veins |
| `site-2` | 925 | `MAST_RIGHT` | `0925MR0040680180501725E01_DXXX.jpg` | **0.950** | `vein_candidate` | `(0.109, 0.016)` | Boxwork Ridge Alpha branching bright ridge veins |
| `site-3` | 929 | `MAST_RIGHT` | `0929MR0040870190501785E01_DXXX.jpg` | **0.064** | `low_probability` | `(0.922, 0.016)` | Distant raised ledge (wide framing) |
| `hands-target` | 925 | `MAST_RIGHT` | `0925MR0040700000501727E01_DXXX.jpg` | **0.004** | `low_probability` | `(0.141, 0.328)` | Float rock & dusty shadow context |
| `garden-city` | 929 | `MAST_LEFT` | `0929ML0040870190402854E01_DXXX.jpg` | **0.973** | `vein_candidate` | `(0.234, 0.016)` | Garden City reference outcrop: intersecting veins |

## Known Limitations

1. **Visual signature only:** High-albedo dust coatings, sunlit fracture edges, or bright float clasts can produce false positives; spectrometer confirmation is always required before claiming sulfate or hydrated mineral composition.
2. **Patch resolution:** At `448x448` input resolution with `14x14` ViT patches (`32x32` grid), sub-centimeter hairline veins narrower than a few pixels are smoothed in the `256x256` heatmap.
