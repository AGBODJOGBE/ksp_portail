'use client';

import { ApiError, api, parseResponse } from '@/lib/api';
// Hors de l'index de `lib/api` : seul l'envoi d'une pièce télécharge ce module.
import { putToStorage } from '@/lib/api/upload';
import {
  type DebtorAccess,
  type DebtorCase,
  type DebtorCodeSent,
  type DebtorPaymentCreated,
  type DebtorPlan,
  type DebtorPlanSimulation,
  type DebtorSession,
  callbackSchema,
  codeSentSchema,
  debtorAccessSchema,
  debtorCaseSchema,
  debtorSessionSchema,
  debtorUploadSchema,
  disputeSchema,
  downloadUrlSchema,
  paymentCreatedSchema,
  paymentPlanSchema,
  planSimulationSchema,
  sessionEndedSchema,
  signatureResentSchema,
  uploadCompletedSchema,
} from './debtor-schemas';
import type { Money } from './schemas';

/*
 * Espace du débiteur sans compte (ADR-061) : routes publiques, jamais le jeton d'un compte KSP
 * (`auth: false`). Le jeton du lien est dans le chemin ; la session (30 minutes) part dans l'en-tête
 * `X-Debtor-Session` (`debtorSession` du client). Ni l'un ni l'autre n'est journalisé ni gardé ici :
 * l'écran garde la session en mémoire et la passe à chaque appel. `Idempotency-Key` sur le paiement,
 * la proposition d'échéancier et la contestation (contrat).
 */

const DEBTOR = '/api/v1/recovery/debtor';
const accessPath = (token: string) => `${DEBTOR}/access/${encodeURIComponent(token)}`;
const codePath = (token: string) => `${DEBTOR}/access/${encodeURIComponent(token)}/code`;
const verifyPath = (token: string) => `${DEBTOR}/access/${encodeURIComponent(token)}/verify`;
const SESSION_END = `${DEBTOR}/session/end`;
const CASE = `${DEBTOR}/case`;
const PAYMENTS = `${DEBTOR}/payments`;
const PLAN_SIMULATION = `${DEBTOR}/payment-plans/simulate`;
const PLANS = `${DEBTOR}/payment-plans`;
const planSignaturePath = (planId: string) =>
  `${DEBTOR}/payment-plans/${encodeURIComponent(planId)}/signature`;
const DISPUTES = `${DEBTOR}/disputes`;
const UPLOADS = `${DEBTOR}/uploads`;
const uploadCompletePath = (fileId: string) => `${DEBTOR}/uploads/${encodeURIComponent(fileId)}/complete`;
const CALLBACKS = `${DEBTOR}/callbacks`;
const documentUrlPath = (documentId: string) =>
  `${DEBTOR}/documents/${encodeURIComponent(documentId)}/download-url`;

/** Options communes : route publique, session du débiteur dans son en-tête. */
const withSession = (session: string, extra: { idempotencyKey?: string } = {}) => ({
  auth: false,
  debtorSession: session,
  ...extra,
});

/* ——— Accès par le lien (avant le code) ——— */

/** Aperçu du lien : nom du créancier, coordonnée masquée où part le code, fin de validité du lien. */
export async function openDebtorAccess(token: string): Promise<DebtorAccess> {
  return parseResponse(debtorAccessSchema, await api.get(accessPath(token), { auth: false }));
}

/** Code de 6 chiffres envoyé au débiteur (un par minute, 10 minutes de validité). */
export async function sendDebtorCode(token: string): Promise<DebtorCodeSent> {
  return parseResponse(codeSentSchema, await api.post(codePath(token), undefined, { auth: false }));
}

/** Code juste : session de 30 minutes, rendue une seule fois. */
export async function verifyDebtorCode(token: string, code: string): Promise<DebtorSession> {
  return parseResponse(debtorSessionSchema, await api.post(verifyPath(token), { code }, { auth: false }));
}

/* ——— Session ——— */

export async function endDebtorSession(session: string): Promise<void> {
  parseResponse(sessionEndedSchema, await api.post(SESSION_END, undefined, withSession(session)));
}

export async function getDebtorCase(session: string): Promise<DebtorCase> {
  return parseResponse(debtorCaseSchema, await api.get(CASE, withSession(session)));
}

/**
 * Lien de paiement du montant choisi (au plus le montant dû) ou de la remise proposée (`settlementId`) ;
 * un lien précédent non payé est révoqué par recovery.
 */
