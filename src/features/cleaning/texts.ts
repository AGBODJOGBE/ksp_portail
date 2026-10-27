import type { BadgeTone } from '@/components/ui/badge';

/*
 * Textes de l'interface du Nettoyage (simulateur branché, demande de devis, « Mes prestations de
 * nettoyage »). Ils restent dans la fonctionnalité plutôt que dans `src/i18n/fr.ts`, chargé par toutes
 * les pages : seules les pages du Nettoyage les téléchargent.
 */

export const ZONES_TEXT = 'Cotonou, Porto-Novo et Abomey-Calavi';

export const cleaningTexts = {
  common: {
    retry: 'Réessayer',
    loadMore: 'Afficher plus',
    loadingMore: 'Chargement…',
    back: 'Retour à mes prestations',
    genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
    notFound: 'Cet élément est introuvable. Il a peut-être été supprimé, ou il appartient à un autre compte.',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    reasonLabel: 'Motif (facultatif)',
    sending: 'Envoi…',
  },
  simulator: {
    loadingServices: 'Chargement des prestations…',
    servicesError: 'Impossible de charger les prestations.',
    noServices: 'Aucune prestation n’est proposée en ligne pour le moment. Contactez-nous pour un devis.',
    computing: 'Calcul de votre estimation…',
    estimateTitle: 'Votre estimation',
    estimateRange: (low: string, high: string) => `Entre ${low} et ${high}`,
    perVisit: 'Prix d’un passage.',
    breakdownTitle: 'Détail du calcul',
    minimumApplied: 'Le minimum de commande de cette prestation s’applique.',
    teamSize: (count: number) =>
      count > 1 ? `Équipe recommandée : ${count} agents.` : 'Équipe recommandée : 1 agent.',
    notContractual: 'Estimation non contractuelle : le prix définitif figure dans le devis établi par KSP.',
    unpricedTitle: 'Prix bientôt disponible',
    unpricedText:
      'Le prix de cette prestation n’est pas encore publié : demandez un devis, KSP vous répondra.',
    outOfZoneTitle: 'Nous n’intervenons pas encore dans votre commune',
    outOfZoneText: `KSP Nettoyage intervient aujourd’hui à ${ZONES_TEXT}. Contactez-nous : nous vous préviendrons dès que votre commune sera desservie.`,
    requestQuote: 'Demander un devis',
    visitNotice: 'Une visite des lieux est prévue avant le devis.',
    errorTitle: 'Estimation indisponible',
    contactUs: 'Nous contacter',
  },
  request: {
    title: 'Demander un devis de nettoyage',
    lead: 'Vérifiez votre besoin, indiquez l’adresse et vos disponibilités : notre équipe vous répond dans votre espace.',
    visitNotice:
      'Une visite des lieux est prévue avant le devis : notre équipe vous contacte pour convenir d’un rendez-vous, puis vous envoie le devis dans votre espace.',
    missingTitle: 'Commencez par décrire votre besoin',
    missingText:
      'La demande de devis reprend votre simulation : décrivez d’abord vos locaux dans le simulateur.',
    toSimulator: 'Aller au simulateur',
    summaryTitle: 'Votre besoin',
    editSimulation: 'Modifier ma simulation',
    customerKind: 'Vous faites cette demande',
    individual: 'En tant que particulier',
    business: 'Pour une entreprise',
    businessHint:
      'Pour une entreprise, le devis prend la forme d’un contrat, réglé par une facture chaque mois (« Mes factures »).',
    recurrenceTitle: 'Régularité',
    recurrenceHint: 'Facultatif : laissez vide si vous ne savez pas encore.',
    visitsPerWeek: 'Passages par semaine',
    daysPerWeek: 'Jours d’intervention par semaine (facultatif)',
    daysHint: 'De 1 à 7, si vous le savez déjà.',
    daysInvalid: 'Indiquez un nombre de jours entre 1 et 7, ou laissez vide.',
    outOfZone: `Nous n’intervenons pas encore dans cette commune : KSP Nettoyage intervient aujourd’hui à ${ZONES_TEXT}.`,
    visitsPerMonth: 'Passages par mois',
    durationMonths: 'Durée souhaitée (en mois)',
    recurrenceInvalid:
      'Indiquez le nombre de passages (7 au plus par semaine, 31 par mois) et la durée (1 à 36 mois), ou laissez les deux vides.',
    commune: 'Commune',
    otherCommune: 'Autre commune',
    address: 'Adresse d’intervention',
    addressHint: 'Quartier, rue, repère : tout ce qui aide notre équipe à vous trouver.',
    addressRequired: 'Indiquez l’adresse d’intervention.',
    slotsTitle: 'Vos disponibilités',
    slotsHint: (minDate: string) => `Jusqu’à trois créneaux, à partir du ${minDate}. Heures du Bénin.`,
    slotDate: (index: number) => `Date du créneau ${index}`,
    slotPeriod: (index: number) => `Moment du créneau ${index}`,
    addSlot: 'Ajouter un créneau',
    removeSlot: (index: number) => `Retirer le créneau ${index}`,
    slotRequired: 'Choisissez au moins une date.',
    slotTooEarly: (minDate: string) => `Choisissez une date à partir du ${minDate}.`,
    comment: 'Commentaire (facultatif)',
    commentHint: 'Accès, animaux, contraintes particulières…',
    submit: 'Envoyer ma demande',
    successTitle: 'Demande envoyée',
    successText:
      'Votre demande est bien reçue. Vous serez prévenu à chaque étape : visite, devis, puis réservation.',
    seeRequest: 'Voir ma demande',
    profileNeeded: 'Complétez votre profil pour envoyer votre demande.',
  },
  periods: [
    { value: 'morning', label: 'Matin (8 h – 12 h)', from: '08:00', to: '12:00' },
    { value: 'afternoon', label: 'Après-midi (13 h – 17 h)', from: '13:00', to: '17:00' },
  ],
  space: {
    eyebrow: 'Mon espace KSP',
    title: 'Mes prestations de nettoyage',
    lead: 'Vos demandes de devis et vos missions, de la visite au dernier passage.',
    requestsTitle: 'Mes demandes de devis',
    missionsTitle: 'Mes missions',
    noRequests: 'Vous n’avez encore demandé aucun devis.',
    noMissions: 'Aucune mission pour le moment : elle apparaît ici dès qu’un devis est accepté.',
    newRequest: 'Simuler et demander un devis',
    loading: 'Chargement…',
    requestedOn: (date: string) => `Demandée le ${date}`,
    firstVisit: (date: string) => `Premier passage le ${date}`,
    homeLink: 'Mes prestations de nettoyage',
    homeLinkText: 'Demandes de devis, missions et passages.',
  },
  requestDetail: {
    title: 'Demande de devis',
    need: 'Votre besoin',
    premises: 'Locaux',
    quantity: 'Taille',
    options: 'Options',
    commune: 'Commune',
    address: 'Adresse',
    preferredSlots: 'Vos disponibilités',
    comment: 'Commentaire',
    recurrence: 'Régularité',
    estimate: 'Estimation',
    visitTitle: 'Visite des lieux',
    visitPending:
      'Une visite des lieux est prévue avant le devis : notre équipe vous contacte pour la planifier, puis elle apparaît ici.',
    daysPerWeek: 'Jours d’intervention',
    businessPayment:
      'Pour une entreprise, la prestation se règle par une facture mensuelle, à retrouver dans « Mes factures ».',
    visitOn: (date: string) => `Prévue le ${date}`,
    visitReport: 'Compte rendu',
    quoteTitle: 'Devis',
    quotePending: 'Le devis vous sera envoyé ici après l’étude de votre demande.',
    quoteLine: 'Prestation',
    quoteQuantity: 'Quantité',
    quoteUnitPrice: 'Prix unitaire',
    quoteAmount: 'Montant',
    subtotal: 'Sous-total d’un passage',
    interventions: (count: number) => (count > 1 ? `${count} passages` : '1 passage'),
    total: 'Total',
    deposit: (percent: number) => `Acompte (${percent} %)`,
    team: (count: number, duration: string) =>
      `${count > 1 ? `${count} agents` : '1 agent'}, environ ${duration} par passage`,
    validUntil: (date: string) => `Valable jusqu’au ${date}`,
    expired: 'Ce devis a expiré. Faites une nouvelle demande si vous êtes toujours intéressé.',
    proposedSlots: 'Créneaux proposés',
    closingReason: 'Motif',
    seeMission: 'Voir la mission',
    accept: 'Accepter le devis',
    acceptTitle: 'Accepter le devis',
    chooseSlot: 'Choisissez votre créneau',
    paymentTitle: 'Votre paiement',
    paymentOption: 'Montant',
    paymentTiming: 'Moment',
    paymentMethod: 'Moyen',
    confirmAccept: 'Confirmer et réserver',
    slotRequired: 'Choisissez un créneau.',
    decline: 'Refuser le devis',
    declineTitle: 'Refuser le devis',
    confirmDecline: 'Confirmer le refus',
    cancelRequest: 'Annuler la demande',
    cancelTitle: 'Annuler la demande',
    confirmCancel: 'Confirmer l’annulation',
    conflict: 'La demande vient d’être modifiée. Voici sa dernière version : vérifiez-la avant de continuer.',
  },
  missionDetail: {
    title: 'Mission de nettoyage',
    bookingTitle: 'Réservation',
    slot: 'Créneau réservé',
    address: 'Adresse',
    progress: (done: number, planned: number) =>
      `${done} passage${done > 1 ? 's' : ''} effectué${done > 1 ? 's' : ''} sur ${planned}`,
    onHold:
      'Cette mission est en attente : les passages reprendront après résolution de l’incident ; notre équipe vous tient informé.',
    suspended: (cause: string, count: number, since: string) =>
      cause === 'unpaid_invoices'
        ? `Service suspendu depuis le ${since} : ${count} facture${count > 1 ? 's' : ''} impayée${count > 1 ? 's' : ''}. Les passages à venir sont annulés ; ils seront reprogrammés dès le règlement.`
        : `Service suspendu depuis le ${since} : ${count} passage${count > 1 ? 's' : ''} impayé${count > 1 ? 's' : ''}. Les passages à venir sont annulés ; ils seront reprogrammés dès la régularisation.`,
    seeInvoices: 'Voir mes factures',
    daysPerWeek: (days: number) => `${days} jour${days > 1 ? 's' : ''} par semaine`,
    interventionsTitle: 'Passages',
    noInterventions: 'Les passages seront planifiés par notre équipe.',
    agents: 'Équipe',
    incident: 'Incident',
    paymentTitle: 'Paiement',
    paymentPlan: 'Option choisie',
    total: 'Total',
    deposit: (percent: number) => `Acompte (${percent} %)`,
    paid: 'Déjà réglé',
    paymentsTitle: 'Règlements reçus',
    noPayments: 'Aucun règlement enregistré pour le moment.',
    cancellationReason: 'Motif de l’annulation',
    cancel: 'Annuler la mission',
    cancelTitle: 'Annuler la mission',
    cancelHint: 'Sans frais jusqu’à 24 heures avant le premier passage ; au-delà, contactez le support.',
    confirmCancel: 'Confirmer l’annulation',
    seeRequest: 'Voir la demande de devis',
  },
} as const;

