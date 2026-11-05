import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Heading } from '@/components/ui/heading';
import { getMetier } from '@/config/metiers';
import { CleaningJourney, cleaningPaths, journeyTexts } from '@/features/cleaning';
import { getPlaceCatalogForPage, getServedZones } from '@/features/cleaning/server';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({ title: journeyTexts.title, path: cleaningPaths.journey }),
  robots: { index: false, follow: false },
};

/**
 * Demande de devis du Nettoyage par lieu (ADR-034) : coque statique, catalogue et zones lus au build
 * puis revalidés ; l'assistant (composant client) lit l'adresse (`?lieu=`, `?groupe=`) sous Suspense
 * et ne demande la connexion qu'à l'envoi.
 */
export default async function CleaningJourneyPage() {
  const [catalog, zones] = await Promise.all([getPlaceCatalogForPage(), getServedZones()]);
  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-reading">
        <Eyebrow>{getMetier('nettoyage').label}</Eyebrow>
        <Heading as="h1" size="h1" className="mt-5">
          {journeyTexts.title}
        </Heading>
        <p className="text-lead text-ink-muted mt-3">{journeyTexts.lead}</p>
      </div>
      <div className="mt-8 sm:mt-10">
        <Suspense
          fallback={
            <p role="status" className="text-ink-muted">
              {journeyTexts.loading}
            </p>
          }
        >
          <CleaningJourney catalog={catalog} zones={zones} />
        </Suspense>
      </div>
    </Container>
  );
}
