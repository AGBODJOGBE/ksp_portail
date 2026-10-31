import type { BadgeTone } from '@/components/ui/badge';

/** Textes et adresses du paiement en ligne par Mobile Money (service payment, ADR-031). Sans zod. */

export const paymentPaths = {
  list: '/mon-espace/paiements',
  /** Page de retour du prestataire (`PAYMENT_RETURN_URL/<id>`). */
  payment: (id: string) => `/mon-espace/paiements/${encodeURIComponent(id)}`,
  /** Page de paiement simulée (développement : `PAYMENT_SIMULATION_CHECKOUT_URL?paymentId=…`). */
  simulation: '/mon-espace/paiements/simulation',
} as const;

/**
 * Objet payé → écran du portail. Adresses fixées par cleaning et billing, recopiées ici : leurs index
 * importent cette fonctionnalité (bouton de paiement), l'inverse ferait un cycle.
 */
export function subjectPath(subject: { type: string; id: string }): string | null {
  const id = encodeURIComponent(subject.id);
  if (subject.type === 'cleaning_mission') return `/mon-espace/nettoyage/missions/${id}`;
  if (subject.type === 'billing_invoice') return `/mon-espace/factures/${id}`;
  return null;
}

export const paymentTexts = {
  title: 'Mes paiements',
  lead: 'Paiements en ligne par Mobile Money : acomptes, soldes de prestation et factures.',
  scope:
    'Les paiements affichés sont ceux du compte actif : votre compte personnel, ou l’entreprise que vous représentez.',
  empty: 'Aucun paiement en ligne pour le moment.',
  emptyHint:
    'Payez une prestation ou une facture par Mobile Money depuis sa fiche : le paiement apparaîtra ici.',
  loading: 'Chargement…',
  retry: 'Réessayer',
  loadMore: 'Afficher plus',
  loadingMore: 'Chargement…',
  back: 'Retour à mes paiements',
  notFound: 'Ce paiement est introuvable. Il appartient peut-être à un autre compte.',
  genericError: 'Une erreur est survenue. Réessayez dans quelques instants.',

  // Bouton de paiement (fiche d'une mission ou d'une facture).
  pay: 'Payer par Mobile Money',
  payDeposit: 'Payer l’acompte par Mobile Money',
  payBalance: 'Payer le solde par Mobile Money',
  paying: 'Ouverture de la page de paiement…',
  amountToPay: 'Montant à payer',
  amountByKsp: 'Le montant restant dû est calculé par KSP et affiché sur la page de paiement.',
  payHint:
    'MTN ou Moov : vous saisissez votre numéro sur la page sécurisée du prestataire, puis validez sur votre téléphone.',
  noCheckout: 'La page de paiement n’est pas encore prête. Réessayez dans quelques instants.',
  resume: 'Reprendre le paiement',

  // Page de retour.
  paymentOf: {
    deposit: 'Acompte de la prestation',
    balance: 'Solde de la prestation',
    invoice: (reference: string | null) => (reference ? `Facture ${reference}` : 'Facture'),
  },
  seeMission: 'Voir la prestation',
  seeInvoice: 'Voir la facture',
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
  return subject.part === 'deposit' ? t.deposit : t.balance;
}
