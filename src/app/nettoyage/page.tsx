import { CtaBand } from '@/components/sections/cta-band';
import { FaqSection } from '@/components/sections/faq-section';

import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { PageActions } from '@/components/sections/page-actions';
import { StepsSection } from '@/components/sections/steps-section';
import { getMetier } from '@/config/metiers';
import {
  CleaningServiceHero,
  CleaningSimulatorSection,
  SIMULATOR_ID,
  nettoyageContent as content,
  nettoyageFaq,
  zonesSentence,
} from '@/features/cleaning';
import { getServedZones } from '@/features/cleaning/server';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('nettoyage');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/**
 * Nettoyage et assainissement (phase 1), page d'e-service : démarche en ligne dès le premier écran,
 * simulateur branché sur la gateway juste en dessous, étapes (parcours P2), prestations, FAQ. Page
 * statique : les zones desservies sont lues au build puis revalidées (`getServedZones`) ; si la gateway
 * ne répond pas, le simulateur les relit dans le navigateur.
 */
export default async function NettoyagePage() {
  const { booking } = content.steps;
  const zones = await getServedZones();
  const zonesText = zones ? zonesSentence(zones) : null;
  return (
    <>
      <CleaningServiceHero content={content.hero} zones={zonesText} />
      <CleaningSimulatorSection
        id={SIMULATOR_ID}
        intro={content.simulator.intro}
        form={content.simulator.form}
        zones={zones}
      />
      <StepsSection
        id="etapes"
        intro={content.steps.intro}
        steps={content.steps.items}
        aside={
          <div className="rounded-card border-line bg-surface border p-6 shadow-xs">
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
