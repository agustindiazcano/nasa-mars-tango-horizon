import type { Metadata } from 'next';
import { ThesisReader } from '@/components/sections/ThesisReader';

export const metadata: Metadata = {
  title: 'Theoretical Theses · Lunar & Mars Exploration | Tango Horizon Project',
  description:
    'Unified academic theses on Selenology (The Conquest of the Moon) and Areology (Mars Exploration, Orbital Mechanics, ISRU & Planetary Protection).',
};

export default function UnifiedThesisPage() {
  return <ThesisReader variant="mars" />;
}
