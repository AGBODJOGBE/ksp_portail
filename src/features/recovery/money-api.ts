'use client';

import { api, parseResponse } from '@/lib/api';
import { type Money, type RecoveryCase, caseSchema } from './schemas';
import {
  type RecoveryCaseWithCollection,
  type RecoveryRemittance,
  type RecoveryStatement,
  caseWithCollectionSchema,
  remittancePageSchema,
  statementPageSchema,
} from './money-schemas';

/*
 * Argent du créancier (ADR-060) : arrêt d'un dossier, paiement reçu directement, reversements et relevés.
 * Module à part : seuls la fiche d'un dossier et la page des relevés le lisent.
 */

const BASE = '/api/v1/recovery';
const casePath = (caseId: string) => `/api/v1/recovery/cases/${encodeURIComponent(caseId)}`;

/** Arrêt du dossier (motif de 3 à 500 caractères) : la commission reste due (encaissé, paiement direct sous 30 jours). */
export async function stopCase(caseId: string, reason: string): Promise<RecoveryCase> {
  return parseResponse(caseSchema, await api.post(`${casePath(caseId)}/stop`, { reason }));
}

export interface DirectPaymentBody {
  amount: Money;
  /** Jour de réception AAAA-MM-JJ, au plus aujourd'hui. */
  receivedOn: string;
  note?: string;
  /** Preuve déjà déposée par file (`recovery_evidence`). */
  proofFileId?: string;
}

/** Paiement reçu directement du débiteur : imputé au dossier, commission facturée chaque mois. */
export async function declareDirectPayment(
  caseId: string,
  body: DirectPaymentBody,
  idempotencyKey: string,
): Promise<RecoveryCaseWithCollection> {
  return parseResponse(
    caseWithCollectionSchema,
    await api.post(`${casePath(caseId)}/direct-payments`, body, { idempotencyKey }),
  );
}

export interface MoneyPage<T> {
  data: T[];
  nextCursor: string | null;
}

/** Reversements crédités au portefeuille, les plus récents d'abord. */
export async function listRemittances(
  cursor?: string,
  filters: { caseId?: string; from?: string; to?: string } = {},
): Promise<MoneyPage<RecoveryRemittance>> {
  const page = parseResponse(
    remittancePageSchema,
    await api.get(`${BASE}/remittances`, { query: { ...filters, limit: 20, cursor } }),
  );
  return { data: page.remittances, nextCursor: page.nextCursor };
}

/** Relevés mensuels par dossier (`period` AAAA-MM), avec leur PDF et leur facture de commission. */
export async function listStatements(
  cursor?: string,
  filters: { period?: string; caseId?: string } = {},
): Promise<MoneyPage<RecoveryStatement>> {
  const page = parseResponse(
    statementPageSchema,
    await api.get(`${BASE}/statements`, { query: { ...filters, limit: 20, cursor } }),
  );
  return { data: page.statements, nextCursor: page.nextCursor };
}
