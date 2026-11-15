import type { Metadata } from 'next';
import { TeamView } from '@/components/sections/TeamView';

export const metadata: Metadata = {
  title: 'Team Tango Horizon · NASA Space Apps Challenge 2026',
  description:
    'Meet Team Tango Horizon (Agustín Díaz-Cano, Baltazar Salerno, Milagros Sotelo, and Federico Yaconis), creators of the 3D Mars EVA operations simulator (2026-11-15).',
  alternates: {
    canonical: '/equipo',
  },
  openGraph: {
    title: 'Team Tango Horizon · NASA Space Apps Challenge 2026',
    description:
      'Multi-agent EVA assistance, deterministic offline physics, HiRISE Gale Crater cartography, and interactive space science outreach.',
    url: 'https://tangohorizon-site.vercel.app/equipo',
    type: 'profile',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
};

export default function EquipoPage() {
  return <TeamView />;
}
