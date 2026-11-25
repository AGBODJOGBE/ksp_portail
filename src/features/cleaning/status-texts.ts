import type { BadgeTone } from '@/components/ui/badge';

/*
 * Libellés des états renvoyés par la gateway. Un état inconnu (ajouté au contrat après ce front) reçoit
 * un libellé neutre au lieu de casser l'écran.
 */

type Labelled = { label: string; tone: BadgeTone };

const unknown = (value: string): Labelled => ({ label: value.replaceAll('_', ' '), tone: 'neutral' });

/** Demande (`CleaningRequest.status`), du point de vue du client. */
export const REQUEST_STATUSES: Record<string, Labelled> = {
  awaiting_visit_fee: { label: 'Frais de visite à payer', tone: 'warning' },
  visit_to_schedule: { label: 'Visite à planifier', tone: 'brand' },
  visit_scheduled: { label: 'Visite programmée', tone: 'brand' },
  visit_missed: { label: 'Visite manquée', tone: 'danger' },
  visit_done: { label: 'Devis en préparation', tone: 'brand' },
  quote_sent: { label: 'Devis à accepter', tone: 'action' },
  accepted: { label: 'Devis accepté', tone: 'success' },
  declined: { label: 'Devis refusé', tone: 'neutral' },
  expired: { label: 'Devis expiré', tone: 'warning' },
  cancelled: { label: 'Demande annulée', tone: 'neutral' },
  rejected: { label: 'Demande refusée par KSP', tone: 'neutral' },
};

export const requestStatus = (status: string): Labelled => REQUEST_STATUSES[status] ?? unknown(status);

/** Filtre de la liste des demandes (`?statut=`), dans l'ordre du parcours. */
export const REQUEST_FILTERS = Object.keys(REQUEST_STATUSES);

/** Demande encore annulable par le client (avant l'acceptation, partie 12). */
export const CANCELLABLE_STATUSES: ReadonlySet<string> = new Set([
  'awaiting_visit_fee',
  'visit_to_schedule',
  'visit_scheduled',
  'visit_done',
  'quote_sent',
]);

const QUOTE_STATUSES: Record<string, Labelled> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  sent: { label: 'À accepter', tone: 'action' },
  accepted: { label: 'Accepté', tone: 'success' },
  declined: { label: 'Refusé', tone: 'neutral' },
  expired: { label: 'Expiré', tone: 'warning' },
  superseded: { label: 'Remplacé par une nouvelle version', tone: 'neutral' },
  withdrawn: { label: 'Retiré par KSP', tone: 'neutral' },
};
export const quoteStatus = (status: string): Labelled => QUOTE_STATUSES[status] ?? unknown(status);

