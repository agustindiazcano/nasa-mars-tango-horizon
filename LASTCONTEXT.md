# Last context

**Date:** 2026-11-15

## Summary of work done

Started branch `feat/smart-flash-voice-vision` (branched from `feat/nasa-glb-models`) and shipped three atomic commits:

- **Manipulator unit rename (`16714bf`):** Renamed the live manipulator rover from `manip-1` to `rover-3` (`kind: "manipulator"`) in `shared/src/physics/sites.ts`, `shared/src/physics/fdir.ts`, `web-test-3d/src/world/fleetProc.ts`, `web-test-3d/src/main.ts`, `web-test-3d/src/hud/hud.ts`, `web-test-3d/src/core/i18n.ts`, `web-test-3d/src/voice/voiceController.ts`, `server/src/agents/tools/registry.ts`, `server/src/agents/guardian.ts`, `server/src/agents/hierarchy.ts`, and `server/src/agents/offline.ts`, while keeping dynamic `kind === "manipulator"` / `"manip-1"` alias compatibility for existing backend/frontend tests and `"masip 1"` ASR slips.
- **STT Fast-tier token & glossary fix (`b017a33`):** Raised `normalizeVoiceTranscript` and audio STT `maxTokens` from `256`/`600` to `700` in `server/src/agents/stt.ts` (preventing reasoning models on Vertex/Gemini/Meta from exhausting tokens and returning empty completions during voice normalization) and expanded `CLEAN_DOMAIN_RE` / `ASR_NOISE_RE` for Spanish life-support, calculation, fleet, vision, and confirmation phrases (`stt.test.ts` 9/9 passing).
- **Life-support pod calculation & voice/HUD confirmation (`7a122ff`):**
  - Added read tool `calculate_pod_launch` in `server/src/agents/tools/registry.ts` using `@th/shared` `aimDelivery` RK4 ballistics, shifting `<15 m` crew requests outward to a slope-safe `~22 m` landing point and returning flight time, muzzle velocity, impact coords/speed, and confirmation state.
  - Updated `JUDGE_SYSTEM` in `server/src/agents/guardian.ts` (`ask_human` on nominal `launch_pod`), `server/src/agents/hierarchy.ts` (`AGENTS.BASE`), and `server/src/agents/offline.ts` + `web-test-3d/src/voice/voiceController.ts`.
  - Raised `VOTER_PANEL` token budgets (`650/600/650`) in `server/src/agents/voting.ts` and updated `server/src/agents/__tests__/voting.test.ts`.
  - Added a persistent floating `#hud-confirm` confirmation banner in `web-test-3d/src/hud/hud.ts` + `web-test-3d/src/hud/hud.css` (without requiring opening Agents modal) and instant voice confirm/cancel handling in `web-test-3d/src/voice/voiceController.ts`.
- **Verification before commit:** Ran `shared` (`68/68`), targeted `server` tests with `AGENTS_OFFLINE=1`, `web-test-3d` (`148/148`), and `tsc --noEmit` on both `server` and `web-test-3d` (all exited 0).

## Decisions made

- Resolved manipulator IDs dynamically via `kind === "manipulator"` with `"rover-3"` primary and `"manip-1"` fallback so existing mock tests keep passing without rewriting historical test fixtures.
- Kept `launch_pod` confirmation behavior in `JUDGE_SYSTEM`, `offline.ts`, `calculate_pod_launch`, and `offlineFallback` rather than hardcoding `ask_human` in `ruleCheck()` so existing `guardian_judge.test.ts` judge-mocked contracts stay intact.

## Where the work was left

- Branch `feat/smart-flash-voice-vision` is committed, pushed, and opened as a PR to `main`; remaining planned work is prioritized in `PENDING.md` (`B38`–`B40`) and `PENDING_FRONT.md` (`F17`–`F20`).
