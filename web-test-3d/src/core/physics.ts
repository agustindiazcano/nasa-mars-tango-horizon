import type { SuitTelemetry } from "./types";

export interface Const {
  value: number;
  unit: string;
  source: string;
  assumption?: boolean;
}

export const C = {
  g_mars: { value: 3.711, unit: "m/s^2", source: "NASA Mars Fact Sheet (NSSDCA)" },
  g_earth: { value: 9.80665, unit: "m/s^2", source: "CODATA" },
  R_o2: { value: 259.84, unit: "J/(kg K)", source: "Universal R / O2 molar mass" },
  R_mars_atm: { value: 191.8, unit: "J/(kg K)", source: "NASA Mars Fact Sheet (43.34 g/mol CO2 mix)" },
  gamma_o2: { value: 1.4, unit: "-", source: "Ideal diatomic gas" },
  scale_height: { value: 11100, unit: "m", source: "NASA Mars Fact Sheet" },
  o2_energy: { value: 20100, unit: "J/L", source: "Caloric equivalent of O2 at RQ ~0.85" },
  o2_density: { value: 1.429, unit: "g/L", source: "O2 STP density" },
  rq: { value: 0.85, unit: "-", source: "Mixed diet respiratory quotient", assumption: true },
  p_armstrong: { value: 6270, unit: "Pa", source: "Water vapor pressure at 37 C (47 mmHg)" },
  p_h2o_alv: { value: 6270, unit: "Pa", source: "Alveolar water vapor pressure at 37 C" },
  p_co2_alv: { value: 5330, unit: "Pa", source: "Normal PaCO2 (40 mmHg)" },
  pao2_impaired: { value: 8000, unit: "Pa", source: "PAO2 ~60 mmHg impairment threshold", assumption: true },
  pao2_critical: { value: 4000, unit: "Pa", source: "PAO2 ~30 mmHg loss of consciousness", assumption: true },
  suit_p_nominal: { value: 29600, unit: "Pa", source: "4.3 psi NASA exploration EVA suit nominal pressure" },
  suit_volume: { value: 0.135, unit: "m^3", source: "Free suit internal gas volume", assumption: true },
  suit_mass: { value: 65, unit: "kg", source: "Surface Martian EVA suit mass", assumption: true },
  discharge_cd: { value: 0.62, unit: "-", source: "Sharp-edged orifice discharge coefficient" },
  pod_keepout_m: { value: 15, unit: "m", source: "GUARDIAN ballistic pod crew keep-out radius", assumption: true },
  arm_keepout_m: { value: 2, unit: "m", source: "GUARDIAN manipulator arm crew keep-out radius", assumption: true },
} as const satisfies Record<string, Const>;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WalkInput {
  bodyKg: number;
  loadKg: number;
  speed: number;
  gradePct: number;
  terrain: number;
  g?: number;
}

/** Pandolf (1977) metabolic rate scaled by Mars gravity ratio with Santee (2001) downhill correction. */
export function metabolicRateW(i: WalkInput): number {
  const k = (i.g ?? C.g_mars.value) / C.g_earth.value;
  const W = i.bodyKg;
  const L = i.loadKg;
  const v = i.speed;
  const G = i.gradePct;
  const n = i.terrain;
  const standing = 1.5 * W;
  const loadTerm = 2.0 * (W + L) * (L / W) ** 2 * k;
  const move = n * (W + L) * k * (1.5 * v * v + 0.35 * v * Math.max(G, 0));
  let M = standing + loadTerm + move;
  if (G < 0 && v > 0) {
    const cf = n * ((G * (W + L) * k * v) / 3.5 - ((W + L) * k * (G + 6) ** 2) / W + (25 - v * v));
    M = standing + loadTerm + n * (W + L) * k * (1.5 * v * v + 0.35 * v * G) - cf;
  }
  return Math.max(M, standing);
}

export const o2LitersPerMin = (watts: number): number => (watts * 60) / C.o2_energy.value;
export const o2KgPerHour = (watts: number): number => (o2LitersPerMin(watts) * 60 * C.o2_density.value) / 1000;
export const co2LitersPerMin = (watts: number): number => o2LitersPerMin(watts) * C.rq.value;
export const terrainFromThermalClass = (c: 0 | 1 | 2): number => [2.1, 1.5, 1.1][c];

const critFactor = (g: number): number => (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)));

