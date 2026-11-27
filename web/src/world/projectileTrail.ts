import * as THREE from "three";

/**
 * Exhaust and smoke of a launched projectile: a short bright ember glow right behind the pod and a longer grey smoke
 * that drifts and spreads, so the path reads as the track of a rocket fired from the cannon. A dust burst is added when
 * the pod touches down. Particles live in a fixed pool; nothing is allocated per frame.
 */

const MAX = 900;

const VERT = /* glsl */ `
  attribute float aAge;
  attribute float aLife;
  attribute float aSize;
  attribute float aKind;
  varying float vT;
  varying float vKind;
  uniform float uScale;
  void main() {
    vT = clamp(aAge / aLife, 0.0, 1.0);
    vKind = aKind;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float grow = 1.0 + vT * (aKind < 0.5 ? 0.6 : 3.2);
    gl_PointSize = aLife <= 0.0 ? 0.0 : min(140.0, aSize * grow * uScale / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying float vT;
  varying float vKind;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, d);
    vec3 col;
    float a;
    if (vKind < 0.5) {
      // Ember: white-hot to orange, fades fast.
      col = mix(vec3(1.0, 0.92, 0.62), vec3(1.0, 0.38, 0.08), vT);
      a = soft * (1.0 - vT) * 0.95;
    } else if (vKind < 1.5) {
      // Smoke: warm grey that cools and thins out.
      col = mix(vec3(0.62, 0.55, 0.5), vec3(0.78, 0.72, 0.66), vT);
      a = soft * (1.0 - vT) * 0.42;
    } else {
      // Dust: rust brown.
      col = mix(vec3(0.7, 0.45, 0.28), vec3(0.8, 0.6, 0.45), vT);
      a = soft * (1.0 - vT) * 0.5;
    }
    gl_FragColor = vec4(col, a);
  }
`;

export class ProjectileTrail {
  readonly group = new THREE.Group();
  private pos = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private age = new Float32Array(MAX);
  private life = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private kind = new Float32Array(MAX);
  private geo = new THREE.BufferGeometry();
  private mat: THREE.ShaderMaterial;
  private next = 0;
  private last: THREE.Vector3 | null = null;
  private carry = 0;

  constructor() {
    this.group.name = "projectile-trail";
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("aAge", new THREE.BufferAttribute(this.age, 1));
    this.geo.setAttribute("aLife", new THREE.BufferAttribute(this.life, 1));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute("aKind", new THREE.BufferAttribute(this.kind, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 900 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(this.geo, this.mat);
    points.frustumCulled = false;
    this.group.add(points);
  }

  reset(): void {
    this.life.fill(0);
    this.age.fill(0);
    this.last = null;
    this.carry = 0;
    this.touch();
  }

  /** Marks the stream as ended (no segment is drawn from the last position to the next one). */
  endStream(): void {
    this.last = null;
  }

  /** Emits ember and smoke along the segment from the previous call to `p`, about one puff every 0.5 m. */
  emit(p: THREE.Vector3, hot: boolean): void {
    if (this.last) {
      const d = this.last.distanceTo(p);
      const spacing = 0.5;
      let t = this.carry;
      while (t < d) {
        const k = t / Math.max(d, 1e-6);
        const x = this.last.x + (p.x - this.last.x) * k;
        const y = this.last.y + (p.y - this.last.y) * k;
        const z = this.last.z + (p.z - this.last.z) * k;
        const j = () => (Math.random() - 0.5);
        if (hot) this.spawn(x + j() * 0.15, y + j() * 0.15, z + j() * 0.15, j() * 0.4, j() * 0.4, j() * 0.4, 0, 0.45, 0.9);
        this.spawn(x + j() * 0.25, y + j() * 0.25, z + j() * 0.25, j() * 0.8, 0.25 + Math.random() * 0.35, j() * 0.8, 1, 6 + Math.random() * 3, 0.85);
        t += spacing;
      }
      this.carry = t - d;
    }
    this.last = p.clone();
  }

  /** Dust thrown up where the pod touches the ground. */
  dustBurst(p: THREE.Vector3): void {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.2 + Math.random() * 3.2;
      this.spawn(p.x, p.y + 0.2, p.z, Math.cos(a) * s, 0.6 + Math.random() * 1.8, Math.sin(a) * s, 2, 2.2 + Math.random() * 2.2, 1.1);
    }
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, kind: number, life: number, size: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.age[i] = 0;
    this.life[i] = life;
    this.size[i] = size;
    this.kind[i] = kind;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.life[i] = 0;
        continue;
      }
      const drag = this.kind[i] === 0 ? 0.9 : 0.97;
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] *= drag;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.touch();
  }

  private touch(): void {
    for (const name of ["position", "aAge", "aLife", "aSize", "aKind"]) {
      (this.geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}
