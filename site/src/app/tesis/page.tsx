import type { Metadata } from 'next';
import { ThesisReader } from '@/components/sections/ThesisReader';

export const metadata: Metadata = {
  title: 'Theoretical Theses · Lunar & Mars Exploration',
  description:
    'Unified academic theses on Selenology (The Conquest of the Moon) and Areology (Mars Exploration, Orbital Mechanics, ISRU & Planetary Protection) by Team Tango Horizon.',
  alternates: {
    canonical: '/tesis',
  },
  openGraph: {
    title: 'Theoretical Theses · Lunar & Mars Exploration | Tango Horizon',
    description:
      'University-grade monographs on Selenology, Areology, Hohmann orbital transfers, Sabatier ISRU synthesis, and Martian human habitability.',
    url: 'https://tangohorizon-site.vercel.app/tesis',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
};

export default function UnifiedThesisPage() {
  return <ThesisReader variant="mars" />;
}
