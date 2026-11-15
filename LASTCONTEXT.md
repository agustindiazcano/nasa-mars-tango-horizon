# Last context

**Date:** 2026-11-15

## Summary of work done

- Reviewed and squash-merged PR #28 (`2ff2db9`, by Milagros-Sotelo): NASA insignias on astronaut and vehicles (`nasaInsignia.ts`), FPS-independent limb relaxation, HUD i18n in EN/ES/FR/DE/IT (129 new keys, 366 per dictionary), narrow-screen fleet/map layout, and `/api/agent/vision` returning HTTP 503 instead of a fabricated description.
- Migrated the frontend (`B22`): `web/public/` moved into `web-test-3d/`, then `web-test-3d/` renamed to `web/` (workspace `@th/web`). Branch `chore/migrate-web-test-3d-to-web`, three commits: workspace move + references, docs rename, status files.

## Files touched

- Root `package.json` (workspace `web`, `dev:test3d` renamed to `dev:web`), `package-lock.json` (stale `web-test-3d` entry removed), `Dockerfile`, `vercel.json` (`web/dist`), `web/package.json`, `web/vite.config.ts` (`publicDir: ./public`).
- Server tests that import frontend modules now point to `../../../../web/src/...`.
- `AGENTS.md`, `README.md`, `README_ES.md` and `docs/` use `web/`. `docs/WEB_TEST_3D_PLAN.md` keeps the old name with a "historical" status note.

## Decisions made

- Removed the canned `rover-2` sign/injection demo (PR #28): it was a test fixture, not restored.
- Moved `web/public` into `web-test-3d` and renamed the folder, instead of copying code into `web/`: git records renames and no code needs reconciling.

## Where the work was left

- Verified locally: `tsc --noEmit` in `web` and `server`, `web` build, 36 server tests that import frontend code, `web` tests (152 pass, 1 fail).
- `web` test `localIntents.test.ts:6` fails (expects 6 categories, implementation has 9). Existed before this migration; tracked in `B23`.
- Branch is not pushed and no PR is open yet. Full CI (`test-shared`, `test-server`, `build`) has not run on it.
- Local servers on `:5174` and `:8080` were stopped for the move; restart with `npm run dev:web`.
