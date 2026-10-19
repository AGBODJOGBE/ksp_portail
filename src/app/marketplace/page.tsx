import { CtaBand } from '@/components/metier/cta-band';
import { MetierHero } from '@/components/metier/metier-hero';
import { OffersSection } from '@/components/metier/offers-section';
import { OtherMetiers } from '@/components/metier/other-metiers';
import { StepsSection } from '@/components/metier/steps-section';
import { marketplaceContent as content } from '@/content/marketplace';
import { getMetier } from '@/content/metiers';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('marketplace');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/** Marketplace (présentation ; ouverture sur KSP Shop en phase 4) : acheter, devenir vendeur, étapes vendeur. */
export default function MarketplacePage() {
  return (
    <>
      <MetierHero content={content.hero} />
      <OffersSection
        id="acheter-vendre"
        intro={content.sides.intro}
        offers={content.sides.items}
        columns={2}
      />
      <StepsSection
        id="vendre"
        intro={content.sellerSteps.intro}
        steps={content.sellerSteps.items}
        tone="muted"
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
