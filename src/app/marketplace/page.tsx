import { CtaBand } from '@/components/sections/cta-band';
import { MetierHero } from '@/components/sections/metier-hero';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { StepsSection } from '@/components/sections/steps-section';
import { marketplaceContent as content } from '@/features/catalog';
import { getMetier } from '@/config/metiers';
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
