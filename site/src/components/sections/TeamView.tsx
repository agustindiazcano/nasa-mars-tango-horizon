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

const PILLAR_ICONS = [ShieldCheck, Compass, Cpu];

export function TeamView() {
  const { lang } = useLanguage();
  const isEs = lang === 'es';

  const metadata = useMemo(() => getProjectMetadata(lang), [lang]);
  const philosophy = useMemo(() => getTeamPhilosophy(lang), [lang]);
  const members = useMemo(() => getTeamMembers(lang), [lang]);
  const highlights = useMemo(() => getArchitectureHighlights(lang), [lang]);

  return (
    <div className="era-detail-page">
      <div className="era-detail-container">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link href="/compendio" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
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
                <span>{isEs ? 'Volver al Compendio' : 'Back to Compendium'}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#7df9ff" speed={1.15} chaos={0.5} borderRadius={16}>
            <div className="era-detail-period-pill" style={{ color: '#7df9ff' }}>
              {metadata.event} · {isEs ? 'Publicación' : 'Release'} {metadata.releaseDate}
            </div>
          </ElectricBorder>
        </div>

        {/* HEADER */}
        <header
          style={{
            textAlign: 'center',
            maxWidth: '940px',
            margin: '0 auto 2.8rem auto',
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

        {/* MISSION PHILOSOPHY CARD */}
        <section style={{ marginBottom: '3.2rem' }} aria-labelledby="mission-philosophy-heading">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={28}
            borderWidth={0.07}
            brightness={50}
            opacity={0.94}
            blur={14}
            displace={0.85}
            backgroundOpacity={0.1}
            saturation={1.35}
            distortionScale={-165}
          >
            <div className="team-philosophy-inner">
              <span className="thesis-abstract-label" style={{ color: '#7df9ff' }}>
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

        {/* RESPONSIVE 2x2 PROFILE CARDS GRID */}
        <section style={{ marginBottom: '3.4rem' }} aria-labelledby="team-roster-heading">
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

        {/* TANGO HORIZON ARCHITECTURE HIGHLIGHTS */}
        <section aria-labelledby="architecture-highlights-heading">
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
              <div style={{ marginBottom: '2rem' }}>
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
                {highlights.map((item) => (
                  <div
                    key={item.id}
                    className="team-arch-card"
                    style={{ borderTop: `3px solid ${item.accent}` }}
                  >
                    <div className="team-arch-top">
                      <span className="team-arch-badge" style={{ color: item.accent }}>
                        {item.badge}
                      </span>
                      <span className="team-arch-metric th-mono">{item.metric}</span>
                    </div>
                    <h3 className="team-arch-title">{item.title}</h3>
                    <p className="team-arch-desc">{item.description}</p>
                  </div>
                ))}
              </div>

              {/* OFFICIAL PROJECT LINKS */}
              <div className="team-actions-row">
                <ElectricBorder color="#7df9ff" speed={1.2} chaos={0.45} borderRadius={999}>
                  <a
                    href={metadata.simulatorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-readmore-wrap"
                    style={{ textDecoration: 'none' }}
                  >
                    <GlassSurface
                      width="auto"
                      height={54}
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
                      <span className="ac-readmore-label" style={{ padding: '0 1.75rem' }}>
                        <Rocket size={17} style={{ color: '#7df9ff' }} aria-hidden="true" />
                        <span>{isEs ? 'Lanzar Simulador 3D ↗' : 'Launch 3D Simulator ↗'}</span>
                        <ExternalLink size={15} style={{ color: '#7df9ff' }} aria-hidden="true" />
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
                    height={54}
                    borderRadius={999}
                    borderWidth={0.12}
                    brightness={56}
                    opacity={0.95}
                    blur={10}
                    displace={0.6}
                    backgroundOpacity={0.12}
                    saturation={1.35}
                    distortionScale={-140}
                    className="ac-glass-btn-surface"
                  >
                    <span className="ac-readmore-label" style={{ padding: '0 1.65rem' }}>
                      <Github size={17} style={{ color: '#fde68a' }} aria-hidden="true" />
                      <span>{isEs ? 'Repositorio en GitHub ↗' : 'GitHub Repository ↗'}</span>
                      <ExternalLink size={14} style={{ color: '#fde68a' }} aria-hidden="true" />
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
                    height={54}
                    borderRadius={999}
                    borderWidth={0.12}
                    brightness={56}
                    opacity={0.95}
                    blur={10}
                    displace={0.6}
                    backgroundOpacity={0.12}
                    saturation={1.35}
                    distortionScale={-140}
                    className="ac-glass-btn-surface"
                  >
                    <span className="ac-readmore-label" style={{ padding: '0 1.65rem' }}>
                      <BookOpen size={17} style={{ color: '#fb923c' }} aria-hidden="true" />
                      <span>
                        {isEs ? 'Proyecto Tango Horizon ↗' : 'Tango Horizon Project ↗'}
                      </span>
                      <ExternalLink size={14} style={{ color: '#fb923c' }} aria-hidden="true" />
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
              <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                <ArrowLeft size={15} className="ac-readmore-arrow-left" aria-hidden="true" />
                <span>{isEs ? 'Compendio General' : 'General Compendium'}</span>
              </span>
            </GlassSurface>
          </Link>

          <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
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
              <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                <span>{isEs ? 'Ir al Inicio' : 'Go to Home'}</span>
              </span>
            </GlassSurface>
          </Link>
        </nav>
      </div>

      <style>{`
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
          color: #ffffff;
          line-height: 1.25;
        }
        .team-philosophy-copy {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .team-philosophy-copy p {
          margin: 0;
          font-size: 1.04rem;
          line-height: 1.8;
          color: #e2e8f0;
        }
        .team-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.1rem;
          margin-top: 0.5rem;
        }
        .team-pillar-card {
          padding: 1.2rem 1.3rem;
          border-radius: 18px;
          background: rgba(9, 13, 24, 0.72);
          border: 1px solid rgba(125, 249, 255, 0.22);
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .team-pillar-head {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .team-pillar-icon {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(56, 189, 248, 0.14);
          border: 1px solid rgba(125, 249, 255, 0.32);
          color: #7df9ff;
          flex-shrink: 0;
        }
        .team-pillar-head h3 {
          margin: 0;
          font-size: 1.02rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .team-pillar-card p {
          margin: 0;
          font-size: 0.92rem;
          line-height: 1.65;
          color: #cbd5e1;
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
          border-radius: 20px;
          background: rgba(9, 13, 22, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.22);
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
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
          color: #bae6fd;
          padding: 0.22rem 0.65rem;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .team-arch-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #ffffff;
        }
        .team-arch-desc {
          margin: 0;
          font-size: 0.98rem;
          line-height: 1.7;
          color: #cbd5e1;
        }
        .team-actions-row {
          margin-top: 2.4rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 1.1rem;
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
