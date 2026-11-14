# 13. Storm Nowcaster: predicting dust storms and acting before they arrive

**Goal:** a light model trained by the team on Curiosity's own weather record that forecasts dust loading a few sols ahead, plus a decision method that turns the forecast into concrete maneuvers for the crew, the fleet and the base. This is the second original science contribution of the project.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 12; guide 02 (REMS parsing); guide 03 (`solar.ts`, `route.ts`).
**Plan tasks:** 45 to 48.
**Time box: 4 hours of one person.** If there is no validated model by then, ship plan B (step 9).

## Idea

Two parts. The first is a forecast, the second is what to do with it.

**1. Forecast from the surface.** Dust in the Martian atmosphere absorbs sunlight and heats the air, and that heating shows up in the daily pressure cycle measured at the surface: the amplitude of the once-a-day and twice-a-day pressure waves (thermal tides) grows as dust loading grows. This relationship is documented in the literature on REMS data. So a station on the ground carries information about dust over a wide region, and the pressure signal responds to dust lifted far away, before the sky overhead darkens. REMS has recorded pressure, temperatures and UV at Gale every sol for more than 4,000 sols, including the 2018 global dust storm.

| Role | Data | Source |
|------|------|--------|
| Target | Dust opacity at Gale on sol t+1, t+2, t+3 (or, failing that, the UV-attenuation index as a relative measure) | MSL opacity product in PDS Atmospheres; REMS UV |
| Predictors, per sol | Diurnal and semidiurnal pressure-tide amplitude and phase; daily mean pressure; daily air and ground temperature range; UV at noon; each with its change over the last 1, 3 and 7 sols | REMS (PDS Atmospheres) |
| Predictor | Season (solar longitude Ls, as sine and cosine): storms are strongly seasonal | REMS labels / computed |
| Optional regional predictor | Dust opacity over the region from orbit (Mars Climate Sounder on MRO) | PDS Atmospheres |

**2. Predictive maneuvers.** The forecast is a distribution, not a single number. Each plan is checked against the pessimistic end of that distribution:

- An EVA is **go** only if, with 90 % confidence, the time needed to get back to shelter stays below the time until opacity crosses the safe-visibility limit, and solar power for the base stays above demand plus margin.
- When the check fails, `BASE` proposes the cheapest maneuver that restores it, in this order: shorten the EVA; move the route closer to the pressurized rover; pre-position the rover along the route; recall and stow drones and the glider; top up batteries now and switch base loads to fission; postpone.
- Every proposal shows the numbers behind it: forecast interval, return time, power margin.

This is the same structure Earth operations use for weather-constrained work (aviation, offshore): a probabilistic forecast feeding a rule with an explicit risk level. What is new here is doing it on Mars from a single surface station, validated on the real 2018 event.

What it is and is not: a **short-range statistical nowcast at one site**. It does not model storm physics and does not claim to predict where a storm starts. Say so in the app and in the README.

## Code

`tools/storm/features.py`:

```python
"""Builds one row per sol from REMS: pressure-tide harmonics, daily ranges, season, and their recent trends."""
from __future__ import annotations
from pathlib import Path
import numpy as np, pandas as pd

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"


def tide_harmonics(lst_hours: np.ndarray, pressure: np.ndarray) -> dict:
    """Least-squares fit p(t) = p0 + sum_k a_k cos(k w t) + b_k sin(k w t), k = 1, 2, over one sol."""
    ok = np.isfinite(lst_hours) & np.isfinite(pressure)
    # Require coverage of most of the day; a partial day gives a biased amplitude.
    if ok.sum() < 200 or np.unique(lst_hours[ok].astype(int)).size < 18:
        return {}
    w = 2 * np.pi * lst_hours[ok] / 24.0
    A = np.column_stack([np.ones(ok.sum()), np.cos(w), np.sin(w), np.cos(2 * w), np.sin(2 * w)])
    c, *_ = np.linalg.lstsq(A, pressure[ok], rcond=None)
    p0 = c[0]
    return {"p_mean": p0,
            "s1_amp": np.hypot(c[1], c[2]) / p0, "s1_phase": np.arctan2(c[2], c[1]),   # diurnal tide, normalized by mean pressure
            "s2_amp": np.hypot(c[3], c[4]) / p0, "s2_phase": np.arctan2(c[4], c[3])}   # semidiurnal tide


def build(per_sol: dict[int, pd.DataFrame], ls_by_sol: dict[int, float]) -> pd.DataFrame:
    """per_sol[sol] has columns lst_h, pressure_pa, air_temp_k, ground_temp_k, uv."""
    rows = []
    for sol, d in sorted(per_sol.items()):
        h = tide_harmonics(d.lst_h.values, d.pressure_pa.values)
        if not h:
            continue
        noon = d[(d.lst_h > 11) & (d.lst_h < 13)]
        ls = np.radians(ls_by_sol[sol])
        rows.append({"sol": sol, **h,
                     "air_range": d.air_temp_k.max() - d.air_temp_k.min(),
                     "ground_range": d.ground_temp_k.max() - d.ground_temp_k.min(),
                     "uv_noon": noon.uv.mean(), "ls_sin": np.sin(ls), "ls_cos": np.cos(ls), "ls_deg": ls_by_sol[sol]})
    f = pd.DataFrame(rows).set_index("sol").sort_index()
    f = f.reindex(range(f.index.min(), f.index.max() + 1))      # keep gaps explicit so lags are true sol lags
    base = ["s1_amp", "s2_amp", "p_mean", "air_range", "ground_range", "uv_noon"]
    for c in base:
        for lag in (1, 3, 7):
            f[f"{c}_d{lag}"] = f[c] - f[c].shift(lag)
    return f


FEATURES = None  # filled in train.py from the columns of the built table
```

