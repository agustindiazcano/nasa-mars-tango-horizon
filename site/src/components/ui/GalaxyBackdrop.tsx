'use client';

import { useEffect, useRef } from 'react';

export interface GalaxyBackdropProps {
  transparent?: boolean;
  speed?: number;
  density?: number;
  hueShift?: number;
  glowIntensity?: number;
  saturation?: number;
  twilight?: number;
  mouseInteraction?: boolean;
  mouseRepulsion?: boolean;
  className?: string;
}

const VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uTwilight;
uniform vec2 uMouse;
uniform bool uMouseInteraction;
uniform bool uMouseRepulsion;
uniform float uMouseActive;

varying vec2 vUv;

#define NUM_LAYERS 4.0
#define ROT45 mat2(0.70710678, -0.70710678, 0.70710678, 0.70710678)

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * fract(x) - 1.0));
}

float trisn(float x) {
  return 2.0 * tris(x) - 1.0;
}

vec3 hueShiftColor(vec3 col, float deg) {
  float rad = radians(deg);
  vec3 k = vec3(0.57735026919);
  float cosAngle = cos(rad);
  return col * cosAngle + cross(k, col) * sin(rad) + k * dot(k, col) * (1.0 - cosAngle);
}

float starShape(vec2 uv, float flare) {
  float d = max(length(uv), 0.001);
  float core = (0.045 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 950.0));
  core += rays * flare * uGlowIntensity;
  vec2 rotUv = uv * ROT45;
  float diagRays = smoothstep(0.0, 1.0, 1.0 - abs(rotUv.x * rotUv.y * 950.0));
  core += diagRays * 0.32 * flare * uGlowIntensity;
  core *= smoothstep(1.0, 0.18, d);
  return core;
}

vec3 starLayer(vec2 uv, float starSpeed) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 cellId = id + offset;
      float seed = hash21(cellId);
      float size = fract(seed * 345.32);
      float glossLocal = tri(starSpeed / (3.0 * seed + 1.0));
      float flareSize = smoothstep(0.88, 1.0, size) * glossLocal;
      vec2 jitter = vec2(
        tris(seed * 34.0 + uTime * uSpeed * 0.1),
        tris(seed * 38.0 + uTime * uSpeed * 0.033)
      ) - 0.5;

      float star = starShape(gv - offset - jitter, flareSize);
      float twinkle = mix(
        1.0,
        trisn(uTime * uSpeed + seed * 6.28318) * 0.5 + 1.0,
        clamp(uTwilight, 0.0, 1.0)
      );

      vec3 tint = mix(vec3(0.82, 0.92, 1.0), vec3(1.0, 0.86, 0.68), fract(seed * 73.17));
      tint = mix(vec3(dot(tint, vec3(0.299, 0.587, 0.114))), tint, clamp(uSaturation + 0.35, 0.0, 1.5));
      tint = hueShiftColor(tint, uHueShift);

      col += star * size * twinkle * tint;
    }
  }
  return col;
}

float nebulaNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float val = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    val += amp * nebulaNoise(p);
    p = p * 2.02 + vec2(17.1, 31.7);
    amp *= 0.5;
  }
  return val;
}

