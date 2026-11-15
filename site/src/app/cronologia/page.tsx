import type { Metadata } from 'next';
import { TimelineExperience } from '@/components/sections/TimelineExperience';

export const metadata: Metadata = {
  title: 'Cosmic Timeline | Tango Horizon',
  description:
    'Interactive five-stage historical journey from archaeoastronomy and geocentrism to orbital physics, the Space Race, the James Webb Space Telescope, and the Martian horizon. Tango Horizon Edition (2026-11-15).',
};

export default function CronologiaPage() {
  return (
    <main>
      <TimelineExperience />
    </main>
  );
}
