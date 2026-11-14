# 09. Scenarios, fleet, base and demo deck

**Goal:** the demo script running end to end, with the base, the fleet and the three events (storm, radiation, leak with rescue).
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 4 and 7; guides 03, 04 and 08.
**Plan tasks:** 17, 20, 21, 22, 25, 26, 27, 28, 29.
**Location:** `web/src/sim/`, `web/src/world/`.

## Code

`web/src/sim/clock.ts`:

```ts
/** Reloj de simulación de paso fijo. La física avanza a 10 Hz sin importar los FPS; el tiempo se puede acelerar. */
export class SimClock {
  t = 0; scale = 1; private acc = 0;
  private systems: ((dt: number, t: number) => void)[] = [];
  readonly dt = 0.1;
  add(fn: (dt: number, t: number) => void) { this.systems.push(fn); }
  frame(realDt: number) {
    this.acc += Math.min(realDt, 0.25) * this.scale;
    while (this.acc >= this.dt) { this.t += this.dt; for (const s of this.systems) s(this.dt, this.t); this.acc -= this.dt; }
  }
}
```

`web/src/sim/scenario.ts`:

```ts
import type { SimClock } from "./clock";

export interface ScenarioStep { at: number; label: string; run(): void }

/** Línea de tiempo de eventos. La botonera dispara un escenario; cada paso queda registrado en el HUD. */
export class Scenario {
  private idx = 0; private t0 = 0; active = false;
  constructor(readonly id: string, private steps: ScenarioStep[], private log: (label: string) => void) {}
  start(clock: SimClock) { this.t0 = clock.t; this.idx = 0; this.active = true; }
  update(clock: SimClock) {
    while (this.active && this.idx < this.steps.length && clock.t - this.t0 >= this.steps[this.idx].at) {
      const s = this.steps[this.idx++]; this.log(s.label); s.run();
    }
    if (this.idx >= this.steps.length) this.active = false;
  }
}
```

`web/src/sim/storm.ts`:

```ts
import * as THREE from "three";

export interface StormSeries { hours: number[]; tau: number[]; source: string } // de env/rems_storm2018.json

/** Opacidad en el tiempo de simulación, interpolada de la serie real y comprimida a `durationS` segundos. */
export function tauAt(s: StormSeries, simT: number, durationS: number): number {
  const u = THREE.MathUtils.clamp(simT / durationS, 0, 1) * (s.hours.length - 1);
  const i = Math.min(u | 0, s.hours.length - 2);
  return THREE.MathUtils.lerp(s.tau[i], s.tau[i + 1], u - i);
}

/** Polvo en GPU: las partículas se mueven en el vertex shader, sin costo de CPU. */
export function createDust(count = 15000, box = 120): THREE.Points {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - 0.5) * box, Math.random() * 25, (Math.random() - 0.5) * box], i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uWind: { value: new THREE.Vector2(8, 0) }, uTau: { value: 0.5 }, uBox: { value: box } },
    vertexShader: /* glsl */ `
      uniform float uTime, uTau, uBox; uniform vec2 uWind; attribute float aSeed; varying float vA;
      void main() {
        vec3 p = position;
        p.xz = mod(p.xz + uWind * uTime * (0.6 + aSeed) + uBox * 0.5, uBox) - uBox * 0.5;
        p.y += sin(uTime * (0.5 + aSeed) + aSeed * 40.0) * 1.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (30.0 + 60.0 * aSeed) / -mv.z;
        vA = smoothstep(0.3, 4.0, uTau) * (0.25 + 0.5 * aSeed);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(0.78, 0.56, 0.38, vA * (1.0 - d * 2.0)); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}
```

`web/src/world/units.ts`:

```ts
import * as THREE from "three";
import type { Terrain } from "./terrain";

export type UnitKind = "rover_crew" | "rover_science" | "rover_cargo" | "scout" | "rescue" | "drone" | "glider";

