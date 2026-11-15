# Continuation Plan: Voice LLM STT, Autonomous Robot Navigation & Remaining Remediation (`W1`–`W8`)

**Integration branch:** `feat/voice-llm-robots-and-remediation` (branched from `feat/backlog-b16-b21`, PR #18)  
**Frontend scope rule:** Another teammate owns `web/`. All frontend work in this plan targets `web/` (do not run `B22`, `B23`, or `F1`–`F15` migration into `web/`).  
**Model for subagents:** Gemini 4 Hydrogen High (`Model: "inherit"`).  
**Worktree pattern:** Isolated git worktrees under `.worktrees/w1-*` .. `.worktrees/w8-*` (`git worktree list`).

---

## Verified Empirical Facts (Audio STT & Robot Bug Diagnosis)

1. **Current STT (`web/src/voice/listen.ts`):** Uses browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`, `maxAlternatives = 1`, `"es-AR"` when lang is `"es"`). No cloud/LLM audio transcription runs today.
2. **Audio LLM probe results:**
   - `vertex` (`google/gemini-4-hydrogen`) and `gemini` (`gemini-4-hydrogen`) return HTTP `200` on OpenAI-compatible `/chat/completions` with `{ type: "input_audio", input_audio: { data: "<base64>", format: "wav" } }` (`max_tokens >= 600`, `reasoning_effort: "low"`).
   - `meta` (`muse-spark-1.3`) does not decode `input_audio` (`muse-voice-transcribe-1.0` returns `404`), so Meta Muse serves as the fast **text normalizer/repair backup** on raw Web Speech transcripts.
3. **Why `"rover one, go to my position"` / `"drone one go to my position"` did nothing:**
   - `VoiceController.offlineFallback` (`web/src/voice/voiceController.ts`) only matched `thermal`, `route`/`s2`, `fan`/`trend`, `emergency`, and `hands`/`manip`, dropping fleet navigation orders to default telemetry with `actions: []`.
   - `ESCALATE_FAST_RE` (`server/src/agents/hierarchy.ts`) missed common approach verbs (`come`, `ven`, `vení`, `acércate`, `position`, `posición`, `location`, `here`).
   - Ground rovers dispatched directly to an astronaut coordinate on `>20°` HiRISE slopes got hard-denied by `GUARDIAN` instead of resolving a slope-safe A* stand-off (`nearestSafePoint`).

---

## Parallel Workstream Specifications (`W1`–`W8`)

| Agent | Worktree Path | Branch | Primary Scope |
|---|---|---|---|
| **W1** | `.worktrees/w1-stt-audio-llm` | `feat/w1-stt-audio-llm` | Google Audio LLM STT + Meta Spark transcript normalizer + `B37` |
| **W2** | `.worktrees/w2-robot-nav-agents` | `feat/w2-robot-nav-agents` | Autonomous navigating robot agents (`ROBOT.<id>`) + `offlineFallback` |
| **W3** | `.worktrees/w3-b27-std3001-rag` | `feat/w3-b27-std3001-rag` | `B27`: Expand `server/corpus/chunks.json` with real `NASA-STD-3001` content |
| **W4** | `.worktrees/w4-b34-flat-site` | `feat/w4-b34-flat-site` | `B34`: Flat `<5°` base origin + single canonical `S1`–`S4` table in `@th/shared` |
| **W5** | `.worktrees/w5-b35-rasters-dan` | `feat/w5-b35-rasters-dan` | `B35`: Real PNG/WebP terrain layers, 377 DAN points, `hydration_index`, `N`/`S` HUD fix |
| **W6** | `.worktrees/w6-b36-provenance-ctx` | `feat/w6-b36-provenance-ctx` | `B36`: `provenance.json` keys, HUD provenance panel, ~590 m CTX/HiRISE offset |
| **W7** | `.worktrees/w7-b25-terrain-lod` | `feat/w7-b25-terrain-lod` | `B25` + `B32`/`B33`: Full `height_2048.u16` LOD sync, contact residuals, replay audit |
| **W8** | `.worktrees/w8-b24-tests-runner` | `feat/w8-b24-tests-runner` | `B24`: Native `web` Vitest runner + `GUARDIAN.judge`, routes & PNG tests |

### W1 — Voice-to-Text LLM (`feat/w1-stt-audio-llm`)
- **Files:** `web/src/voice/listen.ts`, `web/src/voice/voiceController.ts`, `web/src/api.ts`, `server/src/config.ts`, `server/src/llm/provider.ts`, `server/src/agents/stt.ts` (new), `server/src/agents/routes.ts`, `server/src/agents/hierarchy.ts`, `server/src/agents/__tests__/stt.test.ts`.
- **Tasks:**
  1. Record 16 kHz mono 16-bit PCM WAV alongside Web Speech interim preview during PTT (`listen.ts`), calling `onFinalAudio(wavBase64, fallbackText)` and falling back cleanly to text if mic audio recording fails.
  2. Add `server/src/agents/stt.ts`: `transcribeAudioWithLLM` via `vertex` (`google/gemini-4-hydrogen`) → `gemini` (`gemini-4-hydrogen`) `input_audio` with fleet/site glossary biasing; `normalizeVoiceTranscript` via `fast` tier (`vertex`/`gemini` → `meta` `muse-spark-1.3`) to repair noisy Web Speech text before `shouldEscalateFast`.
  3. Expose `POST /api/stt` and optional `audio_base64` / `audio_format` / `raw_text` on `POST /api/agent/voice`, returning `transcript`. Add `B37` timeout/failover bounds for `google/gemini-4-carbon`.
- **Verify:** `npx vitest run server/src/agents/__tests__/stt.test.ts` (with `AGENTS_OFFLINE=1`), `tsc -p server/tsconfig.json`, `npm -w web run build`.

### W2 — Autonomous Navigating Robot Agents & `offlineFallback` (`feat/w2-robot-nav-agents`)
- **Files:** `web/src/voice/voiceController.ts`, `web/src/world/fleetProc.ts`, `web/src/main.ts`, `server/src/agents/hierarchy.ts`, `server/src/agents/guardian.ts`, `server/src/agents/tools/mcp.ts`, `server/src/agents/tools/registry.ts`, `server/src/agents/offline.ts`, `server/src/agents/__tests__/robot_navigation.test.ts`.
- **Tasks:**
  1. Complete `VoiceController.offlineFallback` for all fleet units (`rover-1/2`, `drone-1/2`, `rescue-1`, `manip-1`) and multilingual navigation orders (`go to my position`, `come here`, `ven`, `follow`, `overwatch`, `takeoff`, `land`, `return`), emitting real `Action` + `TraceEvent[]` and respecting `AIRCRAFT_GROUNDING_TAU`.
  2. Add approach keywords to `ESCALATE_FAST_RE` (`hierarchy.ts`); make `ROBOT.<id>` / `dispatch` compute slope-safe A* stand-off (`nearestSafePoint` within 5–15 m of astronaut when needed) for ground rovers, while letting drones fly directly to `(astronaut.x, astronaut.z)` at `14 m` altitude unobstructed by ground slope.
  3. Update `FleetProc.dispatchTo` / `main.ts` so rovers follow terrain-safe A* paths with stand-off, drones fly/hover overhead smoothly, and dispatches log arrival alerts.
- **Verify:** `AGENTS_OFFLINE=1 npx vitest run server/src/agents/__tests__/robot_navigation.test.ts`, frontend fallback unit test, `npm run build`.

### W3 — `B27` Real `NASA-STD-3001` RAG Corpus (`feat/w3-b27-std3001-rag`)
- **Files:** `tools/nasa_std_3001_chunks.py` (new), `tools/build_corpus.py`, `server/corpus/chunks.json`, `server/src/agents/__tests__/knowledge.test.ts`.
- **Tasks:** Author comprehensive `NASA-STD-3001 Vol 1/2` and `OCHMO` chunks (CO2, PAO2/Armstrong, DCS prebreathe, heat strain PSI, ionizing/SEP radiation, 29.6 kPa ppO2 flammability, pyrotechnic prohibition, dust/particulate & contingency life support), integrate with existing `FDIR_SOP_CHUNKS` and `ENV_WEATHER_CHUNKS`, rebuild `chunks.json`, and test retrieval.
- **Verify:** `python tools/build_corpus.py` and `AGENTS_OFFLINE=1 npx vitest run server/src/agents/__tests__/knowledge.test.ts`.

### W4 — `B34` Flat `<5°` Base Site & Shared `S1`–`S4` Table (`feat/w4-b34-flat-site`)
- **Files:** `shared/src/physics/sites.ts` (new), `shared/src/physics/index.ts`, `shared/src/index.ts`, `web/src/world/{terrainProc,baseProc,fleetProc}.ts`, `web/src/voice/voiceController.ts`, `server/src/agents/offline.ts`, `server/src/agents/tools/terrainData.ts`, `shared/src/physics/__tests__/sites.test.ts`.
- **Tasks:** Select a real `<5°` flat HiRISE DEM area for base origin, derive one canonical `MISSION_SITES` (`S1`–`S4`) table from `hydration_sites.json` in `@th/shared`, and consume it uniformly across server and `web`.
- **Verify:** `npm -w shared run build`, `npx vitest run shared/src/physics/__tests__/sites.test.ts`, `npm -w server run test`.

### W5 — `B35` Real Rasters, 377 DAN Points & HUD Fixes (`feat/w5-b35-rasters-dan`)
- **Files:** `web/src/world/terrainProc.ts`, `web/src/hud/hud.ts`, `web/src/core/i18n.ts`, `web/src/main.ts`.
- **Tasks:** Load/render real `ortho_4096.webp`, `slope_1024.png`, `svf_1024.png`, `thermal_class.png`, `hydration_1024.png`, and `hydration_unc_1024.png`; plot all 377 DAN stations from `hydration_sites.json` on 3D terrain and 2D minimap; replace remaining `WEH` labels with `hydration_index`; fix Bradbury anchor in fallback meta; fix negative latitude printing `N` instead of `S`.
- **Verify:** `npm -w web run build` and hemisphere/DAN formatter tests.

### W6 — `B36` Provenance Completeness & CTX/HiRISE Vertical Offset (`feat/w6-b36-provenance-ctx`)
- **Files:** `web/public/data/provenance.json`, `web/public/data/hydration/hydration_meta.json`, `tools/` audit script, `web/src/hud/hud.ts`.
- **Tasks:** Quantify and document the ~590 m CTX MOLA-datum vs HiRISE DTM vertical offset in `hydration_meta.json` and `provenance.json`, add missing provenance keys (`hydration_*`, `veins/*`, `models/*.glb`), and render `provenance.json` dynamically in the `web` Provenance panel.
- **Verify:** Provenance schema test + `npm -w web run build`.

### W7 — `B25` / `B33` / `B32` Full `height_2048.u16` LOD & Replay Audit (`feat/w7-b25-terrain-lod`)
- **Files:** `web/src/world/terrainProc.ts`, `web/src/world/groundPlacement.ts`, `web/src/data/historicalArchive.ts`, `web/src/main.ts`.
- **Tasks:** Keep full `2048x2048` height sampling in `TerrainProc` to match `terrainData.ts` 1:1, upgrade mesh LOD beyond `256x256` without breaking 60 FPS or terrain load/retry lifecycle, verify `< 0.05 m` ground contact residuals, and audit REMS/RAD/ephem historical replay units/epochs.
- **Verify:** `AGENTS_OFFLINE=1 npx vitest run server/src/agents/__tests__/terrainLifecycle.test.ts` + new LOD/contact/historical tests + `npm -w web run build`.

### W8 — `B24` Native Frontend Test Runner & Server Coverage (`feat/w8-b24-tests-runner`)
- **Files:** `web/package.json`, `web/vitest.config.ts`, `web/src/**/__tests__/*.test.ts`, `server/src/agents/__tests__/{guardian_judge,routes_integration,terrain_png}.test.ts`.
- **Tasks:** Wire `npm -w web run test` (`localIntents`, `visionIntent`, `MissionStore`, `sessionStore`) and add server tests for `GUARDIAN.judge` (normal mission orders only), Fastify HTTP routes (`/api/health`, `/api/agent/voice`, `/api/agent/run`, `/api/tts`), and PNG decoders in `terrainData.ts`.
- **Verify:** `npm -w web run test` and `AGENTS_OFFLINE=1 npm -w server run test`.

---

## Coordinator Integration & Continuation Procedure (Next Session)

1. Check branch commits inside each worktree: `git -C .worktrees/<wN> log --oneline -n 5` and status `git -C .worktrees/<wN> status`.
2. Finish/validate any incomplete worktree (`tsc` + targeted `vitest`), or re-invoke subagent pointing to `.worktrees/<wN>`.
3. On `feat/voice-llm-robots-and-remediation`, cherry-pick branches cleanly in dependency order:
   `W3 (B27)` → `W4 (B34)` → `W6 (B36)` → `W5 (B35)` → `W7 (B25)` → `W1 (STT)` → `W2 (Robots)` → `W8 (Tests)`.
4. Remove `.worktrees/w1..w8`, run `npm run build`, `AGENTS_OFFLINE=1 npm test`, and `npm -w web run test`.
5. Update `PENDING.md`, `PENDING_FRONT.md`, and `LASTCONTEXT.md` (marking `B24`, `B25`, `B27`, `B32`–`B37` done/verified, and noting `web/` tasks `B22`/`B23`/`F1`–`F15` belong to external `web/` workflow).
6. Push branch, open PR to `main`, watch CI (`gh pr checks --watch`), then run final Step 19 (`B15`: README metrics tables, Cloud Run + Vercel deploy, `submission` tag).
