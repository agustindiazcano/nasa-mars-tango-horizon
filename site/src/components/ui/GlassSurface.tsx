'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

export interface GlassSurfaceProps {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: string;
  yChannel?: string;
  mixBlendMode?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  role?: string;
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  'aria-label'?: string;
}

function detectSvgBackdropSupport(filterId: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  if (isSafari || isFirefox) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.backdropFilter = `url(#${filterId})`;
  return probe.style.backdropFilter !== '';
}

export function GlassSurface({
  children,
  width = '100%',
  height = 'auto',
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0.6,
  backgroundOpacity = 0.08,
  saturation = 1.25,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  className = '',
  style = {},
  onClick,
  role,
  tabIndex,
  onKeyDown,
  'aria-label': ariaLabel,
}: GlassSurfaceProps) {
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '-');
  const filterId = `glass-filter-${safeId}`;
  const redGradId = `glass-red-${safeId}`;
  const blueGradId = `glass-blue-${safeId}`;
  const blurId = `glass-blur-${safeId}`;

  const [svgSupported, setSvgSupported] = useState(false);
  const [boxSize, setBoxSize] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  const redDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const greenDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const blueDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement | null>(null);

  useEffect(() => {
    setSvgSupported(detectSvgBackdropSupport(filterId));
  }, [filterId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const updateSize = () => {
      setBoxSize(`${el.offsetWidth}x${el.offsetHeight}`);
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const actualWidth = Math.max(1, Math.round(rect?.width || 400));
    const actualHeight = Math.max(1, Math.round(rect?.height || 200));
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

    const svgMap = `
      <svg width="${actualWidth}" height="${actualHeight}" viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
          <filter id="${blurId}" filterUnits="userSpaceOnUse" x="0" y="0" width="${actualWidth}" height="${actualHeight}" color-interpolation-filters="sRGB">
            <feGaussianBlur stdDeviation="${blur}" />
          </filter>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${Math.max(1, actualWidth - edgeSize * 2)}" height="${Math.max(1, actualHeight - edgeSize * 2)}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" filter="url(#${blurId})" />
      </svg>
    `;

    const dataUri = `data:image/svg+xml,${encodeURIComponent(svgMap)}`;
    feImageRef.current?.setAttribute('href', dataUri);

    const channels = [
      { ref: redDispRef, offset: redOffset },
      { ref: greenDispRef, offset: greenOffset },
      { ref: blueDispRef, offset: blueOffset },
    ];

    channels.forEach(({ ref, offset }) => {
      if (!ref.current) return;
      ref.current.setAttribute('scale', String(distortionScale + offset));
      ref.current.setAttribute('xChannelSelector', xChannel);
      ref.current.setAttribute('yChannelSelector', yChannel);
    });

    gaussianBlurRef.current?.setAttribute('stdDeviation', String(Math.max(0, displace)));
  }, [
    boxSize,
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode,
    redGradId,
    blueGradId,
    blurId,
  ]);

  const containerStyle = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    '--glass-frost': backgroundOpacity,
    '--glass-saturation': saturation,
    '--filter-id': `url(#${filterId})`,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${svgSupported ? 'glass-surface--svg' : 'glass-surface--fallback'}${className ? ` ${className}` : ''}`}
      style={containerStyle}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage
              ref={feImageRef}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap ref={redDispRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="red"
            />
            <feDisplacementMap ref={greenDispRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="green"
            />
            <feDisplacementMap ref={blueDispRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="blue"
            />
            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation={Math.max(0, displace)} />
          </filter>
        </defs>
      </svg>

      {!svgSupported && (
        <>
          <span className="glass-surface__sheen" aria-hidden="true" />
          <span className="glass-surface__rim" aria-hidden="true" />
        </>
      )}

      <div className="glass-surface__content">{children}</div>
    </div>
  );
}

export default GlassSurface;
