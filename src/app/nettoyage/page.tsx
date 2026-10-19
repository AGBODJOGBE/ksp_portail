import { CtaBand } from '@/components/sections/cta-band';
import { FaqSection } from '@/components/sections/faq-section';
import { GuidedFormSection } from '@/components/sections/guided-form-section';
import { MetierHero } from '@/components/sections/metier-hero';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { PageActions } from '@/components/sections/page-actions';
import { StepsSection } from '@/components/sections/steps-section';
import { getMetier } from '@/config/metiers';
import { SIMULATOR_ID, nettoyageContent as content } from '@/features/cleaning';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('nettoyage');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/** Nettoyage et assainissement (phase 1) : prestations, simulateur (interface), étapes (parcours P2), FAQ. */
export default function NettoyagePage() {
  const { booking } = content.steps;
  return (
    <>
      <MetierHero content={content.hero} />
      <OffersSection id="prestations" intro={content.services.intro} offers={content.services.items} />
      <GuidedFormSection id={SIMULATOR_ID} intro={content.simulator.intro} form={content.simulator.form} />
      <StepsSection
        id="etapes"
        intro={content.steps.intro}
        steps={content.steps.items}
        aside={
          <div className="rounded-card border-accent-muted bg-accent-soft border p-6">
            <p className="font-display text-ink text-lg font-semibold">{booking.title}</p>
            <p className="text-small text-ink-muted mt-1">{booking.text}</p>
            <PageActions actions={[booking.action]} size="md" highlightFirst={false} className="mt-4" />
          </div>
        }
      />
      <FaqSection items={content.faq} />
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
