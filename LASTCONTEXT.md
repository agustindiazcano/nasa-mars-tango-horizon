# Last context

**Date:** 2026-11-15

## Summary of work done

- Added the standalone Next.js App Router showcase & editorial site under `site/` (`@th/site`), deployed to Vercel at `https://tangohorizon-site.vercel.app`:
  - Replicated the dark cosmos WebGL (`GalaxyBackdrop`, `GlassSurface`, `ElectricBorder`, `FlexCarousel`, `ProfileCard`, rotating planet banners, Apollo 11 `LunarTubeAmpPlayer`) aesthetic cleanly in TypeScript + Next.js App Router.
  - Added full bilingual internationalization (`LanguageContext`: **English default** + **Spanish secondary**, synced with `EN / ES` navbar switcher pill across every route and data module).
  - Built Home (`/`) featuring the top engineering stack strip (`GitHub Actions CI/CD`, `Python 3`, `Cloud Run`, `Terraform IaC`, `Vertex AI`, `Meta Muse`, `Three.js`, `Next.js`, `Fastify + MCP`, `Vercel`), large official mission patch (`tango-horizon-mars-exploration-logo.jpeg`), title `Tango Horizon: AI Systems for EVA and Mars Exploration`, direct CTA to `https://tangohorizon.vercel.app`, `Tango Horizon Project` (`/proyecto`) & `Team` (`/equipo`) CTAs, `AI Usage` (`Software 3.0 · AFAW`) section from `README.md`, and bottom partner emblems (`NASA Space Apps`, `NASA`, `CONAE`, `Universidad de Palermo`, `IBM`).
  - Added `/proyecto` (`Tango Horizon Project` landing), `/slides` (interactive 10-slide presentation deck), `/sources` (NASA, USGS, ML & telemetry data sources landing), `/cronologia`, `/tesis-lunar`, `/tesis-marte`, `/marte`, `/compendio`, `/equipo` (`Team`), footer with all 4 members, sponsors, CC BY 4.0 3D models notice, GitHub & Database links, simplified Mars planet circle `/favicon.svg`, `sitemap.ts`, `robots.ts`, and `@vercel/analytics` visitor counter (`<Analytics />`).
- Added `LICENSE-3D-ASSETS-CC-BY-4.0.md` covering all original Team Tango Horizon 3D models under Creative Commons Attribution 4.0 International, plus root `.vercelignore` for clean `web/` deployments.
- Redesigned the `web/` 3D simulator boot intro & loading modal (`web/src/hud/loadingOverlay.ts`, `web/src/hud/loadingOverlay.css`, `web/src/main.ts`) with a textured rotating Mars sphere (`web/public/images/mars-texture.jpg.jpeg`), blur backdrop, falling-character/telemetry glitch animation, modern glassmorphism card, and spinning `tango-horizon-mars-exploration-logo.jpeg` emblem while preserving download cancel/retry flows, and redeployed `https://tangohorizon.vercel.app`.
- Generated rectangular black-background README banner `docs/tango-horizon-banner.png` (`1600x860`) pairing the mission patch and institutional partner marks, and updated `AGENTS.md`, `README.md`, and `README_ES.md`.

## Decisions made

- Kept `site/` outside root `npm` workspaces (`["shared", "server", "web"]`) and linked it to a separate Vercel project (`tangohorizon-site`) so `web/` (`tangohorizon.vercel.app`) stays independent.
- Defaulted `site/` rendering and metadata to English (`en`) with seamless client switching to Spanish (`es`) via `SiteNavbar`.

## Where the work was left

- `site/` deployed at `https://tangohorizon-site.vercel.app` and `web/` redeployed at `https://tangohorizon.vercel.app`; PR merged into `main`.
- Next tasks in `PENDING.md` (`B15`, `B24`) and `PENDING_FRONT.md` (`F7`, `F11`, `F13`) await user confirmation before starting.
