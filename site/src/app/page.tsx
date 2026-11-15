'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Bot,
  Cpu,
  ExternalLink,
  GitBranch,
  Layers,
  Presentation,
  ShieldCheck,
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

const RALEWAY_FONT = "var(--font-raleway), 'Raleway', sans-serif";

const HOME_COPY = {
  topSimulatorLabel: {
    en: '3D Simulator',
    es: 'Simulador 3D',
  },
  topSimulatorAria: {
    en: 'Launch 3D Mars Simulator at tangohorizon.vercel.app (opens in new tab)',
    es: 'Abrir Simulador 3D en tangohorizon.vercel.app (se abre en nueva pestaña)',
  },
  stackAriaLabel: {
    en: 'Tech Stack',
    es: 'Tech Stack',
  },
  stackHeader: {
    en: 'Tech Stack',
    es: 'Tech Stack',
  },
  logoAlt: {
    en: 'Tango Horizon: AI Systems for EVA and Mars Exploration emblem',
    es: 'Emblema de Tango Horizon: AI Systems for EVA and Mars Exploration',
  },
  teamBlockLabel: {
    en: 'Team Tango Horizon · Buenos Aires, Argentina',
    es: 'Equipo Tango Horizon · Buenos Aires, Argentina',
  },
  projectBtn: {
    en: 'Tango Horizon Project',
    es: 'Proyecto Tango Horizon',
  },
  slidesBtn: {
    en: 'Slides',
    es: 'Slides',
  },
  teamBtn: {
    en: 'Team',
    es: 'Equipo',
  },
  heroBottomStrip: {
    en: 'NASA Space Apps Challenge · Topic: Mars Exploration · Project: Tango Horizon: AI Systems for EVA and Mars Exploration',
    es: 'NASA Space Apps Challenge · Tema: Exploración de Marte · Proyecto: Tango Horizon: Sistemas de IA para EVA y Exploración de Marte',
  },
  aiUsageTitle: 'AI Usage',
  aiUsageSubtitle: {
    en: 'AI-Assisted Development',
    es: 'Desarrollo Asistido por IA',
  },
  aiUsageSummary: {
    en: 'This project was built with AI-assisted development in which coding agents assisted with implementation, tests, CI/CD, pull requests, commits, human-validated documentation, and deployment under continuous human direction and review.',
    es: 'Este proyecto fue construido con desarrollo asistido por IA, donde agentes de codificación asistieron en la implementación, tests, CI/CD, pull requests, commits, documentación validada por humanos y despliegue bajo dirección y revisión humana continua.',
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

function MarsPlanetIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id="th-btn-mars-disc">
          <circle cx="32" cy="32" r="28" />
        </clipPath>
        <radialGradient id="th-btn-mars-sphere" cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="48%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <linearGradient id="th-btn-mars-dust" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fdba74" stopOpacity="0.62" />
          <stop offset="55%" stopColor="#fb923c" stopOpacity="0.44" />
          <stop offset="100%" stopColor="#9a3412" stopOpacity="0.24" />
        </linearGradient>
      </defs>
      <g clipPath="url(#th-btn-mars-disc)">
        <circle cx="32" cy="32" r="28" fill="url(#th-btn-mars-sphere)" />
        <path
          d="M 2 41 Q 20 36, 36 40 T 62 38 L 62 47 Q 42 51, 24 47 T 2 49 Z"
          fill="url(#th-btn-mars-dust)"
        />
        <ellipse cx="32" cy="6.5" rx="13.5" ry="4.8" fill="#fff1e6" opacity="0.92" />
      </g>
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="rgba(255, 248, 241, 0.45)"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export default function HomePage() {
  const { lang } = useLanguage();
  const heroCopy = getProjectHeroCopy(lang);
  const aiUsage = getAiUsageData(lang);

  return (
    <section
      className="th-home"
      aria-labelledby="home-hero-title"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        width: '100%',
        paddingBottom: '2.75rem',
        fontFamily: RALEWAY_FONT,
      }}
    >
      {/* 1. VERY TOP OF HOME: Institutional Sponsors Card */}
      <div
        className="th-partner-strip-wrap th-home-panel"
        style={{
          width: '80vw',
          margin: '0 auto',
        }}
      >
        <PartnerLogosStrip variant="hero" />
      </div>

      {/* 2. Prominent Centered 3D Simulator CTA with Mars Planet SVG on the Right */}
      <div
        className="th-home-panel"
        style={{
          width: '80vw',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <ElectricBorder color="#f97316" speed={1.15} chaos={0.32} borderRadius={12}>
          <a
            href={SIMULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={pickLang(HOME_COPY.topSimulatorAria, lang)}
            className="th-home-top-sim-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1.05rem 2.5rem',
              minHeight: '58px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontFamily: RALEWAY_FONT,
              fontSize: 'clamp(1.12rem, 1.8vw, 1.38rem)',
              fontWeight: 800,
              letterSpacing: '0.01em',
              color: '#fff8f1',
              background:
                'linear-gradient(135deg, rgba(249, 115, 22, 0.42) 0%, rgba(234, 88, 12, 0.32) 52%, rgba(244, 63, 94, 0.28) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.46)',
              boxShadow:
                '0 14px 36px rgba(249, 115, 22, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
              backdropFilter: 'blur(16px)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{pickLang(HOME_COPY.topSimulatorLabel, lang)}</span>
            <MarsPlanetIcon />
            <ExternalLink size={18} style={{ color: '#fde68a' }} aria-hidden="true" />
          </a>
        </ElectricBorder>
      </div>

      {/* White horizontal separation line */}
      <div
        aria-hidden="true"
        style={{
          width: '80vw',
          margin: '0 auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
        }}
      />

      {/* 3. Hero Horizontal Showcase Block */}
      <div
        className="th-home__hero th-home-panel"
        style={{
          position: 'relative',
          width: '80vw',
          margin: '0 auto',
        }}
      >
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={18}
          borderWidth={0.08}
          brightness={48}
          opacity={0.94}
          blur={18}
          displace={0.55}
          backgroundOpacity={0.14}
          saturation={1.24}
          distortionScale={-140}
          redOffset={14}
          greenOffset={6}
          blueOffset={0}
          style={{
            position: 'relative',
            zIndex: 2,
            borderRadius: '18px',
            background:
              'linear-gradient(145deg, rgba(30, 13, 19, 0.86) 0%, rgba(16, 7, 11, 0.92) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow:
              '0 28px 68px rgba(8, 3, 5, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: 'clamp(1.75rem, 3.6vw, 2.85rem) clamp(1.35rem, 3.6vw, 2.85rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.65rem',
            }}
          >
            {/* Horizontal 2-column grid: Left (Text + Team + Buttons) / Right (Clean Logo) */}
            <div
              className="th-home-hero-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.38fr) auto',
                alignItems: 'center',
                gap: '2.4rem',
                width: '100%',
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: '1.1rem',
                }}
              >
                <span
                  className="th-home__badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.38rem 0.9rem',
                    borderRadius: '8px',
                    background:
                      'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(251, 191, 36, 0.12) 100%)',
                    border: '1px solid rgba(251, 146, 60, 0.45)',
                    color: '#fdba74',
                    fontFamily: RALEWAY_FONT,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  {heroCopy.badge}
                </span>

                <h1
                  id="home-hero-title"
                  className="th-home__title"
                  style={{
                    margin: 0,
                    maxWidth: '820px',
                    fontFamily: RALEWAY_FONT,
                    fontSize: 'clamp(2.05rem, 3.7vw, 3.25rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                    wordSpacing: 'normal',
                    lineHeight: 1.08,
                    color: '#fff8f1',
                    textShadow: '0 4px 28px rgba(249, 115, 22, 0.26)',
                    textAlign: 'left',
                  }}
                >
                  {heroCopy.title}
                </h1>

                {/* Team Roster Block */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderLeft: '3px solid #f97316',
                    width: '100%',
                    maxWidth: '720px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: RALEWAY_FONT,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#fbbf24',
                    }}
                  >
                    {pickLang(HOME_COPY.teamBlockLabel, lang)}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.45rem',
                    }}
                  >
                    {TEAM_ROSTER_SUMMARY.map((member) => (
                      <span
                        key={member.name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.26rem 0.68rem',
                          borderRadius: '8px',
                          background: 'rgba(24, 10, 15, 0.78)',
                          border: '1px solid rgba(253, 186, 116, 0.25)',
                          fontFamily: RALEWAY_FONT,
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: '#fff8f1',
                        }}
                      >
                        <span>{member.name}</span>
                        <span style={{ color: '#fb923c', fontSize: '0.74rem', fontWeight: 500 }}>
                          · {pickLang(member.role, lang)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <p
                  className="th-home__subtitle"
                  style={{
                    maxWidth: '720px',
                    margin: 0,
                    fontFamily: RALEWAY_FONT,
                    fontSize: 'clamp(1rem, 1.32vw, 1.14rem)',
                    fontWeight: 500,
                    lineHeight: 1.62,
                    color: '#f3dfd1',
                    textAlign: 'left',
                  }}
                >
                  {heroCopy.subtitle}
                </p>

                <p
                  style={{
                    maxWidth: '740px',
                    margin: 0,
                    fontFamily: RALEWAY_FONT,
                    fontSize: '0.92rem',
                    lineHeight: 1.62,
                    color: '#d1b7a9',
                    textAlign: 'left',
                  }}
                >
                  {heroCopy.summary}
                </p>

                {/* Modern Slightly-Rounded Action Buttons (10px) */}
                <div
                  className="th-home__actions"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.75rem',
                    marginTop: '0.35rem',
                    width: '100%',
                  }}
                >
                  <Link
                    href="/proyecto"
                    className="th-home-action-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.55rem',
                      minHeight: '44px',
                      padding: '0.6rem 1.35rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontFamily: RALEWAY_FONT,
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: '#fff8f1',
                      background:
                        'linear-gradient(135deg, rgba(249, 115, 22, 0.34) 0%, rgba(251, 191, 36, 0.22) 100%)',
                      border: '1px solid rgba(251, 191, 36, 0.55)',
                      boxShadow:
                        '0 8px 24px rgba(249, 115, 22, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Cpu size={16} style={{ color: '#fbbf24' }} aria-hidden="true" />
                    <span>{pickLang(HOME_COPY.projectBtn, lang)}</span>
                  </Link>

                  <Link
                    href="/slides"
                    className="th-home-action-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.55rem',
                      minHeight: '44px',
                      padding: '0.6rem 1.35rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontFamily: RALEWAY_FONT,
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: '#fff8f1',
                      background:
                        'linear-gradient(135deg, rgba(251, 113, 133, 0.26) 0%, rgba(249, 115, 22, 0.16) 100%)',
                      border: '1px solid rgba(251, 113, 133, 0.52)',
                      boxShadow:
                        '0 8px 24px rgba(10, 4, 6, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Presentation size={16} style={{ color: '#fda4af' }} aria-hidden="true" />
                    <span>{pickLang(HOME_COPY.slidesBtn, lang)}</span>
                  </Link>

                  <Link
                    href="/equipo"
                    className="th-home-action-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.55rem',
                      minHeight: '44px',
                      padding: '0.6rem 1.35rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontFamily: RALEWAY_FONT,
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: '#fdba74',
                      background: 'rgba(28, 12, 18, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.24)',
                      boxShadow:
                        '0 8px 24px rgba(10, 4, 6, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Users size={16} aria-hidden="true" />
                    <span>{pickLang(HOME_COPY.teamBtn, lang)}</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Clean Logo with NO circular glow / halo */}
              <div
                className="th-home-hero-logo-col"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                }}
              >
                <Image
                  src="/images/tango-horizon-mars-exploration-logo.jpeg"
                  alt={pickLang(HOME_COPY.logoAlt, lang)}
                  width={290}
                  height={290}
                  priority
                  style={{
                    width: 'clamp(200px, 22vw, 290px)',
                    height: 'auto',
                    objectFit: 'contain',
                    background: 'transparent',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: 'none',
                    display: 'block',
                  }}
                />
              </div>
            </div>

            {/* Bottom strip of the Hero block */}
            <div
              style={{
                width: '100%',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <span
                style={{
                  fontFamily: RALEWAY_FONT,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: '#e5cfc2',
                }}
              >
                {pickLang(HOME_COPY.heroBottomStrip, lang)}
              </span>
              <Link
                href="/equipo"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.38rem',
                  fontFamily: RALEWAY_FONT,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#fdba74',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  padding: '0.32rem 0.78rem',
                  border: '1px solid rgba(251, 146, 60, 0.42)',
                  background: 'rgba(249, 115, 22, 0.14)',
                }}
              >
                <Users size={13} aria-hidden="true" />
                <span>{pickLang(HOME_COPY.teamBtn, lang)}</span>
              </Link>
            </div>
          </div>
        </GlassSurface>
      </div>

      {/* White horizontal separation line */}
      <div
        aria-hidden="true"
        style={{
          width: '80vw',
          margin: '0 auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
        }}
      />

      {/* 4. Tech Stack Section (Directly BELOW the Hero/logo block) */}
      <div
        className="th-stack-strip th-home-panel"
        aria-label={pickLang(HOME_COPY.stackAriaLabel, lang)}
        style={{
          width: '80vw',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.9rem',
          padding: '1.35rem 1.65rem',
          borderRadius: '16px',
          background:
            'linear-gradient(135deg, rgba(28, 12, 18, 0.84) 0%, rgba(18, 8, 12, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow:
            '0 18px 44px rgba(8, 3, 5, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="th-stack-strip__label"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(249, 115, 22, 0.14)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            fontFamily: RALEWAY_FONT,
            fontSize: '0.84rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: '#fbbf24',
          }}
        >
          <Layers size={15} aria-hidden="true" />
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
            gap: '0.55rem',
          }}
        >
          {TECH_STACK_HIGHLIGHT.map((chip) => (
            <li
              key={chip}
              className="th-stack-chip"
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontFamily: RALEWAY_FONT,
                fontVariantNumeric: 'tabular-nums',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#fff8f1',
                background: 'rgba(20, 9, 14, 0.82)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                whiteSpace: 'nowrap',
              }}
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      {/* White horizontal separation line */}
      <div
        aria-hidden="true"
        style={{
          width: '80vw',
          margin: '0 auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
        }}
      />

      {/* 5. Dedicated AI Usage Section on Home */}
      <section
        className="th-ai-usage th-home-panel"
        aria-labelledby="ai-usage-title"
        style={{
          width: '80vw',
          margin: '0 auto',
          padding: 0,
          borderRadius: '18px',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={18}
          borderWidth={0.07}
          brightness={48}
          opacity={0.94}
          blur={16}
          displace={0.45}
          backgroundOpacity={0.12}
          saturation={1.2}
          distortionScale={-120}
          redOffset={12}
          greenOffset={5}
          blueOffset={0}
          style={{
            borderRadius: '18px',
            background:
              'linear-gradient(145deg, rgba(28, 12, 18, 0.84) 0%, rgba(16, 7, 11, 0.92) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow:
              '0 22px 54px rgba(8, 3, 5, 0.64), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: 'clamp(1.6rem, 3.2vw, 2.45rem)',
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
                paddingBottom: '0.95rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
                <span
                  style={{
                    fontFamily: RALEWAY_FONT,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#fb923c',
                  }}
                >
                  {pickLang(HOME_COPY.aiUsageSubtitle, lang)}
                </span>
                <h2
                  id="ai-usage-title"
                  className="th-ai-usage__title"
                  style={{
                    margin: 0,
                    fontFamily: RALEWAY_FONT,
                    fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#fff8f1',
                  }}
                >
                  {HOME_COPY.aiUsageTitle}
                </h2>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                fontFamily: RALEWAY_FONT,
                fontSize: '0.95rem',
                lineHeight: 1.65,
                color: '#f3dfd1',
              }}
            >
              {pickLang(HOME_COPY.aiUsageSummary, lang)}
            </p>

            <div
              className="th-ai-usage__grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.05rem',
              }}
            >
              {/* Coding Agents */}
              <article
                className="th-ai-usage__card"
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background:
                    'linear-gradient(160deg, rgba(36, 15, 22, 0.85) 0%, rgba(20, 9, 14, 0.92) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow:
                    '0 12px 28px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(251, 146, 60, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    fontFamily: RALEWAY_FONT,
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: '#fb923c',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(249, 115, 22, 0.18)',
                      border: '1px solid rgba(249, 115, 22, 0.4)',
                    }}
                  >
                    <Bot size={16} aria-hidden="true" />
                  </span>
                  <span>{pickLang(HOME_COPY.codingAgentsTitle, lang)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {aiUsage.codingAgents.map((agent) => (
                    <span
                      key={agent}
                      className="th-ai-usage__pill"
                      style={{
                        padding: '0.32rem 0.72rem',
                        borderRadius: '8px',
                        fontFamily: RALEWAY_FONT,
                        fontSize: '0.79rem',
                        fontWeight: 600,
                        color: '#fff8f1',
                        background: 'rgba(18, 8, 12, 0.86)',
                        border: '1px solid rgba(249, 115, 22, 0.36)',
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
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background:
                    'linear-gradient(160deg, rgba(36, 15, 22, 0.85) 0%, rgba(20, 9, 14, 0.92) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow:
                    '0 12px 28px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    fontFamily: RALEWAY_FONT,
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: '#fbbf24',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(251, 191, 36, 0.16)',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                    }}
                  >
                    <GitBranch size={16} aria-hidden="true" />
                  </span>
                  <span>{pickLang(HOME_COPY.orchestrationTitle, lang)}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: RALEWAY_FONT,
                    fontSize: '0.84rem',
                    lineHeight: 1.55,
                    color: '#f3dfd1',
                  }}
                >
                  {aiUsage.orchestrationNote}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {aiUsage.workflowAi.map((tool) => (
                    <span
                      key={tool}
                      className="th-ai-usage__pill"
                      style={{
                        padding: '0.32rem 0.72rem',
                        borderRadius: '8px',
                        fontFamily: RALEWAY_FONT,
                        fontSize: '0.79rem',
                        fontWeight: 600,
                        color: '#fdba74',
                        background: 'rgba(18, 8, 12, 0.86)',
                        border: '1px solid rgba(251, 191, 36, 0.36)',
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
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background:
                    'linear-gradient(160deg, rgba(36, 15, 22, 0.85) 0%, rgba(20, 9, 14, 0.92) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow:
                    '0 12px 28px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(251, 113, 133, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    fontFamily: RALEWAY_FONT,
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: '#fda4af',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(251, 113, 133, 0.16)',
                      border: '1px solid rgba(251, 113, 133, 0.4)',
                    }}
                  >
                    <Layers size={16} aria-hidden="true" />
                  </span>
                  <span>{pickLang(HOME_COPY.contractsTitle, lang)}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: RALEWAY_FONT,
                    fontSize: '0.84rem',
                    lineHeight: 1.55,
                    color: '#f3dfd1',
                  }}
                >
                  {pickLang(HOME_COPY.contractsDesc, lang)}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
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
                          padding: '0.22rem 0.56rem',
                          borderRadius: '6px',
                          fontFamily: RALEWAY_FONT,
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          color: '#fdba74',
                          background: 'rgba(18, 8, 12, 0.86)',
                          border: '1px solid rgba(251, 113, 133, 0.36)',
                        }}
                      >
                        {entry.file}
                      </code>
                      <span
                        style={{
                          fontFamily: RALEWAY_FONT,
                          fontSize: '0.79rem',
                          color: '#c4a99a',
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
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background:
                    'linear-gradient(160deg, rgba(36, 15, 22, 0.85) 0%, rgba(20, 9, 14, 0.92) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow:
                    '0 12px 28px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(253, 186, 116, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    fontFamily: RALEWAY_FONT,
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    color: '#fdba74',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(253, 186, 116, 0.16)',
                      border: '1px solid rgba(253, 186, 116, 0.4)',
                    }}
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                  </span>
                  <span>{pickLang(HOME_COPY.humanTitle, lang)}</span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: RALEWAY_FONT,
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    color: '#f3dfd1',
                  }}
                >
                  {aiUsage.humanResponsibility}
                </p>
              </article>
            </div>
          </div>
        </GlassSurface>
      </section>

      <style>{`
        .th-home,
        .th-home * {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-home .th-mono,
        .th-home code {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .th-home .th-stack-chip {
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .th-home .th-stack-chip:hover {
          transform: translateY(-1px);
          border-color: rgba(249, 115, 22, 0.72) !important;
          background: rgba(36, 15, 22, 0.92) !important;
        }
        .th-home .th-ai-usage__card {
          transition: transform 0.22s ease, border-color 0.22s ease;
        }
        .th-home .th-ai-usage__card:hover {
          transform: translateY(-2px);
          border-color: rgba(251, 146, 60, 0.48) !important;
        }
        .th-home-top-sim-btn,
        .th-home-action-btn {
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease, filter 0.22s ease, box-shadow 0.22s ease;
        }
        .th-home-top-sim-btn:hover,
        .th-home-top-sim-btn:focus-visible,
        .th-home-action-btn:hover,
        .th-home-action-btn:focus-visible {
          transform: translateY(-2px);
          filter: brightness(1.08);
          outline: none;
        }
        @media (max-width: 900px) {
          .th-home-panel {
            width: 92vw !important;
          }
          .th-home-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .th-home-hero-logo-col {
            order: -1;
          }
        }
      `}</style>
    </section>
  );
}
