import type { BadgeTone } from '@/components/ui/badge';
import { LOADING, LOADING_SERVICES } from './loading-texts';
import { type SuspensionCausesInput, suspensionCauses } from './suspension';

/*
 * Textes de l'interface du Nettoyage (simulateur branché, demande de devis, « Mes prestations de
 * nettoyage »). Ils restent dans la fonctionnalité plutôt que dans `src/i18n/fr.ts`, chargé par toutes
 * les pages : seules les pages du Nettoyage les téléchargent.
 *
 * Les communes desservies viennent de la gateway : les textes qui les citent reçoivent la liste mise en
 * phrase (`zonesSentence`), ou `null` si elle n'est pas connue.
 */

/** « KSP Nettoyage intervient aujourd'hui à … » ; phrase neutre si la liste n'est pas connue. */
export function zonesLine(sentence: string | null): string {
  return sentence
    ? `KSP Nettoyage intervient aujourd’hui à ${sentence}.`
    : 'KSP Nettoyage n’intervient pour le moment dans aucune commune.';
}

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
    reasonCount: (count: number, max: number) => `${count} / ${max} caractères`,
    sending: 'Envoi…',
    supportReference: (id: string) => `Référence à donner au support : ${id}`,
    organizationSuspendedRequest:
      'Votre compte entreprise est suspendu par KSP : aucune nouvelle demande de devis n’est possible en son nom avant sa réactivation. Contactez KSP, ou revenez à votre compte personnel pour une demande de particulier.',
    organizationSuspendedAccept:
      'Votre compte entreprise est suspendu par KSP : ce devis ne peut pas être accepté avant sa réactivation. Contactez KSP pour en savoir plus.',
  },
  dashboard: {
    title: 'Nettoyage',
    seeAll: 'Mes prestations',
    quoteBadge: 'Devis à étudier',
    quoteText: (date: string) => `Acceptez-le pour réserver, ou refusez-le, avant le ${date}.`,
    quoteAction: 'Étudier le devis',
    suspendedText: (date: string) =>
      `Service suspendu depuis le ${date} : régularisez la situation pour que les passages reprennent.`,
    suspendedAction: 'Voir la mission',
    nothing: 'Rien à faire de votre côté pour le moment.',
    summary: (requests: number, missions: number) =>
      `En cours chez KSP : ${requests} demande${requests > 1 ? 's' : ''} de devis, ${missions} mission${missions > 1 ? 's' : ''}.`,
  },
  hero: {
    online: 'Service en ligne',
    journeyEyebrow: 'Votre démarche en ligne',
    journeyTitle: 'Quatre étapes, suivies depuis votre espace',
    journeyTexts: [
      'Quelques questions sur vos locaux : une fourchette de prix, sans compte.',
      'Depuis votre espace, indiquez l’adresse et vos disponibilités.',
      'Un agent KSP passe sur place : le devis est établi d’après la visite.',
      'Acceptez le devis en ligne, choisissez votre créneau, suivez chaque passage.',
    ],
  },
  journey: {
    nextStep: 'Prochaine étape',
    requestProgress: 'Avancement de la demande',
    missionProgress: 'Avancement de la mission',
    requestFormProgress: 'Étapes de la demande de devis',
    quoteToAnswer: (date: string) =>
      `Votre devis est prêt. Étudiez-le, puis acceptez-le pour réserver votre créneau, ou refusez-le, avant le ${date}.`,
    visitPlanned: (date: string) =>
      `Un agent KSP visitera les lieux le ${date} pour préparer votre devis. Vous le recevrez ici.`,
    visitDone: 'La visite des lieux est faite : notre équipe prépare votre devis, que vous recevrez ici.',
    seeQuote: 'Étudier le devis',
    followMission: 'Suivre la mission',
    newRequest: 'Faire une nouvelle demande',
    declined: 'Votre refus est enregistré. Le devis n’est plus valable.',
    cancelled: 'Votre demande est annulée.',
    missionCancelled: 'Votre mission est annulée.',
    booked: 'Devis accepté : votre mission est réservée. Retrouvez ici ses passages et vos règlements.',
    nextVisit: (date: string) => `Prochain passage le ${date}.`,
    suspendedAction: 'Régularisez la situation auprès de l’équipe KSP pour que le service reprenne.',
    suspendedByKsp:
      'KSP doit réactiver votre compte entreprise pour que le service reprenne. Contactez KSP pour en savoir plus.',
  },
  context: {
    individual: 'Compte personnel',
    business: (name: string | null) => (name ? `Entreprise : ${name}` : 'Compte entreprise'),
    requestIndividual:
      'Vous faites cette demande en tant que particulier : vous choisirez votre façon de payer en acceptant le devis.',
    requestBusiness: (name: string | null) =>
      `Vous faites cette demande pour ${name ?? 'votre entreprise'} : la prestation sera réglée par une facture mensuelle, dans « Mes factures ».`,
    businessLater:
      'Pour une demande au nom de votre entreprise, choisissez son compte avec « Changer de compte ».',
    businessTag: 'Entreprise',
  },
  simulator: {
    loadingServices: LOADING_SERVICES,
    servicesError: 'Impossible de charger les prestations.',
    zonesError: 'Impossible de charger les communes desservies.',
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
    outOfZoneText: (sentence: string | null) =>
      `${zonesLine(sentence)} Contactez-nous : nous vous préviendrons dès que votre commune sera desservie.`,
    requestQuote: 'Demander un devis',
    nextTitle: 'Étape suivante : votre demande de devis',
    visitNotice: 'Une visite des lieux, obligatoire, précède le devis.',
    errorTitle: 'Estimation indisponible',
    contactUs: 'Nous contacter',
  },
  request: {
    title: 'Demander un devis de nettoyage',
    lead: 'Vérifiez votre besoin, indiquez l’adresse et vos disponibilités : notre équipe vous répond dans votre espace.',
    visitNotice:
      'Une visite des lieux est obligatoire avant tout devis : notre équipe vous contacte pour convenir d’un rendez-vous, puis vous envoie le devis dans votre espace.',
    missingTitle: 'Commencez par décrire votre besoin',
    missingText:
      'La demande de devis reprend votre simulation : décrivez d’abord vos locaux dans le simulateur.',
    toSimulator: 'Aller au simulateur',
    summaryTitle: 'Votre besoin',
    editSimulation: 'Modifier ma simulation',
    customerKind: 'Vous faites cette demande',
    recurrenceTitle: 'Régularité',
    recurrenceHint: 'Facultatif : laissez vide si vous ne savez pas encore.',
    visitsPerWeek: 'Passages par semaine',
    daysPerWeek: 'Jours d’intervention par semaine (facultatif)',
    daysHint: 'De 1 à 7, si vous le savez déjà.',
    daysInvalid: 'Indiquez un nombre de jours entre 1 et 7, ou laissez vide.',
    teamSize: 'Nombre d’agents souhaité (facultatif)',
    teamSizeHint: 'De 1 à 50. Laissez vide : notre équipe adapte le nombre d’agents à vos locaux.',
    teamSizeInvalid: 'Indiquez un nombre d’agents entre 1 et 50, ou laissez vide.',
    outOfZone: (sentence: string | null) =>
      `Nous n’intervenons pas encore dans cette commune. ${zonesLine(sentence)}`,
    visitsPerMonth: 'Passages par mois',
    durationMonths: 'Durée souhaitée (en mois)',
    recurrenceInvalid:
      'Indiquez le nombre de passages (7 au plus par semaine, 31 par mois) et la durée (1 à 36 mois), ou laissez les deux vides.',
    commune: 'Commune',
    otherCommune: 'Autre commune',
    loadingZones: 'Chargement des communes desservies…',
    address: 'Adresse d’intervention',
    addressHint: 'Quartier, rue, repère : tout ce qui aide notre équipe à vous trouver.',
    addressRequired: 'Indiquez l’adresse d’intervention.',
    addressTooLong: (max: number) => `L’adresse ne doit pas dépasser ${max} caractères.`,
    commentTooLong: (max: number) => `Le commentaire ne doit pas dépasser ${max} caractères.`,
    partWho: 'Pour qui ?',
    partWhere: 'Où intervenir ?',
    partDetails: 'Précisions',
    partDetailsHint: 'Facultatif : tout ce qui aide notre équipe à préparer la visite et le devis.',
    fromSimulation: 'Repris de la simulation',
    afterTitle: 'Après l’envoi',
    afterSteps: [
      'Votre demande apparaît dans « Mes prestations de nettoyage ».',
      'Notre équipe vous contacte pour planifier la visite des lieux, obligatoire.',
      'Vous recevez le devis dans votre espace, et vous l’acceptez ou le refusez en ligne.',
    ],
    successReceived: 'Reçue le',
    successStatus: 'État',
    successReference: 'Référence',
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
      'Votre demande est bien reçue. Vous serez prévenu à chaque étape : visite des lieux, devis, puis réservation.',
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
    lead: 'Vos demandes de devis et vos missions, de la visite des lieux au dernier passage.',
    requestsTitle: 'Mes demandes de devis',
    missionsTitle: 'Mes missions',
    requestsLead: 'De la demande au devis : l’étape en cours et qui doit agir.',
    missionsLead: 'Vos prestations réservées et l’avancement de leurs passages.',
    noRequests: 'Vous n’avez encore demandé aucun devis.',
    noRequestsHint:
      'Simulez votre prestation en quelques questions, puis demandez votre devis : il apparaîtra ici.',
    noMissions: 'Aucune mission pour le moment : elle apparaît ici dès qu’un devis est accepté.',
    noRequestsBusiness: 'Aucune demande de devis au nom de cette entreprise.',
    noMissionsBusiness:
      'Aucune mission au nom de cette entreprise : elle apparaît ici dès qu’un devis est accepté.',
    newRequest: 'Simuler et demander un devis',
    loading: LOADING,
    requestedOn: (date: string) => `Demandée le ${date}`,
    firstVisit: (date: string) => `Premier passage le ${date}`,
    homeLink: 'Mes prestations de nettoyage',
    homeLinkText: 'Demandes de devis, visites, missions et passages.',
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
    requestedTeam: 'Équipe souhaitée',
    recommendedTeam: 'Équipe recommandée',
    agents: (count: number) => (count > 1 ? `${count} agents` : '1 agent'),
    customer: 'Type de compte',
    visitTitle: 'Visite des lieux',
    visitPending:
      'La visite des lieux est obligatoire avant le devis : notre équipe vous contacte pour la planifier, puis elle apparaît ici.',
    visitScheduled: 'Un agent KSP passera à cette date pour préparer votre devis.',
    visitCancelled: 'Cette visite a été annulée : notre équipe vous recontacte pour en fixer une autre.',
    daysPerWeek: 'Jours d’intervention',
    businessPayment:
      'Pour une entreprise, la prestation se règle par une facture mensuelle, à retrouver dans « Mes factures » : aucun choix de paiement n’est demandé.',
    visitOn: (date: string) => `Prévue le ${date}`,
    visitDoneOn: (date: string) => `Effectuée le ${date}`,
    visitReport: 'Compte rendu',
    quoteTitle: 'Devis',
    quotePending: 'Le devis vous sera envoyé ici après la visite des lieux.',
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
    expiredBadge: 'Expiré',
    noSlotYet: 'Créneau à choisir',
    teamLabel: 'Équipe',
    declineHint: 'Le devis ne sera plus valable. Votre motif aide notre équipe à mieux vous proposer.',
    cancelHint: 'La demande est close : pour un autre besoin, faites une nouvelle simulation.',
    proposedSlots: 'Créneaux proposés',
    closingReason: 'Motif',
    seeMission: 'Voir la mission',
    accept: 'Accepter le devis',
    acceptTitle: 'Accepter le devis',
    acceptLead:
      'Choisissez votre créneau, puis votre façon de payer. Rien n’est réservé avant votre confirmation.',
    acceptRecap: 'Vous réservez',
    firstPayment: (amount: string, timing: string, method: string) =>
      `À régler : ${amount}, ${timing}, ${method}.`,
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
    recurrence: 'Régularité',
    progress: (done: number, planned: number) =>
      `${done} passage${done > 1 ? 's' : ''} effectué${done > 1 ? 's' : ''} sur ${planned}`,
    onHold:
      'Un passage est en attente après un incident : il reprendra dès sa résolution ; notre équipe vous tient informé.',
    suspended: suspensionText,
    resumed:
      'Le service a repris : les passages annulés pendant la suspension sont reprogrammés ; à défaut, notre équipe les replanifie avec vous.',
    seeInvoices: 'Voir mes factures',
    daysPerWeek: (days: number) => `${days} jour${days > 1 ? 's' : ''} par semaine`,
    interventionsTitle: 'Passages',
    noInterventions: 'Les passages seront planifiés par notre équipe.',
    agents: 'Équipe',
    incident: 'Incident',
    checklist: (done: number, total: number) => `Liste de contrôle : ${done} sur ${total}`,
    photos: (before: number, after: number) =>
      `Photos enregistrées : ${before} avant, ${after} après (consultation bientôt disponible).`,
    cancelledBySuspension: 'Annulé pendant la suspension du service',
    completedOn: (date: string) => `terminé le ${date}`,
    startedOn: (date: string) => `commencé le ${date}`,
    paymentTitle: 'Paiement',
    paymentPlan: 'Option choisie',
    businessPayment:
      'Contrat d’entreprise : la prestation est réglée par une facture mensuelle, avec son échéance, dans « Mes factures ».',
    total: 'Total',
    deposit: (percent: number) => `Acompte (${percent} %)`,
    paid: 'Déjà réglé',
    paymentsTitle: 'Règlements reçus',
    noPayments: 'Aucun règlement enregistré pour le moment.',
    howToPay:
      'Vous pouvez aussi régler auprès de l’équipe KSP (espèces, Mobile Money), qui l’enregistre ici.',
    cancellationReason: 'Motif de l’annulation',
    cancel: 'Annuler la mission',
    cancelTitle: 'Annuler la mission',
    cancelHint: 'Sans frais jusqu’à 24 heures avant le premier passage ; au-delà, contactez le support.',
    confirmCancel: 'Confirmer l’annulation',
    seeRequest: 'Voir la demande de devis',
  },
} as const;

