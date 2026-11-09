import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageBand, PageSheet } from '@/components/ui/page-band';
import { getMetier } from '@/config/metiers';
import { CleaningJourney, cleaningPaths, journeyTexts, nettoyageContent } from '@/features/cleaning';
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
  const metier = getMetier('nettoyage');
  return (
    <>
      <PageBand
        eyebrow={nettoyageContent.entry.intro.eyebrow}
        title={journeyTexts.title}
        lead={journeyTexts.lead}
        back={{ href: metier.href, label: metier.label }}
      />
      <PageSheet>
        <Suspense
          fallback={
            <p role="status" className="text-ink-muted">
              {journeyTexts.loading}
            </p>
          }
        >
          <CleaningJourney catalog={catalog} zones={zones} />
        </Suspense>
      </PageSheet>
    </>
  );
}
