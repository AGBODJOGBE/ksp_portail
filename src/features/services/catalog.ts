import { type MetierId, metiers } from '@/config/metiers';
import { marketplaceContent } from '@/features/catalog';
import { nettoyageContent } from '@/features/cleaning';
import { livraisonContent } from '@/features/delivery';
import { impressionContent } from '@/features/print';
import { immobilierContent, QUOTE_ID } from '@/features/realestate';
import { recouvrementContent } from '@/features/recovery/server';
import { CATEGORY_LABELS, normalize, type ServiceEntry } from './search';

/** Service avant la préparation de son texte de recherche. */
type Draft = Omit<ServiceEntry, 'search'>;

/*
 * Annuaire des services du portail (`/services`, recherche de l'accueil). Contenu réel uniquement : les
 * offres déjà décrites par les pages métiers (`features/<domaine>/content.ts`). Aucune prestation, aucun
 * tarif n'est ajouté ici. Le Nettoyage prépare sa nouvelle version (v2) : ses prestations viennent de sa
 * page, sans catalogue lu à la gateway.
 * Fichier serveur : il lit les contenus de toutes les pages métiers (le navigateur ne reçoit que la liste).
 */

/** Offre d'une page métier ; `status` : offre pas encore ouverte (« Bientôt »). */
type Offer = { title: string; text: string; points?: ReadonlyArray<string>; status?: string };

function describe(offer: Offer): string {
  return offer.points?.length ? `${offer.text} ${offer.points.join(', ')}.` : offer.text;
}

function fromOffers(
  category: MetierId,
  offers: ReadonlyArray<Offer>,
  href: string,
  title: (offer: Offer) => string = (offer) => offer.title,
  status?: string,
): Draft[] {
  return offers.map((offer, index) => ({
    id: `${category}-${index + 1}`,
    category,
    title: title(offer),
    description: describe(offer),
    href,
    ...((offer.status ?? status) ? { status: offer.status ?? status } : {}),
  }));
}

/** Tous les services, dans l'ordre des métiers, tirés des pages métiers. */
export function buildServiceDirectory(): ServiceEntry[] {
  const lower = (offer: Offer) => offer.title.charAt(0).toLowerCase() + offer.title.slice(1);

  const byCategory: Record<MetierId, Draft[]> = {
    recouvrement: fromOffers(
      'recouvrement',
      recouvrementContent.offers.items,
      '/recouvrement#offres',
      (offer) => `Recouvrement pour les ${lower(offer)}`,
    ),
    nettoyage: fromOffers(
      'nettoyage',
      nettoyageContent.services.items,
      '/nettoyage#prestations',
      (offer) => `Nettoyage : ${offer.title.toLowerCase()}`,
    ),
    immobilier: [
      {
        id: 'immobilier-1',
        category: 'immobilier',
        title: immobilierContent.diaspora.intro.title,
        description: getSummary('immobilier'),
        href: `/immobilier#${QUOTE_ID}`,
        ...(immobilierContent.hero.status ? { status: immobilierContent.hero.status } : {}),
      },
    ],
    impression: fromOffers(
      'impression',
      impressionContent.ranges.items,
      '/impression#gammes',
      (offer) => `Impression : ${lower(offer)}`,
      impressionContent.hero.status,
    ),
    marketplace: fromOffers(
      'marketplace',
      marketplaceContent.sides.items,
      '/marketplace#acheter-vendre',
      undefined,
      marketplaceContent.hero.status,
    ),
    livraison: fromOffers(
      'livraison',
      livraisonContent.offer.items,
      '/livraison#offre',
      (offer) => `Livraison : ${lower(offer)}`,
    ),
  };
  return metiers.flatMap((metier) =>
    byCategory[metier.id].map((entry) => ({
      ...entry,
      search: normalize(
        [entry.title, entry.description, CATEGORY_LABELS[metier.id], metier.label, metier.summary].join(' '),
      ),
    })),
  );
}

function getSummary(id: MetierId): string {
  return metiers.find((metier) => metier.id === id)?.summary ?? '';
}