/** Questions du simulateur : les choix viennent du catalogue et des zones de la gateway. */
export const simulatorQuestions = {
  service: { name: 'Prestation', title: 'Quelle prestation vous intéresse ?' },
  premises: {
    name: 'Locaux',
    title: 'Quel type de locaux ?',
    hint: 'Pour les entreprises comme pour les particuliers, une visite des lieux est obligatoire avant le devis.',
  },
  size: {
    name: 'Taille',
    title: 'Quelle est la taille des locaux ?',
    hint: 'Une valeur approximative suffit. Vous pourrez la préciser avec notre équipe lors de la visite.',
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
    hint: (sentence: string | null) => zonesLine(sentence),
    other: 'Autre commune',
  },
  frequency: {
    name: 'Fréquence',
    title: 'À quelle fréquence ?',
    hint: 'L’estimation porte sur un passage.',
  },
} as const;

/** Qui doit agir maintenant : le client (« À vous d'agir ») ou l'équipe KSP. */
export type Actor = 'client' | 'ksp';

export type StatusLabel = { label: string; tone: BadgeTone; hint?: string; actor?: Actor };

/** Libellés de l'acteur attendu, affichés à côté de la prochaine étape. */
export const actorLabels: Record<Actor, string> = {
  client: 'À vous d’agir',
  ksp: 'KSP s’en occupe',
};

