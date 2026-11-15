'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { PhotorealisticMarsBanner } from '@/components/ui/PlanetBanners';
import { getMarsExplorationPages } from '@/data/thesesAndMars';
import { ThesisVisual } from '@/components/visuals/ThesisAndMarsVisuals';
import { useLanguage } from '@/context/LanguageContext';

function toSunsetAccent(color: string): string {
  const normalized = color.trim().toLowerCase();
  if (normalized === '#7df9ff' || normalized === '#38bdf8' || normalized === '#0ea5e9') {
    return '#fb7185';
  }
  if (normalized === '#fde68a') {
    return '#fbbf24';
  }
  if (normalized === '#c4b5fd' || normalized === '#a78bfa') {
    return '#fda4af';
  }
  return color;
}

export function MarsPhasesReader() {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const phases = getMarsExplorationPages(lang);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const foundIndex = phases.findIndex(
      (item) => item.id === hash || item.slug === hash
    );
    if (foundIndex >= 0) {
      setActiveIndex(foundIndex);
    }
  }, [phases]);

  const currentPhase = phases[activeIndex] ?? phases[0];
  const currentAccent = toSunsetAccent(currentPhase.accent);
  const prevPhase = activeIndex > 0 ? phases[activeIndex - 1] : null;
  const nextPhase =
    activeIndex < phases.length - 1
      ? phases[activeIndex + 1]
      : null;
  const nextAccent = nextPhase ? toSunsetAccent(nextPhase.accent) : '#fb7185';
  const isMarteIII = currentPhase.id === 'marte-arquitectura-humana';

  const selectPhase = (idx: number) => {
    setActiveIndex(idx);
    const targetPhase = phases[idx];
    if (typeof window !== 'undefined' && targetPhase) {
      window.history.replaceState(null, '', `#${targetPhase.slug}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="era-detail-page th-mars-phases-reader" aria-labelledby="mars-phase-title">
      <div className="era-detail-container">
        {/* Topbar */}
        <div className="era-detail-topbar">
          <Link
            href="/tesis-marte"
            className="ac-readmore-wrap"
            style={{ textDecoration: 'none', borderRadius: '10px', minHeight: '40px' }}
          >
            <GlassSurface
              width="auto"
              height={44}
              borderRadius={12}
              borderWidth={0.12}
              brightness={58}
              opacity={0.95}
              blur={10}
              displace={0.6}
              backgroundOpacity={0.12}
              saturation={1.4}
              distortionScale={-140}
              className="ac-glass-btn-surface"
            >
              <span className="ac-readmore-label" style={{ padding: '0 1.4rem' }}>
                <span className="ac-readmore-arrow-left">←</span>
                {isEs ? 'Tesis sobre Marte' : 'Mars Thesis'}
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder
            color={currentAccent}
            speed={1.15}
            chaos={0.48}
            borderRadius={12}
          >
            <div
              className="era-detail-period-pill"
              style={{ color: currentAccent, borderRadius: '10px', minHeight: '40px' }}
            >
              {currentPhase.title}
            </div>
          </ElectricBorder>
        </div>

        {/* Hero del Planeta Rojo */}
        <header
          className="era-detail-header"
          style={{ textAlign: 'center', maxWidth: '940px', margin: '0 auto 2.2rem auto' }}
        >
          <PhotorealisticMarsBanner />
          <span
            className="ac-timeline-badge"
            style={{
              marginTop: '1.6rem',
              color: currentAccent,
              borderColor: 'rgba(251, 146, 60, 0.42)',
              background: 'rgba(251, 146, 60, 0.12)',
              borderRadius: '10px',
            }}
          >
            {currentPhase.kicker}
          </span>
          <h1
            id="mars-phase-title"
            className="era-detail-main-title"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', color: '#f3dfd1' }}
          >
            {currentPhase.heading}
          </h1>
          <p className="era-detail-subtitle" style={{ color: '#fdba74' }}>
            {currentPhase.subtitle}
          </p>
        </header>

        {/* Selector interactivo Marte I / Marte II / Marte III */}
        <div
          role="tablist"
          aria-label={isEs ? 'Fases de exploración de Marte' : 'Mars exploration phases'}
          className="th-mars-tabs"
        >
          {phases.map((phase, idx) => {
            const isSelected = idx === activeIndex;
            const tabAccent = toSunsetAccent(phase.accent);
            const tabButton = (
              <button
                key={phase.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => selectPhase(idx)}
                className={`th-mars-tab-btn ${isSelected ? 'is-selected' : ''}`}
                style={{
                  borderColor: isSelected ? tabAccent : 'rgba(253, 186, 116, 0.28)',
                  background: isSelected
                    ? 'rgba(20, 10, 14, 0.92)'
                    : 'rgba(20, 10, 14, 0.65)',
                  color: isSelected ? tabAccent : '#f3dfd1',
                  borderRadius: '10px',
                  minHeight: '40px',
                }}
              >
                <span className="th-mars-tab-code">{phase.tabLabel}</span>
                <span className="th-mars-tab-sub">{phase.title.split('·')[1]?.trim()}</span>
              </button>
            );

            return isSelected ? (
              <ElectricBorder
                key={phase.id}
                color={tabAccent}
                speed={1.15}
                chaos={0.42}
                borderRadius={12}
              >
                {tabButton}
              </ElectricBorder>
            ) : (
              tabButton
            );
          })}
        </div>

        {/* Tarjeta Resumen de la Fase + 3 Tarjetas Visuales */}
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={24}
          borderWidth={0.07}
          brightness={50}
          opacity={0.94}
          blur={14}
          displace={1.2}
          backgroundOpacity={0.1}
          saturation={1.35}
          distortionScale={-180}
          redOffset={0}
          greenOffset={12}
          blueOffset={24}
        >
          <article className="era-detail-article">
            {/* Phase Overview Card */}
            <div
              className="thesis-abstract-box"
              style={{ borderColor: 'rgba(251, 146, 60, 0.35)' }}
            >
              <span className="thesis-abstract-label" style={{ color: currentAccent }}>
                {isEs ? 'Panorama de Fase' : 'Phase Overview'} · {currentPhase.title}
              </span>
              <p className="thesis-abstract-text" style={{ marginBottom: '1.1rem', color: '#f3dfd1' }}>
                {currentPhase.description}
              </p>
              <div className="th-phase-tags">
                {currentPhase.tags.map((tag) => (
                  <span key={tag} className="th-phase-tag-chip">
                    ✦ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Métricas de la Fase */}
            <div className="era-metrics-grid">
              {currentPhase.metrics.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className="era-metric-box"
                  style={{ borderColor: 'rgba(251, 146, 60, 0.3)' }}
                >
                  <span
                    className="era-metric-value"
                    style={{ color: currentAccent, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {m.value}
                  </span>
                  <span className="era-metric-label" style={{ color: '#b89b8c' }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* 3 Tarjetas Profundas con ThesisVisual */}
            <div className="era-sections-list" style={{ gap: '2.5rem', marginTop: '2.4rem' }}>
              {currentPhase.sections.map((sec, sIdx) => (
                <ElectricBorder
                  key={sec.id}
                  color={sIdx % 2 === 0 ? currentAccent : '#f97316'}
                  speed={1.0}
                  chaos={0.38}
                  borderRadius={20}
                >
                  <GlassSurface
                    width="100%"
                    height="auto"
                    borderRadius={20}
                    borderWidth={0.08}
                    brightness={54}
                    opacity={0.92}
                    blur={12}
                    backgroundOpacity={0.08}
                    saturation={1.25}
                  >
                    <div
                      className={`era-ancient-row th-phase-card ${
                        sIdx % 2 === 1 ? 'is-reversed' : ''
                      }`}
                    >
                      <section
                        className="era-section-block"
                        style={{ borderLeftColor: 'rgba(251, 146, 60, 0.5)' }}
                      >
                        <span
                          className="thesis-chapter-pill"
                          style={{
                            color: currentAccent,
                            borderColor: 'rgba(251, 146, 60, 0.42)',
                            background: 'rgba(251, 146, 60, 0.14)',
                            borderRadius: '10px',
                          }}
                        >
                          {isEs ? 'Módulo' : 'Module'} 0{sIdx + 1}
                        </span>
                        <h2
                          className="era-section-heading"
                          style={{ marginTop: '0.6rem', color: '#f3dfd1' }}
                        >
                          {sec.title}
                        </h2>
                        <p className="era-section-body" style={{ color: '#f3dfd1' }}>{sec.body}</p>

                        {sec.highlights && sec.highlights.length > 0 && (
                          <div className="th-section-highlights">
                            {sec.highlights.map((hl) => (
                              <span key={hl} className="th-highlight-chip">
                                {hl}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>

                      <div className="era-ancient-visual-col">
                        <ThesisVisual type={sec.visualKey} />
                      </div>
                    </div>
                  </GlassSurface>
                </ElectricBorder>
              ))}
            </div>

            {/* Cita Académica */}
            <blockquote
              className="era-academic-quote"
              style={{ borderColor: 'rgba(251, 146, 60, 0.34)', color: '#f3dfd1' }}
            >
              <p>“{currentPhase.quote.text}”</p>
              <footer style={{ color: '#fdba74' }}>— {currentPhase.quote.author}</footer>
            </blockquote>

            {/* Tarjeta Destacada al final de Marte III */}
            {isMarteIII && (
              <div style={{ marginTop: '3rem' }}>
                <ElectricBorder
                  color="#fb7185"
                  speed={1.3}
                  chaos={0.5}
                  borderRadius={20}
                >
                  <GlassSurface
                    width="100%"
                    height="auto"
                    borderRadius={20}
                    borderWidth={0.1}
                    brightness={58}
                    opacity={0.96}
                    blur={14}
                    backgroundOpacity={0.14}
                    saturation={1.4}
                  >
                    <div className="th-tango-cta-card">
                      <span
                        className="thesis-chapter-pill"
                        style={{
                          color: '#fbbf24',
                          borderColor: 'rgba(251, 191, 36, 0.45)',
                          background: 'rgba(249, 115, 22, 0.16)',
                          borderRadius: '10px',
                        }}
                      >
                        {isEs
                          ? 'Horizonte Operativo · Tango Horizon 2026'
                          : 'Operational Horizon · Tango Horizon 2026'}
                      </span>
                      <h3 className="th-tango-cta-title">
                        {isEs
                          ? 'De la Teoría Marciana a la Simulación EVA en Superficie'
                          : 'From Martian Theory to Surface EVA Simulation'}
                      </h3>
                      <p className="era-section-body" style={{ maxWidth: '780px', color: '#f3dfd1' }}>
                        {isEs
                          ? 'Explorá la matriz comparativa integral entre la Luna y Marte en el Compendio General, o ingresá al Simulador 3D de Tango Horizon para operar robótica autónoma, reconocimiento de tubos de lava y misiones humano–IA sobre terreno marciano.'
                          : 'Explore the comprehensive comparative matrix between the Moon and Mars in the General Compendium, or enter the Tango Horizon 3D Simulator to operate autonomous robotics, lava tube reconnaissance, and human–AI missions across Martian terrain.'}
                      </p>

                      <div className="th-tango-cta-actions">
                        <Link
                          href="/compendio"
                          className="ac-readmore-wrap"
                          style={{ textDecoration: 'none', borderRadius: '10px', minHeight: '40px' }}
                        >
                          <GlassSurface
                            width="auto"
                            height={48}
                            borderRadius={12}
                            borderWidth={0.12}
                            brightness={58}
                            opacity={0.95}
                            blur={10}
                            backgroundOpacity={0.14}
                            saturation={1.35}
                            className="ac-glass-btn-surface"
                          >
                            <span className="ac-readmore-label" style={{ padding: '0 1.6rem' }}>
                              {isEs ? 'Ir al Compendio General' : 'Go to General Compendium'}
                              <span className="ac-readmore-arrow" style={{ color: '#fbbf24' }}>
                                →
                              </span>
                            </span>
                          </GlassSurface>
                        </Link>

                        <a
                          href="https://tangohorizon.vercel.app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ac-readmore-wrap"
                          style={{ textDecoration: 'none', borderRadius: '10px', minHeight: '40px' }}
                        >
                          <ElectricBorder
                            color="#f97316"
                            speed={1.25}
                            chaos={0.48}
                            borderRadius={12}
                          >
                            <GlassSurface
                              width="auto"
                              height={48}
                              borderRadius={12}
                              borderWidth={0.12}
                              brightness={60}
                              opacity={0.96}
                              blur={10}
                              backgroundOpacity={0.18}
                              saturation={1.45}
                              className="ac-glass-btn-surface"
                            >
                              <span
                                className="ac-readmore-label"
                                style={{ padding: '0 1.75rem', color: '#fbbf24' }}
                              >
                                {isEs
                                  ? 'Explorar Simulador 3D Tango Horizon ↗'
                                  : 'Launch Tango Horizon 3D Simulator ↗'}
                              </span>
                            </GlassSurface>
                          </ElectricBorder>
                        </a>
                      </div>
                    </div>
                  </GlassSurface>
                </ElectricBorder>
              </div>
            )}
          </article>
        </GlassSurface>

        {/* Navegación Anterior / Siguiente entre Fases */}
        <nav className="era-detail-pagination" style={{ marginTop: '2.6rem' }}>
          {prevPhase ? (
            <button
              type="button"
              onClick={() => selectPhase(activeIndex - 1)}
              className="ac-readmore-wrap th-nav-button-reset"
              style={{ borderRadius: '10px', minHeight: '40px' }}
            >
              <GlassSurface
                width="auto"
                height={48}
                borderRadius={12}
                borderWidth={0.12}
                brightness={56}
                opacity={0.94}
                blur={10}
                backgroundOpacity={0.12}
                saturation={1.35}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.65rem' }}>
                  <span className="ac-readmore-arrow-left">←</span>
                  {isEs ? 'Anterior' : 'Previous'} · {prevPhase.title}
                </span>
              </GlassSurface>
            </button>
          ) : (
            <Link
              href="/tesis-marte"
              className="ac-readmore-wrap"
              style={{ textDecoration: 'none', borderRadius: '10px', minHeight: '40px' }}
            >
              <GlassSurface
                width="auto"
                height={48}
                borderRadius={12}
                borderWidth={0.12}
                brightness={56}
                opacity={0.94}
                blur={10}
                backgroundOpacity={0.12}
                saturation={1.35}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.65rem' }}>
                  <span className="ac-readmore-arrow-left">←</span>
                  {isEs ? 'Volver a Tesis de Marte' : 'Back to Mars Thesis'}
                </span>
              </GlassSurface>
            </Link>
          )}

          {nextPhase ? (
            <button
              type="button"
              onClick={() => selectPhase(activeIndex + 1)}
              className="ac-readmore-wrap th-nav-button-reset"
              style={{ borderRadius: '10px', minHeight: '40px' }}
            >
              <ElectricBorder
                color={nextAccent}
                speed={1.2}
                chaos={0.45}
                borderRadius={12}
              >
                <GlassSurface
                  width="auto"
                  height={48}
                  borderRadius={12}
                  borderWidth={0.12}
                  brightness={58}
                  opacity={0.95}
                  blur={10}
                  backgroundOpacity={0.16}
                  saturation={1.4}
                  className="ac-glass-btn-surface"
                >
                  <span className="ac-readmore-label" style={{ padding: '0 1.75rem' }}>
                    {isEs ? 'Siguiente' : 'Next'} · {nextPhase.title}
                    <span className="ac-readmore-arrow" style={{ color: nextAccent }}>
                      →
                    </span>
                  </span>
                </GlassSurface>
              </ElectricBorder>
            </button>
          ) : (
            <Link
              href="/compendio"
              className="ac-readmore-wrap"
              style={{ textDecoration: 'none', borderRadius: '10px', minHeight: '40px' }}
            >
              <ElectricBorder
                color="#fb7185"
                speed={1.2}
                chaos={0.45}
                borderRadius={12}
              >
                <GlassSurface
                  width="auto"
                  height={48}
                  borderRadius={12}
                  borderWidth={0.12}
                  brightness={58}
                  opacity={0.95}
                  blur={10}
                  backgroundOpacity={0.16}
                  saturation={1.4}
                  className="ac-glass-btn-surface"
                >
                  <span className="ac-readmore-label" style={{ padding: '0 1.75rem' }}>
                    {isEs ? 'Siguiente · Compendio General' : 'Next · General Compendium'}
                    <span className="ac-readmore-arrow" style={{ color: '#fda4af' }}>
                      →
                    </span>
                  </span>
                </GlassSurface>
              </ElectricBorder>
            </Link>
          )}
        </nav>
      </div>

      <style>{`
        .th-mars-phases-reader,
        .th-mars-phases-reader * {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-mars-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 0.9rem;
          margin: 0 auto 2.2rem auto;
        }
        .th-mars-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          min-height: 40px;
          padding: 0.55rem 1.35rem;
          border-radius: 10px;
          border: 1px solid rgba(253, 186, 116, 0.28);
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .th-mars-tab-btn:hover {
          transform: translateY(-2px);
        }
        .th-mars-tab-code {
          font-weight: 800;
          font-size: 0.94rem;
          letter-spacing: 0.04em;
        }
        .th-mars-tab-sub {
          font-size: 0.85rem;
          opacity: 0.85;
        }
        .th-phase-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }
        .th-phase-tag-chip {
          padding: 0.3rem 0.78rem;
          border-radius: 10px;
          background: rgba(251, 146, 60, 0.12);
          border: 1px solid rgba(251, 146, 60, 0.3);
          color: #fdba74;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .th-phase-card {
          padding: 2rem 2.1rem;
        }
        .th-section-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1.15rem;
        }
        .th-highlight-chip {
          padding: 0.28rem 0.72rem;
          border-radius: 10px;
          background: rgba(20, 10, 14, 0.78);
          border: 1px solid rgba(251, 191, 36, 0.3);
          color: #fdba74;
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .th-tango-cta-card {
          padding: 2.2rem 2.3rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .th-tango-cta-title {
          margin: 0;
          font-size: clamp(1.45rem, 2.5vw, 1.95rem);
          font-weight: 800;
          color: #f3dfd1;
        }
        .th-tango-cta-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1.1rem;
          margin-top: 0.5rem;
        }
        .th-nav-button-reset {
          background: transparent;
          border: none;
          border-radius: 10px;
          min-height: 40px;
          padding: 0;
          cursor: pointer;
          color: inherit;
          font: inherit;
        }
        @media (max-width: 900px) {
          .th-phase-card {
            grid-template-columns: 1fr !important;
            padding: 1.4rem 1.2rem;
          }
          .th-phase-card.is-reversed .era-section-block,
          .th-phase-card.is-reversed .era-ancient-visual-col {
            order: initial !important;
          }
          .th-tango-cta-card {
            padding: 1.5rem 1.25rem;
          }
        }
      `}</style>
    </section>
  );
}
