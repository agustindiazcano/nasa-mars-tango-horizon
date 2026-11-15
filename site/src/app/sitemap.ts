import type { MetadataRoute } from 'next';

const BASE_URL = 'https://tangohorizon-site.vercel.app';
const LAST_MODIFIED = '2026-11-15';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/proyecto', priority: 0.95, changeFrequency: 'monthly' as const },
    { path: '/slides', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/sources', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/cronologia', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/tesis-lunar', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/tesis-marte', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/marte', priority: 0.85, changeFrequency: 'monthly' as const },
    { path: '/compendio', priority: 0.85, changeFrequency: 'monthly' as const },
    { path: '/equipo', priority: 0.8, changeFrequency: 'monthly' as const },
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path === '/' ? '' : route.path}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
