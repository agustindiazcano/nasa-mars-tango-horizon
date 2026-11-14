# Hydration Prospector Validation Metrics (`tango-horizon-hydration-v1`)

## Scientific Scope & Target Definition

- **What this model predicts:** Relative **near-surface mineral-bound hydrogen** (adsorbed water, OH-bearing clays, and hydrated sulfates in the top ~0.5–1.0 m of soil) across the 4x4 km Gale Crater / Mount Sharp scene (`137.4000E, -4.7450N`).
- **What it does NOT predict:** Liquid water or shallow ground ice (equatorial Gale Crater has no stable shallow ice).
- **Ground-truth observable:** Because the PDS Geosciences `MSL-M-DAN-3/4-RDR-V1.0` archive releases calibrated passive and active neutron detector count rates (`CTN_AVERAGE`, `CETN_AVERAGE`, and backgrounds) rather than a pre-tabulated Level 4 WEH wt% table, the target variable is the **background-subtracted passive thermal-to-epithermal neutron net count ratio** (`(CTN - CTN_BKGD) / (CETN - CETN_BKGD)`), aggregated per ~15 m Curiosity traverse stop and weighted by integration duration. It is a dimensionless **relative hydrogen indicator**, not absolute wt% H2O.

## Spatial-Block Cross-Validation Results

Evaluation uses `GroupKFold` over **500 m x 500 m spatial blocks** so adjacent traverse measurements never leak across train and test folds.

| Metric | Value |
|---|---|
| Aggregated DAN stops (`n_points`) | 1567 (377 inside the 4x4 km scene) |
| Spatial blocks (`500 m`) | 36 (5-fold GroupKFold) |
| **Spearman rank correlation (`spearman_blocked_cv`)** | **0.5823** (p = 6.845e-143) |
| **Blocked-CV R^2 (`r2_blocked_cv`)** | **0.3638** |
| **Model MAE (`mae_model`)** | **0.3695** |
| **Spatial-block mean baseline MAE (`mae_baseline_mean`)** | **0.4860** |
| Decision table tier (`11_HYDRATION_PROSPECTOR.md` §6) | `validated` |
| Map dynamic range (2nd–98th percentile) | 3.141 – 4.502 (80% interval width 98th pct: 1.744) |

## Feature Importances (GradientBoostingRegressor)

| Predictor | Importance |
|---|---|
| `elev` | 0.5655 |
| `themis_day` | 0.1390 |
| `img_mean` | 0.0563 |
| `themis_night` | 0.0421 |
| `crism_bd1900` | 0.0413 |
| `northness` | 0.0381 |
| `img_std` | 0.0335 |
| `curvature` | 0.0237 |
| `slope` | 0.0211 |
| `crism_sindex` | 0.0201 |
| `roughness` | 0.0193 |

## Top 5 Candidate Sampling Sites (<= 1.5 km from scene center, slope <= 20 deg)

| Rank | Scene (x, z) m | Mars Coords | Pred. Indicator | 80% Unc. Width | Slope |
|---|---|---|---|---|---|
| 1 | (-600, -900) | -4.72982N, 137.38988E | 4.717 | 0.682 | 7.4 deg |
| 2 | (0, -1260) | -4.72374N, 137.40000E | 4.537 | 0.626 | 5.1 deg |
| 3 | (0, -1020) | -4.72779N, 137.40000E | 4.562 | 0.647 | 6.0 deg |
| 4 | (-240, -1140) | -4.72577N, 137.39595E | 4.542 | 0.670 | 4.5 deg |
| 5 | (-180, -900) | -4.72982N, 137.39696E | 4.622 | 0.752 | 6.7 deg |

## Known Limitations

1. **Resolution floor:** CRISM MTRDR summary parameters (`BD1900_2`, `SINDEX2`) are ~18 m/px (36 m/px for HRL gap-fill), CTX DTM/DRG are 20 m/px, and THEMIS Night/Day IR mosaics are 100 m/px. Sub-20 m outcrops and narrow mineral veins are below orbital sensor resolution.
2. **Relative indicator:** Passive thermal/epithermal neutron count ratios reflect bulk H/OH moderation convolved with soil Fe/Cl neutron-absorbing chemistry and rover geometry, and are not converted to absolute WEH wt% without site-specific Monte Carlo MCNPX inversion.
3. **Traverse bias:** Curiosity measurements sample the Bradbury-to-Mount-Sharp ascent path; high-elevation slopes off-traverse carry larger quantile uncertainty (`q90 - q10`).
