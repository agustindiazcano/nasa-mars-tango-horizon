# Tango Horizon — Complete Project Overview (Plain Language)

> **Tango Horizon** is a real-time 3D Mars surface mission operations, robotics, and climate simulator over real NASA/USGS Gale Crater cartography (`137.400°E, 4.589°S`, `-4501 m` MOLA), coupled with deterministic bioastronautics/physics, hands-free 5-language voice, a Hierarchical Multi-Agent AI System, in-memory BM25 RAG, 3 custom-trained Machine Learning models, and a 3-layer Run-Time Assurance guardrail (`GUARDIAN`).

---

## Part 1 — English Overview

### 1. Core Concept & Purpose
**Tango Horizon** is not a video game: it is a **mission operations, robotics, and environmental engineering simulator** designed to keep a 4-astronaut crew (`SOTELO`, `YACONIS`, `SALERNO`, `DIAZ-CANO`) safe during scientific Extravehicular Activity (EVA) on Mars.
Because an astronaut in a pressurized suit (`29.6 kPa` pure $\text{O}_2$) cannot type on a keyboard while climbing crater walls or handling rock samples, the entire operation is **100% hands-free via voice** (`EN`, `ES`, `FR`, `DE`, `IT`) and a mobile **Phone-as-Pointer WebSocket controller** (`/remote`).

### 2. Hierarchical Multi-Agent AI System (`14 Agents`)
Instead of a single chatbot, Tango Horizon runs a **multi-tier agent hierarchy** on the backend (`server/src/agents/`), routing every task to the model tier that fits its latency and reasoning requirements:

1. **Fast Voice Reflex (`SUIT.VOICE-EXEC` — `google/gemini-4-hydrogen`):**
   - Intercepts spoken astronaut commands first (`~400–600 ms`).
   - Resolves direct HUD, camera, layer, and single-unit readouts immediately.
   - Escalates physical actuation, routing, FDIR, science, and emergencies (`escalate_to_base`) to the Base Orchestrator.
2. **Base Operations Orchestrator (`BASE` — `google/gemini-4-carbon`):**
   - The strategic brain of the Mars base (`MAX_TURNS = 6`).
   - Prioritizes crew survival over science, synthesizes cross-domain telemetry, and delegates specialized tasks via `delegate_to_agent` to 5 domain specialists and autonomous robot agents.
3. **5 Specialist Domain Agents (`google/gemini-4-argon`):**
   - `SUIT.HEALTH`: Biomedical decision-support, metabolic expenditure, $\text{O}_2/\text{CO}_2$ reserves, Casson blood rheology digital twin, and decompression limits (`NASA-STD-3001`).
   - `EVA-PLANNER`: Traverse planning, A* pathfinding over the `1 m/px` HiRISE DEM, slope limits, solid-state UWB/LED beacons (`deploy_beacons`), and power/oxygen turn-back budgets.
   - `SCIENCE`: Geological target selection, subsurface hydration (`Hydration Prospector`), and mineral vein detection (`Vein Detector`).
   - `WEATHER-RAD`: Atmospheric dust opacity ($\tau$), 3-sol storm forecasting (`Storm Nowcaster`), solar energetic particle (SEP) events, and sky-view-factor radiation shielding.
   - `MAINTENANCE`: Base life-support (ECLSS), MOXIE $\text{O}_2$ production, kilopower/solar arrays, and predictive FDIR fault telemetry (`evaluate_component_health`, `isolate_component`).
4. **Autonomous Robot Agents (`ROBOT.<id>` — `google/gemini-4-argon`):**
   - `rover-1` (Curiosity), `rover-2` (Perseverance), `rover-3` / `manip-1` ("HANDS" 4-DOF manipulator rover), `rescue-1` (pressurized crew rescue rover), `rescue-bot-1` (tracked/wheeled pit extraction robot), `drone-1` (Ingenuity scout), `drone-2` (Sky-Crane tethered relay), `glider-1`, and `scout-1`.
   - **Dual Control:** Every robot can be commanded **directly by the astronaut via voice** or **autonomously by the `BASE` orchestrator** during a multi-unit mission or rescue.

### 3. 3-Provider LLM Failover & Local Mars Base Compute
- **Cloud Demo Architecture (`server/src/llm/provider.ts`):**
  1. **Primary — Google Cloud Vertex AI:** `google/gemini-4-carbon` (`large`), `google/gemini-4-argon` (`medium`, `judge`, `vision`), `google/gemini-4-hydrogen` (`fast`).
  2. **Secondary — Google AI Studio (`GEMINI_API_KEY`):** `gemini-4-carbon`, `gemini-4-argon`, `gemini-4-hydrogen`.
  3. **Backup — Meta Muse API (`META_API_KEY`):** `muse-wonder-1.0` (`large`, `medium`, `vision`), `muse-spark-1.3` (`fast`, `judge`).
  4. **Deterministic Offline Fallback (`AGENTS_OFFLINE=1`):** Rule-based execution (`offline.ts`) so the mission never loses control even if all external networks fail.