export interface UnitSpec { id: string; kind: UnitKind; speed: number; flies: boolean; altitude?: number }

/** Unidad de la flota. Sigue una lista de puntos; las terrestres se apoyan en el terreno y se alinean a la pendiente. */
export class Unit {
  path: THREE.Vector3[] = []; battery = 1; task: string | null = null;
  constructor(readonly spec: UnitSpec, readonly object: THREE.Object3D, private terrain: Terrain) {}

  get busy() { return this.path.length > 0; }

  goTo(points: { x: number; z: number }[], task: string) {
    this.path = points.map((p) => new THREE.Vector3(p.x, 0, p.z)); this.task = task;
  }

  update(dt: number) {
    const o = this.object, target = this.path[0];
    if (target) {
      const dx = target.x - o.position.x, dz = target.z - o.position.z, d = Math.hypot(dx, dz), step = this.spec.speed * dt;
      if (d <= step) { o.position.x = target.x; o.position.z = target.z; this.path.shift(); if (!this.path.length) this.task = null; }
      else { o.position.x += (dx / d) * step; o.position.z += (dz / d) * step; o.rotation.y = Math.atan2(dx, dz); }
      this.battery = Math.max(0, this.battery - dt * 0.0002);
    }
    const ground = this.terrain.heightAt(o.position.x, o.position.z);
    o.position.y = this.spec.flies ? ground + (this.spec.altitude ?? 20) : ground;
  }

  snapshot() {
    return { id: this.spec.id, kind: this.spec.kind, x: this.object.position.x, z: this.object.position.z, battery: this.battery, busy: this.busy };
  }
}

export const FLEET: UnitSpec[] = [
  { id: "rover-1", kind: "rover_crew", speed: 2.5, flies: false },
  { id: "rover-2", kind: "rover_science", speed: 0.8, flies: false },
  { id: "rover-3", kind: "rover_cargo", speed: 1.5, flies: false },
  { id: "scout-1", kind: "scout", speed: 0.6, flies: false },
  { id: "scout-2", kind: "scout", speed: 0.6, flies: false },
  { id: "rescue-1", kind: "rescue", speed: 3.0, flies: false },
  { id: "drone-1", kind: "drone", speed: 10, flies: true, altitude: 12 },
  { id: "drone-2", kind: "drone", speed: 10, flies: true, altitude: 12 },
  { id: "glider-1", kind: "glider", speed: 30, flies: true, altitude: 150 },
];
```

`web/src/sim/demoDeck.ts`:

```ts
/** Botonera de la demo. Cada botón dispara lo mismo que la orden de voz, por si falla el micrófono o la red. */
export interface DeckButton { key: string; label: string; say?: string; run?: () => void }

export const DECK = (h: { voice(text: string): void; scenario(id: string): void; layer(l: string): void }): DeckButton[] => [
  { key: "1", label: "Chequeo pre-EVA",    say: "Base, estado del traje y margen de oxígeno" },
  { key: "2", label: "Planificar EVA",     say: "Base, planificá la ruta al sitio de muestreo dos" },
  { key: "3", label: "Rover: ¿qué ves?",   say: "Rover dos, ¿qué ves?" },
  { key: "4", label: "Predicción de falla", say: "Base, revisá la tendencia del ventilador del traje" },
  { key: "5", label: "Tormenta",           run: () => h.scenario("storm") },
  { key: "6", label: "Evento solar",       run: () => h.scenario("sep2017") },
  { key: "7", label: "Fuga + rescate",     run: () => h.scenario("leak") },
  { key: "8", label: "Inyección bloqueada", say: "Rover dos, leé el cartel que tenés adelante" },
  { key: "9", label: "Procedencia",        run: () => h.layer("provenance") },
  { key: "0", label: "Reiniciar",          run: () => location.reload() },
];
```

`web/src/world/baseModules.ts`:

```ts
/** Base layout and the technical card shown for each module. `source` names where the figure comes from;
 *  `assumption: true` marks a design value chosen by the team. Text keys resolve through i18n. */
