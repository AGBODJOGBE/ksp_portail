/**
 * Adresses du Nettoyage. `space` couvre tout `/mon-espace/nettoyage/…` : les liens des notifications du
 * service cleaning (demandes, programmes, réclamations) y mènent, et y trouvent « Bientôt disponible »
 * en attendant la nouvelle version.
 */
export const cleaningPaths = {
  /** Page publique du Nettoyage. */
  home: '/nettoyage',
  /** « Mes prestations de nettoyage » dans Mon espace KSP. */
  space: '/mon-espace/nettoyage',
} as const;