/** Questions du simulateur : les choix viennent du catalogue de la gateway. */
export const simulatorQuestions = {
  service: { name: 'Prestation', title: 'Quelle prestation vous intéresse ?' },
  premises: {
    name: 'Locaux',
    title: 'Quel type de locaux ?',
    hint: 'Pour les entreprises comme pour les particuliers, une visite des lieux peut précéder le devis.',
  },
  size: {
    name: 'Taille',
    title: 'Quelle est la taille des locaux ?',
    hint: 'Une valeur approximative suffit. Vous pourrez la préciser avec notre équipe.',
  },
  options: {
    name: 'Options',
    title: 'Des options à ajouter ?',
    hint: 'Facultatif : cochez ce qui vous intéresse.',
    none: 'Aucune option',
  },
  commune: {
    name: 'Commune',
    title: 'Dans quelle commune ?',
    hint: `Nous intervenons aujourd’hui à ${ZONES_TEXT}.`,
    other: 'Autre commune',
  },
  frequency: {
    name: 'Fréquence',
    title: 'À quelle fréquence ?',
    hint: 'L’estimation porte sur un passage.',
  },
} as const;

type StatusLabel = { label: string; tone: BadgeTone };

export const requestStatuses: Record<string, StatusLabel> = {
  received: { label: 'Demande reçue', tone: 'brand' },
  visit_scheduled: { label: 'Visite planifiée', tone: 'brand' },
  quote_sent: { label: 'Devis à étudier', tone: 'accent' },
  accepted: { label: 'Devis accepté', tone: 'success' },
  declined: { label: 'Devis refusé', tone: 'neutral' },
  rejected: { label: 'Demande non retenue', tone: 'danger' },
  expired: { label: 'Devis expiré', tone: 'warning' },
  cancelled: { label: 'Demande annulée', tone: 'neutral' },
};

