import type { BadgeTone } from '@/components/ui/badge';

/*
 * Textes du profil, des comptes entreprise et du sélecteur de contexte (« Mon espace KSP »). Ils restent
 * dans la fonctionnalité plutôt que dans `src/i18n/fr.ts`, chargé par toutes les pages : seules les
 * pages de l'espace qui les affichent les téléchargent.
 */

export const identityPaths = {
  account: '/mon-espace',
  profile: '/mon-espace/profil',
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
    profileLinkText: 'Nom, numéro de connexion et e-mail.',
    organizationsLink: 'Mon entreprise',
    organizationsLinkText: 'Compte entreprise, validation par KSP et e-mail de facturation.',
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
