#!/usr/bin/env python3
"""
Generates and verifies auto-maintained technical sections in README.md from:
  - web/public/data/provenance.json
  - shared/src/physics/*.ts and shared/src/physics/constants.ts
  - web/public/data/terrain/hydration_meta.json
  - web/public/data/env/storm_forecast.json
  - web/public/data/veins/manifest.json

Usage:
  python tools/generate_readme.py          # Update README.md in place
  python tools/generate_readme.py --check  # Exit 1 if README.md is out of date
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
README_PATH = ROOT / "README.md"
PROVENANCE_PATH = ROOT / "web" / "public" / "data" / "provenance.json"
CONSTANTS_PATH = ROOT / "shared" / "src" / "physics" / "constants.ts"
HYDRATION_META_PATH = ROOT / "web" / "public" / "data" / "terrain" / "hydration_meta.json"
STORM_FORECAST_PATH = ROOT / "web" / "public" / "data" / "env" / "storm_forecast.json"
VEINS_MANIFEST_PATH = ROOT / "web" / "public" / "data" / "veins" / "manifest.json"


def _escape_md(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ").strip()


def render_data_section() -> str:
    provenance: dict[str, dict[str, Any]] = json.loads(
        PROVENANCE_PATH.read_text(encoding="utf-8")
    )

    vein_jpgs: list[str] = []
    vein_heats: list[str] = []
    rows: list[tuple[str, str, str, str]] = []

    for key, entry in provenance.items():
        if key.startswith("veins/") and key.endswith(".jpg"):
            vein_jpgs.append(key)
            continue
        if key.startswith("veins/") and key.endswith("_heat.png"):
            vein_heats.append(key)
            continue
        source = _escape_md(str(entry.get("source", "")))
        product_id = _escape_md(str(entry.get("product_id", "")))
        retrieved = _escape_md(str(entry.get("retrieved", "")))
        url = str(entry.get("url", ""))
        url_cell = f"[link]({url})" if url.startswith("http") else (f"`{url}`" if url else "local pipeline")
        rows.append((f"`{key}`", source, f"`{product_id}`", f"{retrieved} · {url_cell}"))

    if vein_jpgs:
        sample = provenance[vein_jpgs[0]]
        rows.append(
            (
                f"`veins/*_DXXX.jpg` ({len(vein_jpgs)} frames)",
                _escape_md(str(sample.get("source", ""))),
                "MSL Mastcam/MAHLI Sols 170–1190",
                _escape_md(str(sample.get("retrieved", ""))),
            )
        )
    if vein_heats:
        sample = provenance[vein_heats[0]]
        rows.append(
            (
                f"`veins/*_heat.png` ({len(vein_heats)} maps)",
                _escape_md(str(sample.get("source", ""))),
                "`tango-horizon-veins-v1` (256x256)",
                _escape_md(str(sample.get("retrieved", ""))),
            )
        )

    lines = [
        f"Tracked runtime assets in `web/public/data/provenance.json` (**{len(provenance)} entries**; SHA-256 checksums and CRS transforms recorded in the manifest):",
        "",
        "| Asset | Source | Product / Model ID | Retrieved / Ref |",
        "|---|---|---|---|",
    ]
    for asset, source, prod, ref in rows:
        lines.append(f"| {asset} | {source} | {prod} | {ref} |")
    return "\n".join(lines)


PHYSICS_ROWS: list[tuple[str, str, str, str, str]] = [
    (
        "Metabolic rate & O2/CO2 demand",
        "`M = 1.5 W + k * [2.0(W + L)(L/W)^2 + eta(W + L)(1.5 v^2 + 0.35 v G)]` (`k = g_mars/g_earth`, floored at `1.5 W`, Santee `G < 0` downhill CF)",
        "Pandolf et al. (1977) + Santee et al. (2001) scaled by `g_mars/g_earth`; NASA-STD-3001 Vol 2",
        "[metabolic.ts](shared/src/physics/metabolic.ts)",
        "[physics.test.ts](shared/src/physics/__tests__/physics.test.ts)",
    ),
    (
        "Choked orifice leak & alveolar pO2",
        "`m_dot = C_d A P sqrt(gamma/(R T)) (2/(gamma+1))^((gamma+1)/(2(gamma-1)))`; `P_AO2 = P_suit - P_H2O - P_aCO2`",
        "Compressible choked orifice flow; NASA-STD-3001 Vol 2 Rev E (Armstrong 6.27 kPa, `P_AO2 = 8.0 kPa` impaired)",
        "[suitLeak.ts](shared/src/physics/suitLeak.ts)",
        "[physics.test.ts](shared/src/physics/__tests__/physics.test.ts)",
    ),
    (
        "1 Hz PLSS state & live suit telemetry",
        "Fixed-step primary/reserve O2 draw, emergency regulator makeup, CO2 scrubber, fan RPM, battery Wh & coolant L",
        "NASA-STD-3001 Vol 2; Apollo/xEMU design bounds",
        "[suitState.ts](shared/src/physics/suitState.ts), [suitTelemetry.ts](shared/src/physics/suitTelemetry.ts)",
        "[physics.test.ts](shared/src/physics/__tests__/physics.test.ts)",
    ),
    (
        "Martian atmosphere & solar extinction",
        "`rho0 = P/(R_mars T)`, `rho(h) = rho0 exp(-h/H)`, log wind shear `u(h)`, direct beam `exp(-tau/mu)`",
        "MSL REMS; `mars_solar_toa = 589.2 W/m^2`; direct-beam-only model",
        "[atmosphere.ts](shared/src/physics/atmosphere.ts), [solar.ts](shared/src/physics/solar.ts)",
        "[physics.test.ts](shared/src/physics/__tests__/physics.test.ts)",
    ),
    (
        "Geometric SVF radiation & albedo dose",
        "`D_dot = D_0 * svf`; albedo backscatter `D_0 * (svf + beta * (1 - svf))` (`beta = 0.09`)",
        "MSL-M-RAD-3-RDR-V1.0 (SwRI PDS-PPI); geometric SVF assumption",
        "[dose.ts](shared/src/physics/dose.ts)",
        "[physics.test.ts](shared/src/physics/__tests__/physics.test.ts)",
    ),
    (
        "RK4 ballistic pod & parachute delivery",
        "3D gravity + quadratic atmospheric drag + log wind shear; parachute deploy `< 120 m`; Monte Carlo landing ellipse",
        "Mars ballistic/chute design model (`g_mars = 3.711 m/s^2`, `15 m` crew keep-out)",
        "[ballistic.ts](shared/src/physics/ballistic.ts), [podDelivery.ts](shared/src/physics/podDelivery.ts)",
        "[physics.test.ts](shared/src/physics/__tests__/physics.test.ts)",
    ),
    (
        "Storm go/no-go & EVA route planner (A*)",
        "A* on DEM slope, thermal energy & SVF radiation weights; `tau >= 1.8` rotorcraft grounding; wind/dose go limits",
        "Ingenuity flight envelope; OCHMO/RAD EVA limits",
        "[route.ts](shared/src/physics/route.ts), [stormDecision.ts](shared/src/physics/stormDecision.ts)",
        "[planning.test.ts](shared/src/physics/__tests__/planning.test.ts), [stormDecision.test.ts](shared/src/physics/__tests__/stormDecision.test.ts)",
    ),
    (
        "Crew biomedical EWS & time-to-breach",
        "Weighted 0–3 subscores across `PICO2`, core temp, Physiological Strain Index, SpO2, HR, cardiac drift & hypoxia margin",
        "NASA-STD-3001 Vol 1/2 & OCHMO-TB-004 (advisory only)",
        "[biomed.ts](shared/src/physics/biomed.ts)",
        "[biomed.test.ts](shared/src/physics/__tests__/biomed.test.ts)",
    ),
    (
        "Fleet/PLSS/ISRU fault detection (FDIR)",
        "Sliding-window slope, z-score & remaining useful life (`RUL`) across fan, scrubber, thermal, rover mobility, arm & MOXIE channels",
        "FDIR engineering envelope thresholds",
        "[fdir.ts](shared/src/physics/fdir.ts)",
        "[fdir.test.ts](shared/src/physics/__tests__/fdir.test.ts)",
    ),
    (
        "Environmental & space-weather risk",
        "Diurnal `dP/dt`, air density flight check, dust visibility ETA, battery autonomy & DONKI SEP storm escalation",
        "MSL REMS + NASA DONKI WSA-Enlil",
        "[envNowcast.ts](shared/src/physics/envNowcast.ts)",
        "[envNowcast.test.ts](shared/src/physics/__tests__/envNowcast.test.ts)",
    ),
]


def render_physics_section() -> str:
    lines = [
        "| Domain | Formulation Summary | Reference / Basis | Implementation | Tests |",
        "|---|---|---|---|---|",
    ]
    for domain, eq, ref, impl, tst in PHYSICS_ROWS:
        lines.append(f"| {domain} | {eq} | {ref} | {impl} | {tst} |")
    return "\n".join(lines)


CONST_ENTRY_RE = re.compile(
    r"^\s*([a-zA-Z0-9_]+)\s*:\s*\{(.*?)\n\s*\},?",
    re.MULTILINE | re.DOTALL,
)
FIELD_VAL_RE = re.compile(r"value:\s*([^,\n]+)")
FIELD_UNIT_RE = re.compile(r'unit:\s*"([^"]+)"')
FIELD_SRC_RE = re.compile(r'source:\s*"([^"]+)"')
FIELD_ASSUMP_RE = re.compile(r"assumption:\s*true")


def parse_constants() -> list[tuple[str, str, str, bool, str]]:
    text = CONSTANTS_PATH.read_text(encoding="utf-8")
    start = text.index("export const C = {")
    end = text.index("} as const satisfies Record<string, Const>;", start)
    block = text[start:end]
    parsed: list[tuple[str, str, str, bool, str]] = []
    for key, body in CONST_ENTRY_RE.findall(block):
        vm = FIELD_VAL_RE.search(body)
        um = FIELD_UNIT_RE.search(body)
        sm = FIELD_SRC_RE.search(body)
        if not (vm and um and sm):
            raise RuntimeError(f"Malformed constant block in constants.ts: {key}")
        is_assumption = bool(FIELD_ASSUMP_RE.search(body)) or ("design assumption" in sm.group(1).lower())
        parsed.append((key, vm.group(1).strip(), um.group(1), is_assumption, sm.group(1)))
    if len(parsed) < 40:
        raise RuntimeError(f"Expected >=40 constants in constants.ts, parsed {len(parsed)}")
    return parsed


def render_constants_section() -> str:
    entries = parse_constants()
    n_design = sum(1 for _, _, _, is_assump, _ in entries if is_assump)
    lines = [
        f"Auto-extracted from `C` in [`shared/src/physics/constants.ts`](shared/src/physics/constants.ts) (**{len(entries)} constants**: {len(entries) - n_design} published/standard values, {n_design} flagged engineering `[design assumption]` parameters):",
        "",
        "<details>",
        f"<summary><strong>View all {len(entries)} constants and provenance flags</strong></summary>",
        "",
        "| Constant | Value | Unit | Flag | Source |",
        "|---|---:|---|---|---|",
    ]
    for key, val, unit, is_assumption, source in entries:
        flag = "`[design assumption]`" if is_assumption else "Published / Standard"
        clean_src = _escape_md(re.sub(r"\s*\(design assumption\)\.?", "", source, flags=re.IGNORECASE))
        lines.append(f"| `{key}` | `{val}` | `{_escape_md(unit)}` | {flag} | {clean_src} |")
    lines.extend(["", "</details>"])
    return "\n".join(lines)


def render_models_section() -> str:
    hyd = json.loads(HYDRATION_META_PATH.read_text(encoding="utf-8"))
    storm = json.loads(STORM_FORECAST_PATH.read_text(encoding="utf-8"))
    veins = json.loads(VEINS_MANIFEST_PATH.read_text(encoding="utf-8"))

    hv = hyd["validation"]
    hyd_model = hyd["provenance"]["product_id"]
    hyd_feat = sorted(hv["feature_importance"].items(), key=lambda kv: kv[1], reverse=True)
    top_feat = ", ".join(f"`{k}` ({v:.3f})" for k, v in hyd_feat[:3])

    sv = storm["validation"]
    storm_horizons = sv["horizons"]
    tide = sv["tide_physics"]

    vv = veins["validation"]

    lines = [
        "All three domain models are trained offline by Python scripts in [`tools/`](tools/), evaluated under leakage-free grouped cross-validation or held-out storm years, and verified in CI artifacts without runtime cloud training.",
        "",
        f"### 1. Hydration Prospector (`{hyd_model}`)",
        "",
        f"- **Task & data:** Predicts background-subtracted MSL DAN thermal/epithermal net neutron ratio (`(CTN - CTN_BKGD) / (CETN - CETN_BKGD)`, dimensionless relative H/OH indicator — *not* wt% liquid water) across the 4x4 km Gale Crater scene from CRISM MTRDR (`BD1900_2`, `SINDEX2`), THEMIS Day/Night IR, CTX ortho/DTM geomorphometry, and Curiosity traverse measurements (`n = {hv['n_points']}` stops, {hv['n_spatial_blocks']} spatial blocks of {hv['block_m']} m).",
        f"- **Validation ({hv['n_folds']}-fold {hv['block_m']} m spatial-block `GroupKFold`):** Spearman = **{hv['spearman_blocked_cv']:.4f}** (`p = {hv['spearman_pvalue']:.3e}`), Blocked `R²` = **{hv['r2_blocked_cv']:.4f}**, MAE = **{hv['mae_model']:.4f}** vs. block-mean baseline MAE = **{hv['mae_baseline_mean']:.4f}**. Top features: {top_feat}.",
        "- **Details & plots:** [docs/HYDRATION_METRICS.md](docs/HYDRATION_METRICS.md) · ![Hydration CV](docs/hydration_cv.png)",
        "",
        f"### 2. Storm Nowcaster (`{storm['model']}`)",
        "",
        f"- **Task & data:** Quantile `HistGradientBoostingRegressor` (`q = 0.1, 0.5, 0.9`) with Conformalized Quantile Regression (CQR) predicting Mastcam 880 nm dust opacity `tau` +1, +2, and +3 sols ahead from {len(sv['features'])} MSL REMS daily surface tide and meteorology features (held-out test year: **MY {sv['test_mars_year']}** global dust storm; {len(storm['replay_my34'])}-sol replay window).",
        f"- **Tide physics verification (MY {sv['test_mars_year']} storm window, `n = {tide['n_storm_sols']}` sols):** Semidiurnal pressure tide `s2_amp` rises from `{tide['s2_amp_prestorm_mean']:.5f}` to `{tide['s2_amp_storm_peak']:.4f}` (`tau_max = {tide['tau_storm_peak']:.3f}`); `Spearman(s2_amp, tau) = {tide['spearman_s2_tau']:.4f}` (`p = {tide['spearman_s2_tau_p']:.3e}`).",
        "",
        "| Horizon | Train / Test Sols | MAE Model | MAE Climatology | MAE Persistence | Spearman | 80% Cov (CQR / non-PEDE) |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for hkey, hlabel in [("1", "+1 sol"), ("2", "+2 sol"), ("3", "+3 sol")]:
        m = storm_horizons[hkey]
        lines.append(
            f"| {hlabel} | {m['n_train']} / {m['n_test']} | {m['mae_model']:.3f} | {m['mae_climatology']:.3f} | {m['mae_persistence']:.3f} | {m['spearman']:.3f} | {m['interval_80_coverage']:.3f} / {m['interval_80_coverage_non_pede']:.3f} |"
        )
    lines.extend(
        [
            "",
            "- **Baseline note:** Beats 10-deg `Ls` seasonal climatology at all three horizons (`h = 1, 2, 3`), while single-station surface meteorology does not beat persistence (`MAE 0.210–0.313`) when extrapolating above training-set regional opacity into MY 34 peak opacity (`tau = 8.59`). Displayed as a trend and early-warning indicator.",
            "- **Details & plots:** [docs/STORM_NOWCASTER_METRICS.md](docs/STORM_NOWCASTER_METRICS.md) · ![Storm Tides](docs/storm_tides.png)",
            "",
            f"### 3. Mineral Vein Detector (`{veins['model']}`)",
            "",
            f"- **Task & data:** Identifies bright mineral-vein candidate signatures and 256x256 patch heatmaps on real NASA Curiosity Mastcam/MAHLI frames (`n = {vv['n_images']}` audited images: {vv['n_positive']} positive, {vv['n_negative']} negative across {vv['n_sols']} sols) using `{vv['feature_backend']}` (`{vv['feature_dim']}`-d CLS + `32x32` patch tokens) + `{vv['classifier']}` (with Gabor/morphological fallback). Never run on synthetic 3D renders.",
            f"- **Validation ({vv['n_splits']}-fold `{vv['validation']}` + {vv['n_permutations']}-run permutation test):** ROC-AUC = **{vv['roc_auc']:.4f}**, PR-AUC = **{vv['pr_auc']:.4f}** (vs. `{vv['baseline_positive_rate']:.4f}` base rate), F1 = **{vv['f1']:.4f}** (Precision **{vv['precision']:.4f}**, Recall **{vv['recall']:.4f}**), permutation `p = {vv['permutation_p_value']:.4f}` (null AUC `{vv['null_auc_mean']:.4f} ± {vv['null_auc_std']:.4f}`).",
            "- **Details & plots:** [docs/VEIN_DETECTOR_METRICS.md](docs/VEIN_DETECTOR_METRICS.md) · ![Vein Detector Eval](docs/veins_eval.png)",
        ]
    )
    return "\n".join(lines)


BUILDERS = {
    "DATA": render_data_section,
    "PHYSICS": render_physics_section,
    "CONSTANTS": render_constants_section,
    "MODELS": render_models_section,
}


def update_readme(content: str) -> str:
    updated = content
    for name, fn in BUILDERS.items():
        begin_tag = f"<!-- BEGIN AUTO:{name} -->"
        end_tag = f"<!-- END AUTO:{name} -->"
        pattern = re.compile(
            re.escape(begin_tag) + r".*?" + re.escape(end_tag),
            re.DOTALL,
        )
        if not pattern.search(updated):
            raise RuntimeError(f"Missing marker pair {begin_tag} / {end_tag} in README.md")
        replacement = f"{begin_tag}\n{fn()}\n{end_tag}"
        updated = pattern.sub(lambda _: replacement, updated, count=1)
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate or verify auto-populated README.md sections.")
    parser.add_argument("--check", action="store_true", help="Fail with exit code 1 if README.md differs.")
    args = parser.parse_args()

    current = README_PATH.read_text(encoding="utf-8")
    desired = update_readme(current)

    if args.check:
        if current != desired:
            print("README.md auto-generated sections are out of sync. Run: python tools/generate_readme.py", file=sys.stderr)
            return 1
        print("README.md auto-generated sections are up to date.")
        return 0

    if current != desired:
        README_PATH.write_text(desired, encoding="utf-8", newline="\n")
        print("Updated README.md auto-generated sections.")
    else:
        print("README.md already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
