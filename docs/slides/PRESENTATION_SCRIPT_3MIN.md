# Tango Horizon — 3-Minute Presentation & Live Rescue Script

> **Duration:** 3:00 minutes (`180 seconds`)
> **Format:** Live pitch + real-time 3D simulation & autonomous rescue demonstration (`S1` to `S7`).

---

## Part 1 — Spanish Script (Guion de 3 Minutos en Español)

### `[0:00 – 0:25]` 1. El Problema y Qué es Tango Horizon *(En pantalla: Vista aérea de la Base en el Cráter Gale — Escena `S1`)*
> "Imaginen a cuatro astronautas caminando sobre el Cráter Gale en Marte. Llevan guantes presurizados, tienen reservas limitadas de oxígeno y cualquier comunicación con la Tierra tarda hasta 24 minutos en llegar. Si ocurre una emergencia médica, una tormenta de polvo o un accidente en un cráter, la Tierra no puede ayudarlos a tiempo.
>
> Por eso creamos **Tango Horizon**: no es un juego, es un **simulador de operaciones de misión, robótica y clima en 3D en tiempo real**, construido sobre topografía láser real de la NASA y diseñado para garantizar la seguridad de una operación científica en Marte mediante **inteligencia artificial multi-agente y comandos 100% manos libres por voz en 5 idiomas**: inglés, español, francés, alemán e italiano."

---

### `[0:25 – 0:55]` 2. Arquitectura Multi-Agente, Modelos de IA y ML Propios *(En pantalla: HUD del casco, capas de Hidratación / Vetas y pronóstico de tormentas)*
> "En una operación real en Marte, este sistema corre en servidores locales dentro de la base. Para nuestra arquitectura multi-agente combinamos tres niveles de modelos en Google Cloud Vertex AI —**Gemini 4 Carbon** para el agente orquestador principal de la base, **Gemini 4 Argon** para los agentes especialistas y de visión, y **Gemini 4 Hydrogen** para respuestas rápidas de voz—, con failover automático hacia **Meta Muse** y voces neuronales de **Google Cloud TTS** con tonos de radio Apollo Quindar.
>
> Además, entrenamos **tres modelos de Machine Learning propios con datos reales de Curiosity**:
> 1. **Hydration Prospector**, sobre 496 mediciones de neutrones DAN para encontrar agua subterránea;
> 2. **Storm Nowcaster**, sobre 4.050 soles de presión atmosférica REMS para anticipar tormentas globales de polvo 3 soles antes; y
> 3. **Vein Detector**, un modelo de visión con **DINOv2** sobre fotos reales Mastcam y MAHLI que detecta vetas minerales dejadas por agua antigua."

---

### `[0:55 – 1:35]` 3. RAG Predictivo, Robótica Real Simulada y Emergencia en Vivo *(En pantalla: Rover manipulador `manip-1` con brazo IK, luego Escenas `S2` y `S3` — caída de Cassini en la fosa)*
> "Cada uno de los 7 robots y drones de la misión es a su vez un agente autónomo que puede ser controlado tanto por el astronauta por voz como por el orquestador de la base. La robótica no es un mock: el rover **HANDS (`manip-1`)** resuelve cinemática inversa analítica de 4 grados de libertad y usa visión multimodal para ver rocas a través de su cámara y perforarlas.
>
> Mientras la tripulación opera, el sistema ejecuta **RAG en memoria en menos de 2 milisegundos** sobre estándares médicos **NASA-STD-3001** para predecir la salud del astronauta, el mantenimiento predictivo de los equipos MOXIE y las alertas de radiación.
>
> Veámoslo en acción: durante una salida científica a 290 metros de la base, el astronauta **Cassini (`eva-4`)** resbala en el borde de una fosa geológica natural de 4 metros de profundidad (`S2`). Su traje sufre una micro-perforación: la presión cae a `0,12 kilopascales por segundo` y su pulso sube a `148 latidos por minuto` (`S3`)."

---

### `[1:35 – 2:30]` 4. Despliegue Autónomo de Rescate y Guardián de Seguridad *(En pantalla: Escenas `S4`, `S5` y `S6` — Drones en el borde, pack balístico RK4, descenso de `rescue-bot-1` y extracción a `rescue-1`)*
> "Sin tocar un teclado, ya sea porque el agente biomédico detecta la caída de presión o porque el comandante da la orden por voz, el orquestador **BASE** activa el protocolo de rescate autónomo:
> - Primero, envía a los drones **Ingenuity (`drone-1`)** y **Sky-Crane (`drone-2`)** al borde de la fosa para escaneo LiDAR y enlace de radio.
> - Segundo, si el tiempo hacia la hipoxia es crítico, la base dispara un **pack balístico de soporte vital de 8 kilos**, cuya trayectoria se calcula con integración **Runge-Kutta de 4to orden** con gravedad y resistencia atmosférica marciana real.
> - Tercero, despacha al rover presurizado **`rescue-1`** y al robot extractor **`rescue-bot-1`** calculando rutas A* sobre el mapa de elevación real.
>
> Antes de ejecutar cada movimiento, nuestro sistema **GUARDIAN** valida límites físicos deterministas —obligando a los drones y al pack balístico a mantenerse a más de 15 metros del astronauta herido— y somete la decisión a una **votación de consenso 2 de 3 entre Gemini 4 Carbon, Gemini 4 Argon y Meta Muse Wonder**.
> **`rescue-bot-1`** desciende por la rampa norte de 11 grados, estabiliza el oxígeno de Cassini (`S5`) y lo extrae hasta el rover presurizado (`S6`)."

---

