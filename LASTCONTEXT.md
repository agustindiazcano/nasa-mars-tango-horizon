# Last context

**Date:** 2026-11-15

## Summary of work done

- Updated `README.md` and `README_ES.md` (PR #38):
  - Added a 2-paragraph executive summary at the top of both files covering the 3D simulator, Gale Crater NASA/USGS datasets, deterministic physics, hierarchical Multi-Agent AI (`SUIT.VOICE-EXEC`, `BASE`, 5 domain specialists, `ROBOT.<id>`), 3-provider failover (`Vertex AI` Gemini 4 Carbon/Argon/Hydrogen, `Google AI Studio`, `Meta Muse`), local Mars base compute architecture, 5-language voice (`EN`/`ES`/`FR`/`DE`/`IT`) with Google Cloud Neural TTS `Journey` voices, `<2 ms` BM25 predictive RAG (health, FDIR maintenance, weather/radiation), 3 custom ML models (`Hydration Prospector`, `Storm Nowcaster`, `Mineral Vein Detector`), 4-DOF IK simulated robotics, 8.0 kg RK4 ballistic life-support drop-pod, 4-astronaut rescue scenario, and `GUARDIAN` 3-model voting.
  - Added an updated `## Index` / `## Índice` and wrapped the detailed technical sections in a collapsible `<details>` toggle block right below the Team section.
  - Documented the proprietary [**AFAW (Anti-Fragile Agentic Workflow)**](https://github.com/agustindiazcano/afaw-anti-fragile-agentic-workflow) multi-agent coordination methodology in `## AI Usage` / `## Uso de IA`.
  - Synced `README.md` auto-generated `AUTO:DATA` block (`54 entries` in `provenance.json`) with `python tools/generate_readme.py --check`.
- Added presentation and pitch materials in `docs/slides/`:
  - `docs/slides/PROJECT_OVERVIEW.md` (complete plain-language technical overview in EN and ES).
  - `docs/slides/PRESENTATION_SCRIPT_3MIN.md` (3-minute presentation and live rescue script in ES and EN).
  - `docs/slides/PRESENTATION_SCRIPT_30S.md` (30-second video script in ES and EN).
  - `docs/slides/SLIDES.md` (10-slide presentation deck structure).

## Decisions made

- Frontend ships through Vercel only; Cloud Run stays API-only.
- Presentation scripts, slide deck structure, and plain-language overview live under `docs/slides/` (`PROJECT_OVERVIEW.md`, `PRESENTATION_SCRIPT_3MIN.md`, `PRESENTATION_SCRIPT_30S.md`, `SLIDES.md`) and are linked from `README.md` and `README_ES.md`.

## Where the work was left

- PR #38 merged into `main` and local `main` updated.
- Next tasks in `PENDING.md` (`B15`, `B24`) and `PENDING_FRONT.md` (`F7`, `F11`, `F13`) await user confirmation before starting.
