# 03. Physics core

**Goal:** deterministic, tested TypeScript modules with no DOM dependency, used by the front end (HUD) and by the server (agent tools).
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` section 6 and table 2.1.
**Plan tasks:** 11, 17, 22, 30.
**Location:** `shared/src/physics/`.

Rule: SI units everywhere in code. Convert only for display. Every constant has a source or is flagged as a design assumption in `constants.ts`.

## Code

`constants.ts`:

```ts
/** Cada constante lleva fuente. `assumption: true` = supuesto de diseño, se muestra así en el panel de procedencia. */
export interface Const { value: number; unit: string; source: string; assumption?: boolean }

export const C = {
  g_mars:        { value: 3.711,   unit: "m/s^2",    source: "NASA Mars Fact Sheet (NSSDCA)" },
  g_earth:       { value: 9.80665, unit: "m/s^2",    source: "CODATA" },
  R_o2:          { value: 259.84,  unit: "J/(kg K)", source: "R universal / masa molar O2" },
  R_mars_atm:    { value: 191.8,   unit: "J/(kg K)", source: "NASA Mars Fact Sheet, masa molar media 43,34 g/mol" },
  gamma_o2:      { value: 1.4,     unit: "-",        source: "Gas diatómico ideal" },
  scale_height:  { value: 11100,   unit: "m",        source: "NASA Mars Fact Sheet" },
  o2_energy:     { value: 20100,   unit: "J/L",      source: "Equivalente calórico del O2 a RQ ~0,85" },
  o2_density:    { value: 1.429,   unit: "g/L",      source: "O2 a 0 °C y 1 atm" },
  rq:            { value: 0.85,    unit: "-",        source: "Dieta mixta", assumption: true },
  p_armstrong:   { value: 6270,    unit: "Pa",       source: "Presión de vapor del agua a 37 °C (47 mmHg)" },
  p_h2o_alv:     { value: 6270,    unit: "Pa",       source: "Presión de vapor alveolar a 37 °C" },
  p_co2_alv:     { value: 5330,    unit: "Pa",       source: "PaCO2 normal, 40 mmHg" },
  pao2_impaired: { value: 8000,    unit: "Pa",       source: "PAO2 ~60 mmHg: inicio de deterioro", assumption: true },
  pao2_critical: { value: 4000,    unit: "Pa",       source: "PAO2 ~30 mmHg: pérdida de conciencia", assumption: true },
  suit_p_nominal:{ value: 29600,   unit: "Pa",       source: "4,3 psi, presión nominal de EVA de NASA" },
  suit_volume:   { value: 0.135,   unit: "m^3",      source: "Volumen libre del traje", assumption: true },
  suit_mass:     { value: 65,      unit: "kg",       source: "Traje marciano de superficie", assumption: true },
  discharge_cd:  { value: 0.62,    unit: "-",        source: "Orificio de borde vivo" },
} as const satisfies Record<string, Const>;
```

`metabolic.ts`:

```ts
import { C } from "./constants.js";

export interface WalkInput {
  bodyKg: number;        // masa del astronauta
  loadKg: number;        // traje + herramientas + muestras
  speed: number;         // m/s
  gradePct: number;      // pendiente en %, negativa cuesta abajo
  terrain: number;       // coeficiente de terreno de Pandolf: 1.0 firme ... 2.1 arena suelta
  g?: number;            // m/s^2
}

/**
 * Pandolf et al. (1977) con corrección de bajada de Santee et al. (2001).
 * Supuesto de diseño: los términos de peso se escalan por g/g_tierra. No hay
 * validación experimental en 0,38 g con traje presurizado; se muestra como tal.
 */
export function metabolicRateW(i: WalkInput): number {
  const k = (i.g ?? C.g_mars.value) / C.g_earth.value;
  const W = i.bodyKg, L = i.loadKg, v = i.speed, G = i.gradePct, n = i.terrain;
  const standing = 1.5 * W;                          // sin escalar: no depende del peso soportado
  const loadTerm = 2.0 * (W + L) * (L / W) ** 2 * k;
  const move = n * (W + L) * k * (1.5 * v * v + 0.35 * v * Math.max(G, 0));
  let M = standing + loadTerm + move;
  if (G < 0 && v > 0) {
    const cf = n * ((G * (W + L) * k * v) / 3.5 - ((W + L) * k * (G + 6) ** 2) / W + (25 - v * v));
    M = standing + loadTerm + n * (W + L) * k * (1.5 * v * v + 0.35 * v * G) - cf;
  }
  return Math.max(M, standing);
}

