'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink, Rocket, Users } from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { FlexCarousel } from '@/components/ui/FlexCarousel';
import { EarthGlobe } from '@/components/ui/PlanetBanners';
import { useLanguage } from '@/context/LanguageContext';
import {
  getFinalSynthesisData,
  getProjectMetadata,
  getSynthesisCarouselImages,
} from '@/data/compendiumAndTeam';

type GalleryFilter = 'all' | 'lunar' | 'marciana';

export function CompendiumView() {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');

  const metadata = useMemo(() => getProjectMetadata(lang), [lang]);
  const synthesisData = useMemo(() => getFinalSynthesisData(lang), [lang]);
  const allSlides = useMemo(() => getSynthesisCarouselImages(lang), [lang]);

  const filteredSlides = useMemo(() => {
    if (galleryFilter === 'all') {
      return allSlides;
    }
    return allSlides.filter((slide) => slide.category === galleryFilter);
  }, [allSlides, galleryFilter]);

  const lunarCount = useMemo(
    () => allSlides.filter((s) => s.category === 'lunar').length,
    [allSlides]
  );
  const marsCount = useMemo(
    () => allSlides.filter((s) => s.category === 'marciana').length,
    [allSlides]
  );

  return (
    <div className="era-detail-page">
      <div className="era-detail-container">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link href="/marte" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
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
              <span className="ac-readmore-label">
                <ArrowLeft size={16} className="ac-readmore-arrow-left" aria-hidden="true" />
                <span>{isEs ? 'Volver a Marte I–III' : 'Back to Mars I–III'}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#a78bfa" speed={1.2} chaos={0.5} borderRadius={16}>
            <div className="era-detail-period-pill" style={{ color: '#ddd6fe' }}>
              {isEs ? 'Compendio Final' : 'Final Compendium'} · {metadata.releaseDate}
            </div>
          </ElectricBorder>
        </div>

        {/* HERO CONTINUO TIERRA -> LUNA -> MARTE -> TANGO HORIZON */}
        <header
          style={{
            textAlign: 'center',
            maxWidth: '980px',
            margin: '0 auto 3rem auto',
          }}
        >
          <div className="compendio-hero-visual">
            <div className="compendio-globe-wrap">
              <EarthGlobe size={118} />
              <span className="compendio-orbit-tag" style={{ color: '#7dd3fc' }}>
                {isEs ? 'Origen · Tierra' : 'Origin · Earth'}
              </span>
            </div>

            <div className="compendio-trajectory-svg-wrap" aria-hidden="true">
              <svg viewBox="0 0 360 88" className="compendio-trajectory-svg">
                <defs>
                  <linearGradient id="compendioArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="36%" stopColor="#fde68a" />
                    <stop offset="72%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
                <path
                  d="M 18 54 Q 105 12 180 42 T 342 46"
                  fill="none"
                  stroke="url(#compendioArcGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                />
                <circle cx="20" cy="54" r="5.5" fill="#38bdf8" />
                <circle cx="132" cy="27" r="5" fill="#fde68a" />
                <circle cx="242" cy="51" r="5.5" fill="#fb923c" />
                <circle cx="340" cy="46" r="6" fill="#c4b5fd" />
                <text
                  x="20"
                  y="76"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="system-ui, sans-serif"
                >
                  {isEs ? 'Tierra' : 'Earth'}
                </text>
                <text
                  x="132"
                  y="14"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="10"
                  fontFamily="system-ui, sans-serif"
                >
                  {isEs ? 'Luna · 384k km' : 'Moon · 384k km'}
                </text>
                <text
                  x="242"
                  y="74"
                  textAnchor="middle"
                  fill="#fdba74"
                  fontSize="10"
                  fontFamily="system-ui, sans-serif"
                >
                  {isEs ? 'Marte · 225M km' : 'Mars · 225M km'}
                </text>
                <text
                  x="336"
                  y="28"
                  textAnchor="middle"
                  fill="#ddd6fe"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                >
                  EVA 2026
                </text>
              </svg>
            </div>

            <div className="compendio-horizon-pill">
              <span className="compendio-horizon-kicker">
                {isEs ? 'CRÁTER GALE · 2026' : 'GALE CRATER · 2026'}
              </span>
              <strong className="compendio-horizon-title">Tango Horizon</strong>
              <span className="compendio-horizon-sub">
                {isEs ? 'Simulador 3D y Multi-Agente' : '3D Simulator & Multi-Agent'}
              </span>
            </div>
          </div>

          <span className="ac-timeline-badge" style={{ marginTop: '1rem' }}>
            {synthesisData.kicker}
          </span>
          <h1
            className="era-detail-main-title"
            style={{ fontSize: 'clamp(2.2rem, 4.4vw, 3.55rem)' }}
          >
            {synthesisData.title}
          </h1>
          <p className="era-detail-subtitle">{synthesisData.subtitle}</p>
        </header>

        {/* CUERPO PRINCIPAL */}
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={32}
          borderWidth={0.07}
          brightness={50}
          opacity={0.94}
          blur={14}
          displace={0.9}
          backgroundOpacity={0.1}
          saturation={1.35}
          distortionScale={-170}
          redOffset={0}
          greenOffset={12}
          blueOffset={24}
        >
          <article className="era-detail-article">
            {/* Executive Abstract */}
            <div
              className="thesis-abstract-box"
              style={{ borderColor: 'rgba(167, 139, 250, 0.38)' }}
            >
              <span className="thesis-abstract-label" style={{ color: '#c4b5fd' }}>
                {isEs ? 'Visión Integral de la Investigación' : 'Comprehensive Research Overview'}
              </span>
              <p className="thesis-abstract-text">{synthesisData.abstract}</p>
            </div>

            {/* Continuity Arc: Earth -> Moon -> Mars -> Tango Horizon 2026 */}
            <section style={{ marginTop: '2.2rem' }} aria-labelledby="continuity-arc-heading">
              <span className="ac-timeline-badge">
                {isEs ? 'Trayectoria Continua' : 'Continuous Trajectory'}
              </span>
              <h2 id="continuity-arc-heading" className="synthesis-section-title">
                {isEs
                  ? 'De la Observación Terrestre a la Autonomía EVA en Marte'
                  : 'From Earth Observation to Autonomous Mars EVA'}
              </h2>

              <div className="compendio-arc-grid">
                {synthesisData.continuityArc.map((stage) => (
                  <div
                    key={stage.id}
                    className="compendio-arc-card"
                    style={{ borderTop: `3px solid ${stage.accent}` }}
                  >
                    <span className="compendio-arc-step" style={{ color: stage.accent }}>
                      {stage.step}
                    </span>
                    <h3 className="compendio-arc-world">{stage.world}</h3>
                    <span className="compendio-arc-metric th-mono">{stage.metric}</span>
                    <p className="compendio-arc-summary">{stage.summary}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 5 Cross-Cutting Modules */}
            <section style={{ marginTop: '3.2rem' }} aria-labelledby="modules-compendium-heading">
              <span className="ac-timeline-badge">
                {isEs ? 'Arquitectura Conceptual Unificada' : 'Unified Conceptual Architecture'}
              </span>
              <h2 id="modules-compendium-heading" className="synthesis-section-title">
                {isEs
                  ? 'Los 5 Módulos Fundamentales de la Exploración Lunar y Marciana'
                  : 'The 5 Core Modules of Lunar and Martian Exploration'}
              </h2>

              <div className="synthesis-modules-grid">
                {synthesisData.modulesCompendium.map((mod) => (
                  <div
                    key={mod.code}
                    className="synthesis-module-card"
                    style={{ borderTop: `3px solid ${mod.accent}` }}
                  >
                    <div className="synthesis-module-header">
                      <span className="synthesis-module-code" style={{ color: mod.accent }}>
                        {mod.code}
                      </span>
                      <span className="synthesis-module-sphere">{mod.sphere}</span>
                    </div>

                    <h3 className="synthesis-module-title">{mod.title}</h3>
                    <p className="era-section-body" style={{ fontSize: '1.05rem' }}>
                      {mod.synthesis}
                    </p>

                    <div className="synthesis-concepts-tags">
                      {mod.keyConcepts.map((concept) => (
                        <span key={concept} className="synthesis-concept-chip">
                          ✦ {concept}
                        </span>
                      ))}
                    </div>

                    <div className="thesis-formula-bar" style={{ borderLeftColor: mod.accent }}>
                      <code>{mod.formula}</code>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Moon vs Mars Comparison Matrix */}
            <section style={{ marginTop: '3.6rem' }} aria-labelledby="comparison-table-heading">
              <span className="ac-timeline-badge">
                {isEs ? 'Contraste Astrodinámico y Ambiental' : 'Astrodynamic & Environmental Contrast'}
              </span>
              <h2 id="comparison-table-heading" className="synthesis-section-title">
                {isEs
                  ? 'Matriz Comparativa de Misión: Selenología (Luna) vs. Areología (Marte)'
                  : 'Mission Comparison Matrix: Selenology (Moon) vs. Areology (Mars)'}
              </h2>

              <div className="synthesis-table-wrapper">
                <table className="synthesis-comparison-table">
                  <thead>
                    <tr>
                      <th>
                        {isEs ? 'Parámetro Físico / Operativo' : 'Physical / Operational Parameter'}
                      </th>
                      <th style={{ color: '#fde68a' }}>
                        {isEs ? 'Tesis I · La Luna' : 'Thesis I · The Moon'}
                      </th>
                      <th style={{ color: '#fb923c' }}>
                        {isEs ? 'Tesis II · Marte' : 'Thesis II · Mars'}
                      </th>
                      <th style={{ color: '#7df9ff' }}>
                        {isEs ? 'Implicancia de Ingeniería y EVA' : 'Engineering & EVA Implication'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {synthesisData.comparisonRows.map((row) => (
                      <tr key={row.param}>
                        <td className="synthesis-td-param">{row.param}</td>
                        <td className="synthesis-td-moon">{row.moon}</td>
                        <td className="synthesis-td-mars">{row.mars}</td>
                        <td className="synthesis-td-imp">{row.implication}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Interactive NASA Gallery with FlexCarousel */}
            <section style={{ marginTop: '3.8rem' }} aria-labelledby="nasa-gallery-heading">
              <div className="synthesis-carousel-section">
                <div className="synthesis-carousel-top">
                  <div>
                    <span className="ac-timeline-badge" style={{ marginBottom: '0.45rem' }}>
                      {isEs
                        ? 'Archivo Fotográfico Verificado NASA · FlexCarousel'
                        : 'Verified NASA Photo Archive · FlexCarousel'}
                    </span>
                    <h2
                      id="nasa-gallery-heading"
                      className="synthesis-section-title"
                      style={{ margin: 0 }}
                    >
                      {isEs
                        ? 'Galería Histórica: Del Mare Tranquillitatis al Cráter Jezero y Gale'
                        : 'Historical Gallery: From Mare Tranquillitatis to Jezero and Gale Craters'}
                    </h2>
                  </div>

                  <div
                    className="synthesis-carousel-filters"
                    role="group"
                    aria-label={isEs ? 'Filtrar archivo fotográfico' : 'Filter photo archive'}
                  >
                    <button
                      type="button"
                      onClick={() => setGalleryFilter('all')}
                      className={`synthesis-filter-pill ${galleryFilter === 'all' ? 'is-active' : ''}`}
                    >
                      {isEs ? `Todas (${allSlides.length})` : `All (${allSlides.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryFilter('lunar')}
                      className={`synthesis-filter-pill ${galleryFilter === 'lunar' ? 'is-active' : ''}`}
                    >
                      {isEs ? `Tesis Lunar (${lunarCount})` : `Lunar Thesis (${lunarCount})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryFilter('marciana')}
                      className={`synthesis-filter-pill ${galleryFilter === 'marciana' ? 'is-active' : ''}`}
                    >
                      {isEs ? `Tesis Marciana (${marsCount})` : `Martian Thesis (${marsCount})`}
                    </button>
                  </div>
                </div>

                <FlexCarousel
                  key={`${galleryFilter}-${lang}`}
                  images={filteredSlides}
                  speed={0.5}
                  cardSize="md"
                  gap={24}
                  borderRadius={18}
                />
              </div>
            </section>

            {/* Final Philosophical & Technical Reflection */}
            <section style={{ marginTop: '3.6rem' }} aria-labelledby="reflection-heading">
              <span className="ac-timeline-badge">
                {isEs ? 'Síntesis Filosófica y Operativa' : 'Philosophical & Operational Synthesis'}
              </span>
              <h2 id="reflection-heading" className="synthesis-section-title">
                {isEs
                  ? 'Reflexión Final: El Horizonte Compartido de 2026'
                  : 'Final Reflection: The Shared Horizon of 2026'}
              </h2>

              <div className="compendio-reflections-grid">
                {synthesisData.reflectionBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="compendio-reflection-card"
                    style={{ borderLeft: `3px solid ${block.accent}` }}
                  >
                    <span className="compendio-reflection-badge" style={{ color: block.accent }}>
                      {block.badge}
                    </span>
                    <h3 className="compendio-reflection-title">{block.title}</h3>
                    <div className="compendio-reflection-body">
                      {block.paragraphs.map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </GlassSurface>

        {/* BOTTOM CTAs: 3D SIMULATOR + TEAM */}
        <section
          className="compendio-cta-banner"
          aria-label={isEs ? 'Acciones finales del compendio' : 'Final compendium actions'}
        >
          <ElectricBorder color="#7df9ff" speed={1.2} chaos={0.48} borderRadius={999}>
            <a
              href={metadata.simulatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ac-readmore-wrap"
              style={{ textDecoration: 'none' }}
            >
              <GlassSurface
                width="auto"
                height={56}
                borderRadius={999}
                borderWidth={0.12}
                brightness={60}
                opacity={0.96}
                blur={12}
                displace={0.6}
                backgroundOpacity={0.18}
                saturation={1.45}
                distortionScale={-140}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.85rem' }}>
                  <Rocket size={17} style={{ color: '#7df9ff' }} aria-hidden="true" />
                  <span>{isEs ? 'Lanzar Simulador 3D ↗' : 'Launch 3D Simulator ↗'}</span>
                  <ExternalLink size={15} style={{ color: '#7df9ff' }} aria-hidden="true" />
                </span>
              </GlassSurface>
            </a>
          </ElectricBorder>

          <Link href="/equipo" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <ElectricBorder color="#fb923c" speed={1.15} chaos={0.45} borderRadius={999}>
              <GlassSurface
                width="auto"
                height={56}
                borderRadius={999}
                borderWidth={0.12}
                brightness={58}
                opacity={0.95}
                blur={10}
                displace={0.6}
                backgroundOpacity={0.14}
                saturation={1.4}
                distortionScale={-140}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.75rem' }}>
                  <Users size={17} style={{ color: '#fb923c' }} aria-hidden="true" />
                  <span>{isEs ? 'Explorar Equipo' : 'Explore Team'}</span>
                  <ArrowRight
                    size={16}
                    className="ac-readmore-arrow"
                    style={{ color: '#fb923c' }}
                    aria-hidden="true"
                  />
                </span>
              </GlassSurface>
            </ElectricBorder>
          </Link>
        </section>

        <nav
          className="era-detail-pagination"
          aria-label={isEs ? 'Navegación de cierre' : 'Closing navigation'}
        >
          <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={48}
              borderRadius={999}
              borderWidth={0.1}
              brightness={54}
              opacity={0.94}
              blur={10}
              displace={0.5}
              backgroundOpacity={0.1}
              saturation={1.3}
              distortionScale={-130}
              className="ac-glass-btn-surface"
            >
              <span className="ac-readmore-label" style={{ padding: '0 1.4rem' }}>
                <ArrowLeft size={15} className="ac-readmore-arrow-left" aria-hidden="true" />
                <span>{isEs ? 'Volver al Inicio' : 'Back to Home'}</span>
              </span>
            </GlassSurface>
          </Link>

          <Link href="/cronologia" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={48}
              borderRadius={999}
              borderWidth={0.1}
              brightness={54}
              opacity={0.94}
              blur={10}
              displace={0.5}
              backgroundOpacity={0.1}
              saturation={1.3}
              distortionScale={-130}
              className="ac-glass-btn-surface"
            >
              <span className="ac-readmore-label" style={{ padding: '0 1.4rem' }}>
                <span>{isEs ? 'Explorar Cronología Espacial' : 'Explore Space Timeline'}</span>
                <ArrowRight size={15} className="ac-readmore-arrow" aria-hidden="true" />
              </span>
            </GlassSurface>
          </Link>
        </nav>
      </div>

      <style>{`
        .compendio-hero-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1.4rem;
          margin-bottom: 1.25rem;
        }
        .compendio-globe-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        .compendio-orbit-tag {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .compendio-trajectory-svg-wrap {
          width: min(360px, 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .compendio-trajectory-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }
        .compendio-horizon-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 1rem 1.45rem;
          border-radius: 20px;
          background: radial-gradient(circle at 30% 25%, rgba(251, 146, 60, 0.18), rgba(15, 23, 42, 0.85));
          border: 1px solid rgba(251, 146, 60, 0.42);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42), 0 0 24px rgba(167, 139, 250, 0.14);
        }
        .compendio-horizon-kicker {
          font-family: var(--th-font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #fde68a;
        }
        .compendio-horizon-title {
          font-size: 1.22rem;
          font-weight: 800;
          color: #ffffff;
        }
        .compendio-horizon-sub {
          font-size: 0.8rem;
          color: #cbd5e1;
        }
        .compendio-arc-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.15rem;
        }
        .compendio-arc-card {
          padding: 1.35rem 1.4rem;
          border-radius: 20px;
          background: rgba(9, 13, 22, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.22);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .compendio-arc-step {
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .compendio-arc-world {
          margin: 0;
          font-size: 1.16rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .compendio-arc-metric {
          font-size: 0.76rem;
          color: #bae6fd;
          opacity: 0.9;
        }
        .compendio-arc-summary {
          margin: 0.2rem 0 0 0;
          font-size: 0.94rem;
          line-height: 1.65;
          color: #cbd5e1;
        }
        .compendio-reflections-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.5rem;
        }
        .compendio-reflection-card {
          padding: 1.75rem 1.9rem;
          border-radius: 22px;
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.78), rgba(6, 10, 20, 0.88));
          border: 1px solid rgba(148, 163, 184, 0.22);
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .compendio-reflection-badge {
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .compendio-reflection-title {
          margin: 0;
          font-size: clamp(1.2rem, 1.8vw, 1.45rem);
          font-weight: 800;
          color: #ffffff;
        }
        .compendio-reflection-body {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .compendio-reflection-body p {
          margin: 0;
          font-size: 1.01rem;
          line-height: 1.8;
          color: #e2e8f0;
        }
        .compendio-cta-banner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 1.35rem;
          margin-top: 2.8rem;
        }
        @media (max-width: 1080px) {
          .compendio-arc-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 760px) {
          .compendio-arc-grid,
          .compendio-reflections-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default CompendiumView;
