'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Bot,
  Cpu,
  ExternalLink,
  GitBranch,
  Layers,
  Rocket,
  ShieldCheck,
  Presentation,
  Users,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { PartnerLogosStrip } from '@/components/ui/PartnerLogos';
import { useLanguage, pickLang } from '@/context/LanguageContext';
import {
  getAiUsageData,
  getProjectHeroCopy,
  SIMULATOR_URL,
  TEAM_ROSTER_SUMMARY,
  TECH_STACK_HIGHLIGHT,
} from '@/data/projectOverview';

const HOME_COPY = {
  stackAriaLabel: {
    en: 'Full technology stack',
    es: 'Stack tecnológico completo',
  },
  stackHeader: {
    en: 'Full Engineering Stack · Production & AI Pipeline',
    es: 'Stack de Ingeniería Completo · Producción y Pipeline IA',
  },
  logoAlt: {
    en: 'Official mission patch for Tango Horizon: AI Systems for EVA and Mars Exploration',
    es: 'Emblema oficial de Tango Horizon: AI Systems for EVA and Mars Exploration',
  },
  primaryCta: {
    en: 'Launch 3D Mars AI Simulator (tangohorizon.vercel.app) ↗',
    es: 'Usar Simulador 3D en Marte con Agentes de IA (tangohorizon.vercel.app) ↗',
  },
  projectBtn: {
    en: 'Tango Horizon Project',
    es: 'Proyecto Tango Horizon',
  },
  teamBtn: {
    en: 'Team',
    es: 'Equipo',
  },
  teamStripLabel: {
    en: 'Team:',
    es: 'Equipo:',
  },
  teamStripMore: {
    en: 'View full team →',
    es: 'Ver equipo completo →',
  },
  aiUsageEyebrow: {
    en: 'AI Usage · Agent-Assisted Engineering',
    es: 'AI Usage · Ingeniería Asistida por Agentes',
  },
  afawLinkLabel: {
    en: 'AFAW Framework (GitHub)',
    es: 'AFAW Framework (GitHub)',
  },
  codingAgentsTitle: {
    en: 'Coding Agents',
    es: 'Agentes de Codificación',
  },
  orchestrationTitle: {
    en: 'Parallel Orchestration & Workflow AI',
    es: 'Orquestación Paralela y Workflow AI',
  },
  contractsTitle: {
    en: 'Context Contracts',
    es: 'Contratos de Contexto',
  },
  contractsDesc: {
    en: 'Explicit, traceable cross-session state via persistent repository contracts:',
    es: 'Estado explícito y trazable entre sesiones mediante contratos persistentes en el repositorio:',
  },
  humanTitle: {
    en: 'Human-in-the-loop Responsibility',
    es: 'Responsabilidad Human-in-the-loop',
  },
} as const;

