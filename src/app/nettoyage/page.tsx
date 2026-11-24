import { CtaBand } from '@/components/sections/cta-band';
import { OffersSection } from '@/components/sections/offers-section';
import { OtherMetiers } from '@/components/sections/other-metiers';
import { getMetier } from '@/config/metiers';
import { CleaningServiceHero, nettoyageContent as content } from '@/features/cleaning';
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';

const metier = getMetier('nettoyage');

export const metadata = pageMetadata({ ...content.metadata, path: metier.href });

/**
 * Nettoyage et assainissement, pendant la préparation de la nouvelle version du service (v2) : page
 * statique, sans appel à la gateway. Premier écran (« nouvelle version en préparation », « Nous
 * contacter »), prestations, appel à l'action. La demande en ligne reviendra avec la v2.
 */
export default function NettoyagePage() {
  return (
    <>
      <CleaningServiceHero content={content.hero} />
      <OffersSection
        id="prestations"
        intro={content.services.intro}
        offers={content.services.items}
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
