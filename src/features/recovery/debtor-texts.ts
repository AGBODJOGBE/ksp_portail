import type { BadgeTone } from '@/components/ui/badge';
import { frenchSpacing } from '@/lib/typography';
import { DEBTOR_META_TITLE } from './debtor-meta';

/*
 * Textes de l'espace du débiteur sans compte (`/recouvrement/<jeton>`, ADR-061). Sans zod. Ton : on
 * s'adresse à une personne qui reçoit un message au sujet d'une dette ; on informe, on rassure, on
 * propose des solutions, sans jamais menacer. Une valeur inconnue s'affiche avec un libellé neutre.
 */

type StatusView = { label: string; tone: BadgeTone };

const CHANNELS: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'e-mail' };
export const codeChannelLabel = (channel: string): string => CHANNELS[channel] ?? 'message';

const CASE_STATUSES: Record<string, StatusView> = {
  active: { label: 'En cours', tone: 'brand' },
  suspended: { label: 'Suspendu : contestation en cours', tone: 'warning' },
  closed: { label: 'Clos', tone: 'success' },
};
export const debtorCaseStatus = (status: string): StatusView =>
  CASE_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };

const PAYMENT_CHANNELS: Record<string, string> = {
  online: 'Paiement en ligne',
  cash: 'Espèces remises à KSP',
  transfer: 'Virement reçu par KSP',
  partner: 'Reçu par un partenaire de KSP',
  creditor: 'Payé directement au créancier',
};
export const paymentChannelLabel = (channel: string): string => PAYMENT_CHANNELS[channel] ?? 'Paiement';

/** Motifs d'une contestation (`RecoveryDebtorDisputeRequest.reason`), dans l'ordre du formulaire. */
export const DISPUTE_REASONS = [
  { value: 'already_paid', label: 'J’ai déjà payé', hint: 'Tout ou partie de la somme a déjà été réglée.' },
  { value: 'wrong_amount', label: 'Le montant est faux', hint: 'Vous devez une somme différente.' },
  {
    value: 'service_not_rendered',
    label: 'La prestation n’a pas été faite',
    hint: 'Le service n’a pas été rendu ou le bien n’a pas été livré.',
  },
  {
    value: 'wrong_person',
    label: 'Je ne suis pas la bonne personne',
    hint: 'Cette dette ne vous concerne pas.',
  },
  { value: 'other', label: 'Autre motif', hint: 'Expliquez-le ci-dessous.' },
] as const;
export const disputeReasonLabel = (reason: string): string =>
  DISPUTE_REASONS.find((item) => item.value === reason)?.label ?? 'Autre motif';

const DISPUTE_STATUSES: Record<string, StatusView> = {
  open: { label: 'En attente de la réponse du créancier', tone: 'warning' },
  creditor_answered: { label: 'Réponse du créancier reçue, en examen par KSP', tone: 'brand' },
  upheld: { label: 'Contestation reconnue fondée', tone: 'success' },
  rejected: { label: 'Contestation rejetée', tone: 'danger' },
  amount_corrected: { label: 'Montant corrigé', tone: 'success' },
};
export const disputeStatus = (status: string): StatusView =>
  DISPUTE_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };

