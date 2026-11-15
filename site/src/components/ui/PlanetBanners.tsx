'use client';

import React, { useId, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export interface PlanetBannerProps {
  size?: number;
  className?: string;
  showTelemetry?: boolean;
}

export interface MarsBannerProps {
  size?: number;
  className?: string;
  showCallouts?: boolean;
}

export interface EarthGlobeProps {
  size?: number;
  className?: string;
  showAtmosphere?: boolean;
}

const PLANET_BANNER_STYLES = `
  @keyframes planetStripSpin {
    0% { background-position: 0px 0px; }
    100% { background-position: 500px 0px; }
  }
  :where(.moon-banner-container),
  :where(.mars-banner-container) {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.9rem;
    padding: 1.5rem 0 0.75rem 0;
  }
  :where(.moon-banner-showcase) {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :where(.section-banner) {
    position: relative;
    width: 250px;
    height: 250px;
    border-radius: 50%;
    background-color: #6b7280;
    background-size: 500px 250px;
    background-repeat: repeat-x;
    background-position: 0 0;
    animation: planetStripSpin 30s linear infinite;
    filter: contrast(1.12) brightness(1.04);
    box-shadow:
      0 0 28px rgba(226, 232, 240, 0.22),
      -6px 0 10px rgba(241, 245, 249, 0.65) inset,
      16px 2px 26px #000 inset,
      -24px -2px 34px rgba(203, 213, 225, 0.42) inset,
      250px 0 44px rgba(0, 0, 0, 0.42) inset,
      150px 0 38px rgba(0, 0, 0, 0.68) inset;
  }
  :where(.mars-section-banner) {
    background-color: #b45309;
    animation: planetStripSpin 34s linear infinite;
    filter: contrast(1.14) saturate(1.08) brightness(1.02);
    box-shadow:
      0 0 36px rgba(251, 146, 60, 0.36),
      -6px 0 12px rgba(254, 215, 170, 0.62) inset,
      18px 2px 28px #000 inset,
      -24px -2px 34px rgba(234, 88, 12, 0.45) inset,
      250px 0 44px rgba(0, 0, 0, 0.42) inset,
      150px 0 38px rgba(0, 0, 0, 0.68) inset;
  }
  :where(.planet-banner-rim) {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    pointer-events: none;
  }
  :where(.planet-telemetry-bar) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
  }
  :where(.planet-telemetry-chip) {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.28rem 0.72rem;
    border-radius: 10px;
    font-family: var(--font-raleway), 'Raleway', sans-serif;
    font-variant-numeric: tabular-nums;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    background: rgba(17, 8, 12, 0.84);
    backdrop-filter: blur(8px);
  }
  @media (prefers-reduced-motion: reduce) {
    :where(.section-banner),
    :where(.mars-section-banner) {
      animation: none;
    }
  }
`;

export function PhotorealisticMoonBanner({
  size = 250,
  className = '',
  showTelemetry = true,
}: PlanetBannerProps = {}) {
  const { lang } = useLanguage();
  const isEs = lang === 'es';

  return (
    <div className={`moon-banner-container ${className}`.trim()}>
      <style>{PLANET_BANNER_STYLES}</style>
      <div className="moon-banner-showcase">
        <div
          className="planet-banner-rim"
          aria-hidden="true"
          style={{
            boxShadow:
              '0 0 42px rgba(251, 191, 36, 0.22), inset 0 0 22px rgba(253, 186, 116, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.24)',
          }}
        />
        <div
          className="section-banner"
          role="img"
          aria-label={
            isEs
              ? 'Esfera lunar fotorrealista en rotación'
              : 'Photorealistic rotating lunar sphere'
          }
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: 'url("/images/moon-texture.png")',
            backgroundSize: `${size * 2}px ${size}px`,
          }}
        />
      </div>

      {showTelemetry && (
        <div className="planet-telemetry-bar">
          <span
            className="planet-telemetry-chip"
            style={{
              color: '#fbbf24',
              border: '1px solid rgba(255, 255, 255, 0.24)',
            }}
          >
            {isEs ? 'BASE TRANQUILIDAD · APOLO 11' : 'TRANQUILITY BASE · APOLLO 11'}
          </span>
          <span
            className="planet-telemetry-chip"
            style={{
              color: '#fdba74',
              border: '1px solid rgba(255, 255, 255, 0.24)',
            }}
          >
            {isEs ? '384.400 KM · 0.165 G' : '384,400 KM · 0.165 G'}
          </span>
        </div>
      )}
    </div>
  );
}

