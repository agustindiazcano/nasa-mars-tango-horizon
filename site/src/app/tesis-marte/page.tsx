import type { Metadata } from 'next';
import { ThesisReader } from '@/components/sections/ThesisReader';

export const metadata: Metadata = {
  title: 'Mars Thesis · The Conquest of Mars',
  description:
    'Academic thesis on areology and interplanetary dynamics: from Tycho Brahe and Kepler’s ellipses to Hohmann transfers, Jezero rovers, and Sabatier ISRU synthesis.',
  alternates: {
    canonical: '/tesis-marte',
  },
  openGraph: {
    title: 'Mars Thesis · The Conquest of Mars | Tango Horizon',
    description:
      'Academic thesis on areology and interplanetary dynamics: from Kepler’s ellipses to Hohmann transfers, Jezero rovers, and Sabatier ISRU synthesis.',
    url: 'https://tangohorizon-site.vercel.app/tesis-marte',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
};

export default function TesisMartePage() {
  return <ThesisReader variant="mars" />;
}