export function isChoked(pSuit: number, pAmbient: number, gamma = C.gamma_o2.value): boolean {
  return pAmbient / pSuit < (2 / (gamma + 1)) ** (gamma / (gamma - 1));
}

export function leakMassFlow(pSuit: number, holeDiameterM: number, tempK = 293): number {
  if (holeDiameterM <= 0 || pSuit <= 0) return 0;
  const A = (Math.PI / 4) * holeDiameterM ** 2;
  const g = C.gamma_o2.value;
  return C.discharge_cd.value * A * pSuit * Math.sqrt(g / (C.R_o2.value * tempK)) * critFactor(g);
}

export function dPdt(pSuit: number, holeDiameterM: number, makeupKgS: number, metabolicKgS: number, tempK = 293): number {
  const out = leakMassFlow(pSuit, holeDiameterM, tempK) + metabolicKgS;
  return ((C.R_o2.value * tempK) / C.suit_volume.value) * (makeupKgS - out);
}

export function timeToPressure(p0: number, pTarget: number, holeDiameterM: number, tempK = 293): number {
  if (pTarget >= p0 || holeDiameterM <= 0) return 0;
  const A = (Math.PI / 4) * holeDiameterM ** 2;
  const g = C.gamma_o2.value;
  const tau = C.suit_volume.value / (C.discharge_cd.value * A * Math.sqrt(g * C.R_o2.value * tempK) * critFactor(g));
  return tau * Math.log(p0 / pTarget);
}

export const alveolarPO2 = (pSuit: number): number => Math.max(0, pSuit - C.p_h2o_alv.value - C.p_co2_alv.value);
export const suitPressureForPAO2 = (pao2: number): number => pao2 + C.p_h2o_alv.value + C.p_co2_alv.value;

export interface LeakTimeline {
  toImpairedS: number;
  toCriticalS: number;
  toArmstrongS: number;
}

export function leakTimeline(p0: number, holeDiameterM: number, tempK = 293): LeakTimeline {
  return {
    toImpairedS: timeToPressure(p0, suitPressureForPAO2(C.pao2_impaired.value), holeDiameterM, tempK),
    toCriticalS: timeToPressure(p0, suitPressureForPAO2(C.pao2_critical.value), holeDiameterM, tempK),
    toArmstrongS: timeToPressure(p0, C.p_armstrong.value, holeDiameterM, tempK),
  };
}

export const surfaceDensity = (pPa: number, tK: number): number => pPa / (C.R_mars_atm.value * Math.max(tK, 50));
export const densityAt = (rho0: number, hM: number): number => rho0 * Math.exp(-Math.max(hM, 0) / C.scale_height.value);

export function windAt(hM: number, refSpeed: number, refH = 1.6, z0 = 0.01): number {
  if (hM <= z0) return 0;
  return (refSpeed * Math.log(hM / z0)) / Math.log(refH / z0);
}

export const directTransmission = (tau: number, mu: number): number => (mu <= 0 ? 0 : Math.exp(-tau / mu));

export type Vec3 = [number, number, number]; // x east, y north, z up (metres)

export interface Pod {
  massKg: number;
  cdA: number;
}

export interface Chute {
  cdA: number;
  deployBelowM: number;
  inflateS: number;
}

export interface Launcher {
  maxMuzzleSpeed: number;
  tubeLengthM: number;
  minElevDeg: number;
  maxElevDeg: number;
}

export interface PodEnv {
  rho0: number;
  windRef: number;
  windDirRad: number;
  groundZ: (x: number, y: number) => number;
}

export interface PodState {
  t: number;
  p: Vec3;
  v: Vec3;
}

export interface Delivery {
  path: PodState[];
  flightTimeS: number;
  deployedAtS: number | null;
  impact: Vec3;
  impactSpeed: number;
  verticalImpactSpeed: number;
  maxHeightM: number;
}

export const DEFAULT_POD: Pod = { massKg: 8.0, cdA: 0.025 };
export const DEFAULT_CHUTE: Chute = { cdA: 18.0, deployBelowM: 140, inflateS: 1.0 };
export const DEFAULT_LAUNCHER: Launcher = { maxMuzzleSpeed: 90, tubeLengthM: 6, minElevDeg: 30, maxElevDeg: 70 };

