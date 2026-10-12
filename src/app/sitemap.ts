import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/** Pages publiques à référencer. Les pages issues du CMS et du catalogue s'ajouteront ici. */
const STATIC_PATHS = ['/', ...siteConfig.legal.map((item) => item.href)];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({
    url: new URL(path, siteConfig.url).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'yearly',
    priority: path === '/' ? 1 : 0.3,
  }));
}
