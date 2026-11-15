import { BASE_ORIGIN, t } from "@th/shared";
import * as THREE from "three";
import type { TerrainProc } from "./terrainProc";

/** Mars surface gravity (m/s^2). */
export const MARS_G = 3.71;

export interface PendulumState {
  /** Angle from the vertical (rad). */
  theta: number;
  /** Angular rate (rad/s). */
  omega: number;
}

export interface PendulumParams {
  /** Tether length (m). */
  length: number;
  /** Gravity (m/s^2). */
  g: number;
  /** Viscous damping coefficient (1/s). */
  damping: number;
}

/**
 * One damped-pendulum step for a tether hanging from a moving anchor:
 *
 *   theta'' = -(g / L) sin(theta) - c theta' - (a / L) cos(theta)
 *
 * `anchorAccel` is the anchor acceleration (m/s^2) along the swing axis.
 * Semi-implicit Euler with sub-steps keeps the energy bounded.
 */
export function stepPendulum(
  state: PendulumState,
  dt: number,
  params: PendulumParams,
  anchorAccel = 0,
): PendulumState {
  const steps = Math.max(1, Math.ceil(dt / 0.01));
  const h = dt / steps;
  let { theta, omega } = state;
  for (let i = 0; i < steps; i++) {
    const alpha =
      -(params.g / params.length) * Math.sin(theta) - params.damping * omega - (anchorAccel / params.length) * Math.cos(theta);
    omega += alpha * h;
    theta += omega * h;
  }
  return { theta, omega };
}

/** Small-angle pendulum period 2*pi*sqrt(L/g) (s). */
export function pendulumPeriod(length: number, g: number): number {
  return 2 * Math.PI * Math.sqrt(length / g);
}

/** Wavelength of the green LiDAR (m). */
export const LIDAR_WAVELENGTH_NM = 532;

const TETHER_LENGTH_M = 22;
const HOVER_AGL_M = 48;
const LIDAR_HALF_ANGLE_RAD = 0.32;

/** Hovering Sky-Crane prop with a Kevlar tether pendulum and a green 532 nm LiDAR cone. */
export class SkyCraneProc {
  readonly group = new THREE.Group();
  private readonly tether: THREE.Line;
  private readonly payload = new THREE.Group();
  private readonly cone: THREE.Mesh;
  private readonly hoverPos = new THREE.Vector3();
  private readonly params: PendulumParams = { length: TETHER_LENGTH_M, g: MARS_G, damping: 0.18 };
  private px: PendulumState = { theta: 0.22, omega: 0 };
  private pz: PendulumState = { theta: 0, omega: 0.1 };
  private prevVx = 0;
  private prevVz = 0;
  private prevPos = new THREE.Vector3();
  private time = 0;

