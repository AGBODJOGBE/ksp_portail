/*
 * Textes de « Mon espace » propres au lot 2 (frise, demande groupée, acceptation commune, rubrique « À
 * faire »). À part de `texts.ts` : seuls les écrans de l'espace qui s'en servent les téléchargent.
 * Textes provisoires (à valider).
 */

export const spaceTexts = {
  lifecycle: {
    label: 'Avancement de la prestation',
    current: 'Étape en cours',
    stopped: 'Arrêtée',
  },
  group: {
    nextQuotes: (count: number) =>
      count > 1
        ? `${count} devis vous attendent : acceptez-les en une fois, avec un même créneau et une même façon de payer.`
        : 'Un devis vous attend : acceptez-le pour réserver votre créneau.',
    nextVisit: 'Notre équipe vous contacte pour convenir de la visite des lieux, commune à vos prestations.',
    nextVisitOn: (date: string) =>
      `Un agent KSP visite les lieux le ${date}, pour toutes vos prestations. Vos devis suivront la visite.`,
    nextQuotePending: 'La visite est faite : notre équipe prépare vos devis, que vous recevrez ici.',
    nextBooked: 'Vos prestations sont réservées : suivez chaque mission et ses passages.',
    nextClosed: 'Cette demande est close.',
    acceptAll: 'Accepter les devis',
    requestsTitle: 'Vos prestations',
    quoteOf: (amount: string) => `Devis : ${amount}`,
    quoteValidUntil: (date: string) => `valable jusqu’au ${date}`,
    seeMission: 'Voir la mission',
    totalsTitle: 'Montants',
    cancel: 'Annuler la demande',
    cancelTitle: 'Annuler toute la demande',
    cancelHint:
      'Les prestations encore ouvertes sont annulées ; celles déjà acceptées ne changent pas. Votre motif (facultatif) aide notre équipe.',
    confirmCancel: 'Confirmer l’annulation',
    cancelled: 'Votre demande est annulée.',
  },
  accept: {
    title: 'Accepter les devis',
    lead: 'Un créneau et une façon de payer pour toutes vos prestations. Rien n’est réservé avant votre confirmation.',
    recapTitle: 'Récapitulatif',
    quoteTotal: 'Total du devis',
    deposit: (percent: number) => `Acompte (${percent} %)`,
    groupTotal: 'Total des devis',
    slotLegend: 'Votre créneau',
    slotHint: 'Les devis qui ne proposent pas ce créneau restent à accepter séparément.',
    slotQuotes: (count: number, total: number) =>
      count === total ? 'Proposé par tous les devis' : `Proposé par ${count} devis sur ${total}`,
    slotRequired: 'Choisissez un créneau.',
    paymentLegend: 'Votre façon de payer',
    businessPayment:
      'Pour une entreprise, les prestations se règlent par facture mensuelle, dans « Mes factures » : aucun choix de paiement n’est demandé.',
    submit: 'Confirmer et réserver',
    sending: 'Réservation…',
    cancel: 'Annuler',
  },
  outcome: {
    title: 'Réservation confirmée',
    booked: (count: number) =>
      count > 1 ? `${count} prestations sont réservées.` : 'Votre prestation est réservée.',
    cancelledCount: (count: number) =>
      count > 1 ? `${count} demandes sont annulées.` : 'Votre demande est annulée.',
    skippedTitle: 'Laissées de côté',
    payTitle: 'Régler maintenant',
    payLead:
      'Payez par Mobile Money : vous êtes redirigé vers la page sécurisée du prestataire, puis vous revenez ici.',
    noPayNow: 'Rien à régler en ligne pour le moment : vous paierez selon la façon choisie.',
    loadingMission: 'Chargement de la mission…',
  },
  skipped: {
    not_open: 'demande déjà close',
    transition_not_allowed: 'étape qui ne le permet pas',
    excluded: 'demande exclue',
    own_visit: 'visite planifiée à part',
    visit_completed: 'visite déjà faite',
    no_quote: 'pas encore de devis',
    quote_expired: 'devis expiré',
    slot_not_proposed: 'créneau non proposé par ce devis',
  } as Record<string, string>,
  todo: {
    title: 'À faire',
    lead: 'Ce qui attend une action de votre part, le plus urgent d’abord.',
    nothing: 'Rien à faire de votre côté pour le moment : nous vous préviendrons ici.',
    quoteGroup: (count: number) => (count > 1 ? `${count} devis à accepter` : 'Un devis à accepter'),
    quoteText: (date: string) => `Acceptez avant le ${date} pour réserver votre créneau.`,
    quoteAction: 'Voir et accepter',
    payTitle: 'Paiement à régler',
    payText: (amount: string | null, when: string) =>
      amount ? `${amount} à régler ${when}.` : `Montant affiché sur la page de paiement, à régler ${when}.`,
    payBefore: 'avant le premier passage',
    payAfter: 'maintenant que la prestation est faite',
    payAction: 'Payer',
    visitTitle: 'Visite des lieux prévue',
    visitText: (date: string) => `Un agent KSP passe le ${date}. Soyez présent ou prévenez-nous.`,
    passageTitle: 'Prochain passage',
    passageText: (date: string) => `Nos agents interviennent le ${date}.`,
    seeAction: 'Voir',
    ongoingTitle: 'Prestations en cours',
    ongoingNone: 'Aucune prestation en cours.',
    shortcutsTitle: 'Raccourcis',
  },
} as const;
