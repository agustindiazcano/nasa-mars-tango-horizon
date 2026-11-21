# Last context

**Date:** 2026-11-21 (Argentina)

## Work done

- Cloned `nasa-mars-tango-horizon` into the workspace, installed dependencies in `site/`, and started the `@th/site` Next.js dev server (`http://localhost:3001`).
- Updated the `site/` navbar (`SiteNavbar` and `.site-nav*` / `.site-lang-toggle` styles) to an iPhone-style Liquid Glass floating capsule: high-saturation backdrop blur (`blur(26px) saturate(190%) brightness(1.06)`), specular top-to-bottom highlight gradient, crisp translucent borders, inner top rim highlights, pill-shaped nav links/CTA/language toggle, and matching frosted glass mobile drawer.
- Verified `npx tsc --noEmit` in `site/` (exit 0) and `http://localhost:3001` (HTTP 200).

## Files touched

`site/src/app/globals.css`, `site/src/components/layout/SiteNavbar.tsx`.

## State

- Branch `feat/site-iphone-glass-navbar` committed and pushed with a PR to `main`.
- Local Next.js dev server for `site/` remains running on `http://localhost:3001`.