/** États d'une demande de devis (`CleaningQuoteRequest.status`), avec ce qui se passe ensuite. */
export const requestStatuses: Record<string, StatusLabel> = {
  received: {
    label: 'Demande reçue',
    tone: 'brand',
    actor: 'ksp',
    hint: 'Notre équipe vous contacte pour planifier la visite des lieux, obligatoire avant le devis.',
  },
  visit_scheduled: {
    label: 'Visite planifiée',
    tone: 'brand',
    actor: 'ksp',
    hint: 'La visite des lieux est planifiée ; le devis vous sera envoyé ici après la visite.',
  },
  quote_sent: {
    label: 'Devis à étudier',
    tone: 'accent',
    actor: 'client',
    hint: 'Votre devis est prêt : acceptez-le pour réserver, ou refusez-le, avant sa date de validité.',
  },
  accepted: {
    label: 'Devis accepté',
    tone: 'success',
    hint: 'Votre mission est créée : suivez-en les passages.',
  },
  declined: { label: 'Devis refusé', tone: 'neutral', hint: 'Vous avez refusé ce devis.' },
  rejected: {
    label: 'Demande non retenue',
    tone: 'danger',
    hint: 'KSP n’a pas pu donner suite à cette demande.',
  },
  expired: {
    label: 'Devis expiré',
    tone: 'warning',
    hint: 'Le devis n’a pas été accepté à temps. Faites une nouvelle demande si besoin.',
  },
  cancelled: { label: 'Demande annulée', tone: 'neutral', hint: 'Cette demande a été annulée.' },
};

