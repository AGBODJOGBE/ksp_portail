import type { BadgeTone } from '@/components/ui/badge';

/** Textes et adresses du paiement en ligne par Mobile Money (service payment, ADR-031). Sans zod. */

export const paymentPaths = {
  list: '/mon-espace/paiements',
  /** Page de retour du prestataire (`PAYMENT_RETURN_URL/<id>`). */
  payment: (id: string) => `/mon-espace/paiements/${encodeURIComponent(id)}`,
  /** Page de paiement simulée (développement : `PAYMENT_SIMULATION_CHECKOUT_URL?paymentId=…`). */
  simulation: '/mon-espace/paiements/simulation',
} as const;

/** Recharge du portefeuille prépayé (ADR-046) : objet `wallet_top_up`, identifiant = titulaire. */
export const TOP_UP = 'wallet_top_up';

/**
 * Objet payé → écran du portail. Adresses fixées par cleaning, billing et wallet, recopiées ici : billing
 * importe cette fonctionnalité (historique) et wallet aussi (redirection), l'inverse ferait un cycle.
 */
export function subjectPath(subject: { type: string; id: string }): string | null {
  const id = encodeURIComponent(subject.id);
  if (subject.type === 'cleaning_mission') return `/mon-espace/nettoyage/missions/${id}`;
  if (subject.type === 'billing_invoice') return `/mon-espace/factures/${id}`;
  if (subject.type === TOP_UP) return '/mon-espace/portefeuille';
  return null;
}

export const paymentTexts = {
  title: 'Factures et paiements',
  receiptTitle: 'Reçu de paiement',
  receiptIssuer: 'Groupe KSP',
  receiptObject: 'Objet',
  receiptMethod: 'Moyen de paiement',
  receiptMobileMoney: 'Mobile Money en ligne',
  receiptPayer: 'Payé par',
  receiptNumber: 'Numéro du paiement',
  receiptPrint: 'Imprimer le reçu',
  receiptNote:
    'Confirmé par le prestataire de paiement et enregistré par KSP. Conservez ce reçu : la référence permet au support de le retrouver.',
  lead: 'Reste dû, échéances, recharges du portefeuille et reçus, au même endroit.',
  scope:
    'Les paiements affichés sont ceux du compte actif : votre compte personnel, ou l’entreprise que vous représentez.',
  empty: 'Aucun paiement en ligne pour le moment.',
  emptyHint:
    'Rechargez votre portefeuille par Mobile Money, puis payez vos prestations et factures avec : vos recharges apparaîtront ici.',
  loading: 'Chargement…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  back: 'Retour à mes paiements',
  notFound: 'Ce paiement est introuvable. Il appartient peut-être à un autre compte.',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',

  resume: 'Reprendre le paiement',
  // Paiement à vérifier par l'équipe KSP (ADR-032).
  underReview: 'Un paiement est en cours de vérification ; contactez le support KSP.',
  underReviewHint:
    'Aucun nouveau paiement n’est possible tant que l’équipe KSP ne l’a pas vérifié : vous ne payez jamais deux fois.',
  contactSupport: 'Contacter le support KSP',

  // Page de retour.
  paymentOf: {
    deposit: 'Acompte de la prestation',
    balance: 'Solde de la prestation',
    invoice: (reference: string | null) => (reference ? `Facture ${reference}` : 'Facture'),
    topUp: 'Recharge du portefeuille',
  },
  seeMission: 'Voir la prestation',
  seeInvoice: 'Voir la facture',
  seeWallet: 'Voir mon portefeuille',
  seeAll: 'Voir mes paiements',
  checking: 'Vérification auprès du prestataire…',
  stillPending:
    'Le prestataire n’a pas encore confirmé ce paiement. Si vous l’avez validé sur votre téléphone, il sera confirmé automatiquement : revenez sur cette page dans quelques minutes.',
  checkAgain: 'Vérifier à nouveau',
  reference: 'Référence',
  amount: 'Montant',
  createdAt: 'Créé le',
  completedAt: 'Confirmé le',
  closedAt: 'Terminé le',
  lateSuccess:
    'Si votre compte Mobile Money a quand même été débité, le paiement sera confirmé automatiquement dans les 24 heures.',
  tryAgain: 'Vous pouvez relancer un paiement depuis la fiche.',
  tryTopUpAgain: 'Vous pouvez relancer une recharge depuis votre portefeuille.',

  // Page de paiement simulée (développement).
  simulationTitle: 'Page de paiement simulée',
  simulationLead:
    'Développement seulement : cette page remplace celle du prestataire (FedaPay). Aucun argent ne circule.',
  simulateSuccess: 'Simuler un paiement réussi',
  simulateFailure: 'Simuler un échec',
  simulating: 'Envoi…',
  missingPaymentId: 'Adresse incomplète : identifiant du paiement absent.',
  notPending: 'Ce paiement n’est plus en attente : son issue est déjà connue.',
  seeResult: 'Voir le résultat',
} as const;

