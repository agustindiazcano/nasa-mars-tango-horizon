'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Box,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  Rocket,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { useLanguage, pickLang, type BiText, type SiteLang } from '@/context/LanguageContext';
import {
  CC_BY_4_URL,
  CUSTOM_3D_MODELS_LIST,
  DETERMINISTIC_PHYSICS_DOMAINS,
  NASA_3D_MODELS_LIST,
  NASA_3D_RESOURCES_URL,
  PROVENANCE_SUMMARY_STATS,
  SIMULATOR_URL,
  SOURCE_CATEGORY_FILTERS,
  SOURCE_ENTRIES,
  getSourcesPageCopy,
  type SourceCategoryId,
  type SourceEntry,
} from '@/data/sourcesData';

function getCategoryIcon(category: SourceEntry['category']) {
  switch (category) {
    case 'cartography':
      return Globe;
    case 'atmosphere':
      return Cpu;
    case 'ml-spectra':
      return Database;
    case 'biomed-rag':
      return ShieldCheck;
    case 'models-3d':
      return Box;
    case 'partners':
      return Rocket;
  }
}

function t(text: BiText, lang: SiteLang): string {
  return pickLang(lang, text);
}

export function SourcesLandingView() {
  const { lang } = useLanguage();
  const copy = useMemo(() => getSourcesPageCopy(), []);

  const [activeCategory, setActiveCategory] = useState<SourceCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryCounts = useMemo(() => {
    const counts: Record<SourceCategoryId, number> = {
      all: SOURCE_ENTRIES.length,
      cartography: 0,
      atmosphere: 0,
      'ml-spectra': 0,
      'biomed-rag': 0,
      'models-3d': 0,
      partners: 0,
    };
    for (const entry of SOURCE_ENTRIES) {
      counts[entry.category] += 1;
    }
    return counts;
  }, []);

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SOURCE_ENTRIES.filter((entry) => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        entry.title.en,
        entry.title.es,
        entry.provider,
        entry.productId,
        entry.description.en,
        entry.description.es,
        entry.operationalRole.en,
        entry.operationalRole.es,
        entry.primaryUrl,
        ...entry.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activeCategory, searchQuery]);

  return (
    <div
      className="era-detail-page"
      style={{ fontFamily: "var(--font-raleway), 'Raleway', sans-serif" }}
    >
      <div className="era-detail-container th-sources-container">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link
            href="/"
            className="ac-readmore-wrap"
            style={{ textDecoration: 'none', borderRadius: '10px' }}
          >
            <GlassSurface
              width="auto"
              height={40}
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
              <span className="ac-readmore-label">
                <ArrowLeft size={16} className="ac-readmore-arrow-left" aria-hidden="true" />
                <span>{t(copy.backHome, lang)}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#fb923c" speed={1.15} chaos={0.45} borderRadius={12}>
            <div
              className="era-detail-period-pill"
              style={{
                color: '#fbbf24',
                borderRadius: '10px',
                fontFamily: "var(--font-raleway), 'Raleway', sans-serif",
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              NASA Space Apps Challenge 2026 · 2026-11-15
            </div>
          </ElectricBorder>
        </div>

        {/* 1. HERO HEADER */}
        <section className="th-sources-section" aria-labelledby="sources-hero-title">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={4}
            borderWidth={0.08}
            brightness={52}
            opacity={0.95}
            blur={14}
            displace={0.8}
            backgroundOpacity={0.12}
            saturation={1.35}
            distortionScale={-165}
          >
            <div className="th-sources-hero-inner">
              <span className="th-eyebrow">{t(copy.eyebrow, lang)}</span>
              <h1 id="sources-hero-title" className="th-sources-hero-title">
                {t(copy.title, lang)}
              </h1>
              <p className="th-sources-hero-sub">{t(copy.subtitle, lang)}</p>

              <div className="th-sources-stats-grid">
                {PROVENANCE_SUMMARY_STATS.map((stat) => (
                  <div
                    key={stat.id}
                    className="th-sources-stat-card"
                    style={{ borderColor: `${stat.accent}44` }}
                  >
                    <span
                      className="th-sources-stat-value th-mono"
                      style={{
                        color: stat.accent,
                        fontFamily: "var(--font-raleway), 'Raleway', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stat.value}
                    </span>
                    <span className="th-sources-stat-label">{t(stat.label, lang)}</span>
                  </div>
                ))}
              </div>

              <div className="th-sources-hero-actions">
                <ElectricBorder color="#f97316" speed={1.2} chaos={0.45} borderRadius={12}>
                  <a
                    href={SIMULATOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-readmore-wrap"
                    style={{ textDecoration: 'none', borderRadius: '10px' }}
                  >
                    <GlassSurface
                      width="auto"
                      height={42}
                      borderRadius={12}
                      borderWidth={0.12}
                      brightness={60}
                      opacity={0.96}
                      blur={12}
                      displace={0.6}
                      backgroundOpacity={0.16}
                      saturation={1.4}
                      distortionScale={-140}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.45rem' }}>
                        <Rocket size={17} style={{ color: '#fbbf24' }} aria-hidden="true" />
                        <span>{t(copy.openSimulator, lang)}</span>
                        <ExternalLink size={14} style={{ color: '#fbbf24' }} aria-hidden="true" />
                      </span>
                    </GlassSurface>
                  </a>
                </ElectricBorder>

                <Link
                  href="/proyecto"
                  className="ac-readmore-wrap"
                  style={{ textDecoration: 'none', borderRadius: '10px' }}
                >
                  <GlassSurface
                    width="auto"
                    height={42}
                    borderRadius={12}
                    borderWidth={0.1}
                    brightness={55}
                    opacity={0.94}
                    blur={10}
                    displace={0.5}
                    backgroundOpacity={0.1}
                    saturation={1.35}
                    distortionScale={-130}
                    className="ac-glass-btn-surface"
                  >
                    <span className="ac-readmore-label" style={{ padding: '0 1.35rem' }}>
                      <Cpu size={16} style={{ color: '#fb7185' }} aria-hidden="true" />
                      <span>{t(copy.projectOverview, lang)}</span>
                    </span>
                  </GlassSurface>
                </Link>
              </div>
            </div>
          </GlassSurface>
        </section>

        {/* 2. VERIFIED VS SIMULATION NOTE */}
        <section className="th-sources-section" aria-labelledby="verified-vs-sim-title">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={4}
            borderWidth={0.07}
            brightness={50}
            opacity={0.94}
            blur={12}
            displace={0.7}
            backgroundOpacity={0.1}
            saturation={1.3}
            distortionScale={-150}
          >
            <div className="th-sources-rigor-box">
              <div className="th-sources-rigor-head">
                <ShieldCheck size={22} style={{ color: '#fbbf24', flexShrink: 0 }} aria-hidden="true" />
                <h2 id="verified-vs-sim-title" className="th-sources-rigor-title">
                  {t(copy.verifiedVsSimTitle, lang)}
                </h2>
              </div>

              <div className="th-sources-rigor-grid">
                <div className="th-sources-rigor-col" style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}>
                  <h3 style={{ color: '#fbbf24' }}>{t(copy.verifiedVsSimEmpiricalTitle, lang)}</h3>
                  <p>{t(copy.verifiedVsSimEmpiricalBody, lang)}</p>
                </div>
                <div className="th-sources-rigor-col" style={{ borderColor: 'rgba(251, 146, 60, 0.35)' }}>
                  <h3 style={{ color: '#fb923c' }}>{t(copy.verifiedVsSimSimTitle, lang)}</h3>
                  <p>{t(copy.verifiedVsSimSimBody, lang)}</p>
                </div>
              </div>
            </div>
          </GlassSurface>
        </section>

        {/* 3. 3D MODELS CC BY 4.0 FREE-TO-USE LICENSE HIGHLIGHT BOX */}
        <section className="th-sources-section" aria-labelledby="cc-by-4-heading">
          <ElectricBorder color="#fdba74" speed={1.0} chaos={0.35} borderRadius={4}>
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={4}
              borderWidth={0.08}
              brightness={54}
              opacity={0.95}
              blur={13}
              displace={0.75}
              backgroundOpacity={0.12}
              saturation={1.35}
              distortionScale={-155}
            >
              <div className="th-sources-license-box">
                <div className="th-sources-license-top">
                  <div className="th-sources-license-title-wrap">
                    <span className="ac-timeline-badge" style={{ borderColor: '#fdba7466', color: '#fdba74' }}>
                      {t(copy.licenseBoxBadge, lang)}
                    </span>
                    <h2 id="cc-by-4-heading" className="th-sources-license-title">
                      <Box size={22} style={{ color: '#fdba74', flexShrink: 0 }} aria-hidden="true" />
                      <span>{t(copy.licenseBoxTitle, lang)}</span>
                    </h2>
                  </div>

                  <div className="th-sources-license-actions">
                    <a
                      href={CC_BY_4_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="th-sources-link-btn th-sources-link-btn--gold"
                      style={{ borderRadius: '10px' }}
                    >
                      <span>{t(copy.licenseCta, lang)}</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                    <a
                      href={NASA_3D_RESOURCES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="th-sources-link-btn"
                      style={{ borderRadius: '10px' }}
                    >
                      <span>{t(copy.nasa3dCta, lang)}</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <p className="th-sources-license-body">{t(copy.licenseBoxBody, lang)}</p>

                <div className="th-sources-glb-grid">
                  <div>
                    <span className="th-sources-glb-group-label th-mono">
                      TEAM TANGO HORIZON GLBs · CC BY 4.0 (FREE USE)
                    </span>
                    <div className="th-sources-glb-chips">
                      {CUSTOM_3D_MODELS_LIST.map((file) => (
                        <a
                          key={file}
                          href={CC_BY_4_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="th-sources-glb-chip th-mono"
                          title={`CC BY 4.0: ${file}`}
                        >
                          {file}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="th-sources-glb-group-label th-mono">
                      NASA 3D RESOURCES · OFFICIAL SPACECRAFT &amp; ROVER
                    </span>
                    <div className="th-sources-glb-chips">
                      {NASA_3D_MODELS_LIST.map((item) => (
                        <a
                          key={item.file}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="th-sources-glb-chip th-sources-glb-chip--sunset th-mono"
                          title={item.name}
                        >
                          {item.file}
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlassSurface>
          </ElectricBorder>
        </section>

        {/* 4. FILTER PILLS + SEARCH INPUT */}
        <section className="th-sources-section" aria-label="Filter and search sources">
          <div className="th-sources-controls">
            <div className="th-sources-pills" role="tablist" aria-label="Source categories">
              {SOURCE_CATEGORY_FILTERS.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`th-sources-pill ${isActive ? 'th-sources-pill--active' : ''}`}
                    style={{
                      borderRadius: '10px',
                      ...(isActive
                        ? {
                            borderColor: cat.accent,
                            backgroundColor: `${cat.accent}22`,
                            color: '#fff8f1',
                            boxShadow: `0 0 18px ${cat.accent}33`,
                          }
                        : undefined),
                    }}
                  >
                    <span>{t(cat.label, lang)}</span>
                    <span
                      className="th-sources-pill-count th-mono"
                      style={{
                        fontFamily: "var(--font-raleway), 'Raleway', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {categoryCounts[cat.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="th-sources-search-row">
              <div className="th-sources-search-wrap">
                <Search size={17} className="th-sources-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(copy.searchPlaceholder, lang)}
                  aria-label={t(copy.searchPlaceholder, lang)}
                  className="th-sources-search-input"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="th-sources-search-clear"
                    aria-label={t(copy.clearSearch, lang)}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                )}
              </div>

              <span className="th-sources-count-label th-mono">
                {t(copy.showingPrefix, lang)} <strong>{filteredSources.length}</strong>{' '}
                {t(copy.showingMiddle, lang)} {SOURCE_ENTRIES.length} {t(copy.showingSuffix, lang)}
              </span>
            </div>
          </div>

          {/* 5. CLICKABLE SOURCE CARDS GRID */}
          {filteredSources.length === 0 ? (
            <div className="th-sources-empty">
              <p>{t(copy.noResults, lang)}</p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                className="th-sources-link-btn"
              >
                {t(copy.clearSearch, lang)}
              </button>
            </div>
          ) : (
            <div className="th-sources-cards-grid">
              {filteredSources.map((entry) => {
                const Icon = getCategoryIcon(entry.category);
                return (
                  <article
                    key={entry.id}
                    className="th-project__card th-sources-card"
                    style={{ borderTop: `3px solid ${entry.accent}` }}
                  >
                    <div className="th-sources-card-top">
                      <span className="th-sources-card-provider" style={{ color: entry.accent }}>
                        <Icon size={15} aria-hidden="true" />
                        <span>{entry.provider}</span>
                      </span>
                      <span
                        className="th-sources-card-badge"
                        style={{
                          borderColor: `${entry.accent}55`,
                          color: entry.accent,
                          backgroundColor: `${entry.accent}14`,
                        }}
                      >
                        {t(entry.badgeLabel, lang)}
                      </span>
                    </div>

                    <h3 className="th-sources-card-title">{t(entry.title, lang)}</h3>

                    <div className="th-sources-product-id th-mono">{entry.productId}</div>

                    <p className="th-sources-card-desc">{t(entry.description, lang)}</p>

                    <div className="th-sources-role-box">
                      <strong>{t(copy.roleLabel, lang)}</strong> {t(entry.operationalRole, lang)}
                    </div>

                    <div className="th-sources-tags">
                      {entry.tags.map((tag) => (
                        <span key={tag} className="th-sources-tag th-mono">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="th-sources-card-links">
                      <a
                        href={entry.primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="th-sources-link-btn"
                        style={{ borderColor: `${entry.accent}66` }}
                      >
                        <span>{t(copy.openSourceBtn, lang)}</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>

                      {entry.secondaryLinks?.map((sec) => (
                        <a
                          key={sec.url}
                          href={sec.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="th-sources-sec-link"
                        >
                          <span>{t(sec.label, lang)}</span>
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 6. DETERMINISTIC PHYSICS KERNEL BASIS */}
        <section className="th-sources-section" aria-labelledby="physics-basis-heading">
          <div className="th-sources-section-head">
            <span className="ac-timeline-badge">{t(copy.physicsSectionEyebrow, lang)}</span>
            <h2 id="physics-basis-heading" className="th-section-title">
              {t(copy.physicsSectionTitle, lang)}
            </h2>
          </div>

          <div className="th-project__grid">
            {DETERMINISTIC_PHYSICS_DOMAINS.map((item) => (
              <article
                key={item.id}
                className="th-project__card"
                style={{ borderLeft: '3px solid #fb923c' }}
              >
                <div className="th-sources-physics-mod th-mono">{item.modulePath}</div>
                <h3 className="th-sources-card-title">{t(item.domain, lang)}</h3>
                <code className="th-sources-formula th-mono">{item.formulation}</code>
                <p className="th-sources-card-desc" style={{ marginTop: '0.2rem' }}>
                  {t(item.basis, lang)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .th-sources-container,
        .th-sources-container .th-mono,
        .th-sources-container code {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-sources-container .th-eyebrow {
          border-radius: 10px;
          background: rgba(249, 115, 22, 0.14);
          border: 1px solid rgba(251, 191, 36, 0.36);
          color: #fbbf24;
        }
        .th-sources-container .era-detail-period-pill {
          border-radius: 10px;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          background: rgba(26, 12, 17, 0.82);
          border-color: rgba(251, 146, 60, 0.38);
          font-variant-numeric: tabular-nums;
        }
        .th-sources-container .ac-timeline-badge {
          border-radius: 10px;
          background: rgba(249, 115, 22, 0.14);
          border: 1px solid rgba(251, 191, 36, 0.36);
          color: #fbbf24;
        }
        .th-sources-container .ac-readmore-wrap {
          border-radius: 10px;
        }
        .th-sources-container .ac-readmore-wrap:hover {
          filter: drop-shadow(0 0 18px rgba(249, 115, 22, 0.45));
        }
        .th-sources-container .ac-glass-btn-surface {
          border-radius: 10px !important;
          border: 1px solid rgba(251, 146, 60, 0.4);
          box-shadow:
            0 0 18px rgba(249, 115, 22, 0.18),
            inset 0 0 12px rgba(255, 248, 241, 0.08);
        }
        .th-sources-container .ac-readmore-label {
          color: #fff8f1;
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-sources-container .th-project__card {
          border-radius: 4px;
          background: rgba(26, 12, 17, 0.82);
          border-color: rgba(255, 255, 255, 0.24);
        }
        .th-sources-container .th-project__card:hover {
          border-color: rgba(251, 146, 60, 0.56);
        }
        .th-sources-container .th-section-title {
          color: #fff8f1;
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-sources-container {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          padding-bottom: 5rem;
        }
        .th-sources-section {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .th-sources-hero-inner {
          width: 100%;
          padding: 2.5rem 2.4rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          align-items: flex-start;
        }
        .th-sources-hero-title {
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.25rem);
          font-weight: 850;
          line-height: 1.12;
          letter-spacing: -0.025em;
          color: #fff8f1;
        }
        .th-sources-hero-sub {
          margin: 0;
          max-width: 820px;
          font-size: clamp(1rem, 1.35vw, 1.15rem);
          line-height: 1.65;
          color: #f3dfd1;
        }
        .th-sources-stats-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 0.35rem;
        }
        .th-sources-stat-card {
          padding: 0.95rem 1.05rem;
          border-radius: 4px;
          background: rgba(20, 10, 14, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .th-sources-stat-value {
          font-size: 1.65rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .th-sources-stat-label {
          font-size: 0.78rem;
          color: #f3dfd1;
          line-height: 1.35;
        }
        .th-sources-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-top: 0.4rem;
        }
        .th-sources-rigor-box {
          width: 100%;
          padding: 1.85rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }
        .th-sources-rigor-head {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .th-sources-rigor-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .th-sources-rigor-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .th-sources-rigor-col {
          padding: 1.1rem 1.2rem;
          border-radius: 4px;
          background: rgba(20, 10, 14, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        .th-sources-rigor-col h3 {
          margin: 0 0 0.45rem 0;
          font-size: 0.95rem;
          font-weight: 800;
        }
        .th-sources-rigor-col p {
          margin: 0;
          font-size: 0.87rem;
          line-height: 1.6;
          color: #f3dfd1;
        }
        .th-sources-license-box {
          width: 100%;
          padding: 1.9rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .th-sources-license-top {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .th-sources-license-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          align-items: flex-start;
        }
        .th-sources-license-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 1.32rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .th-sources-license-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .th-sources-license-body {
          margin: 0;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #f3dfd1;
        }
        .th-sources-glb-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 1rem;
          padding-top: 0.35rem;
        }
        .th-sources-glb-group-label {
          display: block;
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          color: #b89b8c;
          margin-bottom: 0.5rem;
        }
        .th-sources-glb-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.42rem;
        }
        .th-sources-glb-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.28rem 0.6rem;
          border-radius: 10px;
          background: rgba(253, 186, 116, 0.12);
          border: 1px solid rgba(253, 186, 116, 0.36);
          color: #fdba74;
          font-size: 0.72rem;
          text-decoration: none;
          transition: background-color 0.18s ease, border-color 0.18s ease;
        }
        .th-sources-glb-chip:hover {
          background: rgba(253, 186, 116, 0.22);
          border-color: #fbbf24;
        }
        .th-sources-glb-chip--sunset {
          background: rgba(249, 115, 22, 0.12);
          border-color: rgba(251, 146, 60, 0.38);
          color: #fbbf24;
        }
        .th-sources-glb-chip--sunset:hover {
          background: rgba(249, 115, 22, 0.22);
          border-color: #fbbf24;
        }
        .th-sources-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem 1.35rem;
          border-radius: 4px;
          background: rgba(26, 12, 17, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(10px);
        }
        .th-sources-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }
        .th-sources-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          min-height: 40px;
          padding: 0.45rem 0.95rem;
          border-radius: 10px;
          background: rgba(28, 14, 19, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #f3dfd1;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        .th-sources-pill:hover {
          border-color: rgba(251, 146, 60, 0.6);
          color: #fff8f1;
          transform: translateY(-1px);
        }
        .th-sources-pill-count {
          font-size: 0.72rem;
          font-variant-numeric: tabular-nums;
          padding: 0.1rem 0.42rem;
          border-radius: 10px;
          background: rgba(255, 248, 241, 0.1);
        }
        .th-sources-search-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
        }
        .th-sources-search-wrap {
          position: relative;
          flex: 1 1 320px;
          display: flex;
          align-items: center;
        }
        .th-sources-search-icon {
          position: absolute;
          left: 0.95rem;
          color: #b89b8c;
          pointer-events: none;
        }
        .th-sources-search-input {
          width: 100%;
          min-height: 42px;
          padding: 0.6rem 2.6rem 0.6rem 2.55rem;
          border-radius: 10px;
          background: rgba(20, 10, 14, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #fff8f1;
          font-family: inherit;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .th-sources-search-input::placeholder {
          color: #b89b8c;
        }
        .th-sources-search-input:focus {
          border-color: #fbbf24;
        }
        .th-sources-search-clear {
          position: absolute;
          right: 0.25rem;
          min-width: 38px;
          min-height: 38px;
          border-radius: 10px;
          background: transparent;
          border: none;
          color: #b89b8c;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
        }
        .th-sources-search-clear:hover {
          color: #fff8f1;
          background: rgba(251, 146, 60, 0.14);
        }
        .th-sources-count-label {
          font-size: 0.78rem;
          font-variant-numeric: tabular-nums;
          color: #b89b8c;
        }
        .th-sources-count-label strong {
          color: #fbbf24;
        }
        .th-sources-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
        }
        .th-sources-card {
          justify-content: space-between;
        }
        .th-sources-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .th-sources-card-provider {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.77rem;
          font-weight: 700;
        }
        .th-sources-card-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.22rem 0.6rem;
          border-radius: 10px;
          border: 1px solid;
          white-space: nowrap;
        }
        .th-sources-card-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 800;
          color: #fff8f1;
          line-height: 1.3;
        }
        .th-sources-product-id {
          font-size: 0.74rem;
          color: #fdba74;
          padding: 0.3rem 0.6rem;
          border-radius: 10px;
          background: rgba(20, 10, 14, 0.84);
          border: 1px solid rgba(255, 255, 255, 0.24);
          word-break: break-word;
        }
        .th-sources-card-desc {
          margin: 0;
          font-size: 0.87rem;
          line-height: 1.58;
          color: #f3dfd1;
        }
        .th-sources-role-box {
          padding: 0.68rem 0.85rem;
          border-radius: 10px;
          background: rgba(28, 14, 19, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          font-size: 0.82rem;
          line-height: 1.5;
          color: #f3dfd1;
        }
        .th-sources-role-box strong {
          color: #fbbf24;
        }
        .th-sources-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.38rem;
        }
        .th-sources-tag {
          font-size: 0.69rem;
          padding: 0.18rem 0.52rem;
          border-radius: 10px;
          background: rgba(251, 146, 60, 0.12);
          border: 1px solid rgba(251, 146, 60, 0.24);
          color: #f3dfd1;
        }
        .th-sources-card-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.55rem;
          padding-top: 0.55rem;
          border-top: 1px solid rgba(255, 255, 255, 0.24);
        }
        .th-sources-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 38px;
          padding: 0.42rem 0.9rem;
          border-radius: 10px;
          background: rgba(28, 14, 19, 0.88);
          border: 1px solid rgba(251, 146, 60, 0.48);
          color: #fff8f1;
          font-family: inherit;
          font-size: 0.79rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }
        .th-sources-link-btn:hover {
          background: rgba(42, 19, 25, 0.96);
          border-color: #fbbf24;
          transform: translateY(-1px);
        }
        .th-sources-link-btn--gold {
          border-color: rgba(253, 186, 116, 0.65);
          color: #fdba74;
          background: rgba(251, 191, 36, 0.12);
        }
        .th-sources-sec-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          min-height: 38px;
          padding: 0.38rem 0.7rem;
          border-radius: 10px;
          background: rgba(20, 10, 14, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #fdba74;
          font-size: 0.73rem;
          font-weight: 600;
          text-decoration: none;
        }
        .th-sources-sec-link:hover {
          border-color: #fbbf24;
          color: #fff8f1;
        }
        .th-sources-empty {
          padding: 2.2rem;
          border-radius: 4px;
          background: rgba(26, 12, 17, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: #f3dfd1;
        }
        .th-sources-section-head {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .th-sources-physics-mod {
          font-size: 0.73rem;
          color: #fbbf24;
        }
        .th-sources-formula {
          display: block;
          padding: 0.5rem 0.7rem;
          border-radius: 10px;
          background: rgba(20, 10, 14, 0.86);
          border: 1px solid rgba(251, 146, 60, 0.28);
          color: #fdba74;
          font-size: 0.75rem;
          line-height: 1.45;
          word-break: break-word;
        }
        @media (max-width: 960px) {
          .th-sources-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .th-sources-glb-grid,
          .th-sources-cards-grid,
          .th-sources-rigor-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .th-sources-hero-inner,
          .th-sources-rigor-box,
          .th-sources-license-box {
            padding: 1.4rem 1.2rem;
          }
          .th-sources-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default SourcesLandingView;