  constructor(scene: THREE.Scene, private terrain: TerrainProc) {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xcfd4d9, roughness: 0.55, metalness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f353b, roughness: 0.7, metalness: 0.3 });

    const body = new THREE.Group();
    body.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 3.0), hullMat));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), darkMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(sx * 3.0, 0.2, sz * 1.5);
        body.add(arm);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 0.9, 12), darkMat);
        nozzle.position.set(sx * 4.4, 0.2, sz * 1.5);
        body.add(nozzle);
      }
    }
    this.group.add(body);

    // Kevlar tether (yellow-gold) and hanging payload.
    const tetherGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)]);
    this.tether = new THREE.Line(tetherGeom, new THREE.LineBasicMaterial({ color: 0xe6c34a }));
    this.tether.frustumCulled = false;
    scene.add(this.tether);
    const rover = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.0, 3.4), hullMat);
    this.payload.add(rover);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 0, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 12), darkMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(sx * 1.5, -0.6, sz * 1.3);
        this.payload.add(wheel);
      }
    }
    scene.add(this.payload);

    // Green 532 nm LiDAR cone: apex at the crane belly, opening toward the ground.
    const coneLen = 60;
    const coneGeom = new THREE.ConeGeometry(Math.tan(LIDAR_HALF_ANGLE_RAD) * coneLen, coneLen, 40, 1, true);
    // ConeGeometry has its apex at +Y; shift so the apex is at the origin and the base opens downward.
    coneGeom.translate(0, -coneLen / 2, 0);
    this.cone = new THREE.Mesh(
      coneGeom,
      new THREE.MeshBasicMaterial({
        color: 0x39ff6a,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.cone.frustumCulled = false;
    this.group.add(this.cone);

    const hx = BASE_ORIGIN.x - 40;
    const hz = BASE_ORIGIN.z + 35;
    this.hoverPos.set(hx, terrain.heightAt(hx, hz) + HOVER_AGL_M, hz);
    this.prevPos.copy(this.hoverPos);
    this.group.position.copy(this.hoverPos);
    scene.add(this.group);
    this.setVisible(false);
  }

  get visible(): boolean {
    return this.group.visible;
  }

  setVisible(on: boolean): void {
    this.group.visible = on;
    this.tether.visible = on;
    this.payload.visible = on;
  }

  /** Advances hover sway and the tether pendulum; `tau` dust opacity dims the LiDAR cone. */
  update(dtRaw: number, tau = 0.5): void {
    if (!this.group.visible) return;
    const dt = Math.min(Math.max(dtRaw, 0), 0.1);
    this.time += dt;
    const T = this.time;
    // Thruster station-keeping sway (m).
    const pos = new THREE.Vector3(
      this.hoverPos.x + Math.sin(T * 0.35) * 2.2,
      this.hoverPos.y + Math.sin(T * 0.6) * 0.5,
      this.hoverPos.z + Math.cos(T * 0.28) * 1.8,
    );
    const vx = dt > 0 ? (pos.x - this.prevPos.x) / dt : 0;
    const vz = dt > 0 ? (pos.z - this.prevPos.z) / dt : 0;
    const ax = dt > 0 ? (vx - this.prevVx) / dt : 0;
    const az = dt > 0 ? (vz - this.prevVz) / dt : 0;
    this.prevVx = vx;
    this.prevVz = vz;
    this.prevPos.copy(pos);
    this.group.position.copy(pos);

    if (dt > 0) {
      this.px = stepPendulum(this.px, dt, this.params, ax);
      this.pz = stepPendulum(this.pz, dt, this.params, az);
    }
    const L = this.params.length;
    const end = new THREE.Vector3(
      pos.x + Math.sin(this.px.theta) * L,
      pos.y - Math.cos(this.px.theta) * Math.cos(this.pz.theta) * L - 0.6,
      pos.z + Math.sin(this.pz.theta) * L,
    );
    const ground = this.terrain.heightAt(end.x, end.z) + 1.2;
    end.y = Math.max(end.y, ground);
    const attr = this.tether.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, pos.x, pos.y - 0.6, pos.z);
    attr.setXYZ(1, end.x, end.y + 0.5, end.z);
    attr.needsUpdate = true;
    this.payload.position.copy(end);
    this.payload.rotation.set(this.pz.theta, T * 0.2, -this.px.theta);

    // LiDAR cone scans: tilts slowly around the vertical, dust-dimmed.
    this.cone.rotation.set(Math.sin(T * 0.9) * 0.12, 0, Math.cos(T * 0.7) * 0.12);
    const mat = this.cone.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16 * (0.4 + 0.6 * Math.exp(-0.25 * Math.max(0, tau - 0.5)));
  }
}

/** Standalone toggle button (independent of the HUD and voice). Returns the button element. */
export function createSkyCraneToggle(onToggle: () => boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = "btn-skycrane";
  btn.className = "hud-btn";
  btn.setAttribute("data-pointable", "");
  btn.textContent = t("hud.skycrane");
  btn.title = `${t("hud.skycrane_hint")} (${LIDAR_WAVELENGTH_NM} nm)`;
  btn.style.cssText = "position:fixed;right:12px;bottom:84px;z-index:30;";
  btn.addEventListener("click", () => {
    btn.classList.toggle("active", onToggle());
  });
  document.body.appendChild(btn);
  return btn;
}