type StatusView = { label: string; tone: BadgeTone; message: string };

/** Libellé, ton et message de chaque statut (`PaymentStatus`). */
export const paymentStatuses: Record<string, StatusView> = {
  pending: {
    label: 'En attente',
    tone: 'warning',
    message:
      'Paiement en attente de confirmation. Validez la demande sur votre téléphone : cette page se met à jour toute seule.',
  },
  succeeded: {
    label: 'Réussi',
    tone: 'success',
    message: 'Paiement confirmé, merci. Il est enregistré par KSP et un reçu vous est envoyé.',
  },
  failed: {
    label: 'Échoué',
    tone: 'danger',
    message: 'Le paiement a été refusé : il n’a pas abouti.',
  },
  expired: {
    label: 'Expiré',
    tone: 'neutral',
    message: 'La page de paiement a expiré avant la validation : le paiement n’a pas abouti.',
  },
  cancelled: {
    label: 'Annulé',
    tone: 'neutral',
    message:
      'Le paiement a été abandonné sur la page de paiement, ou remplacé par un paiement plus récent : il n’a pas abouti.',
  },
  amount_mismatch: {
    label: 'En vérification',
    tone: 'warning',
    message: 'Paiement reçu, en cours de vérification par l’équipe KSP.',
  },
};

/** Écart de montant traité par la finance : le statut reste `amount_mismatch` (historique, ADR-032). */
const mismatchResolved: StatusView = {
  label: 'Vérifié par KSP',
  tone: 'neutral',
  message:
    'Le montant reçu ne correspondait pas au montant attendu : l’équipe KSP a traité ce paiement. Contactez le support pour toute question.',
};

/** Paiement en vérification (`underReview`) : quel que soit son statut, le client contacte le support. */
const underReviewStatus: StatusView = {
  label: 'En vérification',
  tone: 'warning',
  message: 'Paiement reçu, en cours de vérification par l’équipe KSP.',
};

/**
 * Statut affiché d'un paiement : `underReview` (écart non traité, ADR-032) prime ; un écart déjà traité
 * (`underReview` à false) n'est plus présenté comme « en vérification ». Sans le champ (gateway
 * antérieure), le statut seul décide.
 */
export function paymentView(payment: { status: string; underReview?: boolean }): StatusView {
  if (payment.underReview) return underReviewStatus;
  if (payment.status === 'amount_mismatch' && payment.underReview === false) return mismatchResolved;
  return paymentStatus(payment.status);
}

export function paymentStatus(status: string): StatusView {
  return (
    paymentStatuses[status] ?? {
      label: status,
      tone: 'neutral',
      message: 'Statut inconnu : contactez l’équipe KSP en citant la référence du paiement.',
    }
  );
}

/** Statuts définitifs : la page de retour cesse d'interroger la gateway. */
export const FINAL_STATUSES: ReadonlySet<string> = new Set([
  'succeeded',
  'failed',
  'expired',
  'cancelled',
  'amount_mismatch',
]);

/** Issue non aboutie : une réussite tardive reste possible (24 heures, ADR-031). */
export const UNSUCCESSFUL: ReadonlySet<string> = new Set(['failed', 'expired', 'cancelled']);

/** Libellé de l'objet payé. */
export function subjectLabel(subject: {
  type: string;
  part: string | null;
  reference: string | null;
}): string {
  const t = paymentTexts.paymentOf;
  if (subject.type === 'billing_invoice') return t.invoice(subject.reference);
  if (subject.type === TOP_UP) return t.topUp;
  return subject.part === 'deposit' ? t.deposit : t.balance;
}