- **Real Mars Base Deployment:** On Mars, Earth-Mars one-way light time is **4 to 24 minutes**, making Earth-cloud inference impossible for real-time EVA control or emergency rescue. In an actual Mars habitat deployment, this stateless multi-agent + MCP + BM25 RAG architecture runs **locally on the Mars Base `compute` module** and suit/rover edge NPUs using open-weight models, zero-network-hop `InMemoryTransport` MCP servers, and local speech synthesis.

### 4. Hands-Free Voice, Neural TTS & 5 Languages
- **Supported Languages (`5`):** English (`EN`), Spanish (`ES`), French (`FR`), German (`DE`), and Italian (`IT`).
- **Two-Stage Speech Recognition:**
  1. `<5 ms` local browser regex (`localIntents.ts`) for instant safety-critical and camera/HUD commands.
  2. Full voice pipeline (`listen.ts` + `/api/agent/voice`) with server-side multimodal STT fallback (`stt.ts` using `google/gemini-4-hydrogen` with Mars mission glossary normalization).
- **Neural Voice Synthesis (`/api/tts`):**
  - **Google Cloud Text-to-Speech (`Journey` Neural Voices):** `en-US-Journey-D`, `es-US-Journey-D`, `fr-FR-Journey-D`, `de-DE-Journey-D`, `it-IT-Journey-D`.
  - **NASA Apollo Quindar Tones & 32-Band FFT:** Synthesizes `2525 Hz` intro and `2475 Hz` outro radio beeps over Web Audio API with a live 32-band FFT spectrum visualizer on the visor.

### 5. Predictive RAG (`<2 ms` In-Memory BM25) Across 3 Domains
The `mcp-knowledge` server searches `1,002` chunks in `server/corpus/chunks.json` in `<2 ms` with exact `(document, page)` citations:
1. **Predictive Crew Health & Biomedical RAG (`NASA-STD-3001` Vol. 1 & 2, OCHMO):** Computes sliding-window vitals slopes and `time_to_breach_s` for $\text{PICO}_2$, core temperature, PSI, $\text{SpO}_2$, HR drift, and Casson blood yield stress against personal baselines to trigger alerts before hypoxia or decompression sickness occurs.
2. **Predictive Equipment Maintenance & FDIR RAG:** Estimates degradation slopes and Remaining Useful Life (`rul_s`) across suit PLSS (`PLSS-FAN-01`, `PLSS-SCRUB-01`, `PLSS-COOL-01`), rover mobility/arm (`RVR-MOB-01`, `ARM-TORQ-01`), base power (`HAB-PWR-01`), and MOXIE (`ISRU-MOX-01`), retrieving cited SOPs to isolate faulty components (`isolate_component`).
3. **Environmental, Weather & Radiation RAG:** Combines REMS barometric gradients, dust opacity ramp $\dot{\tau}$, solar power margin, MSL RAD dose rate ($\mu\text{Gy/h}$), and DONKI SEP alerts with `Mars-GRAM` / `MCD v5.2` citations to recommend shelter in high-shielding terrain pits (`SVF = 0.35`).

### 6. 3 Custom-Trained Machine Learning Models (On Real NASA Data)
1. **Hydration Prospector (`tango-horizon-hydration-v1`, `tools/train_hydration.py`):** `GradientBoostingRegressor` ensemble + 90% conformal intervals trained on **1,567 real Curiosity DAN neutron measurements** (`377` inside the 4 km scene) fused with orbital CRISM (`BD1900_2`, `SINDEX2`), THEMIS IR, and CTX geomorphometry (`Spatial 500 m GroupKFold Spearman = 0.5823, R² = 0.3638, MAE = 0.3695` vs. `0.4860` baseline).
2. **Storm Nowcaster (`rems_hgbr_quantile_v1`, `tools/train_storm_nowcaster.py`):** `HistGradientBoostingRegressor` quantile ensemble (`q10`, `q50`, `q90`) + Conformalized Quantile Regression over **4,050 sols / 28 variables of Curiosity REMS barometric tides and Mastcam optical depth ($\tau$)**, using semidiurnal thermal tide amplification (`s2_amp`, `Spearman = 0.6709`) as a physical precursor of global dust storms (`Spearman = 0.765–0.796` at +1..+3 sols).
3. **Mineral Vein Detector (`tango-horizon-veins-v1`, `tools/train_vein_detector.py`):** Frozen `facebook/dinov2-small` (`384-d` patch embeddings) + Logistic Regression head validated via Sol-grouped `GroupKFold` on **117 audited Curiosity Mastcam & MAHLI close-up rock photographs across 22 sols** (`ROC-AUC = 0.8453`, `PR-AUC = 0.7961`, `Precision = 0.7941`, `Recall = 0.6585`, `p = 0.0020`).

