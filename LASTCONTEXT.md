# Last context

**Date:** 2026-11-15

## Summary of work done

On branch `feat/voice-vision-hud-shaders`, implemented `B38`–`B40` and `F17`–`F20` across 4 atomic commits (`03637fd`, `04a130f`, `a6507d1`, `b969434`):

- **`B38` — Smart conversational `SUIT.VOICE-EXEC` (`03637fd`):**
  - Expanded `SUIT.VOICE-EXEC` (`fast` Flash tier in [`server/src/agents/hierarchy.ts`](server/src/agents/hierarchy.ts)) with read-only telemetry, fleet, localization, terrain, weather, biomedical, and ballistic calculation tools (`list_units`, `get_localization_and_lidar`, `get_terrain_at`, `get_environment`, `get_storm_forecast`, `evaluate_eva_weather`, `evaluate_environmental_risk`, `calculate_pod_launch`, `evaluate_crew_biomed`).
  - Updated `SUIT.VOICE-EXEC` prompt, `shouldForceVoiceEscalation`, and [`server/src/agents/offline.ts`](server/src/agents/offline.ts) so queries about vehicle counts/positions, ambient weather, and ballistic pod calculations are answered conversationally in the crew's language without dispatching physical actions unless explicitly confirmed, escalating (`ESCALATE`) only for physical execution, navigation, FDIR, science, or emergencies while keeping `run_agent_guards.test.ts` and `envNowcast.test.ts` green.
- **`B39` + `F17` — Onboard vision on astronaut helmet visor and all fleet units (`04a130f`):**
  - Updated `/api/agent/vision` ([`server/src/agents/routes.ts`](server/src/agents/routes.ts)) to accept `unit_id === "astronaut"` (helmet visor POV) plus all fleet units (`rover-1..3`, `rescue-1`, `drone-1..2`), registered `capture_vision` in [`server/src/agents/tools/registry.ts`](server/src/agents/tools/registry.ts) and [`server/src/agents/guardian.ts`](server/src/agents/guardian.ts), and preserved the `[INJECTION]` guard.
  - Mounted `mastCamera` directly on the root `Group` (`g`) of all 6 fleet units in [`web-test-3d/src/world/fleetProc.ts`](web-test-3d/src/world/fleetProc.ts) (so cameras survive GLB swaps), added `helmetCamera` + `captureHelmetCamera` in [`web-test-3d/src/world/astronautProc.ts`](web-test-3d/src/world/astronautProc.ts), updated `parseVisionIntent` ([`web-test-3d/src/voice/visionIntent.ts`](web-test-3d/src/voice/visionIntent.ts)) to route first-person queries (`"¿podés ver lo que estoy viendo? qué es"`) to `"astronaut"` while keeping `"the camera is dusty"` false, and added a camera selector in [`web-test-3d/src/hud/hud.ts`](web-test-3d/src/hud/hud.ts).
- **`B40` + `F18` + `F19` — Central Quick Menu, VR HUD toggle, and voice language selection/auto-sync (`a6507d1`):**
  - Added `panel === "menu"` with large `data-pointable` cards in [`web-test-3d/src/hud/hud.ts`](web-test-3d/src/hud/hud.ts) & [`web-test-3d/src/hud/hud.css`](web-test-3d/src/hud/hud.css), local/agent voice commands (`"open menu"` / `"abrir menu"` / `"close menu"` / `"cerrar"` / `"cierra el menu"`), and `hudVisible` toggle leaving a `#hud-restore-pill` indicator.
  - Added `set_lang`, `set_hud_visible`, and `open_panel("menu")` in [`shared/src/types/mission.ts`](shared/src/types/mission.ts), [`server/src/agents/tools/registry.ts`](server/src/agents/tools/registry.ts), [`server/src/agents/hierarchy.ts`](server/src/agents/hierarchy.ts), [`server/src/agents/stt.ts`](server/src/agents/stt.ts), and [`server/src/agents/offline.ts`](server/src/agents/offline.ts), plus direct (`"change language to spanish"`), 2-step interactive (`"quiero cambiar de idioma"` -> asks language -> switches on next turn), and automatic spoken/typed language switching synced with `setLang`, `ASR_LOCALE`, and `/api/tts` in [`web-test-3d/src/voice/voiceController.ts`](web-test-3d/src/voice/voiceController.ts).
- **`F20` — Martian terrain ferric-oxide color grading, sand-ripple POM, and bloom/rim glow (`b969434`):**
  - Preserved real NASA/USGS Gale Crater HiRISE DEM (`height_2048.u16`) and optical orthoimage (`ortho_4096.webp`) in [`web-test-3d/src/world/terrainProc.ts`](web-test-3d/src/world/terrainProc.ts) while adding a `256x256` procedural eolian sand-ripple normal+height `DataTexture` (`buildRippleDetailMap`) and `attachMartianPomShader` (`onBeforeCompile` with 8-step + secant Steep Parallax / POM, ferric-oxide reddish-ochre regolith + dark basaltic slope color grading gated by `uIsOptical` so scientific overlays stay untouched, detail normal perturbation, and grazing atmospheric rim glow).
  - Added horizon limb dust-scattering rim glow in [`web-test-3d/src/world/skyDust.ts`](web-test-3d/src/world/skyDust.ts) and wired `EffectComposer` + `RenderPass` + `UnrealBloomPass` + `OutputPass` in [`web-test-3d/src/main.ts`](web-test-3d/src/main.ts).

## Decisions made

- Used negative lookahead `lanz(?:ar|[aáe](?!miento)[\p{L}]*)` in `PHYSICAL_OR_SPECIALIST_ORDER_RE` so the Spanish noun `"lanzamiento"` in `"Calculá el lanzamiento de la cápsula de soporte vital"` stays in `SUIT.VOICE-EXEC` (`calculate_pod_launch`) while imperative verbs (`"lanzá"`, `"lanza"`, `"lanzar"`) escalate to `BASE`.
- Gated the Martian ferric-oxide color grading and POM shader in `terrainProc.ts` with `uIsOptical` (`1.0` on `"optical"`, `0.0` on `slope`, `thermal`, `radiation`, `hydration`, `hydration_unc`) so analytical data overlays retain their exact color encodings.

## Where the work was left

- Tasks `B38`–`B40` and `F17`–`F20` are merged in `main` (PR #23, `f6c8447`) and deployed to Cloud Run (`tangohorizon-api`).
- Keyless GitHub Actions Continuous Deployment to Cloud Run via Workload Identity Federation (`github-actions-pool` / `github-provider` + `tango-horizon-cd@nasa-tango-horizon.iam.gserviceaccount.com`) is provisioned in [`infra/terraform/main.tf`](infra/terraform/main.tf) and wired in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on push to `main`.
- `B22` (`web-test-3d/` → `web/` consolidation) is on hold while a teammate finishes styling changes.