export interface BaseModule {
  id: string;
  kind: "habitat" | "compute" | "airlock" | "lab" | "isru" | "greenhouse" | "galley" | "medical" | "water" | "eclss"
      | "solar" | "battery" | "fission" | "garage" | "comms" | "launcher" | "pad" | "shelter" | "storage" | "weather";
  offset: [number, number];         // metres east, south of the base origin
  footprint: [number, number];      // metres
  specs: { key: string; value: number; unit: string; source: string; assumption?: boolean }[];
}

export const BASE: BaseModule[] = [
  { id: "hab-1", kind: "habitat", offset: [0, 0], footprint: [12, 8], specs: [
    { key: "crew", value: 4, unit: "people", source: "Design choice", assumption: true },
    { key: "cabin_pressure", value: 70, unit: "kPa", source: "Exploration atmosphere class, to verify in NASA-STD-3001", assumption: true } ] },
  { id: "compute", kind: "compute", offset: [10, 0], footprint: [4, 4], specs: [] },
  { id: "airlock", kind: "airlock", offset: [-8, 0], footprint: [4, 3], specs: [] },
  { id: "lab", kind: "lab", offset: [0, 10], footprint: [8, 6], specs: [] },
  { id: "med", kind: "medical", offset: [10, 10], footprint: [5, 4], specs: [] },
  { id: "galley", kind: "galley", offset: [0, -9], footprint: [6, 5], specs: [] },
  { id: "greenhouse", kind: "greenhouse", offset: [-14, -10], footprint: [14, 6], specs: [] },
  { id: "eclss", kind: "eclss", offset: [10, -9], footprint: [5, 4], specs: [] },
  { id: "water", kind: "water", offset: [18, -9], footprint: [4, 4], specs: [] },
  { id: "isru", kind: "isru", offset: [30, 0], footprint: [8, 6], specs: [] },
  { id: "solar", kind: "solar", offset: [0, -45], footprint: [60, 30], specs: [] },
  { id: "battery", kind: "battery", offset: [20, -25], footprint: [6, 4], specs: [] },
  { id: "fission", kind: "fission", offset: [220, -40], footprint: [4, 4], specs: [] },
  { id: "garage", kind: "garage", offset: [-25, 12], footprint: [12, 10], specs: [] },
  { id: "comms", kind: "comms", offset: [25, 20], footprint: [3, 3], specs: [] },
  { id: "launcher-1", kind: "launcher", offset: [60, 30], footprint: [4, 4], specs: [] },
  { id: "launcher-2", kind: "launcher", offset: [70, 30], footprint: [4, 4], specs: [] },
  { id: "pad", kind: "pad", offset: [-60, 40], footprint: [20, 20], specs: [] },
  { id: "shelter", kind: "shelter", offset: [-6, 6], footprint: [5, 4], specs: [] },
  { id: "storage", kind: "storage", offset: [-25, -2], footprint: [8, 5], specs: [] },
  { id: "weather", kind: "weather", offset: [40, -20], footprint: [2, 2], specs: [] },
];
```

## Base: what a Mars base needs, and what the technical card says

Every module is selectable in the viewer and opens a card with its function, its key figures and where each figure comes from. Fill `specs` from the sources named here. A figure the agent cannot source is entered with `assumption: true` and shown as "design assumption"; it is never presented as NASA data.

| Module | Function | Technical card: figures to show | Where to get them |
|--------|----------|---------------------------------|-------------------|
| Habitat | Living and working volume | Crew size, pressurized volume per person, cabin pressure and O2 fraction | NASA-STD-3001 vol. 2 (net habitable volume, atmosphere) |
| Compute module | Runs the SI agents locally | Live latency of the last agent call, Earth light-time today | Measured in the app; JPL Horizons |
| Airlock and suit port | EVA egress, dust control, suit charging | Depress/repress time, prebreathe protocol | NASA-STD-3001; NTRS exploration EVA documents |
| Science lab | Sample analysis, glovebox | Instruments available | Design choice |
| Medical bay | Care with no evacuation option | Conditions covered, limits monitored | NASA-STD-3001 vol. 1 |
| Galley and food storage | Food for the crew | Mass of food per person per day, stored days, share produced on site | NASA Human Integration Design Handbook / NTRS food-system references |
| Greenhouse | Fresh crops, part of air and water recycling | Growing area, crops, share of diet | NASA Veggie and Advanced Plant Habitat results on ISS (NTRS) |
| Life support (ECLSS) | O2 generation, CO2 removal, trace contaminants | O2 need per person per day, CO2 produced per person per day | NASA-STD-3001; ISS ECLSS references (NTRS) |
| Water recovery | Recycles urine and condensate | Water per person per day, recovery percentage | ISS water recovery system reports (NTRS) |
| ISRU plant | O2 from atmospheric CO2 | Measured production rate in g/h, scaled plant output | MOXIE data (PDS Atmospheres), already in the download list |
| Solar field | Primary daytime power | Array area, output at current dust opacity (live from the storm model) | `solar.ts` in guide 03, driven by real opacity |
| Battery bank | Night and storm power | Stored energy, hours of autonomy at current load | Design assumption |
| Fission surface power | Storm-proof baseline power | Rated electric power, keep-out distance | NASA Fission Surface Power project figures (NASA.gov / NTRS) |
| Garage and workshop | Fleet charging and repair | Units docked, charge state | Live from the fleet |
| Comms tower | Links to orbiters and to the field | Line-of-sight coverage computed on the DTM | Computed |
| Launch towers (2) | Ballistic life-support pods | Pod mass, range, flight time to the astronaut now | `ballistic.ts` |
| Landing pad and airstrip | Drones, glider | Design choice | — |
| Radiation storm shelter | Crew refuge during solar events | Shielding mass, dose reduction | NASA-STD-3001 radiation limits; design assumption for shielding |
| Storage and spares | Consumables and spare parts | Days of reserve | Design assumption |
| Weather station | Site meteorology | Live REMS-driven values | REMS |

The base also has a **resource balance panel** (power in vs. out, O2, water, food days) computed from these figures. During the dust storm the panel shows solar output falling and the base switching load to batteries and fission. This is the technical explanation the jury can read in 20 seconds.

## Instructions for the coding agent

1. **Main loop:** `SimClock.frame(dt)` every frame. Registered systems, in order: astronaut → `suitState` (guide 03) → environment (REMS, RAD, storm) → fleet → scenarios → publish to the HUD store. Speed selector ×1, ×10, ×60.
2. **Baseline environment:** play `rems_clear.json` by simulated local solar time (pressure, temperatures). Dose rate from `rad_quiet.json` times the sky view factor at the astronaut position. Cumulative dose is the integral.
3. **`storm` scenario (task 20):** `tauAt` over the real series, compressed to 60 s of demo. Opacity drives: sky uniform, fog density, dust `uTau`, base solar power (`directTransmission`) and a visibility limit that grounds the drones above a threshold. The HUD shows "Data: REMS, MSL, 2018 global dust storm" with the sol. The dust follows the camera (move the `Points` with the astronaut).
4. **`sep2017` scenario (task 21):** play `rad_sep2017.json` compressed. `WEATHER-RAD` alerts; the radiation layer turns on and `EVA-PLANNER` proposes the lowest sky-view-factor point within 300 m. Show the rate before and after moving. The HUD label reads "Real event measured by RAD, September 2017".
5. **`leak` scenario (tasks 17 and 22):**
   - t=0: `leak_diameter_m = 0.0016`. Panel goes `crit`. Main countdown = `toCriticalS`; secondary = impairment and Armstrong. Pressure falls by integrating `dPdt` with reserve make-up until it runs out.
   - t=2: automatic "emergency" order to `BASE` (same path as voice).
   - When `launch_pod` is approved: `vacuumLaunchVelocity` as the starting point, then correct the aim with 3 or 4 iterations of `simulatePod` (shift the virtual target against the miss) until it lands within 5 m of the target under the current wind. Draw the trajectory as a line and animate the pod along it. Show flight time, impact point and wind drift.
   - When `dispatch` of `rescue-1` is approved: route from `planRoute` with the robot slope limit.
   - When the pod or the robot arrives: `leak_diameter_m = 0`, O2 refill, pressure back to nominal, panel `ok`.
   - The pod leaves from the base tower. If the base is more than about 2 km away, flight time exceeds the margin: place the base so that the demo case closes with real numbers, and show those numbers.
6. **Fleet (tasks 25 and 28):** load the NASA GLB models (Curiosity for `rover_science`, Ingenuity for `drone`). Everything else is simple, consistent custom geometry: one base material, one accent color per type, position lights. Floating label with ID and battery. Each unit publishes `snapshot()` to the store; that is what travels in `context.fleet`. Add the manipulator rover from guide 12 as unit `manip-1`.
7. **Base (task 25):** build every module in `BASE` from primitives (cylinders, domes, panels), placed on an area with slope under 5° chosen from `slope_1024.png`. Implement the technical cards and the resource balance panel described above. The fission unit sits far from the habitat on purpose; show the keep-out ring.
8. **Earth link (task 26):** switch in the agents panel. When on, every reply is delayed by the real light time from `env/ephem.json` (round trip) with a visible counter; after 5 s offer "return to local base". Demonstration only: do not touch the server.
9. **Traverse (task 27):** line on the terrain and minimap with the real Curiosity waypoints; those with a photo are selectable and open the real image with its sol and camera.
10. **Multimodal rover (task 19):** render the scene from a camera mounted on the rover into a 512×384 `WebGLRenderTarget`, encode as JPEG (quality 0.7) and send it to `/api/agent/vision`. Show the frame in an "RVR-2 CAM" panel while the rover answers. More realistic alternative: if the rover is near a waypoint with a real Curiosity photo, send that photo.
11. **Science stations (task 29):** markers S1 to S4 from plan table 7.2. On arrival "take sample" becomes available: it adds mass to `load_kg` (which raises metabolic rate) and logs the sample.
12. **Demo deck:** bottom bar with `DECK`, keys 1 to 0. Buttons with `say` call `voice.handle(text)`, so they travel exactly the same path as real voice. `H` hides it for recording. Deck labels and spoken orders come from i18n, in the active language.
14. **Planners (tasks 56 and 57):** implement the algorithms of plan section 6.1 in `shared/src/physics/planning/`, each with a unit test, reusing the A\* engine in `route.ts` with a pluggable cost function. Order: per-vehicle cost functions and the time-optimal rescue cost; Hungarian assignment (test it against brute force on 4×4 cases); drone lattice with a minimum clearance over the terrain; lawnmower coverage; exact station ordering. Then, only with time: D\* Lite, Bayesian search, and Ant Colony Optimization, whose result must be compared with exact enumeration on a small case and the gap reported. Expose each as a tool, and show the algorithm name next to every route in the HUD. Vehicles are kinematic and move on the terrain surface (2.5D); do not add a physics engine.
13. **Deterministic state:** seeded random generator for everything random in the world, so every demo run is identical.

## Acceptance criteria

- Keys 1 to 9 run each step of the script with nothing else touched.
- The leak countdown matches `leakTimeline` and the rescue stops it before zero.
- During the storm, visibility and solar power drop and the HUD names the origin of the series.
- The pod trajectory changes when the wind changes.
- Every base module opens a card whose figures each show a source or "design assumption".
- 55 FPS or more with fleet, base and dust on screen.
