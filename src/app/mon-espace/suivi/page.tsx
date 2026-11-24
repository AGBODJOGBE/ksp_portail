import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { EmptyState } from '@/components/ui/empty-state';
import { Eyebrow } from '@/components/ui/eyebrow';
import { IconArrowLeft } from '@/components/ui/icons';
import { navigation } from '@/config/navigation';
import { trackingTexts as t } from '@/features/cleaning';
import { RequireSession } from '@/features/identity';
import { paymentPaths } from '@/features/payment';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({ title: t.title, path: navigation.track.href }),
  robots: { index: false, follow: false },
};

/**
 * « Suivre ma demande » (F-020) : l'avancement des demandes du client, tous services confondus. Le
 * Nettoyage, seul service suivi ici jusqu'à présent, prépare sa nouvelle version (v2) : la page reste
 * en place (lien de l'en-tête), avec un état vide, et son suivi reviendra au lot suivant.
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
          <header className="max-w-reading mt-4 mb-10">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h1 className="font-display text-h1 text-ink mt-3 font-bold">{t.title}</h1>
            <p className="text-lead text-ink-muted mt-3">{t.lead}</p>
          </header>
          <section
            aria-labelledby="suivi-vide-titre"
            className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
          >
            <EmptyState
              illustration="soon"
              title={t.emptyTitle}
              titleAs="h2"
              titleId="suivi-vide-titre"
              action={
                <ButtonLink href={paymentPaths.list} variant="secondary">
                  {t.emptyAction}
                </ButtonLink>
              }
            >
              {t.emptyText}
            </EmptyState>
          </section>
        </Container>
      </RequireSession>
    </div>
  );
}