export const o2LitersPerMin = (watts: number) => (watts * 60) / C.o2_energy.value;
export const o2KgPerHour = (watts: number) => (o2LitersPerMin(watts) * 60 * C.o2_density.value) / 1000;
export const co2LitersPerMin = (watts: number) => o2LitersPerMin(watts) * C.rq.value;

/** Clase térmica THEMIS (0 suelto, 1 medio, 2 roca) → coeficiente de terreno. Supuesto de diseño. */
export const terrainFromThermalClass = (c: 0 | 1 | 2) => [2.1, 1.5, 1.1][c];
```

`suitLeak.ts`:

```ts
import { C } from "./constants.js";

const crit = (g: number) => (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)));

/** ¿El flujo por el orificio está estrangulado? Requiere P_ext/P_traje por debajo de la relación crítica. */
export function isChoked(pSuit: number, pAmbient: number, gamma = C.gamma_o2.value): boolean {
  return pAmbient / pSuit < (2 / (gamma + 1)) ** (gamma / (gamma - 1));
}

/** Caudal másico por un orificio estrangulado, kg/s. */
export function leakMassFlow(pSuit: number, holeDiameterM: number, tempK = 293): number {
  const A = (Math.PI / 4) * holeDiameterM ** 2;
  const g = C.gamma_o2.value;
  return C.discharge_cd.value * A * pSuit * Math.sqrt(g / (C.R_o2.value * tempK)) * crit(g);
}

/** dP/dt isotérmico del traje. makeupKgS = aporte del regulador; metabolicKgS = consumo del astronauta. */
export function dPdt(pSuit: number, holeDiameterM: number, makeupKgS: number, metabolicKgS: number, tempK = 293): number {
  const out = leakMassFlow(pSuit, holeDiameterM, tempK) + metabolicKgS;
  return ((C.R_o2.value * tempK) / C.suit_volume.value) * (makeupKgS - out);
}

/** Tiempo analítico hasta pTarget sin aporte ni consumo metabólico, en s. */
export function timeToPressure(p0: number, pTarget: number, holeDiameterM: number, tempK = 293): number {
  if (pTarget >= p0) return 0;
  const A = (Math.PI / 4) * holeDiameterM ** 2;
  const g = C.gamma_o2.value;
  const tau = C.suit_volume.value / (C.discharge_cd.value * A * Math.sqrt(g * C.R_o2.value * tempK) * crit(g));
  return tau * Math.log(p0 / pTarget);
}

/** PO2 alveolar respirando 100 % O2: PAO2 = P_traje − PH2O − PaCO2. */
export const alveolarPO2 = (pSuit: number) => pSuit - C.p_h2o_alv.value - C.p_co2_alv.value;

/** Presión de traje a la que la PAO2 llega al umbral dado. */
export const suitPressureForPAO2 = (pao2: number) => pao2 + C.p_h2o_alv.value + C.p_co2_alv.value;

export interface LeakTimeline { toImpairedS: number; toCriticalS: number; toArmstrongS: number }

export function leakTimeline(p0: number, holeDiameterM: number, tempK = 293): LeakTimeline {
  return {
    toImpairedS: timeToPressure(p0, suitPressureForPAO2(C.pao2_impaired.value), holeDiameterM, tempK),
    toCriticalS: timeToPressure(p0, suitPressureForPAO2(C.pao2_critical.value), holeDiameterM, tempK),
    toArmstrongS: timeToPressure(p0, C.p_armstrong.value, holeDiameterM, tempK),
  };
}
```

`atmosphere.ts`:

```ts
import { C } from "./constants.js";

/** Densidad en superficie desde presión y temperatura medidas por REMS, kg/m^3. */
export const surfaceDensity = (pPa: number, tK: number) => pPa / (C.R_mars_atm.value * tK);

/** Densidad a altura h sobre la superficie local, modelo exponencial. */
export const densityAt = (rho0: number, hM: number) => rho0 * Math.exp(-hM / C.scale_height.value);

