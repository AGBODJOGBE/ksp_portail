import type { BadgeTone } from '@/components/ui/badge';

/*
 * Textes du profil, des comptes entreprise et du sélecteur de contexte (« Mon espace KSP »). Ils restent
 * dans la fonctionnalité plutôt que dans `src/i18n/fr.ts`, chargé par toutes les pages : seules les
 * pages de l'espace qui les affichent les téléchargent.
 */

export const identityPaths = {
  account: '/mon-espace',
  profile: '/mon-espace/profil',
  /** « Mon compte » : suppression du compte (adresse citée par les messages d'identity, ADR-036). */
  settings: '/mon-espace/compte',
  organizations: '/mon-espace/entreprise',
  organization: (id: string) => `/mon-espace/entreprise/${encodeURIComponent(id)}`,
} as const;

export const accountTexts = {
  common: {
    loading: 'Chargement…',
    retry: 'Réessayer',
    genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
    backToAccount: 'Retour à Mon espace KSP',
  },
  home: {
    profileLink: 'Mon profil',
    profileLinkText: 'Nom, numéro de connexion, e-mail et suppression du compte.',
    organizationsLink: 'Mon entreprise',
    organizationsLinkText: 'Compte entreprise, validation par KSP et e-mail de facturation.',
  },
  todo: {
    title: 'Mon compte',
    emailMissing: 'Ajoutez votre e-mail',
    emailMissingText: 'Pour recevoir vos devis, factures et reçus, et retrouver votre compte facilement.',
    emailUnverified: 'Vérifiez votre e-mail',
    emailUnverifiedText: (email: string) => `Confirmez ${email} avec le code que nous vous envoyons.`,
    action: 'Compléter',
  },
  profile: {
    title: 'Mon profil',
    lead: 'Les informations de votre compte KSP, communes à tous les sites du groupe.',
    identityTitle: 'Identité',
    name: 'Nom',
    phone: 'Numéro de connexion',
    phoneHint: 'Votre numéro sert à vous connecter : il ne se change pas en ligne.',
    editName: 'Modifier mon nom',
    nameSaved: 'Votre nom est enregistré.',
    cancel: 'Annuler',
  },
  email: {
    title: 'Adresse e-mail',
    lead: 'Seule une adresse vérifiée reçoit vos factures, documents et avis par e-mail.',
    none: 'Aucune adresse e-mail.',
    verified: 'Vérifiée',
    unverified: 'Non vérifiée',
    pending: (email: string) => `En attente de confirmation : ${email}`,
    pendingHint: 'Un code a été envoyé à cette adresse. Saisissez-le pour la confirmer.',
    declare: 'Ajouter une adresse e-mail',
    change: 'Changer d’adresse e-mail',
    enterCode: 'Saisir le code reçu',
    field: 'Adresse e-mail',
    fieldHint: 'Nous vous envoyons un code par e-mail pour la confirmer.',
    required: 'Indiquez une adresse e-mail.',
    invalid: 'Adresse e-mail invalide : vérifiez-la (exemple : nom@domaine.bj).',
    send: 'Recevoir le code',
    sending: 'Envoi du code…',
    codeSent: (email: string) => `Nous avons envoyé un code à ${email}.`,
    codeValidity: (minutes: number) => `Il est valable ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    codeLabel: 'Code reçu par e-mail',
    codeInvalid: 'Saisissez le code reçu, en chiffres.',
    confirm: 'Confirmer',
    confirming: 'Vérification…',
    resend: 'Renvoyer le code',
    resendIn: (delay: string) => `Renvoyer le code dans ${delay}`,
    resent: 'Un nouveau code vous a été envoyé.',
    otherAddress: 'Changer d’adresse',
    cancel: 'Annuler',
    confirmed: (email: string) => `Adresse confirmée : ${email}.`,
    attemptsRemaining: (count: number) =>
      count > 1 ? `Il vous reste ${count} essais.` : 'Il vous reste 1 essai.',
  },
  settings: {
    title: 'Mon compte',
    lead: 'Votre compte KSP est commun à tous les sites du groupe.',
    link: 'Supprimer mon compte',
    linkText: 'Vous pouvez demander la suppression de votre compte KSP.',
  },
  deletion: {
    title: 'Supprimer mon compte',
    lead: 'La suppression vaut pour votre compte KSP sur tous les sites du groupe.',
    stepsTitle: 'Ce qui se passe',
    steps: [
      'Votre compte est gelé pendant 30 jours : vous ne pouvez plus commander ni payer.',
      'Toutes vos sessions sont fermées, sur tous vos appareils.',
      'Vous changez d’avis ? Reconnectez-vous avant la date prévue et annulez la suppression.',
      'À la date prévue, vos données personnelles sont effacées (nom, numéro de téléphone, e-mail). Vos factures et paiements sont conservés 10 ans, comme l’exige la loi comptable.',
    ],
    conditions:
      'La suppression est refusée tant qu’une opération est en cours : prestation ou demande de devis, facture à régler, paiement en attente ou en vérification.',
    start: 'Supprimer mon compte',
    confirmTitle: 'Confirmer la suppression de votre compte ?',
    confirmText:
      'Votre compte sera gelé tout de suite et vous serez déconnecté. Sans annulation de votre part, il sera supprimé dans 30 jours.',
    confirm: 'Oui, supprimer mon compte',
    confirming: 'Vérification de votre compte…',
    keep: 'Garder mon compte',
    blockedTitle: 'Opérations en cours',
    obstacleLink: 'Voir',
    unavailable: 'Nous ne pouvons pas vérifier votre compte pour le moment. Réessayez plus tard.',
    // Après la demande (session fermée).
    requestedTitle: (date: string) => `Suppression de votre compte prévue le ${date}`,
    requestedText:
      'Votre compte est gelé et vous avez été déconnecté de tous vos appareils. Un message vous confirme la date prévue.',
    requestedCancel:
      'Vous changez d’avis ? Reconnectez-vous avant cette date avec votre numéro, puis annulez la suppression.',
    home: 'Retour à l’accueil',
    signInAgain: 'Se reconnecter',
    // Session restreinte (compte en cours de suppression).
    pendingEyebrow: 'Compte en cours de suppression',
    pendingTitle: (date: string) => `Suppression prévue le ${date}`,
    pendingTitleUnknown: 'Suppression de votre compte demandée',
    pendingText:
      'Votre compte est gelé : vos services KSP ne sont plus accessibles. À la date prévue, vos données personnelles seront effacées ; vos factures et paiements restent conservés comme l’exige la loi.',
    pendingCancelHint: 'Annulez la suppression pour retrouver votre compte, vos demandes et vos factures.',
    postponedTitle: 'Suppression reportée',
    postponedText:
      'Des opérations étaient encore en cours à la date prévue : la suppression attend qu’elles soient terminées.',
    cancel: 'Annuler la suppression',
    cancelling: 'Annulation…',
    cancelled: 'Suppression annulée : votre compte est de nouveau actif.',
    continue: 'Continuer',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
    readError: 'La date prévue n’a pas pu être lue.',
    // Pages publiques qui demandent un compte actif (demande de devis).
    restricted:
      'Votre compte est en cours de suppression : annulez la suppression pour l’utiliser à nouveau.',
    restrictedLink: 'Gérer la suppression',
  },
  organizations: {
    title: 'Mon entreprise',
    lead: 'Un compte entreprise permet de commander au nom de votre société, avec une facture mensuelle. KSP valide chaque demande avant son ouverture.',
    listTitle: 'Mes comptes entreprise',
    none: 'Vous n’avez pas encore de compte entreprise.',
    requestTitle: 'Demander un compte entreprise',
    requestLead:
      'Indiquez les informations de votre société. Vous en serez l’administrateur ; KSP vérifie la demande avant de l’ouvrir.',
    legalName: 'Raison sociale',
    legalNameRequired: 'Indiquez la raison sociale.',
    address: 'Adresse du siège',
    addressHint: 'Ville, quartier, rue ou repère.',
    addressRequired: 'Indiquez l’adresse du siège.',
    ifu: 'IFU (identifiant fiscal unique)',
    ifuHint: '13 chiffres, sans lettre. Les espaces sont ignorés.',
    ifuInvalid: 'L’IFU compte 13 chiffres.',
    rccm: 'RCCM (facultatif)',
    rccmHint: 'Exemple : RB/COT/19 B 12345.',
    submit: 'Envoyer ma demande',
    sending: 'Envoi…',
    sent: (name: string) =>
      `Demande envoyée pour ${name}. KSP la vérifie : vous serez prévenu de sa validation.`,
    openRequest: 'Faire une autre demande',
    see: (name: string) => `Voir la fiche de ${name}`,
    createdOn: (date: string) => `Demande du ${date}`,
    role: { org_admin: 'Administrateur', org_member: 'Membre', org_viewer: 'Lecture seule' } as Record<
      string,
      string
    >,
  },
  organization: {
    back: 'Retour à mes comptes entreprise',
    detailsTitle: 'Informations',
    legalName: 'Raison sociale',
    address: 'Adresse',
    ifu: 'IFU',
    rccm: 'RCCM',
    role: 'Votre rôle',
    createdAt: 'Demande envoyée le',
    reviewedAt: 'Décision de KSP le',
    rejectionReason: 'Motif du refus',
    suspensionReason: 'Motif de la suspension',
    billingTitle: 'E-mail de facturation',
    billingLead:
      'Les factures mensuelles sont envoyées à cette adresse. Sans adresse confirmée, elles restent consultables dans « Mes factures », sans envoi par e-mail.',
    billingNone: 'Aucun e-mail de facturation confirmé.',
    billingAdminOnly: 'Seul un administrateur de l’entreprise peut changer l’e-mail de facturation.',
    billingClosed:
      'L’e-mail de facturation ne se change que pour un compte entreprise en attente de validation ou validé.',
    notFound: 'Ce compte entreprise est introuvable, ou vous n’en êtes pas membre.',
    useContext: 'Utiliser ce compte entreprise',
    inUse: 'Vous utilisez ce compte entreprise.',
  },
  context: {
    label: 'Compte actif',
    personal: 'Compte personnel (particulier)',
    personalShort: 'Compte personnel',
    business: (name: string | null) => (name ? `Entreprise ${name}` : 'Compte entreprise'),
    change: 'Changer de compte',
    close: 'Fermer',
    legend: 'Utiliser le compte',
    apply: 'Utiliser ce compte',
    applying: 'Changement…',
    unavailable: (status: string) => `indisponible : ${status}`,
    none: 'Vous n’avez pas encore de compte entreprise.',
    createLink: 'Demander un compte entreprise',
    manageLink: 'Gérer mes comptes entreprise',
    switched: (label: string) => `Vous utilisez maintenant : ${label}.`,
    hint: 'Le compte actif décide de ce que vous voyez et commandez : vos demandes et missions, vos factures.',
  },
} as const;

export type StatusLabel = { label: string; tone: BadgeTone; hint?: string };

/** États d'un compte entreprise (`Organization.status`), avec ce qui se passe ensuite. */
export const organizationStatuses: Record<string, StatusLabel> = {
  pending_review: {
    label: 'En attente de validation',
    tone: 'warning',
    hint: 'KSP vérifie votre demande. Vous pourrez utiliser ce compte entreprise dès sa validation.',
  },
  active: {
    label: 'Validée',
    tone: 'success',
    hint: 'Ce compte entreprise est ouvert : choisissez-le comme compte actif pour commander en son nom.',
  },
  rejected: {
    label: 'Refusée',
    tone: 'danger',
    hint: 'KSP n’a pas validé cette demande. Contactez-nous si vous pensez qu’il s’agit d’une erreur.',
  },
  suspended: {
    label: 'Suspendue',
    tone: 'danger',
    hint: 'Ce compte entreprise est suspendu par KSP : il ne peut plus être utilisé jusqu’à sa réactivation.',
  },
};

export function organizationStatus(status: string): StatusLabel {
  return organizationStatuses[status] ?? { label: status, tone: 'neutral' };
}

/** Nature d'une obligation qui empêche la suppression (`DeletionObstacle.kind`) : libellé et écran. */
export const deletionObstacleKinds: Record<string, { label: string; href: string }> = {
  open_cleaning_mission: {
    label: 'Prestation de nettoyage en cours',
    href: '/mon-espace/nettoyage/demandes',
  },
  open_cleaning_request: { label: 'Demande de devis en cours', href: '/mon-espace/nettoyage/demandes' },
  unpaid_invoice: { label: 'Facture à régler', href: '/mon-espace/factures' },
  pending_payment: { label: 'Paiement en attente', href: '/mon-espace/paiements' },
  payment_under_review: { label: 'Paiement en vérification', href: '/mon-espace/paiements' },
  last_org_admin: { label: 'Compte entreprise sans autre administrateur', href: identityPaths.organizations },
};

/** Repli par service, pour une nature encore inconnue du portail (liste ouverte du contrat). */
const obstacleServices: Record<string, { label: string; href: string }> = {
  cleaning: { label: 'Nettoyage', href: '/mon-espace/nettoyage/demandes' },
  billing: { label: 'Facturation', href: '/mon-espace/factures' },
  payment: { label: 'Paiement', href: '/mon-espace/paiements' },
  identity: { label: 'Compte entreprise', href: identityPaths.organizations },
};

/**
 * Libellé et écran d'une obligation. Les adresses des autres fonctionnalités sont recopiées ici : leurs
 * index importent identity (connexion intégrée), l'inverse ferait un cycle.
 */
export function deletionObstacle(obstacle: { service: string; kind: string }): {
  label: string;
  href: string | null;
} {
  return (
    deletionObstacleKinds[obstacle.kind] ??
    obstacleServices[obstacle.service] ?? { label: 'Opération en cours', href: null }
  );
}