export default function HomePage() {
  const { lang } = useLanguage();
  const heroCopy = getProjectHeroCopy(lang);
  const aiUsage = getAiUsageData(lang);
  const teamNames = TEAM_ROSTER_SUMMARY.map((member) => member.name);

  return (
    <section
      className="th-home"
      aria-labelledby="home-hero-title"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        width: '100%',
        paddingBottom: '2.5rem',
      }}
    >
      {/* 1. Top Full Technology Stack Strip */}
      <div
        className="th-stack-strip"
        aria-label={pickLang(HOME_COPY.stackAriaLabel, lang)}
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.85rem 1rem',
          borderRadius: '20px',
          background: 'rgba(6, 12, 24, 0.62)',
          border: '1px solid rgba(125, 249, 255, 0.16)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="th-stack-strip__label"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#7df9ff',
          }}
        >
          <Layers size={14} aria-hidden="true" />
          <span>{pickLang(HOME_COPY.stackHeader, lang)}</span>
        </div>

        <ul
          className="th-stack-strip__list"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.45rem',
          }}
        >
          {TECH_STACK_HIGHLIGHT.map((chip) => (
            <li
              key={chip}
              className="th-stack-chip"
              style={{
                padding: '0.32rem 0.72rem',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 500,
                color: '#e2f4ff',
                background: 'rgba(15, 23, 42, 0.78)',
                border: '1px solid rgba(125, 249, 255, 0.22)',
                whiteSpace: 'nowrap',
              }}
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Hero Showcase Card */}
      <div
        className="th-home__hero"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '940px',
        }}
      >
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={32}
          borderWidth={0.08}
          brightness={52}
          opacity={0.94}
          blur={14}
          displace={0.65}
          backgroundOpacity={0.11}
          saturation={1.28}
          distortionScale={-160}
          style={{
            position: 'relative',
            zIndex: 2,
            border: '1px solid rgba(125, 249, 255, 0.26)',
            boxShadow:
              '0 24px 64px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: 'clamp(2rem, 4.5vw, 3.3rem) clamp(1.25rem, 4vw, 2.75rem)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1.35rem',
            }}
          >
            <span className="th-home__badge">{heroCopy.badge}</span>

            {/* Large centerpiece project logo */}
            <div
              className="th-home__logo-wrap"
              style={{
                position: 'relative',
                width: 'clamp(210px, 30vw, 272px)',
                height: 'clamp(210px, 30vw, 272px)',
                borderRadius: '9999px',
                padding: '6px',
                background:
                  'radial-gradient(circle at 50% 45%, rgba(251, 146, 60, 0.28) 0%, rgba(125, 249, 255, 0.14) 55%, rgba(2, 6, 16, 0.95) 100%)',
                border: '1.5px solid rgba(251, 146, 60, 0.5)',
                boxShadow:
                  '0 0 46px rgba(249, 115, 22, 0.34), 0 0 84px rgba(125, 249, 255, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                src="/images/tango-horizon-mars-exploration-logo.jpeg"
                alt={pickLang(HOME_COPY.logoAlt, lang)}
                width={260}
                height={260}
                priority
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '9999px',
                  backgroundColor: '#000000',
                }}
              />
            </div>

            <h1
              id="home-hero-title"
              className="th-home__title"
              style={{
                maxWidth: '820px',
                margin: 0,
                lineHeight: 1.12,
              }}
            >
              {heroCopy.title}
            </h1>

            <p
              className="th-home__subtitle"
              style={{
                maxWidth: '720px',
                margin: 0,
                lineHeight: 1.65,
                color: 'rgba(232, 244, 255, 0.94)',
              }}
            >
              {heroCopy.subtitle}
            </p>

            <p
              style={{
                maxWidth: '740px',
                margin: 0,
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'rgba(191, 219, 254, 0.84)',
              }}
            >
              {heroCopy.summary}
            </p>

            {/* Primary Live Simulator CTA + Prominent Secondary Navigation */}
            <div
              className="th-home__actions"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.9rem',
                marginTop: '0.35rem',
                width: '100%',
              }}
            >
              <ElectricBorder color="#7df9ff" speed={1.2} chaos={0.45} borderRadius={999}>
                <a
                  href={SIMULATOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    textDecoration: 'none',
                    borderRadius: '999px',
                  }}
                >
                  <GlassSurface
                    width="auto"
                    height="auto"
                    borderRadius={999}
                    borderWidth={0.12}
                    brightness={58}
                    opacity={0.96}
                    blur={10}
                    displace={0.5}
                    backgroundOpacity={0.18}
                    saturation={1.4}
                    distortionScale={-140}
                    style={{
                      border: '1px solid rgba(125, 249, 255, 0.5)',
                      boxShadow: '0 0 28px rgba(125, 249, 255, 0.28)',
                    }}
                  >
                    <span
                      className="th-home__cta"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.55rem',
                        padding: '0.85rem 1.45rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Rocket size={18} aria-hidden="true" />
                      <span>{pickLang(HOME_COPY.primaryCta, lang)}</span>
                      <ExternalLink size={16} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </a>
              </ElectricBorder>

              <Link
                href="/proyecto"
                className="th-home__secondary-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.82rem 1.35rem',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: '#fde68a',
                  background: 'rgba(249, 115, 22, 0.16)',
                  border: '1px solid rgba(251, 146, 60, 0.48)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                }}
              >
                <Cpu size={17} aria-hidden="true" />
                <span>{pickLang(HOME_COPY.projectBtn, lang)}</span>
              </Link>

              <Link
                href="/slides"
                className="th-home__secondary-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.82rem 1.35rem',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: '#c4b5fd',
                  background: 'rgba(139, 92, 246, 0.16)',
                  border: '1px solid rgba(196, 181, 253, 0.44)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                }}
              >
                <Presentation size={17} aria-hidden="true" />
                <span>Slides</span>
              </Link>

              <Link
                href="/equipo"
                className="th-home__secondary-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.82rem 1.35rem',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: '#e0f2fe',
                  background: 'rgba(14, 165, 233, 0.14)',
                  border: '1px solid rgba(125, 249, 255, 0.36)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                }}
              >
                <Users size={17} aria-hidden="true" />
                <span>{pickLang(HOME_COPY.teamBtn, lang)}</span>
              </Link>
            </div>

            {/* Compact Team preview strip */}
            <Link
              href="/equipo"
              className="th-home__team-strip"
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem 0.85rem',
                padding: '0.68rem 1.15rem',
                borderRadius: '16px',
                textDecoration: 'none',
                background: 'rgba(8, 15, 30, 0.68)',
                border: '1px solid rgba(148, 163, 184, 0.24)',
                color: '#e2e8f0',
                fontSize: '0.88rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  color: '#7df9ff',
                }}
              >
                <Users size={15} aria-hidden="true" />
                <span>{pickLang(HOME_COPY.teamStripLabel, lang)}</span>
              </span>
              <span style={{ fontWeight: 500 }}>{teamNames.join(' · ')}</span>
              <span
                style={{
                  fontWeight: 700,
                  color: '#fb923c',
                  whiteSpace: 'nowrap',
                }}
              >
                {pickLang(HOME_COPY.teamStripMore, lang)}
              </span>
            </Link>
          </div>
        </GlassSurface>
      </div>

      {/* 3. Dedicated AI Usage Section on Home */}
      <section
        className="th-ai-usage"
        aria-labelledby="ai-usage-title"
        style={{
          width: '100%',
          maxWidth: '940px',
        }}
      >
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={28}
          borderWidth={0.07}
          brightness={50}
          opacity={0.93}
          blur={12}
          displace={0.5}
          backgroundOpacity={0.09}
          saturation={1.2}
          distortionScale={-140}
          style={{
            border: '1px solid rgba(125, 249, 255, 0.2)',
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: 'clamp(1.5rem, 3.5vw, 2.35rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.35rem',
            }}
          >
            <div
              className="th-ai-usage__header"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#fb923c',
                  }}
                >
                  {pickLang(HOME_COPY.aiUsageEyebrow, lang)}
                </span>
                <h2
                  id="ai-usage-title"
                  className="th-ai-usage__title"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  {aiUsage.methodologyTitle}
                </h2>
              </div>

              <a
                href={aiUsage.methodologyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="th-ai-usage__repo-link"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#7df9ff',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(125, 249, 255, 0.34)',
                }}
              >
                <GitBranch size={15} aria-hidden="true" />
                <span>{pickLang(HOME_COPY.afawLinkLabel, lang)}</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'rgba(226, 232, 240, 0.88)',
              }}
            >
              {aiUsage.methodologySummary}
            </p>

            <div
              className="th-ai-usage__grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Coding Agents */}
              <article
                className="th-ai-usage__card"
                style={{
                  padding: '1.1rem',
                  borderRadius: '18px',
                  background: 'rgba(9, 16, 32, 0.72)',
                  border: '1px solid rgba(125, 249, 255, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#7df9ff',
                  }}
                >
                  <Bot size={18} aria-hidden="true" />
                  <span>{pickLang(HOME_COPY.codingAgentsTitle, lang)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {aiUsage.codingAgents.map((agent) => (
                    <span
                      key={agent}
                      className="th-ai-usage__pill"
                      style={{
                        padding: '0.26rem 0.62rem',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        color: '#e2f4ff',
                        background: 'rgba(30, 41, 59, 0.85)',
                        border: '1px solid rgba(125, 249, 255, 0.2)',
                      }}
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </article>

              {/* Parallel Orchestration & Workflow AI */}
              <article
                className="th-ai-usage__card"
                style={{
                  padding: '1.1rem',
                  borderRadius: '18px',
                  background: 'rgba(9, 16, 32, 0.72)',
                  border: '1px solid rgba(125, 249, 255, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#fb923c',
                  }}
                >
                  <GitBranch size={18} aria-hidden="true" />
                  <span>{pickLang(HOME_COPY.orchestrationTitle, lang)}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.83rem',
                    lineHeight: 1.5,
                    color: 'rgba(226, 232, 240, 0.86)',
                  }}
                >
                  {aiUsage.orchestrationNote}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {aiUsage.workflowAi.map((tool) => (
                    <span
                      key={tool}
                      className="th-ai-usage__pill"
                      style={{
                        padding: '0.26rem 0.62rem',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        color: '#ffedd5',
                        background: 'rgba(67, 20, 7, 0.55)',
                        border: '1px solid rgba(251, 146, 60, 0.3)',
                      }}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </article>

              {/* Context Contracts */}
              <article
                className="th-ai-usage__card"
                style={{
                  padding: '1.1rem',
                  borderRadius: '18px',
                  background: 'rgba(9, 16, 32, 0.72)',
                  border: '1px solid rgba(125, 249, 255, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#a5f3fc',
                  }}
                >
                  <Layers size={18} aria-hidden="true" />
                  <span>{pickLang(HOME_COPY.contractsTitle, lang)}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.83rem',
                    lineHeight: 1.5,
                    color: 'rgba(226, 232, 240, 0.86)',
                  }}
                >
                  {pickLang(HOME_COPY.contractsDesc, lang)}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
                  {aiUsage.contractFiles.map((entry) => (
                    <div
                      key={entry.file}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <code
                        className="th-ai-usage__contract"
                        style={{
                          padding: '0.2rem 0.52rem',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          color: '#7df9ff',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(125, 249, 255, 0.25)',
                        }}
                      >
                        {entry.file}
                      </code>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'rgba(203, 213, 225, 0.84)',
                        }}
                      >
                        {entry.role}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              {/* Human-in-the-loop Responsibility */}
              <article
                className="th-ai-usage__card"
                style={{
                  padding: '1.1rem',
                  borderRadius: '18px',
                  background: 'rgba(9, 16, 32, 0.72)',
                  border: '1px solid rgba(52, 211, 153, 0.26)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: '#6ee7b7',
                  }}
                >
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span>{pickLang(HOME_COPY.humanTitle, lang)}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.84rem',
                    lineHeight: 1.55,
                    color: 'rgba(226, 232, 240, 0.9)',
                  }}
                >
                  {aiUsage.humanResponsibility}
                </p>
              </article>
            </div>
          </div>
        </GlassSurface>
      </section>

      {/* 4. Bottom of Hero — Compact Institutional Logos */}
      <div
        className="th-partner-strip-wrap"
        style={{
          width: '100%',
          maxWidth: '940px',
        }}
      >
        <PartnerLogosStrip variant="hero" />
      </div>
    </section>
  );
}
