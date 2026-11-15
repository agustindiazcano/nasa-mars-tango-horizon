'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FileCode2,
  Home,
  LayoutGrid,
  Maximize2,
  Mic,
  Presentation,
  Rocket,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { pickLang, useLanguage } from '@/context/LanguageContext';
import { SIMULATOR_URL } from '@/data/projectOverview';
import {
  getSlidesDeck,
  SLIDES_SOURCE_URL,
  type ResolvedSlideDeckItem,
} from '@/data/slidesDeck';

type DeckViewMode = 'single' | 'grid';

interface ZoomedImage {
  src: string;
  alt: string;
  title: string;
  caption: string;
}

const DECK_UI_COPY = {
  homeNav: { en: 'Home', es: 'Inicio' },
  projectNav: { en: 'Tango Horizon Project', es: 'Tango Horizon Project' },
  teamNav: { en: 'Team', es: 'Team' },
  eyebrow: {
    en: 'NASA SPACE APPS CHALLENGE 2026 · 10-SLIDE PITCH DECK',
    es: 'NASA SPACE APPS CHALLENGE 2026 · PRESENTACIÓN DE 10 SLIDES',
  },
  pageTitle: {
    en: 'Tango Horizon — 10-Slide Engineering & Mission Deck',
    es: 'Tango Horizon — Presentación Técnica y de Misión (10 Slides)',
  },
  pageSubtitle: {
    en: 'Browse slide-by-slide with keyboard arrows (← / →) or switch to the full 10-slide overview grid. Includes live ML validation plots and 3-minute presenter cues.',
    es: 'Navega slide por slide con las flechas del teclado (← / →) o cambia a la vista general de las 10 slides. Incluye gráficos reales de validación ML y guion de 3 minutos.',
  },
  launchSim: {
    en: 'Launch Live 3D Simulator ↗',
    es: 'Launch Live 3D Simulator ↗',
  },
  sourceSlides: {
    en: 'Source SLIDES.md on GitHub ↗',
    es: 'Source SLIDES.md on GitHub ↗',
  },
  singleMode: { en: 'Single Slide', es: 'Slide Individual' },
  gridMode: { en: 'Overview Grid', es: 'Vista General' },
  prevBtn: { en: 'Previous', es: 'Anterior' },
  nextBtn: { en: 'Next', es: 'Siguiente' },
  keyHint: { en: 'Keyboard: ← / →', es: 'Teclado: ← / →' },
  focusSlide: { en: 'Open Slide', es: 'Ver Slide' },
  speakerCueLabel: { en: 'Speaker Script / Presenter Cue', es: 'Guion del Presentador / Pitch Cue' },
  showCue: { en: 'Show Cue', es: 'Ver Guion' },
  hideCue: { en: 'Hide Cue', es: 'Ocultar' },
  teamHeading: { en: 'Crew & Engineering Team', es: 'Tripulación y Equipo de Ingeniería' },
  liveLinksHeading: { en: 'Live Deployment & Source', es: 'Despliegue en Vivo y Código Fuente' },
  zoomHint: { en: 'Click chart to enlarge', es: 'Clic para ampliar gráfico' },
  closeModal: { en: 'Close chart preview', es: 'Cerrar vista ampliada' },
} as const;

