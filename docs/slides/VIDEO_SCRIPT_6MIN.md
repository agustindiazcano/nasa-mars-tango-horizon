# Tango Horizon: 6 minute explained video (EN / ES)

Recorded from the simulator: open `/?present=1` and press **Record + Play all** in the scenes panel (or **Play all** to preview). The deck plays scenes `C0, P0, A1, V1, L1, H1, M1, M2, M3, S5, S6, S7, E1` (see `DECK_ORDER` in `web/src/demo/demoScenes.ts`). Each scene carries its own animated overlay, so the video needs no editing; the narration below is meant to be read over it.

| Time | Scene | On screen | Layer |
|---|---|---|---|
| 0:00-0:25 | `C0` Cover | Starship pad, title card with the AI model counts | optical |
| 0:25-0:45 | `P0` The problem | Base, card with the 4 to 24 minute delay | optical |
| 0:45-1:20 | `A1` Architecture | Base aerial, animated agent flow | optical |
| 1:20-2:00 | `V1` Voice order and dispatch | Crew voice, agent replies, GUARDIAN, coordinates, rescue-1 and drones arriving | optical |
| 2:00-2:46 | `L1` Life-support launch | Cannon shot, pod with parachute, opened payload, life-support panel recovering | optical |
| 2:46-3:22 | `H1` Health monitoring | Pit close-up, health card, falling vitals | optical |
| 3:22-3:47 | `M1` Hydration Prospector | Terrain, hydration layer, model card | hydration |
| 3:47-4:12 | `M2` Storm Nowcaster | Base in dust, model card | optical |
| 4:12-4:37 | `M3` Mineral Vein Detector | Rover orbit, model card | optical |
| 4:37-4:59 | `S5` Rescue vehicle arrives | Original rescue take | optical |
| 4:59-5:29 | `S6` Rescue and drag | Original rescue take | optical |
| 5:29-5:43 | `S7` Departure | Original rescue take | optical |
| 5:43-5:58 | `E1` Closing | Starship pad, links | optical |

## Narration

### 0:00-0:25 Cover
**EN:** "This is Tango Horizon, from Buenos Aires for the NASA Space Apps Challenge. It is a multi-agent AI system, with five language models and three custom machine learning models, that coordinates simulated robots to keep astronauts safe on Mars, and every operation can be commanded by voice."
**ES:** "Esto es Tango Horizon, desde Buenos Aires para el NASA Space Apps Challenge. Es un sistema multi-agente de IA, con cinco modelos de lenguaje y tres modelos de aprendizaje automático propios, que coordina robots simulados para cuidar a los astronautas en Marte, y cada operación se comanda por voz."

### 0:25-0:45 The problem
**EN:** "Radio between Earth and Mars takes four to twenty-four minutes one way. In a pressurized suit the hands are limited, and a leak or a dust storm cannot wait for Houston. The crew needs local autonomy."
**ES:** "La radio entre la Tierra y Marte demora de cuatro a veinticuatro minutos por tramo. Con el traje presurizado las manos están limitadas, y una fuga o una tormenta de polvo no pueden esperar a Houston. La tripulación necesita autonomía local."

### 0:45-1:20 Architecture
**EN:** "A spoken order is first handled by a fast model on the suit. Complex requests go to the BASE orchestrator, which delegates to specialists for health, planning, science, weather, maintenance and every robot. They use six in-process tool servers and a search over NASA standards. Before anything moves, GUARDIAN checks hard limits, asks a judge model, and for critical actions three models vote. If the cloud fails, providers fall back one after another, down to an offline engine."
**ES:** "Una orden hablada la atiende primero un modelo rápido en el traje. Lo complejo pasa al orquestador BASE, que delega en especialistas de salud, planificación, ciencia, clima, mantenimiento y cada robot. Usan seis servidores de herramientas y una búsqueda sobre estándares de la NASA. Antes de que algo se mueva, GUARDIAN revisa límites duros, consulta a un juez y, en acciones críticas, votan tres modelos. Si falla la nube, los proveedores se reemplazan uno a otro, hasta un motor offline."

### 1:20-2:00 Voice order and dispatch
**EN:** "Watch a real exchange. The astronaut reports a fall and a suit leak. The health agent confirms the pressure drop and the time to hypoxia. BASE sends the rescue vehicle and both drones, and GUARDIAN approves the route. The coordinates appear on screen while the robots are already on their way."
**ES:** "Miren un intercambio real. El astronauta reporta una caída y una fuga en el traje. El agente de salud confirma la caída de presión y el tiempo hasta la hipoxia. BASE envía el vehículo de rescate y los dos drones, y GUARDIAN aprueba la ruta. Las coordenadas aparecen en pantalla mientras los robots ya están en camino."

