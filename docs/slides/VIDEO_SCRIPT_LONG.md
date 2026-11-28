# Tango Horizon: long explained video, 12:35 (English voice)

Played by **Record + Play all** in the scenes panel (`/?present=1`); the order is `DECK_ORDER` in `web/src/demo/demoScenes.ts`: 29 scenes, 755 s. The voice is Google Cloud Text-to-Speech (neural, English), generated per block and laid over the recorded video at the start time of each scene. Each block must fit inside its scene: the estimate below assumes 2.45 words per second and a 1 s margin; the real audio length is measured after generation and the text is trimmed where it does not fit.

The first 20 seconds (`C0` and the start of `K1`) state the whole project: multi-agent AI, voice orchestration of robots, the GUARDIAN safety layer, and health and equipment monitoring with RAG for predictive maintenance.

| # | Time | Scene | Length | Words | Estimated voice |
|---|---|---|---|---|---|
| 1 | 0:00-0:14 | `C0` Cover | 14 s | 31 | 12.7 s |
| 2 | 0:14-0:44 | `K1` Capabilities | 30 s | 67 | 27.3 s |
| 3 | 0:44-0:55 | `P0` The problem | 11 s | 22 | 9.0 s |
| 4 | 0:55-1:15 | `S1` Base aerial | 20 s | 33 | 13.5 s |
| 5 | 1:15-1:45 | `S2` Where everyone is | 30 s | 52 | 21.2 s |
| 6 | 1:45-2:13 | `A1` Architecture | 28 s | 50 | 20.4 s |
| 7 | 2:13-3:01 | `U1` Helmet UI and voice demo | 48 s | 74 | 30.2 s |
| 8 | 3:01-3:39 | `W1` Voice order to drone | 38 s | 56 | 22.9 s |
| 9 | 3:39-4:16 | `G1` AI decisions and guardrails | 37 s | 50 | 20.4 s |
| 10 | 4:16-4:44 | `F1` Everything else | 28 s | 48 | 19.6 s |
| 11 | 4:44-5:09 | `S3` Accident close-up | 25 s | 36 | 14.7 s |
| 12 | 5:09-5:45 | `H1` Health monitoring | 36 s | 60 | 24.5 s |
| 13 | 5:45-6:07 | `V1` Voice order and dispatch | 22 s | 34 | 13.9 s |
| 14 | 6:07-6:23 | `T1` Storm alert | 16 s | 27 | 11.0 s |
| 15 | 6:23-6:40 | `O1` Operation map | 17 s | 30 | 12.2 s |
| 16 | 6:40-7:10 | `S4` Convoy and drone launch | 30 s | 46 | 18.8 s |
| 17 | 7:10-7:39 | `R1` Rescue flow | 29 s | 53 | 21.6 s |
| 18 | 7:39-8:12 | `L0` Life-support flow | 33 s | 44 | 18.0 s |
| 19 | 8:12-8:38 | `L1` Life-support launch | 26 s | 34 | 13.9 s |
| 20 | 8:38-8:56 | `T2` Storm, helmet view | 18 s | 32 | 13.1 s |
| 21 | 8:56-9:18 | `S5` Rescue vehicle arrives | 22 s | 36 | 14.7 s |
| 22 | 9:18-9:48 | `S6` Rescue and drag | 30 s | 44 | 18.0 s |
| 23 | 9:48-10:02 | `S7` Departure | 14 s | 18 | 7.3 s |
| 24 | 10:02-10:32 | `Q1` Predictive RAG | 30 s | 58 | 23.7 s |
| 25 | 10:32-10:57 | `M1` Hydration Prospector | 25 s | 47 | 19.2 s |
| 26 | 10:57-11:22 | `M2` Storm Nowcaster | 25 s | 44 | 18.0 s |
| 27 | 11:22-11:47 | `M3` Mineral Vein Detector | 25 s | 48 | 19.6 s |
| 28 | 11:47-12:20 | `ML1` The three models | 33 s | 41 | 16.7 s |
| 29 | 12:20-12:35 | `E1` Closing | 15 s | 32 | 13.1 s |

## Narration

Technical names are spelled for the voice (for example "A star", "dot").

### 1. `C0` Cover · starts 0:00 · 14 s
*On screen: the Starship pad, the project patch, the title card and the partner logos.*

> Tango Horizon is a multi-agent AI system that keeps astronauts safe on Mars. AI agents orchestrate every robot and drone by voice, and a safety layer, GUARDIAN, checks every action first.

### 2. `K1` Capabilities · starts 0:14 · 30 s
*On screen: the 12 core capabilities, one chip after another.*

> Other agents monitor each astronaut's health and the equipment, and use RAG, a search over NASA standards, to predict problems before they happen. It was built in Buenos Aires for the NASA Space Apps Challenge, in 48 hours, and it won the Impact category. Here is what it does: voice in five languages, autonomous rescue, a life-support cannon, three custom machine learning models, and real NASA terrain.

