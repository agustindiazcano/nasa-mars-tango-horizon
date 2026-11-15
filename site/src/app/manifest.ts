import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tango Horizon: AI Systems for EVA and Mars Exploration',
    short_name: 'Tango Horizon',
    description:
      'Interactive Mars Exploration compendium, theoretical theses on Selenology and Areology, 10-slide pitch deck, and 3D Gale Crater EVA operations simulator for the NASA Space Apps Challenge 2026.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090406',
    theme_color: '#f97316',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/images/tango-horizon-mars-exploration-logo.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