export const missionStatuses: Record<string, StatusLabel> = {
  to_schedule: { label: 'À planifier', tone: 'brand' },
  scheduled: { label: 'Planifiée', tone: 'brand' },
  in_progress: { label: 'En cours', tone: 'accent' },
  on_hold: { label: 'Suspendue', tone: 'warning' },
  completed: { label: 'Terminée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

export const interventionStatuses: Record<string, StatusLabel> = {
  planned: { label: 'Prévu', tone: 'brand' },
  in_progress: { label: 'En cours', tone: 'accent' },
  on_hold: { label: 'Suspendu', tone: 'warning' },
  completed: { label: 'Effectué', tone: 'success' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};

export const visitStatuses: Record<string, string> = {
  scheduled: 'Planifiée',
  completed: 'Effectuée',
  cancelled: 'Annulée',
};

export const paymentStatuses: Record<string, StatusLabel> = {
  due: { label: 'À régler', tone: 'warning' },
  deposit_received: { label: 'Acompte reçu', tone: 'brand' },
  paid: { label: 'Réglé', tone: 'success' },
};

export const paymentOptions: Record<string, string> = { deposit: 'Acompte', full: 'Totalité' };
export const paymentTimings: Record<string, string> = {
  before: 'Avant la prestation',
  after: 'Après la prestation',
};
/** `mobile_money_online` (encaissé par le service payment) n'est pas encore proposé au client. */
export const paymentMethods: Record<string, string> = {
  cash: 'Espèces',
  mobile_money_offline: 'Mobile Money (auprès de l’équipe)',
  mobile_money_online: 'Mobile Money en ligne',
};
export const OFFERED_PAYMENT_METHODS = ['cash', 'mobile_money_offline'] as const;

export const premisesTypes: Record<string, string> = {
  apartment: 'Appartement',
  house: 'Maison ou villa',
  office: 'Bureaux',
  shop: 'Commerce ou local recevant du public',
  warehouse: 'Entrepôt ou local technique',
  other: 'Autre',
};

/** Unité de calcul d'une prestation : libellés du champ de quantité. */
export const units: Record<string, { label: string; inputLabel: string; unit: string }> = {
  square_meter: { label: 'Surface', inputLabel: 'Surface approximative', unit: 'm²' },
  room: { label: 'Nombre de pièces', inputLabel: 'Nombre de pièces', unit: 'pièces' },
  septic_tank: { label: 'Nombre de fosses', inputLabel: 'Nombre de fosses', unit: 'fosses' },
  cubic_meter: { label: 'Volume', inputLabel: 'Volume approximatif', unit: 'm³' },
};

export const frequencies: Record<string, string> = {
  once: 'Une seule fois',
  weekly: 'Chaque semaine',
  monthly: 'Chaque mois',
};

/** Libellé d'un état, neutre pour un état inconnu (ajouté par la gateway après ce front). */
export function statusOf(table: Record<string, StatusLabel>, status: string): StatusLabel {
  return table[status] ?? { label: status, tone: 'neutral' };
}
