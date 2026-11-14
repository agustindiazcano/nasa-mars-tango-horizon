# 04. 3D terrain, helmet and HUD

**Goal:** the first-person helmet view over real terrain in a Three.js viewer, with the life-support HUD and a menu driven by a cursor.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 4 and 7.5; guide 02 (`terrain/` format); guide 03 (`suitState`).
**Plan tasks:** 9, 10, 18.
**Location:** `web/src/`.

## Decisions

| Topic | Decision | Why |
|-------|----------|-----|
| Mesh | 512×512-segment plane (~8 m cells) displaced on the CPU | 524,000 triangles: 60 FPS on integrated graphics |
| Detail | 2048² normal map computed from height + 4096² orthoimage | Fine relief shows through lighting and texture |
| Physics | Bilinear sampling of the full 2048² array | ~2 m precision without depending on the mesh |
| HUD | HTML/CSS over the canvas, CSS 3D transforms to curve the panels | Crisp text, fast to build, easy to point at |
| Axes | x east, y up, z south (Three.js convention); origin at scene center | Matches `meta.json` |

## Code

`web/src/world/terrain.ts`:

```ts
import * as THREE from "three";

export interface TerrainMeta {
  product_id: string; size_m: number; height_px: number;
  z_min_m: number; z_max_m: number; center_lon_e: number; center_lat: number;
}

export class Terrain {
  mesh!: THREE.Mesh;
  meta!: TerrainMeta;
  private h!: Float32Array;
  private n = 0;

  async load(base = "/data/terrain"): Promise<void> {
    this.meta = await (await fetch(`${base}/meta.json`)).json();
    const raw = new Uint16Array(await (await fetch(`${base}/height_2048.u16`)).arrayBuffer());
    const { z_min_m: lo, z_max_m: hi, height_px: n, size_m: size } = this.meta;
    this.n = n;
    this.h = new Float32Array(raw.length);
    const mid = (lo + hi) / 2; // la altura se guarda relativa al punto medio para cuidar la precisión
    for (let i = 0; i < raw.length; i++) this.h[i] = lo + (raw[i] / 65535) * (hi - lo) - mid;

    const seg = 512;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.heightAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();

    const tex = await new THREE.TextureLoader().loadAsync(`${base}/ortho_4096.webp`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({
      map: tex, normalMap: this.buildNormalMap(), roughness: 1, metalness: 0,
      color: new THREE.Color(0xc98a5a), // la ortoimagen es en grises: se tiñe con el tono de Marte
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
  }

  /** Altura del terreno en metros (relativa) para coordenadas de mundo x (este), z (sur). */
  heightAt(x: number, z: number): number {
    const { size_m: size } = this.meta, n = this.n;
    const u = THREE.MathUtils.clamp((x / size + 0.5) * (n - 1), 0, n - 1.001);
    const v = THREE.MathUtils.clamp((z / size + 0.5) * (n - 1), 0, n - 1.001);
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * n + i;
    return (this.h[k] * (1 - fu) + this.h[k + 1] * fu) * (1 - fv) + (this.h[k + n] * (1 - fu) + this.h[k + n + 1] * fu) * fv;
  }

  /** Pendiente en grados en la dirección de máxima inclinación. */
  slopeAt(x: number, z: number, d = 2): number {
    const gx = (this.heightAt(x + d, z) - this.heightAt(x - d, z)) / (2 * d);
    const gz = (this.heightAt(x, z + d) - this.heightAt(x, z - d)) / (2 * d);
    return THREE.MathUtils.radToDeg(Math.atan(Math.hypot(gx, gz)));
  }

  /** Coordenadas de mundo → longitud este y latitud planetocéntrica, para el HUD. */
  toLonLat(x: number, z: number): { lon: number; lat: number } {
    const mPerDeg = (Math.PI / 180) * 3396190; // radio ecuatorial de Marte
    const lat = this.meta.center_lat - z / mPerDeg;
    const lon = this.meta.center_lon_e + x / (mPerDeg * Math.cos(THREE.MathUtils.degToRad(this.meta.center_lat)));
    return { lon, lat };
  }

  private buildNormalMap(): THREE.DataTexture {
    const n = this.n, cell = this.meta.size_m / n, data = new Uint8Array(n * n * 4);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const l = this.h[j * n + Math.max(i - 1, 0)], r = this.h[j * n + Math.min(i + 1, n - 1)];
      const u = this.h[Math.max(j - 1, 0) * n + i], d = this.h[Math.min(j + 1, n - 1) * n + i];
      const v = new THREE.Vector3((l - r) / (2 * cell), (u - d) / (2 * cell), 1).normalize();
      data.set([(v.x * 0.5 + 0.5) * 255, (v.y * 0.5 + 0.5) * 255, (v.z * 0.5 + 0.5) * 255, 255], (j * n + i) * 4);
    }
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    t.needsUpdate = true;
    return t;
  }
}
```

