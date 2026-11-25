/**
 * Adresses du portefeuille. Module à part, sans texte : l'accueil de Mon espace et la page de retour d'un
 * paiement le lisent sans télécharger les textes du portefeuille.
 */
export const walletPaths = {
  home: '/mon-espace/portefeuille',
} as const;

/**
 * Objet payé par le portefeuille → écran du portail. Adresses fixées par billing et cleaning, recopiées
 * ici : la fiche d'une facture et le Nettoyage importent cette fonctionnalité (paiement par le
 * portefeuille), l'inverse ferait un cycle. Recouvrement : frais de dossier (`recovery_case_fee`) et forfait
 * d'étude (`recovery_study_fee`) mènent au dossier. Nettoyage v2 : séance (`cleaning_session`) et frais de visite
 * d'une demande (`cleaning_request`, part `visit_fee`). Les objets du Nettoyage v1 (missions) et les frais
 * de visite désignés par leur propre identifiant (`cleaning_visit_fee`) n'ont pas d'écran : pas de lien.
 */
export function objectPath(object: { objectType: string; objectId: string }): string | null {
  const id = encodeURIComponent(object.objectId);
  if (object.objectType === 'billing_invoice') return `/mon-espace/factures/${id}`;
  if (object.objectType === 'cleaning_session') return `/mon-espace/nettoyage/seances/${id}`;
  if (object.objectType === 'cleaning_request') return `/mon-espace/nettoyage/demandes/${id}`;
  // Recouvrement : frais de dossier et forfait d'étude, objet = le dossier (services/recovery, case-fees.ts).
  if (object.objectType === 'recovery_case_fee' || object.objectType === 'recovery_study_fee') {
    return `/mon-espace/recouvrement/dossiers/${id}`;
  }
  return null;
}
