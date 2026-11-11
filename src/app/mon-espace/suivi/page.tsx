import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { IconArrowLeft } from '@/components/ui/icons';
import { navigation } from '@/config/navigation';
import { CleaningTracking, trackingTexts as t } from '@/features/cleaning';
import { ContextSwitcher, RequireSession } from '@/features/identity';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({ title: t.title, path: navigation.track.href }),
  robots: { index: false, follow: false },
};

/**
 * « Suivre ma demande » (F-020) : l'avancement de toutes les demandes du client, tous services
 * confondus, à la manière de la page Services des portails d'e-services (filtres à gauche, recherche et
 * cartes à droite). Coque statique ; garde de session et lectures dans le navigateur (F-005, option A).
 */
export default function TrackingPage() {
  return (
    <div className="bg-canvas">
      <RequireSession fallbackClassName="px-gutter max-w-wide mx-auto w-full py-10 sm:py-14">
        <Container size="wide" className="pt-8 pb-16 sm:pt-12 sm:pb-24">
          <Link
            href={navigation.account.href}
            className="text-brand-ink font-display inline-flex min-h-11 items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
          >
            <IconArrowLeft className="size-4" />
            {t.back}
          </Link>
          <header className="mt-4 mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-reading">
              <Eyebrow>{t.eyebrow}</Eyebrow>
              <h1 className="font-display text-h1 text-ink mt-3 font-bold">{t.title}</h1>
              <p className="text-lead text-ink-muted mt-3">{t.lead}</p>
            </div>
            <div className="w-full lg:w-96 lg:shrink-0">
              <ContextSwitcher />
            </div>
          </header>
          <CleaningTracking />
        </Container>
      </RequireSession>
    </div>
  );
}