export function SlidesDeckView() {
  const { lang } = useLanguage();
  const slides = useMemo(() => getSlidesDeck(lang), [lang]);

  const [viewMode, setViewMode] = useState<DeckViewMode>('single');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [openCues, setOpenCues] = useState<Record<number, boolean>>({ 1: true });
  const [zoomedImage, setZoomedImage] = useState<ZoomedImage | null>(null);

  const activeSlide = slides[currentIndex] ?? slides[0];
  const totalSlides = slides.length;

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(totalSlides - 1, prev + 1));
  }, [totalSlides]);

  const toggleCue = useCallback((slideNumber: number) => {
    setOpenCues((prev) => ({
      ...prev,
      [slideNumber]: !prev[slideNumber],
    }));
  }, []);

  const jumpToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setViewMode('single');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (zoomedImage) {
        if (event.key === 'Escape') {
          setZoomedImage(null);
        }
        return;
      }
      if (viewMode !== 'single') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, viewMode, zoomedImage]);

  const renderSlideCard = (slide: ResolvedSlideDeckItem, isOverview: boolean) => {
    const isCueOpen = Boolean(openCues[slide.number]);
    const isWideMlCharts = slide.visual.kind === 'ml-charts' && !isOverview;

    return (
      <article
        key={slide.number}
        id={`slide-${slide.code}`}
        className={`th-slide-card${isOverview ? ' th-slide-card--grid' : ''}`}
        aria-label={`${slide.eyebrow}: ${slide.title}`}
      >
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={isOverview ? 24 : 30}
          borderWidth={0.08}
          brightness={52}
          opacity={0.95}
          blur={14}
          displace={0.7}
          backgroundOpacity={0.12}
          saturation={1.35}
          distortionScale={-160}
        >
          <div className="th-slide-card__inner">
            {/* SLIDE HEADER */}
            <div className="th-slide-card__head">
              <div className="th-slide-card__badges">
                <span
                  className="th-slide-number-pill th-mono"
                  style={{
                    color: slide.accent,
                    borderColor: `${slide.accent}55`,
                    background: `${slide.accent}16`,
                  }}
                >
                  SLIDE {slide.code} / 10
                </span>
                <span className="th-slide-eyebrow">{slide.eyebrow}</span>
              </div>

              {isOverview && (
                <button
                  type="button"
                  className="th-slide-focus-btn"
                  onClick={() => jumpToSlide(slide.number - 1)}
                  style={{ borderColor: `${slide.accent}4d`, color: slide.accent }}
                >
                  <span>{pickLang(lang, DECK_UI_COPY.focusSlide)}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* TITLE & SUBTITLE */}
            <div className="th-slide-card__titles">
              <h2 className={isOverview ? 'th-slide-title th-slide-title--grid' : 'th-slide-title'}>
                {slide.title}
              </h2>
              <p className="th-slide-subtitle">{slide.subtitle}</p>
              {slide.tagline && (
                <blockquote
                  className="th-slide-tagline"
                  style={{ borderLeftColor: slide.accent }}
                >
                  &ldquo;{slide.tagline}&rdquo;
                </blockquote>
              )}
            </div>

            {/* METRIC BADGES */}
            <ul className="th-slide-metrics" aria-label="Slide metrics">
              {slide.metrics.map((metric) => {
                const badgeColor = metric.accent || slide.accent;
                return (
                  <li
                    key={`${slide.code}-${metric.label}`}
                    className="th-slide-metric-pill"
                    style={{ borderColor: `${badgeColor}42` }}
                  >
                    <span className="th-slide-metric-pill__label">{metric.label}</span>
                    <span
                      className="th-slide-metric-pill__val th-mono"
                      style={{ color: badgeColor }}
                    >
                      {metric.value}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* BODY: BULLETS + VISUAL */}
            <div
              className={`th-slide-body${
                isWideMlCharts || slide.twoColumn || isOverview ? ' th-slide-body--stacked' : ''
              }`}
            >
              {/* LEFT: TWO-COLUMN OR BULLETS */}
              <div className="th-slide-points-col">
                {slide.twoColumn ? (
                  <div className="th-slide-two-col">
                    <div
                      className="th-slide-col-box"
                      style={{ borderTop: '3px solid #7df9ff' }}
                    >
                      <h3 className="th-slide-col-title" style={{ color: '#7df9ff' }}>
                        {slide.twoColumn.leftTitle}
                      </h3>
                      <ul className="th-slide-bullets">
                        {slide.twoColumn.leftItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className="th-slide-col-box"
                      style={{ borderTop: '3px solid #34d399' }}
                    >
                      <h3 className="th-slide-col-title" style={{ color: '#34d399' }}>
                        {slide.twoColumn.rightTitle}
                      </h3>
                      <ul className="th-slide-bullets">
                        {slide.twoColumn.rightItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <ul className="th-slide-bullets">
                    {slide.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* RIGHT / GALLERY: VISUAL PANEL */}
              <div className="th-slide-visual-panel" style={{ borderColor: `${slide.accent}36` }}>
                <div className="th-slide-visual-head">
                  <span
                    className="th-slide-visual-badge th-mono"
                    style={{ color: slide.accent }}
                  >
                    {slide.visual.badge}
                  </span>
                  <h3 className="th-slide-visual-title">{slide.visual.headline}</h3>
                  <p className="th-slide-visual-summary">{slide.visual.summary}</p>
                </div>

                {/* HERO PATCH (Slide 1) */}
                {slide.visual.kind === 'hero-patch' && slide.visual.images?.[0] && (
                  <div className="th-slide-patch-showcase">
                    <div className="th-home__logo-wrap th-slide-patch-ring">
                      <img
                        src={slide.visual.images[0].src}
                        alt={slide.visual.images[0].alt}
                        className="th-home__logo-img"
                      />
                    </div>
                    <p className="th-slide-img-caption th-mono">
                      {slide.visual.images[0].caption}
                    </p>
                  </div>
                )}

                {/* MARS SURFACE TEXTURE (Slide 2) */}
                {slide.visual.kind === 'mars-globe' && slide.visual.images?.[0] && (
                  <div className="th-slide-mars-showcase">
                    <div className="th-slide-mars-disc">
                      <img
                        src={slide.visual.images[0].src}
                        alt={slide.visual.images[0].alt}
                        className="th-slide-mars-img"
                      />
                    </div>
                    <p className="th-slide-img-caption th-mono">
                      {slide.visual.images[0].caption}
                    </p>
                  </div>
                )}

                {/* 3 ML VALIDATION CHARTS (Slide 6) */}
                {slide.visual.kind === 'ml-charts' && slide.visual.images && (
                  <div
                    className={`th-slide-charts-grid${
                      isOverview ? ' th-slide-charts-grid--compact' : ''
                    }`}
                  >
                    {slide.visual.images.map((img) => (
                      <button
                        key={img.src}
                        type="button"
                        className="th-slide-chart-card"
                        onClick={() => setZoomedImage(img)}
                        title={pickLang(lang, DECK_UI_COPY.zoomHint)}
                      >
                        <div className="th-slide-chart-frame">
                          <img src={img.src} alt={img.alt} className="th-slide-chart-img" />
                          <span className="th-slide-chart-zoom" aria-hidden="true">
                            <Maximize2 size={14} />
                          </span>
                        </div>
                        <div className="th-slide-chart-meta">
                          <strong className="th-slide-chart-title">{img.title}</strong>
                          <span className="th-slide-chart-cap th-mono">{img.caption}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* SPECS LIST */}
                {slide.visual.specs && slide.visual.specs.length > 0 && (
                  <ul className="th-slide-specs-list">
                    {slide.visual.specs.map((spec) => (
                      <li key={spec} className="th-slide-spec-item th-mono">
                        <Sparkles size={13} style={{ color: slide.accent, flexShrink: 0 }} aria-hidden="true" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* SLIDE 10 LINKS & TEAM */}
                {slide.links && slide.links.length > 0 && (
                  <div className="th-slide-closing-block">
                    <span className="th-slide-subkicker th-mono">
                      {pickLang(lang, DECK_UI_COPY.liveLinksHeading)}
                    </span>
                    <div className="th-slide-closing-links">
                      {slide.links.map((linkItem) => (
                        <a
                          key={linkItem.url}
                          href={linkItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`th-slide-closing-link${
                            linkItem.primary ? ' th-slide-closing-link--primary' : ''
                          }`}
                        >
                          <div>
                            <div className="th-slide-closing-link__label">{linkItem.label}</div>
                            {linkItem.hint && (
                              <div className="th-slide-closing-link__hint th-mono">
                                {linkItem.hint}
                              </div>
                            )}
                          </div>
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {slide.teamMembers && slide.teamMembers.length > 0 && (
                  <div className="th-slide-closing-block">
                    <span className="th-slide-subkicker th-mono">
                      {pickLang(lang, DECK_UI_COPY.teamHeading)}
                    </span>
                    <div className="th-slide-team-chips">
                      {slide.teamMembers.map((member) => (
                        <span key={member} className="th-slide-team-chip">
                          <Users size={13} style={{ color: '#fde68a' }} aria-hidden="true" />
                          <span>{member}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLLAPSIBLE SPEAKER CUE BOX */}
            <div className="th-slide-cue-box">
              <button
                type="button"
                className="th-slide-cue-toggle"
                onClick={() => toggleCue(slide.number)}
                aria-expanded={isCueOpen}
                aria-controls={`speaker-cue-${slide.code}`}
              >
                <span className="th-slide-cue-toggle__left">
                  <Mic size={15} style={{ color: slide.accent }} aria-hidden="true" />
                  <span className="th-slide-cue-toggle__title">
                    {pickLang(lang, DECK_UI_COPY.speakerCueLabel)}
                  </span>
                  <span className="th-slide-cue-duration th-mono">
                    {slide.speakerCue.duration}
                  </span>
                </span>
                <span className="th-slide-cue-toggle__right">
                  <span>
                    {isCueOpen
                      ? pickLang(lang, DECK_UI_COPY.hideCue)
                      : pickLang(lang, DECK_UI_COPY.showCue)}
                  </span>
                  {isCueOpen ? (
                    <ChevronUp size={16} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={16} aria-hidden="true" />
                  )}
                </span>
              </button>

              {isCueOpen && (
                <div id={`speaker-cue-${slide.code}`} className="th-slide-cue-body">
                  <div className="th-slide-cue-scene th-mono">{slide.speakerCue.sceneRef}</div>
                  <p className="th-slide-cue-script">{slide.speakerCue.script}</p>
                </div>
              )}
            </div>
          </div>
        </GlassSurface>
      </article>
    );
  };

  return (
    <div className="era-detail-page">
      <div className="era-detail-container th-slides-container">
        {/* TOPBAR: ← Home, Tango Horizon Project, Team + Slide XX / 10 */}
        <div className="era-detail-topbar th-slides-topbar">
          <nav className="th-slides-nav-pills" aria-label="Deck page navigation">
            <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
              <GlassSurface
                width="auto"
                height={44}
                borderRadius={999}
                borderWidth={0.12}
                brightness={58}
                opacity={0.95}
                blur={10}
                displace={0.55}
                backgroundOpacity={0.12}
                saturation={1.4}
                distortionScale={-140}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.05rem', fontSize: '0.9rem' }}>
                  <ArrowLeft size={15} className="ac-readmore-arrow-left" aria-hidden="true" />
                  <Home size={14} style={{ color: '#7df9ff' }} aria-hidden="true" />
                  <span>{pickLang(lang, DECK_UI_COPY.homeNav)}</span>
                </span>
              </GlassSurface>
            </Link>

            <Link href="/proyecto" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
              <GlassSurface
                width="auto"
                height={44}
                borderRadius={999}
                borderWidth={0.1}
                brightness={56}
                opacity={0.94}
                blur={10}
                displace={0.5}
                backgroundOpacity={0.1}
                saturation={1.35}
                distortionScale={-130}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.05rem', fontSize: '0.9rem' }}>
                  <span>{pickLang(lang, DECK_UI_COPY.projectNav)}</span>
                </span>
              </GlassSurface>
            </Link>

            <Link href="/equipo" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
              <GlassSurface
                width="auto"
                height={44}
                borderRadius={999}
                borderWidth={0.1}
                brightness={56}
                opacity={0.94}
                blur={10}
                displace={0.5}
                backgroundOpacity={0.1}
                saturation={1.35}
                distortionScale={-130}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.05rem', fontSize: '0.9rem' }}>
                  <Users size={14} style={{ color: '#fde68a' }} aria-hidden="true" />
                  <span>{pickLang(lang, DECK_UI_COPY.teamNav)}</span>
                </span>
              </GlassSurface>
            </Link>
          </nav>

          <ElectricBorder color="#7df9ff" speed={1.15} chaos={0.45} borderRadius={16}>
            <div className="era-detail-period-pill th-mono" style={{ color: '#7df9ff' }}>
              Slide {activeSlide.code} / 10
            </div>
          </ElectricBorder>
        </div>

        {/* HERO HEADER & PRIMARY CTAS */}
        <header className="th-slides-header">
          <span className="th-eyebrow">{pickLang(lang, DECK_UI_COPY.eyebrow)}</span>
          <h1 className="th-slides-page-title">{pickLang(lang, DECK_UI_COPY.pageTitle)}</h1>
          <p className="th-slides-page-subtitle">{pickLang(lang, DECK_UI_COPY.pageSubtitle)}</p>

          <div className="th-slides-cta-row">
            <ElectricBorder color="#7df9ff" speed={1.15} chaos={0.4} borderRadius={999}>
              <a
                href={SIMULATOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ac-readmore-wrap"
                style={{ textDecoration: 'none' }}
              >
                <GlassSurface
                  width="auto"
                  height={50}
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
                  <span className="ac-readmore-label" style={{ padding: '0 1.4rem' }}>
                    <Rocket size={16} style={{ color: '#7df9ff' }} aria-hidden="true" />
                    <span>{pickLang(lang, DECK_UI_COPY.launchSim)}</span>
                    <ExternalLink size={14} style={{ color: '#7df9ff' }} aria-hidden="true" />
                  </span>
                </GlassSurface>
              </a>
            </ElectricBorder>

            <a
              href={SLIDES_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ac-readmore-wrap"
              style={{ textDecoration: 'none' }}
            >
              <GlassSurface
                width="auto"
                height={50}
                borderRadius={999}
                borderWidth={0.1}
                brightness={56}
                opacity={0.94}
                blur={10}
                displace={0.5}
                backgroundOpacity={0.12}
                saturation={1.35}
                distortionScale={-130}
                className="ac-glass-btn-surface"
              >
                <span className="ac-readmore-label" style={{ padding: '0 1.35rem' }}>
                  <FileCode2 size={16} style={{ color: '#fde68a' }} aria-hidden="true" />
                  <span>{pickLang(lang, DECK_UI_COPY.sourceSlides)}</span>
                  <ExternalLink size={14} style={{ color: '#fde68a' }} aria-hidden="true" />
                </span>
              </GlassSurface>
            </a>
          </div>
        </header>

        {/* CONTROLS BAR: VIEW TOGGLE + PREV/NEXT + KEYBOARD HINT + SLIDE STRIP */}
        <section className="th-slides-controls" aria-label="Slide deck controls">
          <div className="th-slides-controls__top">
            <div className="th-slides-view-toggle" role="group" aria-label="Deck view mode">
              <button
                type="button"
                className={`th-slides-mode-btn${viewMode === 'single' ? ' is-active' : ''}`}
                onClick={() => setViewMode('single')}
                aria-pressed={viewMode === 'single'}
              >
                <Presentation size={15} aria-hidden="true" />
                <span>{pickLang(lang, DECK_UI_COPY.singleMode)}</span>
              </button>
              <button
                type="button"
                className={`th-slides-mode-btn${viewMode === 'grid' ? ' is-active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid size={15} aria-hidden="true" />
                <span>{pickLang(lang, DECK_UI_COPY.gridMode)}</span>
              </button>
            </div>

            {viewMode === 'single' && (
              <div className="th-slides-stepper">
                <span className="th-slides-keyhint th-mono">
                  {pickLang(lang, DECK_UI_COPY.keyHint)}
                </span>
                <button
                  type="button"
                  className="th-slides-nav-btn"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  <span>{pickLang(lang, DECK_UI_COPY.prevBtn)}</span>
                </button>
                <span className="th-slides-counter th-mono">
                  {activeSlide.code} / 10
                </span>
                <button
                  type="button"
                  className="th-slides-nav-btn"
                  onClick={goNext}
                  disabled={currentIndex === totalSlides - 1}
                >
                  <span>{pickLang(lang, DECK_UI_COPY.nextBtn)}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {/* 01..10 QUICK JUMP PILL STRIP */}
          <div className="th-slides-strip" role="navigation" aria-label="Slide selector">
            {slides.map((slide, idx) => {
              const isActive = viewMode === 'single' && idx === currentIndex;
              return (
                <button
                  key={slide.code}
                  type="button"
                  className={`th-slides-strip-pill th-mono${isActive ? ' is-active' : ''}`}
                  style={
                    isActive
                      ? {
                          borderColor: slide.accent,
                          color: slide.accent,
                          background: `${slide.accent}1f`,
                        }
                      : undefined
                  }
                  onClick={() => {
                    if (viewMode === 'single') {
                      setCurrentIndex(idx);
                    } else {
                      setCurrentIndex(idx);
                      document
                        .getElementById(`slide-${slide.code}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  aria-current={isActive ? 'step' : undefined}
                  title={`${slide.code}: ${slide.title}`}
                >
                  {slide.code}
                </button>
              );
            })}
          </div>
        </section>

        {/* DECK STAGE: SINGLE SLIDE OR OVERVIEW GRID */}
        {viewMode === 'single' ? (
          <section className="th-slides-stage" aria-live="polite">
            <ElectricBorder color={activeSlide.accent} speed={1.05} chaos={0.35} borderRadius={30}>
              {renderSlideCard(activeSlide, false)}
            </ElectricBorder>

            {/* FOOTER PREV/NEXT STEPPER */}
            <div className="th-slides-bottom-nav">
              <button
                type="button"
                className="th-slides-nav-btn th-slides-nav-btn--lg"
                onClick={goPrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={17} aria-hidden="true" />
                <span>{pickLang(lang, DECK_UI_COPY.prevBtn)}</span>
              </button>

              <span className="th-slides-counter th-mono">
                Slide {activeSlide.code} / 10
              </span>

              <button
                type="button"
                className="th-slides-nav-btn th-slides-nav-btn--lg"
                onClick={goNext}
                disabled={currentIndex === totalSlides - 1}
              >
                <span>{pickLang(lang, DECK_UI_COPY.nextBtn)}</span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : (
          <section className="th-slides-grid" aria-label="All 10 presentation slides">
            {slides.map((slide) => renderSlideCard(slide, true))}
          </section>
        )}
      </div>

      {/* LIGHTBOX FOR ML VALIDATION CHARTS */}
      {zoomedImage && (
        <div
          className="th-slides-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={zoomedImage.title}
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="th-slides-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="th-slides-modal__head">
              <div>
                <h3 className="th-slides-modal__title">{zoomedImage.title}</h3>
                <p className="th-slides-modal__cap th-mono">{zoomedImage.caption}</p>
              </div>
              <button
                type="button"
                className="th-slides-modal__close"
                onClick={() => setZoomedImage(null)}
                aria-label={pickLang(lang, DECK_UI_COPY.closeModal)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="th-slides-modal__img"
            />
          </div>
        </div>
      )}

      <style>{`
        .th-slides-container {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          max-width: 1220px;
        }
        .th-slides-topbar {
          margin-bottom: 0;
        }
        .th-slides-nav-pills {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.6rem;
        }
        .th-slides-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .th-slides-page-title {
          margin: 0;
          max-width: 920px;
          font-size: clamp(1.85rem, 3.6vw, 2.9rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: #ffffff;
          text-shadow: 0 0 26px rgba(56, 189, 248, 0.3);
        }
        .th-slides-page-subtitle {
          margin: 0;
          max-width: 820px;
          font-size: clamp(0.98rem, 1.3vw, 1.12rem);
          line-height: 1.65;
          color: #cbd5e1;
        }
        .th-slides-cta-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.9rem;
          margin-top: 0.35rem;
        }
        .th-slides-controls {
          padding: 1rem 1.2rem;
          border-radius: 20px;
          background: rgba(9, 13, 22, 0.72);
          border: 1px solid rgba(125, 249, 255, 0.22);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .th-slides-controls__top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
        }
        .th-slides-view-toggle {
          display: inline-flex;
          padding: 0.25rem;
          border-radius: 999px;
          background: rgba(5, 5, 8, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.24);
          gap: 0.25rem;
        }
        .th-slides-mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.95rem;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .th-slides-mode-btn.is-active {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(125, 249, 255, 0.18));
          color: #f8fafc;
          box-shadow: inset 0 0 0 1px rgba(125, 249, 255, 0.45);
        }
        .th-slides-stepper {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.55rem;
        }
        .th-slides-keyhint {
          font-size: 0.75rem;
          color: #94a3b8;
          padding-right: 0.35rem;
        }
        .th-slides-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          padding: 0.48rem 0.95rem;
          border-radius: 999px;
          border: 1px solid rgba(125, 249, 255, 0.32);
          background: rgba(15, 23, 42, 0.82);
          color: #f8fafc;
          font-family: inherit;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        .th-slides-nav-btn--lg {
          padding: 0.62rem 1.25rem;
          font-size: 0.92rem;
        }
        .th-slides-nav-btn:hover:not(:disabled) {
          border-color: #7df9ff;
          background: rgba(30, 41, 59, 0.95);
          transform: translateY(-1px);
        }
        .th-slides-nav-btn:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }
        .th-slides-counter {
          font-size: 0.85rem;
          font-weight: 700;
          color: #bae6fd;
          padding: 0 0.45rem;
        }
        .th-slides-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.42rem;
        }
        .th-slides-strip-pill {
          min-width: 2.5rem;
          height: 2rem;
          padding: 0 0.65rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(7, 11, 20, 0.78);
          color: #94a3b8;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease, transform 0.18s ease;
        }
        .th-slides-strip-pill:hover {
          color: #f8fafc;
          border-color: rgba(125, 249, 255, 0.55);
          transform: translateY(-1px);
        }
        .th-slides-stage {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .th-slides-stage > .electric-border {
          display: block;
          width: 100%;
        }
        .th-slides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
          gap: 1.5rem;
        }
        .th-slide-card {
          width: 100%;
        }
        .th-slide-card__inner {
          width: 100%;
          padding: 2rem 2.1rem;
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .th-slide-card--grid .th-slide-card__inner {
          padding: 1.55rem 1.6rem;
          gap: 1.05rem;
        }
        .th-slide-card__head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .th-slide-card__badges {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.65rem;
        }
        .th-slide-number-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.28rem 0.75rem;
          border-radius: 999px;
          border: 1px solid;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .th-slide-eyebrow {
          font-size: 0.85rem;
          font-weight: 700;
          color: #cbd5e1;
        }
        .th-slide-focus-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.78rem;
          border-radius: 999px;
          border: 1px solid;
          background: rgba(5, 5, 8, 0.7);
          font-family: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .th-slide-focus-btn:hover {
          background: rgba(15, 23, 42, 0.92);
        }
        .th-slide-card__titles {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .th-slide-title {
          margin: 0;
          font-size: clamp(1.45rem, 2.5vw, 2.05rem);
          font-weight: 800;
          line-height: 1.22;
          color: #ffffff;
        }
        .th-slide-title--grid {
          font-size: clamp(1.22rem, 1.8vw, 1.48rem);
        }
        .th-slide-subtitle {
          margin: 0;
          font-size: 1rem;
          line-height: 1.6;
          color: #bae6fd;
        }
        .th-slide-tagline {
          margin: 0.25rem 0 0 0;
          padding: 0.55rem 0.95rem;
          border-left: 3px solid;
          background: rgba(15, 23, 42, 0.55);
          border-radius: 0 12px 12px 0;
          font-size: 0.96rem;
          font-style: italic;
          color: #f8fafc;
        }
        .th-slide-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 0.7rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .th-slide-metric-pill {
          padding: 0.65rem 0.85rem;
          border-radius: 14px;
          background: rgba(7, 11, 20, 0.78);
          border: 1px solid;
          display: flex;
          flex-direction: column;
          gap: 0.18rem;
        }
        .th-slide-metric-pill__label {
          font-size: 0.74rem;
          color: #94a3b8;
        }
        .th-slide-metric-pill__val {
          font-size: 0.92rem;
          font-weight: 800;
        }
        .th-slide-body {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
          gap: 1.35rem;
          align-items: start;
        }
        .th-slide-body--stacked {
          grid-template-columns: 1fr;
        }
        .th-slide-bullets {
          margin: 0;
          padding-left: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          color: #e2e8f0;
          font-size: 0.96rem;
          line-height: 1.62;
        }
        .th-slide-two-col {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
        }
        .th-slide-col-box {
          padding: 1.05rem 1.15rem;
          border-radius: 16px;
          background: rgba(7, 11, 20, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.22);
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .th-slide-col-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
        }
        .th-slide-visual-panel {
          padding: 1.15rem 1.2rem;
          border-radius: 20px;
          background: rgba(5, 8, 18, 0.78);
          border: 1px solid;
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
        }
        .th-slide-visual-head {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .th-slide-visual-badge {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .th-slide-visual-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .th-slide-visual-summary {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.55;
          color: #cbd5e1;
        }
        .th-slide-patch-showcase,
        .th-slide-mars-showcase {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0;
        }
        .th-slide-patch-ring {
          width: 164px;
          height: 164px;
        }
        .th-slide-mars-disc {
          width: 150px;
          height: 150px;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(251, 146, 60, 0.48);
          box-shadow: 0 0 34px rgba(251, 146, 60, 0.28);
        }
        .th-slide-mars-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .th-slide-img-caption {
          margin: 0;
          font-size: 0.74rem;
          color: #fed7aa;
          text-align: center;
        }
        .th-slide-charts-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
        }
        .th-slide-charts-grid--compact {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .th-slide-chart-card {
          padding: 0.65rem;
          border-radius: 14px;
          border: 1px solid rgba(125, 249, 255, 0.24);
          background: rgba(9, 13, 24, 0.86);
          color: inherit;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .th-slide-chart-card:hover {
          border-color: #7df9ff;
          transform: translateY(-2px);
        }
        .th-slide-chart-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          border-radius: 10px;
          overflow: hidden;
          background: #0b1120;
        }
        .th-slide-chart-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .th-slide-chart-zoom {
          position: absolute;
          right: 0.4rem;
          bottom: 0.4rem;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: rgba(5, 5, 8, 0.76);
          border: 1px solid rgba(125, 249, 255, 0.4);
          color: #7df9ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .th-slide-chart-meta {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .th-slide-chart-title {
          font-size: 0.84rem;
          color: #f8fafc;
        }
        .th-slide-chart-cap {
          font-size: 0.72rem;
          line-height: 1.4;
          color: #94a3b8;
        }
        .th-slide-specs-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
        }
        .th-slide-spec-item {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          font-size: 0.78rem;
          line-height: 1.45;
          color: #cbd5e1;
          padding: 0.42rem 0.6rem;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .th-slide-closing-block {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .th-slide-subkicker {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7df9ff;
        }
        .th-slide-closing-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .th-slide-closing-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.25);
          text-decoration: none;
          color: #f8fafc;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .th-slide-closing-link--primary {
          border-color: rgba(125, 249, 255, 0.52);
          background: rgba(14, 116, 144, 0.22);
        }
        .th-slide-closing-link:hover {
          border-color: #7df9ff;
          transform: translateY(-1px);
        }
        .th-slide-closing-link__label {
          font-size: 0.88rem;
          font-weight: 700;
        }
        .th-slide-closing-link__hint {
          font-size: 0.72rem;
          color: #94a3b8;
        }
        .th-slide-team-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .th-slide-team-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.38rem;
          padding: 0.34rem 0.72rem;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(253, 230, 138, 0.34);
          font-size: 0.8rem;
          font-weight: 600;
          color: #f8fafc;
        }
        .th-slide-cue-box {
          border-radius: 16px;
          background: rgba(5, 8, 18, 0.74);
          border: 1px solid rgba(148, 163, 184, 0.24);
          overflow: hidden;
        }
        .th-slide-cue-toggle {
          width: 100%;
          padding: 0.72rem 1rem;
          border: none;
          background: transparent;
          color: #f8fafc;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
        }
        .th-slide-cue-toggle:hover {
          background: rgba(15, 23, 42, 0.55);
        }
        .th-slide-cue-toggle__left {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }
        .th-slide-cue-toggle__title {
          font-size: 0.86rem;
          font-weight: 700;
        }
        .th-slide-cue-duration {
          font-size: 0.74rem;
          padding: 0.16rem 0.55rem;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.14);
          border: 1px solid rgba(125, 249, 255, 0.28);
          color: #7df9ff;
        }
        .th-slide-cue-toggle__right {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
        }
        .th-slide-cue-body {
          padding: 0 1rem 0.95rem 1rem;
          border-top: 1px solid rgba(148, 163, 184, 0.15);
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
        }
        .th-slide-cue-scene {
          margin-top: 0.65rem;
          font-size: 0.75rem;
          color: #fde68a;
        }
        .th-slide-cue-script {
          margin: 0;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #e2e8f0;
        }
        .th-slides-bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .th-slides-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 120;
          background: rgba(3, 6, 14, 0.86);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }
        .th-slides-modal {
          width: 100%;
          max-width: 1020px;
          max-height: 90vh;
          overflow: auto;
          padding: 1.25rem;
          border-radius: 22px;
          background: #080d1a;
          border: 1px solid rgba(125, 249, 255, 0.42);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.72);
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .th-slides-modal__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .th-slides-modal__title {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .th-slides-modal__cap {
          margin: 0.25rem 0 0 0;
          font-size: 0.8rem;
          color: #7df9ff;
        }
        .th-slides-modal__close {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.88);
          color: #f8fafc;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .th-slides-modal__img {
          width: 100%;
          height: auto;
          border-radius: 14px;
          background: #0b1120;
          display: block;
        }
        @media (max-width: 900px) {
          .th-slide-body {
            grid-template-columns: 1fr;
          }
          .th-slide-charts-grid {
            grid-template-columns: 1fr;
          }
          .th-slides-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .th-slide-card__inner {
            padding: 1.35rem 1.1rem;
          }
          .th-slides-keyhint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default SlidesDeckView;