`tools/storm/train.py`:

```python
"""Trains quantile forecasts of dust loading 1 to 3 sols ahead and validates on a Mars year never seen in training."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np, pandas as pd, joblib
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from scipy.stats import spearmanr

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
HORIZONS = (1, 2, 3)
QUANTILES = (0.1, 0.5, 0.9)
TARGET = "tau"            # or "dust_index" if only the UV-derived relative index is available
STORM_LEVEL = 1.5         # opacity that defines "storm conditions" for the onset score; set from the data and document it


def main():
    f = pd.read_parquet(RAW / "storm" / "features.parquet")          # features + target + mars_year
    feats = [c for c in f.columns if c not in (TARGET, "mars_year", "ls_deg")]
    test_my = 34                                                     # the Mars year of the 2018 global storm: held out entirely
    report, models = {"target": TARGET, "test_mars_year": test_my, "horizons": {}}, {}
    for h in HORIZONS:
        d = f.assign(y=f[TARGET].shift(-h)).dropna(subset=["y", TARGET])
        tr, te = d[d.mars_year != test_my], d[d.mars_year == test_my]
        preds = {}
        for q in QUANTILES:
            m = HistGradientBoostingRegressor(loss="quantile", quantile=q, max_depth=4, learning_rate=0.05, max_iter=300, random_state=0)
            m.fit(tr[feats], tr.y)                                    # handles missing values natively
            models[f"h{h}_q{q}"] = m
            preds[q] = m.predict(te[feats])
        persistence = te[TARGET].values                               # baseline 1: tomorrow equals today
        clim = tr.groupby((tr.ls_deg // 10).astype(int)).y.mean()     # baseline 2: seasonal climatology by 10 degrees of Ls
        climatology = (te.ls_deg // 10).astype(int).map(clim).fillna(tr.y.mean()).values
        inside = (te.y.values >= preds[0.1]) & (te.y.values <= preds[0.9])
        # Onset skill: on sols currently below storm level, does the pessimistic forecast flag the sols that cross it?
        calm = te[TARGET].values < STORM_LEVEL
        crossed = te.y.values >= STORM_LEVEL
        flagged = preds[0.9] >= STORM_LEVEL
        hits, misses, false_alarms = int((calm & crossed & flagged).sum()), int((calm & crossed & ~flagged).sum()), int((calm & ~crossed & flagged).sum())
        report["horizons"][h] = {
            "n_train": int(len(tr)), "n_test": int(len(te)),
            "mae_model": float(mean_absolute_error(te.y, preds[0.5])),
            "mae_persistence": float(mean_absolute_error(te.y, persistence)),
            "mae_climatology": float(mean_absolute_error(te.y, climatology)),
            "spearman": float(spearmanr(te.y, preds[0.5]).statistic),
            "interval_80_coverage": float(inside.mean()),            # should be near 0.80 if the intervals are honest
            "onset": {"hits": hits, "misses": misses, "false_alarms": false_alarms},
        }
    joblib.dump({"models": models, "features": feats}, RAW / "storm" / "model.joblib")
    (RAW / "storm" / "report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
```

`shared/src/physics/stormDecision.ts`:

