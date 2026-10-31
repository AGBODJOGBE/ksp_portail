import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignatureProgress } from '@/components/ui/brand/signature';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { getMetier } from '@/config/metiers';
import { QuoteRequestPanel, cleaningTexts, serviceJourney } from '@/features/cleaning';
import { getServedZones } from '@/features/cleaning/server';
import { RequireSession } from '@/features/identity';
import { pageMetadata } from '@/lib/seo/metadata';

const t = cleaningTexts.request;

export const metadata: Metadata = {
  ...pageMetadata({ title: t.title, path: '/nettoyage/devis' }),
  robots: { index: false, follow: false },
};

/**
 * Demande de devis de nettoyage : coque statique (zones desservies lues au build puis revalidées) ; la
 * garde reprend la session (sinon connexion puis retour ici, simulation comprise dans l'adresse), le
 * formulaire lit la simulation sous Suspense. Le fil de la signature situe l'étape dans la démarche.
 */
export default async function CleaningQuotePage() {
  const zones = await getServedZones();
  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-reading">
        <Eyebrow>{getMetier('nettoyage').label}</Eyebrow>
        <Heading as="h1" size="h1" className="mt-5">
          {t.title}
        </Heading>
        <p className="text-lead text-ink-muted mt-3">{t.lead}</p>
      </div>
      <SignatureProgress
        steps={serviceJourney}
        current={1}
        label={cleaningTexts.journey.requestFormProgress}
        className="mt-8 max-w-3xl"
      />
      <div className="mt-10">
        <RequireSession>
          <Suspense
            fallback={
              <p role="status" className="text-ink-muted">
                {cleaningTexts.space.loading}
              </p>
            }
          >
            <QuoteRequestPanel zones={zones} />
          </Suspense>
        </RequireSession>
      </div>
    </Container>
  );
}
