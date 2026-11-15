# Last context

**Date:** 2026-11-15

## Summary of work done

- Squash-merged PR #28 (`2ff2db9`, NASA insignias, FPS-independent limb relaxation, HUD i18n in 5 languages, vision 503 instead of fabricated text).
- Migrated the frontend `web-test-3d/` to `web/` (`B22`, PR #29, merged): workspace `@th/web`, `dev:test3d` renamed to `dev:web`, Dockerfile, `vercel.json`, lockfile and docs updated.
- Deployed: Cloud Run `tangohorizon-api` revision `00027` (`deploy.sh`, health OK, `ALLOWED_ORIGINS` includes `tangohorizon.vercel.app`) and Vercel production from `main` (new `nasa-insignia.png` served).
- Reconciled `F1`–`F15` against `web/src` in `PENDING_FRONT.md` (9 done, 6 partial) and fixed `localIntents.test.ts` (9 categories). Branch `chore/reconcile-pending-front`.

## Decisions made

- The `rover-2` sign/injection canned demo removed by PR #28 stays removed (it was a test fixture).
- Vercel serves the frontend and Cloud Run serves the API only: CDN for the large 3D assets, and Cloud Run needs one fixed instance for WebSocket rooms. The Dockerfile builds no frontend; the `web/dist` mirror in `server/src/index.ts` stays inactive. Written into `AGENTS.md`.
- Reconciliation is based on code presence in `web/src`, not on visual checks (those stay under `B37`).
- CI was not awaited for PR #29 at the user's request; it passed afterwards.

## Where the work was left

- `chore/reconcile-pending-front` has the test fix plus the status-file commits; not pushed, no PR yet.
- The `submission` tag is not created: it needs an end-to-end check of the deployed app first.
