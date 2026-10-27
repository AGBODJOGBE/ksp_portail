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
    servicesTitle: 'Vos services',
    soonTitle: 'D’autres services arrivent bientôt',
    soonText:
      'Un seul compte pour suivre vos dossiers, commandes, factures et paiements, sur tous les sites du groupe.',
    greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName}` : 'Bonjour'),
    phone: 'Numéro de connexion',
    loading: 'Chargement de votre espace…',
    unavailable: 'Impossible de vérifier votre connexion.',
    endedTitle: 'Vous n’êtes plus connecté',
    endedText: 'Votre session a pris fin. Reconnectez-vous pour retrouver votre espace.',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
  },
  login: {
    title: 'Se connecter',
    intro:
      'Un seul compte pour tous les services KSP. Pas de mot de passe : vous recevez un code de connexion sur WhatsApp.',
    checking: 'Vérification de votre session…',
    phoneLegend: 'Votre numéro de téléphone',
    countryCode: 'Indicatif',
    phoneNumber: 'Numéro',
    phoneHint: 'Exemple : 01 97 00 00 45. Hors du Bénin, changez l’indicatif.',
    phoneInvalid: 'Numéro invalide : vérifiez l’indicatif et le numéro.',
    sendCode: 'Recevoir mon code',
    sending: 'Envoi du code…',
    codeTitle: 'Saisissez votre code',
    codeSent: (channel: string, target: string) =>
      `Nous avons envoyé un code par ${channel === 'sms' ? 'SMS' : 'WhatsApp'} au ${target}.`,
    codeValidity: (minutes: number) => `Il est valable ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    codeLabel: 'Code reçu',
    codeInvalid: 'Saisissez le code reçu, en chiffres.',
    verify: 'Valider',
    verifying: 'Vérification…',
    resend: 'Renvoyer le code',
    resendIn: (delay: string) => `Renvoyer le code dans ${delay}`,
    resent: 'Un nouveau code vous a été envoyé.',
    changeNumber: 'Modifier le numéro',
    attemptsRemaining: (count: number) =>
      count > 1 ? `Il vous reste ${count} essais.` : 'Il vous reste 1 essai.',
    retryIn: (delay: string) => `Nouvel essai possible dans ${delay}.`,
    delay: (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;
      if (minutes === 0) return `${rest} s`;
      return rest === 0 ? `${minutes} min` : `${minutes} min ${String(rest).padStart(2, '0')} s`;
    },
    mfaRequired:
      'Ce compte doit se connecter avec la double authentification, qui n’est pas disponible sur ce site. Contactez KSP pour accéder à votre compte.',
    genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  },
  profile: {
    title: 'Complétez votre profil',
    intro: 'Indiquez vos prénom et nom : ils figureront sur vos dossiers, commandes et factures.',
    firstName: 'Prénom',
    lastName: 'Nom',
    firstNameRequired: 'Indiquez votre prénom.',
    lastNameRequired: 'Indiquez votre nom.',
    nameInvalid: 'Utilisez des lettres, des espaces, le trait d’union, l’apostrophe ou le point.',
    submit: 'Enregistrer et continuer',
    saving: 'Enregistrement…',
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