/** La démarche en ligne, de la simulation à la réservation (page publique, demande de devis). */
export const serviceJourney = [
  { label: 'Simuler mon prix' },
  { label: 'Demander un devis' },
  { label: 'Visite des lieux' },
  { label: 'Accepter et suivre' },
] as const;

/** Étapes d'une demande, pour le fil de progression (signature). */
export const requestJourney = [
  { label: 'Votre demande' },
  { label: 'Visite des lieux' },
  { label: 'Devis' },
  { label: 'Réservation' },
] as const;

/** États qui arrêtent le parcours d'une demande avant la réservation. */
const STOPPED_REQUESTS = new Set(['declined', 'rejected', 'expired', 'cancelled']);

/**
 * Position d'une demande dans son parcours, d'après son état et ce qu'elle contient déjà (visite,
 * devis). Simple correspondance d'affichage : l'état vient de la gateway.
 */
export function requestStage(request: { status: string; visit: { status: string } | null; quote: unknown }): {
  current: number;
  stopped: boolean;
} {
  if (request.status === 'accepted') return { current: requestJourney.length, stopped: false };
  const current = request.quote ? 2 : 1;
  return { current, stopped: STOPPED_REQUESTS.has(request.status) };
}

/** États d'une mission (`CleaningMission.status`, déduit de ses passages par la gateway). */
export const missionStatuses: Record<string, StatusLabel> = {
  to_schedule: {
    label: 'À planifier',
    tone: 'brand',
    actor: 'ksp',
    hint: 'Notre équipe planifie les passages et y affecte les agents.',
  },
  scheduled: { label: 'Planifiée', tone: 'brand', actor: 'ksp', hint: 'Le prochain passage est planifié.' },
  in_progress: { label: 'En cours', tone: 'action', actor: 'ksp', hint: 'Nos agents interviennent.' },
  on_hold: {
    label: 'En attente',
    tone: 'warning',
    actor: 'ksp',
    hint: 'Un passage est en attente après un incident.',
  },
  completed: { label: 'Terminée', tone: 'success', hint: 'Tous les passages prévus sont effectués.' },
  cancelled: { label: 'Annulée', tone: 'neutral', hint: 'Cette mission a été annulée.' },
};

