import type { Metadata } from 'next';
import { ThesisReader } from '@/components/sections/ThesisReader';

export const metadata: Metadata = {
  title: 'Mars Thesis · The Conquest of Mars | Tango Horizon Project',
  description:
    'Academic thesis on areology and interplanetary dynamics: from Tycho Brahe and Kepler’s ellipses to Hohmann transfers, Jezero rovers, and Sabatier ISRU synthesis.',
};

export default function TesisMartePage() {
  return <ThesisReader variant="mars" />;
}
