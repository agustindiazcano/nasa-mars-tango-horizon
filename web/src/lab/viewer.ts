import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type CameraPreset = "orbit" | "top" | "front" | "side";

/** Orbit viewer with a ground grid and Mars-like lighting (warm sun, dusty hemisphere). */
export class Viewer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.01, 2000);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly grid: THREE.GridHelper;
  private readonly clock = new THREE.Clock();
  private readonly tickers = new Set<(dt: number, elapsed: number) => void>();
  private frameBox = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
  private raf = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.background = new THREE.Color(0x2a1d16);
    this.scene.fog = new THREE.Fog(0x2a1d16, 40, 200);

    this.scene.add(new THREE.HemisphereLight(0xffd9b8, 0x4a2a1c, 1.0));
    const sun = new THREE.DirectionalLight(0xfff0dd, 3.0);
    sun.position.set(6, 10, 7);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffb27a, 0.7);
    fill.position.set(-6, 3, -5);
    this.scene.add(fill);

    this.grid = new THREE.GridHelper(40, 40, 0x8a5a3a, 0x4a3022);
    this.scene.add(this.grid);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  onTick(fn: (dt: number, elapsed: number) => void): () => void {
    this.tickers.add(fn);
    return () => this.tickers.delete(fn);
  }

  start(): void {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.elapsedTime;
      for (const fn of this.tickers) fn(dt, elapsed);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** Frames `box` and sizes the grid to it. */
  frame(box: THREE.Box3, preset: CameraPreset = "orbit", closeness = 1): void {
    this.frameBox = box.clone();
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.01) * 0.5;
    const dist = (radius / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.25 * closeness;
    const dir = {
      orbit: new THREE.Vector3(0.8, 0.5, 1).normalize(),
      top: new THREE.Vector3(0.001, 1, 0.35).normalize(),
      front: new THREE.Vector3(0, 0.05, 1).normalize(),
      side: new THREE.Vector3(1, 0.05, 0).normalize(),
    }[preset];
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.near = Math.max(dist / 500, 0.001);
    this.camera.far = dist * 80;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.minDistance = dist * 0.05;
    this.controls.maxDistance = dist * 8;
    this.controls.update();
    const gridSize = Math.max(2, Math.ceil(radius * 6));
    this.grid.scale.setScalar(gridSize / 40);
    this.grid.position.y = box.min.y;
    (this.scene.fog as THREE.Fog).near = dist * 3;
    (this.scene.fog as THREE.Fog).far = dist * 30;
  }

  /** Aims the camera at a point from the front with a given distance (close-up shots). */
  lookAt(target: THREE.Vector3, distance: number, azimuthDeg = 25, elevationDeg = 8): void {
    const az = THREE.MathUtils.degToRad(azimuthDeg);
    const el = THREE.MathUtils.degToRad(elevationDeg);
    this.camera.position.set(
      target.x + distance * Math.sin(az) * Math.cos(el),
      target.y + distance * Math.sin(el),
      target.z + distance * Math.cos(az) * Math.cos(el),
    );
    this.controls.target.copy(target);
    this.camera.near = Math.max(distance / 200, 0.001);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  get lastFrame(): THREE.Box3 {
    return this.frameBox;
  }
}

/** Disposes geometries, materials and textures under `object`. */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}
