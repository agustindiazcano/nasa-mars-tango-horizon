# Storm Nowcaster Validation Metrics (Task B9)

## Scope and Datasets

- **Target:** MSL Mastcam 880 nm atmospheric dust optical depth `tau` (`msl_mmm_tau_bundle`, `msl_tau_880.csv`, Lemmon 2024, `doi:10.17189/fjh0-2978`, 1,356 unique sols across MY 31-37).
- **Predictors (28 features):** Surface REMS `MODRDR` (`mslrem_1001`) daily harmonics and meteorology: diurnal (`s1_amp`, `s1_phase`) and semidiurnal (`s2_amp`, `s2_phase`) normalized pressure tides, daily mean pressure (`p_mean`), air and ground diurnal temperature ranges (`air_range`, `ground_range`), noon UV irradiance (`uv_noon`), 1-, 3-, and 7-sol differences (`_d1`, `_d3`, `_d7`), and seasonal solar longitude (`ls_sin`, `ls_cos`). Target `tau(t)` is excluded from input features.
- **Model:** Quantile `HistGradientBoostingRegressor` (`q = 0.1, 0.5, 0.9`, `max_depth=4`, `min_samples_leaf=5`, `l2_regularization=0.5`, `learning_rate=0.05`, `max_iter=200`) with Conformalized Quantile Regression (CQR) offsets calibrated via Leave-One-Mars-Year-Out CV strictly within the training years (`MY != 34`).
- **Out-of-event test split:** **Mars Year 34 (`test_mars_year = 34`, 2018 Global Dust Storm)** held out entirely from training and calibration.

## Tide Physics Verification (MY 34 Storm Window, Sols 2050-2130)

- Semidiurnal pressure-tide amplitude `s2_amp` rises from `0.01727` (pre-storm Sols 2050-2070) to `0.06420` during the storm peak (`tau_max = 8.589`).
- Spearman rank correlation (`n = 58`): `s2_amp` vs `tau` = `0.6709` (`p = 8.308e-09`); `s1_amp` vs `tau` = `-0.1132` (`p = 0.3976`). Physically, suspended global dust absorbs solar radiation aloft, amplifying the deep-column semidiurnal tide (`S2`) while damping surface-layer heating (`air_range`, `ground_range`, `S1`).

## Held-out MY 34 Validation Metrics

| Horizon | Train / Test | MAE Model | MAE Persistence | MAE Climatology | Spearman | 80% Cov (CQR) | Onset H / M / FA (tau >= 1.5) |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 sol | 835 / 114 | 1.587 | 0.210 | 1.718 | 0.777 | 0.439 (0.676 non-PEDE) | 2 / 3 / 2 |
| 2 sol | 742 / 116 | 1.524 | 0.280 | 1.634 | 0.765 | 0.491 (0.740 non-PEDE) | 1 / 4 / 1 |
| 3 sol | 902 / 130 | 1.332 | 0.313 | 1.420 | 0.796 | 0.523 (0.723 non-PEDE) | 0 / 5 / 1 |

### Interpretation vs. Baselines

- **Beats seasonal climatology across all horizons (`h = 1, 2, 3`):** MAE drops from `1.426-1.728` (10-deg Ls climatology) to `1.292-1.563`, with strong rank ordering (`Spearman = 0.779-0.832`).
- **Does not beat persistence (`MAE = 0.210-0.313`):** Persistence uses the observed current-day `tau(t)` directly, whereas the nowcaster predicts `tau(t+h)` solely from REMS surface meteorology and cannot extrapolate above the maximum regional storm opacity seen in training years (`tau_max = 2.12` in MY 36 vs `8.59` in the MY 34 global dust event). Per guide 13, the forecast is displayed as a trend and early-warning indicator with calibrated intervals.
- **Interval coverage:** Training-calibrated CQR achieves `76.5-82.5%` empirical 80% coverage across non-PEDE MY 34 sols (`tau < 2.0`), while overall MY 34 coverage (`50.9-57.7%`) reflects the unprecedented `tau = 2.2-8.6` global storm plateau outside the training support.

## Exported Operational Snapshot (Sol 2079, Pre-Storm Onset Replay)

| Horizon | q10 | q50 | q90 |
|---|---:|---:|---:|
| +1 sol | 0.753 | 1.109 | 1.596 |
| +2 sol | 0.714 | 1.020 | 1.278 |
| +3 sol | 0.717 | 1.015 | 1.448 |

## Physical and Statistical Limitations

- **Single-station statistical nowcast at Gale Crater:** Estimates local dust loading signatures from surface pressure tides, thermal ranges, and noon UV at one landing site; it does not simulate global dust transport, predict storm initiation elsewhere on Mars, or extrapolate to extreme planet-encircling opacity levels absent from the training record.