/** Viento con perfil logarítmico. z0 = rugosidad (0,01 m típico de llanura rocosa; supuesto de diseño). */
export function windAt(hM: number, refSpeed: number, refH = 1.6, z0 = 0.01): number {
  if (hM <= z0) return 0;
  return (refSpeed * Math.log(hM / z0)) / Math.log(refH / z0);
}

/** Transmisión del haz solar directo con opacidad tau y coseno del ángulo cenital mu. */
export const directTransmission = (tau: number, mu: number) => (mu <= 0 ? 0 : Math.exp(-tau / mu));
```

`ballistic.ts`:

```ts
import { C } from "./constants.js";
import { densityAt, windAt } from "./atmosphere.js";

export type Vec3 = [number, number, number]; // x este, y norte, z arriba; metros

export interface PodParams { massKg: number; cd: number; areaM2: number }
export interface PodEnv { rho0: number; windRef: number; windDirRad: number; groundZ: (x: number, y: number) => number }
export interface PodState { t: number; p: Vec3; v: Vec3 }

function accel(p: Vec3, v: Vec3, pod: PodParams, env: PodEnv): Vec3 {
  const h = Math.max(p[2] - env.groundZ(p[0], p[1]), 0);
  const w = windAt(h, env.windRef);
  const rel: Vec3 = [v[0] - w * Math.cos(env.windDirRad), v[1] - w * Math.sin(env.windDirRad), v[2]];
  const s = Math.hypot(...rel);
  const k = (-0.5 * densityAt(env.rho0, h) * pod.cd * pod.areaM2 * s) / pod.massKg;
  return [k * rel[0], k * rel[1], k * rel[2] - C.g_mars.value];
}

/** Integra con RK4 hasta tocar el suelo. Devuelve la trayectoria muestreada. */
export function simulatePod(p0: Vec3, v0: Vec3, pod: PodParams, env: PodEnv, dt = 0.05, maxT = 600): PodState[] {
  const out: PodState[] = [{ t: 0, p: p0, v: v0 }];
  let p = p0, v = v0, t = 0;
  const add = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  while (t < maxT) {
    const a1 = accel(p, v, pod, env);
    const v2 = add(v, a1, dt / 2), a2 = accel(add(p, v, dt / 2), v2, pod, env);
    const v3 = add(v, a2, dt / 2), a3 = accel(add(p, v2, dt / 2), v3, pod, env);
    const v4 = add(v, a3, dt), a4 = accel(add(p, v3, dt), v4, pod, env);
    p = [0, 1, 2].map((i) => p[i] + (dt / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i])) as Vec3;
    v = [0, 1, 2].map((i) => v[i] + (dt / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i])) as Vec3;
    t += dt;
    if (p[2] <= env.groundZ(p[0], p[1])) { out.push({ t, p, v }); break; }
    if (out.length < 4000) out.push({ t, p, v });
  }
  return out;
}

/** Velocidad inicial en vacío para caer en el blanco con ángulo de elevación dado. Punto de partida para apuntar. */
export function vacuumLaunchVelocity(from: Vec3, to: Vec3, elevRad: number): Vec3 | null {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const d = Math.hypot(dx, dy);
  const denom = 2 * Math.cos(elevRad) ** 2 * (d * Math.tan(elevRad) - dz);
  if (denom <= 0) return null;
  const s = Math.sqrt((C.g_mars.value * d * d) / denom);
  return [(s * Math.cos(elevRad) * dx) / d, (s * Math.cos(elevRad) * dy) / d, s * Math.sin(elevRad)];
}
```

`route.ts`:

```ts
import { metabolicRateW, o2KgPerHour } from "./metabolic.js";

export interface Grid {
  n: number; cellM: number;
  z: Float32Array;        // elevación, n*n
  terrain: Float32Array;  // coeficiente de Pandolf, n*n
  doseRel: Float32Array;  // sky view factor 0..1, n*n
}
export interface RouteOpts { bodyKg: number; loadKg: number; speed: number; maxSlopeDeg: number; doseWeight: number }
export interface RouteResult { path: number[]; distanceM: number; timeS: number; energyJ: number; o2Kg: number; meanSvf: number }

