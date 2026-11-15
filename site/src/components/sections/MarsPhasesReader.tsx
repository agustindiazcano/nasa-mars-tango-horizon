'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { PhotorealisticMarsBanner } from '@/components/ui/PlanetBanners';
import { getMarsExplorationPages } from '@/data/thesesAndMars';
import { ThesisVisual } from '@/components/visuals/ThesisAndMarsVisuals';
import { useLanguage } from '@/context/LanguageContext';

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
  const prevPhase = activeIndex > 0 ? phases[activeIndex - 1] : null;
  const nextPhase =
    activeIndex < phases.length - 1
      ? phases[activeIndex + 1]
      : null;
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
    <section className="era-detail-page" aria-labelledby="mars-phase-title">
      <div className="era-detail-container">
        {/* Topbar */}
        <div className="era-detail-topbar">
          <Link href="/tesis-marte" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={46}
              borderRadius={999}
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
            color={currentPhase.accent}
            speed={1.15}
            chaos={0.48}
            borderRadius={16}
          >
            <div className="era-detail-period-pill" style={{ color: currentPhase.accent }}>
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
              color: currentPhase.accent,
              borderColor: 'rgba(251, 146, 60, 0.42)',
              background: 'rgba(251, 146, 60, 0.12)',
            }}
          >
            {currentPhase.kicker}
          </span>
          <h1
            id="mars-phase-title"
            className="era-detail-main-title"
            style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)' }}
          >
            {currentPhase.heading}
          </h1>
          <p className="era-detail-subtitle" style={{ color: '#fed7aa' }}>
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
            const tabButton = (
              <button
                key={phase.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => selectPhase(idx)}
                className={`th-mars-tab-btn ${isSelected ? 'is-selected' : ''}`}
                style={{
                  borderColor: isSelected ? phase.accent : 'rgba(148, 163, 184, 0.25)',
                  background: isSelected
                    ? 'rgba(15, 23, 42, 0.9)'
                    : 'rgba(9, 13, 22, 0.62)',
                  color: isSelected ? phase.accent : '#cbd5e1',
                }}
              >
                <span className="th-mars-tab-code">{phase.tabLabel}</span>
                <span className="th-mars-tab-sub">{phase.title.split('·')[1]?.trim()}</span>
              </button>
            );

            return isSelected ? (
              <ElectricBorder
                key={phase.id}
                color={phase.accent}
                speed={1.15}
                chaos={0.42}
                borderRadius={999}
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
          borderRadius={32}
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
              <span className="thesis-abstract-label" style={{ color: currentPhase.accent }}>
                {isEs ? 'Panorama de Fase' : 'Phase Overview'} · {currentPhase.title}
              </span>
              <p className="thesis-abstract-text" style={{ marginBottom: '1.1rem' }}>
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
                  style={{ borderColor: 'rgba(251, 146, 60, 0.28)' }}
                >
                  <span className="era-metric-value" style={{ color: currentPhase.accent }}>
                    {m.value}
                  </span>
                  <span className="era-metric-label">{m.label}</span>
                </div>
              ))}
            </div>

            {/* 3 Tarjetas Profundas con ThesisVisual */}
            <div className="era-sections-list" style={{ gap: '2.5rem', marginTop: '2.4rem' }}>
              {currentPhase.sections.map((sec, sIdx) => (
                <ElectricBorder
                  key={sec.id}
                  color={sIdx % 2 === 0 ? currentPhase.accent : '#fb923c'}
                  speed={1.0}
                  chaos={0.38}
                  borderRadius={24}
                >
                  <GlassSurface
                    width="100%"
                    height="auto"
                    borderRadius={24}
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
                            color: currentPhase.accent,
                            borderColor: 'rgba(251, 146, 60, 0.42)',
                            background: 'rgba(251, 146, 60, 0.14)',
                          }}
                        >
                          {isEs ? 'Módulo' : 'Module'} 0{sIdx + 1}
                        </span>
                        <h2 className="era-section-heading" style={{ marginTop: '0.6rem' }}>
                          {sec.title}
                        </h2>
                        <p className="era-section-body">{sec.body}</p>

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
              style={{ borderColor: 'rgba(251, 146, 60, 0.32)' }}
            >
              <p>“{currentPhase.quote.text}”</p>
              <footer>— {currentPhase.quote.author}</footer>
            </blockquote>

            {/* Tarjeta Destacada al final de Marte III */}
            {isMarteIII && (
              <div style={{ marginTop: '3rem' }}>
                <ElectricBorder
                  color="#7df9ff"
                  speed={1.3}
                  chaos={0.5}
                  borderRadius={26}
                >
                  <GlassSurface
                    width="100%"
                    height="auto"
                    borderRadius={26}
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
                          color: '#7df9ff',
                          borderColor: 'rgba(125, 249, 255, 0.45)',
                          background: 'rgba(56, 189, 248, 0.14)',
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
                      <p className="era-section-body" style={{ maxWidth: '780px' }}>
                        {isEs
                          ? 'Explorá la matriz comparativa integral entre la Luna y Marte en el Compendio General, o ingresá al Simulador 3D de Tango Horizon para operar robótica autónoma, reconocimiento de tubos de lava y misiones humano–IA sobre terreno marciano.'
                          : 'Explore the comprehensive comparative matrix between the Moon and Mars in the General Compendium, or enter the Tango Horizon 3D Simulator to operate autonomous robotics, lava tube reconnaissance, and human–AI missions across Martian terrain.'}
                      </p>

                      <div className="th-tango-cta-actions">
                        <Link
                          href="/compendio"
                          className="ac-readmore-wrap"
                          style={{ textDecoration: 'none' }}
                        >
                          <GlassSurface
                            width="auto"
                            height={52}
                            borderRadius={999}
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
                              <span className="ac-readmore-arrow" style={{ color: '#c4b5fd' }}>
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
                          style={{ textDecoration: 'none' }}
                        >
                          <ElectricBorder
                            color="#7df9ff"
                            speed={1.25}
                            chaos={0.48}
                            borderRadius={999}
                          >
                            <GlassSurface
                              width="auto"
                              height={52}
                              borderRadius={999}
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
                                style={{ padding: '0 1.75rem', color: '#7df9ff' }}
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
            >
              <GlassSurface
                width="auto"
                height={54}
                borderRadius={999}
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
              style={{ textDecoration: 'none' }}
            >
              <GlassSurface
                width="auto"
                height={54}
                borderRadius={999}
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
            >
              <ElectricBorder
                color={nextPhase.accent}
                speed={1.2}
                chaos={0.45}
                borderRadius={999}
              >
                <GlassSurface
                  width="auto"
                  height={54}
                  borderRadius={999}
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
                    <span className="ac-readmore-arrow" style={{ color: nextPhase.accent }}>
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
              style={{ textDecoration: 'none' }}
            >
              <ElectricBorder
                color="#a78bfa"
                speed={1.2}
                chaos={0.45}
                borderRadius={999}
              >
                <GlassSurface
                  width="auto"
                  height={54}
                  borderRadius={999}
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
                    <span className="ac-readmore-arrow" style={{ color: '#c4b5fd' }}>
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
          padding: 0.72rem 1.4rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.25);
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
          border-radius: 999px;
          background: rgba(251, 146, 60, 0.12);
          border: 1px solid rgba(251, 146, 60, 0.28);
          color: #fed7aa;
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
          padding: 0.26rem 0.72rem;
          border-radius: 10px;
          background: rgba(9, 13, 22, 0.75);
          border: 1px solid rgba(125, 249, 255, 0.25);
          color: #bae6fd;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.78rem;
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
          color: #f8fafc;
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
