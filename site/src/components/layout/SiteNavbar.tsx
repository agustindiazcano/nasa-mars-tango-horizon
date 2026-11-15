'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, Globe, Menu, X } from 'lucide-react';
import { BiText, pickLang, useLanguage } from '@/context/LanguageContext';

interface NavItem {
  href: string;
  label: BiText;
  accent: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: { en: 'Home', es: 'Inicio' }, accent: '#fbbf24' },
  {
    href: '/proyecto',
    label: { en: 'Tango Horizon Project', es: 'Tango Horizon Project' },
    accent: '#f97316',
  },
  { href: '/slides', label: { en: 'Slides', es: 'Slides' }, accent: '#fb923c' },
  { href: '/equipo', label: { en: 'Team', es: 'Team' }, accent: '#fb7185' },
  { href: '/cronologia', label: { en: 'Timeline', es: 'Cronología' }, accent: '#fda4af' },
  { href: '/tesis-lunar', label: { en: 'Lunar Thesis', es: 'Tesis Lunar' }, accent: '#f59e0b' },
  { href: '/tesis-marte', label: { en: 'Mars Thesis', es: 'Tesis Marte' }, accent: '#ea580c' },
  { href: '/marte', label: { en: 'Mars I–III', es: 'Marte I–III' }, accent: '#fdba74' },
  { href: '/compendio', label: { en: 'Compendium', es: 'Compendio' }, accent: '#f43f5e' },
];

const SIMULATOR_URL = 'https://tangohorizon.vercel.app';

export function SiteNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, toggleLang } = useLanguage();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isRouteActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const langToggleAriaLabel = pickLang(lang, {
    en: 'Switch language to Spanish (ES)',
    es: 'Cambiar idioma a inglés (EN)',
  });

  return (
    <header className="site-nav">
      <div className="site-nav__inner">
        <Link
          href="/"
          className="site-nav__brand"
          aria-label={pickLang(lang, {
            en: 'Tango Horizon - Home',
            es: 'Tango Horizon - Inicio',
          })}
        >
          <img
            src="/images/tango-horizon-mars-exploration-logo.jpeg"
            alt="Tango Horizon"
            width={34}
            height={34}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '2px',
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid rgba(255, 255, 255, 0.24)',
              boxShadow: 'none',
            }}
          />
          <span className="site-nav__brand-text">
            <span
              className="site-nav__title"
              style={{ fontFamily: "var(--font-raleway), 'Raleway', sans-serif" }}
            >
              Tango Horizon
            </span>
            <span className="site-nav__kicker">EVA &amp; MARS EXPLORATION</span>
          </span>
        </Link>

        <nav
          className="site-nav__links"
          aria-label={pickLang(lang, {
            en: 'Primary navigation',
            es: 'Navegación principal',
          })}
        >
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`site-nav__pill${active ? ' site-nav__pill--active' : ''}`}
                style={
                  {
                    '--nav-accent': item.accent,
                    borderRadius: '2px',
                    height: '38px',
                  } as React.CSSProperties
                }
                aria-current={active ? 'page' : undefined}
              >
                <span className="site-nav__pill-dot" aria-hidden="true" />
                <span>{pickLang(lang, item.label)}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
          <button
            type="button"
            className="site-lang-toggle site-lang-toggle--desktop"
            style={{ borderRadius: '2px', height: '38px' }}
            onClick={toggleLang}
            aria-label={langToggleAriaLabel}
            aria-pressed={lang === 'es'}
            title={langToggleAriaLabel}
          >
            <Globe size={14} className="site-lang-toggle__icon" aria-hidden="true" />
            <span className="site-lang-toggle__pills">
              <span
                className={`site-lang-toggle__pill${lang === 'en' ? ' site-lang-toggle__pill--active' : ''}`}
                style={{ borderRadius: '2px' }}
              >
                EN
              </span>
              <span className="site-lang-toggle__sep" aria-hidden="true">
                /
              </span>
              <span
                className={`site-lang-toggle__pill${lang === 'es' ? ' site-lang-toggle__pill--active' : ''}`}
                style={{ borderRadius: '2px' }}
              >
                ES
              </span>
            </span>
          </button>

          <a
            href={SIMULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-nav__cta"
            style={{ borderRadius: '2px', height: '38px' }}
          >
            <span>{pickLang(lang, { en: '3D Simulator ↗', es: 'Simulador 3D ↗' })}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>

          <button
            type="button"
            className="site-nav__menu-btn"
            style={{ borderRadius: '2px', width: '38px', height: '38px' }}
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="site-nav-mobile-drawer"
            aria-label={
              mobileOpen
                ? pickLang(lang, {
                    en: 'Close navigation menu',
                    es: 'Cerrar menú de navegación',
                  })
                : pickLang(lang, {
                    en: 'Open navigation menu',
                    es: 'Abrir menú de navegación',
                  })
            }
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        id="site-nav-mobile-drawer"
        className={`site-nav__drawer${mobileOpen ? ' site-nav__drawer--open' : ''}`}
        style={{ borderRadius: '2px' }}
        aria-label={pickLang(lang, {
          en: 'Mobile navigation',
          es: 'Navegación móvil',
        })}
      >
        {NAV_ITEMS.map((item) => {
          const active = isRouteActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`site-nav__drawer-link${active ? ' site-nav__drawer-link--active' : ''}`}
              style={{ '--nav-accent': item.accent, borderRadius: '2px' } as React.CSSProperties}
              aria-current={active ? 'page' : undefined}
            >
              <span>{pickLang(lang, item.label)}</span>
              <span
                className="site-nav__pill-dot"
                style={{ opacity: active ? 1 : 0.55 }}
                aria-hidden="true"
              />
            </Link>
          );
        })}

        <button
          type="button"
          className="site-lang-toggle site-lang-toggle--drawer"
          style={{ borderRadius: '2px' }}
          onClick={toggleLang}
          aria-label={langToggleAriaLabel}
          aria-pressed={lang === 'es'}
        >
          <span className="site-lang-toggle__label">
            <Globe size={15} className="site-lang-toggle__icon" aria-hidden="true" />
            <span>{pickLang(lang, { en: 'Language:', es: 'Idioma:' })}</span>
          </span>
          <span className="site-lang-toggle__pills">
            <span
              className={`site-lang-toggle__pill${lang === 'en' ? ' site-lang-toggle__pill--active' : ''}`}
              style={{ borderRadius: '2px' }}
            >
              EN
            </span>
            <span className="site-lang-toggle__sep" aria-hidden="true">
              /
            </span>
            <span
              className={`site-lang-toggle__pill${lang === 'es' ? ' site-lang-toggle__pill--active' : ''}`}
              style={{ borderRadius: '2px' }}
            >
              ES
            </span>
          </span>
        </button>

        <a
          href={SIMULATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="site-nav__cta"
          style={{
            justifyContent: 'center',
            marginTop: '0.35rem',
            borderRadius: '2px',
          }}
          onClick={() => setMobileOpen(false)}
        >
          <span>{pickLang(lang, { en: 'Open 3D Simulator ↗', es: 'Abrir Simulador 3D ↗' })}</span>
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}

export default SiteNavbar;
