# Tango Horizon — Slide Deck Structure (10 Slides)

> Recommended 10-slide structure for the presentation deck, pairing visual assets from the simulator and `docs/` with concise technical metrics.

---

## Slide 1 — Title & Vision (Portada y Visión)
- **Title:** **Tango Horizon** — Autonomous Multi-Agent Mars Surface Operations, Robotics & Climate Simulator
- **Subtitle:** Hands-Free 5-Language Voice · Real NASA/USGS Gale Crater Cartography · Deterministic Physics · Predictive RAG · Custom ML
- **Visual:** 3D wide shot of the 20-module Mars Base + Rocket Launch Pad over the Gale Crater DEM (`CAM-1` / `S1`).
- **Key Tagline:** *"Not a game: a real-time 3D engineering, robotics, and bioastronautics simulation for crew safety on Mars."*

---

## Slide 2 — Why Autonomous Local Operations on Mars? (El Problema en Marte)
- **Key Points:**
  - **4 to 24 minutes** one-way radio delay between Earth and Mars (`48 min` round-trip).
  - Pressurized EVA suits (`29.6 kPa` pure $\text{O}_2$) restrict hand dexterity — astronauts need **100% hands-free control**.
  - Sudden suit leaks, metabolic overload, dust storms ($\tau > 1.5$), or solar particle events (SEP) leave zero time to wait for Houston.
- **Architectural Solution:** A local-ready Multi-Agent AI + deterministic physics + autonomous robotic fleet that runs inside the Martian habitat.

---

## Slide 3 — Hierarchical Multi-Agent AI Architecture (Arquitectura Multi-Agente Jerárquica)
- **Visual:** Diagram of the 14 agents + 6 in-process MCP servers (`InMemoryTransport`, zero network hop).
- **3-Tier Model Routing & 3-Provider Failover:**
  - **Fast Reflex (`SUIT.VOICE-EXEC`):** `Gemini 4 Hydrogen` (`~400–600 ms` voice execution).
  - **Base Orchestrator (`BASE`):** `Gemini 4 Carbon` (strategic multi-step coordination).
  - **5 Domain Specialists + 7 Robot Agents (`ROBOT.<id>`):** `Gemini 4 Argon` (`SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE` + 7 autonomous units).
  - **3-Provider Failover:** Google Cloud Vertex AI $\rightarrow$ Google AI Studio $\rightarrow$ **Meta Muse (`muse-wonder-1.0` / `muse-spark-1.3`)** $\rightarrow$ Deterministic Offline Engine (`offline.ts`).
