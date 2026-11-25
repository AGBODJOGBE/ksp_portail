'use client';

import { api, parseResponse } from '@/lib/api';
import {
  type RecoveryDecision,
  type RecoveryDecisionAnswered,
  type RecoveryDecisionPage,
  decisionAnsweredSchema,
  decisionPageSchema,
} from './decision-schemas';

/*
 * Décisions du créancier (ADR-060) : contexte actif (compte ou organisation). Lecture pour tout membre ;
 * la réponse d'un membre lecteur est refusée par la gateway (`AUTH_FORBIDDEN`). `Idempotency-Key` sur la
 * réponse (contrat). Module à part : seuls les écrans des décisions et la rubrique « À faire » le lisent.
 */

const DECISIONS = '/api/v1/recovery/decisions';
const decisionPath = (decisionId: string) => `${DECISIONS}/${encodeURIComponent(decisionId)}`;

export interface DecisionFilters {
  /** `pending`, `approved`, `rejected`, `answered`, `expired`. */
  status?: string;
  caseId?: string;
  limit?: number;
  cursor?: string;
}

export async function listDecisions(filters: DecisionFilters = {}): Promise<RecoveryDecisionPage> {
  return parseResponse(
    decisionPageSchema,
    await api.get(DECISIONS, {
      query: {
        status: filters.status,
        caseId: filters.caseId,
        limit: filters.limit ?? 100,
        cursor: filters.cursor,
      },
    }),
  );
}

/**
 * Une décision par son identifiant (adresse des notifications). Le contrat n'a pas de lecture par
 * identifiant : elle est cherchée parmi les décisions en attente, puis parmi les 100 dernières.
 */
export async function findDecision(decisionId: string): Promise<RecoveryDecision | null> {
  const pending = await listDecisions({ status: 'pending' });
  const found = pending.decisions.find((decision) => decision.id === decisionId);
  if (found) return found;
  const recent = await listDecisions();
  return recent.decisions.find((decision) => decision.id === decisionId) ?? null;
}

export interface DecisionAnswer {
  /** `approve`, `reject` (échéancier, remise, devis, saut d'étape) ou `answer` (contestation). */
  answer: 'approve' | 'reject' | 'answer';
  comment?: string;
  /** Pièces déjà déposées par file (`recovery_evidence`). */
  fileIds?: string[];
}

/** Réponse à une décision. Accepter un devis débite la provision du portefeuille du compte actif. */
export async function answerDecision(
  decisionId: string,
  body: DecisionAnswer,
  idempotencyKey: string,
): Promise<RecoveryDecisionAnswered> {
  return parseResponse(
    decisionAnsweredSchema,
    await api.post(decisionPath(decisionId), body, { idempotencyKey }),
  );
}