### 2:00-2:46 Life-support launch
**EN:** "The life-support cannon fires an eight kilogram pod. The trajectory accounts for gravity, drag and wind, and it keeps fifteen meters from the crew. The parachute opens, the pod lands, and its oxygen tank, CO2 scrubber, battery and suit patch come out. The pressure and oxygen panel recovers."
**ES:** "El cañón de soporte vital dispara una cápsula de ocho kilos. La trayectoria considera gravedad, arrastre y viento, y mantiene quince metros de distancia con la tripulación. Se abre el paracaídas, la cápsula aterriza y salen su tanque de oxígeno, el depurador de CO2, la batería y el parche del traje. El panel de presión y oxígeno se recupera."

### 2:46-3:22 Health monitoring
**EN:** "The health agent watches heart rate, SpO2, core temperature, suit pressure and CO2. It computes trends and a time to breach, scores an early warning from zero to three against each astronaut's own baseline, and models blood viscosity. Every answer cites NASA standards and stays advisory."
**ES:** "El agente de salud vigila frecuencia cardíaca, SpO2, temperatura central, presión del traje y CO2. Calcula tendencias y un tiempo hasta la ruptura, puntúa una alerta temprana de cero a tres contra la línea base de cada astronauta y modela la viscosidad de la sangre. Cada respuesta cita estándares de la NASA y es solo asesoría."

### 3:22-3:47 Hydration Prospector
**EN:** "First model: Hydration Prospector. Trained on one thousand five hundred sixty-seven Curiosity neutron measurements plus orbital maps, it shows where hydrogen is more likely and how uncertain that is. Validation by 500 meter blocks gives a Spearman of 0.58. It is a relative indicator, not percent water."
**ES:** "Primer modelo: Hydration Prospector. Entrenado con mil quinientas sesenta y siete mediciones de neutrones de Curiosity y mapas orbitales, muestra dónde es más probable el hidrógeno y con qué incertidumbre. La validación por bloques de 500 metros da una correlación de Spearman de 0,58. Es un indicador relativo, no porcentaje de agua."

### 3:47-4:12 Storm Nowcaster
**EN:** "Second model: Storm Nowcaster. From twenty-eight pressure-tide features it forecasts dust opacity one to three sols ahead, with the Mars Year 34 global storm held out for testing. It beats seasonal climatology and works as an early-warning trend, not as a replacement for persistence."
**ES:** "Segundo modelo: Storm Nowcaster. Con veintiocho variables de mareas de presión pronostica la opacidad del polvo de uno a tres soles, con la tormenta global del año marciano 34 reservada para la prueba. Supera a la climatología estacional y sirve como tendencia de alerta temprana, no como reemplazo de la persistencia."

### 4:12-4:37 Mineral Vein Detector
**EN:** "Third model: Mineral Vein Detector. DINOv2 features and a logistic head flag bright-vein candidates in real Curiosity photos: ROC-AUC 0.85 on one hundred seventeen audited images, validated by sol. It points to where to drill; the mineral still needs a spectrometer."
**ES:** "Tercer modelo: Mineral Vein Detector. Características de DINOv2 y una cabeza logística marcan candidatas a vetas brillantes en fotos reales de Curiosity: ROC-AUC de 0,85 sobre ciento diecisiete imágenes auditadas, validado por sol. Indica dónde perforar; el mineral aún necesita un espectrómetro."

### 4:37-5:43 Rescue
**EN:** "The rescue vehicle reaches the pit, the robot descends, secures the harness and drags the astronaut up the ramp. The second astronaut boards, the ramp closes and the convoy returns to the base."
**ES:** "El vehículo de rescate llega al pozo, el robot desciende, asegura el arnés y arrastra al astronauta por la rampa. El segundo astronauta sube, se cierra la rampa y el convoy vuelve a la base."

### 5:43-5:58 Closing
**EN:** "Real NASA and USGS data, deterministic physics, three custom models, a verified multi-agent system and voice control of every operation. Tango Horizon: safety, autonomy and voice on Mars. Try it at tangohorizon.vercel.app."
**ES:** "Datos reales de NASA y USGS, física determinista, tres modelos propios, un sistema multi-agente verificado y control por voz de cada operación. Tango Horizon: seguridad, autonomía y voz en Marte. Pruébenlo en tangohorizon.vercel.app."
