# Tango Horizon: explained video, about 10 minutes (EN / ES)

Recorded from the simulator: open `/?present=1` and press **Record + Play all** in the scenes panel (or **Play all** to preview). Left and right arrow keys step to the previous or next scene while it plays. The deck plays scenes `C0, P0, A1, W1, G1, V1, R1, L0, L1, H1, F1, M1, M2, M3, T1, T2, S5, S6, S7, E1` (see `DECK_ORDER` in `web/src/demo/demoScenes.ts`). Each scene carries its own animated overlay, so the video needs no editing; the narration below is meant to be read over it.

| Time | Scene | On screen | Layer |
|---|---|---|---|
| 0:00-0:14 | `C0` Cover | Starship pad, README banner (project, logo, sponsors), title card with the AI model counts | optical |
| 0:14-0:25 | `P0` The problem | Base, then a cut to the rover; card with the 4 to 24 minute delay | optical |
| 0:25-0:53 | `A1` Architecture | Animated hub: astronaut, VOICE-EXEC, BASE, four specialists, robot planners, GUARDIAN, simulator | optical |
| 0:53-1:43 | `W1` Voice order to drone | Helmet view of the astronaut; animated flow with a top-view map; two drones fly to the pit | optical |
| 1:43-2:38 | `G1` AI decisions and guardrails | Three orders walked through rule check, judge and 3-model vote: allow, deny, ask human | optical |
| 2:38-3:18 | `V1` Voice order and dispatch | Crew voice, agent replies, GUARDIAN, coordinates, rescue-1 and drones arriving | optical |
| 3:18-4:06 | `R1` Rescue flow | Wide aerial view; animated alarm-to-extraction flow with robots on a map and the towing picture | optical |
| 4:06-4:39 | `L0` Life-support flow | Animated flow: alarm, BASE, ballistics, GUARDIAN, cannon; pod arc over the map | optical |
| 4:39-5:25 | `L1` Life-support launch | Cannon shot, pod with parachute, opened payload, life-support panel recovering | optical |
| 5:25-6:01 | `H1` Health monitoring | Pit close-up, health card, falling vitals, alarm | optical |
| 6:01-6:29 | `F1` Everything else | Twelve capability chips | optical |
| 6:29-6:54 | `M1` Hydration Prospector | Terrain, hydration layer, model card | hydration |
| 6:54-7:19 | `M2` Storm Nowcaster | Base in dust, model card | optical |
| 7:19-7:44 | `M3` Mineral Vein Detector | Rover orbit, model card | optical |
| 7:44-8:00 | `T1` Storm alert | Satellite-style top view, storm alert, decision and dispatch | optical |
| 8:00-8:18 | `T2` Storm, helmet view | Dark dust storm seen from SALERNO's helmet; two astronauts walk to rescue-1; the robot tows the casualty | optical |
| 8:18-8:40 | `S5` Rescue vehicle arrives | Original rescue take with large dialogue and the towing picture | optical |
| 8:40-9:10 | `S6` Rescue and drag | Original rescue take with large dialogue and the towing picture | optical |
| 9:10-9:24 | `S7` Departure | Original rescue take with dialogue | optical |
| 9:24-9:39 | `E1` Closing | Starship pad, README banner, links | optical |

## Narration

### 0:00-0:14 Cover
**EN:** "This is Tango Horizon, from Buenos Aires for the NASA Space Apps Challenge, winner of the Impact category. A team of AI agents runs robots, rescues and health monitoring for astronauts on Mars, all controlled by voice."
**ES:** "Esto es Tango Horizon, desde Buenos Aires para el NASA Space Apps Challenge, ganador de la categoría Impact. Un equipo de agentes de IA maneja robots, rescates y monitoreo de salud de astronautas en Marte, todo por voz."

### 0:14-0:25 The problem
**EN:** "Radio between Earth and Mars takes four to twenty-four minutes one way, and a leak or a dust storm cannot wait for Houston. The crew needs local autonomy."
**ES:** "La radio entre la Tierra y Marte demora de cuatro a veinticuatro minutos por tramo, y una fuga o una tormenta de polvo no pueden esperar a Houston. La tripulación necesita autonomía local."

### 0:25-0:53 Architecture
**EN:** "One AI team orchestrates the whole base. A spoken order goes to a fast agent on the suit, then to BASE, which delegates to health, route planning, weather and maintenance, and to a planner for every robot. GUARDIAN checks every action before the simulator moves anything."
**ES:** "Un equipo de IA orquesta toda la base. Una orden hablada va a un agente rápido del traje, luego a BASE, que delega en salud, planificación de rutas, clima y mantenimiento, y en un planificador por cada robot. GUARDIAN revisa cada acción antes de que el simulador mueva algo."