/** A* en 8 direcciones. Costo = energía metabólica del tramo × (1 + doseWeight × SVF). */
export function planRoute(g: Grid, start: number, goal: number, o: RouteOpts): RouteResult | null {
  const { n, cellM } = g;
  const open = new MinHeap(), came = new Int32Array(n * n).fill(-1);
  const gs = new Float64Array(n * n).fill(Infinity);
  const gx = goal % n, gy = (goal / n) | 0;
  const flatW = metabolicRateW({ ...o, gradePct: 0, terrain: 1 });
  const h = (i: number) => (Math.hypot((i % n) - gx, ((i / n) | 0) - gy) * cellM * flatW) / o.speed;
  gs[start] = 0; open.push(start, h(start));
  const maxTan = Math.tan((o.maxSlopeDeg * Math.PI) / 180);
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    const cx = cur % n, cy = (cur / n) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const nb = y * n + x, d = Math.hypot(dx, dy) * cellM, rise = g.z[nb] - g.z[cur];
      if (Math.abs(rise) / d > maxTan) continue;
      const W = metabolicRateW({ ...o, gradePct: (rise / d) * 100, terrain: g.terrain[nb] });
      const t = gs[cur] + (W * d) / o.speed * (1 + o.doseWeight * g.doseRel[nb]);
      if (t < gs[nb]) { gs[nb] = t; came[nb] = cur; open.push(nb, t + h(nb)); }
    }
  }
  if (came[goal] < 0 && goal !== start) return null;
  const path: number[] = [];
  for (let i = goal; i !== -1; i = came[i]) path.push(i);
  path.reverse();
  let distanceM = 0, energyJ = 0, svf = 0;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1], b = path[k];
    const d = Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
    const W = metabolicRateW({ ...o, gradePct: ((g.z[b] - g.z[a]) / d) * 100, terrain: g.terrain[b] });
    distanceM += d; energyJ += (W * d) / o.speed; svf += g.doseRel[b];
  }
  const timeS = distanceM / o.speed;
  return { path, distanceM, timeS, energyJ, o2Kg: o2KgPerHour(energyJ / Math.max(timeS, 1)) * (timeS / 3600),
           meanSvf: svf / Math.max(path.length - 1, 1) };
}

