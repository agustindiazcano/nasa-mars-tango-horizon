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

const RALEWAY_FONT = "var(--font-raleway), 'Raleway', sans-serif";

const SUNSET_ACCENT_MAP: Record<string, string> = {
  '#7df9ff': '#f97316',
  '#38bdf8': '#fb923c',
  '#0ea5e9': '#f97316',
  '#0284c7': '#f97316',
  '#7dd3fc': '#fdba74',
  '#60a5fa': '#fb923c',
  '#3b82f6': '#f97316',
  '#5227ff': '#fb7185',
  '#a78bfa': '#fb7185',
  '#c4b5fd': '#fda4af',
  '#fde68a': '#fbbf24',
  '#34d399': '#fbbf24',
  '#6ee7b7': '#fdba74',
};

function toSunsetAccent(color: string): string {
  return SUNSET_ACCENT_MAP[color.toLowerCase()] ?? color;
}

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
    <div className="era-detail-page th-compendio-page" style={{ fontFamily: RALEWAY_FONT }}>
      <div className="era-detail-container">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link href="/marte" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={44}
              borderRadius={12}
              borderWidth={0.12}
              brightness={52}
              opacity={0.95}
              blur={10}
              displace={0.5}
              backgroundOpacity={0.14}
              saturation={1.3}
              distortionScale={-120}
              redOffset={12}
              greenOffset={5}
              blueOffset={0}
              className="ac-glass-btn-surface"
            >
              <span className="ac-readmore-label">
                <ArrowLeft size={16} className="ac-readmore-arrow-left" aria-hidden="true" />
                <span>{isEs ? 'Volver a Marte I–III' : 'Back to Mars I–III'}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#fb7185" speed={1.2} chaos={0.35} borderRadius={12}>
            <div className="era-detail-period-pill" style={{ color: '#fda4af' }}>
              {isEs ? 'Compendio Final' : 'Final Compendium'} · {metadata.releaseDate}
            </div>
          </ElectricBorder>
        </div>

        {/* HERO CONTINUO TIERRA -> LUNA -> MARTE -> TANGO HORIZON */}
        <header
          style={{
            textAlign: 'center',
            maxWidth: '980px',
            margin: '0 auto 2.8rem auto',
          }}
        >
          <div className="compendio-hero-visual">
            <div className="compendio-globe-wrap">
              <EarthGlobe size={118} />
              <span className="compendio-orbit-tag" style={{ color: '#fdba74' }}>
                {isEs ? 'Origen · Tierra' : 'Origin · Earth'}
              </span>
            </div>

            <div className="compendio-trajectory-svg-wrap" aria-hidden="true">
              <svg viewBox="0 0 360 88" className="compendio-trajectory-svg">
                <defs>
                  <linearGradient id="compendioArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="36%" stopColor="#fdba74" />
                    <stop offset="72%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>
                <path
                  d="M 18 54 Q 105 12 180 42 T 342 46"
                  fill="none"
                  stroke="url(#compendioArcGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                />
                <circle cx="20" cy="54" r="5.5" fill="#fbbf24" />
                <circle cx="132" cy="27" r="5" fill="#fdba74" />
                <circle cx="242" cy="51" r="5.5" fill="#f97316" />
                <circle cx="340" cy="46" r="6" fill="#fb7185" />
                <text
                  x="20"
                  y="76"
                  textAnchor="middle"
                  fill="#f3dfd1"
                  fontSize="10"
                  fontFamily="var(--font-raleway), 'Raleway', sans-serif"
                >
                  {isEs ? 'Tierra' : 'Earth'}
                </text>
                <text
                  x="132"
                  y="14"
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="10"
                  fontFamily="var(--font-raleway), 'Raleway', sans-serif"
                >
                  {isEs ? 'Luna · 384k km' : 'Moon · 384k km'}
                </text>
                <text
                  x="242"
                  y="74"
                  textAnchor="middle"
                  fill="#fdba74"
                  fontSize="10"
                  fontFamily="var(--font-raleway), 'Raleway', sans-serif"
                >
                  {isEs ? 'Marte · 225M km' : 'Mars · 225M km'}
                </text>
                <text
                  x="336"
                  y="28"
                  textAnchor="middle"
                  fill="#fda4af"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="var(--font-raleway), 'Raleway', sans-serif"
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
          borderRadius={12}
          borderWidth={0.07}
          brightness={48}
          opacity={0.94}
          blur={14}
          displace={0.55}
          backgroundOpacity={0.12}
          saturation={1.25}
          distortionScale={-140}
          redOffset={14}
          greenOffset={6}
          blueOffset={0}
          style={{
            background: 'rgba(26, 12, 17, 0.78)',
            border: '1px solid rgba(255, 255, 255, 0.24)',
          }}
        >
          <article className="era-detail-article">
            {/* Executive Abstract */}
            <div
              className="thesis-abstract-box"
              style={{ borderColor: 'rgba(251, 113, 133, 0.42)' }}
            >
              <span className="thesis-abstract-label" style={{ color: '#fda4af' }}>
                {isEs ? 'Visión Integral de la Investigación' : 'Comprehensive Research Overview'}
              </span>
              <p className="thesis-abstract-text">{synthesisData.abstract}</p>
            </div>

            {/* Continuity Arc: Earth -> Moon -> Mars -> Tango Horizon 2026 */}
            <section
              style={{
                marginTop: '2.2rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
              }}
              aria-labelledby="continuity-arc-heading"
            >
              <span className="ac-timeline-badge">
                {isEs ? 'Trayectoria Continua' : 'Continuous Trajectory'}
              </span>
              <h2 id="continuity-arc-heading" className="synthesis-section-title">
                {isEs
                  ? 'De la Observación Terrestre a la Autonomía EVA en Marte'
                  : 'From Earth Observation to Autonomous Mars EVA'}
              </h2>

              <div className="compendio-arc-grid">
                {synthesisData.continuityArc.map((stage) => {
                  const accent = toSunsetAccent(stage.accent);
                  return (
                    <div
                      key={stage.id}
                      className="compendio-arc-card"
                      style={{ borderTop: `3px solid ${accent}` }}
                    >
                      <span className="compendio-arc-step" style={{ color: accent }}>
                        {stage.step}
                      </span>
                      <h3 className="compendio-arc-world">{stage.world}</h3>
                      <span className="compendio-arc-metric th-mono">{stage.metric}</span>
                      <p className="compendio-arc-summary">{stage.summary}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 5 Cross-Cutting Modules */}
            <section
              style={{
                marginTop: '3rem',
                paddingTop: '2.2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
              }}
              aria-labelledby="modules-compendium-heading"
            >
              <span className="ac-timeline-badge">
                {isEs ? 'Arquitectura Conceptual Unificada' : 'Unified Conceptual Architecture'}
              </span>
              <h2 id="modules-compendium-heading" className="synthesis-section-title">
                {isEs
                  ? 'Los 5 Módulos Fundamentales de la Exploración Lunar y Marciana'
                  : 'The 5 Core Modules of Lunar and Martian Exploration'}
              </h2>

              <div className="synthesis-modules-grid">
                {synthesisData.modulesCompendium.map((mod) => {
                  const accent = toSunsetAccent(mod.accent);
                  return (
                    <div
                      key={mod.code}
                      className="synthesis-module-card"
                      style={{ borderTop: `3px solid ${accent}` }}
                    >
                      <div className="synthesis-module-header">
                        <span className="synthesis-module-code" style={{ color: accent }}>
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

                      <div className="thesis-formula-bar" style={{ borderLeftColor: accent }}>
                        <code>{mod.formula}</code>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Moon vs Mars Comparison Matrix */}
            <section
              style={{
                marginTop: '3.2rem',
                paddingTop: '2.2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
              }}
              aria-labelledby="comparison-table-heading"
            >
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
                      <th style={{ color: '#fbbf24' }}>
                        {isEs ? 'Tesis I · La Luna' : 'Thesis I · The Moon'}
                      </th>
                      <th style={{ color: '#fb923c' }}>
                        {isEs ? 'Tesis II · Marte' : 'Thesis II · Mars'}
                      </th>
                      <th style={{ color: '#fda4af' }}>
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
            <section
              style={{
                marginTop: '3.4rem',
                paddingTop: '2.2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
              }}
              aria-labelledby="nasa-gallery-heading"
            >
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
                  borderRadius={12}
                />
              </div>
            </section>

            {/* Final Philosophical & Technical Reflection */}
            <section
              style={{
                marginTop: '3.2rem',
                paddingTop: '2.2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
              }}
              aria-labelledby="reflection-heading"
            >
              <span className="ac-timeline-badge">
                {isEs ? 'Síntesis Filosófica y Operativa' : 'Philosophical & Operational Synthesis'}
              </span>
              <h2 id="reflection-heading" className="synthesis-section-title">
                {isEs
                  ? 'Reflexión Final: El Horizonte Compartido de 2026'
                  : 'Final Reflection: The Shared Horizon of 2026'}
              </h2>

              <div className="compendio-reflections-grid">
                {synthesisData.reflectionBlocks.map((block) => {
                  const accent = toSunsetAccent(block.accent);
                  return (
                    <div
                      key={block.id}
                      className="compendio-reflection-card"
                      style={{ borderLeft: `3px solid ${accent}` }}
                    >
                      <span className="compendio-reflection-badge" style={{ color: accent }}>
                        {block.badge}
                      </span>
                      <h3 className="compendio-reflection-title">{block.title}</h3>
                      <div className="compendio-reflection-body">
                        {block.paragraphs.map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </article>
        </GlassSurface>

        {/* BOTTOM CTAs: 3D SIMULATOR + TEAM */}
        <section
          className="compendio-cta-banner"
          aria-label={isEs ? 'Acciones finales del compendio' : 'Final compendium actions'}
        >
          <ElectricBorder color="#f97316" speed={1.2} chaos={0.35} borderRadius={12}>
            <a
              href={metadata.simulatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ac-readmore-wrap"
              style={{ textDecoration: 'none' }}
            >
              <GlassSurface
                width="auto"
                height={44}
                borderRadius={12}
                borderWidth={0.12}
                brightness={54}
                opacity={0.96}
                blur={12}
                displace={0.5}
                backgroundOpacity={0.18}
                saturation={1.35}
                distortionScale={-120}
                redOffset={14}
                greenOffset={6}
                blueOffset={0}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.65rem' }}>
                  <Rocket size={17} style={{ color: '#fbbf24' }} aria-hidden="true" />
                  <span>{isEs ? 'Lanzar Simulador 3D ↗' : 'Launch 3D Simulator ↗'}</span>
                  <ExternalLink size={15} style={{ color: '#fdba74' }} aria-hidden="true" />
                </span>
              </GlassSurface>
            </a>
          </ElectricBorder>

          <Link href="/equipo" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <ElectricBorder color="#fb923c" speed={1.15} chaos={0.35} borderRadius={12}>
              <GlassSurface
                width="auto"
                height={44}
                borderRadius={12}
                borderWidth={0.12}
                brightness={52}
                opacity={0.95}
                blur={10}
                displace={0.5}
                backgroundOpacity={0.14}
                saturation={1.3}
                distortionScale={-120}
                redOffset={12}
                greenOffset={5}
                blueOffset={0}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.6rem' }}>
                  <Users size={17} style={{ color: '#fb923c' }} aria-hidden="true" />
                  <span>{isEs ? 'Explorar Equipo' : 'Explore Team'}</span>
                  <ArrowRight
                    size={16}
                    className="ac-readmore-arrow"
                    style={{ color: '#fbbf24' }}
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
              height={44}
              borderRadius={12}
              borderWidth={0.1}
              brightness={52}
              opacity={0.94}
              blur={10}
              displace={0.45}
              backgroundOpacity={0.12}
              saturation={1.25}
              distortionScale={-120}
              redOffset={12}
              greenOffset={5}
              blueOffset={0}
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
              height={44}
              borderRadius={12}
              borderWidth={0.1}
              brightness={52}
              opacity={0.94}
              blur={10}
              displace={0.45}
              backgroundOpacity={0.12}
              saturation={1.25}
              distortionScale={-120}
              redOffset={12}
              greenOffset={5}
              blueOffset={0}
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
        .th-compendio-page,
        .th-compendio-page * {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-compendio-page .th-mono,
        .th-compendio-page code {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .th-compendio-page .ac-timeline-badge {
          border-radius: 10px;
          background: rgba(249, 115, 22, 0.16);
          border: 1px solid rgba(251, 146, 60, 0.48);
          color: #fdba74;
        }
        .th-compendio-page .era-detail-period-pill {
          border-radius: 10px;
          background: #1c0e13;
          color: #fda4af;
        }
        .th-compendio-page .era-detail-main-title {
          color: #fff8f1;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 24px rgba(249, 115, 22, 0.28);
        }
        .th-compendio-page .era-detail-subtitle {
          color: #f3dfd1;
        }
        .th-compendio-page .synthesis-section-title {
          color: #fff8f1;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .th-compendio-page .era-section-body {
          color: #f3dfd1;
        }
        .th-compendio-page .thesis-abstract-box {
          border-radius: 10px;
          background: #1c0e13;
          border: 1px solid rgba(251, 113, 133, 0.42);
        }
        .th-compendio-page .thesis-abstract-text {
          color: #fff8f1;
        }
        .th-compendio-page .thesis-formula-bar {
          border-radius: 10px;
          background: #140a0e;
          color: #fbbf24;
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .th-compendio-page .synthesis-module-card {
          border-radius: 10px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .th-compendio-page .synthesis-module-sphere {
          border-radius: 10px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.34);
          color: #c4a99a;
        }
        .th-compendio-page .synthesis-module-title {
          color: #fff8f1;
        }
        .th-compendio-page .synthesis-concept-chip {
          border-radius: 10px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.36);
          color: #fdba74;
        }
        .th-compendio-page .synthesis-table-wrapper {
          border-radius: 10px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        .th-compendio-page .synthesis-comparison-table th {
          background: #140a0e;
          color: #fff8f1;
        }
        .th-compendio-page .synthesis-comparison-table th,
        .th-compendio-page .synthesis-comparison-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        }
        .th-compendio-page .synthesis-td-param {
          color: #fff8f1;
        }
        .th-compendio-page .synthesis-td-moon {
          color: #fbbf24;
        }
        .th-compendio-page .synthesis-td-mars {
          color: #fdba74;
        }
        .th-compendio-page .synthesis-td-imp {
          color: #f3dfd1;
        }
        .th-compendio-page .synthesis-carousel-section {
          border-radius: 10px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        .th-compendio-page .synthesis-filter-pill {
          border-radius: 10px;
          min-height: 40px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.36);
          color: #f3dfd1;
        }
        .th-compendio-page .synthesis-filter-pill:hover,
        .th-compendio-page .synthesis-filter-pill.is-active {
          background: rgba(249, 115, 22, 0.26);
          border-color: #f97316;
          color: #fff8f1;
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.35);
        }
        .th-compendio-page .ac-glass-btn-surface {
          border-radius: 10px;
          border: 1px solid rgba(251, 146, 60, 0.45);
          background: rgba(26, 12, 17, 0.84);
          box-shadow: 0 6px 18px rgba(10, 4, 6, 0.45);
        }
        .th-compendio-page .ac-readmore-wrap:hover {
          filter: drop-shadow(0 0 14px rgba(249, 115, 22, 0.38));
        }
        .th-compendio-page .ac-readmore-label {
          color: #fff8f1;
          font-weight: 700;
        }
        .th-compendio-page .ac-readmore-arrow,
        .th-compendio-page .ac-readmore-arrow-left {
          color: #fb923c;
        }
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
          border-radius: 10px;
          background: linear-gradient(145deg, rgba(249, 115, 22, 0.18), #1c0e13);
          border: 1px solid rgba(251, 146, 60, 0.48);
          box-shadow: 0 12px 32px rgba(10, 4, 6, 0.52), 0 0 24px rgba(251, 113, 133, 0.16);
        }
        .compendio-horizon-kicker {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #fbbf24;
        }
        .compendio-horizon-title {
          font-size: 1.22rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .compendio-horizon-sub {
          font-size: 0.8rem;
          color: #f3dfd1;
        }
        .compendio-arc-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.15rem;
        }
        .compendio-arc-card {
          padding: 1.35rem 1.4rem;
          border-radius: 10px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.2);
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
          color: #fff8f1;
        }
        .compendio-arc-metric {
          font-size: 0.76rem;
          color: #fdba74;
          opacity: 0.94;
        }
        .compendio-arc-summary {
          margin: 0.2rem 0 0 0;
          font-size: 0.94rem;
          line-height: 1.65;
          color: #c4a99a;
        }
        .compendio-reflections-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.5rem;
        }
        .compendio-reflection-card {
          padding: 1.75rem 1.9rem;
          border-radius: 10px;
          background: linear-gradient(145deg, #1c0e13, #140a0e);
          border: 1px solid rgba(255, 255, 255, 0.2);
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
          color: #fff8f1;
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
          color: #f3dfd1;
        }
        .compendio-cta-banner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          margin-top: 2.8rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.24);
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
