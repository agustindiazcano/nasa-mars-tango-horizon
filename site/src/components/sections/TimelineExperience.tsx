'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Orbit,
  Rocket,
  Sparkles,
  Sun,
  Telescope,
  type LucideIcon,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { PhotorealisticMoonBanner, EarthGlobe } from '@/components/ui/PlanetBanners';
import { LunarTubeAmpPlayer } from '@/components/ui/LunarTubeAmpPlayer';
import { getSpaceTimelineData, type SpaceEra } from '@/data/timeline';
import { CelestialVisual } from '@/components/visuals/CelestialVisuals';
import { useLanguage, type SiteLang } from '@/context/LanguageContext';

const ERA_ICON_MAP: Record<string, LucideIcon> = {
  Compass,
  Sun,
  Orbit,
  Rocket,
  Telescope,
};

function EraIcon({ name, color }: { name: string; color: string }) {
  const Icon = ERA_ICON_MAP[name] ?? Compass;
  return <Icon size={20} style={{ color }} aria-hidden="true" />;
}

interface EraDetailViewProps {
  era: SpaceEra;
  allEras: SpaceEra[];
  lang: SiteLang;
  onBack: () => void;
  onSelectEra: (era: SpaceEra) => void;
}

function EraDetailView({ era, allEras, lang, onBack, onSelectEra }: EraDetailViewProps) {
  const isEs = lang === 'es';
  const currentIndex = allEras.findIndex((item) => item.id === era.id);
  const prevEra = currentIndex > 0 ? allEras[currentIndex - 1] : null;
  const nextEra =
    currentIndex >= 0 && currentIndex < allEras.length - 1
      ? allEras[currentIndex + 1]
      : null;

  return (
    <section className="te-detail-shell" aria-label={era.eraTitle}>
      <div className="te-sticky-topbar">
        <div className="te-sticky-topbar-inner">
          <button
            type="button"
            onClick={onBack}
            className="te-btn-reset"
            aria-label={isEs ? 'Volver a la Cronología' : 'Back to Timeline'}
          >
            <GlassSurface
              width="auto"
              height={46}
              borderRadius={999}
              className="te-glass-pill-btn"
            >
              <span className="te-btn-label">
                <ArrowLeft size={16} aria-hidden="true" />
                <span>{isEs ? 'Volver a la Cronología' : 'Back to Timeline'}</span>
              </span>
            </GlassSurface>
          </button>

          <ElectricBorder
            color={era.accentColor}
            speed={1.1}
            borderRadius={999}
            className="te-period-electric"
          >
            <div className="te-period-pill" style={{ color: era.accentColor }}>
              <EraIcon name={era.iconName} color={era.accentColor} />
              <span>{era.yearRange}</span>
            </div>
          </ElectricBorder>
        </div>
      </div>

      <div className="te-detail-container">
        <header className="te-detail-header">
          <span
            className="te-badge"
            style={{
              color: era.accentColor,
              borderColor: `${era.accentColor}55`,
              background: `${era.accentColor}18`,
            }}
          >
            {isEs
              ? `Etapa ${currentIndex + 1} de ${allEras.length} · Proyecto Tango Horizon`
              : `Stage ${currentIndex + 1} of ${allEras.length} · Tango Horizon Project`}
          </span>
          <h1 className="te-detail-title">{era.eraTitle}</h1>
          <p className="te-detail-subtitle">{era.subtitle}</p>
          <p className="te-detail-summary">{era.summary}</p>

          <div
            className="te-figures-row"
            aria-label={isEs ? 'Figuras e hitos clave' : 'Key Figures and milestones'}
          >
            {era.keyFigures.map((figure) => (
              <span
                key={figure}
                className="te-figure-pill"
                style={{ borderColor: `${era.accentColor}45` }}
              >
                {figure}
              </span>
            ))}
          </div>
        </header>

        <GlassSurface width="100%" height="auto" borderRadius={32} className="te-detail-glass">
          <article className="te-detail-article">
            <div className="te-sections-stack">
              {era.detailSections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`te-section-row ${idx % 2 === 1 ? 'is-reversed' : ''}`}
                >
                  <div className="te-section-text">
                    <div className="te-section-index" style={{ color: era.accentColor }}>
                      <span>0{idx + 1}</span>
                      <span className="te-section-divider" />
                      <span>{isEs ? 'Capítulo Histórico' : 'Historical Chapter'}</span>
                    </div>
                    <h2 className="te-section-title">{section.title}</h2>
                    {section.subtitle && (
                      <p className="te-section-sub">{section.subtitle}</p>
                    )}

                    {section.highlight && (
                      <div
                        className="te-section-highlight"
                        style={{
                          borderLeftColor: era.accentColor,
                          background: `${era.accentColor}12`,
                        }}
                      >
                        <Sparkles size={16} style={{ color: era.accentColor, flexShrink: 0 }} />
                        <span>{section.highlight}</span>
                      </div>
                    )}

                    <div className="te-section-paragraphs">
                      {section.paragraphs.map((paragraph, pIdx) => (
                        <p key={pIdx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  <div className="te-section-visual">
                    <CelestialVisual type={section.visualType} />
                  </div>
                </div>
              ))}
            </div>

            {era.id === 'carrera-espacial' && (
              <div className="te-audio-embed">
                <div className="te-audio-copy">
                  <span className="te-badge">
                    {isEs
                      ? 'Archivo Sonoro Histórico · 20 de julio de 1969'
                      : 'Historical Audio Archive · July 20, 1969'}
                  </span>
                  <h3>
                    {isEs
                      ? 'Transmisión del Apolo 11 — Neil Armstrong'
                      : 'Apollo 11 Transmission — Neil Armstrong'}
                  </h3>
                  <p>
                    {isEs
                      ? 'Activá el amplificador valvular para escuchar la transmisión original desde el Mare Tranquillitatis durante el primer alunizaje humano.'
                      : 'Power on the tube amplifier to listen to the original transmission from Mare Tranquillitatis during the first human Moon landing.'}
                  </p>
                </div>
                <LunarTubeAmpPlayer idPrefix="pwr-era-apollo" />
              </div>
            )}
          </article>
        </GlassSurface>

        <nav
          className="te-detail-pagination"
          aria-label={isEs ? 'Navegación entre etapas' : 'Stage navigation'}
        >
          {prevEra ? (
            <button
              type="button"
              onClick={() => onSelectEra(prevEra)}
              className="te-btn-reset"
            >
              <GlassSurface width="auto" height={52} borderRadius={999} className="te-glass-pill-btn">
                <span className="te-btn-label">
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>
                    {isEs
                      ? `Etapa Anterior: ${prevEra.yearRange}`
                      : `Previous Stage: ${prevEra.yearRange}`}
                  </span>
                </span>
              </GlassSurface>
            </button>
          ) : (
            <button type="button" onClick={onBack} className="te-btn-reset">
              <GlassSurface width="auto" height={52} borderRadius={999} className="te-glass-pill-btn">
                <span className="te-btn-label">
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>{isEs ? 'Volver a la Cronología' : 'Back to Timeline'}</span>
                </span>
              </GlassSurface>
            </button>
          )}

          <div className="te-pagination-right">
            {nextEra && (
              <button
                type="button"
                onClick={() => onSelectEra(nextEra)}
                className="te-btn-reset"
              >
                <ElectricBorder color={nextEra.accentColor} speed={1.15} borderRadius={999}>
                  <GlassSurface width="auto" height={52} borderRadius={999} className="te-glass-pill-btn">
                    <span className="te-btn-label">
                      <span>
                        {isEs
                          ? `Siguiente Etapa: ${nextEra.yearRange}`
                          : `Next Stage: ${nextEra.yearRange}`}
                      </span>
                      <ArrowRight size={16} style={{ color: nextEra.accentColor }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </ElectricBorder>
              </button>
            )}

            <Link href="/tesis-lunar" className="te-link-reset">
              <ElectricBorder color="#fde68a" speed={1.15} borderRadius={999}>
                <GlassSurface width="auto" height={52} borderRadius={999} className="te-glass-pill-btn">
                  <span className="te-btn-label">
                    <BookOpen size={16} style={{ color: '#fde68a' }} aria-hidden="true" />
                    <span>{isEs ? 'Ir a Tesis Lunar' : 'Go to Lunar Thesis'}</span>
                    <ArrowRight size={16} style={{ color: '#fde68a' }} aria-hidden="true" />
                  </span>
                </GlassSurface>
              </ElectricBorder>
            </Link>

            {!nextEra && (
              <Link href="/marte" className="te-link-reset">
                <ElectricBorder color="#fb923c" speed={1.2} borderRadius={999}>
                  <GlassSurface width="auto" height={52} borderRadius={999} className="te-glass-pill-btn">
                    <span className="te-btn-label">
                      <span>{isEs ? 'Explorar Horizonte Marciano' : 'Explore Mars Exploration'}</span>
                      <ArrowRight size={16} style={{ color: '#fb923c' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </ElectricBorder>
              </Link>
            )}
          </div>
        </nav>
      </div>

      <style jsx>{`
        .te-detail-shell {
          width: 100%;
          padding-bottom: 6rem;
        }
        .te-sticky-topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          padding: 1rem 1.5rem;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          background: linear-gradient(180deg, rgba(6, 0, 16, 0.88) 0%, rgba(6, 0, 16, 0.45) 100%);
          border-bottom: 1px solid rgba(125, 249, 255, 0.14);
        }
        .te-sticky-topbar-inner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .te-period-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.55rem 1.25rem;
          border-radius: 999px;
          background: rgba(9, 13, 24, 0.86);
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.03em;
        }
        .te-detail-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 0 1.5rem;
        }
        .te-detail-header {
          text-align: center;
          max-width: 860px;
          margin: 0 auto 3rem auto;
        }
        .te-detail-title {
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 800;
          color: #f8fafc;
          margin: 0.9rem 0 0.85rem 0;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .te-detail-subtitle {
          font-size: clamp(1.1rem, 1.7vw, 1.35rem);
          color: #bae6fd;
          margin: 0 0 1.1rem 0;
          line-height: 1.55;
        }
        .te-detail-summary {
          font-size: 1.04rem;
          color: #cbd5e1;
          line-height: 1.75;
          margin: 0 0 1.65rem 0;
        }
        .te-figures-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.6rem;
        }
        .te-figure-pill {
          padding: 0.38rem 0.9rem;
          border-radius: 999px;
          font-size: 0.86rem;
          font-weight: 600;
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .te-detail-article {
          width: 100%;
          padding: clamp(1.5rem, 3.5vw, 3rem);
          box-sizing: border-box;
        }
        .te-sections-stack {
          display: flex;
          flex-direction: column;
          gap: 4rem;
        }
        .te-section-row {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 2.5rem;
          align-items: center;
        }
        .te-section-row.is-reversed .te-section-text {
          order: 2;
        }
        .te-section-row.is-reversed .te-section-visual {
          order: 1;
        }
        .te-section-index {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }
        .te-section-divider {
          width: 22px;
          height: 1px;
          background: currentColor;
          opacity: 0.55;
        }
        .te-section-title {
          font-size: clamp(1.4rem, 2.4vw, 1.95rem);
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.45rem 0;
          line-height: 1.25;
        }
        .te-section-sub {
          font-size: 0.98rem;
          color: #94a3b8;
          margin: 0 0 1.15rem 0;
          font-style: italic;
        }
        .te-section-highlight {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.75rem 1rem;
          border-left: 3px solid #7df9ff;
          border-radius: 0 12px 12px 0;
          color: #f8fafc;
          font-size: 0.94rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }
        .te-section-paragraphs {
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
        }
        .te-section-paragraphs p {
          margin: 0;
          font-size: 1.04rem;
          line-height: 1.8;
          color: #e2e8f0;
        }
        .te-section-visual {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0.75rem;
          border-radius: 24px;
          background: radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.08), transparent 72%);
        }
        .te-audio-embed {
          margin-top: 3.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 2rem;
          align-items: center;
        }
        .te-audio-copy h3 {
          font-size: 1.45rem;
          color: #f8fafc;
          margin: 0.65rem 0 0.5rem 0;
        }
        .te-audio-copy p {
          color: #cbd5e1;
          line-height: 1.7;
          margin: 0;
        }
        .te-detail-pagination {
          margin-top: 2.75rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
        }
        .te-pagination-right {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1rem;
        }
        .te-badge {
          display: inline-block;
          padding: 0.35rem 1rem;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(125, 249, 255, 0.32);
          color: #7df9ff;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .te-btn-reset {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: inherit;
          font: inherit;
        }
        .te-link-reset {
          text-decoration: none;
          color: inherit;
          display: inline-flex;
        }
        .te-btn-label {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0 1.45rem;
          font-weight: 700;
          font-size: 0.96rem;
          color: #f8fafc;
          white-space: nowrap;
        }
        @media (max-width: 900px) {
          .te-section-row {
            grid-template-columns: 1fr;
          }
          .te-section-row.is-reversed .te-section-text,
          .te-section-row.is-reversed .te-section-visual {
            order: initial;
          }
          .te-audio-embed {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}

export function TimelineExperience() {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const eras = getSpaceTimelineData(lang);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [beamPercent, setBeamPercent] = useState<number>(12);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const trackWrapRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hasMountedRef = useRef(false);

  const selectedEra = selectedEraId
    ? eras.find((item) => item.id === selectedEraId) ?? null
    : null;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedEraId]);

  useEffect(() => {
    if (selectedEraId) return undefined;

    const updateProgress = () => {
      const wrap = trackWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const viewportCenter = window.innerHeight * 0.48;
      const progress = Math.max(
        0.04,
        Math.min(1, (viewportCenter - rect.top) / Math.max(1, rect.height)),
      );
      setBeamPercent(Math.round(progress * 100));

      let closestIdx = 0;
      let closestDist = Infinity;
      rowRefs.current.forEach((row, idx) => {
        if (!row) return;
        const r = row.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height * 0.35 - viewportCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      setActiveIndex(closestIdx);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [selectedEraId]);

  if (selectedEra) {
    return (
      <EraDetailView
        era={selectedEra}
        allEras={eras}
        lang={lang}
        onBack={() => setSelectedEraId(null)}
        onSelectEra={(era) => setSelectedEraId(era.id)}
      />
    );
  }

  return (
    <div className="te-timeline-page">
      <header className="te-hero-header">
        <span className="te-badge">
          {isEs
            ? 'Bitácora Histórica · Tango Horizon · 2026-11-15'
            : 'Historical Logbook · Tango Horizon · 2026-11-15'}
        </span>
        <h1 className="te-main-title">
          {isEs
            ? 'Cronología Cósmica — De la Bóveda Celeste al Horizonte Marciano'
            : 'Cosmic Timeline — From Celestial Vaults to the Martian Horizon'}
        </h1>
        <p className="te-main-subtitle">
          {isEs
            ? 'Cinco etapas fundamentales que transformaron la contemplación astronómica de la antigüedad en física orbital, alunizajes tripulados, astrofísica infrarroja en L2 y navegación rumbo a Marte.'
            : 'Five foundational stages that transformed ancient astronomical contemplation into orbital physics, crewed Moon landings, L2 infrared astrophysics, and navigation toward Mars.'}
        </p>
      </header>

      <section
        className="te-telemetry-showcase"
        aria-label={
          isEs
            ? 'Telemetría Tierra, Luna y Audio Apolo 11'
            : 'Earth, Moon Telemetry and Apollo 11 Audio'
        }
      >
        <GlassSurface width="100%" height="auto" borderRadius={30} className="te-showcase-glass">
          <div className="te-showcase-grid">
            <div className="te-planets-duo">
              <div className="te-planet-unit">
                <EarthGlobe size={94} />
                <span className="te-planet-caption">
                  {isEs ? 'Tierra · Cuna Orbital (1.00 UA)' : 'Earth · Orbital Cradle (1.00 AU)'}
                </span>
              </div>
              <div className="te-orbital-bridge" aria-hidden="true">
                <span className="te-bridge-line" />
                <span className="te-bridge-tag">384,400 km → 225M km</span>
                <span className="te-bridge-line" />
              </div>
              <div className="te-planet-unit te-moon-banner-wrap">
                <PhotorealisticMoonBanner />
                <span className="te-planet-caption">
                  {isEs
                    ? 'Luna · Puerto Selenita (Apolo & Artemis)'
                    : 'Moon · Lunar Harbor (Apollo & Artemis)'}
                </span>
              </div>
            </div>

            <div className="te-amp-column">
              <div className="te-amp-header">
                <span className="te-badge">
                  {isEs
                    ? 'Archivo Sonoro · 20 de julio de 1969'
                    : 'Audio Archive · July 20, 1969'}
                </span>
                <h2>
                  {isEs
                    ? 'Transmisión Histórica del Apolo 11'
                    : 'Historic Apollo 11 Transmission'}
                </h2>
                <p>
                  {isEs
                    ? 'Encendé el amplificador valvular para escuchar la voz de Neil Armstrong al pisar el Mar de la Tranquilidad.'
                    : 'Power on the tube amplifier to hear Neil Armstrong’s voice stepping onto the Sea of Tranquility.'}
                </p>
              </div>
              <LunarTubeAmpPlayer idPrefix="pwr-cronologia" />
            </div>
          </div>
        </GlassSurface>
      </section>

      <section
        ref={trackWrapRef}
        className="te-track-section"
        aria-label={isEs ? 'Línea temporal de cinco eras' : 'Five-era cosmic timeline'}
      >
        <div className="te-track-rail" aria-hidden="true">
          <div className="te-track-beam" style={{ height: `${beamPercent}%` }} />
        </div>

        <div className="te-eras-list">
          {eras.map((era, idx) => {
            const isAlt = idx % 2 === 1;
            const isActive = activeIndex === idx;

            return (
              <div
                key={era.id}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                className={`te-era-row ${isAlt ? 'is-alt' : ''} ${isActive ? 'is-active' : ''}`}
              >
                <div className="te-era-node-col">
                  <div
                    className="te-era-dot"
                    style={{
                      borderColor: isActive ? era.accentColor : 'rgba(148, 163, 184, 0.45)',
                      boxShadow: isActive ? `0 0 24px ${era.accentColor}88` : undefined,
                    }}
                  >
                    <EraIcon name={era.iconName} color={era.accentColor} />
                  </div>

                  <ElectricBorder
                    color={era.accentColor}
                    speed={isActive ? 1.35 : 0.85}
                    borderRadius={18}
                    className="te-year-electric"
                  >
                    <div className="te-year-box">
                      <span className="te-era-step">
                        {isEs ? `Etapa 0${idx + 1}` : `Stage 0${idx + 1}`}
                      </span>
                      <strong style={{ color: era.accentColor }}>{era.yearRange}</strong>
                    </div>
                  </ElectricBorder>
                </div>

                <div className="te-era-card-col">
                  <ElectricBorder
                    color={era.accentColor}
                    speed={isActive ? 1.15 : 0.75}
                    borderRadius={28}
                    className="te-card-electric"
                  >
                    <GlassSurface
                      width="100%"
                      height="auto"
                      borderRadius={28}
                      className="te-era-card-glass"
                    >
                      <div className="te-era-card-inner">
                        <div className="te-era-card-top">
                          <span
                            className="te-mobile-year"
                            style={{ color: era.accentColor, borderColor: `${era.accentColor}55` }}
                          >
                            {isEs
                              ? `Etapa 0${idx + 1} · ${era.yearRange}`
                              : `Stage 0${idx + 1} · ${era.yearRange}`}
                          </span>
                          <h2 className="te-era-title">{era.eraTitle}</h2>
                          <p className="te-era-sub">{era.subtitle}</p>
                        </div>

                        <p className="te-era-summary">{era.summary}</p>

                        <div className="te-era-footer">
                          <div
                            className="te-key-figures"
                            aria-label={isEs ? 'Figuras Clave' : 'Key Figures'}
                          >
                            {era.keyFigures.slice(0, 4).map((fig) => (
                              <span key={fig} className="te-tag">
                                {fig}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedEraId(era.id)}
                            className="te-explore-btn"
                            style={{
                              borderColor: `${era.accentColor}77`,
                              color: '#f8fafc',
                              boxShadow: `0 0 22px ${era.accentColor}22`,
                            }}
                          >
                            <span>{isEs ? 'Explorar Etapa' : 'Explore Stage'}</span>
                            <ArrowRight
                              size={17}
                              style={{ color: era.accentColor }}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </GlassSurface>
                  </ElectricBorder>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="te-bottom-cta"
        aria-label={isEs ? 'Navegación a monografías' : 'Monograph navigation'}
      >
        <GlassSurface width="100%" height="auto" borderRadius={32} className="te-cta-glass">
          <div className="te-cta-inner">
            <span className="te-badge">
              {isEs ? 'Monografías Especiales · Tango Horizon' : 'Special Monographs · Tango Horizon'}
            </span>
            <h2>
              {isEs
                ? 'Continuá el recorrido hacia la Luna y el Planeta Rojo'
                : 'Continue the journey toward the Moon and the Red Planet'}
            </h2>
            <p>
              {isEs
                ? 'Profundizá en las tesis completas de selenología y areología interplanetaria con ecuaciones orbitales, instrumentación y arquitectura ISRU.'
                : 'Dive into the full monographs on selenology and interplanetary areology featuring orbital equations, instrumentation, and ISRU architecture.'}
            </p>
            <div className="te-cta-actions">
              <Link href="/tesis-lunar" className="te-link-reset">
                <ElectricBorder color="#fde68a" speed={1.2} borderRadius={999}>
                  <GlassSurface width="auto" height={58} borderRadius={999} className="te-glass-pill-btn">
                    <span className="te-cta-label">
                      <span>
                        {isEs
                          ? 'Tesis I · La Conquista de la Luna'
                          : 'Thesis I · The Conquest of the Moon'}
                      </span>
                      <ArrowRight size={18} style={{ color: '#fde68a' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </ElectricBorder>
              </Link>

              <Link href="/marte" className="te-link-reset">
                <ElectricBorder color="#fb923c" speed={1.2} borderRadius={999}>
                  <GlassSurface width="auto" height={58} borderRadius={999} className="te-glass-pill-btn">
                    <span className="te-cta-label">
                      <span>
                        {isEs ? 'Tesis II · Horizonte Marciano' : 'Thesis II · Martian Horizon'}
                      </span>
                      <ArrowRight size={18} style={{ color: '#fb923c' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </ElectricBorder>
              </Link>
            </div>
          </div>
        </GlassSurface>
      </section>

      <style jsx>{`
        .te-timeline-page {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 1.5rem 6rem 1.5rem;
          box-sizing: border-box;
        }
        .te-hero-header {
          text-align: center;
          max-width: 860px;
          margin: 0 auto 3rem auto;
        }
        .te-badge {
          display: inline-block;
          padding: 0.36rem 1.05rem;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(125, 249, 255, 0.32);
          color: #7df9ff;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .te-main-title {
          font-size: clamp(2rem, 4.1vw, 3.25rem);
          font-weight: 800;
          color: #f8fafc;
          margin: 1rem 0 1rem 0;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .te-main-subtitle {
          font-size: clamp(1.05rem, 1.5vw, 1.24rem);
          color: #cbd5e1;
          line-height: 1.7;
          margin: 0;
        }
        .te-telemetry-showcase {
          margin-bottom: 4.5rem;
        }
        .te-showcase-grid {
          width: 100%;
          padding: 2rem;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 2.25rem;
          align-items: center;
        }
        .te-planets-duo {
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 1.25rem;
          flex-wrap: wrap;
        }
        .te-planet-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          text-align: center;
        }
        .te-moon-banner-wrap :global(.moon-banner-showcase) {
          padding: 0;
        }
        .te-moon-banner-wrap :global(.section-banner) {
          width: 150px;
          height: 150px;
          background-size: 300px 150px;
        }
        .te-planet-caption {
          font-size: 0.86rem;
          font-weight: 600;
          color: #bae6fd;
        }
        .te-orbital-bridge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }
        .te-bridge-line {
          width: 44px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #7df9ff, transparent);
        }
        .te-bridge-tag {
          font-size: 0.76rem;
          font-weight: 700;
          color: #fde68a;
          letter-spacing: 0.06em;
        }
        .te-amp-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
        }
        .te-amp-header h2 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #f8fafc;
          margin: 0.55rem 0 0.35rem 0;
        }
        .te-amp-header p {
          font-size: 0.94rem;
          color: #cbd5e1;
          line-height: 1.6;
          margin: 0;
          max-width: 380px;
        }
        .te-track-section {
          position: relative;
          padding: 1rem 0 3rem 0;
        }
        .te-track-rail {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          transform: translateX(-50%);
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(148, 163, 184, 0.25) 8%,
            rgba(148, 163, 184, 0.25) 92%,
            transparent 100%
          );
          z-index: 1;
        }
        .te-track-beam {
          width: 100%;
          background: linear-gradient(to bottom, #38bdf8 0%, #7df9ff 65%, #fde68a 100%);
          box-shadow: 0 0 16px rgba(125, 249, 255, 0.8);
          border-radius: 999px;
          transition: height 0.16s ease-out;
        }
        .te-eras-list {
          display: flex;
          flex-direction: column;
          gap: 3.75rem;
          position: relative;
          z-index: 2;
        }
        .te-era-row {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 2.5rem;
          align-items: center;
        }
        .te-era-row.is-alt .te-era-node-col {
          order: 2;
          justify-content: flex-start;
        }
        .te-era-row.is-alt .te-era-card-col {
          order: 1;
        }
        .te-era-node-col {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1.2rem;
        }
        .te-era-dot {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(9, 13, 24, 0.94);
          border: 1.5px solid rgba(148, 163, 184, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .te-era-row.is-active .te-era-dot {
          transform: scale(1.12);
        }
        .te-year-box {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0.75rem 1.3rem;
          border-radius: 18px;
          background: rgba(9, 13, 24, 0.85);
          min-width: 195px;
        }
        .te-era-step {
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #94a3b8;
          font-weight: 700;
        }
        .te-year-box strong {
          font-size: 1.22rem;
          font-weight: 800;
        }
        .te-era-card-col {
          min-width: 0;
        }
        .te-era-card-col :global(.te-card-electric) {
          display: block;
          width: 100%;
        }
        .te-era-card-inner {
          padding: 2rem 2.2rem;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .te-mobile-year {
          display: none;
          align-self: flex-start;
          padding: 0.3rem 0.85rem;
          border-radius: 999px;
          border: 1px solid;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .te-era-title {
          margin: 0 0 0.35rem 0;
          font-size: clamp(1.38rem, 2.2vw, 1.78rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
        }
        .te-era-sub {
          margin: 0;
          font-size: 0.98rem;
          color: #bae6fd;
          line-height: 1.5;
        }
        .te-era-summary {
          margin: 0;
          font-size: 1.01rem;
          color: #e2e8f0;
          line-height: 1.75;
        }
        .te-era-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 0.4rem;
        }
        .te-key-figures {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .te-tag {
          padding: 0.34rem 0.82rem;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #bae6fd;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(125, 249, 255, 0.24);
        }
        .te-explore-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.68rem 1.35rem;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .te-explore-btn:hover {
          transform: translateY(-2px);
          background: rgba(30, 41, 59, 0.95);
        }
        .te-bottom-cta {
          margin-top: 4rem;
        }
        .te-cta-inner {
          padding: 2.75rem 2rem;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }
        .te-cta-inner h2 {
          font-size: clamp(1.5rem, 2.8vw, 2.25rem);
          color: #ffffff;
          margin: 0.85rem 0 0.75rem 0;
        }
        .te-cta-inner p {
          max-width: 680px;
          margin: 0 auto 1.75rem auto;
          color: #cbd5e1;
          line-height: 1.7;
        }
        .te-cta-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1.25rem;
        }
        .te-link-reset {
          text-decoration: none;
          color: inherit;
          display: inline-flex;
        }
        .te-cta-label {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0 1.75rem;
          font-weight: 700;
          font-size: 1.02rem;
          color: #f8fafc;
          white-space: nowrap;
        }
        @media (max-width: 960px) {
          .te-showcase-grid {
            grid-template-columns: 1fr;
          }
          .te-track-rail {
            left: 24px;
            transform: none;
          }
          .te-era-row {
            grid-template-columns: 1fr;
            padding-left: 3.75rem;
            position: relative;
          }
          .te-era-row.is-alt .te-era-node-col,
          .te-era-row.is-alt .te-era-card-col {
            order: initial;
          }
          .te-era-node-col {
            position: absolute;
            left: 0;
            top: 1.8rem;
            justify-content: flex-start;
          }
          .te-era-node-col :global(.te-year-electric) {
            display: none;
          }
          .te-mobile-year {
            display: inline-block;
          }
        }
      `}</style>
    </div>
  );
}
