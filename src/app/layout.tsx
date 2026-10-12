import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';
import { siteConfig } from '@/config/site';
import { getDictionary } from '@/i18n';
import { OrganizationJsonLd } from '@/lib/seo/json-ld';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.tagline}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: { siteName: siteConfig.name, locale: siteConfig.locale, type: 'website' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f436c',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const t = getDictionary();
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenu"
          className="focus:bg-brand-700 sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-white"
        >
          {t.common.skipToContent}
        </a>
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <WhatsAppButton />
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
