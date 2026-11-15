import type { Metadata } from 'next';
import { CompendiumView } from '@/components/sections/CompendiumView';

export const metadata: Metadata = {
  title: 'Compendium & NASA Gallery | Tango Horizon',
  description:
    'Integrated synthesis of lunar and Martian modules, Earth–Moon–Mars comparison matrix, verified NASA photo gallery, and direct link to the Tango Horizon 3D simulator (2026-11-15).',
  openGraph: {
    title: 'General Compendium: Earth, Moon, Mars & Tango Horizon',
    description:
      'Verified NASA photo archive, physics synthesis, and Mars EVA engineering for the NASA International Space Apps Challenge 2026.',
    type: 'article',
    locale: 'en_US',
  },
};

export default function CompendioPage() {
  return <CompendiumView />;
}
