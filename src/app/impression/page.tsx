import { CtaBand } from '@/components/metier/cta-band';
import { MetierHero } from '@/components/metier/metier-hero';
import { OffersSection } from '@/components/metier/offers-section';
import { OtherMetiers } from '@/components/metier/other-metiers';
import { RealisationsSection } from '@/components/metier/pending-section';
import { StepsSection } from '@/components/metier/steps-section';
import { impressionContent as content } from '@/content/impression';
import { getMetier } from '@/content/metiers';
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
