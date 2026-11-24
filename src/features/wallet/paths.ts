/**
 * Adresses du portefeuille. Module à part, sans texte : l'accueil de Mon espace et la page de retour d'un
 * paiement le lisent sans télécharger les textes du portefeuille.
 */
export const walletPaths = {
  home: '/mon-espace/portefeuille',
} as const;

/**
 * Objet payé par le portefeuille → écran du portail. Adresse fixée par billing, recopiée ici : la fiche
 * d'une facture importe cette fonctionnalité (paiement par le portefeuille), l'inverse ferait un cycle.
 * Les objets du Nettoyage v1 (missions) n'ont plus d'écran : pas de lien.
 */
export function objectPath(object: { objectType: string; objectId: string }): string | null {
  if (object.objectType === 'billing_invoice')
    return `/mon-espace/factures/${encodeURIComponent(object.objectId)}`;
  return null;
}
