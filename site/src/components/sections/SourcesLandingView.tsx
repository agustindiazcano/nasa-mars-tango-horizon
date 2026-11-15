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
    <div className="era-detail-page">
      <div className="era-detail-container th-sources-container">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
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
                <span>{t(copy.backHome, lang)}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#7df9ff" speed={1.15} chaos={0.45} borderRadius={16}>
            <div className="era-detail-period-pill" style={{ color: '#7df9ff' }}>
              NASA Space Apps Challenge 2026 · 2026-11-15
            </div>
          </ElectricBorder>
        </div>

        {/* 1. HERO HEADER */}
        <section className="th-sources-section" aria-labelledby="sources-hero-title">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={30}
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
                    <span className="th-sources-stat-value th-mono" style={{ color: stat.accent }}>
                      {stat.value}
                    </span>
                    <span className="th-sources-stat-label">{t(stat.label, lang)}</span>
                  </div>
                ))}
              </div>

              <div className="th-sources-hero-actions">
                <ElectricBorder color="#7df9ff" speed={1.2} chaos={0.45} borderRadius={999}>
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
                      backgroundOpacity={0.16}
                      saturation={1.4}
                      distortionScale={-140}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.45rem' }}>
                        <Rocket size={17} style={{ color: '#7df9ff' }} aria-hidden="true" />
                        <span>{t(copy.openSimulator, lang)}</span>
                        <ExternalLink size={14} style={{ color: '#7df9ff' }} aria-hidden="true" />
                      </span>
                    </GlassSurface>
                  </a>
                </ElectricBorder>

                <Link href="/proyecto" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
                  <GlassSurface
                    width="auto"
                    height={50}
                    borderRadius={999}
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
                      <Cpu size={16} style={{ color: '#c4b5fd' }} aria-hidden="true" />
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
            borderRadius={24}
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
                <ShieldCheck size={22} style={{ color: '#34d399', flexShrink: 0 }} aria-hidden="true" />
                <h2 id="verified-vs-sim-title" className="th-sources-rigor-title">
                  {t(copy.verifiedVsSimTitle, lang)}
                </h2>
              </div>

              <div className="th-sources-rigor-grid">
                <div className="th-sources-rigor-col" style={{ borderColor: 'rgba(52, 211, 153, 0.35)' }}>
                  <h3 style={{ color: '#34d399' }}>{t(copy.verifiedVsSimEmpiricalTitle, lang)}</h3>
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
          <ElectricBorder color="#fde68a" speed={1.0} chaos={0.35} borderRadius={26}>
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={26}
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
                    <span className="ac-timeline-badge" style={{ borderColor: '#fde68a66', color: '#fde68a' }}>
                      {t(copy.licenseBoxBadge, lang)}
                    </span>
                    <h2 id="cc-by-4-heading" className="th-sources-license-title">
                      <Box size={22} style={{ color: '#fde68a', flexShrink: 0 }} aria-hidden="true" />
                      <span>{t(copy.licenseBoxTitle, lang)}</span>
                    </h2>
                  </div>

                  <div className="th-sources-license-actions">
                    <a
                      href={CC_BY_4_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="th-sources-link-btn th-sources-link-btn--gold"
                    >
                      <span>{t(copy.licenseCta, lang)}</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                    <a
                      href={NASA_3D_RESOURCES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="th-sources-link-btn"
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
                          className="th-sources-glb-chip th-sources-glb-chip--cyan th-mono"
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
                    style={
                      isActive
                        ? {
                            borderColor: cat.accent,
                            backgroundColor: `${cat.accent}22`,
                            color: '#ffffff',
                            boxShadow: `0 0 18px ${cat.accent}33`,
                          }
                        : undefined
                    }
                  >
                    <span>{t(cat.label, lang)}</span>
                    <span className="th-sources-pill-count th-mono">{categoryCounts[cat.id]}</span>
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
                style={{ borderLeft: '3px solid #7df9ff' }}
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

      <style jsx>{`
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
          color: #ffffff;
        }
        .th-sources-hero-sub {
          margin: 0;
          max-width: 820px;
          font-size: clamp(1rem, 1.35vw, 1.15rem);
          line-height: 1.65;
          color: #cbd5e1;
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
          border-radius: 16px;
          background: rgba(7, 11, 20, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.25);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .th-sources-stat-value {
          font-size: 1.65rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .th-sources-stat-label {
          font-size: 0.78rem;
          color: #cbd5e1;
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
          color: #ffffff;
        }
        .th-sources-rigor-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .th-sources-rigor-col {
          padding: 1.1rem 1.2rem;
          border-radius: 16px;
          background: rgba(5, 8, 16, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.22);
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
          color: #cbd5e1;
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
          color: #ffffff;
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
          color: #e2e8f0;
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
          color: #94a3b8;
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
          padding: 0.25rem 0.58rem;
          border-radius: 8px;
          background: rgba(253, 230, 138, 0.1);
          border: 1px solid rgba(253, 230, 138, 0.35);
          color: #fde68a;
          font-size: 0.72rem;
          text-decoration: none;
          transition: background-color 0.18s ease, border-color 0.18s ease;
        }
        .th-sources-glb-chip:hover {
          background: rgba(253, 230, 138, 0.2);
          border-color: #fde68a;
        }
        .th-sources-glb-chip--cyan {
          background: rgba(125, 249, 255, 0.1);
          border-color: rgba(125, 249, 255, 0.35);
          color: #7df9ff;
        }
        .th-sources-glb-chip--cyan:hover {
          background: rgba(125, 249, 255, 0.2);
          border-color: #7df9ff;
        }
        .th-sources-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem 1.35rem;
          border-radius: 20px;
          background: rgba(9, 13, 22, 0.74);
          border: 1px solid rgba(148, 163, 184, 0.22);
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
          padding: 0.5rem 0.9rem;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.28);
          color: #cbd5e1;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        .th-sources-pill:hover {
          border-color: rgba(125, 249, 255, 0.55);
          color: #ffffff;
          transform: translateY(-1px);
        }
        .th-sources-pill-count {
          font-size: 0.72rem;
          padding: 0.1rem 0.42rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
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
          color: #94a3b8;
          pointer-events: none;
        }
        .th-sources-search-input {
          width: 100%;
          padding: 0.65rem 2.4rem 0.65rem 2.55rem;
          border-radius: 12px;
          background: rgba(5, 8, 16, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #f8fafc;
          font-family: inherit;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .th-sources-search-input:focus {
          border-color: #7df9ff;
        }
        .th-sources-search-clear {
          position: absolute;
          right: 0.65rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          padding: 0.25rem;
        }
        .th-sources-search-clear:hover {
          color: #ffffff;
        }
        .th-sources-count-label {
          font-size: 0.78rem;
          color: #94a3b8;
        }
        .th-sources-count-label strong {
          color: #7df9ff;
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
          padding: 0.2rem 0.58rem;
          border-radius: 999px;
          border: 1px solid;
          white-space: nowrap;
        }
        .th-sources-card-title {
          margin: 0;
          font-size: 1.08rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.3;
        }
        .th-sources-product-id {
          font-size: 0.74rem;
          color: #bae6fd;
          padding: 0.28rem 0.6rem;
          border-radius: 8px;
          background: rgba(5, 8, 16, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.2);
          word-break: break-word;
        }
        .th-sources-card-desc {
          margin: 0;
          font-size: 0.87rem;
          line-height: 1.58;
          color: #cbd5e1;
        }
        .th-sources-role-box {
          padding: 0.68rem 0.85rem;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.74);
          border: 1px solid rgba(148, 163, 184, 0.18);
          font-size: 0.82rem;
          line-height: 1.5;
          color: #e2e8f0;
        }
        .th-sources-role-box strong {
          color: #7df9ff;
        }
        .th-sources-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.38rem;
        }
        .th-sources-tag {
          font-size: 0.69rem;
          padding: 0.16rem 0.5rem;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          color: #cbd5e1;
        }
        .th-sources-card-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.55rem;
          padding-top: 0.35rem;
          border-top: 1px solid rgba(148, 163, 184, 0.16);
        }
        .th-sources-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.86);
          border: 1px solid rgba(125, 249, 255, 0.45);
          color: #f8fafc;
          font-size: 0.79rem;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .th-sources-link-btn:hover {
          background: rgba(30, 41, 59, 0.95);
          transform: translateY(-1px);
        }
        .th-sources-link-btn--gold {
          border-color: rgba(253, 230, 138, 0.65);
          color: #fde68a;
          background: rgba(253, 230, 138, 0.1);
        }
        .th-sources-sec-link {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.36rem 0.65rem;
          border-radius: 8px;
          background: rgba(5, 8, 16, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.26);
          color: #bae6fd;
          font-size: 0.73rem;
          font-weight: 600;
          text-decoration: none;
        }
        .th-sources-sec-link:hover {
          border-color: #7df9ff;
          color: #ffffff;
        }
        .th-sources-empty {
          padding: 2.2rem;
          border-radius: 20px;
          background: rgba(9, 13, 22, 0.76);
          border: 1px solid rgba(148, 163, 184, 0.25);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: #cbd5e1;
        }
        .th-sources-section-head {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .th-sources-physics-mod {
          font-size: 0.73rem;
          color: #7df9ff;
        }
        .th-sources-formula {
          display: block;
          padding: 0.5rem 0.7rem;
          border-radius: 10px;
          background: rgba(5, 8, 16, 0.8);
          border: 1px solid rgba(125, 249, 255, 0.2);
          color: #fde68a;
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
