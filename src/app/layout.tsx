import type { Metadata, Viewport } from 'next';
import { type ReactNode, ViewTransition } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { WhatsAppButton } from '@/components/layout/whatsapp-button';
import { siteConfig } from '@/config/site';
import { getDictionary } from '@/i18n';
import { OrganizationJsonLd } from '@/lib/seo/json-ld';
import { displayFont } from './fonts/display';
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
  // Valeur littérale exigée par la balise meta : jeton --color-canvas (neutral-25).
  themeColor: '#fcfbf8',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const t = getDictionary();
  return (
    <html lang="fr" className={displayFont.variable}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenu"
          className="focus:bg-brand focus:text-on-brand focus:rounded-control sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-float) focus:px-4 focus:py-3 focus:font-semibold"
        >
          {t.common.skipToContent}
        </a>
        <SiteHeader />
        <main id="contenu" tabIndex={-1} className="flex-1 focus:outline-none">
          {/* Transition entre pages : fondu court du contenu, l'en-tête reste immobile (F-013). */}
          <ViewTransition default="page">{children}</ViewTransition>
        </main>
        <SiteFooter />
        <WhatsAppButton />
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
