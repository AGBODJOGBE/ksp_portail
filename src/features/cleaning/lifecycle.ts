/*
 * Frise d'une prestation de nettoyage, de la demande au règlement (lot 2 de « Mon espace ») : simple
 * correspondance d'affichage entre les états renvoyés par la gateway et huit étapes ordonnées. Aucune
 * règle métier : la gateway reste seule juge des états.
 */

export const LIFECYCLE = [
  'Demandée',
  'Visite des lieux',
  'Devis',
  'Accepté',
  'Planifiée',
  'En cours',
  'Terminée',
  'Réglée',
] as const;

export const STEP = {
  requested: 0,
  visit: 1,
  quote: 2,
  accepted: 3,
  planned: 4,
  running: 5,
  done: 6,
  settled: 7,
} as const;

/** Étape en cours (`LIFECYCLE.length` : tout est fait) ; `stopped` : parcours arrêté sur cette étape. */
export interface Stage {
  current: number;
  stopped: boolean;
}

const STOPPED_REQUESTS = new Set(['declined', 'rejected', 'expired', 'cancelled']);

interface RequestLike {
  status: string;
  visit: { status: string } | null;
  quote: unknown;
}

interface MissionLike {
  status: string;
  payment: { status: string };
}

/** Étape d'une demande de devis (avant la mission). */
export function requestStage(request: RequestLike): Stage {
  if (request.status === 'accepted') return { current: STEP.planned, stopped: false };
  let current: number = STEP.visit;
  if (request.quote) current = STEP.quote;
  else if (request.visit?.status === 'completed') current = STEP.quote;
  return { current, stopped: STOPPED_REQUESTS.has(request.status) };
}

/** Étape d'une mission (le devis est accepté) : planification, passages, puis règlement. */
export function missionStage(mission: MissionLike): Stage {
  const paid = mission.payment.status === 'paid';
  switch (mission.status) {
    case 'cancelled':
      return { current: STEP.planned, stopped: true };
    case 'to_schedule':
      return { current: STEP.planned, stopped: false };
    case 'scheduled':
    case 'in_progress':
    case 'on_hold':
      return { current: STEP.running, stopped: false };
    case 'completed':
      return { current: paid ? LIFECYCLE.length : STEP.settled, stopped: false };
    default:
      return { current: STEP.planned, stopped: false };
  }
}

/**
 * Étape d'un groupe : celle de la demande ouverte la moins avancée (le groupe avance au rythme de sa
 * dernière prestation) ; arrêté seulement si toutes ses demandes le sont.
 */
export function groupStage(requests: ReadonlyArray<RequestLike>): Stage {
  const stages = requests.map(requestStage);
  const open = stages.filter((stage) => !stage.stopped);
  if (!open.length) return stages[0] ?? { current: STEP.visit, stopped: true };
  return { current: Math.min(...open.map((stage) => stage.current)), stopped: false };
}
