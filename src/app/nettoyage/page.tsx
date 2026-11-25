import { CtaBand } from '@/components/sections/cta-band';
import { FaqSection } from '@/components/sections/faq-section';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { StepsSection } from '@/components/sections/steps-section';
import { Section } from '@/components/ui/section';
import { SectionHeader } from '@/components/ui/section-header';
import { getMetier } from '@/config/metiers';
import { CleaningServiceHero, CleaningSimulator, nettoyageContent as content } from '@/features/cleaning';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('nettoyage');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/**
 * Nettoyage et assainissement (v2, ADR-054 à 056), page d'e-service : premier écran, simulateur (lieux,
 * types et paramètres lus à la gateway dans le navigateur, estimation en direct), étapes, prestations,
 * FAQ, appel à l'action. La page reste statique : le simulateur est un composant client chargé à la
 * demande, qui ne pèse pas sur le premier affichage.
 */
export default function NettoyagePage() {
  return (
    <>
      <CleaningServiceHero content={content.hero} />
      <Section id="simulateur" labelledBy="simulateur-titre" tone="muted" className="scroll-mt-20">
        <div className="grid gap-10">
          <SectionHeader
            id="simulateur-titre"
            eyebrow={content.simulator.eyebrow}
            title={content.simulator.title}
            lead={content.simulator.lead}
          />
          <CleaningSimulator />
        </div>
      </Section>
      <StepsSection id="etapes" intro={content.steps.intro} steps={content.steps.items} />
      <OffersSection
        id="prestations"
        intro={content.services.intro}
        offers={content.services.items}
        tone="muted"
      />
      <FaqSection items={content.faq} tone="default" />
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
