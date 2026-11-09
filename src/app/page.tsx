import { metiers } from '@/config/metiers';
import { cleaningTexts } from '@/features/cleaning';
import { getServedZones } from '@/features/cleaning/server';
import { impressionContent } from '@/features/print';
import { marketplaceContent } from '@/features/catalog';
import { immobilierContent } from '@/features/realestate';
import { livraisonContent } from '@/features/delivery';
import {
  ClosingCta,
  HomeHero,
  HomeJourney,
  KeyFiguresSection,
  MetiersBento,
  type MetierStatus,
  RealisationsSection,
  TestimonialsSection,
  TrustSection,
  ZonesSection,
  homeContent,
} from '@/features/home';
import type { MetierId } from '@/config/metiers';
import type { PageAction } from '@/components/sections/types';

/** Note d'une action « bientôt » (commande en ligne pas encore ouverte), si la page en a une. */
function soonNote(actions: ReadonlyArray<PageAction>): string | undefined {
  const soon = actions.find((action) => action.kind === 'soon');
  return soon?.kind === 'soon' ? soon.note : undefined;
}

/**
 * Accueil du portail (direction « Signature ») : promesse sur la bande bleu nuit, six métiers sur une
 * feuille qui la chevauche, démarche commune, raisons de confiance, zones desservies (lues auprès de la
 * gateway, revalidées comme la page Nettoyage), preuves « à venir » puis contact. Les contenus viennent de
 * `src/features/home` (remplacés plus tard par Payload CMS) ; l'état de chaque métier vient de sa page.
 */
export default async function HomePage() {
  const zones = await getServedZones();
  const statuses: Partial<Record<MetierId, MetierStatus>> = {
    nettoyage: { label: cleaningTexts.hero.online, live: true },
  };
  const pending: Array<[MetierId, string | undefined]> = [
    ['immobilier', immobilierContent.hero.status],
    ['impression', impressionContent.hero.status],
    ['marketplace', marketplaceContent.hero.status],
    ['livraison', soonNote(livraisonContent.hero.actions)],
  ];
  for (const [id, label] of pending) if (label) statuses[id] = { label };

  return (
    <>
      <HomeHero content={homeContent.hero} />
      <MetiersBento content={homeContent.metiers} metiers={metiers} statuses={statuses} />
      <HomeJourney content={homeContent.journey} />
      <TrustSection content={homeContent.trust} />
      <KeyFiguresSection content={homeContent.keyFigures} />
      {zones?.length ? (
        <ZonesSection content={homeContent.zones} communes={zones.map((zone) => zone.commune)} />
      ) : null}
      <TestimonialsSection content={homeContent.testimonials} />
      <RealisationsSection content={homeContent.realisations} />
      <ClosingCta content={homeContent.closing} />
    </>
  );
}
