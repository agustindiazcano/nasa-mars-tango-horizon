import type { Metadata, Viewport } from 'next';
import { Raleway } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { GalaxyBackdrop } from '@/components/ui/GalaxyBackdrop';
import { SiteNavbar } from '@/components/layout/SiteNavbar';
import { SiteFooter } from '@/components/layout/SiteFooter';

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-raleway',
  display: 'swap',
});

const SITE_URL = 'https://tangohorizon-site.vercel.app';
const SIMULATOR_URL = 'https://tangohorizon.vercel.app';
const SITE_TITLE = 'Tango Horizon: AI Systems for EVA and Mars Exploration';
const SITE_DESCRIPTION =
  'Tango Horizon: AI Systems for EVA and Mars Exploration (NASA Space Apps Challenge 2026 · Buenos Aires, Argentina). Interactive 3D Gale Crater EVA simulator, 14-agent AI hierarchy, NASA PDS machine learning models, history of space exploration, and university theses on the Moon and Mars.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090406',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Tango Horizon · NASA Space Apps',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Tango Horizon',
  category: 'science',
  keywords: [
    'Tango Horizon',
    'Mars Exploration',
    'Exploración de Marte',
    'NASA Space Apps Challenge 2026',
    'Mars 3D Simulator',
    'Simulador 3D Marte',
    'Gale Crater',
    'EVA AI Systems',
    'CONAE Argentina',
    'Universidad de Palermo',
    'UTN FRBA',
    'Agustin Diaz-Cano',
    'Baltazar Salerno',
    'Milagros Sotelo',
    'Federico Yaconis',
    'Areology',
    'Selenology',
    'NASA PDS Machine Learning',
  ],
  authors: [
    { name: 'Agustín Díaz-Cano', url: 'https://www.agustindiazcano.com/' },
    { name: 'Baltazar Salerno', url: 'https://github.com/S-Baltazar' },
    { name: 'Milagros Sotelo', url: 'https://github.com/Milagros-Sotelo' },
    { name: 'Federico Yaconis' },
  ],
  creator: 'Team Tango Horizon',
  publisher: 'Team Tango Horizon',
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
      'es-AR': '/',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/images/tango-horizon-mars-exploration-logo.jpeg',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
    siteName: 'Tango Horizon',
    images: [
      {
        url: '/images/tango-horizon-mars-exploration-logo.jpeg',
        width: 1024,
        height: 1024,
        alt: 'Tango Horizon: AI Systems for EVA and Mars Exploration emblem',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/images/tango-horizon-mars-exploration-logo.jpeg'],
  },
  other: {
    'article:published_time': '2026-11-15',
    'article:modified_time': '2026-11-15',
    'og:updated_time': '2026-11-15',
  },
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      inLanguage: ['en-US', 'es-AR'],
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Team Tango Horizon',
      url: SITE_URL,
      logo: `${SITE_URL}/images/tango-horizon-mars-exploration-logo.jpeg`,
      sameAs: [
        'https://github.com/agustindiazcano/nasa-mars-tango-horizon',
        SIMULATOR_URL,
      ],
      member: [
        {
          '@type': 'Person',
          name: 'Agustín Díaz-Cano',
          jobTitle: 'Team Lead & AI / Full-Stack Architect',
          url: 'https://www.agustindiazcano.com/',
        },
        {
          '@type': 'Person',
          name: 'Baltazar Salerno',
          jobTitle: 'Frontend Developer',
          url: 'https://github.com/S-Baltazar',
        },
        {
          '@type': 'Person',
          name: 'Milagros Sotelo',
          jobTitle: 'Full Stack & 3D',
          url: 'https://github.com/Milagros-Sotelo',
        },
        {
          '@type': 'Person',
          name: 'Federico Yaconis',
          jobTitle: '3D Developer & QA',
        },
      ],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SIMULATOR_URL}/#simulator`,
      name: 'Tango Horizon 3D Mars EVA Simulator',
      applicationCategory: 'EducationalApplication, SimulationApplication',
      operatingSystem: 'WebGL2 Browser',
      url: SIMULATOR_URL,
      description:
        'Real-time 3D Martian EVA operations simulator in Gale Crater featuring a 14-agent AI hierarchy, 3-layer GUARDIAN safety consensus, <2 ms offline BM25 RAG, and 3 ML models trained on NASA PDS data.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${raleway.variable}`}>
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          backgroundColor: '#090406',
          color: '#fff8f1',
          fontFamily: "var(--font-raleway), 'Raleway', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflowX: 'hidden',
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <a href="#main-content" className="th-skip-link">
          Skip to main content / Saltar al contenido principal
        </a>
        <LanguageProvider>
          <GalaxyBackdrop />
          <SiteNavbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="site-main"
            style={{
              position: 'relative',
              zIndex: 10,
              flex: '1 0 auto',
              width: '100%',
              outline: 'none',
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