### 7. Simulated Robotics (Real Kinematics & Physics, Not Mocks) + Multimodal Vision
- **Manipulator Rover `manip-1` ("HANDS"):** 4-wheel chassis with mast camera and a **4-DOF robotic arm (`1.7 m` reach)** solved in real time via **analytic 2-bone Inverse Kinematics (IK)** (`arm.ts`) and a finite-state `SkillRunner` (`drill`, `sample`, `photograph`, `handover`).
- **Multimodal Vision (`capture_vision` & `/api/agent/vision`):** Captures the helmet camera or an offscreen `512×384` viewport from `manip-1`'s mast camera with candidate targets (`T1..Tn`); the vision model inspects the image, selects the scientific target, and commands the IK arm to drill or sample it.
- **Sky-Crane Drones (`drone-1`, `drone-2`):** Simulate a damped Kevlar spring-pendulum tether (`skyCraneProc.ts`) and volumetric 3D Flash LiDAR cone.
- **Ballistic Life-Support Pack (`8.0 kg` Drop-Pod):** Launched from the habitat mass-driver and integrated via **4th-order Runge-Kutta (RK4)** (`ballistics.ts`) under Mars gravity (`3.72076 m/s²`), stratified $\text{CO}_2$ drag, and REMS wind shear (`>15 m` safe crew standoff).

### 8. Autonomous 4-Astronaut Rescue Scenario & `GUARDIAN` Safety Layer
- **4-Astronaut Crew:** `SOTELO`, `YACONIS`, `SALERNO`, and `DIAZ-CANO` (also mapped in procedural EVA callsigns `eva-1..eva-4` / Hooke, Huygens, Halley, Cassini).
- **Autonomous Pit Rescue (`S1–S7`):** When `DIAZ-CANO` (`eva-4` / Cassini) falls into the natural geological pit (`RESCUE_PIT`, `24 m` diameter, `4 m` depth, `290 m` East of base) with a suit puncture (`dP/dt = -0.12 kPa/s`, `HR = 148 bpm`) while a dust storm advances, the system detects the emergency (or responds to a voice command) and autonomously coordinates:
  1. `drone-1` + `drone-2` dispatched to orbit the pit rim (`≥ 25 m` horizontal downwash standoff) for optical/LiDAR reconnaissance and radio relay.
  2. `rescue-1` (pressurized rover) + `rescue-bot-1` (wheeled/tracked pit extraction robot with winch and stretcher) routed along A* safe paths (`slope ≤ 16°`).
  3. `8.0 kg` $\text{O}_2$ life-support pod launched via RK4 ballistics (`> 15 m` keep-out) if oxygen time-to-hypoxia drops below rover arrival time.
  4. `rescue-bot-1` descends the north ramp (`11.3°`), stabilizes the astronaut's $\text{O}_2$ loop, extracts him to `rescue-1`, and returns the crew to the habitat airlock (`S7`).
- **`GUARDIAN` 3-Layer Run-Time Assurance (`guardian.ts` + `voting.ts`):**
  1. Deterministic physical rules (`ruleCheck`): slope limits (`≤ 20°` rovers, `≤ 16°` `rescue-1`), `15 m` ballistic pod keep-out, `25 m` rescue drone standoff, `2 m` robotic arm keep-out.
  2. LLM safety & `<untrusted>` input judge (`judge`).
  3. **3-Model Escalated Consensus Voting (`voting.ts`):** High-consequence actions require concurrent voting across `gemini-4-carbon`, `gemini-4-argon`, and `muse-wonder-1.0` with **Asymmetric Safety Override** (`ask_human` if any voter denies with confidence $\ge 0.85$).

---

## Parte 2 — Resumen Completo en Español (En Fácil)

### ¿Qué es Tango Horizon?
**Tango Horizon** no es un videojuego: es un **simulador de operaciones de misión, robótica y clima en Marte en 3D en tiempo real (60 FPS)** construido sobre la cartografía real de la NASA y el USGS del Cráter Gale (donde aterrizó Curiosity).
Su objetivo es garantizar la **seguridad de 4 astronautas (`SOTELO`, `YACONIS`, `SALERNO` y `DIAZ-CANO`)** durante caminatas espaciales científicas (EVA) mediante **control 100% manos libres por voz en 5 idiomas** (`Inglés`, `Español`, `Francés`, `Alemán` e `Italiano`), telemetría biomédica y ambiental en vivo, y una flota de **robots y drones autónomos**.

