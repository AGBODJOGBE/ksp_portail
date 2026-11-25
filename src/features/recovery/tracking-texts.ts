/*
 * Textes de la section Recouvrement de « Suivre ma demande » (`/mon-espace/suivi`) : dossiers en cours,
 * prochaine étape et qui doit agir. Sans zod.
 */

/** Prochaine étape d'un dossier qui n'est pas encore accepté, ou suspendu. */
const NEXT: Record<string, string> = {
  draft: 'Signer le mandat, puis payer les frais de dossier',
  awaiting_fee: 'Payer les frais de dossier',
  under_review: 'KSP examine le dossier, sous 2 jours ouvrés',
  info_requested: 'Envoyer le complément demandé par KSP',
  suspended: 'Contestation du débiteur : le juriste de KSP l’examine',
};

/** États où le créancier doit agir. */
const YOUR_TURN = new Set(['draft', 'awaiting_fee', 'info_requested']);
/** Échéances qui attendent le créancier (décision, réponse à une contestation). */
const YOUR_DEADLINES = new Set(['creditor_decision', 'dispute_answer']);

export const trackingNext = (status: string): string | null => NEXT[status] ?? null;
export const isYourTurn = (status: string, deadline: string | null): boolean =>
  YOUR_TURN.has(status) || (!!deadline && YOUR_DEADLINES.has(deadline));

export const trackingTexts = {
  title: 'Recouvrement',
  all: 'Mon recouvrement',
  loading: 'Chargement de vos dossiers…',
  retry: 'Réessayer',
  none: 'Aucun dossier de recouvrement en cours.',
  next: 'Prochaine étape',
  yourTurn: 'À vous d’agir',
  kspTurn: 'KSP s’en occupe',
  stage: (stage: string) => `Étape en cours : ${stage}`,
  decisionWaiting: 'Une décision attend votre réponse, dans « Décisions »',
  disputeAnswer: 'Répondre à la contestation du débiteur, dans « Décisions »',
  deadline: (label: string, date: string) => `${label} : ${date}`,
  more: (count: number) => `${count} autre${count > 1 ? 's' : ''} dossier${count > 1 ? 's' : ''} en cours`,
} as const;
