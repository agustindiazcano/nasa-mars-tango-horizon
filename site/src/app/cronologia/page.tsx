import type { Metadata } from 'next';
import { TimelineExperience } from '@/components/sections/TimelineExperience';

export const metadata: Metadata = {
  title: 'Cosmic Timeline · History of Space Exploration',
  description:
    'Interactive five-stage historical journey from archaeoastronomy and geocentrism to orbital physics, the Space Race, the James Webb Space Telescope, and the Martian horizon. Tango Horizon Edition (2026-11-15).',
  alternates: {
    canonical: '/cronologia',
  },
  openGraph: {
    title: 'Cosmic Timeline · History of Space Exploration | Tango Horizon',
    description:
      'Interactive five-stage historical journey from ancient archaeoastronomy to the Martian horizon.',
    url: 'https://tangohorizon-site.vercel.app/cronologia',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
};

export default function CronologiaPage() {
  return <TimelineExperience />;
}
