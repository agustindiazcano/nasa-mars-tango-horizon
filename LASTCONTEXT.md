# Last context

**Date:** 2026-11-15

## Summary of work done

- Branch `docs/readme-comprehensive-overview`:
  - Updated `README.md` and `README_ES.md` with a two-paragraph executive summary at the top covering the 3D simulator, deterministic physics, hands-free 5-language voice, multi-agent hierarchy, 3-provider LLM failover (`gemini-4-carbon`, `gemini-4-argon`, `gemini-4-hydrogen`, `muse-wonder-1.0`, `muse-spark-1.3`, `offline.ts`), local base compute design for Mars operations, Google Cloud Neural TTS (`Journey` voices) + Quindar/FFT radio DSP, `<2 ms` in-memory BM25 RAG (predictive biomedical, FDIR maintenance, and weather/radiation), simulated robotics (4-DOF IK arm, Sky-Crane tether, A* routing), 8.0 kg RK4 ballistic life-support drop-pod, 4-astronaut cooperative rescue scenario, 3 custom-trained ML models (`Hydration Prospector`, `Storm Nowcaster`, `Mineral Vein Detector`), real vs. simulated vs. engineering design assumption tables, and NASA/USGS dataset roles.
  - Added a collapsible `<details>` toggle right below the Team section and updated the project index (`## Index` / `## Índice`).
  - Synced `AUTO:DATA` in `README.md` (`53 entries` from `web/public/data/provenance.json`) via `python tools/generate_readme.py --check`.

## Decisions made

- Frontend ships through Vercel only; Cloud Run stays API-only.
- Keep `README.md` and `README_ES.md` structured with a concise two-paragraph summary, updated index, and team roster visible at the top, followed by a collapsible toggle containing the full technical documentation.

## Where the work was left

- PR for `docs/readme-comprehensive-overview` opened against `main`.
- Next pending tasks in `PENDING.md` (`B15`, `B24`) and `PENDING_FRONT.md` (`F7`, `F11`, `F13`).