`web/src/world/astronaut.ts`:

```ts
import * as THREE from "three";
import type { Terrain } from "./terrain";

/** Controlador en primera persona pegado al terreno. Entrada por teclado y por comandos de agentes. */
export class Astronaut {
  pos = new THREE.Vector3(0, 0, 0);
  yaw = 0; pitch = 0;
  speed = 0;                 // m/s actual, la usa el modelo metabólico
  gradePct = 0;              // pendiente en la dirección de marcha
  readonly eye = 1.7;
  private keys = new Set<string>();

  constructor(private terrain: Terrain, private camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    addEventListener("keydown", (e) => this.keys.add(e.code));
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    dom.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== dom) return;
      this.yaw -= e.movementX * 0.002;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.002, -1.2, 1.2);
    });
  }

  update(dt: number, maxSpeed = 1.2): void {
    const f = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const s = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const dir = new THREE.Vector3(s, 0, -f);
    const moving = dir.lengthSq() > 0;
    if (moving) dir.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    const before = this.terrain.heightAt(this.pos.x, this.pos.z);
    const step = moving ? maxSpeed * dt : 0;
    const half = this.terrain.meta.size_m / 2 - 5;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x + dir.x * step, -half, half);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z + dir.z * step, -half, half);
    const after = this.terrain.heightAt(this.pos.x, this.pos.z);
    this.pos.y = after;
    this.speed = moving ? maxSpeed : 0;
    this.gradePct = step > 0 ? ((after - before) / step) * 100 : 0;
    this.camera.position.set(this.pos.x, after + this.eye, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}
```

`web/src/hud/hud.css` (essentials):

```css
:root { --ok:#35e0ff; --warn:#ffb800; --crit:#ff2a55; --glass:rgba(8,18,28,.42); }
#hud { position:fixed; inset:0; pointer-events:none; perspective:1100px; font:500 14px/1.3 "JetBrains Mono",ui-monospace,monospace; color:var(--ok); }
#visor { position:absolute; inset:0; box-shadow:inset 0 0 180px 60px rgba(0,0,0,.85); border-radius:46% / 38%; }
.panel { position:absolute; padding:12px 14px; background:var(--glass); border:1px solid currentColor; border-radius:10px;
         backdrop-filter:blur(8px); pointer-events:auto; transform-style:preserve-3d; }
.panel.left  { left:6%;  top:24%; transform:rotateY(24deg); transform-origin:left center; }
.panel.right { right:6%; top:24%; transform:rotateY(-24deg); transform-origin:right center; }
.panel.top   { left:50%; top:7%;  transform:translateX(-50%) rotateX(-10deg); }
.panel[data-level="warn"] { color:var(--warn); }
.panel[data-level="crit"] { color:var(--crit); animation:pulse .8s infinite; }
.value[data-src] { cursor:help; text-decoration:underline dotted; }
[data-pointable].hover { outline:2px solid #fff; box-shadow:0 0 18px currentColor; }
#cursor { position:fixed; width:22px; height:22px; margin:-11px; border:2px solid #fff; border-radius:50%; pointer-events:none; z-index:10; }
@keyframes pulse { 50% { opacity:.55; } }
```

`web/src/hud/pointer.ts` (one cursor, fed by the mouse or the phone):

