'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Cpu,
  ExternalLink,
  Github,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { ProfileCard } from '@/components/ui/ProfileCard';
import { useLanguage } from '@/context/LanguageContext';
import {
  getArchitectureHighlights,
  getProjectMetadata,
  getTeamMembers,
  getTeamPhilosophy,
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

const PILLAR_ICONS = [ShieldCheck, Compass, Cpu];

export function TeamView() {
  const { lang } = useLanguage();
  const isEs = lang === 'es';

  const metadata = useMemo(() => getProjectMetadata(lang), [lang]);
  const philosophy = useMemo(() => getTeamPhilosophy(lang), [lang]);
  const members = useMemo(
    () =>
      getTeamMembers(lang).map((member) =>
        member.name.toLowerCase().includes('milagros')
          ? {
              ...member,
              title: 'Systems Engineering Student (UTN, FRBA) · Full Stack & 3D',
              roleBadge: 'Full Stack & 3D',
            }
          : member
      ),
    [lang]
  );
  const highlights = useMemo(() => getArchitectureHighlights(lang), [lang]);

  return (
    <div className="era-detail-page th-team-page" style={{ fontFamily: RALEWAY_FONT }}>
      <div className="era-detail-container">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link href="/compendio" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={44}
              borderRadius={10}
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
                <span>{isEs ? 'Volver al Compendio' : 'Back to Compendium'}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#fb923c" speed={1.15} chaos={0.35} borderRadius={8}>
            <div className="era-detail-period-pill" style={{ color: '#fdba74' }}>
              {metadata.event} · {isEs ? 'Publicación' : 'Release'} {metadata.releaseDate}
            </div>
          </ElectricBorder>
        </div>

        {/* HEADER */}
        <header
          style={{
            textAlign: 'center',
            maxWidth: '940px',
            margin: '0 auto 2.5rem auto',
          }}
        >
          <span className="ac-timeline-badge">
            {metadata.localNode} · {metadata.challenge}
          </span>
          <h1
            className="era-detail-main-title"
            style={{ fontSize: 'clamp(2.3rem, 4.6vw, 3.7rem)' }}
          >
            {isEs ? 'Equipo Tango Horizon' : 'Team Tango Horizon'}
          </h1>
          <p className="era-detail-subtitle">
            {isEs
              ? 'Somos Agustín Díaz-Cano, Baltazar Salerno, Milagros Sotelo y Federico Yaconis: el equipo interdisciplinario creador del simulador 3D de operaciones EVA en Marte y de esta bitácora interactiva sobre la conquista espacial para el NASA International Space Apps Challenge 2026.'
              : 'We are Agustín Díaz-Cano, Baltazar Salerno, Milagros Sotelo, and Federico Yaconis: the interdisciplinary team behind the 3D Mars EVA operations simulator and this interactive space exploration chronicle for the NASA International Space Apps Challenge 2026.'}
          </p>
        </header>

        <div className="th-team-divider" aria-hidden="true" />

        {/* MISSION PHILOSOPHY CARD */}
        <section style={{ marginBottom: '2.8rem' }} aria-labelledby="mission-philosophy-heading">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={16}
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
            <div className="team-philosophy-inner">
              <span className="thesis-abstract-label" style={{ color: '#fb923c' }}>
                {philosophy.kicker}
              </span>
              <h2 id="mission-philosophy-heading" className="team-philosophy-title">
                {philosophy.title}
              </h2>

              <div className="team-philosophy-copy">
                {philosophy.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="team-pillars-grid">
                {philosophy.pillars.map((pillar, idx) => {
                  const IconComponent = PILLAR_ICONS[idx % PILLAR_ICONS.length];
                  return (
                    <div key={pillar.title} className="team-pillar-card">
                      <div className="team-pillar-head">
                        <span className="team-pillar-icon" aria-hidden="true">
                          <IconComponent size={17} />
                        </span>
                        <h3>{pillar.title}</h3>
                      </div>
                      <p>{pillar.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassSurface>
        </section>

        <div className="th-team-divider" aria-hidden="true" />

        {/* RESPONSIVE 2x2 PROFILE CARDS GRID */}
        <section style={{ marginBottom: '2.8rem' }} aria-labelledby="team-roster-heading">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="ac-timeline-badge">
              {isEs
                ? 'Integrantes · Buenos Aires, Argentina'
                : 'Crew Members · Buenos Aires, Argentina'}
            </span>
            <h2
              id="team-roster-heading"
              className="synthesis-section-title"
              style={{ marginBottom: 0 }}
            >
              {isEs
                ? 'Tripulación de Desarrollo e Investigación'
                : 'Development & Research Crew'}
            </h2>
          </div>

          <div className="team-cards-grid">
            {members.map((member) => (
              <div key={member.name} className="team-card-slot">
                <ProfileCard {...member} />
              </div>
            ))}
          </div>
        </section>

        <div className="th-team-divider" aria-hidden="true" />

        {/* TANGO HORIZON ARCHITECTURE HIGHLIGHTS */}
        <section aria-labelledby="architecture-highlights-heading">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={16}
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
              <div
                style={{
                  marginBottom: '1.75rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.22)',
                }}
              >
                <span className="ac-timeline-badge">
                  {isEs ? 'Arquitectura Técnica' : 'Technical Architecture'} · {metadata.releaseDate}
                </span>
                <h2 id="architecture-highlights-heading" className="synthesis-section-title">
                  {isEs
                    ? 'Pilares de Ingeniería de Tango Horizon'
                    : 'Tango Horizon Engineering Pillars'}
                </h2>
              </div>

              <div className="team-arch-grid">
                {highlights.map((item) => {
                  const accent = toSunsetAccent(item.accent);
                  return (
                    <div
                      key={item.id}
                      className="team-arch-card"
                      style={{ borderTop: `3px solid ${accent}` }}
                    >
                      <div className="team-arch-top">
                        <span className="team-arch-badge" style={{ color: accent }}>
                          {item.badge}
                        </span>
                        <span className="team-arch-metric th-mono">{item.metric}</span>
                      </div>
                      <h3 className="team-arch-title">{item.title}</h3>
                      <p className="team-arch-desc">{item.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* OFFICIAL PROJECT LINKS */}
              <div className="team-actions-row">
                <ElectricBorder color="#f97316" speed={1.2} chaos={0.35} borderRadius={10}>
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
                      borderRadius={10}
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
                      <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                        <Rocket size={17} style={{ color: '#fbbf24' }} aria-hidden="true" />
                        <span>{isEs ? 'Lanzar Simulador 3D ↗' : 'Launch 3D Simulator ↗'}</span>
                        <ExternalLink size={15} style={{ color: '#fdba74' }} aria-hidden="true" />
                      </span>
                    </GlassSurface>
                  </a>
                </ElectricBorder>

                <a
                  href={metadata.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ac-readmore-wrap"
                  style={{ textDecoration: 'none' }}
                >
                  <GlassSurface
                    width="auto"
                    height={44}
                    borderRadius={10}
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
                    <span className="ac-readmore-label" style={{ padding: '0 1.45rem' }}>
                      <Github size={17} style={{ color: '#fbbf24' }} aria-hidden="true" />
                      <span>{isEs ? 'Repositorio en GitHub ↗' : 'GitHub Repository ↗'}</span>
                      <ExternalLink size={14} style={{ color: '#fdba74' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </a>

                <a
                  href={metadata.spaceAppsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ac-readmore-wrap"
                  style={{ textDecoration: 'none' }}
                >
                  <GlassSurface
                    width="auto"
                    height={44}
                    borderRadius={10}
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
                    <span className="ac-readmore-label" style={{ padding: '0 1.45rem' }}>
                      <BookOpen size={17} style={{ color: '#fb923c' }} aria-hidden="true" />
                      <span>
                        {isEs ? 'Proyecto Tango Horizon ↗' : 'Tango Horizon Project ↗'}
                      </span>
                      <ExternalLink size={14} style={{ color: '#fda4af' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </a>
              </div>
            </article>
          </GlassSurface>
        </section>

        <nav
          className="era-detail-pagination"
          aria-label={isEs ? 'Navegación entre secciones' : 'Section navigation'}
        >
          <Link href="/compendio" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={44}
              borderRadius={10}
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
                <span>{isEs ? 'Compendio General' : 'General Compendium'}</span>
              </span>
            </GlassSurface>
          </Link>

          <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={44}
              borderRadius={10}
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
                <span>{isEs ? 'Ir al Inicio' : 'Go to Home'}</span>
              </span>
            </GlassSurface>
          </Link>
        </nav>
      </div>

      <style>{`
        .th-team-page,
        .th-team-page * {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-team-page .th-mono,
        .th-team-page code {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .th-team-page .ac-timeline-badge {
          border-radius: 8px;
          background: rgba(249, 115, 22, 0.16);
          border: 1px solid rgba(251, 146, 60, 0.48);
          color: #fdba74;
        }
        .th-team-page .era-detail-period-pill {
          border-radius: 8px;
          background: #1c0e13;
          color: #fdba74;
        }
        .th-team-page .era-detail-main-title {
          color: #fff8f1;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 24px rgba(249, 115, 22, 0.28);
        }
        .th-team-page .era-detail-subtitle {
          color: #f3dfd1;
        }
        .th-team-page .synthesis-section-title {
          color: #fff8f1;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .th-team-page .ac-glass-btn-surface {
          border-radius: 10px;
          border: 1px solid rgba(251, 146, 60, 0.45);
          background: rgba(26, 12, 17, 0.84);
          box-shadow: 0 6px 18px rgba(10, 4, 6, 0.45);
        }
        .th-team-page .ac-readmore-wrap:hover {
          filter: drop-shadow(0 0 14px rgba(249, 115, 22, 0.38));
        }
        .th-team-page .ac-readmore-label {
          color: #fff8f1;
          font-weight: 700;
        }
        .th-team-page .ac-readmore-arrow-left {
          color: #fb923c;
        }
        .th-team-divider {
          width: 100%;
          border-top: 1px solid rgba(255, 255, 255, 0.24);
          margin-bottom: 2.6rem;
        }
        .team-philosophy-inner {
          width: 100%;
          padding: 2.3rem 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }
        .team-philosophy-title {
          margin: 0;
          font-size: clamp(1.45rem, 2.5vw, 2rem);
          font-weight: 800;
          color: #fff8f1;
          line-height: 1.25;
        }
        .team-philosophy-copy {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .team-philosophy-copy p {
          margin: 0;
          font-size: 1.02rem;
          line-height: 1.78;
          color: #f3dfd1;
        }
        .team-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.1rem;
          margin-top: 0.5rem;
        }
        .team-pillar-card {
          padding: 1.2rem 1.3rem;
          border-radius: 16px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-top: 2px solid #f97316;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          box-shadow: 0 8px 24px rgba(9, 4, 6, 0.35);
        }
        .team-pillar-head {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .team-pillar-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(249, 115, 22, 0.16);
          border: 1px solid rgba(251, 146, 60, 0.42);
          color: #fb923c;
          flex-shrink: 0;
        }
        .team-pillar-head h3 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .team-pillar-card p {
          margin: 0;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #c4a99a;
        }
        .team-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 360px));
          justify-content: center;
          gap: 2.2rem;
        }
        .team-card-slot {
          display: flex;
          justify-content: center;
        }
        .team-arch-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.35rem;
        }
        .team-arch-card {
          padding: 1.55rem 1.7rem;
          border-radius: 16px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          box-shadow: 0 8px 24px rgba(9, 4, 6, 0.35);
        }
        .team-arch-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .team-arch-badge {
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .team-arch-metric {
          font-size: 0.76rem;
          color: #fdba74;
          padding: 0.22rem 0.65rem;
          border-radius: 8px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.34);
        }
        .team-arch-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .team-arch-desc {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.7;
          color: #f3dfd1;
        }
        .team-actions-row {
          margin-top: 2.2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        @media (max-width: 960px) {
          .team-pillars-grid {
            grid-template-columns: 1fr;
          }
          .team-arch-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 820px) {
          .team-cards-grid {
            grid-template-columns: minmax(0, 360px);
          }
          .team-philosophy-inner {
            padding: 1.6rem 1.35rem;
          }
        }
      `}</style>
    </div>
  );
}

export default TeamView;
