/** Textes du tableau de bord du Recouvrement, de la liste des dossiers et du panneau de Mon espace. */
export const spaceTexts = {
  title: 'Mon recouvrement',
  lead: 'Vos dossiers de créances : ce qui attend votre action, les sommes recouvrées et chaque étape.',
  newCase: 'Nouveau dossier',
  back: 'Mon espace KSP',
  loading: 'Chargement de vos dossiers…',
  retry: 'Réessayer',

  // À faire.
  todoTitle: 'À faire',
  todoNone: 'Rien ne vous attend pour le moment.',
  todoLoading: 'Recherche de ce qui vous attend…',
  draftTitle: (number: string) => `Brouillon ${number} à terminer`,
  draftText: (debtor: string, date: string | null) =>
    date ? `${debtor} · à finaliser avant le ${date}` : debtor,
  draftAction: 'Reprendre',
  mandateTitle: (number: string) => `Mandat du dossier ${number} à signer`,
  mandateText: (debtor: string, date: string | null) =>
    date ? `${debtor} · signez avant le ${date}, puis payez les frais` : debtor,
  mandateAction: 'Signer le mandat',
  feeTitle: (number: string) => `Frais du dossier ${number} à payer`,
  feeText: (debtor: string, date: string | null) => (date ? `${debtor} · à payer avant le ${date}` : debtor),
  feeAction: 'Payer les frais',
  infoTitle: (number: string) => `Complément demandé pour le dossier ${number}`,
  infoText: (debtor: string, date: string | null) =>
    date ? `${debtor} · à envoyer avant le ${date}` : debtor,
  infoAction: 'Compléter',
  decisionsTitle: (count: number) =>
    count > 1 ? `${count} décisions attendent votre réponse` : 'Une décision attend votre réponse',
  moreDecisionsTitle: (count: number) =>
    count > 1
      ? `${count} autres décisions attendent votre réponse`
      : 'Une autre décision attend votre réponse',
  decisionsText: 'Échéancier hors barème, remise, passage à l’huissier ou contestation.',
  decisionsAction: 'Voir les décisions',
  dashboardTitle: 'Recouvrement',
  dashboardSeeAll: 'Mon recouvrement',

  // Chiffres.
  figuresTitle: 'Vos chiffres',
  currency: 'F CFA',
  entrusted: 'Montant confié',
  recovered: 'Recouvré',
  outstanding: 'Reste à recouvrer',
  rate: 'Taux de recouvrement',
  creditedNote: 'Les sommes recouvrées sont créditées à votre portefeuille, commission déduite.',
  wallet: 'Mon portefeuille',

  // Étapes et échéances.
  stagesTitle: 'Dossiers par étape',
  stagesNone: 'Aucun dossier en cours de recouvrement.',
  cases: (count: number) => `${count} dossier${count > 1 ? 's' : ''}`,
  upcomingTitle: 'Prochaines échéances des débiteurs',
  upcomingNone: 'Aucune échéance à venir.',
  upcomingText: (number: string, debtor: string) => `${number} · ${debtor}`,

  // Derniers dossiers.
  latestTitle: 'Derniers dossiers',
  latestNone: 'Vous n’avez pas encore de dossier.',
  allCases: 'Tous mes dossiers',

  // Liens.
  linksTitle: 'Aller plus loin',
  links: {
    import: { title: 'Importer un tableur', text: 'Plusieurs factures d’un coup, un dossier par débiteur.' },
    decisions: { title: 'Décisions', text: 'Échéanciers, remises et devis qui attendent votre réponse.' },
    statements: { title: 'Relevés mensuels', text: 'Encaissements, commission et factures, mois par mois.' },
    preferences: {
      title: 'Préférences',
      text: 'L’échéancier accepté par défaut pour vos nouveaux dossiers.',
    },
  },

  // Liste.
  listTitle: 'Mes dossiers',
  listLead: 'Tous les dossiers de recouvrement du compte actif, les plus récents d’abord.',
  filtersLabel: 'Filtrer les dossiers',
  statusLabel: 'État',
  stageLabel: 'Étape',
  kindLabel: 'Type',
  all: 'Tous',
  searchLabel: 'Rechercher',
  searchHint: 'Numéro (RC-000123) ou nom du débiteur, 3 caractères au moins.',
  searchTooShort: 'Saisissez au moins 3 caractères.',
  search: 'Rechercher',
  clear: 'Effacer les filtres',
  total: (count: number) => `${count} dossier${count > 1 ? 's' : ''}`,
  truncated: (shown: number, total: number) =>
    `Les ${shown} plus récents sur ${total} sont affichés : affinez la recherche pour retrouver un dossier plus ancien.`,
  empty: 'Vous n’avez pas encore de dossier de recouvrement.',
  emptyFiltered: 'Aucun dossier ne correspond à ces filtres.',
  due: 'Reste dû',
  createdAt: (date: string) => `Créé le ${date}`,
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
} as const;
