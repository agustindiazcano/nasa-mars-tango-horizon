'use client';

import Link from 'next/link';
import { Database, ExternalLink, Github, Rocket, ShieldCheck } from 'lucide-react';
import { BiText, pickLang, useLanguage } from '@/context/LanguageContext';

interface FooterLinkItem {
  href: string;
  label: BiText;
}

interface MemberLink {
  label: string;
  url: string;
}

interface TeamFooterMember {
  name: string;
  role: BiText;
  links: MemberLink[];
}

interface SponsorItem {
  name: string;
  subtitle: BiText;
  url: string;
}

const INTERNAL_LINKS: FooterLinkItem[] = [
  { href: '/', label: { en: 'Home · Tango Horizon', es: 'Inicio · Tango Horizon' } },
  {
    href: '/proyecto',
    label: { en: 'Tango Horizon Project', es: 'Tango Horizon Project' },
  },
  {
    href: '/slides',
    label: { en: 'Slides · 10-Slide Deck', es: 'Slides · Presentación (10 Diapositivas)' },
  },
  {
    href: '/sources',
    label: { en: 'NASA Data Sources & References', es: 'Fuentes de Datos NASA y Referencias' },
  },
  { href: '/equipo', label: { en: 'Team', es: 'Team' } },
  {
    href: '/cronologia',
    label: {
      en: 'Space Exploration Timeline',
      es: 'Cronología de la Exploración Espacial',
    },
  },
  {
    href: '/tesis-lunar',
    label: {
      en: 'Thesis I · The Conquest of the Moon',
      es: 'Tesis I · La Conquista de la Luna',
    },
  },
  {
    href: '/tesis-marte',
    label: {
      en: 'Thesis II · The Conquest of Mars',
      es: 'Tesis II · La Conquista de Marte',
    },
  },
  {
    href: '/marte',
    label: {
      en: 'Mars I–III · Operational Phases',
      es: 'Marte I–III · Fases Operativas',
    },
  },
  {
    href: '/compendio',
    label: {
      en: 'General Compendium & NASA Gallery',
      es: 'Compendio General y Galería NASA',
    },
  },
];

