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
  metier: {
    breadcrumb: 'Fil d’Ariane',
    home: 'Accueil',
    otherMetiersEyebrow: 'Le Groupe KSP',
    otherMetiersTitle: 'Nos autres métiers',
    faqEyebrow: 'Questions fréquentes',
    faqTitle: 'Vos questions',
    actors: { client: 'Vous', ksp: 'KSP' },
    externalSite: 'nouvel onglet',
  },
  realisations: {
    filterLabel: 'Filtrer les réalisations',
    all: 'Toutes',
    count: (count: number) => `${count} réalisation${count > 1 ? 's' : ''}`,
  },
  guidedForm: {
    progress: (current: number, total: number) => `Étape ${current} sur ${total}`,
    stepsLabel: 'Étapes',
    previous: 'Retour',
    next: 'Continuer',
    toSummary: 'Voir le récapitulatif',
    edit: 'Modifier',
    editStep: (title: string) => `Modifier : ${title}`,
    restart: 'Recommencer',
    required: 'Choisissez une réponse pour continuer.',
    invalidNumber: (max: string) => `Indiquez un nombre entier entre 1 et ${max}.`,
    notAnswered: 'Sans réponse',
    unknown: 'Je ne sais pas encore',
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