### `[2:30 – 3:00]` 5. Cierre *(En pantalla: Escena `S7` — Regreso a la esclusa de la base y despegue de Starship)*
> "En menos de cuatro minutos de operación coordinada, Cassini ingresa a la esclusa presurizada de la base (`S7`).
>
> Datos reales de 9 fuentes de la NASA y el USGS, física determinista, 3 modelos de Machine Learning entrenados a medida, robótica con cinemática real y una arquitectura multi-agente con seguridad verificada lista para operar manos libres en Marte.
> **Esto es Tango Horizon. Muchas gracias.**"

---

## Part 2 — English Script (3-Minute Pitch & Rescue Walkthrough)

### `[0:00 – 0:25]` 1. The Challenge & What Tango Horizon Is *(On screen: Aerial view of the Gale Crater Base — Scene `S1`)*
> "Imagine four astronauts walking across Gale Crater on Mars. They are wearing pressurized gloves, breathing from finite oxygen tanks, and any radio signal to Earth takes up to 24 minutes one way. If a medical emergency, a dust storm, or a crater fall happens, Earth cannot save them in time.
>
> That is why we built **Tango Horizon**: not a game, but a **real-time 3D Mars mission operations, robotics, and climate simulator** built over real NASA laser altimetry, engineered to keep a scientific crew safe on Mars through **hierarchical multi-agent AI and 100% hands-free voice control in 5 languages**: English, Spanish, French, German, and Italian."

---

### `[0:25 – 0:55]` 2. Multi-Agent Architecture, AI Models & Custom ML *(On screen: Helmet HUD, Hydration / Vein layers, and 3-Sol Storm Forecast)*
> "In an actual Mars surface mission, this system runs on local base servers. For our multi-agent architecture, we combine three model tiers on Google Cloud Vertex AI—**Gemini 4 Carbon** for the main Base Orchestrator, **Gemini 4 Argon** for specialist and vision agents, and **Gemini 4 Hydrogen** for low-latency voice execution—backed by automatic failover to **Meta Muse** and **Google Cloud Neural TTS** with Apollo Quindar radio tones.
>
> On top of the agent hierarchy, we trained **three custom Machine Learning models on real Curiosity mission datasets**:
> 1. **Hydration Prospector**, trained on 496 DAN neutron measurements to map subsurface water;
> 2. **Storm Nowcaster**, trained on 4,050 sols of REMS atmospheric pressure to forecast dust storms 3 sols in advance; and
> 3. **Vein Detector**, a **DINOv2** vision model trained on real Mastcam and MAHLI imagery that detects ancient groundwater mineral veins."

---

### `[0:55 – 1:35]` 3. Predictive RAG, Simulated Robotics & Live Emergency *(On screen: `manip-1` rover with 4-DOF IK arm, then Scenes `S2` and `S3` — Cassini falls into the natural pit)*
> "Every one of our 7 rovers and drones is an autonomous agent controllable both by the astronaut via voice and by the Base Orchestrator. None of the robotics are mocked: the **HANDS (`manip-1`)** rover solves analytic 4-DOF inverse kinematics in real time and uses multimodal vision to inspect rocks through its mast camera and drill them.
>
> While the crew works, the backend runs **in-memory BM25 RAG in under 2 milliseconds** over **NASA-STD-3001** medical standards to predict astronaut health, predictive maintenance for MOXIE life-support hardware, and radiation alerts.
>
> Let's watch it in action: during a survey 290 meters East of the base, astronaut **Cassini (`eva-4`)** slips down the rim of a 4-meter-deep natural geological pit (`S2`). His suit suffers a micro-puncture: suit pressure drops at `0.12 kPa per second` and his heart rate spikes to `148 bpm` (`S3`)."

---

### `[1:35 – 2:30]` 4. Autonomous Multi-Unit Rescue & `GUARDIAN` Safety *(On screen: Scenes `S4`, `S5`, and `S6` — Drones at pit rim, RK4 ballistic pod, `rescue-bot-1` descent and extraction to `rescue-1`)*
> "Without touching a keyboard—either triggered automatically when the biomedical agent detects the suit leak or by a spoken command—the **BASE** orchestrator launches an autonomous rescue:
> - First, it dispatches **Ingenuity (`drone-1`)** and **Sky-Crane (`drone-2`)** to the pit rim for LiDAR mapping and communications relay.
> - Second, when time-to-hypoxia is critical, the base launches an **8-kilogram ballistic life-support pack**, computed via **4th-order Runge-Kutta integration** under real Martian gravity and atmospheric drag.
> - Third, it routes the pressurized rover **`rescue-1`** and the wheeled extraction robot **`rescue-bot-1`** over A* paths on the real elevation terrain.
>
> Before any physical action executes, our **GUARDIAN** layer enforces deterministic safety rules—keeping drones and ballistic pods at least 15 meters away from the injured astronaut—and requires a **2-of-3 consensus vote across Gemini 4 Carbon, Gemini 4 Argon, and Meta Muse Wonder**.
> **`rescue-bot-1`** drives down the 11-degree north ramp, stabilizes Cassini's oxygen loop (`S5`), and extracts him to the pressurized rover (`S6`)."

---

### `[2:30 – 3:00]` 5. Closing *(On screen: Scene `S7` — Return to base airlock and Starship ascent)*
> "Within minutes of coordinated autonomous operation, Cassini is safely inside the habitat airlock (`S7`).
>
> Real data from 9 NASA and USGS sources, deterministic physics, 3 custom-trained ML models, analytic inverse-kinematics robotics, and a verified multi-agent architecture built for hands-free operations on Mars.
> **This is Tango Horizon. Thank you.**"
