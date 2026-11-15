import type { Metadata } from 'next';
import { ThesisReader } from '@/components/sections/ThesisReader';

export const metadata: Metadata = {
  title: 'Lunar Thesis · The Conquest of the Moon | Tango Horizon Project',
  description:
    'Academic thesis on selenology, Mesopotamian and Hellenistic archaeoastronomy, Galileo’s telescopic optics, Tsiolkovsky–Houbolt orbital mechanics, and the Apollo Program.',
};

export default function TesisLunarPage() {
  return <ThesisReader variant="moon" />;
}
