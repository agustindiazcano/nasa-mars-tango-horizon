'use client';

import React, { useEffect, useRef } from 'react';

export interface ElectricBorderProps {
  children: React.ReactNode;
  color?: string;
  speed?: number;
  chaos?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
}

const CANVAS_PADDING = 18;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function hash1D(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash1D(ix + iy * 57.0);
  const b = hash1D(ix + 1 + iy * 57.0);
  const c = hash1D(ix + (iy + 1) * 57.0);
  const d = hash1D(ix + 1 + (iy + 1) * 57.0);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbmNoise(x: number, y: number): number {
  let value = 0;
  let amp = 0.55;
  let freq = 1;
  for (let i = 0; i < 3; i++) {
    value += amp * (valueNoise2D(x * freq, y * freq) * 2 - 1);
    freq *= 2.15;
    amp *= 0.48;
  }
  return value;
}

function sampleRoundedRectPoint(
  s: number,
  width: number,
  height: number,
  radius: number
): { x: number; y: number; nx: number; ny: number } {
  const r = clamp(radius, 0, Math.min(width, height) / 2);
  const topW = Math.max(0, width - 2 * r);
  const sideH = Math.max(0, height - 2 * r);
  const arcLen = (Math.PI / 2) * r;
  const perimeter = 2 * (topW + sideH) + 4 * arcLen;
  if (perimeter <= 0) return { x: 0, y: 0, nx: 0, ny: -1 };

  let d = ((s % perimeter) + perimeter) % perimeter;

  if (d < topW) {
    return { x: r + d, y: 0, nx: 0, ny: -1 };
  }
  d -= topW;

  if (d < arcLen) {
    const a = -Math.PI / 2 + (d / Math.max(arcLen, 1e-4)) * (Math.PI / 2);
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: width - r + nx * r, y: r + ny * r, nx, ny };
  }
  d -= arcLen;

  if (d < sideH) {
    return { x: width, y: r + d, nx: 1, ny: 0 };
  }
  d -= sideH;

  if (d < arcLen) {
    const a = (d / Math.max(arcLen, 1e-4)) * (Math.PI / 2);
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: width - r + nx * r, y: height - r + ny * r, nx, ny };
  }
  d -= arcLen;

  if (d < topW) {
    return { x: width - r - d, y: height, nx: 0, ny: 1 };
  }
  d -= topW;

  if (d < arcLen) {
    const a = Math.PI / 2 + (d / Math.max(arcLen, 1e-4)) * (Math.PI / 2);
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: r + nx * r, y: height - r + ny * r, nx, ny };
  }
  d -= arcLen;

  if (d < sideH) {
    return { x: 0, y: height - r - d, nx: -1, ny: 0 };
  }
  d -= sideH;

  const a = Math.PI + (d / Math.max(arcLen, 1e-4)) * (Math.PI / 2);
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  return { x: r + nx * r, y: r + ny * r, nx, ny };
}

export function ElectricBorder({
  children,
  color = '#f97316',
  speed = 1,
  chaos = 0.5,
  borderRadius = 2,
  className = '',
  style,
}: ElectricBorderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settingsRef = useRef({ color, speed, chaos, borderRadius });

  settingsRef.current = { color, speed, chaos, borderRadius };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = Math.max(1, container.offsetWidth);
    let height = Math.max(1, container.offsetHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let visible = true;
    let rafId = 0;

    const resize = () => {
      width = Math.max(1, container.offsetWidth);
      height = Math.max(1, container.offsetHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const totalW = width + CANVAS_PADDING * 2;
      const totalH = height + CANVAS_PADDING * 2;
      canvas.width = Math.max(1, Math.round(totalW * dpr));
      canvas.height = Math.max(1, Math.round(totalH * dpr));
      canvas.style.width = `${totalW}px`;
      canvas.style.height = `${totalH}px`;
    };

    resize();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(container);

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            if (visible && !rafId) {
              rafId = requestAnimationFrame(draw);
            }
          })
        : null;
    intersectionObserver?.observe(container);

    const drawStrand = (
      perimeter: number,
      steps: number,
      t: number,
      seedOffset: number,
      amplitude: number,
      strokeColor: string,
      lineWidth: number,
      shadowBlur: number,
      alpha: number,
      radius: number
    ) => {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const s = u * perimeter;
        const pt = sampleRoundedRectPoint(s, width, height, radius);
        // Wrap noise seamlessly along perimeter using circular coordinates
        const theta = u * Math.PI * 2;
        const nx = Math.cos(theta) * 3.2 + seedOffset;
        const ny = Math.sin(theta) * 3.2 + t;
        const disp = fbmNoise(nx, ny) * amplitude;
        const px = CANVAS_PADDING + pt.x + pt.nx * disp;
        const py = CANVAS_PADDING + pt.y + pt.ny * disp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = shadowBlur;
      ctx.stroke();
      ctx.restore();
    };

    const draw = (now: number) => {
      rafId = 0;
      if (!visible || document.hidden) return;

      const s = settingsRef.current;
      const t = reducedMotion ? 1.5 : now * 0.001 * Math.max(0.1, s.speed) * 2.2;
      const chaosScale = clamp(s.chaos, 0, 2);
      const radius = Math.max(0, s.borderRadius);
      const r = clamp(radius, 0, Math.min(width, height) / 2);
      const perimeter = 2 * (width + height - 4 * r) + 2 * Math.PI * r;
      const steps = clamp(Math.round(perimeter / 4), 48, 220);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width + CANVAS_PADDING * 2, height + CANVAS_PADDING * 2);

      // Outer energetic halo strand
      drawStrand(
        perimeter,
        steps,
        t * 0.85,
        11.3,
        6.5 * chaosScale,
        s.color,
        2.2,
        14,
        0.55,
        radius
      );

      // Secondary counter-phase electric arc
      drawStrand(
        perimeter,
        steps,
        -t * 1.15,
        37.7,
        4.6 * chaosScale,
        s.color,
        1.4,
        8,
        0.75,
        radius
      );

      // Crisp bright plasma core
      drawStrand(
        perimeter,
        steps,
        t * 1.4,
        71.1,
        2.6 * chaosScale,
        '#fff8f1',
        0.95,
        4,
        0.85,
        radius
      );

      if (!reducedMotion) {
        rafId = requestAnimationFrame(draw);
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden && visible && !rafId) {
        rafId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`electric-border${className ? ` ${className}` : ''}`}
      style={{ borderRadius, ...style }}
    >
      {children}
      <canvas
        ref={canvasRef}
        className="electric-border__canvas"
        style={{ top: -CANVAS_PADDING, left: -CANVAS_PADDING }}
        aria-hidden="true"
      />
    </div>
  );
}

export default ElectricBorder;
