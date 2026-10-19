import { CtaBand } from '@/components/metier/cta-band';
import { FaqSection } from '@/components/metier/faq-section';
import { GuidedFormSection } from '@/components/metier/guided-form-section';
import { InfoPanels } from '@/components/metier/info-panels';
import { MetierHero } from '@/components/metier/metier-hero';
import { OffersSection } from '@/components/metier/offers-section';
import { OtherMetiers } from '@/components/metier/other-metiers';
import { RealisationsSection } from '@/components/metier/pending-section';
import { StepsSection } from '@/components/metier/steps-section';
import { QUOTE_ID, immobilierContent as content } from '@/content/immobilier';
import { getMetier } from '@/content/metiers';
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
