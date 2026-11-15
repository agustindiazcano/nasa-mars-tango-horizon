import type { Metadata } from 'next';
import { MarsPhasesReader } from '@/components/sections/MarsPhasesReader';

export const metadata: Metadata = {
  title: 'Mars Exploration I–III · Operational Phases',
  description:
    'A three-phase journey through Martian exploration: Mars I (observation & orbit), Mars II (probes & rovers), and Mars III (human missions, ISRU, lava tubes, and Tango Horizon operations).',
  alternates: {
    canonical: '/marte',
  },
  openGraph: {
    title: 'Mars Exploration I–III · Operational Phases | Tango Horizon',
    description:
      'Mars I orbital telemetry, Mars II autonomous rovers, and Mars III human EVA bases, Sabatier ISRU, and lava tube habitats.',
    url: 'https://tangohorizon-site.vercel.app/marte',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
};

export default function MartePage() {
  return <MarsPhasesReader />;
}
