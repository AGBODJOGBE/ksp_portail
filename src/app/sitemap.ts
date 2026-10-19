import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { metiers } from '@/content/metiers';

/** Pages publiques à référencer. Les pages issues du CMS et du catalogue s'ajouteront ici. */
const PATHS: ReadonlyArray<{
  path: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
}> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  ...metiers.map((metier) => ({ path: metier.href, priority: 0.8, changeFrequency: 'monthly' as const })),
  ...siteConfig.legal.map((item) => ({ path: item.href, priority: 0.3, changeFrequency: 'yearly' as const })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, siteConfig.url).toString(),
    changeFrequency,
    priority,
  }));
}