export const terminalSpeed = (massKg: number, rho: number, cdA: number): number =>
  Math.sqrt((2 * massKg * C.g_mars.value) / Math.max(rho * cdA, 1e-6));

export const maxRangeVacuum = (muzzleSpeed: number): number => muzzleSpeed ** 2 / C.g_mars.value;

export const launchLoadG = (muzzleSpeed: number, tubeLengthM: number): number =>
  muzzleSpeed ** 2 / (2 * tubeLengthM) / C.g_earth.value;

export function vacuumLaunchVelocity(from: Vec3, to: Vec3, elevRad: number): Vec3 | null {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const d = Math.hypot(dx, dy);
  if (d < 0.1) return null;
  const denom = 2 * Math.cos(elevRad) ** 2 * (d * Math.tan(elevRad) - dz);
  if (denom <= 0) return null;
  const s = Math.sqrt((C.g_mars.value * d * d) / denom);
  return [(s * Math.cos(elevRad) * dx) / d, (s * Math.cos(elevRad) * dy) / d, s * Math.sin(elevRad)];
}

export function simulateDelivery(
  p0: Vec3,
  v0: Vec3,
  pod: Pod,
  chute: Chute | null,
  env: PodEnv,
  dt = 0.05,
  maxT = 900,
): Delivery {
  let p = p0;
  let v = v0;
  let t = 0;
  let deployedAt: number | null = null;
  let maxH = 0;
  const path: PodState[] = [{ t, p, v }];
  const add = (a: Vec3, b: Vec3, s: number): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  const cdAat = (time: number): number => {
    if (deployedAt === null || !chute) return pod.cdA;
    const k = Math.min((time - deployedAt) / chute.inflateS, 1);
    return pod.cdA + k * (chute.cdA - pod.cdA);
  };
  const acc = (pp: Vec3, vv: Vec3, time: number): Vec3 => {
    const h = Math.max(pp[2] - env.groundZ(pp[0], pp[1]), 0);
    const w = windAt(h, env.windRef);
    const rel: Vec3 = [vv[0] - w * Math.cos(env.windDirRad), vv[1] - w * Math.sin(env.windDirRad), vv[2]];
    const k = (-0.5 * densityAt(env.rho0, h) * cdAat(time) * Math.hypot(...rel)) / pod.massKg;
    return [k * rel[0], k * rel[1], k * rel[2] - C.g_mars.value];
  };
  while (t < maxT) {
    const h = p[2] - env.groundZ(p[0], p[1]);
    maxH = Math.max(maxH, h);
    if (chute && deployedAt === null && v[2] < 0 && h < chute.deployBelowM) deployedAt = t;
    const a1 = acc(p, v, t);
    const v2 = add(v, a1, dt / 2);
    const a2 = acc(add(p, v, dt / 2), v2, t + dt / 2);
    const v3 = add(v, a2, dt / 2);
    const a3 = acc(add(p, v2, dt / 2), v3, t + dt / 2);
    const v4 = add(v, a3, dt);
    const a4 = acc(add(p, v3, dt), v4, t + dt);
    p = [0, 1, 2].map((i) => p[i] + (dt / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i])) as Vec3;
    v = [0, 1, 2].map((i) => v[i] + (dt / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i])) as Vec3;
    t += dt;
    if (path.length < 6000) path.push({ t, p, v });
    if (p[2] <= env.groundZ(p[0], p[1])) break;
  }
  return {
    path,
    flightTimeS: t,
    deployedAtS: deployedAt,
    impact: p,
    impactSpeed: Math.hypot(...v),
    verticalImpactSpeed: Math.abs(v[2]),
    maxHeightM: maxH,
  };
}

export function aimDelivery(
  from: Vec3,
  target: Vec3,
  pod: Pod,
  chute: Chute | null,
  env: PodEnv,
  elevRad = Math.PI / 4,
): { v0: Vec3; delivery: Delivery } | null {
  let aim: Vec3 = [...target];
  let v0 = vacuumLaunchVelocity(from, aim, elevRad);
  if (!v0) return null;
  let delivery = simulateDelivery(from, v0, pod, chute, env);
  for (let iter = 0; iter < 5; iter++) {
    const errX = delivery.impact[0] - target[0];
    const errY = delivery.impact[1] - target[1];
    if (Math.hypot(errX, errY) < 4) break;
    aim = [aim[0] - errX * 0.85, aim[1] - errY * 0.85, target[2]];
    const nextV0 = vacuumLaunchVelocity(from, aim, elevRad);
    if (!nextV0) break;
    v0 = nextV0;
    delivery = simulateDelivery(from, v0, pod, chute, env);
  }
  return { v0, delivery };
}