const VISIT_STATUSES: Record<string, Labelled> = {
  scheduled: { label: 'Programmée', tone: 'brand' },
  in_progress: { label: 'En cours', tone: 'action' },
  completed: { label: 'Faite', tone: 'success' },
  missed: { label: 'Manquée (absence)', tone: 'danger' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};
export const visitStatus = (status: string): Labelled => VISIT_STATUSES[status] ?? unknown(status);

const VISIT_CANCEL_CAUSES: Record<string, string> = {
  request_cancelled: 'demande annulée',
  request_rejected: 'demande refusée par KSP',
  slot_changed: 'créneau changé à votre demande',
  ksp: 'annulée par KSP',
  agent_no_show: 'agent absent',
};
export const visitCancelCause = (cause: string | null): string | null =>
  cause ? (VISIT_CANCEL_CAUSES[cause] ?? cause.replaceAll('_', ' ')) : null;

const FEE_STATUSES: Record<string, Labelled> = {
  awaiting_payment: { label: 'À payer', tone: 'warning' },
  paid: { label: 'Payés', tone: 'success' },
  refunded: { label: 'Remboursés au portefeuille', tone: 'brand' },
  retained: { label: 'Conservés', tone: 'neutral' },
  deducted: { label: 'Déduits de vos séances', tone: 'success' },
};
export const feeStatus = (status: string): Labelled => FEE_STATUSES[status] ?? unknown(status);

const QUOTE_KINDS: Record<string, string> = {
  initial: 'Devis',
  amendment: 'Avenant',
  renewal: 'Renouvellement',
  reorder: 'Nouvelle commande',
};
export const quoteKind = (kind: string): string => QUOTE_KINDS[kind] ?? 'Devis';

/** Étapes de la frise d'une demande. */
export const REQUEST_STAGES = [
  'Demande envoyée',
  'Frais de visite',
  'Visite des lieux',
  'Devis',
  'Programme',
];

/** Étape en cours (indice dans `REQUEST_STAGES`) d'après le statut ; les étapes avant elle sont faites. */
export function requestStage(status: string): number {
  if (status === 'awaiting_visit_fee') return 1;
  if (['visit_to_schedule', 'visit_scheduled', 'visit_missed'].includes(status)) return 2;
  if (['visit_done', 'quote_sent', 'expired', 'declined'].includes(status)) return 3;
  if (status === 'accepted') return 4;
  return 0;
}

/** Demande close sans programme. */
export const CLOSED_STATUSES: ReadonlySet<string> = new Set(['declined', 'cancelled', 'rejected']);

/** État dans l'adresse de la liste (`?statut=devis-a-accepter`), en français. */
export const REQUEST_STATUS_PARAMS: Record<string, string> = {
  awaiting_visit_fee: 'frais-a-payer',
  visit_to_schedule: 'visite-a-planifier',
  visit_scheduled: 'visite-programmee',
  visit_missed: 'visite-manquee',
  visit_done: 'devis-en-preparation',
  quote_sent: 'devis-a-accepter',
  accepted: 'acceptee',
  declined: 'refusee',
  expired: 'expiree',
  cancelled: 'annulee',
  rejected: 'refusee-par-ksp',
};

export function statusFromParam(value: string | null): string | undefined {
  return Object.keys(REQUEST_STATUS_PARAMS).find((status) => REQUEST_STATUS_PARAMS[status] === value);
}

/** Libellé et teinte d'un état, avec son équivalent français dans l'adresse d'une liste (`?statut=`). */
type Filterable = Labelled & { param: string };

function filterOf(statuses: Record<string, Filterable>) {
  return {
    /** État de la gateway lu dans l'adresse ; un autre texte ne filtre rien. */
    fromParam: (value: string | null) =>
      Object.keys(statuses).find((status) => statuses[status]!.param === value),
    keys: Object.keys(statuses),
  };
}

/** Programme (`CleaningProgram.status`). */
export const PROGRAM_STATUSES: Record<string, Filterable> = {
  confirmed: { label: 'Confirmé', tone: 'brand', param: 'confirme' },
  in_progress: { label: 'En cours', tone: 'action', param: 'en-cours' },
  suspended: { label: 'Suspendu', tone: 'warning', param: 'suspendu' },
  completed: { label: 'Terminé', tone: 'success', param: 'termine' },
  cancelled: { label: 'Arrêté', tone: 'neutral', param: 'arrete' },
};
export const programStatus = (status: string): Labelled => PROGRAM_STATUSES[status] ?? unknown(status);
export const programFilter = filterOf(PROGRAM_STATUSES);

/** Programme encore vivant : séances à venir ou à régler. */
export const ACTIVE_PROGRAM_STATUSES: ReadonlySet<string> = new Set([
  'confirmed',
  'in_progress',
  'suspended',
]);

/**
 * Causes de suspension (R-SU-01) : ce qui s'est passé, et comment la lever. Le texte ne donne ni délai
 * ni montant : ils sont lus sur les séances et les factures.
 */
export const SUSPENSION_CAUSES: Record<string, { label: string; fix: string }> = {
  overdue_sessions: {
    label: 'Une séance réalisée n’est pas payée dans le délai.',
    fix: 'Payez la séance en retard : le programme reprend dès le paiement enregistré.',
  },
  unpaid_invoices: {
    label: 'Des factures de l’entreprise restent impayées.',
    fix: 'Réglez les factures en attente : le programme reprend une fois les impayés soldés.',
  },
  ksp_decision: {
    label: 'KSP a suspendu le programme.',
    fix: 'Contactez le support pour connaître la suite.',
  },
  organization_suspended: {
    label: 'Le compte de l’entreprise est suspendu.',
    fix: 'Un administrateur de l’entreprise doit contacter KSP pour réactiver le compte.',
  },
};
export const suspensionCause = (cause: string) =>
  SUSPENSION_CAUSES[cause] ?? { label: cause.replaceAll('_', ' '), fix: 'Contactez le support.' };

/** Séance (`CleaningSession.status`). Un report n'est pas un état. */
const SESSION_STATUSES: Record<string, Labelled> = {
  to_assign: { label: 'Prévue', tone: 'brand' },
  assigned: { label: 'Équipe désignée', tone: 'brand' },
  in_progress: { label: 'En cours', tone: 'action' },
  interrupted: { label: 'Interrompue', tone: 'warning' },
  completed: { label: 'Réalisée', tone: 'success' },
  missed: { label: 'Manquée (absence)', tone: 'danger' },
  suspended: { label: 'Suspendue', tone: 'warning' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};
export const sessionStatus = (status: string): Labelled => SESSION_STATUSES[status] ?? unknown(status);

/** Séance pas encore commencée : seule à pouvoir être reportée ou annulée par le client. */
export const UPCOMING_SESSION_STATUSES: ReadonlySet<string> = new Set(['to_assign', 'assigned']);

/** Teinte d'une séance dans le calendrier du programme. */
export function sessionCalendarTone(status: string): 'brand' | 'action' | 'pending' | 'muted' {
  if (status === 'completed') return 'brand';
  if (status === 'to_assign' || status === 'assigned') return 'action';
  if (status === 'missed' || status === 'cancelled') return 'muted';
  return 'pending';
}

/** Paiement d'une séance de particulier (`paymentStatus`). */
const PAYMENT_STATUSES: Record<string, Labelled> = {
  not_due: { label: 'Rien à payer pour l’instant', tone: 'neutral' },
  due: { label: 'À payer', tone: 'warning' },
  paid: { label: 'Payée', tone: 'success' },
  overdue: { label: 'Paiement en retard', tone: 'danger' },
  waived: { label: 'Offerte', tone: 'success' },
};
export const sessionPaymentStatus = (status: string): Labelled => PAYMENT_STATUSES[status] ?? unknown(status);

/** Séance à payer maintenant par le client. */
export const isPayable = (paymentStatus: string | null) =>
  paymentStatus === 'due' || paymentStatus === 'overdue';

const CANCELLATION_CAUSES: Record<string, string> = {
  customer: 'annulée à votre demande',
  customer_late: 'annulée tard, par le support',
  ksp: 'annulée par KSP',
  no_agent: 'annulée faute d’agent disponible',
  program_stopped: 'programme arrêté',
};
export const sessionCancellationCause = (cause: string) =>
  CANCELLATION_CAUSES[cause] ?? cause.replaceAll('_', ' ');

const INCIDENT_CATEGORIES: Record<string, string> = {
  equipment: 'Matériel',
  access: 'Accès au lieu',
  safety: 'Sécurité',
  out_of_scope_request: 'Demande hors devis',
  other: 'Autre',
};
export const incidentCategory = (category: string) =>
  INCIDENT_CATEGORIES[category] ?? category.replaceAll('_', ' ');

const INCIDENT_DECISIONS: Record<string, string> = {
  pending: 'En attente d’une décision de KSP',
  resumed: 'Séance reprise',
  rescheduled: 'Séance reportée',
  cancelled: 'Séance annulée',
};
export const incidentDecision = (decision: string) =>
  INCIDENT_DECISIONS[decision] ?? decision.replaceAll('_', ' ');

/** Réclamation (`CleaningClaim.status`). */
export const CLAIM_STATUSES: Record<string, Filterable> = {
  open: { label: 'Ouverte', tone: 'warning', param: 'ouverte' },
  in_progress: { label: 'En cours de traitement', tone: 'brand', param: 'en-cours' },
  resolved: { label: 'Résolue', tone: 'success', param: 'resolue' },
  rejected: { label: 'Rejetée', tone: 'neutral', param: 'rejetee' },
};
export const claimStatus = (status: string): Labelled => CLAIM_STATUSES[status] ?? unknown(status);
export const claimFilter = filterOf(CLAIM_STATUSES);

/** Réclamation encore ouverte aux messages du client. */
export const OPEN_CLAIM_STATUSES: ReadonlySet<string> = new Set(['open', 'in_progress']);

export const CLAIM_CATEGORIES: Record<string, string> = {
  incomplete_work: 'Travail incomplet',
  damage: 'Dégât',
  behavior: 'Comportement de l’équipe',
  missing_item: 'Objet manquant',
  other: 'Autre problème',
};
export const claimCategory = (category: string) =>
  CLAIM_CATEGORIES[category] ?? category.replaceAll('_', ' ');

const CLAIM_OUTCOMES: Record<string, string> = {
  free_redo: 'Une séance gratuite est ajoutée à votre programme',
  wallet_credit: 'Un crédit vous est accordé',
  rejected: 'Réclamation rejetée',
};
export const claimOutcome = (outcome: string) => CLAIM_OUTCOMES[outcome] ?? outcome.replaceAll('_', ' ');
