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
  const iconHeight = variant === 'hero' ? 20 : 22;
  const ibmMaskId = `th-ibm-bars-${variant}`;
  const conaeLabel = pickLang(lang, {
    en: 'CONAE · Argentine Space Agency',
    es: 'CONAE · Comisión Espacial Argentina',
  });

  return (
    <aside
      aria-label={pickLang(lang, {
        en: 'Institutional support',
        es: 'Apoyo institucional',
      })}
      className={[
        'th-partner-strip',
        variant === 'hero' ? 'th-partner-strip--hero' : 'th-partner-strip--footer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="th-partner-strip__caption">
        {pickLang(lang, {
          en: 'Supported in the framework of NASA International Space Apps Challenge 2026',
          es: 'Con apoyo institucional en el marco del NASA International Space Apps Challenge 2026',
        })}
      </p>

      <div className="th-partner-strip__row">
        <a
          href="https://www.spaceappschallenge.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          aria-label="NASA International Space Apps Challenge"
          title="NASA Space Apps Challenge"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={iconHeight}
            height={iconHeight}
            className="th-partner-pill__svg"
          >
            <path
              d="M12 2.5L20 20.5H15.8L12 11.8L8.2 20.5H4L12 2.5Z"
              fill="#f8fafc"
            />
            <path
              d="M7.6 15.8H16.4"
              stroke="#7df9ff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="3.2" r="1.4" fill="#7df9ff" />
          </svg>
          <span className="th-partner-pill__label">NASA Space Apps</span>
        </a>

        <a
          href="https://www.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          aria-label="NASA"
          title="NASA"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 28 24"
            width={Math.round(iconHeight * 1.16)}
            height={iconHeight}
            className="th-partner-pill__svg"
          >
            <circle
              cx="14"
              cy="12"
              r="9"
              fill="#1e40af"
              stroke="#93c5fd"
              strokeWidth="1"
            />
            <path
              d="M3.5 16.4C8.8 8.8 17.2 6.2 24.6 9.6"
              fill="none"
              stroke="#f87171"
              strokeWidth="1.85"
              strokeLinecap="round"
            />
            <path
              d="M6.2 7.8C11.4 13.4 18 16 23.6 14.3"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="1.15"
              strokeLinecap="round"
              opacity="0.85"
            />
            <circle cx="10.8" cy="8.4" r="0.9" fill="#ffffff" />
            <circle cx="17.2" cy="14.6" r="0.85" fill="#ffffff" />
          </svg>
          <span className="th-partner-pill__label">NASA</span>
        </a>

        <a
          href="https://www.argentina.gob.ar/ciencia/conae"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          aria-label={conaeLabel}
          title={conaeLabel}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 26 24"
            width={Math.round(iconHeight * 1.08)}
            height={iconHeight}
            className="th-partner-pill__svg"
          >
            <path
              d="M13 2.2L21.8 5.4V11.8C21.8 17.1 18 20.8 13 22.2C8 20.8 4.2 17.1 4.2 11.8V5.4L13 2.2Z"
              fill="rgba(56, 189, 248, 0.14)"
              stroke="#7dd3fc"
              strokeWidth="1.35"
            />
            <path
              d="M7.2 14.4C10.4 10.6 14.8 9.2 18.9 9.7"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M8.4 16.9C11.3 14.1 14.6 13.1 18 13.4"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="17.8" cy="7.6" r="1.3" fill="#fde68a" />
          </svg>
          <span className="th-partner-pill__label">CONAE · Argentina</span>
        </a>

        <a
          href="https://www.palermo.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          aria-label="Universidad de Palermo"
          title="Universidad de Palermo"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={iconHeight}
            height={iconHeight}
            className="th-partner-pill__svg"
          >
            <path
              d="M12 2.4L20.2 5.2V11.6C20.2 16.6 16.6 20.3 12 21.7C7.4 20.3 3.8 16.6 3.8 11.6V5.2L12 2.4Z"
              fill="rgba(248, 250, 252, 0.08)"
              stroke="#e2e8f0"
              strokeWidth="1.35"
            />
            <text
              x="12"
              y="14.9"
              textAnchor="middle"
              fill="#f8fafc"
              fontSize="8.6"
              fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
              letterSpacing="0.4"
            >
              UP
            </text>
          </svg>
          <span className="th-partner-pill__label">Universidad de Palermo</span>
        </a>

        <a
          href={lang === 'es' ? 'https://www.ibm.com/ar-es' : 'https://www.ibm.com/'}
          target="_blank"
          rel="noopener noreferrer"
          className="th-partner-pill"
          aria-label="IBM"
          title="IBM"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 58 22"
            width={variant === 'hero' ? 48 : 53}
            height={iconHeight}
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
            <g mask={`url(#${ibmMaskId})`} fill="#93c5fd">
              {/* I */}
              <rect x="1" y="1" width="11" height="3.8" />
              <rect x="4.3" y="4.5" width="4.4" height="12" />
              <rect x="1" y="16.2" width="11" height="3.9" />
              {/* B */}
              <path
                fillRule="evenodd"
                d="M15 1H25.2C27.9 1 29.6 2.5 29.6 4.9C29.6 6.8 28.5 8.1 26.8 8.7C28.8 9.3 30 10.9 30 13.1C30 16.1 28 20.1 24.8 20.1H15V1ZM19.5 4.4V8.3H24C25.2 8.3 25.9 7.6 25.9 6.3C25.9 5.1 25.2 4.4 24 4.4H19.5ZM19.5 11.7V16.6H24.3C25.7 16.6 26.4 15.6 26.4 14.1C26.4 12.6 25.7 11.7 24.3 11.7H19.5Z"
              />
              {/* M */}
              <path d="M33 1H40.6L45 12.2L49.4 1H57V4.8H54.4V16.2H57V20.1H49.4V16.2H51.2V7.2L46.4 19.6H43.6L38.8 7.2V16.2H40.6V20.1H33V16.2H35.6V4.8H33V1Z" />
            </g>
          </svg>
        </a>
      </div>
    </aside>
  );
}

export default PartnerLogosStrip;