export async function createDebtorPayment(
  session: string,
  body: { amount: Money; settlementId?: string },
  idempotencyKey: string,
): Promise<DebtorPaymentCreated> {
  return parseResponse(
    paymentCreatedSchema,
    await api.post(PAYMENTS, body, withSession(session, { idempotencyKey })),
  );
}

/** `RecoveryPlanTerms` : premier versement, puis `installmentsCount` échéances au rythme choisi. */
export interface PlanTermsBody {
  firstAmount: Money;
  firstDueDate: string;
  rhythm: 'weekly' | 'biweekly' | 'monthly';
  installmentsCount: number;
}

/** Échéances calculées et contrôle du barème ; rien n'est enregistré. */
export async function simulateDebtorPlan(
  session: string,
  terms: PlanTermsBody,
  signal?: AbortSignal,
): Promise<DebtorPlanSimulation> {
  return parseResponse(
    planSimulationSchema,
    await api.post(PLAN_SIMULATION, { terms }, { ...withSession(session), signal }),
  );
}

/** Dans le barème : lien de signature envoyé au téléphone du débiteur ; sinon transmis au chargé. */
export async function proposeDebtorPlan(
  session: string,
  body: { terms: PlanTermsBody; message?: string },
  idempotencyKey: string,
): Promise<DebtorPlan> {
  return parseResponse(
    paymentPlanSchema,
    await api.post(PLANS, body, withSession(session, { idempotencyKey })),
  );
}

export async function resendPlanSignature(session: string, planId: string): Promise<string> {
  const resent = parseResponse(
    signatureResentSchema,
    await api.post(planSignaturePath(planId), undefined, withSession(session)),
  );
  return resent.signatureExpiresAt;
}

export type DisputeReason =
  'already_paid' | 'wrong_amount' | 'service_not_rendered' | 'wrong_person' | 'other';

/** Contestation : le dossier est suspendu, le créancier a un délai pour répondre. */
export async function disputeDebtorCase(
  session: string,
  body: { reason: DisputeReason; text: string; fileIds: string[] },
  idempotencyKey: string,
) {
  return parseResponse(
    disputeSchema,
    await api.post(DISPUTES, body, withSession(session, { idempotencyKey })),
  );
}

/**
 * Pièce d'une contestation en trois temps : déclaration (`debtor/uploads`), envoi direct au stockage
 * (`PUT` présigné, sans jeton ni cookie), confirmation (`uploads/{id}/complete`). Un contenu refusé
 * (`rejected` : type réel ou taille) est une erreur, affichée par fichier.
 */
export async function uploadDebtorFile(session: string, file: File): Promise<{ id: string }> {
  const slot = parseResponse(
    debtorUploadSchema,
    await api.post(
      UPLOADS,
      { fileName: file.name || 'piece', contentType: file.type, sizeBytes: file.size },
      withSession(session),
    ),
  );
  try {
    await putToStorage(slot.uploadUrl, slot.uploadHeaders, file);
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'FILE_STORAGE_REJECTED')
      throw fileRefused(caught.status);
    throw caught;
  }
  const completed = parseResponse(
    uploadCompletedSchema,
    await api.post(uploadCompletePath(slot.fileId), undefined, withSession(session)),
  );
  if (completed.status !== 'available') throw fileRefused(422);
  return { id: completed.fileId };
}

/** Pièce refusée par le stockage ou à la confirmation (type réel, taille) : message affiché par fichier. */
const fileRefused = (status: number) =>
  new ApiError(
    status,
    'RECOVERY_DEBTOR_FILE_REFUSED',
    'Fichier refusé : envoyez un PDF ou une photo (JPEG, PNG, WebP) de 10 Mo au plus.',
  );

/** Créneau de rappel souhaité, en ISO 8601 (heure du Bénin convertie). */
export async function requestDebtorCallback(
  session: string,
  body: { preferredFrom: string; preferredTo: string; message?: string },
): Promise<string> {
  return parseResponse(callbackSchema, await api.post(CALLBACKS, body, withSession(session))).requestedAt;
}

/** Adresse de lecture de courte durée d'un document (reçu, attestation, échéancier signé, pièce). */
export async function getDebtorDocumentUrl(session: string, documentId: string): Promise<string> {
  return parseResponse(downloadUrlSchema, await api.get(documentUrlPath(documentId), withSession(session)))
    .url;
}
