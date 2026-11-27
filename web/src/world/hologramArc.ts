import * as THREE from "three";

/**
 * Trajectory drawn as a hologram: a thin glowing core with light pulses running along it, a translucent "curtain"
 * that drops from the path to the ground, and a faint ground shadow line. Everything is additive and transparent.
 */

const CORE_VERT = /* glsl */ `
  varying float vU;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vU = uv.x;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const CORE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform vec3 uHot;
  varying float vU;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 1.6);
    float pulse = smoothstep(0.55, 1.0, sin(vU * 140.0 - uTime * 7.0) * 0.5 + 0.5);
    float head = smoothstep(0.0, 0.05, vU) * (1.0 - smoothstep(0.9, 1.0, vU));
    vec3 col = mix(uColor, uHot, pulse * 0.8);
    float a = (0.45 + rim * 0.6 + pulse * 0.5) * head;
    gl_FragColor = vec4(col * (0.8 + rim), a);
  }
`;

const CURTAIN_VERT = /* glsl */ `
  attribute float aFade;
  varying float vFade;
  varying float vU;
  void main() {
    vFade = aFade;
    vU = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CURTAIN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying float vFade;
  varying float vU;
  void main() {
    float scan = 0.55 + 0.45 * sin(vFade * 60.0 - uTime * 3.0);
    float grid = smoothstep(0.82, 1.0, sin(vU * 260.0) * 0.5 + 0.5);
    float a = vFade * (0.06 + 0.07 * scan + 0.12 * grid);
    gl_FragColor = vec4(uColor, a);
  }
`;

export interface HologramArc {
  group: THREE.Group;
  /** Advances the light pulses; call every frame with a time in seconds. */
  tick(timeS: number): void;
  dispose(): void;
}

/** Builds the hologram for `points` (world space); `groundAt` gives the terrain height under a point. */
export function makeHologramArc(points: readonly THREE.Vector3[], groundAt: (x: number, z: number) => number): HologramArc {
  const group = new THREE.Group();
  group.name = "hologram-arc";
  const materials: THREE.ShaderMaterial[] = [];
  const disposables: { dispose(): void }[] = [];

  if (points.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => p.clone()),
      false,
      "centripetal",
    );
    const segs = Math.min(400, Math.max(60, points.length * 2));
    const tube = new THREE.TubeGeometry(curve, segs, 0.3, 6, false);
    const coreMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x6fe8ff) }, uHot: { value: new THREE.Color(0xfff2c9) } },
      vertexShader: CORE_VERT,
      fragmentShader: CORE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(tube, coreMat);
    core.frustumCulled = false;
    group.add(core);
    materials.push(coreMat);
    disposables.push(tube, coreMat);

    // Curtain: a strip from every path sample down to the terrain, fading out toward the ground.
    const n = Math.min(points.length, 160);
    const step = (points.length - 1) / Math.max(1, n - 1);
    const pos: number[] = [];
    const fade: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = points[Math.min(points.length - 1, Math.round(i * step))];
      const g = groundAt(p.x, p.z) + 0.15;
      const top = Math.max(p.y, g);
      pos.push(p.x, top, p.z, p.x, g, p.z);
      fade.push(1, 0);
      uvs.push(i / (n - 1), 0, i / (n - 1), 1);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    cg.setAttribute("aFade", new THREE.Float32BufferAttribute(fade, 1));
    cg.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    cg.setIndex(idx);
    const curtainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x58d6f2) } },
      vertexShader: CURTAIN_VERT,
      fragmentShader: CURTAIN_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const curtain = new THREE.Mesh(cg, curtainMat);
    curtain.frustumCulled = false;
    group.add(curtain);
    materials.push(curtainMat);
    disposables.push(cg, curtainMat);

    // Ground shadow of the path.
    const shadowPts = Array.from({ length: n }, (_, i) => {
      const p = points[Math.min(points.length - 1, Math.round(i * step))];
      return new THREE.Vector3(p.x, groundAt(p.x, p.z) + 0.2, p.z);
    });
    const sg = new THREE.BufferGeometry().setFromPoints(shadowPts);
    const sm = new THREE.LineBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
    group.add(new THREE.Line(sg, sm));
    disposables.push(sg, sm);
  }

  return {
    group,
    tick(timeS) {
      for (const m of materials) m.uniforms.uTime.value = timeS;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