export function PhotorealisticMarsBanner({
  size = 250,
  className = '',
  showCallouts = true,
}: MarsBannerProps = {}) {
  const { lang } = useLanguage();
  const isEs = lang === 'es';

  return (
    <div className={`mars-banner-container ${className}`.trim()}>
      <style>{PLANET_BANNER_STYLES}</style>
      <div className="moon-banner-showcase">
        <div
          className="planet-banner-rim"
          aria-hidden="true"
          style={{
            boxShadow:
              '0 0 48px rgba(251, 146, 60, 0.32), inset 0 0 24px rgba(254, 215, 170, 0.18)',
            border: '1px solid rgba(251, 146, 60, 0.24)',
          }}
        />
        <div
          className="section-banner mars-section-banner"
          role="img"
          aria-label={
            isEs
              ? 'Esfera marciana fotorrealista en rotación'
              : 'Photorealistic rotating Martian sphere'
          }
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: 'url("/images/mars-texture.jpg.jpeg")',
            backgroundSize: `${size * 2}px ${size}px`,
          }}
        />
      </div>

      {showCallouts && (
        <div className="planet-telemetry-bar">
          <span
            className="planet-telemetry-chip"
            style={{
              color: '#fed7aa',
              border: '1px solid rgba(251, 146, 60, 0.4)',
            }}
          >
            {isEs
              ? 'CRÁTER GALE · PERSEVERANCE · CURIOSITY'
              : 'GALE CRATER · PERSEVERANCE · CURIOSITY'}
          </span>
          <span
            className="planet-telemetry-chip"
            style={{
              color: '#fb923c',
              border: '1px solid rgba(251, 146, 60, 0.3)',
            }}
          >
            {isEs ? 'VALLES MARINERIS · 4.000 KM' : 'VALLES MARINERIS · 4,000 KM'}
          </span>
        </div>
      )}
    </div>
  );
}

const EARTH_ASPECT = 1024 / 575;

export function EarthGlobe({
  size = 84,
  className = '',
  showAtmosphere = true,
}: EarthGlobeProps) {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const uid = useId().replace(/:/g, '');
  const [spinOffset, setSpinOffset] = useState(0);
  const dragRef = useRef<{ active: boolean; startX: number; baseSpin: number }>({
    active: false,
    startX: 0,
    baseSpin: 0,
  });

  const radius = 46;
  const height = radius * 2;
  const width = height * EARTH_ASPECT * 1.1;
  const start = -(width * 0.18) + (spinOffset % width);

  return (
    <div
      className={`earth-globe-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        flexShrink: 0,
        cursor: 'grab',
        touchAction: 'pan-y',
        userSelect: 'none',
      }}
      title={
        isEs
          ? 'Arrastrá horizontalmente para rotar la Tierra'
          : 'Drag horizontally to rotate Earth'
      }
      onPointerDown={(e) => {
        dragRef.current = { active: true, startX: e.clientX, baseSpin: spinOffset };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        const delta = e.clientX - dragRef.current.startX;
        setSpinOffset(dragRef.current.baseSpin + delta * 0.85);
      }}
      onPointerUp={(e) => {
        dragRef.current.active = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }}
      onPointerCancel={() => {
        dragRef.current.active = false;
      }}
    >
      <svg
        viewBox="0 0 100 118"
        width={size}
        height={Math.round(size * 1.18)}
        className="earth-globe"
        style={{ overflow: 'visible', display: 'block' }}
        role="img"
        aria-label={isEs ? 'Esfera de Telemetría Terrestre' : 'Earth Telemetry Sphere'}
      >
        <defs>
          <clipPath id={`earth-clip-${uid}`}>
            <circle cx="50" cy="50" r={radius} />
          </clipPath>
          <radialGradient id={`earth-shade-${uid}`} cx="34%" cy="30%" r="80%">
            <stop offset="0.45" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.72" />
          </radialGradient>
          <radialGradient id={`earth-spec-${uid}`} cx="30%" cy="26%" r="40%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`earth-atmo-${uid}`} cx="50%" cy="50%" r="54%">
            <stop offset="76%" stopColor="#fb923c" stopOpacity="0" />
            <stop offset="92%" stopColor="#f97316" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {showAtmosphere && <circle cx="50" cy="50" r={radius + 7} fill={`url(#earth-atmo-${uid})`} />}

        <g clipPath={`url(#earth-clip-${uid})`}>
          <g>
            <image
              href="/images/earth-texture.jpg"
              x={50 - radius + start - width}
              y={50 - radius}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
            <image
              href="/images/earth-texture.jpg"
              x={50 - radius + start}
              y={50 - radius}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
            <image
              href="/images/earth-texture.jpg"
              x={50 - radius + start + width}
              y={50 - radius}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to={`${-width} 0`}
              dur="54s"
              repeatCount="indefinite"
            />
          </g>
          <circle cx="50" cy="50" r={radius} fill={`url(#earth-shade-${uid})`} />
          <circle cx="50" cy="50" r={radius} fill={`url(#earth-spec-${uid})`} />
        </g>

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={showAtmosphere ? '#fdba74' : 'rgba(255, 255, 255, 0.24)'}
          strokeOpacity="0.55"
          strokeWidth="1.1"
        />

        <text
          x="50"
          y="112"
          textAnchor="middle"
          fill="#fdba74"
          fontSize="9"
          fontWeight="700"
          fontFamily="var(--font-raleway), 'Raleway', sans-serif"
          letterSpacing="1.2"
        >
          {isEs ? 'TIERRA' : 'EARTH'}
        </text>
      </svg>
    </div>
  );
}
