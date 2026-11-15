'use client';

import React from 'react';
import { pickLang, useLanguage } from '@/context/LanguageContext';

export interface PartnerLogosStripProps {
  variant?: 'hero' | 'footer';
  className?: string;
}

export function PartnerLogosStrip({
  variant = 'footer',
  className = '',
}: PartnerLogosStripProps) {
  const { lang } = useLanguage();
  const isHero = variant === 'hero';
  const badgeHeight = isHero ? 32 : 28;
  const ibmMaskId = `th-ibm-bars-${variant}`;
  const conaeLabel = pickLang(lang, {
    en: 'CONAE · Argentine Space Agency',
    es: 'CONAE · Comisión Espacial Argentina',
  });

  return (
    <aside
      aria-label={pickLang(lang, {
        en: 'Institutional support and sponsors',
        es: 'Apoyo institucional y sponsors',
      })}
      className={[
        'th-partner-strip',
        isHero ? 'th-partner-strip--hero' : 'th-partner-strip--footer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        borderRadius: isHero ? '16px' : '12px',
        padding: isHero ? '0.9rem 1.35rem' : '0.85rem 1.15rem',
        background: isHero
          ? 'linear-gradient(135deg, rgba(28, 12, 18, 0.86) 0%, rgba(18, 8, 12, 0.92) 100%)'
          : 'rgba(20, 9, 14, 0.78)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: isHero
          ? '0 14px 36px rgba(6, 2, 4, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          : 'none',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p
        className="th-partner-strip__caption"
        style={{
          margin: '0 0 0.65rem 0',
          fontSize: '0.74rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: '#d8bfb2',
          textAlign: 'center',
        }}
      >
        {pickLang(lang, {
          en: 'Supported in the framework of NASA International Space Apps Challenge 2026',
          es: 'Con apoyo institucional en el marco del NASA International Space Apps Challenge 2026',
        })}
      </p>

      <div
        className="th-partner-strip__row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem',
        }}
      >
        {/* 1. NASA Space Apps Challenge (official PNG from change-logos) */}
        <a
          href="https://www.spaceappschallenge.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          style={{
            borderRadius: '10px',
            padding: '0.38rem 0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            textDecoration: 'none',
          }}
          aria-label="NASA International Space Apps Challenge"
          title="NASA International Space Apps Challenge"
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: `${badgeHeight}px`,
              padding: '2px 7px',
              borderRadius: '7px',
              background: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
            }}
          >
            <img
              src="/images/logos/space-apps-logo.png"
              alt="NASA Space Apps Challenge"
              style={{
                height: `${badgeHeight - 4}px`,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </span>
          <span className="th-partner-pill__label">NASA Space Apps</span>
        </a>

        {/* 2. Official NASA Meatball Logo */}
        <a
          href="https://www.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          style={{
            borderRadius: '10px',
            padding: '0.38rem 0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            textDecoration: 'none',
          }}
          aria-label="NASA"
          title="National Aeronautics and Space Administration (NASA)"
        >
          <img
            src="/images/logos/nasa-logo.svg"
            alt="NASA"
            style={{
              height: `${badgeHeight}px`,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))',
            }}
          />
          <span className="th-partner-pill__label">NASA</span>
        </a>

        {/* 3. CONAE (official PNG from change-logos) */}
        <a
          href="https://www.argentina.gob.ar/ciencia/conae"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          style={{
            borderRadius: '10px',
            padding: '0.38rem 0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            textDecoration: 'none',
          }}
          aria-label={conaeLabel}
          title={conaeLabel}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: `${badgeHeight}px`,
              padding: '3px 8px',
              borderRadius: '7px',
              background: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
            }}
          >
            <img
              src="/images/logos/conae-logo.png"
              alt="CONAE"
              style={{
                height: `${badgeHeight - 6}px`,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </span>
          <span className="th-partner-pill__label">CONAE · Argentina</span>
        </a>

        {/* 4. Universidad de Palermo (official PNG from change-logos) */}
        <a
          href="https://www.palermo.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          style={{
            borderRadius: '10px',
            padding: '0.38rem 0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            textDecoration: 'none',
          }}
          aria-label="Universidad de Palermo"
          title="Universidad de Palermo"
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: `${badgeHeight}px`,
              padding: '2px 6px',
              borderRadius: '7px',
              background: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
            }}
          >
            <img
              src="/images/logos/up-logo.png"
              alt="Universidad de Palermo"
              style={{
                height: `${badgeHeight - 4}px`,
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </span>
          <span className="th-partner-pill__label">Universidad de Palermo</span>
        </a>

        {/* 5. IBM */}
        <a
          href={lang === 'es' ? 'https://www.ibm.com/ar-es' : 'https://www.ibm.com/'}
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          style={{
            borderRadius: '10px',
            padding: '0.38rem 0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
          }}
          aria-label="IBM"
          title="IBM"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 58 22"
            width={isHero ? 50 : 46}
            height={isHero ? 20 : 18}
            className="th-partner-pill__svg"
          >
            <defs>
              <mask id={ibmMaskId}>
                <rect width="58" height="22" fill="#000000" />
                <rect x="0" y="1" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="3.5" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="6" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="8.5" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="11" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="13.5" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="16" width="58" height="1.55" fill="#ffffff" />
                <rect x="0" y="18.5" width="58" height="1.55" fill="#ffffff" />
              </mask>
            </defs>
            <g mask={`url(#${ibmMaskId})`} fill="#fff8f1">
              <rect x="1" y="1" width="11" height="3.8" />
              <rect x="4.3" y="4.5" width="4.4" height="12" />
              <rect x="1" y="16.2" width="11" height="3.9" />
              <path
                fillRule="evenodd"
                d="M15 1H25.2C27.9 1 29.6 2.5 29.6 4.9C29.6 6.8 28.5 8.1 26.8 8.7C28.8 9.3 30 10.9 30 13.1C30 16.1 28 20.1 24.8 20.1H15V1ZM19.5 4.4V8.3H24C25.2 8.3 25.9 7.6 25.9 6.3C25.9 5.1 25.2 4.4 24 4.4H19.5ZM19.5 11.7V16.6H24.3C25.7 16.6 26.4 15.6 26.4 14.1C26.4 12.6 25.7 11.7 24.3 11.7H19.5Z"
              />
              <path d="M33 1H40.6L45 12.2L49.4 1H57V4.8H54.4V16.2H57V20.1H49.4V16.2H51.2V7.2L46.4 19.6H43.6L38.8 7.2V16.2H40.6V20.1H33V16.2H35.6V4.8H33V1Z" />
            </g>
          </svg>
        </a>
      </div>
    </aside>
  );
}

export default PartnerLogosStrip;