### Lo mejor del sistema punto por punto
1. **Arquitectura Multi-Agente Jerárquica (3 niveles de modelos + 3 proveedores):**
   - **Agente de Respuesta Rápida (`SUIT.VOICE-EXEC` — `Gemini 4 Hydrogen`):** Escucha al astronauta y resuelve lecturas de visor, cámara, mapa o traje en milisegundos.
   - **Orquestador Principal de la Base (`BASE` — `Gemini 4 Carbon`):** Es el cerebro estratégico. Cuando hay una misión compleja o una emergencia, toma el control y coordina a toda la base.
   - **5 Agentes Especialistas de Dominio (`Gemini 4 Argon`):** Salud del traje (`SUIT.HEALTH`), Planificación de rutas (`EVA-PLANNER`), Ciencia (`SCIENCE`), Clima y Radiación (`WEATHER-RAD`) y Mantenimiento de la base (`MAINTENANCE`).
   - **Agentes Robóticos por Unidad (`ROBOT.<id>` — `Gemini 4 Argon`):** Cada rover y dron (`rover-1`, `rover-2`, `manip-1`, `rescue-1`, `rescue-bot-1`, `drone-1`, `drone-2`) es un agente autónomo que puede ser controlado **tanto por el astronauta por voz como por el orquestador `BASE`**.
   - **Failover de 3 Proveedores + Operación Local en Marte:** Usa Google Cloud Vertex AI como primario, Google AI Studio como secundario, **Meta Muse (`muse-wonder-1.0` y `muse-spark-1.3`)** como backup automático y un motor determinista offline. En una misión real en Marte (donde la señal a la Tierra tarda de 4 a 24 minutos por tramo), esta misma arquitectura corre localmente en el **módulo `compute` de la base marciana** y en las NPUs de los trajes y rovers.
2. **RAG en Memoria (`<2 ms`) para Predicción de Salud, Mantenimiento y Clima:**
   - **Salud Predictiva:** Cruza signos vitales en vivo (`HR`, `SpO2`, `PICO2`, presión de $\text{O}_2$ y viscosidad sanguínea de Casson) contra líneas base personales y estándares `NASA-STD-3001` y `OCHMO` para emitir alertas antes de llegar a hipoxia.
   - **Mantenimiento Predictivo (FDIR):** Calcula la Vida Útil Remanente (`rul_s`) del generador de oxígeno MOXIE, ventiladores/depuradores del traje, paneles solares y motores de rovers para aislar fallas antes de que ocurran.
   - **Alertas Climáticas y de Radiación:** Monitorea tormentas de polvo ($\tau$) y radiación solar (SEP/RAD) para ordenar refugio preventivo.
3. **3 Modelos de Machine Learning Propios Entrenados con Datos Reales de la NASA:**
   - **Hydration Prospector:** Entrenado con **1.567 mediciones reales de neutrones DAN de Curiosity** más datos orbitales CRISM/THEMIS/CTX para predecir hidratación subsuperficial (`Spearman = 0.5823, R² = 0.3638`).
   - **Storm Nowcaster:** Entrenado con **4.050 soles de presión REMS de Curiosity** para predecir tormentas de polvo con 1 a 3 soles de anticipación usando mareas térmicas barométricas (`Spearman = 0.765–0.796`).
   - **Mineral Vein Detector:** Modelo de visión (`DINOv2-small` + Regresión Logística, `ROC-AUC = 0.8453`) sobre 117 fotos reales Mastcam/MAHLI que detecta vetas minerales de sulfato de calcio dejadas por agua antigua.
4. **Robótica Simulada con Física Real (No Mock) y Visión Multimodal:**
   - El rover `manip-1` ("HANDS") tiene un brazo robótico de **4 grados de libertad con Cinemática Inversa (IK) analítica real** y cámara en el mástil. Un modelo de visión multimodal mira la cámara del rover o del casco, analiza el afloramiento y mueve el brazo para perforar o tomar muestras.
   - Pack balístico de soporte vital de **8,0 kg** calculado con integración **Runge-Kutta de 4to orden (RK4)** con gravedad, arrastre atmosférico de $\text{CO}_2$ y cizalladura de viento marciano real.
5. **Rescate Autónomo y Guardián de Seguridad (`GUARDIAN`):**
   - Si un astronauta (`DIAZ-CANO` / Cassini) cae en la fosa natural (`RESCUE_PIT`) con una fuga en el traje, el sistema despliega autónomamente los drones de reconocimiento, el rover presurizado `rescue-1`, el robot extractor `rescue-bot-1` y el pack de soporte vital, validando cada acción con límites físicos deterministas y **votación escalada entre 3 modelos (`Gemini 4 Carbon`, `Gemini 4 Argon` y `Meta Muse Wonder`)**.