### 3. `P0` The problem · starts 0:44 · 11 s
*On screen: the base, then the rover; the 4 to 24 minute delay card.*

> Why local autonomy? Radio from Mars takes four to twenty-four minutes, and a leak or a dust storm cannot wait for Houston.

### 4. `S1` Base aerial · starts 0:55 · 20 s
*On screen: aerial view of the base.*

> This is the base in Gale Crater, built over real NASA terrain: the main habitat, solar panels, antennas, and the rocket launch site. Everything you see moves under the control of AI agents.

### 5. `S2` Where everyone is · starts 1:15 · 30 s
*On screen: the crew and the fleet.*

> Four astronauts work here. Two stay at base control. The other two, the driver and the geologist, are on a science traverse about one point seven kilometers away, in a pressurized rover. Around them, rovers, drones, a robot arm and a rescue robot are ready, each one with its own AI planner.

### 6. `A1` Architecture · starts 1:45 · 28 s
*On screen: the animated agent diagram.*

> Here is how the AI is organized. A spoken order goes to a fast agent on the suit, then to BASE, the orchestrator. BASE delegates to specialists for health, routes, science, weather and maintenance, and to one planner for every robot. GUARDIAN checks every action before the simulator moves anything.

### 7. `U1` Helmet UI and voice demo · starts 2:13 · 48 s
*On screen: first-person helmet view, the HUD panels lighting up, voice orders typed into the chat.*

> This is the astronaut's helmet. The interface shows the mission bar, life support, the environment, the crew tracker and the voice controls. Now the astronaut talks. Hands, pick up the dark basalt rock, and the arm robot drives over and lifts it. Drone one, come to my position, and GUARDIAN checks the flight path. Then simple questions: the air pressure outside, and the state of the suit, answered by the weather and health agents.

### 8. `W1` Voice order to drone · starts 3:01 · 38 s
*On screen: helmet view, the animated flow and the top-view map; two drones fly to the pit.*

> A spoken order, step by step. Drones, fly to the pit and keep watch from twenty-five meters. The suit's fast model reads the intent. BASE picks the two drones. Each drone plans its own path and altitude. GUARDIAN checks the corridor and the keep-out zone. Only then does the simulator send them. The astronaut only speaks.

### 9. `G1` AI decisions and guardrails · starts 3:39 · 37 s
*On screen: two orders walked through the rule check, the judge and the vote.*

> Three layers of safety. First, hard physical limits. Second, an AI judge. Third, for critical actions, three different models vote on their own. The life-support pod launch passes all three. When one model objects with high confidence, the decision goes to a human, and nothing moves until a person answers.

### 10. `F1` Everything else · starts 4:16 · 28 s
*On screen: twelve capability chips.*

> And there is more: the phone as a laser pointer and push-to-talk, camera vision, a robot arm with inverse kinematics, tethered drones, navigation without GPS, route planning over real terrain, nine NASA and USGS data sources, predictive maintenance, weather and radiation alerts, five languages and an offline fallback.

### 11. `S3` Accident close-up · starts 4:44 · 25 s
*On screen: the astronaut at the edge of the pit.*

> During the traverse, one astronaut slips at the edge of a four meter pit. The suit is damaged and starts to leak. Pressure drops, the heart rate climbs, and a dust storm is on its way.

### 12. `H1` Health monitoring · starts 5:09 · 36 s
*On screen: pit close-up, the health card, falling vitals and the alarm.*

> The health agent watches heart rate, oxygen saturation, core temperature, suit pressure and CO2. When the numbers fall it computes how many minutes are left and raises an early warning from one to three. At three, the alarm goes off, the agent explains why, citing the NASA standard, and tells BASE. It is advisory only: it never replaces a doctor.

### 13. `V1` Voice order and dispatch · starts 5:45 · 22 s
*On screen: the voice exchange, coordinates, rescue-1 and the drones leaving.*

> The astronaut reports the fall by voice. BASE sends the rescue vehicle, the rescue robot and both drones, and GUARDIAN approves the route. The coordinates appear on screen while the robots are already moving.

### 14. `T1` Storm alert · starts 6:07 · 16 s
*On screen: satellite-style top view, the storm alert and the animated forecast chart.*

> From above, the base sees the dust storm front. The Storm Nowcaster forecasts opacity three sols ahead, walking back is no-go, and the decision is to rescue.

### 15. `O1` Operation map · starts 6:23 · 17 s
*On screen: the big map with the rescue route.*

> This is the operation map. The rescue vehicle follows a route found by A star over the terrain slopes, while the rovers, the drones and the four astronauts update live.

### 16. `S4` Convoy and drone launch · starts 6:40 · 30 s
*On screen: the convoy leaving the base, the drones taking off, dust behind the vehicle.*

