import { C } from "./constants.js";
import { densityAt, windAt } from "./atmosphere.js";
import { vacuumLaunchVelocity, type Vec3, type PodEnv, type PodState } from "./ballistic.js";

/** Free-flight pod aerodynamic parameters (design assumptions). */
export interface Pod {
  massKg: number;
  cdA: number; // drag area in free flight, m^2
}

/** Parachute parameters; deploys on descent below deployBelowM AGL with linear inflation. */
export interface Chute {
  cdA: number;
  deployBelowM: number;
  inflateS: number;
}

/** Pneumatic/electromagnetic launcher envelope (design assumptions). */
export interface Launcher {
  maxMuzzleSpeed: number;
  tubeLengthM: number;
  minElevDeg: number;
  maxElevDeg: number;
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

/** Seeded 32-bit PRNG for deterministic procedural terrain & Monte Carlo scatter. */
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

/** Default life-support delivery pod envelope matching constants C.pod_*. */
export const DEFAULT_POD: Pod = { massKg: 8.0, cdA: 0.025 };

/** Default parachute parameters matching constants C.pod_chute_cda_m2. */
export const DEFAULT_CHUTE: Chute = { cdA: 18.0, deployBelowM: 140, inflateS: 1.0 };

/** Default launcher envelope (design assumption). */
export const DEFAULT_LAUNCHER: Launcher = {
  maxMuzzleSpeed: 90,
  tubeLengthM: 6,
  minElevDeg: 30,
  maxElevDeg: 70,
};

/** Steady-state terminal descent speed (m/s) under Mars gravity. */
export const terminalSpeed = (
  massKg: number,
  rho: number,
  cdA: number,
): number => Math.sqrt((2 * massKg * C.g_mars.value) / (rho * cdA));

/** Upper bound on launcher reach: vacuum range at 45 degrees (m). Drag only shortens it. */
export const maxRangeVacuum = (muzzleSpeed: number): number =>
  muzzleSpeed ** 2 / C.g_mars.value;

/** Mean acceleration inside the launch tube expressed in Earth g. */
export const launchLoadG = (
  muzzleSpeed: number,
  tubeLengthM: number,
): number => muzzleSpeed ** 2 / (2 * tubeLengthM) / C.g_earth.value;

/**
 * Simulates free flight followed by parachute descent using RK4.
 * Limitations: parachute inflation is modelled as a linear ramp of drag area;
 * opening shock, canopy stability, and thin-air inflation dynamics are not modelled.
 */
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
  const add = (a: Vec3, b: Vec3, s: number): Vec3 => [
    a[0] + b[0] * s,
    a[1] + b[1] * s,
    a[2] + b[2] * s,
  ];
  const cdAat = (time: number): number => {
    if (deployedAt === null || !chute) return pod.cdA;
    const k = Math.min((time - deployedAt) / Math.max(chute.inflateS, 1e-6), 1);
    return pod.cdA + k * (chute.cdA - pod.cdA);
  };
  const acc = (pp: Vec3, vv: Vec3, time: number): Vec3 => {
    const h = Math.max(pp[2] - env.groundZ(pp[0], pp[1]), 0);
    const w = windAt(h, env.windRef);
    const rel: Vec3 = [
      vv[0] - w * Math.cos(env.windDirRad),
      vv[1] - w * Math.sin(env.windDirRad),
      vv[2],
    ];
    const k =
      (-0.5 * densityAt(env.rho0, h) * cdAat(time) * Math.hypot(...rel)) /
      pod.massKg;
    return [k * rel[0], k * rel[1], k * rel[2] - C.g_mars.value];
  };

  while (t < maxT) {
    const h = p[2] - env.groundZ(p[0], p[1]);
    maxH = Math.max(maxH, h);
    if (chute && deployedAt === null && v[2] < 0 && h < chute.deployBelowM) {
      deployedAt = t;
    }
    const a1 = acc(p, v, t);
    const v2 = add(v, a1, dt / 2);
    const a2 = acc(add(p, v, dt / 2), v2, t + dt / 2);
    const v3 = add(v, a2, dt / 2);
    const a3 = acc(add(p, v2, dt / 2), v3, t + dt / 2);
    const v4 = add(v, a3, dt);
    const a4 = acc(add(p, v3, dt), v4, t + dt);
    p = [0, 1, 2].map(
      (i) => p[i] + (dt / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i]),
    ) as Vec3;
    v = [0, 1, 2].map(
      (i) => v[i] + (dt / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]),
    ) as Vec3;
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

/**
 * Iterative aim-point solver compensating for atmospheric drag and forecast wind.
 * Shifts a virtual aim point against the impact miss until within `tolM` or max iterations.
 */
export function aimDelivery(
  from: Vec3,
  target: Vec3,
  elevRad: number,
  pod: Pod,
  chute: Chute | null,
  env: PodEnv,
  tolM = 5,
  maxIter = 6,
): { v0: Vec3; delivery: Delivery; missM: number } | null {
  let aim: Vec3 = [...target];
  let best: { v0: Vec3; delivery: Delivery; missM: number } | null = null;
  for (let i = 0; i < maxIter; i++) {
    const v0 = vacuumLaunchVelocity(from, aim, elevRad);
    if (!v0) return best;
    const delivery = simulateDelivery(from, v0, pod, chute, env);
    const errX = delivery.impact[0] - target[0];
    const errY = delivery.impact[1] - target[1];
    const missM = Math.hypot(errX, errY);
    if (!best || missM < best.missM) best = { v0, delivery, missM };
    if (missM <= tolM) break;
    aim = [aim[0] - errX, aim[1] - errY, aim[2]];
  }
  return best;
}

/**
 * Landing scatter from wind uncertainty via deterministic seeded Monte Carlo
 * over wind speed and direction. Returns the 1-sigma along-wind and cross-wind ellipse.
 */
export function landingEllipse(
  run: (windRef: number, windDirRad: number) => Vec3,
  wind: {
    speed: number;
    speedSigma: number;
    dirRad: number;
    dirSigmaRad: number;
  },
  n = 200,
  seed = 1,
): {
  center: [number, number];
  alongM: number;
  crossM: number;
  samples: [number, number][];
} {
  let s = seed >>> 0;
  const rnd = () =>
    ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const hit = run(
      Math.max(0, wind.speed + gauss() * wind.speedSigma),
      wind.dirRad + gauss() * wind.dirSigmaRad,
    );
    pts.push([hit[0], hit[1]]);
  }
  const cx = pts.reduce((a, q) => a + q[0], 0) / n;
  const cy = pts.reduce((a, q) => a + q[1], 0) / n;
  const ux = Math.cos(wind.dirRad);
  const uy = Math.sin(wind.dirRad);
  const sd = (f: (q: [number, number]) => number) =>
    Math.sqrt(pts.reduce((a, q) => a + f(q) ** 2, 0) / n);
  return {
    center: [cx, cy],
    samples: pts,
    alongM: sd((q) => (q[0] - cx) * ux + (q[1] - cy) * uy),
    crossM: sd((q) => -(q[0] - cx) * uy + (q[1] - cy) * ux),
  };
}
