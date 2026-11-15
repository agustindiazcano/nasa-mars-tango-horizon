import type { Metadata } from 'next';
import { SlidesDeckView } from '@/components/sections/SlidesDeckView';

export const metadata: Metadata = {
  title: 'Slides & 10-Slide Pitch Deck | Tango Horizon',
  description:
    'Interactive 10-slide presentation deck for Tango Horizon (2026-11-15): 14-agent hierarchy, 5-language hands-free voice, <2 ms BM25 RAG, 3 NASA PDS ML validation charts, 4-DOF IK robotics, and S1–S7 autonomous Gale Crater rescue.',
  openGraph: {
    title: 'Slides & 10-Slide Pitch Deck | Tango Horizon',
    description:
      'Explore the 10-slide NASA Space Apps Challenge 2026 pitch deck with interactive navigation, speaker pitch cues, and ML validation figures.',
    type: 'website',
    locale: 'en_US',
  },
  other: {
    'article:published_time': '2026-11-15',
    'article:modified_time': '2026-11-15',
  },
};

export default function SlidesPage() {
  return <SlidesDeckView />;
}