void main() {
  vec2 focalPx = vec2(0.5) * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / max(uResolution.y, 1.0);

  if (uMouseInteraction) {
    vec2 parallax = (uMouse - 0.5) * 0.14 * uMouseActive;
    uv += parallax;
  }

  if (uMouseRepulsion) {
    vec2 mousePosUv = (uMouse * uResolution.xy - focalPx) / max(uResolution.y, 1.0);
    float mouseDist = length(uv - mousePosUv);
    uv += normalize(uv - mousePosUv + 0.0001) * (2.0 / (mouseDist + 0.12)) * 0.045 * uMouseActive;
  }

  float rotAngle = uTime * 0.05 * uSpeed;
  uv = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle)) * uv;

  // Subtle deep-space nebula glow
  float neb1 = fbm(uv * 2.2 + vec2(uTime * 0.015 * uSpeed, -uTime * 0.01 * uSpeed));
  float neb2 = fbm(uv * 3.8 - vec2(uTime * 0.012 * uSpeed, uTime * 0.018 * uSpeed));
  vec3 nebulaCol = mix(vec3(0.02, 0.07, 0.16), vec3(0.14, 0.05, 0.18), neb2) * smoothstep(0.35, 0.9, neb1);
  nebulaCol = hueShiftColor(nebulaCol, uHueShift * 0.35) * (0.28 + 0.35 * uTwilight);

  float starSpeed = uTime * 0.04 * uSpeed;
  vec3 stars = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYERS) {
    float depth = fract(i + starSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.88, depth);
    stars += starLayer(uv * scale + i * 453.32, starSpeed) * fade;
  }

  vec3 finalColor = nebulaCol + stars;
  float alpha = clamp(max(length(stars) * 1.15, length(nebulaCol) * 1.4), 0.0, 1.0);
  gl_FragColor = vec4(finalColor, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function GalaxyBackdrop({
  transparent = true,
  speed = 1.0,
  density = 1.0,
  hueShift = 140,
  glowIntensity = 0.32,
  saturation = 0.35,
  twilight = 0.35,
  mouseInteraction = true,
  mouseRepulsion = true,
  className = '',
}: GalaxyBackdropProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef({
    transparent,
    speed,
    density,
    hueShift,
    glowIntensity,
    saturation,
    twilight,
    mouseInteraction,
    mouseRepulsion,
  });

  settingsRef.current = {
    transparent,
    speed,
    density,
    hueShift,
    glowIntensity,
    saturation,
    twilight,
    mouseInteraction,
    mouseRepulsion,
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      return () => {
        if (canvas.parentNode === container) container.removeChild(canvas);
      };
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = vs && fs ? gl.createProgram() : null;

    if (!vs || !fs || !program) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (program) gl.deleteProgram(program);
      if (canvas.parentNode === container) container.removeChild(canvas);
      return undefined;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      if (canvas.parentNode === container) container.removeChild(canvas);
      return undefined;
    }

    gl.useProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(program, 'aUv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uDensity: gl.getUniformLocation(program, 'uDensity'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
      uGlowIntensity: gl.getUniformLocation(program, 'uGlowIntensity'),
      uSaturation: gl.getUniformLocation(program, 'uSaturation'),
      uTwilight: gl.getUniformLocation(program, 'uTwilight'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uMouseInteraction: gl.getUniformLocation(program, 'uMouseInteraction'),
      uMouseRepulsion: gl.getUniformLocation(program, 'uMouseRepulsion'),
      uMouseActive: gl.getUniformLocation(program, 'uMouseActive'),
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const targetMouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    let targetActive = 0;
    let smoothActive = 0;

    const onPointerMove = (e: PointerEvent) => {
      const s = settingsRef.current;
      if (!s.mouseInteraction && !s.mouseRepulsion) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetMouse.x = e.clientX / w;
      targetMouse.y = 1.0 - e.clientY / h;
      targetActive = 1.0;
    };

    const onPointerLeave = () => {
      targetActive = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let contextLost = false;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    canvas.addEventListener('webglcontextlost', onContextLost);

    const render = (now: number) => {
      if (contextLost) return;
      rafId = requestAnimationFrame(render);
      if (document.hidden) return;

      const s = settingsRef.current;
      const timeSec = reducedMotion ? 12.0 : now * 0.001;

      smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.06;
      smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.06;
      smoothActive += (targetActive - smoothActive) * 0.05;

      if (s.transparent) {
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
      } else {
        gl.clearColor(0.0196, 0.0196, 0.0314, 1.0);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform1f(uniforms.uTime, timeSec);
      gl.uniform3f(
        uniforms.uResolution,
        canvas.width,
        canvas.height,
        canvas.width / Math.max(1, canvas.height)
      );
      gl.uniform1f(uniforms.uSpeed, s.speed);
      gl.uniform1f(uniforms.uDensity, s.density);
      gl.uniform1f(uniforms.uHueShift, s.hueShift);
      gl.uniform1f(uniforms.uGlowIntensity, s.glowIntensity);
      gl.uniform1f(uniforms.uSaturation, s.saturation);
      gl.uniform1f(uniforms.uTwilight, s.twilight);
      gl.uniform2f(uniforms.uMouse, smoothMouse.x, smoothMouse.y);
      gl.uniform1i(uniforms.uMouseInteraction, s.mouseInteraction ? 1 : 0);
      gl.uniform1i(uniforms.uMouseRepulsion, s.mouseRepulsion ? 1 : 0);
      gl.uniform1f(uniforms.uMouseActive, smoothActive);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (!gl.isContextLost()) {
        if (posBuffer) gl.deleteBuffer(posBuffer);
        if (uvBuffer) gl.deleteBuffer(uvBuffer);
        gl.deleteProgram(program);
      }
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`galaxy-backdrop${className ? ` ${className}` : ''}`}
      style={{
        backgroundColor: transparent ? 'transparent' : '#050508',
      }}
    />
  );
}

export default GalaxyBackdrop;
