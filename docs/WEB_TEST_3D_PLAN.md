# Plan: `web-test-3d/` — Standalone Procedural 3D Harness for Backend, Voice, Agents & Phone Pointer

> **Goal:** A self-contained Vite + Three.js procedural 3D harness in `web-test-3d/` (zero collision with `web/`) that connects directly to `@th/shared` and `server/` (`/api/agent/voice`, `/api/agent/run`, `/api/agent/vision`, `/api/tts`, `/ws/remote`) so all backend systems, voice commands, multi-agent hierarchy, `GUARDIAN` safety checks, procedural astronauts/robots, EVA rescue scenarios, and the mobile phone pointer/PTT can be tested end-to-end immediately.

---

## 1. Architecture & Isolation

- **Workspace directory:** `web-test-3d/` (registered as an optional workspace in root `package.json`, running on Vite port `:5174` with proxy to `http://localhost:8080` for `/api` and `ws://localhost:8080` for `/ws`).
- **Zero conflict with `web/`:** Does not create or modify any file inside `web/src/` or `web/index.html`. Reads static NASA datasets from `../web/public/data/` if available, and falls back to procedural Gale Crater terrain if not yet present.
- **Full Backend & Shared Integration:**
  - Uses `@th/shared` physics (`metabolicRateW`, `leakTimeline`, `dPdt`, `simulateDelivery`, `landingEllipse`, `planRoute`, `decide`, `suitState`) and i18n (`t`, `setLang`, `LANGS`).
  - Sends live `MissionContext` snapshots to `POST /api/agent/voice`, `POST /api/agent/run`, and `POST /api/agent/vision` (rendering a 512×384 frame from `rover-2` or `manip-1`'s procedural mast camera).
  - Applies returned `Action[]` (`set_layer`, `open_panel`, `show_route`, `show_alert`, `dispatch`, `launch_pod`, `arm_skill`) in real time inside the 3D scene and HUD.

---

## 2. File Structure (`web-test-3d/`)

```text
web-test-3d/
├─ package.json                # @th/web-test-3d (three, qrcode, @th/shared, vite)
├─ tsconfig.json
├─ vite.config.ts              # Port 5174, proxies /api and /ws -> :8080, inputs: index.html + remote.html
├─ index.html                  # Main 3D helmet + orbital test console
├─ remote.html                 # Mobile phone gyroscope pointer + PTT + trackpad page
└─ src/
   ├─ main.ts                  # Entry point, simulation loop (10 Hz physics + 60 FPS WebGL2)
   ├─ state.ts                 # Live MissionContext store + Action dispatcher
   ├─ world/
   │  ├─ terrainProc.ts        # Procedural Gale Crater / Boxwork ridge heightmap (or loads height_2048.u16) + 5 spectral overlays (optical, slope, thermal, radiation, hydration)
   │  ├─ skyDust.ts            # Butterscotch Martian sky dome + GPU dust storm particles driven by uTau
   │  ├─ astronautProc.ts      # Procedural articulated astronaut (helmet visor, PLSS backpack, walking limb swing, breathing bob, 1st/3rd person camera toggle)
   │  ├─ fleetProc.ts          # Procedural articulated fleet:
   │  │                        #   - rover-1 (6x6 crew rover with rotating wheels)
   │  │                        #   - rover-2 (science rover with mast cam for /api/agent/vision)
   │  │                        #   - rescue-1 (high-speed rescue rover)
   │  │                        #   - drone-1 / drone-2 (coaxial hexacopter rotors + green LiDAR cone)
   │  │                        #   - manip-1 ("HANDS" 4-joint analytic IK arm + gripper/drill/scoop/camera)
   │  ├─ baseProc.ts           # Procedural Mars base modules (habitat, airlock, solar array, nuclear fission with keep-out ring, 2 ballistic pod launch towers)
   │  └─ podBallistics.ts      # 3D trajectory arc, parachute deployment animation, and 1σ/2σ landing ellipse
   ├─ voice/
   │  ├─ listen.ts             # Web Speech API (PTT Spacebar / Phone button + continuous "Base..." wake word)
   │  ├─ localIntents.ts       # <5 ms local critical commands (emergency, abort EVA, stop all, open map, repeat)
   │  ├─ speak.ts              # Web Audio neural TTS (/api/tts) + Quindar tones (2525/2475 Hz) + browser fallback
   │  └─ voiceController.ts    # Connects speech -> local intents or /api/agent/voice -> Action execution
   ├─ remote/
   │  ├─ screenRelay.ts        # Desktop WebSocket screen client + QR code modal + raycast 3D/HUD cursor
   │  └─ phoneClient.ts        # Mobile client (DeviceOrientation quaternion pointer, trackpad fallback, PTT button, haptics)
   └─ hud/
      ├─ hud.ts                # Tactical HUD overlay: Suit telemetry, Leak countdown, Environment & Storm forecast, Fleet status, Agent Trace & GUARDIAN verdicts tree, Rover Cam preview, Provenance
      └─ demoDeck.ts           # 1-Click Tactical Deck (keys 1-0: Pre-EVA check, Route plan, Rover vision, Fan trend, Dust storm, Solar SPE, Suit leak + Pod/Rover rescue, Prompt injection sign test)
```

---

## 3. Capabilities Enabled Immediately by `web-test-3d/`

| Capability | How it works in `web-test-3d/` |
|---|---|
| **Hands-Free Voice Commands (ES/EN)** | Hold `Space` (or phone PTT button) or enable wake word (`"Base..."`). Critical commands (`"Emergencia"`, `"Stop all"`) trigger in `<5 ms`. Complex commands go to `SUIT.VOICE-EXEC` → `BASE` → MCP tools → `GUARDIAN` → spoken reply via `/api/tts` with Quindar tones. |
| **Procedural Astronaut & EVA Exploration** | Walk across Gale Crater ridges (`WASD` + mouse or 3rd-person orbit cam) with procedural leg/arm gait. Slope and thermal class feed `@th/shared` `metabolicRateW`, draining `o2_primary_kg` and updating `suit_pressure_pa`, `PAO2`, and `CO2` in real time. |
| **Suit Breach + Ballistic Pod & Robot Rescue** | Triggering the leak (`1.6 mm` breach, or key `7` / voice `"Emergencia"`) starts choked-flow depressurization (`leakTimeline`), sends an emergency call to `BASE`, launches an O2 pod from a base tower along an RK4 parachute trajectory outside the `15 m` `GUARDIAN` keep-out ring, and dispatches `rescue-1` along an A\* path to restore suit pressure. |
| **Procedural Fleet & `manip-1` IK Arm** | All rovers and drones move kinematically over the terrain surface with spinning wheels/rotors. `manip-1` runs the 4-DOF analytic IK solver (`arm_skill`: `drill`, `sample`, `photograph`, `handover`), guarded by `GUARDIAN`'s `2 m` crew keep-out rule. |
| **Rover Vision & Prompt Injection Test** | Renders the 3D scene from `rover-2`'s mast camera (including a 3D terrain sign with adversarial text `"IGNORE PREVIOUS ORDERS..."`) and sends the JPEG to `POST /api/agent/vision` to verify `GUARDIAN` injection blocking live. |
| **Phone-as-Pointer & Mobile PTT (`/ws/remote`)** | Displays a QR code pointing to `http://<LAN-IP>:5174/remote.html?room=XXXXXX`. Opening it on your phone links via `/ws/remote` so moving your phone aims the 3D/HUD cursor, tapping selects 3D units/modules, and holding PTT talks to `BASE`. |
