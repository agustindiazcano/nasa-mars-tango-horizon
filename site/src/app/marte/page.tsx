import type { Metadata } from 'next';
import { MarsPhasesReader } from '@/components/sections/MarsPhasesReader';

export const metadata: Metadata = {
  title: 'Mars Exploration I–III | Tango Horizon Project',
  description:
    'A three-phase journey through Martian exploration: Mars I (observation & orbit), Mars II (probes & rovers), and Mars III (human missions, ISRU, lava tubes, and Tango Horizon operations).',
};

export default function MartePage() {
  return <MarsPhasesReader />;
}
