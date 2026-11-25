'use client';

import { api, parseResponse } from '@/lib/api';
import {
  type Money,
  type PlanScale,
  type RecoveryCase,
  type RecoveryCaseCreated,
  type RecoveryCaseDocument,
  type RecoveryCasePage,
  type RecoveryDashboard,
  type RecoveryFeeEstimate,
  type RecoveryJournalEntry,
  type RecoveryMandatePrepared,
  type RecoveryPreferences,
  caseCreatedSchema,
  caseDocumentSchema,
  casePageSchema,
  caseSchema,
  dashboardSchema,
  feeEstimateSchema,
  journalPageSchema,
  mandatePreparedSchema,
  preferencesSchema,
} from './schemas';

/*
 * Recouvrement, espace du créancier (ADR-060 à 062) : session requise, contexte actif (compte ou
 * organisation). Les écritures d'un membre lecteur sont refusées par la gateway (`AUTH_FORBIDDEN`).
 * `Idempotency-Key` sur la création d'un dossier et le paiement des frais (contrat).
 */

/** `RecoveryDebtorInput`. */
export interface DebtorBody {
  kind: 'person' | 'company';
  role: 'main' | 'co_debtor' | 'guarantor';
  firstNames?: string;
  lastName?: string;
  legalName?: string;
  ifu?: string;
  rccm?: string;
  representativeName?: string;
  phones: string[];
  emails: string[];
  address?: string;
}

/** `RecoveryCaseInput`. */
export interface CaseInputBody {
  kind: 'b2b' | 'b2c';
  nature: string;
  debtors: DebtorBody[];
  claims: Array<{ reference: string; amount: Money; dueDate: string; description?: string }>;
  interests?: Money;
  alreadyPaid?: Money;
  priorEffort: {
    remindersCount: number;
    lastReminderDate?: string;
    channels: string[];
    debtAcknowledged: boolean;
    acknowledgmentFileId?: string;
    promisesReceived?: string;
    preserveRelationship: boolean;
  };
  planScale?: PlanScale;
  evidenceFileIds: string[];
}

export interface CaseFilters {
  status?: string;
  stage?: string;
  kind?: string;
  search?: string;
  limit?: number;
}

const BASE = '/api/v1/recovery';
const CASES = '/api/v1/recovery/cases';
const casePath = (caseId: string) => `${CASES}/${encodeURIComponent(caseId)}`;

export async function estimateFees(
  body: { kind: string; amountDue: Money },
  signal?: AbortSignal,
): Promise<RecoveryFeeEstimate> {
  return parseResponse(feeEstimateSchema, await api.post(`${BASE}/estimates`, body, { signal }));
}

export async function createCase(body: CaseInputBody, idempotencyKey: string): Promise<RecoveryCaseCreated> {
  return parseResponse(caseCreatedSchema, await api.post(CASES, body, { idempotencyKey }));
}

/**
 * Dossiers du contexte actif, les plus récents d'abord. La page suivante (`cursor`) n'est pas demandée :
 * la gateway la refuse aujourd'hui ; la liste lit les 100 premiers (le plafond du contrat).
 */
export async function listCases(filters: CaseFilters = {}): Promise<RecoveryCasePage> {
  return parseResponse(
    casePageSchema,
    await api.get(CASES, {
      query: {
        status: filters.status,
        stage: filters.stage,
        kind: filters.kind,
        search: filters.search,
        limit: filters.limit ?? 100,
      },
    }),
  );
}

export async function getCase(caseId: string): Promise<RecoveryCase> {
  return parseResponse(caseSchema, await api.get(casePath(caseId)));
}

/** Brouillon modifié, ou réponse au complément demandé (`completionNote`) : le dossier repasse en examen. */
export async function updateCase(
  caseId: string,
  body: { input: CaseInputBody; completionNote?: string },
): Promise<RecoveryCase> {
  return parseResponse(caseSchema, await api.put(casePath(caseId), body));
}

/** Justificatif déjà déposé par file (`recovery_evidence`), rattaché au dossier. */
export async function addCaseDocument(
  caseId: string,
  body: { fileId: string; label?: string },
): Promise<RecoveryCaseDocument> {
  return parseResponse(
    caseDocumentSchema,
    await api.post(`${CASES}/${encodeURIComponent(caseId)}/documents`, body),
  );
}

/** Mandat produit et code de signature envoyé ; rejouée avec la même saisie, elle rend le même mandat. */
export async function prepareMandate(
  caseId: string,
  duplicatesAcknowledged: boolean,
): Promise<RecoveryMandatePrepared> {
  return parseResponse(
    mandatePreparedSchema,
    await api.post(`${CASES}/${encodeURIComponent(caseId)}/mandate`, { duplicatesAcknowledged }),
  );
}

/** Frais de dossier débités du portefeuille du contexte actif ; le dossier part en examen. */
export async function payCaseFee(caseId: string, idempotencyKey: string): Promise<RecoveryCase> {
  return parseResponse(
    caseSchema,
    await api.post(`${CASES}/${encodeURIComponent(caseId)}/fee/pay`, undefined, { idempotencyKey }),
  );
}

/** Journal du dossier : les 100 dernières entrées (la page suivante est refusée par la gateway). */
export async function listJournal(caseId: string): Promise<RecoveryJournalEntry[]> {
  const page = parseResponse(
    journalPageSchema,
    await api.get(`${CASES}/${encodeURIComponent(caseId)}/journal`, { query: { limit: 100 } }),
  );
  return page.entries;
}

export async function getDashboard(): Promise<RecoveryDashboard> {
  return parseResponse(dashboardSchema, await api.get(`${BASE}/dashboard`));
}

export async function getPreferences(): Promise<RecoveryPreferences> {
  return parseResponse(preferencesSchema, await api.get(`${BASE}/preferences`));
}

/** Barèmes des nouveaux dossiers ; `notifyUserIds` est renvoyé tel qu'il a été lu (non modifiable ici). */
export async function updatePreferences(body: RecoveryPreferences): Promise<RecoveryPreferences> {
  return parseResponse(preferencesSchema, await api.put(`${BASE}/preferences`, body));
}