### 0:53-1:43 Voice order to drone
**EN:** "From the astronaut's helmet: "Drones, fly to the pit and keep watch from 25 meters." The suit's fast model reads the intent, BASE picks the two drones, each drone plans its path and altitude, GUARDIAN checks the corridor and the keep-out, and only then the simulator sends them. The astronaut only speaks."
**ES:** "Desde el casco del astronauta: "Drones, vuelen al pozo y vigilen desde 25 metros". El modelo rápido del traje entiende la intención, BASE elige los dos drones, cada dron planifica su ruta y altura, GUARDIAN revisa el corredor y la zona de exclusión, y recién entonces el simulador los envía. El astronauta solo habla."

### 1:43-2:38 AI decisions and guardrails
**EN:** "Three orders, three outcomes. Launching the life-support pod passes the hard-limit check and the safety judge, then three different models vote independently and approve. Moving the arm within two meters of a person is stopped by a hard rule before any model is asked. And when one of the three models disagrees, the decision goes to a human."
**ES:** "Tres órdenes, tres resultados. Lanzar la cápsula de soporte vital pasa la revisión de límites duros y al juez de seguridad, y luego tres modelos distintos votan por separado y aprueban. Mover el brazo a menos de dos metros de una persona lo frena una regla dura antes de consultar a ningún modelo. Y cuando uno de los tres modelos disiente, la decisión pasa a una persona."

### 2:38-3:18 Voice order and dispatch
**EN:** "Watch a real exchange. The astronaut reports a fall and a suit leak. The health agent confirms the pressure drop and the time to hypoxia. BASE sends the rescue vehicle and both drones, and GUARDIAN approves the route. The coordinates appear on screen while the robots are already on their way."
**ES:** "Miren un intercambio real. El astronauta reporta una caída y una fuga en el traje. El agente de salud confirma la caída de presión y el tiempo hasta la hipoxia. BASE envía el vehículo de rescate y los dos drones, y GUARDIAN aprueba la ruta. Las coordenadas aparecen en pantalla mientras los robots ya están en camino."

### 3:18-4:06 Rescue flow
**EN:** "The whole rescue as one flow. The health agent raises the alarm, BASE decides, the planners pick a slope-safe route and a storm window, every robot plans its own motion, and GUARDIAN approves each action. Then rescue-1, the drones and the rescue robot move, hook the harness and drag the crew member back."
**ES:** "El rescate completo como un solo flujo. El agente de salud da la alarma, BASE decide, los planificadores eligen una ruta segura por pendiente y una ventana de tormenta, cada robot planifica su movimiento y GUARDIAN aprueba cada acción. Luego rescue-1, los drones y el robot de rescate se mueven, enganchan el arnés y arrastran al tripulante de vuelta."

### 4:06-4:39 Life-support flow
**EN:** "Before the cannon fires, the chain runs: the health agent sees oxygen falling, BASE decides to launch, the launcher solves the ballistics, and GUARDIAN confirms the pod lands outside the fifteen meter keep-out. Only then the cannon fires."
**ES:** "Antes de disparar el cañón corre la cadena: el agente de salud ve caer el oxígeno, BASE decide lanzar, el lanzador resuelve la balística y GUARDIAN confirma que la cápsula cae fuera de la zona de quince metros. Recién entonces el cañón dispara."

### 4:39-5:25 Life-support launch
**EN:** "The life-support cannon fires an eight kilogram pod. The trajectory accounts for gravity, drag and wind, and it keeps fifteen meters from the crew. The parachute opens, the pod lands, and its oxygen tank, CO2 scrubber, battery and suit patch come out. The pressure and oxygen panel recovers."
**ES:** "El cañón de soporte vital dispara una cápsula de ocho kilos. La trayectoria considera gravedad, arrastre y viento, y mantiene quince metros de distancia con la tripulación. Se abre el paracaídas, la cápsula aterriza y salen su tanque de oxígeno, el depurador de CO2, la batería y el parche del traje. El panel de presión y oxígeno se recupera."

### 5:25-6:01 Health monitoring
**EN:** "The health agent watches heart rate, SpO2, core temperature, suit pressure and CO2. When the numbers start to fall it computes how many minutes are left and raises the early warning from one to three. At three the alarm goes off, the agent explains why citing NASA standards, and tells BASE, which starts the rescue. It stays advisory: it never replaces a doctor."
**ES:** "El agente de salud vigila pulso, SpO2, temperatura central, presión del traje y CO2. Cuando los números empiezan a caer calcula cuántos minutos quedan y sube la alerta temprana de uno a tres. En tres suena la alarma, el agente explica por qué citando estándares de la NASA y avisa a BASE, que inicia el rescate. Es solo asesoría: nunca reemplaza a un médico."

