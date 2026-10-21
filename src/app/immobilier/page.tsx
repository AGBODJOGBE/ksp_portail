import { CtaBand } from '@/components/sections/cta-band';
import { FaqSection } from '@/components/sections/faq-section';
import { GuidedFormSection } from '@/components/sections/guided-form-section';
import { InfoPanels } from '@/components/sections/info-panels';
import { MetierHero } from '@/components/sections/metier-hero';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { RealisationsSection } from '@/components/sections/pending-section';
import { StepsSection } from '@/components/sections/steps-section';
import { QUOTE_ID, immobilierContent as content } from '@/features/realestate';
import { getMetier } from '@/config/metiers';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('immobilier');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/**
 * Immobilier clés en main (ouverture en phase 2) : offre diaspora, étapes (parcours P3), garanties,
 * réalisations filtrables, demande de devis guidée (interface seulement), FAQ.
 */
export default function ImmobilierPage() {
  const [photo, payment] = content.guarantees;
  return (
    <>
      <MetierHero content={content.hero} />
      <OffersSection id="diaspora" intro={content.diaspora.intro} offers={content.diaspora.items} />
      <StepsSection id="etapes" intro={content.steps.intro} steps={content.steps.items} tone="muted" />
      {photo && payment ? (
        <InfoPanels
          panels={[
            { id: 'garantie-photo', ...photo, tone: 'inverse' },
            { id: 'garantie-paiement', ...payment, tone: 'accent' },
          ]}
        />
      ) : null}
      <GuidedFormSection id={QUOTE_ID} intro={content.quote.intro} form={content.quote.form} />
      <RealisationsSection content={content.realisations} items={content.realisationItems} />
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
