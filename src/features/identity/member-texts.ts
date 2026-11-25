import type { BadgeTone } from '@/components/ui/badge';

/**
 * Textes des membres et des invitations d'un compte entreprise (R-CP-03). Module à part : seuls les
 * écrans chargés à la demande (fiche d'une entreprise, « Mon entreprise », rubrique « À faire ») les lisent.
 */
export const memberTexts = {
  // Section « Membres » de la fiche d'une entreprise.
  title: 'Membres',
  lead: 'Les personnes qui utilisent ce compte entreprise et leur rôle.',
  you: 'vous',
  unnamed: 'Membre sans nom',
  joinedOn: (date: string) => `Membre depuis le ${date}`,
  roles: {
    org_admin: 'Administrateur',
    org_member: 'Membre',
    org_viewer: 'Lecture seule',
  } as Record<string, string>,
  roleHints: {
    org_admin: 'Gère le compte entreprise, ses membres et ses réglages.',
    org_member:
      'Utilise le compte entreprise au quotidien ; certaines décisions restent aux administrateurs.',
    org_viewer: 'Consulte seulement, sans commander ni payer.',
  } as Record<string, string>,
  roleOf: (name: string) => `Rôle de ${name}`,
  changeRole: 'Changer le rôle',
  saveRole: 'Enregistrer le rôle',
  savingRole: 'Enregistrement…',
  roleSaved: (name: string, role: string) => `${name} est maintenant : ${role}.`,
  remove: 'Retirer',
  removeOf: (name: string) => `Retirer ${name}`,
  confirmRemoveTitle: (name: string) => `Retirer ${name} de l’entreprise ?`,
  confirmRemoveText:
    'Cette personne n’aura plus accès au compte entreprise. Vous pourrez l’inviter de nouveau.',
  confirmRemove: 'Oui, retirer',
  removing: 'Retrait…',
  removed: (name: string) => `${name} ne fait plus partie de l’entreprise.`,
  cancel: 'Annuler',

  // Invitations en attente et nouvelle invitation (administrateur).
  pendingTitle: 'Invitations en attente',
  pendingNone: 'Aucune invitation en attente.',
  invitedOn: (date: string, expires: string) => `Invitée le ${date} · expire le ${expires}`,
  inviteTitle: 'Inviter une personne',
  inviteLead:
    'La personne reçoit l’invitation sur son numéro et l’accepte depuis son compte KSP (ou en créant un compte). L’invitation expire après 7 jours.',
  phone: 'Numéro de téléphone',
  phoneHint: 'Numéro béninois à 10 chiffres (01 97 00 00 45) ou au format international (+229…).',
  phoneUsed: (phone: string) => `Numéro utilisé : ${phone}.`,
  phoneRequired: 'Indiquez le numéro de la personne à inviter.',
  phoneInvalid: 'Numéro invalide : indiquez 10 chiffres (01 97 00 00 45) ou le format +229….',
  role: 'Rôle',
  invite: 'Envoyer l’invitation',
  inviting: 'Envoi…',
  invited: (phone: string) => `Invitation envoyée à ${phone}.`,
  inactive: 'Les invitations s’envoient une fois le compte entreprise validé par KSP.',

  // Membre qui n'est pas administrateur.
  leave: 'Quitter l’entreprise',
  leaveLead: 'Vous ne verrez plus les commandes, factures et paiements de ce compte entreprise.',
  confirmLeaveTitle: 'Quitter cette entreprise ?',
  confirmLeaveText:
    'Vous perdez l’accès à ce compte entreprise. Pour y revenir, un administrateur devra vous inviter de nouveau.',
  confirmLeave: 'Oui, quitter',
  leaving: 'Départ…',
  left: (name: string) => `Vous avez quitté ${name}.`,
  backToPersonal: 'Vous utilisez de nouveau votre compte personnel.',

  // Invitations reçues (« Mon entreprise » et « À faire »).
  receivedTitle: 'Invitations reçues',
  receivedLead: 'Des entreprises vous invitent à utiliser leur compte KSP.',
  invitedAs: (role: string) => `Rôle proposé : ${role}`,
  expiresOn: (date: string) => `Expire le ${date}`,
  accept: 'Accepter',
  decline: 'Refuser',
  acceptOf: (name: string) => `Accepter l’invitation de ${name}`,
  declineOf: (name: string) => `Refuser l’invitation de ${name}`,
  responding: 'Envoi…',
  accepted: (name: string) => `Vous faites maintenant partie de ${name}.`,
  declined: (name: string) => `Invitation de ${name} refusée.`,
  switchNow: (name: string) => `Utiliser ${name} maintenant`,
  todoTitle: 'Invitations',
  todoItem: (name: string) => `Rejoindre ${name}`,
  todoText: (role: string, date: string) => `Rôle proposé : ${role}. Invitation valable jusqu’au ${date}.`,
  todoAction: 'Répondre',

  retry: 'Réessayer',
  loading: 'Chargement…',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',

  // Bientôt disponible (routes du contrat pas encore servies).
  pendingMembers:
    'Bientôt, vous verrez ici les membres de l’entreprise et vous pourrez inviter vos collaborateurs.',
  pendingReceived: 'Bientôt, les invitations à rejoindre un compte entreprise apparaîtront ici.',
} as const;

export const invitationStatuses: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'En attente', tone: 'warning' },
  accepted: { label: 'Acceptée', tone: 'success' },
  declined: { label: 'Refusée', tone: 'neutral' },
  expired: { label: 'Expirée', tone: 'neutral' },
};

/** Ordre des rôles proposés (`OrgRole`). */
export const ORG_ROLES = ['org_admin', 'org_member', 'org_viewer'] as const;