> The convoy leaves the base. The rescue vehicle crosses almost two kilometers of Martian terrain with the rescue robot in its rear bay, while two drones climb and fly ahead to watch the pit from twenty-five meters. The vehicle leaves a trail of dust behind it.

### 17. `R1` Rescue flow · starts 7:10 · 29 s
*On screen: wide aerial view and the animated alarm-to-extraction flow.*

> The whole rescue as one flow. The health agent raises the alarm, BASE decides, the planners pick a safe route and a storm window, every robot plans its own motion, and GUARDIAN approves each action. Then the vehicle, the drones and the rescue robot move, hook the harness, and drag the astronaut back.

### 18. `L0` Life-support flow · starts 7:39 · 33 s
*On screen: the animated chain from alarm to cannon.*

> Before the cannon fires, a chain runs. The health agent sees oxygen falling, BASE decides to launch, the launcher solves the ballistics for gravity, drag and wind, and GUARDIAN confirms the pod lands outside the fifteen meter keep-out. Only then does the cannon fire.

### 19. `L1` Life-support launch · starts 8:12 · 26 s
*On screen: the cannon shot, the pod with its parachute, the life-support panel recovering.*

> The life-support cannon fires an eight kilogram pod. The parachute opens, the pod lands upright beside the astronaut, and its oxygen tank, CO2 scrubber and battery are connected. The pressure and oxygen panel recovers.

### 20. `T2` Storm, helmet view · starts 8:38 · 18 s
*On screen: the dust storm from the helmet; two astronauts and the towing robot.*

> Inside the storm, from the astronaut's helmet. Visibility is very low and the drones are grounded. Two astronauts walk to the rescue vehicle by its floodlights while the robot tows the casualty.

### 21. `S5` Rescue vehicle arrives · starts 8:56 · 22 s
*On screen: the vehicle at the pit rim, the ramp opening, the robot driving out.*

> The rescue vehicle stops at the safe distance from the pit rim and opens its ramp. The rescue robot reverses out of the bay, drives to the rim, and descends the access ramp into the pit.

### 22. `S6` Rescue and drag · starts 9:18 · 30 s
*On screen: the robot hooks the harness and drags the casualty up the ramp.*

> The robot reaches the astronaut, hooks the harness, and raises its arm for the drag. Then it pulls the astronaut up the ramp on a wheeled stretcher, back to the vehicle, while the dust opacity keeps rising. The astronaut is now in the bay.

### 23. `S7` Departure · starts 9:48 · 14 s
*On screen: the ramp closing and the convoy leaving.*

> The ramp closes and the second astronaut is aboard. The convoy leaves for the base through the storm.

### 24. `Q1` Predictive RAG · starts 10:02 · 30 s
*On screen: the predictive RAG card.*

> Predictive RAG: a search over more than a thousand chunks of NASA documents, in under two milliseconds. It tells the health agent how many minutes are left, the maintenance agent how much useful life a part has, and the weather agent when to act early. Every answer cites its document and page. It is advisory, never a diagnosis.

### 25. `M1` Hydration Prospector · starts 10:32 · 25 s
*On screen: the hydration terrain layer and the model card.*

> Model one: Hydration Prospector. Trained on one thousand five hundred sixty-seven Curiosity neutron measurements plus orbital maps, it shows where hydrogen is more likely and how uncertain that is. Blocked validation gives a Spearman of zero point five eight. It is a relative indicator, not percent water.

### 26. `M2` Storm Nowcaster · starts 10:57 · 25 s
*On screen: the base in dust and the model card.*

> Model two: Storm Nowcaster. From twenty-eight pressure-tide features it forecasts dust opacity one to three sols ahead, with the Mars Year 34 global storm held out for testing. It beats seasonal climatology, and works as an early warning, not as a replacement for persistence.

### 27. `M3` Mineral Vein Detector · starts 11:22 · 25 s
*On screen: the rover orbit and the model card.*

> Model three: Mineral Vein Detector. DINOv2 features and a logistic head flag bright-vein candidates in real Curiosity photos, with an ROC AUC of zero point eight five on one hundred seventeen audited images, validated by sol. It points to where to drill; the mineral still needs a spectrometer.

### 28. `ML1` The three models · starts 11:47 · 33 s
*On screen: the three model cards side by side.*

> The three models together, all trained on real NASA data: water, dust storms and mineral veins. Each one reports its limits, so the crew knows what it can and cannot decide. They feed the same AI team that runs the base.

### 29. `E1` Closing · starts 12:20 · 15 s
*On screen: the Starship pad, the patch, the logos and the links.*

> Real NASA data, three custom models, a multi-agent AI system and voice control of every operation. Tango Horizon: safety, autonomy and voice on Mars. Try it at tangohorizon dot vercel dot app.
