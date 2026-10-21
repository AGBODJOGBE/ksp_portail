import { CtaBand } from '@/components/sections/cta-band';
import { MetierHero } from '@/components/sections/metier-hero';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { RealisationsSection } from '@/components/sections/pending-section';
import { StepsSection } from '@/components/sections/steps-section';
import { impressionContent as content } from '@/features/print';
import { getMetier } from '@/config/metiers';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('impression');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/** Impression (présentation ; commande en ligne sur KSP Print en phase 3) : gammes, techniques, réalisations. */
export default function ImpressionPage() {
  return (
    <>
      <MetierHero content={content.hero} />
      <OffersSection id="gammes" intro={content.ranges.intro} offers={content.ranges.items} columns={4} />
      <OffersSection
        id="techniques"
        intro={content.techniques.intro}
        offers={content.techniques.items}
        columns={4}
        tone="muted"
      />
      <StepsSection id="commander" intro={content.steps.intro} steps={content.steps.items} />
      <RealisationsSection content={content.realisations} items={content.realisationItems} tone="muted" />
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
