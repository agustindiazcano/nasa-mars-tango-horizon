import { C } from "./constants.js";
import { densityAt, windAt } from "./atmosphere.js";

/** 3D position/velocity vector in meters or m/s: [east, north, up]. */
export type Vec3 = [number, number, number];

export interface PodParams {
  massKg: number;
  cd: number;
  areaM2: number;
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

function accel(p: Vec3, v: Vec3, pod: PodParams, env: PodEnv): Vec3 {
  const h = Math.max(p[2] - env.groundZ(p[0], p[1]), 0);
  const w = windAt(h, env.windRef);
  const rel: Vec3 = [
    v[0] - w * Math.cos(env.windDirRad),
    v[1] - w * Math.sin(env.windDirRad),
    v[2],
  ];
  const s = Math.hypot(...rel);
  const k =
    (-0.5 * densityAt(env.rho0, h) * pod.cd * pod.areaM2 * s) / pod.massKg;
  return [k * rel[0], k * rel[1], k * rel[2] - C.g_mars.value];
}

/**
 * Integrates free-flight pod ballistics using 4th-order Runge-Kutta (RK4) until ground impact.
 * Returns the sampled trajectory.
 */
export function simulatePod(
  p0: Vec3,
  v0: Vec3,
  pod: PodParams,
  env: PodEnv,
  dt = 0.05,
  maxT = 600,
): PodState[] {
  const out: PodState[] = [{ t: 0, p: p0, v: v0 }];
  let p = p0;
  let v = v0;
  let t = 0;
  const add = (a: Vec3, b: Vec3, s: number): Vec3 => [
    a[0] + b[0] * s,
    a[1] + b[1] * s,
    a[2] + b[2] * s,
  ];
  while (t < maxT) {
    const a1 = accel(p, v, pod, env);
    const v2 = add(v, a1, dt / 2);
    const a2 = accel(add(p, v, dt / 2), v2, pod, env);
    const v3 = add(v, a2, dt / 2);
    const a3 = accel(add(p, v2, dt / 2), v3, pod, env);
    const v4 = add(v, a3, dt);
    const a4 = accel(add(p, v3, dt), v4, pod, env);
    p = [0, 1, 2].map(
      (i) => p[i] + (dt / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i]),
    ) as Vec3;
    v = [0, 1, 2].map(
      (i) => v[i] + (dt / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]),
    ) as Vec3;
    t += dt;
    if (p[2] <= env.groundZ(p[0], p[1])) {
      out.push({ t, p, v });
      break;
    }
    if (out.length < 4000) out.push({ t, p, v });
  }
  return out;
}

/**
 * Analytical vacuum launch velocity (m/s) to hit `to` from `from` at elevation `elevRad`.
 * Used as the initial guess for iterative wind/drag aim correction.
 */
export function vacuumLaunchVelocity(
  from: Vec3,
  to: Vec3,
  elevRad: number,
): Vec3 | null {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const d = Math.hypot(dx, dy);
  if (d <= 0) return null;
  const denom = 2 * Math.cos(elevRad) ** 2 * (d * Math.tan(elevRad) - dz);
  if (denom <= 0) return null;
  const s = Math.sqrt((C.g_mars.value * d * d) / denom);
  return [
    (s * Math.cos(elevRad) * dx) / d,
    (s * Math.cos(elevRad) * dy) / d,
    s * Math.sin(elevRad),
  ];
}
