import { CtaBand } from '@/components/sections/cta-band';
import { MetierHero } from '@/components/sections/metier-hero';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { PageActions } from '@/components/sections/page-actions';
import { PendingSection } from '@/components/sections/pending-section';
import { StepsSection } from '@/components/sections/steps-section';
import { livraisonContent as content } from '@/features/delivery';
import { getMetier } from '@/config/metiers';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('livraison');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/** Livraison et courses (présentation ; commande en ligne en phase 3) : offre, étapes, zones couvertes. */
export default function LivraisonPage() {
  return (
    <>
      <MetierHero content={content.hero} />
      <OffersSection id="offre" intro={content.offer.intro} offers={content.offer.items} />
      <StepsSection id="etapes" intro={content.steps.intro} steps={content.steps.items} tone="muted" />
      <PendingSection
        id="zones"
        content={content.zones}
        action={
          <PageActions
            actions={[{ kind: 'contact', label: 'Vérifier mon adresse', subject: 'livraison' }]}
            size="md"
            highlightFirst={false}
          />
        }
      />
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
