/**
 * Adresses de « Mon espace KSP » propres au compte. Module à part, sans texte : la connexion le lit sans
 * télécharger les textes des écrans du compte.
 */
export const identityPaths = {
  account: '/mon-espace',
  profile: '/mon-espace/profil',
  /** « Mon compte » : suppression du compte (adresse citée par les messages d'identity, ADR-036). */
  settings: '/mon-espace/compte',
  organizations: '/mon-espace/entreprise',
  organization: (id: string) => `/mon-espace/entreprise/${encodeURIComponent(id)}`,
} as const;
