import type { Metadata } from 'next';
import { ProjectLandingView } from '@/components/sections/ProjectLandingView';

export const metadata: Metadata = {
  title: 'Tango Horizon Project | AI Systems for EVA, Robotics & Mars Simulation',
  description:
    'Tango Horizon: AI Systems for EVA and Mars Exploration (2026-11-15). Real-time 3D Gale Crater mission simulator, 5-language hands-free voice, 14 agents with 3-layer GUARDIAN safety, <2 ms BM25 RAG, and 3 ML models trained on real NASA PDS data.',
  openGraph: {
    title: 'Tango Horizon Project | AI Systems for EVA, Robotics & Mars Simulation',
    description:
      'WebGL2 3D Gale Crater simulation, 14-agent hierarchy, 3-layer GUARDIAN consensus, NASA PDS ML models, and S1–S7 autonomous crew rescue.',
    type: 'website',
    locale: 'en_US',
  },
  other: {
    'article:published_time': '2026-11-15',
    'article:modified_time': '2026-11-15',
  },
};

export default function ProyectoPage() {
  return <ProjectLandingView />;
}
