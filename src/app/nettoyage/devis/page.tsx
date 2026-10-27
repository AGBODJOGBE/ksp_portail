import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { getMetier } from '@/config/metiers';
import { QuoteRequestPanel, cleaningTexts } from '@/features/cleaning';
import { RequireSession } from '@/features/identity';
import { pageMetadata } from '@/lib/seo/metadata';

const t = cleaningTexts.request;

export const metadata: Metadata = {
  ...pageMetadata({ title: t.title, path: '/nettoyage/devis' }),
  robots: { index: false, follow: false },
};

/**
 * Demande de devis de nettoyage : coque statique ; la garde reprend la session (sinon connexion puis
 * retour ici, simulation comprise dans l'adresse), le formulaire lit la simulation sous Suspense.
 */
export default function CleaningQuotePage() {
  return (
    <Container size="reading" className="py-10 sm:py-16">
      <Eyebrow>{getMetier('nettoyage').label}</Eyebrow>
      <Heading as="h1" size="h1" className="mt-5">
        {t.title}
      </Heading>
      <p className="text-ink-muted mt-3">{t.lead}</p>
      <div className="mt-8">
        <RequireSession>
          <Suspense
            fallback={
              <p role="status" className="text-ink-muted">
                {cleaningTexts.space.loading}
              </p>
            }
          >
            <QuoteRequestPanel />
          </Suspense>
        </RequireSession>
      </div>
    </Container>
  );
}
