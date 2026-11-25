import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/mon-espace/', '/payer/', '/signer/', '/recouvrement/'],
      },
    ],
    sitemap: new URL('/sitemap.xml', siteConfig.url).toString(),
  };
}