/** Suspension (`CleaningMission.suspension`) : prime sur l'état déduit des passages. */
export function suspendedStatus(suspension: SuspensionCausesInput): StatusLabel {
  const causes = suspensionCauses(suspension);
  const organization = causes.includes('organization_suspended');
  const unpaid = causes.some((cause) => cause === 'unpaid_invoices' || cause === 'unpaid_interventions');
  const label =
    organization && unpaid
      ? 'Suspendue (compte entreprise et impayés)'
      : organization
        ? 'Suspendue (compte entreprise)'
        : unpaid
          ? 'Suspendue (impayés)'
          : 'Suspendue';
  // Impayés : au client de régler ; seul le compte entreprise suspendu : à KSP de le réactiver.
  return { label, tone: 'danger', actor: unpaid ? 'client' : 'ksp' };
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

/** Impayés d'une cause, sans jamais écrire « 0 … » : sans nombre connu, la phrase reste générale. */
function unpaidPhrase(cause: string, count: number): string {
  if (cause === 'unpaid_invoices') {
    return count > 0 ? `${plural(count, 'facture')} impayée${count > 1 ? 's' : ''}` : 'des factures impayées';
  }
  return count > 0 ? `${plural(count, 'passage')} impayé${count > 1 ? 's' : ''}` : 'des passages impayés';
}

/**
 * Texte de la suspension d'une mission, selon ses causes cumulées (ADR-030) : impayés (factures d'une
 * entreprise, passages d'un particulier), compte entreprise suspendu par KSP, ou les deux.
 */
export function suspensionText(
  suspension: SuspensionCausesInput & { unpaidCount: number },
  since: string,
): string {
  const causes = suspensionCauses(suspension);
  const organization = causes.includes('organization_suspended');
  const unpaid = causes.find((cause) => cause === 'unpaid_invoices' || cause === 'unpaid_interventions');
  const cancelled =
    'Les passages à venir sont annulés ; ils seront reprogrammés automatiquement à la reprise du service.';
  if (organization && unpaid) {
    const settle =
      unpaid === 'unpaid_invoices' ? 'le règlement des factures' : 'la régularisation des passages';
    return `Service suspendu depuis le ${since}, pour deux raisons : votre compte entreprise est suspendu par KSP, et il reste ${unpaidPhrase(unpaid, suspension.unpaidCount)}. Le service reprendra quand les deux seront levées : réactivation du compte et ${settle}. ${cancelled}`;
  }
  if (organization) {
    return `Service suspendu depuis le ${since}. Votre compte entreprise est suspendu par KSP : le service reprendra à sa réactivation. ${cancelled}`;
  }
  if (!unpaid) return `Service suspendu depuis le ${since}. ${cancelled} Contactez KSP pour en savoir plus.`;
  if (unpaid === 'unpaid_invoices') {
    return `Service suspendu depuis le ${since} : ${unpaidPhrase(unpaid, suspension.unpaidCount)}. Les passages à venir sont annulés ; ils seront reprogrammés automatiquement dès le règlement.`;
  }
  return `Service suspendu depuis le ${since} : ${unpaidPhrase(unpaid, suspension.unpaidCount)}. Les passages à venir sont annulés ; ils seront reprogrammés automatiquement dès la régularisation auprès de l’équipe KSP.`;
}

export const interventionStatuses: Record<string, StatusLabel> = {
  planned: { label: 'Prévu', tone: 'brand' },
  in_progress: { label: 'En cours', tone: 'action' },
  on_hold: { label: 'En attente (incident)', tone: 'warning' },
  completed: { label: 'Effectué', tone: 'success' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};

export const visitStatuses: Record<string, StatusLabel> = {
  scheduled: { label: 'Planifiée', tone: 'brand' },
  completed: { label: 'Effectuée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
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
/**
 * Moyens d'un règlement reçu. `mobile_money_online` : paiement en ligne confirmé par le prestataire
 * (service payment, ADR-031), payable depuis la fiche de la mission quel que soit le moyen prévu à
 * l'acceptation ; il n'est pas proposé comme moyen prévu (`OFFERED_PAYMENT_METHODS`).
 */
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

/** « 2 passages par semaine, pendant 3 mois ». */
export function recurrenceLabel(
  recurrence: { period: string; visitsPerPeriod: number; durationMonths: number } | null,
): string | null {
  if (!recurrence) return null;
  const per = recurrence.period === 'month' ? 'par mois' : 'par semaine';
  return `${recurrence.visitsPerPeriod} passage${recurrence.visitsPerPeriod > 1 ? 's' : ''} ${per}, pendant ${recurrence.durationMonths} mois`;
}