const PLAN_STATUSES: Record<string, StatusView> = {
  proposed: { label: 'Proposé', tone: 'warning' },
  pending_creditor: { label: 'En attente du créancier', tone: 'warning' },
  signed: { label: 'Signé, en cours', tone: 'brand' },
  completed: { label: 'Soldé', tone: 'success' },
  defaulted: { label: 'Rompu', tone: 'danger' },
  rejected: { label: 'Refusé', tone: 'neutral' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};
export const planStatus = (status: string): StatusView =>
  PLAN_STATUSES[status] ?? { label: 'État inconnu', tone: 'neutral' };

export const RHYTHMS = [
  { value: 'weekly', label: 'Chaque semaine' },
  { value: 'biweekly', label: 'Toutes les deux semaines' },
  { value: 'monthly', label: 'Chaque mois' },
] as const;

const VIOLATIONS: Record<string, string> = {
  duration: 'La durée totale dépasse celle acceptée par le créancier.',
  first_payment: 'Le premier versement est trop faible ou trop tardif.',
  installment_minimum: 'Une échéance est inférieure au minimum accepté.',
};
export const violationLabel = (violation: string): string =>
  VIOLATIONS[violation] ?? 'Une condition du créancier n’est pas respectée.';

/** Délai d'attente : « 42 s », puis en minutes au-delà de deux minutes (« 5 min »). */
const delay = (seconds: number) => (seconds >= 120 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`);

/**
 * Typographie française sur tout l'objet : espace insécable avant « ? ! : ; », y compris dans le résultat
 * des fonctions de texte, pour qu'un signe ne se retrouve jamais seul en début de ligne sur téléphone.
 */
function typeset<T>(value: T): T {
  if (typeof value === 'string') return frenchSpacing(value) as T;
  if (typeof value === 'function')
    return ((...args: unknown[]) => typeset((value as (...a: unknown[]) => unknown)(...args))) as T;
  if (Array.isArray(value)) return value.map(typeset) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeset(item)])) as T;
  return value;
}

export const debtorTexts = typeset({
  eyebrow: 'Espace personnel sécurisé',
  title: DEBTOR_META_TITLE,
  loading: 'Chargement de votre espace…',
  retry: 'Réessayer',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',
  unavailable:
    'Le service est momentanément indisponible. Réessayez dans quelques instants : vos informations ne sont pas perdues.',
  rateLimited: (seconds: number) => `Trop de demandes en peu de temps. Réessayez dans ${delay(seconds)}.`,
  rateLimitedShort: 'Trop de demandes en peu de temps. Patientez un instant avant de réessayer.',

  // Lien invalide (404, sans distinction : inconnu, expiré, renouvelé, dossier clos).
  invalidTitle: 'Ce lien n’est plus valable',
  invalidText:
    'Le lien a peut-être expiré ou été remplacé par un plus récent. Utilisez le dernier message reçu de KSP, ou contactez-nous.',

  // D1 — Accueil.
  contactFor: 'KSP vous contacte pour le compte de',
  contactForUnknown: 'KSP vous contacte au sujet d’une somme due.',
  welcomeLead:
    'Pour protéger vos informations, nous vous envoyons d’abord un code à usage unique. Il ouvre votre espace personnel : vous y verrez la somme due et pourrez payer, proposer un échéancier, contester ou être rappelé.',
  codeTo: 'Code envoyé à',
  linkValidUntil: 'Lien valable jusqu’au',
  requestCode: 'Recevoir mon code',
  requesting: 'Envoi du code…',
  disagree: 'Vous ne reconnaissez pas cette dette ? Ouvrez votre espace : vous pourrez la contester.',

  // D2 — Code.
  codeTitle: 'Saisissez votre code',
  codeSent: (channel: string, to: string, time: string) =>
    `Code envoyé par ${channel} au ${to}. Il est valable jusqu’à ${time}.`,
  codeAlreadySent: (to: string) =>
    `Un code vient déjà de vous être envoyé au ${to} : saisissez-le, ou patientez pour en demander un autre.`,
  codeLabel: 'Code à 6 chiffres',
  codeHint: 'Le code reçu par message, sans espace.',
  codeIncomplete: 'Saisissez les 6 chiffres du code.',
  codeInvalid: (left: number | null) =>
    left === null
      ? 'Ce code est incorrect.'
      : left === 1
        ? 'Ce code est incorrect. Il vous reste 1 essai.'
        : `Ce code est incorrect. Il vous reste ${left} essais.`,
  codeExpired: 'Ce code n’est plus valable : demandez un nouveau code.',
  verify: 'Ouvrir mon espace',
  verifying: 'Vérification…',
  resend: 'Recevoir un nouveau code',
  resendIn: (seconds: number) => `Nouveau code dans ${delay(seconds)}`,
  lockedTitle: 'Accès bloqué pendant une heure',
  lockedText: (time: string) =>
    `Trop de codes faux ont été saisis. Par sécurité, l’accès est bloqué jusqu’à ${time}. Vous pourrez alors demander un nouveau code.`,
  sessionExpired: 'Votre session est terminée. Pour continuer, demandez un nouveau code.',

  // Session.
  sessionUntil: (time: string) => `Session ouverte jusqu’à ${time}`,
  end: 'Terminer',
  endLong: 'Terminer et fermer ma session',
  ending: 'Fermeture…',
  endedTitle: 'Session fermée',
  endedText:
    'Vous pouvez fermer cette page. Pour revenir à votre dossier, rouvrez le lien reçu par message : un nouveau code vous sera demandé.',
  reopen: 'Rouvrir mon espace',

  // D3 — Situation.
  situationTitle: 'Votre situation',
  casePending:
    'La consultation de votre situation en ligne arrive bientôt. En attendant, contactez KSP pour connaître le montant dû et les solutions de paiement.',
  forCreditor: (creditor: string) => `Pour le compte de ${creditor}`,
  caseNumber: (number: string) => `Dossier ${number}`,
  amountDue: 'Montant dû',
  pay: 'Payer',
  payHint: 'Par Mobile Money, en totalité ou en partie, sur une page sécurisée.',
  resumePayment: 'Reprendre le paiement en cours',
  suspendedText:
    'Votre contestation est en cours d’examen. Le paiement et l’échéancier reprendront après la décision ; vous pouvez demander à être rappelé en attendant.',
  settledTitle: 'Votre dette est réglée',
  settledText: 'Merci. Aucune somme ne reste due sur ce dossier.',
  certificate: 'Attestation de solde',
  offerTitle: 'Offre de remise',
  offerText: (payNow: string, due: string, date: string) =>
    `Payez ${payNow} au lieu de ${due} si vous réglez avant le ${date}.`,
  offerWaived: (waived: string) => `Remise de ${waived}, accordée par le créancier.`,
  payWithOffer: 'Payer avec la remise',
  detailTitle: 'Détail du montant',
  principal: 'Somme principale',
  interests: 'Intérêts et pénalités',
  costs: 'Frais',
  paid: 'Déjà payé',
  waived: 'Remise accordée',
  due: 'Reste à payer',
  overpaid: (amount: string) => `Vous avez trop payé ${amount} : cette somme vous sera remboursée.`,
  debtTitle: 'La dette',
  creditor: 'Créancier',
  nature: 'Nature',
  references: 'Références',
  planTitle: 'Votre échéancier',
  planTotal: 'Total',
  planMissed: (count: number) => (count === 1 ? '1 échéance manquée.' : `${count} échéances manquées.`),
  planSignature:
    'Un lien de signature vous a été envoyé par message. Signer l’échéancier vaut reconnaissance de dette.',
  planReview:
    'Votre proposition est en cours d’étude par le chargé de votre dossier, puis par le créancier. Vous serez prévenu par message.',
  planCreditor: 'Votre proposition attend la réponse du créancier. Vous serez prévenu par message.',
  resendSignature: 'Renvoyer le lien de signature',
  resendingSignature: 'Envoi du lien…',
  resendSignatureIn: (seconds: number) => `Nouveau lien dans ${delay(seconds)}`,
  signatureResent: (date: string) => `Nouveau lien envoyé. Il est valable jusqu’au ${date}.`,
  installment: (rank: number) => `Échéance ${rank}`,
  disputesTitle: 'Vos contestations',
  disputeOpened: (date: string) => `Envoyée le ${date}`,
  disputeAnswerBy: (date: string) => `Réponse du créancier attendue avant le ${date}.`,
  creditorAnswer: 'Réponse du créancier',
  resolution: 'Décision de KSP',
  paymentsTitle: 'Paiements reçus',
  noPayments: 'Aucun paiement reçu pour le moment.',
  receipt: 'Reçu',
  receiptOf: (date: string) => `Reçu du paiement du ${date}`,
  documentsTitle: 'Vos documents',
  noDocuments: 'Aucun document pour le moment.',
  open: 'Ouvrir',
  openDocument: (label: string) => `Ouvrir ${label}`,
  opening: 'Ouverture…',
  popupBlocked: 'Le nouvel onglet a été bloqué par votre navigateur.',
  openHere: 'Ouvrir le document',
  otherTitle: 'Autres possibilités',
  planAction: 'Proposer un échéancier',
  planActionHint: 'Payez en plusieurs fois, selon les conditions acceptées par le créancier.',
  planRefused:
    'Le créancier n’accepte pas de paiement en plusieurs fois pour ce dossier. Demandez à être rappelé pour en parler.',
  disputeAction: 'Contester cette dette',
  disputeActionHint: 'Vous pensez ne rien devoir, ou pas ce montant.',
  callbackAction: 'Être rappelé',
  callbackActionHint: 'Un chargé de dossier vous appelle au moment de votre choix.',
  backToSituation: 'Ma situation',
  refresh: 'Actualiser ma situation',

  // D4 — Payer.
  payTitle: 'Payer',
  payLead:
    'Le paiement se fait par Mobile Money, sur une page sécurisée qui s’ouvre dans un nouvel onglet. Vous pouvez payer en une ou plusieurs fois.',
  amountLegend: 'Montant à payer',
  payAll: 'La totalité',
  payOffer: 'Avec la remise',
  payOfferHint: (payNow: string, date: string) => `${payNow}, jusqu’au ${date}`,
  payOther: 'Un autre montant',
  otherAmount: 'Montant en F CFA',
  otherAmountHint: (due: string) => `Entre 1 F CFA et ${due}.`,
  amountMissing: 'Saisissez le montant à payer, en chiffres.',
  amountTooHigh: (due: string) => `Le montant ne peut pas dépasser ${due}.`,
  replacesPending: 'Un nouveau paiement remplace celui qui est en cours.',
  payAmount: (amount: string) => `Payer ${amount}`,
  pendingPayment: 'Un paiement est déjà en cours.',
  newTabNotice: 'La page de paiement s’ouvre dans un nouvel onglet.',
  payPending:
    'Le paiement en ligne depuis cet espace arrive bientôt. En attendant, contactez KSP ou demandez à être rappelé.',
  creating: 'Préparation du paiement…',
  payOpenedTitle: 'Page de paiement ouverte',
  payOpenedText: (amount: string, date: string) =>
    `Terminez le paiement de ${amount} dans le nouvel onglet (lien valable jusqu’au ${date}). Votre situation sera mise à jour dès la confirmation.`,
  payBlocked: 'Votre navigateur a bloqué le nouvel onglet :',
  openPayment: 'ouvrir la page de paiement',
  payAgain: 'Rouvrir la page de paiement',

  // D5 — Échéancier.
  planFormTitle: 'Proposer un échéancier',
  planLead:
    'Choisissez un premier versement, puis le rythme des échéances suivantes. Le calcul est fait par KSP sur le montant dû.',
  scaleTitle: 'Conditions acceptées par le créancier',
  scaleDuration: (months: number) => `Durée : ${months} mois au plus.`,
  scaleFirst: (rate: string, days: number) =>
    `Premier versement : au moins ${rate} du montant dû, dans les ${days} jours.`,
  scaleMinimum: (amount: string) => `Échéance minimale : ${amount}.`,
  firstAmount: 'Premier versement (F CFA)',
  firstDueDate: 'Date du premier versement',
  rhythm: 'Rythme des échéances suivantes',
  installmentsCount: 'Nombre d’échéances après le premier versement',
  installmentsHint: 'Entre 1 et 52.',
  planIncomplete: 'Complétez les champs pour voir le calcul.',
  simulating: 'Calcul en cours…',
  simulationTitle: 'Votre échéancier',
  withinScale:
    'Dans les conditions du créancier : accord immédiat, puis signature par un lien envoyé par message.',
  outOfScale:
    'Hors des conditions du créancier : votre proposition sera étudiée par le chargé de votre dossier, puis par le créancier.',
  planMessage: 'Message au chargé de votre dossier (facultatif)',
  planMessageHint: 'Expliquez votre situation si vous le souhaitez.',
  propose: 'Proposer cet échéancier',
  proposing: 'Envoi de la proposition…',
  proposedSignTitle: 'Échéancier accepté : signature à faire',
  proposedSignText:
    'Un lien de signature vient de vous être envoyé par message. Signer l’échéancier vaut reconnaissance de dette ; il prend effet dès la signature.',
  proposedReviewTitle: 'Proposition transmise',
  proposedReviewText:
    'Le chargé de votre dossier étudie votre proposition, puis la soumet au créancier. Vous serez prévenu par message.',
  planPending:
    'La proposition d’échéancier depuis cet espace arrive bientôt. En attendant, demandez à être rappelé pour en parler.',
  messageTooLong: (max: number) => `Écrivez ${max} caractères au plus.`,
  firstAmountMissing: 'Saisissez le montant du premier versement.',
  firstDateMissing: 'Choisissez la date du premier versement.',
  countInvalid: 'Choisissez un nombre d’échéances entre 1 et 52.',

  // D6 — Contester.
  disputeTitle: 'Contester cette dette',
  disputeLead:
    'Le recouvrement est suspendu pendant l’examen de votre contestation. Le créancier dispose d’un délai pour répondre, puis KSP vous informe de la suite.',
  reasonLegend: 'Motif',
  reasonMissing: 'Choisissez un motif.',
  disputeText: 'Expliquez votre situation',
  disputeTextHint: 'Dates, montants, échanges avec le créancier : tout ce qui aide à comprendre.',
  disputeTextShort: 'Écrivez au moins 10 caractères.',
  disputeTextLong: 'Écrivez 2 000 caractères au plus.',
  counter: (length: number, max: number) => `${length} / ${max}`,
  filesLegend: 'Pièces justificatives (facultatif)',
  filesHint: 'Reçu, relevé, échange de messages… PDF ou photo, 10 Mo au plus par pièce, 10 pièces au plus.',
  files: {
    add: 'Ajouter des pièces',
    uploading: (name: string) => `Envoi de ${name}…`,
    remove: (name: string) => `Retirer ${name}`,
    refused: (name: string, reason: string) => `${name} : ${reason}`,
    wrongType: 'seuls les PDF et les photos (JPEG, PNG, WebP) sont acceptés.',
    tooLarge: 'le fichier dépasse 10 Mo.',
  },
  disputePending:
    'La contestation en ligne arrive bientôt. En attendant, contactez KSP ou demandez à être rappelé pour la faire enregistrer.',
  sendDispute: 'Envoyer ma contestation',
  sendingDispute: 'Envoi…',
  disputedTitle: 'Contestation enregistrée',
  disputedText: (date: string) =>
    `Le recouvrement est suspendu. Le créancier doit répondre avant le ${date} ; vous serez informé de la décision.`,

  // D7 — Rappel.
  callbackTitle: 'Être rappelé',
  callbackLead:
    'Un chargé de dossier de KSP vous appelle au numéro du dossier, au moment choisi : du lundi au samedi, de 8 h à 19 h (heure du Bénin).',
  dayLabel: 'Jour',
  dayPlaceholder: 'Choisissez un jour',
  dayMissing: 'Choisissez un jour.',
  slotLegend: 'Créneau',
  slotMissing: 'Choisissez un créneau.',
  slotLabel: (from: string, to: string) => `${from} – ${to}`,
  noSlotToday: 'Plus aucun créneau aujourd’hui : choisissez un autre jour.',
  callbackMessage: 'Message (facultatif)',
  callbackMessageHint: 'Par exemple, le meilleur moment ou ce dont vous voulez parler.',
  callbackPending: 'La demande de rappel en ligne arrive bientôt. En attendant, contactez KSP.',
  requestCallback: 'Demander à être rappelé',
  requestingCallback: 'Envoi…',
  callbackDoneTitle: 'Rappel demandé',
  callbackDoneText: (day: string, from: string, to: string) =>
    `Un chargé de dossier vous appellera ${day}, entre ${from} et ${to}.`,

  // Sécurité, sous la feuille.
  trustTitle: 'Votre sécurité',
  trust: [
    'KSP ne vous demande jamais votre code secret Mobile Money, ni par téléphone, ni par message.',
    'Le code reçu ne sert qu’à ouvrir cette page : ne le donnez à personne, pas même à un agent de KSP.',
    'Ce lien est personnel : ne le transférez pas.',
    'Vous pouvez à tout moment contester la dette ou demander à être rappelé.',
  ],
  contactSupport: 'Une question ? Contacter KSP',
} as const);