export function landingEllipse(
  run: (windRef: number, windDirRad: number) => Vec3,
  wind: { speed: number; speedSigma: number; dirRad: number; dirSigmaRad: number },
  n = 120,
  seed = 1,
): { center: [number, number]; alongM: number; crossM: number; samples: [number, number][] } {
  const rnd = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const hit = run(Math.max(0, wind.speed + gauss() * wind.speedSigma), wind.dirRad + gauss() * wind.dirSigmaRad);
    pts.push([hit[0], hit[1]]);
  }
  const cx = pts.reduce((a, q) => a + q[0], 0) / n;
  const cy = pts.reduce((a, q) => a + q[1], 0) / n;
  const ux = Math.cos(wind.dirRad);
  const uy = Math.sin(wind.dirRad);
  const sd = (f: (q: [number, number]) => number) => Math.sqrt(pts.reduce((a, q) => a + f(q) ** 2, 0) / n);
  return {
    center: [cx, cy],
    samples: pts,
    alongM: Math.max(3, sd((q) => (q[0] - cx) * ux + (q[1] - cy) * uy)),
    crossM: Math.max(3, sd((q) => -(q[0] - cx) * uy + (q[1] - cy) * ux)),
  };
}

export interface RouteGrid {
  n: number;
  cellM: number;
  z: Float32Array;
  terrain: Float32Array;
  doseRel: Float32Array;
}

export interface RouteOpts {
  bodyKg: number;
  loadKg: number;
  speed: number;
  maxSlopeDeg: number;
  doseWeight: number;
}

export interface RouteResult {
  path: number[];
  distanceM: number;
  timeS: number;
  energyJ: number;
  o2Kg: number;
  meanSvf: number;
}

class MinHeap {
  private k: number[] = [];
  private p: number[] = [];
  get size(): number {
    return this.k.length;
  }
  push(key: number, pri: number): void {
    let i = this.k.length;
    this.k.push(key);
    this.p.push(pri);
    while (i > 0) {
      const m = (i - 1) >> 1;
      if (this.p[m] <= this.p[i]) break;
      this.swap(i, m);
      i = m;
    }
  }
  pop(): number {
    const top = this.k[0];
    const lk = this.k.pop()!;
    const lp = this.p.pop()!;
    if (this.k.length) {
      this.k[0] = lk;
      this.p[0] = lp;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number): void {
    [this.k[a], this.k[b]] = [this.k[b], this.k[a]];
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
  }
}

export function planRoute(g: RouteGrid, start: number, goal: number, o: RouteOpts): RouteResult | null {
  const { n, cellM } = g;
  const open = new MinHeap();
  const came = new Int32Array(n * n).fill(-1);
  const gs = new Float64Array(n * n).fill(Infinity);
  const gx = goal % n;
  const gy = (goal / n) | 0;
  const flatW = metabolicRateW({ ...o, gradePct: 0, terrain: 1 });
  const h = (i: number) => (Math.hypot((i % n) - gx, ((i / n) | 0) - gy) * cellM * flatW) / o.speed;
  gs[start] = 0;
  open.push(start, h(start));
  const maxTan = Math.tan((o.maxSlopeDeg * Math.PI) / 180);
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    const cx = cur % n;
    const cy = (cur / n) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const nb = y * n + x;
        const d = Math.hypot(dx, dy) * cellM;
        const rise = g.z[nb] - g.z[cur];
        if (Math.abs(rise) / d > maxTan) continue;
        const W = metabolicRateW({ ...o, gradePct: (rise / d) * 100, terrain: g.terrain[nb] });
        const t = gs[cur] + ((W * d) / o.speed) * (1 + o.doseWeight * g.doseRel[nb]);
        if (t < gs[nb]) {
          gs[nb] = t;
          came[nb] = cur;
          open.push(nb, t + h(nb));
        }
      }
    }
  }
  if (came[goal] < 0 && goal !== start) return null;
  const path: number[] = [];
  for (let i = goal; i !== -1; i = came[i]) path.push(i);
  path.reverse();
  let distanceM = 0;
  let energyJ = 0;
  let svf = 0;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1];
    const b = path[k];
    const d = Math.hypot((b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)) * cellM;
    const W = metabolicRateW({ ...o, gradePct: ((g.z[b] - g.z[a]) / d) * 100, terrain: g.terrain[b] });
    distanceM += d;
    energyJ += (W * d) / o.speed;
    svf += g.doseRel[b];
  }
  const timeS = distanceM / o.speed;
  return {
    path,
    distanceM,
    timeS,
    energyJ,
    o2Kg: o2KgPerHour(energyJ / Math.max(timeS, 1)) * (timeS / 3600),
    meanSvf: svf / Math.max(path.length - 1, 1),
  };
}

