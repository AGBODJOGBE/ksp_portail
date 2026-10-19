/**
 * Les six métiers du Groupe KSP. Contenu provisoire (textes à valider), prêt à être remplacé par Payload CMS :
 * le CMS fournira les mêmes champs, l'icône est désignée par l'identifiant du métier.
 *
 * L'ordre est celui de la mise en avant (menu, pied de page, accueil) : Recouvrement et Nettoyage
 * fonctionnent de bout en bout dès la phase 1, l'Immobilier arrive en phase 2.
 */
export type MetierId =
  'recouvrement' | 'immobilier' | 'nettoyage' | 'impression' | 'marketplace' | 'livraison';

export type Metier = {
  id: MetierId;
  label: string;
  /** Adresse de la page métier (créée à la section « Pages métiers »). */
  href: string;
  /** Une phrase, affichée dans le menu et les cartes. */
  summary: string;
  /** Action principale proposée sur l'accueil (libellé du bouton de la carte). */
  action: string;
};

export const metiers: ReadonlyArray<Metier> = [
  {
    id: 'recouvrement',
    label: 'Recouvrement',
    href: '/recouvrement',
    action: 'Confier un dossier',
    summary: 'Confiez vos créances impayées et suivez chaque dossier jusqu’à l’encaissement.',
  },
  {
    id: 'nettoyage',
    label: 'Nettoyage et assainissement',
    href: '/nettoyage',
    action: 'Simuler ma prestation',
    summary: 'Simulez votre prestation, recevez un devis et réservez en ligne.',
  },
  {
    id: 'immobilier',
    label: 'Immobilier clés en main',
    href: '/immobilier',
    action: 'Lancer mon projet',
    summary: 'Faites construire ou rénover au Bénin, même depuis la diaspora, avec un suivi en photos.',
  },
  {
    id: 'impression',
    label: 'Impression',
    href: '/impression',
    action: 'Commander une impression',
    summary: 'Vos supports imprimés, pour les particuliers comme pour les entreprises.',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    href: '/marketplace',
    action: 'Visiter la marketplace',
    summary: 'Achetez en ligne auprès des vendeurs de la plateforme KSP.',
  },
  {
    id: 'livraison',
    label: 'Livraison et courses',
    href: '/livraison',
    action: 'Faire livrer',
    summary: 'Faites livrer un colis ou vos courses, et suivez la livraison.',
  },
];

/** Un métier par son identifiant (les contenus de page ne transportent que l'identifiant). */
export function getMetier(id: MetierId): Metier {
  const metier = metiers.find((item) => item.id === id);
  if (!metier) throw new Error(`Métier inconnu : ${id}`);
  return metier;
}