class MinHeap {
  private k: number[] = []; private p: number[] = [];
  get size() { return this.k.length; }
  push(key: number, pri: number) {
    let i = this.k.length; this.k.push(key); this.p.push(pri);
    while (i > 0) { const m = (i - 1) >> 1; if (this.p[m] <= this.p[i]) break; this.swap(i, m); i = m; }
  }
  pop(): number {
    const top = this.k[0], lk = this.k.pop()!, lp = this.p.pop()!;
    if (this.k.length) {
      this.k[0] = lk; this.p[0] = lp;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break; this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.k[a], this.k[b]] = [this.k[b], this.k[a]]; [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
  }
}
```

`physics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { leakMassFlow, timeToPressure, isChoked, leakTimeline, alveolarPO2 } from "./suitLeak.js";
import { metabolicRateW, o2LitersPerMin } from "./metabolic.js";
import { surfaceDensity } from "./atmosphere.js";
import { simulatePod } from "./ballistic.js";

describe("fuga del traje", () => {
  it("el flujo está estrangulado contra la atmósfera de Marte", () => {
    expect(isChoked(29600, 780)).toBe(true);
  });
  it("tiempo hasta Armstrong con orificio de 1,6 mm: ~891 s (cálculo a mano)", () => {
    expect(timeToPressure(29600, 6250, 0.0016)).toBeGreaterThan(880);
    expect(timeToPressure(29600, 6250, 0.0016)).toBeLessThan(900);
  });
  it("el caudal crece lineal con la presión", () => {
    expect(leakMassFlow(29600, 0.0016) / leakMassFlow(14800, 0.0016)).toBeCloseTo(2, 6);
  });
  it("la hipoxia llega antes que Armstrong", () => {
    const t = leakTimeline(29600, 0.0016);
    expect(t.toImpairedS).toBeLessThan(t.toCriticalS);
    expect(t.toCriticalS).toBeLessThan(t.toArmstrongS);
  });
  it("PAO2 a presión nominal es fisiológicamente holgada", () => {
    expect(alveolarPO2(29600)).toBeGreaterThan(13000);
  });
});

describe("metabolismo", () => {
  const base = { bodyKg: 78, loadKg: 65, speed: 1.0, gradePct: 0, terrain: 1.1 };
  it("subir cuesta más que el llano y bajar suave cuesta menos", () => {
    const flat = metabolicRateW(base);
    expect(metabolicRateW({ ...base, gradePct: 10 })).toBeGreaterThan(flat);
    expect(metabolicRateW({ ...base, gradePct: -5 })).toBeLessThanOrEqual(flat);
  });
  it("la arena suelta cuesta más", () => {
    expect(metabolicRateW({ ...base, terrain: 2.1 })).toBeGreaterThan(metabolicRateW(base));
  });
  it("300 W equivalen a ~0,9 L/min de O2", () => {
    expect(o2LitersPerMin(300)).toBeCloseTo(0.896, 2);
  });
});

describe("atmósfera y balística", () => {
  it("densidad con 750 Pa y 220 K: ~0,018 kg/m^3", () => {
    expect(surfaceDensity(750, 220)).toBeCloseTo(0.0178, 3);
  });
  it("sin atmósfera el alcance coincide con la fórmula de vacío", () => {
    const v = 40, a = Math.PI / 4;
    const tr = simulatePod([0, 0, 0.01], [v * Math.cos(a), 0, v * Math.sin(a)],
      { massKg: 3, cd: 0.5, areaM2: 0.03 }, { rho0: 0, windRef: 0, windDirRad: 0, groundZ: () => 0 }, 0.01);
    expect(tr.at(-1)!.p[0]).toBeCloseTo((v * v) / 3.711, 0);
  });
});
```

## Instructions for the coding agent

1. Copy the modules into `shared/src/physics/` and export them from `shared/src/index.ts`. Run `npm test`. **If a test fails, fix the code, not the test**, unless the expected value is wrongly derived; in that case leave a comment with the derivation.
2. **Check the Santee downhill correction against the original paper** (Santee et al., 2001). The form of `cf` was written from memory. If it cannot be verified, treat downhill as Pandolf at grade 0 and flag it as a design assumption in `constants.ts`.
3. Add `dose.ts`: `doseRate(baseRate, svf) = baseRate * svf`, with an explicit comment that this is a geometric approximation that overstates shielding against galactic cosmic rays. `cumulativeDose(route, rate)` integrates along a route.
4. Add `solar.ts`: panel power = top-of-atmosphere irradiance × `directTransmission` × area × efficiency. Direct beam alone underestimates power under dust (diffuse light is missing). If time allows, implement the tabulated normalized net flux from NASA TM-102299 (Appelbaum and Flood, "Solar Radiation on Mars") and cite it; otherwise label the HUD value "direct beam only".
5. Add `suitState.ts`: fixed-step integrator (1 Hz) advancing primary O2, reserve O2, suit pressure, CO2, battery and coolant, using the field names in `shared/src/types/suit.ts` (guide 02). Inputs: metabolic rate, leak diameter, suit mode.
6. No unseeded `Math.random` in this package: the simulation must be reproducible.
7. Export `C` so the provenance panel can list every constant with its source.
8. Translate the Spanish comments, `source` strings and test names in these blocks to English as you copy them.

## Addendum: life-support pod delivery (launch, range, parachute, landing ellipse)

`ballistic.ts` above integrates the free flight. The delivery needs four more things: the reach of the launcher, a parachute phase so the payload survives, the landing speed, and how far wind uncertainty scatters the landing point.

Reference numbers to check the code against (hand-computed, vacuum, 45° launch, g = 3.711 m/s²):

| Range | Launch speed | Flight time | Note |
|-------|--------------|-------------|------|
| 500 m | 43 m/s | 16 s | |
| 1,000 m | 61 m/s | 23 s | |
| 2,000 m | 86 m/s | 33 s | Without a parachute it lands at about the launch speed, 310 km/h |

Parachute sizing: terminal speed is `sqrt(2 m g / (ρ CdA))`. For a 3 kg pod at ρ = 0.018 kg/m³, landing at 10 m/s needs CdA ≈ 12.4 m² (a canopy about 4.7 m across at Cd 0.7); landing at 20 m/s needs about 3.1 m² (2.4 m across) plus a crushable base. The thin air is why Mars parachutes are large. All pod, canopy and launcher figures are design assumptions and are shown as such.

`podDelivery.ts`:

```ts
import { C } from "./constants.js";
import { densityAt, windAt } from "./atmosphere.js";
import type { Vec3, PodEnv, PodState } from "./ballistic.js";

export interface Pod { massKg: number; cdA: number }                    // drag area in free flight, m^2
export interface Chute { cdA: number; deployBelowM: number; inflateS: number } // opens on the way down, below this height above ground
export interface Launcher { maxMuzzleSpeed: number; tubeLengthM: number; minElevDeg: number; maxElevDeg: number }
export interface Delivery {
  path: PodState[]; flightTimeS: number; deployedAtS: number | null;
  impact: Vec3; impactSpeed: number; verticalImpactSpeed: number; maxHeightM: number;
}

export const terminalSpeed = (massKg: number, rho: number, cdA: number) => Math.sqrt((2 * massKg * C.g_mars.value) / (rho * cdA));
/** Upper bound on reach: vacuum range at 45 degrees. Drag only shortens it. */
export const maxRangeVacuum = (muzzleSpeed: number) => muzzleSpeed ** 2 / C.g_mars.value;
/** Mean acceleration in the launch tube, in Earth g. The payload must be rated for it. */
export const launchLoadG = (muzzleSpeed: number, tubeLengthM: number) => muzzleSpeed ** 2 / (2 * tubeLengthM) / C.g_earth.value;

/** Free flight, then parachute descent. RK4, same forces as ballistic.ts with a drag area that grows as the canopy inflates. */
export function simulateDelivery(p0: Vec3, v0: Vec3, pod: Pod, chute: Chute | null, env: PodEnv, dt = 0.05, maxT = 900): Delivery {
  let p = p0, v = v0, t = 0, deployedAt: number | null = null, maxH = 0;
  const path: PodState[] = [{ t, p, v }];
  const add = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  const cdAat = (time: number) => {
    if (deployedAt === null || !chute) return pod.cdA;
    const k = Math.min((time - deployedAt) / chute.inflateS, 1);          // linear inflation
    return pod.cdA + k * (chute.cdA - pod.cdA);
  };
  const acc = (pp: Vec3, vv: Vec3, time: number): Vec3 => {
    const h = Math.max(pp[2] - env.groundZ(pp[0], pp[1]), 0), w = windAt(h, env.windRef);
    const rel: Vec3 = [vv[0] - w * Math.cos(env.windDirRad), vv[1] - w * Math.sin(env.windDirRad), vv[2]];
    const k = (-0.5 * densityAt(env.rho0, h) * cdAat(time) * Math.hypot(...rel)) / pod.massKg;
    return [k * rel[0], k * rel[1], k * rel[2] - C.g_mars.value];
  };
  while (t < maxT) {
    const h = p[2] - env.groundZ(p[0], p[1]);
    maxH = Math.max(maxH, h);
    if (chute && deployedAt === null && v[2] < 0 && h < chute.deployBelowM) deployedAt = t;
    const a1 = acc(p, v, t);
    const v2 = add(v, a1, dt / 2), a2 = acc(add(p, v, dt / 2), v2, t + dt / 2);
    const v3 = add(v, a2, dt / 2), a3 = acc(add(p, v2, dt / 2), v3, t + dt / 2);
    const v4 = add(v, a3, dt), a4 = acc(add(p, v3, dt), v4, t + dt);
    p = [0, 1, 2].map((i) => p[i] + (dt / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i])) as Vec3;
    v = [0, 1, 2].map((i) => v[i] + (dt / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i])) as Vec3;
    t += dt;
    if (path.length < 6000) path.push({ t, p, v });
    if (p[2] <= env.groundZ(p[0], p[1])) break;
  }
  return { path, flightTimeS: t, deployedAtS: deployedAt, impact: p, impactSpeed: Math.hypot(...v),
           verticalImpactSpeed: Math.abs(v[2]), maxHeightM: maxH };
}