export function stepSuitTelemetry(
  suit: SuitTelemetry,
  dt: number,
  metabolicW: number,
  leakDiameterM: number,
  doseRateUgyH: number,
  svf: number,
  fanDegraded = false,
): SuitTelemetry {
  const o2RateKgS = o2KgPerHour(metabolicW) / 3600;
  let o2Prim = suit.o2_primary_kg;
  let o2Res = suit.o2_reserve_kg;
  let pressure = suit.suit_pressure_pa;

  if (leakDiameterM > 0) {
    // Regulator feeds up to 0.0005 kg/s from reserve while reserve lasts; orifice leak drains pressure.
    const maxRegKgS = 0.0005;
    const desiredMakeup = pressure < C.suit_p_nominal.value ? maxRegKgS : o2RateKgS;
    let makeup = 0;
    if (o2Res > 0) {
      makeup = Math.min(desiredMakeup, o2Res / Math.max(dt, 1e-3));
      o2Res = Math.max(0, o2Res - makeup * dt);
    } else if (o2Prim > 0) {
      makeup = Math.min(o2RateKgS, o2Prim / Math.max(dt, 1e-3));
      o2Prim = Math.max(0, o2Prim - makeup * dt);
    }
    const slope = dPdt(pressure, leakDiameterM, makeup, o2RateKgS, 293);
    pressure = Math.max(750, Math.min(C.suit_p_nominal.value, pressure + slope * dt));
  } else {
    if (o2Prim > 0) {
      o2Prim = Math.max(0, o2Prim - o2RateKgS * dt);
    } else if (o2Res > 0) {
      o2Res = Math.max(0, o2Res - o2RateKgS * dt);
    }
    if (pressure < C.suit_p_nominal.value) {
      pressure = Math.min(C.suit_p_nominal.value, pressure + 250 * dt);
    }
  }

  const co2ProdKgS = (co2LitersPerMin(metabolicW) / 60) * 0.001977;
  const scrubRate = fanDegraded ? 0.55 : 1.02;
  const co2Delta = (co2ProdKgS * (1 - scrubRate) * 28000) * dt;
  const co2Pa = Math.max(120, Math.min(3500, suit.co2_pa + co2Delta + (fanDegraded ? 18 * dt : -8 * dt)));

  const suitPowerW = 135 + (metabolicW - 180) * 0.15;
  const batteryWh = Math.max(0, suit.battery_wh - (suitPowerW * dt) / 3600);
  const coolantL = Math.max(0, suit.coolant_l - (metabolicW * 0.000012 * dt));
  const targetHr = 68 + (metabolicW - 110) * 0.18 + (leakDiameterM > 0 ? 35 : 0);
  const hr = suit.heart_rate_bpm + (targetHr - suit.heart_rate_bpm) * Math.min(1, dt * 1.5);
  const targetFan = fanDegraded ? 18200 : 28400;
  const fanRpm = suit.fan_rpm + (targetFan - suit.fan_rpm) * Math.min(1, dt * 2.0);
  const dose = suit.cumulative_dose_ugy + (doseRateUgyH * svf * dt) / 3600;

  return {
    ...suit,
    o2_primary_kg: o2Prim,
    o2_reserve_kg: o2Res,
    suit_pressure_pa: pressure,
    pao2_pa: alveolarPO2(pressure),
    co2_pa: co2Pa,
    battery_wh: batteryWh,
    coolant_l: coolantL,
    metabolic_w: metabolicW,
    heart_rate_bpm: hr,
    fan_rpm: fanRpm,
    body_temp_c: 36.8 + Math.max(0, (metabolicW - 220) * 0.002),
    cumulative_dose_ugy: dose,
  };
}
