/** Textes du centre de notifications (fonctionnalité notification), chargés seulement par ses pages. */

export const notificationTexts = {
  title: 'Mes notifications',
  lead: 'Les messages de KSP sur vos demandes, devis, prestations et factures, réunis au même endroit.',
  homeLinkText: 'Messages reçus de KSP : devis, rendez-vous, factures.',
  loading: 'Chargement…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  empty: 'Aucune notification pour le moment.',
  emptyUnread: 'Vous avez tout lu.',
  emptyHint: 'Vous serez prévenu ici de chaque étape de vos demandes : devis, rendez-vous, factures.',
  filtersLabel: 'Afficher',
  filterAll: 'Toutes',
  filterUnread: 'Non lues',
  unreadCount: (count: number) =>
    count === 0 ? 'Aucune non lue' : count === 1 ? '1 non lue' : `${count} non lues`,
  unreadLabel: 'Non lue',
  open: 'Voir',
  markRead: 'Marquer comme lue',
  markAllRead: 'Tout marquer comme lu',
  markingAll: 'En cours…',
  allMarked: 'Toutes vos notifications sont marquées comme lues.',
  receivedOn: (date: string) => `Reçue le ${date}`,
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  /** Pastille de l'accueil de Mon espace. */
  bell: {
    label: 'Notifications',
    unread: (count: number) => (count === 1 ? '1 notification non lue' : `${count} notifications non lues`),
    none: 'Aucune notification non lue',
  },
  preferences: {
    title: 'Recevoir les messages',
    lead: 'Choisissez par quels canaux KSP vous écrit pour les messages courants (devis, rendez-vous, factures).',
    whatsapp: 'Par WhatsApp',
    email: 'Par e-mail',
    emailHint: 'Seulement à une adresse e-mail confirmée dans votre profil.',
    always:
      'Les codes de connexion, les messages importants (factures impayées, suspension d’un service) et ceux de la suppression de votre compte vous sont toujours envoyés. Chaque message reste aussi dans cette page.',
    noneWarning: 'Sans aucun canal, vous ne serez prévenu que dans cette page : pensez à la consulter.',
    save: 'Enregistrer mes choix',
    saving: 'Enregistrement…',
    saved: 'Vos choix sont enregistrés.',
  },
} as const;
