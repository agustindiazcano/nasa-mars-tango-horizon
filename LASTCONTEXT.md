# Last context

**Date:** 2026-11-14
**Agent:** Antigravity

## What was done

Fixed voice pipeline reliability issues 1–13 on branch `fix/voice-reliability` (rebased onto `origin/main` at `db2af81`, which includes PR #14–#16 NASA terrain/historical lifecycle remediation):

- **Provider budgets, timeouts, failover & diagnostics (`server/src/config.ts`, `.env.example`, `deploy.sh`, `server/src/llm/provider.ts`, `server/src/agents/routes.ts`):**
  - Measured all 3 providers (`vertex`, `gemini`, `meta`) across tiers first: root causes were `.env` capping `LLM_MAX_OUTPUT_TOKENS=400` (exhausted by Meta `reasoning_tokens`), `LLM_FAST_TIMEOUT_MS=4000` (4 s x 3 cutting off `muse-spark` at ~4.5 s and Vertex spikes), `LLM_DEFAULT_TIMEOUT_MS=12000` (hitting `APIConnectionTimeoutError` on Vertex `argon`/`carbon`), and mid-conversation `400` errors when failing over with Google `thought_signature` in `extra_content`.
  - Raised defaults and runtime floors (`maxTokens >= 1200`, default `1500`; `fastTimeoutMs >= 6000`, default `8000`; `defaultTimeoutMs >= 15000`, default `20000`; vision `maxTokens = 800`), added structured `llm_provider_error` / `llm_empty_completion` logging, and stripped Google `extra_content`/`extra_properties` when sanitizing messages for `meta`.
- **Agent guards, provider pinning, telemetry/action nudges & latency (`server/src/agents/runAgent.ts`, `server/src/agents/hierarchy.ts`):**
  - Pinned the winning provider once a multi-turn tool conversation starts (falling back to `meta` only if compatible) to prevent mid-turn `400` signature mismatches.
  - Added deterministic checks/nudges blocking unexecuted unit-action claims (e.g. `Rescue-1 ... ejecuto directamente`) and false missing-O2-telemetry replies during active leaks.
  - Made `SUIT.VOICE-EXEC` return empty text instead of `"No action taken."` so `hierarchy.ts` escalates to `BASE`; injected fleet/target/env snapshots into `BASE` input to avoid redundant `list_units` hops; skipped redundant `BASE` re-summarization on single-unit delegations.
- **Offline rule engine (`server/src/agents/offline.ts`):**
  - Added `unit_action` execution (`takeoff`, `land`, `photograph_area`, `follow_astronaut`, `return_to_base`, `survey_area`, etc.) guarded against emergency mis-triggers on `Rescue uno` orders and against stealing drone photo commands for `manip-1`.
  - Fixed `manipulator`/`manipulador`, plural `balizas`/`beacons`/`bengalas`/`flares`, spoken number coordinate parsing (`cien, menos doscientos`), localized HUD layer/panel names, native replies across `en`/`es`/`fr`/`de`/`it`, and preserved `hydration_index` / `uncertainty_index` dimensionless wording from `main`.
- **TTS warmup, client timeout/cache & WS relay (`server/src/tts.ts`, `web-test-3d/src/voice/speak.ts`, `server/src/relay.ts`):**
  - Added background Cloud TTS client warmup on startup, raised client `/api/tts` timeout from `2500` ms to `6000` ms with bounded `AudioBuffer` caching, and emitted `remote_joined` immediately when a replacement `screen` connects while remotes are in the room.
- **Frontend local intents, vision regex, mic errors & client leak guard (`web-test-3d/src/voice/localIntents.ts`, `visionIntent.ts`, `voiceController.ts`, `listen.ts`, `web-test-3d/src/core/i18n.ts`):**
  - Replaced ASCII `\b` with Unicode `(?<![\p{L}])...(?![\p{L}])/iu` boundaries and fixed all 18 failing `localIntents` cases (69/69 pass) and both failing `VISION_QUESTION_RE` cases (43/43 pass) while rejecting `"emergency exit route plan"`.
  - Removed `leakDiameterM = 0.0016` mutation from `runLocalIntent("emergency")`, removed `|| this.store.leakDiameterM > 0` from `offlineFallback` with an `emergencyResponseActive` check and `ask_human` confirmation instead of fabricated `allow` verdicts, and surfaced `listen.ts` unsupported/mic-denied errors via `onError` + localized `i18n` alerts.

## Files touched

- `server/src/config.ts`, `.env.example`, `deploy.sh`, `server/src/llm/provider.ts`, `server/src/agents/routes.ts`
- `server/src/agents/runAgent.ts`, `server/src/agents/hierarchy.ts`, `server/src/agents/offline.ts`
- `server/src/tts.ts`, `server/src/relay.ts`
- `web-test-3d/src/voice/localIntents.ts`, `web-test-3d/src/voice/visionIntent.ts`, `web-test-3d/src/voice/voiceController.ts`, `web-test-3d/src/voice/listen.ts`, `web-test-3d/src/voice/speak.ts`, `web-test-3d/src/core/i18n.ts`
- `server/src/agents/__tests__/{provider_failover,run_agent_guards,offline_engine,relay,voice_intents}.test.ts`
- `PENDING.md`, `LASTCONTEXT.md`

## Verification & Handoff

- **Post-rebase verification (`fix/voice-reliability` on top of `db2af81`):** verified unit tests (`shared` + `server`), `server` TypeScript, and `web-test-3d` build before force-pushing PR #17.
- **Prior 21-order live benchmark (`AGENTS_OFFLINE=0`, paced local server before rebase):** offline fallbacks `4/21 -> 0/21`, empty/truncated `"No action taken."` `6/21 -> 0/21`; fast path median `12,233 -> 3,845 ms` (max `7,468 ms`), `BASE` median `24,054 -> 12,429 ms` (max `37,121 ms`), delegated median `29,505 -> 16,310 ms`; 3/3 repeats consistent; first `/api/tts` `1,534 ms` (cached `16 ms`).
- **Inherited `main` context (`db2af81`, PR #16):** NASA terrain startup lifecycle, pinned LF metadata identity, and base/rover contact placement are in `main`; remaining remediation acceptance gates (`B27`, `B32`–`B36`, `F16`) and `B37` browser DOM runtime checks + `google/gemini-4-carbon` ~15 s tail timeouts remain open. Not deployed.
