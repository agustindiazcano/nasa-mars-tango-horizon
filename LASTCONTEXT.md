# Last context

**Date:** 2026-11-15

## Summary of work done

- **`B23` (`@th/shared` client consolidation):** Moved `stepSuitTelemetry` (`SimSuitTelemetry`), client HUD/mission types (`LayerId`, `PanelId`, `AlertLevel`, `ArmSkillId`, `EnvState`, `UnitSnapshot`, `HudAlert`, `SampleRecord`, `RouteDisplay`, `PodTelemetry`), `RouteGrid`, `mulberry32` / `DEFAULT_POD` / `DEFAULT_CHUTE`, `AIRCRAFT_GROUNDING_TAU`, and all client UI i18n keys (`EN`/`ES`/`FR`/`DE`/`IT`) into `shared/`; migrated all importing files in `web-test-3d/src/` and `server/src/agents/__tests__/{history,stt}.test.ts` to `@th/shared`; deleted duplicated `web-test-3d/src/core/{physics,types,i18n}.ts`; added unit tests for `stepSuitTelemetry` and `mulberry32` in `shared/src/physics/__tests__/physics.test.ts`.
- **`README.md` finalization & auto-generator:** Added [`tools/generate_readme.py`](tools/generate_readme.py) (`--check` mode supported) and populated `README.md` sections cleanly from `web/public/data/provenance.json`, `shared/src/physics/constants.ts` (44 constants with `[design assumption]` flags), `shared/src/physics/*.ts`, `hydration_meta.json`, `storm_forecast.json`, and `veins/manifest.json`, alongside a Mermaid multi-agent + `GUARDIAN` diagram, limitations, and local run commands (without project status/roadmap text).
- **`B37` (Voice unit tests + live Vertex AI / Cloud TTS + Chrome DevTools verification):**
  - Added `web-test-3d/src/voice/__tests__/listenSpeak.test.ts` (5 tests covering 16 kHz WAV encoding, `NotAllowedError`/`NotFoundError`/`unsupported` mic-denial paths, `/api/tts` in-memory `bufferCache` reuse, and 6 s `AbortSignal.timeout` fallback to `speechSynthesis`).
  - Verified online `@th/server` (`AGENTS_OFFLINE=0`) live against Vertex AI & Cloud TTS: `GET /api/health` (`200`), `POST /api/stt` WAV audio (`200`, `source: "llm_audio"`), `POST /api/agent/voice` suit status (`200`, `SUIT.VOICE-EXEC`), fleet dispatch (`200`, `BASE` -> `ESC-VOTE` -> `GUARDIAN`), direct WAV audio command (`200`, `set_layer("hydration")`), `terrain_mismatch` guard (`409`), and `POST /api/tts` cold (`663 ms`) vs. warm cache (`14 ms`).
  - Verified live `web-test-3d` in Chrome via DevTools MCP (`1920x889` WebGL canvas, `@th/shared` runtime chunks and HiRISE terrain assets loading with `200`, layer/language/provenance HUD interactions, and end-to-end voice command -> live Vertex `set_layer("radiation")` update in `~3000 ms`).

## Decisions made

- Typed `MissionContext.lang` in `shared/src/types/mission.ts` as `Lang | (string & {})` so browser `MissionStore.toContext()` can keep sending BCP-47 locales (e.g. `"es-AR"`) while `server/` normalizes them cleanly.
- Left `web/` untouched per teammate ownership and executed work in an isolated worktree without disturbing uncommitted root working tree changes.

## Where the work was left

- All changes are committed atomically on branch `feat/readme-b23-b37` with a Pull Request open to `main` and full build + unit test suites verified.
