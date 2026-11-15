# Last context

**Date:** 2026-11-15

## Summary of work done

On branch `feat/smart-flash-voice-vision` (PR #22), shipped manipulator rename (`rover-3`), STT fast-tier normalization fix, and ballistic `calculate_pod_launch` + confirmation flow (`16714bf`, `b017a33`, `7a122ff`, `4e03f9f`), then merged `origin/main` (PR #21: `B23` `@th/shared` client consolidation, `README.md` auto-generator, `B37` voice/Chrome verification):

- **Manipulator unit rename (`16714bf`):** Renamed the live manipulator rover from `manip-1` to `rover-3` (`kind: "manipulator"`) in `shared/src/physics/sites.ts`, `shared/src/physics/fdir.ts`, `web-test-3d/src/world/fleetProc.ts`, `web-test-3d/src/main.ts`, `web-test-3d/src/hud/hud.ts`, `web-test-3d/src/voice/voiceController.ts`, `server/src/agents/tools/registry.ts`, `server/src/agents/guardian.ts`, `server/src/agents/hierarchy.ts`, and `server/src/agents/offline.ts` (and migrated `"ROVER-3"` / `hud.pov_iso` / `hud.btn_iso` / `hud.iso_hint` i18n keys into `shared/src/i18n/`), keeping dynamic `kind === "manipulator"` / `"manip-1"` alias compatibility and `"masip 1"` ASR slip handling.
- **STT Fast-tier token & glossary fix (`b017a33`):** Raised `normalizeVoiceTranscript` and audio STT `maxTokens` from `256`/`600` to `700` in `server/src/agents/stt.ts` and expanded `CLEAN_DOMAIN_RE` / `ASR_NOISE_RE` for Spanish life-support, calculation, fleet, vision, and confirmation phrases.
- **Life-support pod calculation & voice/HUD confirmation (`7a122ff`):** Added read tool `calculate_pod_launch` (`@th/shared` `aimDelivery`), updated `JUDGE_SYSTEM` (`ask_human` on nominal `launch_pod`), raised `VOTER_PANEL` token budgets in `server/src/agents/voting.ts`, and added floating `#hud-confirm` banner + instant voice confirm/cancel handling.
- **Merged `origin/main` (PR #21):** Integrated `B23` (`shared/` consolidation of `stepSuitTelemetry`, client types, and i18n dictionaries, removing `web-test-3d/src/core/{physics,types,i18n}.ts`), [`tools/generate_readme.py`](tools/generate_readme.py) + finalized `README.md`, and `B37` (`listenSpeak.test.ts`).

## Decisions made

- Resolved manipulator IDs dynamically via `kind === "manipulator"` with `"rover-3"` primary and `"manip-1"` fallback so existing mock tests keep passing without rewriting historical test fixtures.
- Kept `launch_pod` confirmation behavior in `JUDGE_SYSTEM`, `offline.ts`, `calculate_pod_launch`, and `offlineFallback` rather than hardcoding `ask_human` in `ruleCheck()` so existing `guardian_judge.test.ts` judge-mocked contracts stay intact.
- Ported PR #22's new i18n keys (`hud.pov_iso`, `hud.btn_iso`, `hud.iso_hint`, `ROVER-3` `manip.title`) directly into `shared/src/i18n/` when resolving the `web-test-3d/src/core/i18n.ts` deletion conflict with `origin/main`.

## Where the work was left

- Branch `feat/smart-flash-voice-vision` (PR #22) is merged cleanly with `origin/main`; remaining planned work is tracked in `PENDING.md` (`B38`–`B40`) and `PENDING_FRONT.md` (`F17`–`F20`).
