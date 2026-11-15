# Last context

**Date:** 2026-11-15

## F11 frontend implementation (isolated worktree)

- Branch `milagros/f11-vein-detector`, based on `82f5640`; the historical B22 working copy is untouched.
- Added a validated offline data reader, an independently styled Vein Detector HUD panel, and 19 keys in each of EN/ES/FR/DE/IT. Unknown waypoint IDs return no result; the panel never calls the backend's synthetic fallback.
- Reads the existing eight real photos and published image probabilities/sol-grouped metrics. These metrics were not recomputed; raw labels/model artifacts are unavailable locally. The recall (0.6585) requires the candidate/to-be-confirmed wording.
- Heatmap and normalized-peak rendering are implemented but disabled behind an explicit localization gate. Full-frame resize permits geometric alignment; it does not validate geological localization. Only eight pairs are available, fewer than the guide's ten. No spatial-validation evidence is fabricated and no pixel intensity is called calibrated probability.
- Added `tools/veins/review.html`: explicit local CSV/photo imports, identity required for accept/flip, keyboard controls, quoted CSV export, pending rows preserved, no network calls or source-file writes. The utility can be opened as a local HTML file. Required CSV columns: `name,sol,vein,reviewed_by`; optional columns are preserved.
- No models, data assets, agents, physics, voice contracts or automatic drill behavior changed. The guide's broader detect/recommend/GUARDIAN/drill acceptance remains outside this frontend patch.
- Local checks: shared build and frontend TypeScript pass; 23 new data/presentation/review tests pass. Browser checks and final publication are performed separately by the coordinating agent.

## Summary of work done

- Rescue scenario (180 s, deterministic, seekable) with crew SOTELO and YACONIS at base, SALERNO and DIAZ-CANO (injured) on expedition, ramp rescue into `rescue-1`, scene panel (`S0`–`S7`), scripted chat, 19 optimized GLBs (`tools/assets`), NASA-style map, shoulder patches, rocks/boulders, storm forecast chart, FFT visualizer, Casson panel, and Sky-Crane (`tangohorizon-api` Cloud Run rev `00045` + Vercel).
- Added the standalone Next.js App Router showcase & editorial site under `site/` (`@th/site`), deployed to Vercel at `https://tangohorizon-site.vercel.app`:
  - Replicated the dark cosmos WebGL (`GalaxyBackdrop`, `GlassSurface`, `ElectricBorder`, `FlexCarousel`, `ProfileCard`, rotating planet banners, Apollo 11 `LunarTubeAmpPlayer`) aesthetic cleanly in TypeScript + Next.js App Router.
  - Added full bilingual internationalization (`LanguageContext`: **English default** + **Spanish secondary**, synced with `EN / ES` navbar switcher pill across every route and data module).
  - Built Home (`/`) featuring the top engineering stack strip (`GitHub Actions CI/CD`, `Python 3`, `Cloud Run`, `Terraform IaC`, `Vertex AI`, `Meta Muse`, `Three.js`, `Next.js`, `Fastify + MCP`, `Vercel`), large official mission patch (`tango-horizon-mars-exploration-logo.jpeg`), title `Tango Horizon: AI Systems for EVA and Mars Exploration`, direct CTA to `https://tangohorizon.vercel.app`, `Tango Horizon Project` (`/proyecto`), `Slides` (`/slides`), & `Team` (`/equipo`) CTAs, `AI Usage` (`Software 3.0 · AFAW`) section from `README.md`, and bottom partner emblems (`NASA Space Apps`, `NASA`, `CONAE`, `Universidad de Palermo`, `IBM`).
  - Added `/proyecto`, `/slides` (interactive 10-slide presentation deck), `/sources` (NASA, USGS, ML & telemetry data sources landing), `/cronologia`, `/tesis-lunar`, `/tesis-marte`, `/marte`, `/compendio`, `/equipo`, footer with all 4 members, sponsors, CC BY 4.0 3D models notice, GitHub & Database links, simplified Mars planet circle `/favicon.svg`, `sitemap.ts`, `robots.ts`, `vercel.json` (`framework: "nextjs"`), and `@vercel/analytics` visitor counter (`<Analytics />`).
- Added `LICENSE-3D-ASSETS-CC-BY-4.0.md` covering all original Team Tango Horizon 3D models under Creative Commons Attribution 4.0 International (personal, educational, commercial, illustration use), plus root `.vercelignore` for clean `web/` deployments.
- Redesigned the `web/` 3D simulator boot intro & loading modal (`web/src/hud/loadingOverlay.ts`, `web/src/hud/loadingOverlay.css`, `web/src/main.ts`) with a textured rotating Mars sphere (`web/public/images/mars-texture.jpg.jpeg`), blur backdrop, falling-character/telemetry glitch animation, modern glassmorphism card, and spinning `tango-horizon-mars-exploration-logo.jpeg` emblem while preserving download cancel/retry flows.
- Generated rectangular black-background README banner `docs/tango-horizon-banner.png` (`1600x860`) pairing left hero text (`Tango Horizon: Mars Exploration`), right mission patch, and institutional partner marks below, and updated `AGENTS.md`, `README.md`, and `README_ES.md`.

## Decisions made

- Frontend ships through Vercel only (`tangohorizon.vercel.app` for `web/`, `tangohorizon-site.vercel.app` for `site/`); Cloud Run stays API-only.
- Kept `site/` outside root `npm` workspaces (`["shared", "server", "web"]`) and defaulted `site/` rendering and metadata to English (`en`) with client switching to Spanish (`es`) via `SiteNavbar`.
- All original 3D models created by Team Tango Horizon are released free-to-use under **Creative Commons Attribution 4.0 International (`CC BY 4.0`)** (`LICENSE-3D-ASSETS-CC-BY-4.0.md`).
- CI was not awaited for PR merges per project owner request; builds were verified before deployment.

## Where the work was left

- Both Vercel deployments live and verified (`https://tangohorizon.vercel.app` and `https://tangohorizon-site.vercel.app`); PR merged into `main`.
- Next tasks in `PENDING.md` (`B15`, `B24`) and `PENDING_FRONT.md` (`F7`, `F11`, `F13`) await user confirmation before starting.
