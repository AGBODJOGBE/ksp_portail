/**
 * Adresses du portefeuille. Module à part, sans texte : l'accueil de Mon espace et la page de retour d'un
 * paiement le lisent sans télécharger les textes du portefeuille.
 */
export const walletPaths = {
  home: '/mon-espace/portefeuille',
} as const;

/**
 * Objet payé par le portefeuille → écran du portail. Adresses fixées par cleaning et billing, recopiées ici :
 * leurs fiches importent cette fonctionnalité (paiement par le portefeuille), l'inverse ferait un cycle.
 */
export function objectPath(object: { objectType: string; objectId: string }): string | null {
  const id = encodeURIComponent(object.objectId);
  if (object.objectType === 'cleaning_mission') return `/mon-espace/nettoyage/missions/${id}`;
  if (object.objectType === 'billing_invoice') return `/mon-espace/factures/${id}`;
  return null;
}