const TEAM_FOOTER_MEMBERS: TeamFooterMember[] = [
  {
    name: 'Agustin Diaz-Cano',
    role: {
      en: 'MS Candidate, Systems Engineering (UTN FRBA)',
      es: 'Maestrando en Ingeniería en Sistemas (UTN FRBA)',
    },
    links: [
      { label: 'UTN FRBA', url: 'https://frba.utn.edu.ar/' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/agustindiazcano/' },
      { label: 'Portfolio', url: 'https://www.agustindiazcano.com/' },
      { label: 'GitHub', url: 'https://github.com/agustindiazcano' },
      { label: 'Qollab', url: 'https://qollab.xyz/u/agustindiazcano' },
      { label: 'YouTube', url: 'https://www.youtube.com/@agustin-diaz-cano' },
    ],
  },
  {
    name: 'Baltazar Salerno',
    role: {
      en: 'Frontend Developer',
      es: 'Desarrollador Frontend',
    },
    links: [{ label: 'GitHub', url: 'https://github.com/S-Baltazar' }],
  },
  {
    name: 'Milagros Sotelo',
    role: {
      en: 'Systems Engineering Student (UTN FRBA)',
      es: 'Estudiante de Ingeniería en Sistemas (UTN FRBA)',
    },
    links: [
      { label: 'UTN FRBA', url: 'https://frba.utn.edu.ar/' },
      { label: 'GitHub', url: 'https://github.com/Milagros-Sotelo' },
    ],
  },
  {
    name: 'Federico Yaconis',
    role: {
      en: '3D Developer & QA',
      es: 'Desarrollador 3D y QA',
    },
    links: [],
  },
];

const SPONSORS: SponsorItem[] = [
  {
    name: 'NASA',
    subtitle: { en: 'Open Planetary Data & 3D Resources', es: 'Datos Planetarios Abiertos y Recursos 3D' },
    url: 'https://www.nasa.gov/',
  },
  {
    name: 'NASA Space Apps Challenge',
    subtitle: { en: '2026 Global Hackathon', es: 'Hackatón Global 2026' },
    url: 'https://www.spaceappschallenge.org/',
  },
  {
    name: 'CONAE',
    subtitle: { en: 'Argentine Space Agency', es: 'Comisión Nacional de Actividades Espaciales' },
    url: 'https://www.argentina.gob.ar/ciencia/conae',
  },
  {
    name: 'Universidad de Palermo',
    subtitle: { en: 'Buenos Aires Host Node', es: 'Sede Buenos Aires' },
    url: 'https://www.palermo.edu/',
  },
  {
    name: 'IBM',
    subtitle: { en: 'IBM Argentina Support', es: 'Apoyo IBM Argentina' },
    url: 'https://www.ibm.com/ar-es',
  },
];

const SIMULATOR_URL = 'https://tangohorizon.vercel.app';
const GITHUB_URL = 'https://github.com/agustindiazcano/nasa-mars-tango-horizon';

export function SiteFooter() {
  const { lang } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="site-footer__glow" aria-hidden="true" />
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <div className="site-footer__badge">NASA SPACE APPS CHALLENGE 2026 · 2026-11-15</div>
          <h2 className="site-footer__heading">Tango Horizon</h2>
          <p className="site-footer__desc">
            {pickLang(lang, {
              en: 'Real-time 3D Mars EVA operations simulator, hierarchical multi-agent AI runtime, NASA/USGS Gale Crater cartography, space theses, and open scientific tooling.',
              es: 'Simulador 3D en tiempo real de operaciones EVA en Marte, arquitectura multi-agente de IA, cartografía NASA/USGS del Cráter Gale, tesis espaciales y herramientas científicas abiertas.',
            })}
          </p>
          <div className="site-footer__telemetry">
            <span>● LEO 408 KM</span>
            <span>{pickLang(lang, { en: '● MOON 384,400 KM', es: '● LUNA 384.400 KM' })}</span>
            <span>{pickLang(lang, { en: '● MARS 225M KM', es: '● MARTE 225M KM' })}</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              marginTop: '0.65rem',
            }}
          >
            <a
              href={SIMULATOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer__cta"
            >
              <Rocket size={15} aria-hidden="true" />
              <span>
                {pickLang(lang, {
                  en: '3D Simulator (Real AI) ↗',
                  es: 'Simulador 3D (IA Real) ↗',
                })}
              </span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer__cta"
              style={{
                background: 'rgba(15, 23, 42, 0.78)',
                borderColor: 'rgba(148, 163, 184, 0.38)',
                color: '#f8fafc',
              }}
            >
              <Github size={15} aria-hidden="true" />
              <span>GitHub · nasa-mars-tango-horizon</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>

            <Link
              href="/sources"
              className="site-footer__cta"
              style={{
                background: 'rgba(14, 165, 233, 0.14)',
                borderColor: 'rgba(56, 189, 248, 0.42)',
                color: '#bae6fd',
              }}
            >
              <Database size={15} aria-hidden="true" />
              <span>
                {pickLang(lang, {
                  en: 'Data Sources & NASA APIs',
                  es: 'Fuentes de Datos y APIs NASA',
                })}
              </span>
            </Link>
          </div>
        </div>

        <div className="site-footer__col">
          <span className="site-footer__col-title">
            {pickLang(lang, { en: 'Modules & Sections', es: 'Módulos y Secciones' })}
          </span>
          <ul className="site-footer__list">
            {INTERNAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="site-footer__link">
                  → {pickLang(lang, item.label)}
                </Link>
              </li>
            ))}
          </ul>

          <span className="site-footer__col-title" style={{ marginTop: '0.85rem' }}>
            {pickLang(lang, {
              en: 'Institutional Sponsors & Support',
              es: 'Sponsors y Apoyo Institucional',
            })}
          </span>
          <ul className="site-footer__list">
            {SPONSORS.map((sponsor) => (
              <li key={sponsor.name}>
                <a
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-footer__link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>↗ {sponsor.name}</span>
                  <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>
                    — {pickLang(lang, sponsor.subtitle)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__col">
          <span className="site-footer__col-title">
            {pickLang(lang, {
              en: 'Team Tango Horizon & Links',
              es: 'Equipo Tango Horizon y Enlaces',
            })}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {TEAM_FOOTER_MEMBERS.map((member) => (
              <div
                key={member.name}
                style={{
                  padding: '0.55rem 0.7rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.56)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#f8fafc' }}>
                  {member.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                  {pickLang(lang, member.role)}
                </div>
                {member.links.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem 0.6rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    {member.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="site-footer__link"
                        style={{
                          fontSize: '0.75rem',
                          color: '#7df9ff',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                        }}
                      >
                        {link.label} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.72rem 0.85rem',
              borderRadius: '12px',
              background: 'rgba(249, 115, 22, 0.08)',
              border: '1px solid rgba(251, 146, 60, 0.32)',
              fontSize: '0.77rem',
              lineHeight: 1.5,
              color: '#fed7aa',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                color: '#fdba74',
                marginBottom: '0.25rem',
              }}
            >
              <ShieldCheck size={14} aria-hidden="true" />
              <span>
                {pickLang(lang, {
                  en: '3D Models Free-to-Use Disclaimer (CC BY 4.0)',
                  es: 'Disclaimer de Modelos 3D Libres (CC BY 4.0)',
                })}
              </span>
            </div>
            <p style={{ margin: 0, color: '#e2e8f0' }}>
              {pickLang(lang, {
                en: 'All 3D models created by Team Tango Horizon are free to use under Creative Commons Attribution 4.0 International (CC BY 4.0) for personal, educational, commercial, and illustration purposes.',
                es: 'Todos los modelos 3D creados por el equipo Tango Horizon son libres para uso personal, educativo, comercial e ilustraciones bajo licencia Creative Commons Atribución 4.0 Internacional (CC BY 4.0).',
              })}{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#7df9ff', textDecoration: 'underline' }}
              >
                CC BY 4.0 ↗
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>
          © 2026 Agustin Diaz-Cano, Baltazar Salerno, Milagros Sotelo &amp; Federico Yaconis ·
          MIT License (Software) &amp; CC BY 4.0 (3D Models) · 2026-11-15
        </span>
        <span>NASA Space Apps Challenge 2026 · Next.js &amp; WebGL</span>
      </div>
    </footer>
  );
}

export default SiteFooter;
