'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { PhotorealisticMoonBanner, PhotorealisticMarsBanner } from '@/components/ui/PlanetBanners';
import { getMoonThesisData, getMarsThesisData } from '@/data/thesesAndMars';
import { ThesisVisual } from '@/components/visuals/ThesisAndMarsVisuals';
import { useLanguage } from '@/context/LanguageContext';

export function ThesisReader({ variant }: { variant: 'moon' | 'mars' }) {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const isMoon = variant === 'moon';
  const thesis = isMoon ? getMoonThesisData(lang) : getMarsThesisData(lang);
  const accent = isMoon ? '#fde68a' : '#fb923c';
  const accentBorder = isMoon ? 'rgba(253, 230, 138, 0.36)' : 'rgba(251, 146, 60, 0.36)';
  const accentBg = isMoon ? 'rgba(253, 230, 138, 0.12)' : 'rgba(251, 146, 60, 0.12)';
  const pillLabel = isMoon
    ? isEs
      ? 'Tesis Universitaria · Selenología'
      : 'University Thesis · Selenology'
    : isEs
      ? 'Tesis Universitaria · Areología y Marte'
      : 'University Thesis · Areology & Mars';

  const [activeChapterId, setActiveChapterId] = useState<string>(
    thesis.chapters[0]?.id ?? ''
  );

  const handleJumpToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    const target = document.getElementById(chapterId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="era-detail-page" aria-labelledby="thesis-main-title">
      <div className="era-detail-container">
        {/* Topbar */}
        <div className="era-detail-topbar">
          <Link href="/cronologia" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
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
                {isEs ? 'Volver a Cronología' : 'Back to Timeline'}
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder
            color={accent}
            speed={1.15}
            chaos={0.5}
            borderRadius={16}
          >
            <div className="era-detail-period-pill" style={{ color: accent }}>
              {pillLabel}
            </div>
          </ElectricBorder>
        </div>

        {/* Hero con globo planetario fotorrealista */}
        <header
          className="era-detail-header"
          style={{ textAlign: 'center', maxWidth: '940px', margin: '0 auto 2.6rem auto' }}
        >
          {isMoon ? <PhotorealisticMoonBanner /> : <PhotorealisticMarsBanner />}
          <span
            className="ac-timeline-badge"
            style={{
              marginTop: '1.6rem',
              color: accent,
              borderColor: accentBorder,
              background: accentBg,
            }}
          >
            {thesis.kicker}
          </span>
          <h1
            id="thesis-main-title"
            className="era-detail-main-title"
            style={{ fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)' }}
          >
            {thesis.title}
          </h1>
          <p
            className="era-detail-subtitle"
            style={!isMoon ? { color: '#fed7aa' } : undefined}
          >
            {thesis.subtitle}
          </p>
        </header>

        {/* Índice de lectura rápida (jump buttons) */}
        <nav
          aria-label={isEs ? 'Índice de capítulos de la tesis' : 'Thesis chapter index'}
          className="th-chapter-jump-nav"
        >
          {thesis.chapters.map((chap, idx) => {
            const isActive = activeChapterId === chap.id;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => handleJumpToChapter(chap.id)}
                className={`th-chapter-jump-btn ${isActive ? 'is-active' : ''}`}
                style={{
                  borderColor: isActive ? accent : 'rgba(148, 163, 184, 0.25)',
                  background: isActive ? accentBg : 'rgba(9, 13, 22, 0.72)',
                  color: isActive ? accent : '#e2e8f0',
                }}
              >
                <span className="th-chapter-jump-num">0{idx + 1}</span>
                <span className="th-chapter-jump-label">{chap.num}</span>
              </button>
            );
          })}
        </nav>

        {/* Cuerpo Principal de la Tesis */}
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
            {/* Resumen Ejecutivo */}
            <div className="thesis-abstract-box" style={{ borderColor: accentBorder }}>
              <span className="thesis-abstract-label" style={{ color: accent }}>
                {isEs ? 'Resumen Ejecutivo (Abstract)' : 'Executive Summary (Abstract)'}
              </span>
              <p className="thesis-abstract-text">{thesis.abstract}</p>
            </div>

            {/* Métricas Científicas */}
            <div className="era-metrics-grid">
              {thesis.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="era-metric-box"
                  style={{ borderColor: accentBorder }}
                >
                  <span className="era-metric-value" style={{ color: accent }}>
                    {metric.value}
                  </span>
                  <span className="era-metric-label">{metric.label}</span>
                </div>
              ))}
            </div>

            {/* 4 Capítulos Profundos con ElectricBorder + GlassSurface + ThesisVisual */}
            <div className="era-sections-list" style={{ gap: '2.6rem', marginTop: '2.5rem' }}>
              {thesis.chapters.map((chap, idx) => (
                <div
                  key={chap.id}
                  id={chap.id}
                  style={{ scrollMarginTop: '6.5rem' }}
                >
                  <ElectricBorder
                    color={idx % 2 === 0 ? accent : '#7df9ff'}
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
                        className={`era-ancient-row th-chapter-card ${idx % 2 === 1 ? 'is-reversed' : ''}`}
                      >
                        <section
                          className="era-section-block"
                          style={{ borderLeftColor: accentBorder }}
                        >
                          <span
                            className="thesis-chapter-pill"
                            style={{
                              color: accent,
                              borderColor: accentBorder,
                              background: accentBg,
                            }}
                          >
                            {chap.num}
                          </span>
                          <h2 className="era-section-heading" style={{ marginTop: '0.6rem' }}>
                            {chap.title}
                          </h2>
                          {chap.paragraphs.map((pText, pIdx) => (
                            <p
                              key={pIdx}
                              className="era-section-body"
                              style={{
                                marginBottom: pIdx < chap.paragraphs.length - 1 ? '1.1rem' : '0',
                              }}
                            >
                              {pText}
                            </p>
                          ))}
                          {chap.formula && (
                            <div
                              className="thesis-formula-bar"
                              style={{
                                borderLeftColor: accent,
                                color: isMoon ? '#fde68a' : '#fed7aa',
                              }}
                            >
                              <code>{chap.formula}</code>
                            </div>
                          )}
                        </section>

                        <div className="era-ancient-visual-col">
                          <ThesisVisual type={chap.visualKey} />
                        </div>
                      </div>
                    </GlassSurface>
                  </ElectricBorder>
                </div>
              ))}
            </div>

            {/* Conclusión General */}
            <div className="thesis-conclusion-box" style={{ borderColor: accentBorder }}>
              <h3 className="thesis-conclusion-title" style={{ color: accent }}>
                {isEs ? 'Conclusión General' : 'General Conclusion'}
              </h3>
              <p className="era-section-body">{thesis.conclusion}</p>
            </div>
          </article>
        </GlassSurface>

        {/* Navegación inferior */}
        <nav className="era-detail-pagination" style={{ marginTop: '2.6rem' }}>
          <Link
            href={isMoon ? '/cronologia' : '/tesis-lunar'}
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
              displace={0.6}
              backgroundOpacity={0.12}
              saturation={1.35}
              distortionScale={-140}
              className="ac-glass-btn-surface"
            >
              <span className="ac-readmore-label" style={{ padding: '0 1.65rem' }}>
                <span className="ac-readmore-arrow-left">←</span>
                {isMoon
                  ? isEs
                    ? 'Volver a Cronología'
                    : 'Back to Timeline'
                  : isEs
                    ? 'Anterior · Tesis Lunar'
                    : 'Previous · Lunar Thesis'}
              </span>
            </GlassSurface>
          </Link>

          <Link
            href={isMoon ? '/tesis-marte' : '/marte'}
            className="ac-readmore-wrap"
            style={{ textDecoration: 'none' }}
          >
            <ElectricBorder
              color="#fb923c"
              speed={1.25}
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
                displace={0.6}
                backgroundOpacity={0.16}
                saturation={1.4}
                distortionScale={-140}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.75rem' }}>
                  {isMoon
                    ? isEs
                      ? 'Siguiente · Tesis sobre Marte'
                      : 'Continue to Mars Thesis'
                    : isEs
                      ? 'Siguiente · Exploración Marte I–III'
                      : 'Next · Mars Exploration I–III'}
                  <span className="ac-readmore-arrow" style={{ color: '#fb923c' }}>
                    →
                  </span>
                </span>
              </GlassSurface>
            </ElectricBorder>
          </Link>
        </nav>
      </div>

      <style>{`
        .th-chapter-jump-nav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem;
          margin: 0 auto 2rem auto;
        }
        .th-chapter-jump-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.15rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .th-chapter-jump-btn:hover {
          transform: translateY(-2px);
        }
        .th-chapter-jump-num {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.78rem;
          opacity: 0.85;
        }
        .th-chapter-card {
          padding: 2rem 2.1rem;
        }
        @media (max-width: 900px) {
          .th-chapter-card {
            grid-template-columns: 1fr !important;
            padding: 1.4rem 1.2rem;
          }
          .th-chapter-card.is-reversed .era-section-block,
          .th-chapter-card.is-reversed .era-ancient-visual-col {
            order: initial !important;
          }
        }
      `}</style>
    </section>
  );
}
