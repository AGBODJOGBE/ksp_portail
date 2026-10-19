/**
 * Textes communs de l'interface, en français.
 * Préparé pour l'anglais (diaspora) : ajouter en.ts avec les mêmes clés.
 */
export const fr = {
  common: {
    skipToContent: 'Aller au contenu',
    backHome: "Retour à l'accueil",
    retry: 'Réessayer',
    comingSoon: 'Bientôt disponible',
    contactWhatsapp: 'Nous écrire sur WhatsApp',
    ecosystem: "L'écosystème KSP",
    legal: 'Informations légales',
  },
  nav: {
    main: 'Navigation principale',
    metiers: 'Nos métiers',
    metiersTitle: 'Six métiers, un seul groupe.',
    metiersText: 'Un seul compte KSP pour suivre tous vos services.',
    group: 'Le groupe',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
  },
  account: {
    soonTitle: 'Votre espace KSP arrive bientôt',
    soonText:
      'Un seul compte pour suivre vos dossiers, commandes, factures et paiements, sur tous les sites du groupe.',
  },
  errors: {
    notFoundTitle: 'Page introuvable',
    notFoundText: "La page que vous cherchez n'existe pas ou a été déplacée.",
    genericTitle: 'Une erreur est survenue',
    genericText: "Nous n'avons pas pu afficher cette page. Réessayez dans quelques instants.",
  },
  legal: {
    pending: 'Contenu en cours de rédaction. Il sera publié avant la mise en ligne du site.',
  },
} as const;

export type Dictionary = typeof fr;
