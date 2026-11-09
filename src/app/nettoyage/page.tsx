import { CtaBand } from '@/components/sections/cta-band';
import { FaqSection } from '@/components/sections/faq-section';

import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { PageActions } from '@/components/sections/page-actions';
import { StepsSection } from '@/components/sections/steps-section';
import { getMetier } from '@/config/metiers';
import {
  CleaningServiceHero,
  JOURNEY_SECTION_ID,
  JourneyEntrySection,
  nettoyageContent as content,
  nettoyageFaq,
  zonesSentence,
} from '@/features/cleaning';
import { getPlaceCatalogForPage, getServedZones } from '@/features/cleaning/server';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('nettoyage');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/**
 * Nettoyage et assainissement (phase 1), page d'e-service : démarche en ligne dès le premier écran,
 * entrée de la demande de devis par lieu juste en dessous (types de lieu du catalogue), étapes
 * (parcours P2), prestations, FAQ. Page statique : zones et catalogue lus au build puis revalidés ; sans
 * catalogue, un seul bouton mène à la demande.
 */
export default async function NettoyagePage() {
  const { booking } = content.steps;
  const [zones, catalog] = await Promise.all([getServedZones(), getPlaceCatalogForPage()]);
  const zonesText = zones ? zonesSentence(zones) : null;
  return (
    <>
      <CleaningServiceHero content={content.hero} zones={zonesText} />
      <JourneyEntrySection
        id={JOURNEY_SECTION_ID}
        intro={content.entry.intro}
        start={content.entry.start}
        fallback={content.entry.fallback}
        catalog={catalog}
      />
      <StepsSection
        id="etapes"
        intro={content.steps.intro}
        steps={content.steps.items}
        aside={
          <div className="signature-edge rounded-card border-line bg-surface shadow-card border p-6 pl-7">
            <p className="font-display text-ink text-lg font-semibold">{booking.title}</p>
            <p className="text-small text-ink-muted mt-1">{booking.text}</p>
            <PageActions actions={[booking.action]} size="md" highlightFirst={false} className="mt-4" />
          </div>
        }
      />
      <OffersSection
        id="prestations"
        intro={content.services.intro}
        offers={content.services.items}
        tone="muted"
      />
      <FaqSection items={nettoyageFaq(zonesText)} />
      <CtaBand content={content.cta} />
      <OtherMetiers current={metier.id} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: metier.label, path: metier.href },
        ]}
      />
    </>
  );
}
