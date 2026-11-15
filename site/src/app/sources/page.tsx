import type { Metadata } from 'next';
import { SourcesLandingView } from '@/components/sections/SourcesLandingView';

export const metadata: Metadata = {
  title: 'Data Sources, NASA APIs & References | Tango Horizon',
  description:
    'Complete NASA, USGS, PDS, NTRS, OCHMO, ML training corpora, deterministic physics references, Space Apps Challenge 2026 links, and CC BY 4.0 3D asset licensing for Tango Horizon (2026-11-15).',
  openGraph: {
    title: 'Data Sources, NASA APIs & References | Tango Horizon',
    description:
      'Verified orbital DEMs, MSL Curiosity/Perseverance archives, NASA-STD-3001 biomedical RAG corpus, ML datasets, and CC BY 4.0 custom 3D assets.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
  other: {
    'article:published_time': '2026-11-15',
    'article:modified_time': '2026-11-15',
  },
};

export default function SourcesPage() {
  return <SourcesLandingView />;
}