/** Landing scatter from wind uncertainty: seeded Monte Carlo over wind speed and direction. Returns the 1-sigma ellipse. */
export function landingEllipse(run: (windRef: number, windDirRad: number) => Vec3, wind: { speed: number; speedSigma: number; dirRad: number; dirSigmaRad: number },
                               n = 200, seed = 1): { center: [number, number]; alongM: number; crossM: number; samples: [number, number][] } {
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const hit = run(Math.max(0, wind.speed + gauss() * wind.speedSigma), wind.dirRad + gauss() * wind.dirSigmaRad);
    pts.push([hit[0], hit[1]]);
  }
  const cx = pts.reduce((a, q) => a + q[0], 0) / n, cy = pts.reduce((a, q) => a + q[1], 0) / n;
  const ux = Math.cos(wind.dirRad), uy = Math.sin(wind.dirRad);
  const sd = (f: (q: [number, number]) => number) => Math.sqrt(pts.reduce((a, q) => a + f(q) ** 2, 0) / n);
  return { center: [cx, cy], samples: pts,
           alongM: sd((q) => (q[0] - cx) * ux + (q[1] - cy) * uy), crossM: sd((q) => -(q[0] - cx) * uy + (q[1] - cy) * ux) };
}
```

Tests to add:

```ts
it("terminal speed under the canopy: 3 kg, CdA 12.4 m^2, rho 0.018 -> ~10 m/s", () => {
  expect(terminalSpeed(3, 0.018, 12.4)).toBeCloseTo(10.0, 0);
});
it("vacuum range at 86 m/s is ~2 km", () => {
  expect(maxRangeVacuum(86)).toBeCloseTo(1993, -1);
});
it("with a parachute the pod lands far slower than without, and later", () => {
  const env = { rho0: 0.018, windRef: 0, windDirRad: 0, groundZ: () => 0 };
  const pod = { massKg: 3, cdA: 0.015 }, v0: [number, number, number] = [43, 0, 43];
  const bare = simulateDelivery([0, 0, 0.01], v0, pod, null, env);
  const chuted = simulateDelivery([0, 0, 0.01], v0, pod, { cdA: 12.4, deployBelowM: 150, inflateS: 1 }, env);
  expect(chuted.verticalImpactSpeed).toBeLessThan(15);
  expect(bare.impactSpeed).toBeGreaterThan(50);
  expect(chuted.flightTimeS).toBeGreaterThan(bare.flightTimeS);
});
```

Instructions for this addendum:

1. The delivery in the leak scenario (guide 09) uses `simulateDelivery` in place of `simulatePod`. Aim correction stays the same: iterate the launch velocity until the impact point is within 5 m of the target under the forecast wind.
2. **Launcher envelope.** Define one `Launcher` (design assumption, for example 90 m/s muzzle speed from a 6 m tube, 30° to 70° elevation). `BASE` may only approve a launch whose required speed is within the limit; `GUARDIAN` rules reject a target beyond `maxRangeVacuum` or inside the keep-out radius around the astronaut. Show the launch load from `launchLoadG` on the pod card: at 90 m/s from 6 m it is about 69 g, so the pod is a sealed bottle and battery, not delicate equipment.
3. **Map overlay:** draw the reach ring of each tower (maximum range) and the keep-out circle around the astronaut. The astronaut being outside every ring is a reason for `BASE` to send a rover instead, and it says so.
4. **Parachute trade-off, shown in the HUD:** a lower deploy height cuts wind drift but leaves less time to slow down; a larger canopy lands softer but drifts more. Display landing speed and drift for the chosen settings. Reject a delivery whose landing speed exceeds the payload limit (design assumption, for example 15 m/s).
5. **Landing ellipse:** run `landingEllipse` with the current wind and its uncertainty (take the spread from the REMS wind statistics if usable, otherwise a stated assumption) and draw the 1-sigma and 2-sigma ellipses on the terrain before launch. The keep-out rule applies to the 2-sigma ellipse, not only to the aim point.
6. During the dust storm the wind is stronger and less certain: the ellipse grows, and the HUD shows it. This links the storm model to the rescue.
7. Parachute inflation is modelled as a linear ramp of drag area. Opening shock, canopy stability and inflation in thin air are not modelled; list this under limitations.

## Acceptance criteria

- `npm test` passes.
- `leakTimeline(29600, 0.0016)` returns increasing times and the Armstrong time is about 890 s.
- No module imports `three` or touches the DOM.