- **Multi-Agent Development Methodology:** Coordinated using our proprietary [**AFAW (Anti-Fragile Agentic Workflow)**](https://github.com/agustindiazcano/afaw-anti-fragile-agentic-workflow).

---

## Slide 4 — Hands-Free Voice in 5 Languages & Phone-as-Pointer (Voz en 5 Idiomas y Puntero Móvil)
- **Visual:** Helmet HUD visor showing the **32-band FFT spectrum visualizer**, language selector (`EN` · `ES` · `FR` · `DE` · `IT`), and QR code for `/remote`.
- **Key Capabilities:**
  - **Two-Stage Speech Recognition:** `<5 ms` local critical voice intents (`localIntents.ts`) + cloud/multimodal STT fallback (`stt.ts`).
  - **Google Cloud Neural TTS (`Journey` Voices):** Natural spoken briefings in 5 languages framed by authentic NASA Apollo Quindar tones (`2525 Hz` / `2475 Hz`).
  - **Phone-as-Pointer (`/ws/remote`):** Sub-16 ms WebSocket gyroscope cursor + Push-to-Talk + haptic feedback.

---

## Slide 5 — Predictive RAG (`<2 ms` BM25) for Health, Maintenance & Climate (RAG Predictivo)
- **Visual:** Casson Blood Digital Twin panel + FDIR Maintenance alert + `NASA-STD-3001` page citation card.
- **3 Predictive Pillars (`server/corpus/chunks.json`):**
  1. **Astronaut Health (`SUIT.HEALTH`):** Live `HR`, `SpO2`, `FiCO2`, suit `dP/dt`, and Casson blood yield stress vs. personal baselines and `NASA-STD-3001` Vol. 1 & 2 / OCHMO decompression limits.
  2. **Predictive Equipment Maintenance (`MAINTENANCE`):** Aerospace FDIR telemetry for MOXIE $\text{O}_2$ solid-oxide electrolysis, solar arrays, and batteries before breakdown.
  3. **Weather & Radiation (`WEATHER-RAD`):** Dust optical depth ($\tau$), pressure drop ($\Delta P$), and MSL RAD dose ($\mu\text{Gy/h}$) with sky-view-factor (`SVF`) pit shielding rules.

---

## Slide 6 — 3 Custom Machine Learning Models Trained on Real NASA Data (3 Modelos de ML Propios)
- **Visual:** The 3 validation figures side by side:
  - [`docs/hydration_cv.png`](../hydration_cv.png) — **Hydration Prospector**
  - [`docs/storm_tides.png`](../storm_tides.png) — **Storm Nowcaster**
  - [`docs/veins_eval.png`](../veins_eval.png) — **Mineral Vein Detector**
- **Metrics Table:**
  | Model | NASA Training Dataset | Architecture | Validation Metric |
  |---|---|---|---|
  | **Hydration Prospector** | 496 Curiosity DAN neutron points + DEM/Thermal rasters | Ridge Regression Ensemble (`1024×1024` map + uncertainty) | Spatial GroupKFold **R² = 0.674** (`MAE = 0.506 wt%`) |
  | **Storm Nowcaster** | 4,050 sols of Curiosity REMS pressure & Mastcam $\tau$ | Quantile Gradient Boosting (`q10`, `q50`, `q90`, 1–3 sols) | **MAE = 0.088–0.159** (captures Sol 2075 global storm) |
  | **Mineral Vein Detector** | Real Curiosity Mastcam & MAHLI close-up rock frames | `DINOv2 ViT-S/14` (`384-d`) + Logistic Regression head | **ROC-AUC = 0.858**, **F1 = 0.788** |

---

## Slide 7 — Simulated Robotics, Multimodal Vision & Ballistic Life-Support Pod (Robótica Simulada y Visión)
- **Visual:** Close-up of `manip-1` ("HANDS") 4-DOF arm + offscreen `512×384` camera target (`T1..Tn`) + `drone-2` Sky-Crane tether + RK4 ballistic trajectory arc.
- **Why It Is Real Simulation (Not Mocked):**
  - **4-DOF Analytic Inverse Kinematics (`arm.ts`):** Exact 2-bone cosine-law joint angles ($\theta_0..\theta_3$) + state-machine `SkillRunner` (`drill`, `sample`, `photograph`, `handover`).
  - **Multimodal Vision (`/api/agent/vision`):** Vision agent reads the rover's mast camera image and commands the IK arm to sample the selected target.
  - **8.0 kg Ballistic Life-Support Pack (`ballistics.ts`):** 4th-order Runge-Kutta (RK4) trajectory under Martian gravity (`3.72076 m/s²`) and aerodynamic drag ($\rho = 0.020\text{ kg/m}^3$).

---

## Slide 8 — Autonomous 4-Astronaut Rescue Scenario & `GUARDIAN` Voting (Rescate Autónomo y Guardián)
- **Visual:** Sequence `S2` (Cassini falls into the `24 m` natural pit) $\rightarrow$ `S4` (Drones at rim + `rescue-1` / `rescue-bot-1` en route) $\rightarrow$ `S6` (Extraction) + `GUARDIAN` 3-Model Voting badge.
- **Step-by-Step Autonomous Rescue:**
  1. **Cassini (`eva-4`)** falls into the `4 m`-deep pit (`290 m` East); suit leaks at `-0.12 kPa/s`.
  2. `BASE` dispatches `drone-1` & `drone-2` (`15 m` downwash standoff) + routes `rescue-1` & `rescue-bot-1` via A* (`slope ≤ 16°`) + fires the `8.0 kg` RK4 $\text{O}_2$ pod if time-to-hypoxia requires it.
  3. **`GUARDIAN` 3-Layer Verification:** Deterministic geometric/slope checks $\rightarrow$ LLM safety judge $\rightarrow$ **2/3 Escalated Consensus Vote** across `Gemini 4 Carbon`, `Gemini 4 Argon`, and `Meta Muse Wonder`.

---

## Slide 9 — Real vs. Simulated Breakdown & 9 NASA/USGS Data Sources (Datos Reales de la NASA vs. Simulación)
- **2-Column Table:**
  - **100% Real (54 Provenance Entries):** MOLA/HiRISE Gale Crater topography (`2048×2048` 16-bit DEM), 496 MSL DAN neutron points, 4,050 sols of REMS weather, MSL RAD radiation (`233 µGy/d`), Perseverance MOXIE (`5.37 g/h` $\text{O}_2$), NASA DONKI solar flares/CMEs, JPL Horizons ephemeris, NASA 3D GLTF meshes, and `NASA-STD-3001` medical corpus.
  - **Deterministic Physics & Simulation:** Pandolf metabolic equation, choked-orifice suit depressurization, RK4 pod ballistics, A* pathfinding, 4-DOF analytic IK, Sky-Crane spring-pendulum, and 60 FPS WebGL2 shaders.

---

## Slide 10 — Closing & Live Deployment (Cierre y Demo en Vivo)
- **Live URLs:**
  - **3D Simulator:** [`https://tangohorizon.vercel.app`](https://tangohorizon.vercel.app)
  - **Mobile Pointer (`/remote`):** [`https://tangohorizon.vercel.app/remote`](https://tangohorizon.vercel.app/remote)
  - **Cloud Run API (`nasa-tango-horizon`):** Vertex AI + Google Cloud Neural TTS + Meta Muse Failover
- **Team:** Agustín Díaz Cano · Nahuel · Facundo · Lautaro · Conrado · Ezequiel.
