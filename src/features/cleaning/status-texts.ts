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
