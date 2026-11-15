import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { GalaxyBackdrop } from '@/components/ui/GalaxyBackdrop';
import { SiteNavbar } from '@/components/layout/SiteNavbar';
import { SiteFooter } from '@/components/layout/SiteFooter';

const SITE_TITLE = 'Tango Horizon: AI Systems for EVA and Mars Exploration';
const SITE_DESCRIPTION =
  'Tango Horizon: AI Systems for EVA and Mars Exploration (NASA Space Apps Challenge 2026 · 2026-11-15). History of space exploration, university theses on the Moon and Mars, project architecture, and direct access to the interactive 3D EVA operations simulator.';

export const metadata: Metadata = {
  metadataBase: new URL('https://tangohorizon-site.vercel.app'),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
    siteName: 'Tango Horizon',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  other: {
    'article:published_time': '2026-11-15',
    'article:modified_time': '2026-11-15',
    'og:updated_time': '2026-11-15',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          backgroundColor: '#050508',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflowX: 'hidden',
        }}
      >
        <LanguageProvider>
          <GalaxyBackdrop />
          <SiteNavbar />
          <main
            className="site-main"
            style={{
              position: 'relative',
              zIndex: 10,
              flex: '1 0 auto',
              width: '100%',
            }}
          >
            {children}
          </main>
          <SiteFooter />
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  );
}