```ts
/** Cursor del HUD en coordenadas normalizadas 0..1. Lo mueven el mouse o el celular (guía 06). */
export class HudPointer {
  x = 0.5; y = 0.5;
  private el = document.getElementById("cursor")!;
  private hovered: Element | null = null;

  constructor() {
    addEventListener("mousemove", (e) => {
      if (!document.pointerLockElement) this.move(e.clientX / innerWidth, e.clientY / innerHeight);
    });
  }

  move(x: number, y: number): void {
    this.x = Math.min(Math.max(x, 0), 1);
    this.y = Math.min(Math.max(y, 0), 1);
    const px = this.x * innerWidth, py = this.y * innerHeight;
    this.el.style.transform = `translate(${px}px, ${py}px)`;
    const t = document.elementFromPoint(px, py)?.closest("[data-pointable]") ?? null;
    if (t !== this.hovered) {
      this.hovered?.classList.remove("hover");
      t?.classList.add("hover");
      this.hovered = t;
    }
  }

  click(): void {
    (this.hovered as HTMLElement | null)?.click();
  }
}
```

## Instructions for the coding agent

1. **Scene** (`web/src/main.ts`): renderer with `antialias`, `outputColorSpace = SRGBColorSpace`, ACES tone mapping. Camera `near = 0.1`, `far = 60000`. Directional light at the real Sun position from `env/ephem.json`; faint ochre ambient light. Exponential fog whose color and density follow dust opacity.
2. **Sky:** shader sphere: gradient from light ochre at the horizon to darker at zenith, small solar disk (the Sun looks about 2/3 the size seen from Earth) and a bluish halo around it. A `uTau` uniform darkens and flattens the sky during the storm.
3. **Terrain:** use `Terrain`. Measure FPS; under 55 on the demo machine, drop the mesh to 384 segments. Do not shrink the texture.
4. **Helmet:** `#visor` gives the helmet vignette. Add a thin frame and a subtle reflection. Breathing moves the camera ±1 cm with a period set by metabolic rate.
5. **HUD panels:**
   - Left, life support: primary and reserve O2 (% and time left), suit pressure (kPa), CO2, battery, coolant, metabolic rate (W). Names and units from the SUITS schema (`shared/src/types/suit.ts`).
   - Top, mission: EVA clock, local solar time, real coordinates (`toLonLat`), heading, distance to base.
   - Right, environment: pressure, air and ground temperature (REMS), dose rate and cumulative dose (RAD), opacity, wind, storm forecast (guide 13).
   - Bottom: menu with `data-pointable` items (Map, Layers, Fleet, Agents, Health, Base, Provenance, Language), microphone indicator and voice transcript.
   - Minimap: 2D canvas with orthoimage, active layer, route, fleet units and Curiosity's traverse.
6. **Alert levels:** each panel gets `data-level` (`ok`, `warn`, `crit`) from thresholds defined in one file, `hud/thresholds.ts`, each with its source.
7. **Provenance (task 18):** every number in the HUD carries `data-src="<key>"`. Pointing and selecting opens a card with dataset, product ID, URL and transform (from `provenance.json`), or with the equation and the `C` constants if it is a computed value. The "Provenance" menu item opens the full table.
8. **Terrain layers:** `slope_1024.png`, `svf_1024.png`, `thermal_class.png` and `hydration_1024.png` as extra textures blended in the material (`onBeforeCompile` or a simple `ShaderMaterial`) with `uLayer` and `uLayerMix` uniforms. Each layer shows a legend with units.
9. **Global state:** a small store (`web/src/state.ts`) with subscriptions holding suit telemetry, environment, fleet, active layer and alerts. The HUD reads from it; physics and agents write to it. Agent commands arrive as actions (`set_layer`, `open_panel`, `show_alert`, `highlight`).
10. **Keyboard:** clicking the canvas enables pointer lock to look around; `Esc` releases it to use the menu with the mouse. `Tab` toggles helmet view and overhead view.
11. All visible text comes from the i18n module (guide 14).

## Acceptance criteria

- 60 FPS walking over real-texture terrain; the astronaut follows the relief.
- The HUD shows telemetry that changes while walking (metabolic rate rises uphill).
- Displayed coordinates fall inside the DTM footprint.
- Every menu item can be opened with the cursor alone (mouse).
- Pointing at any number shows its source.
