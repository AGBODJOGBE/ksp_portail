import { CtaBand } from '@/components/metier/cta-band';
import { FaqSection } from '@/components/metier/faq-section';
import { InfoPanels } from '@/components/metier/info-panels';
import { MetierHero } from '@/components/metier/metier-hero';
import { OffersSection } from '@/components/metier/offers-section';
import { OtherMetiers } from '@/components/metier/other-metiers';
import { PageActions } from '@/components/metier/page-actions';
import { PendingSection } from '@/components/metier/pending-section';
import { StepsSection } from '@/components/metier/steps-section';
import { getMetier } from '@/content/metiers';
import { recouvrementContent as content } from '@/content/recouvrement';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('recouvrement');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/** Recouvrement (phase 1) : offres, étapes d'un dossier (parcours P1), rémunération, conseil, formations, FAQ. */
export default function RecouvrementPage() {
  return (
    <>
      <MetierHero content={content.hero} />
      <OffersSection id="offres" intro={content.offers.intro} offers={content.offers.items} />
      <StepsSection id="etapes" intro={content.steps.intro} steps={content.steps.items} tone="muted" />
      <InfoPanels
        panels={[
          { id: 'remuneration', ...content.remuneration },
          { id: 'conseil', ...content.advice, tone: 'inverse' },
        ]}
      />
      <PendingSection
        id="formations"
        content={content.trainings}
        tone="muted"
        action={<PageActions actions={[content.trainings.action]} size="md" highlightFirst={false} />}
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
