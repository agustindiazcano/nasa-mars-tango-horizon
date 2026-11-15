import type { Metadata } from 'next';
import { ThesisReader } from '@/components/sections/ThesisReader';

export const metadata: Metadata = {
  title: 'Lunar Thesis · The Conquest of the Moon',
  description:
    'Academic thesis on selenology, Mesopotamian and Hellenistic archaeoastronomy, Galileo’s telescopic optics, Tsiolkovsky–Houbolt orbital mechanics, and the Apollo Program.',
  alternates: {
    canonical: '/tesis-lunar',
  },
  openGraph: {
    title: 'Lunar Thesis · The Conquest of the Moon | Tango Horizon',
    description:
      'Academic thesis on selenology, archaeoastronomy, telescopic optics, Tsiolkovsky–Houbolt orbital mechanics, and the Apollo Program.',
    url: 'https://tangohorizon-site.vercel.app/tesis-lunar',
    type: 'article',
    locale: 'en_US',
    alternateLocale: ['es_AR'],
  },
};

export default function TesisLunarPage() {
  return <ThesisReader variant="moon" />;
}
