import * as THREE from "three";
import { mulberry32 } from "@th/shared";

export class SkyDust {
  readonly sky: THREE.Mesh;
  readonly dust: THREE.Points;
  readonly sunLight: THREE.DirectionalLight;
  readonly ambientLight: THREE.HemisphereLight;
  private skyMat: THREE.ShaderMaterial;
  private dustMat: THREE.ShaderMaterial;
  private sunDir = new THREE.Vector3(0.55, 0.68, -0.48).normalize();

  constructor(scene: THREE.Scene) {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTau: { value: 0.48 },
        uSunDir: { value: this.sunDir.clone() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTau;
        uniform vec3 uSunDir;
        varying vec3 vWorldDir;
        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y, 0.0, 1.0);
          float storm = clamp((uTau - 0.5) / 6.0, 0.0, 1.0);

          vec3 horizonClear = vec3(0.86, 0.52, 0.31);
          vec3 zenithClear  = vec3(0.42, 0.25, 0.17);
          vec3 horizonStorm = vec3(0.56, 0.31, 0.17);
          vec3 zenithStorm  = vec3(0.30, 0.16, 0.10);

          vec3 skyCol = mix(mix(horizonClear, zenithClear, pow(h, 0.52)),
                            mix(horizonStorm, zenithStorm, pow(h, 0.52)), storm);

          // Atmospheric limb / horizon dust-scattering rim band
          float horizonBand = exp(-abs(d.y) * 14.0) * (1.0 - storm * 0.45);
          vec3 rimGlow = vec3(0.95, 0.54, 0.28) * horizonBand * 0.28;

          // Small Martian solar disk (~2/3 Earth size) + characteristic dusty bluish aureole
          float cosA = dot(d, normalize(uSunDir));
          float halo = pow(max(cosA, 0.0), 22.0) * (1.0 - storm * 0.75);
          float disk = smoothstep(0.99978, 0.99993, cosA) * (1.0 - storm * 0.92);
          vec3 aureole = vec3(0.58, 0.70, 0.88) * halo * 0.48;
          vec3 sunCol  = vec3(1.0, 0.96, 0.90) * disk * 2.5;

          gl_FragColor = vec4(skyCol + rimGlow + aureole + sunCol, 1.0);
        }
      `,
    });

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(18000, 32, 20), this.skyMat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // 10,000 GPU dust storm particles
    const count = 10000;
    const box = 140;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const rnd = mulberry32(1337);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * box;
      pos[i * 3 + 1] = rnd() * 26;
      pos[i * 3 + 2] = (rnd() - 0.5) * box;
      seed[i] = rnd();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    this.dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uTau: { value: 0.48 },
        uBox: { value: box },
        uWind: { value: new THREE.Vector2(5.2, 2.1) },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uTau, uBox;
        uniform vec2 uWind;
        attribute float aSeed;
        varying float vA;
        void main() {
          vec3 p = position;
          p.xz = mod(p.xz + uWind * uTime * (0.55 + aSeed) + uBox * 0.5, uBox) - uBox * 0.5;
          p.y += sin(uTime * (0.6 + aSeed) + aSeed * 35.0) * 1.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp((28.0 + 55.0 * aSeed) / max(-mv.z, 1.0), 1.5, 14.0);
          vA = (0.08 + smoothstep(0.4, 4.5, uTau) * 0.55) * (0.3 + 0.7 * aSeed);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(0.80, 0.56, 0.37, vA * (1.0 - d * 2.0));
        }
      `,
    });

    this.dust = new THREE.Points(dustGeo, this.dustMat);
    this.dust.frustumCulled = false;
    scene.add(this.dust);

    this.sunLight = new THREE.DirectionalLight(0xffdfc2, 2.4);
    this.sunLight.position.copy(this.sunDir).multiplyScalar(600);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1400;
    const d = 160;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    scene.add(this.sunLight);

    this.ambientLight = new THREE.HemisphereLight(0xd99e72, 0x4d2a18, 0.72);
    scene.add(this.ambientLight);
  }

  update(
    timeS: number,
    tau: number,
    windMs: number,
    windDirRad: number,
    sunElevDeg: number,
    anchorX: number,
    anchorY: number,
    anchorZ: number,
    scene: THREE.Scene,
  ): void {
    const elev = THREE.MathUtils.degToRad(Math.max(4, sunElevDeg));
    this.sunDir.set(Math.cos(elev) * 0.75, Math.sin(elev), Math.cos(elev) * -0.66).normalize();
    this.skyMat.uniforms.uTau.value = tau;
    this.skyMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.sky.position.set(anchorX, anchorY, anchorZ);

    this.dustMat.uniforms.uTime.value = timeS;
    this.dustMat.uniforms.uTau.value = tau;
    this.dustMat.uniforms.uWind.value.set(Math.cos(windDirRad) * windMs, Math.sin(windDirRad) * windMs);
    this.dust.position.set(anchorX, anchorY - 2, anchorZ);

    const storm = THREE.MathUtils.clamp((tau - 0.5) / 6.0, 0, 1);
    this.sunLight.intensity = THREE.MathUtils.lerp(2.4, 0.45, storm);
    this.sunLight.position.set(anchorX, anchorY, anchorZ).addScaledVector(this.sunDir, 500);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.72, 0.35, storm);

    const fogColor = new THREE.Color().setRGB(
      THREE.MathUtils.lerp(0.78, 0.56, storm),
      THREE.MathUtils.lerp(0.53, 0.35, storm),
      THREE.MathUtils.lerp(0.35, 0.21, storm),
    );
    const fogDensity = 0.00038 + Math.max(0, tau - 0.4) * 0.0048;
    if (!scene.fog || !(scene.fog instanceof THREE.FogExp2)) {
      scene.fog = new THREE.FogExp2(fogColor.getHex(), fogDensity);
    } else {
      scene.fog.color.copy(fogColor);
      scene.fog.density = fogDensity;
    }
  }
}