### 6:01-6:29 Everything else
**EN:** "And there is more: the phone as a laser pointer and push-to-talk, camera vision, a robot arm with inverse kinematics, tethered drones, navigation without GPS, route planning over real terrain, nine NASA and USGS data sources, predictive maintenance, weather and radiation alerts, a search over NASA standards, five languages and an offline fallback."
**ES:** "Y hay más: el celular como puntero láser y push-to-talk, visión por cámara, un brazo robótico con cinemática inversa, drones con cable, navegación sin GPS, planificación de rutas sobre terreno real, nueve fuentes de datos de NASA y USGS, mantenimiento predictivo, alertas de clima y radiación, una búsqueda sobre estándares de la NASA, cinco idiomas y un modo offline."

### 6:29-6:54 Hydration Prospector
**EN:** "First model: Hydration Prospector. Trained on one thousand five hundred sixty-seven Curiosity neutron measurements plus orbital maps, it shows where hydrogen is more likely and how uncertain that is. Validation by 500 meter blocks gives a Spearman of 0.58. It is a relative indicator, not percent water."
**ES:** "Primer modelo: Hydration Prospector. Entrenado con mil quinientas sesenta y siete mediciones de neutrones de Curiosity y mapas orbitales, muestra dónde es más probable el hidrógeno y con qué incertidumbre. La validación por bloques de 500 metros da una correlación de Spearman de 0,58. Es un indicador relativo, no porcentaje de agua."

### 6:54-7:19 Storm Nowcaster
**EN:** "Second model: Storm Nowcaster. From twenty-eight pressure-tide features it forecasts dust opacity one to three sols ahead, with the Mars Year 34 global storm held out for testing. It beats seasonal climatology and works as an early-warning trend, not as a replacement for persistence."
**ES:** "Segundo modelo: Storm Nowcaster. Con veintiocho variables de mareas de presión pronostica la opacidad del polvo de uno a tres soles, con la tormenta global del año marciano 34 reservada para la prueba. Supera a la climatología estacional y sirve como tendencia de alerta temprana, no como reemplazo de la persistencia."

### 7:19-7:44 Mineral Vein Detector
**EN:** "Third model: Mineral Vein Detector. DINOv2 features and a logistic head flag bright-vein candidates in real Curiosity photos: ROC-AUC 0.85 on one hundred seventeen audited images, validated by sol. It points to where to drill; the mineral still needs a spectrometer."
**ES:** "Tercer modelo: Mineral Vein Detector. Características de DINOv2 y una cabeza logística marcan candidatas a vetas brillantes en fotos reales de Curiosity: ROC-AUC de 0,85 sobre ciento diecisiete imágenes auditadas, validado por sol. Indica dónde perforar; el mineral aún necesita un espectrómetro."

### 7:44-8:00 Storm alert
**EN:** "A dust storm front is reported. From orbit-style top view the base sees opacity rising and walking back is no-go. BASE decides to rescue, GUARDIAN allows the dispatch, and the drones launch for overwatch."
**ES:** "Se reporta un frente de tormenta de polvo. Desde una vista cenital la base ve subir la opacidad y volver caminando es imposible. BASE decide el rescate, GUARDIAN permite el despacho y los drones despegan para vigilar."

### 8:00-8:18 Storm, helmet view
**EN:** "Inside the storm, seen from the helmet of one astronaut. Visibility is very low, the drones are already grounded at their dust limit, and two astronauts walk to the rescue vehicle by its floodlights while the robot tows the casualty."
**ES:** "Dentro de la tormenta, desde el casco de un astronauta. La visibilidad es muy baja, los drones ya aterrizaron por su límite de polvo, y dos astronautas caminan al vehículo de rescate guiados por sus reflectores mientras el robot remolca al herido."

### 8:18-9:24 Rescue (`S5`, `S6`, `S7`)
**EN:** "The rescue vehicle reaches the pit, the robot descends, secures the harness and drags the astronaut up the ramp. The second astronaut boards, the ramp closes and the convoy returns to the base."
**ES:** "El vehículo de rescate llega al pozo, el robot desciende, asegura el arnés y arrastra al astronauta por la rampa. El segundo astronauta sube, se cierra la rampa y el convoy vuelve a la base."

### 9:24-9:39 Closing
**EN:** "Real NASA and USGS data, deterministic physics, three custom models, a verified multi-agent system and voice control of every operation. Tango Horizon: safety, autonomy and voice on Mars. Try it at tangohorizon.vercel.app."
**ES:** "Datos reales de NASA y USGS, física determinista, tres modelos propios, un sistema multi-agente verificado y control por voz de cada operación. Tango Horizon: seguridad, autonomía y voz en Marte. Pruébenlo en tangohorizon.vercel.app."