```ts
export interface StormForecast { horizonSol: number; q10: number; q50: number; q90: number }   // opacity quantiles
export interface EvaPlan { durationS: number; returnToShelterS: number }
export interface Limits { tauVisibility: number; tauDroneGrounding: number; minPowerMarginW: number }
export interface Decision {
  verdict: "go" | "go_with_changes" | "no_go";
  reasons: string[];                 // i18n keys with parameters, resolved by the UI
  maneuvers: Maneuver[];
}
export type Maneuver = "shorten_eva" | "reroute_near_rover" | "preposition_rover" | "recall_aircraft" | "charge_batteries" | "switch_to_fission" | "postpone";

/**
 * Chance-constrained check: the plan must hold at the pessimistic (90th percentile) opacity.
 * `powerAt(tau)` is base solar output from solar.ts; `demandW` is current base load.
 */
export function decide(fc: StormForecast[], plan: EvaPlan, lim: Limits, powerAt: (tau: number) => number, demandW: number, solSeconds = 88775): Decision {
  const reasons: string[] = [], maneuvers: Maneuver[] = [];
  const today = fc.find((f) => f.horizonSol === 1) ?? fc[0];
  const worst = Math.max(...fc.map((f) => f.q90));

  // Time until the pessimistic opacity reaches the visibility limit, assuming a linear rise across the sol.
  const now = fc[0].q50;
  const timeToLimitS = today.q90 <= lim.tauVisibility ? Infinity
    : Math.max(0, ((lim.tauVisibility - now) / Math.max(today.q90 - now, 1e-6)) * solSeconds);

  if (plan.durationS + plan.returnToShelterS > timeToLimitS) {
    reasons.push("storm.reason.return_margin");
    if (plan.returnToShelterS < timeToLimitS) maneuvers.push("shorten_eva", "preposition_rover");
    else maneuvers.push("postpone");
  }
  if (worst >= lim.tauDroneGrounding) { reasons.push("storm.reason.aircraft"); maneuvers.push("recall_aircraft"); }
  if (powerAt(worst) - demandW < lim.minPowerMarginW) {
    reasons.push("storm.reason.power"); maneuvers.push("charge_batteries", "switch_to_fission");
  }
  const verdict = maneuvers.includes("postpone") ? "no_go" : maneuvers.length ? "go_with_changes" : "go";
  return { verdict, reasons, maneuvers: [...new Set(maneuvers)] };
}
```

## Instructions for the coding agent

1. `pip install scikit-learn scipy joblib pyarrow`. Training runs on CPU in under a minute.
2. **Data (90 minutes at most).** Download the full REMS MODRDR record once (guide 02, step 5 already parses one sol; loop it). Expect a few GB raw; keep only the columns needed and write one compact parquet. Take solar longitude and local true solar time from the product labels or columns; do not approximate them if they are provided. Assign each sol its Mars year.
3. **Target.** In this order of preference:
   - the MSL atmospheric opacity product in PDS Atmospheres (search the MSL archive pages there);
   - otherwise a **UV dust index**: noon UV divided by the clear-sky noon UV expected for that season (a smooth upper envelope over the record). Call it "dust index (relative)" everywhere; never label it as opacity.
   **Do not copy opacity values from figures in papers.**
4. Run `features.py` (write the small driver that loads the per-sol tables and saves `features.parquet` with the target and `mars_year` columns) and then `train.py`.
5. **Verify the tide physics before trusting the model:** plot `s1_amp` and `s2_amp` against the target over the 2018 storm. The amplitudes should rise with dust. If they do not, the harmonic fit or the local-time column is wrong; fix that first.
6. **Read `report.json` honestly:**

   | Result on the held-out Mars year | What is shown |
   |----------------------------------|---------------|
   | Model error below both persistence and climatology at some horizon, and interval coverage between 0.7 and 0.9 | Forecast with intervals drives the decisions; metrics visible in the panel |
   | Model beats climatology but not persistence | Say exactly that. Show the forecast as "trend indicator"; decisions use the wider interval |
   | Model beats neither | Plan B. Report the negative result with numbers in the README |

   Persistence is a strong baseline at one sol. Beating it at two or three sols, or flagging onsets with few misses, is the result worth showing. **Do not move the test year into training to improve the numbers, and do not pick the horizon after looking at test results without saying so.**
7. **Export for the browser:** run the model over the 2018 storm stretch and a clear stretch and save `web/public/data/env/storm_forecast.json`: per sol, the three quantiles for each horizon, next to the observed values. The app replays these; it does not run the model live. State this in the provenance entry, with the validation metrics.
8. **Integration:**
   - HUD environment panel: "Storm forecast" strip with a fan chart for the next 3 sols (median line, 80 % band) and the observed past.
   - Tool `get_storm_forecast()` in `mcp-environment` and `evaluate_eva_weather(plan)` that calls `decide`. `WEATHER-RAD` uses them; `BASE` turns the maneuvers into actions (`dispatch` to pre-position the rover, recall drones, `show_alert`), each through `GUARDIAN`.
   - New demo beat before the storm scenario of guide 09: the forecast band crosses the limit two sols ahead; `BASE` says so, proposes the maneuvers with numbers, and the base panel shows batteries charging and load moving to fission. When the storm arrives in the replay, the crew is already close to the rover. Then show the forecast against what really happened in 2018.
   - Set `Limits` in one file with a source or "design assumption" for each value.
9. **Plan B (no model):** keep the decision method and feed it climatology by season from the REMS record, plus the real-time pressure-tide amplitude as an "early warning indicator" on the HUD. The maneuvers and the 2018 replay still work.
10. Optional with time to spare: add the MCS regional dust opacity as a predictor and report whether it improves the two- and three-sol forecasts.

## Acceptance criteria

- `report.json` exists with a held-out Mars year, both baselines, interval coverage and onset counts.
- The tide amplitudes visibly rise during the 2018 storm in a saved plot (`docs/storm_tides.png`).
- The HUD shows the forecast band and the observed series, and the provenance entry carries the metrics.
- In the demo, the go/no-go changes with the forecast and each maneuver shows the number that triggered it.
- The README states what the model does, what it does not, and its numbers against persistence and climatology.
