import * as z from 'zod/mini';
import { moneySchema, planScaleSchema } from './schemas';

/*
 * Espace du débiteur sans compte (contrat `ksp-api.v1.yaml`, routes `/api/v1/recovery/debtor/*`,
 * ADR-061), champ par champ, lu dans le navigateur (`zod/mini`). Un champ obligatoire absent rend la
 * réponse invalide, un champ ajouté est ignoré ; états, natures et motifs sont des chaînes (une valeur
 * inconnue s'affiche avec un libellé neutre).
 *
 * Secrets : `sessionToken` (session de 30 minutes) et `uploadUrl` (adresse présignée) ne sont gardés qu'en
 * mémoire, le temps de leur usage ; jamais journalisés ni écrits dans le navigateur.
 */

/** `RecoveryDebtorAccess` : aperçu du lien, avant le code (R-DB-01 : nom du créancier seulement). */
export const debtorAccessSchema = z.object({
  creditorName: z.string(),
  /** Téléphone masqué où part le code ; pour un débiteur sans téléphone, e-mail masqué. */
  phoneMasked: z.string(),
  linkExpiresAt: z.string(),
});
export type DebtorAccess = z.infer<typeof debtorAccessSchema>;

/** `RecoveryDebtorCodeSent`. */
export const codeSentSchema = z.object({
  /** `whatsapp`, `sms` ou `email`. */
  channel: z.string(),
  codeExpiresAt: z.string(),
  retryAfterSeconds: z.int(),
});
export type DebtorCodeSent = z.infer<typeof codeSentSchema>;

/** `RecoveryDebtorSession` : rendue une seule fois. */
export const debtorSessionSchema = z.object({
  sessionToken: z.string().check(z.regex(/^[A-Za-z0-9_-]{43}$/)),
  sessionExpiresAt: z.string(),
});
export type DebtorSession = z.infer<typeof debtorSessionSchema>;

/** `RecoveryDebtorSessionEnded`. */
export const sessionEndedSchema = z.object({ endedAt: z.string() });

/** `RecoveryCaseAmounts`. */
const amountsSchema = z.object({
  principal: moneySchema,
  interests: moneySchema,
  costs: moneySchema,
  paid: moneySchema,
  waived: moneySchema,
  due: moneySchema,
  overpaid: moneySchema,
});
export type DebtorAmounts = z.infer<typeof amountsSchema>;

/** `RecoveryDebtorPayment` : paiement reçu, et son reçu. */
const debtorPaymentSchema = z.object({
  amount: moneySchema,
  paidAt: z.string(),
  /** `online`, `cash`, `transfer`, `partner`, `creditor`. */
  channel: z.string(),
  receiptDocumentId: z.nullable(z.string()),
});
export type DebtorPayment = z.infer<typeof debtorPaymentSchema>;

/** `RecoveryDebtorDocument` : pièce visible du débiteur, lue par `documents/{id}/download-url`. */
const debtorDocumentSchema = z.object({
  documentId: z.nullable(z.string()),
  fileId: z.nullable(z.string()),
  label: z.string(),
  kind: z.string(),
});
export type DebtorDocument = z.infer<typeof debtorDocumentSchema>;

/** `RecoveryInstallment`. */
const installmentSchema = z.object({
  id: z.nullable(z.string()),
  rank: z.int(),
  dueDate: z.string(),
  amount: moneySchema,
  paidAmount: moneySchema,
  /** `upcoming`, `due`, `paid`, `partial`, `missed`. */
  status: z.string(),
  paidAt: z.nullable(z.string()),
});
export type DebtorInstallment = z.infer<typeof installmentSchema>;

/** `RecoveryPlanTerms`. */
const planTermsSchema = z.object({
  firstAmount: moneySchema,
  firstDueDate: z.string(),
  /** `weekly`, `biweekly`, `monthly`. */
  rhythm: z.string(),
  installmentsCount: z.int(),
});

/** `RecoveryPaymentPlan`, réduit à ce que montre l'espace du débiteur. */
export const paymentPlanSchema = z.object({
  id: z.string(),
  /** `proposed`, `pending_creditor`, `signed`, `completed`, `defaulted`, `rejected`, `cancelled`. */
  status: z.string(),
  terms: planTermsSchema,
  total: moneySchema,
  installments: z.array(installmentSchema),
  withinScale: z.boolean(),
  violations: z.array(z.string()),
  documentId: z.nullable(z.string()),
  signedAt: z.nullable(z.string()),
  missedCount: z.int(),
});
export type DebtorPlan = z.infer<typeof paymentPlanSchema>;

/** `RecoverySettlement` : remise pour un paiement immédiat, autorisée par le créancier. */
const settlementSchema = z.object({
  id: z.string(),
  payNow: moneySchema,
  waived: moneySchema,
  discountBps: z.int(),
  validUntil: z.string(),
  /** `proposed`, `pending_creditor`, `accepted`, `rejected`, `executed`, `expired`. */
  status: z.string(),
});
export type DebtorSettlement = z.infer<typeof settlementSchema>;

/** `RecoveryDispute`, réduit à ce que montre l'espace du débiteur (les pièces du créancier ne le sont pas). */
export const disputeSchema = z.object({
  id: z.string(),
  /** `already_paid`, `wrong_amount`, `service_not_rendered`, `wrong_person`, `other`. */
  reason: z.string(),
  text: z.string(),
  /** `open`, `creditor_answered`, `upheld`, `rejected`, `amount_corrected`. */
  status: z.string(),
  openedAt: z.string(),
  creditorAnswerDueAt: z.string(),
  creditorAnswer: z.nullable(z.string()),
  resolutionNote: z.nullable(z.string()),
  resolvedAt: z.nullable(z.string()),
});
export type DebtorDispute = z.infer<typeof disputeSchema>;

/** `RecoveryDebtorCase` : situation du débiteur. */
export const debtorCaseSchema = z.object({
  caseNumber: z.string(),
  creditorName: z.string(),
  nature: z.string(),
  references: z.array(z.string()),
  amounts: amountsSchema,
  payments: z.array(debtorPaymentSchema),
  documents: z.array(debtorDocumentSchema),
  plan: z.nullable(paymentPlanSchema),
  settlementOffer: z.nullable(settlementSchema),
  planScale: planScaleSchema,
  /** `active`, `suspended` (contestation en cours), `closed`. */
  status: z.string(),
  disputes: z.array(disputeSchema),
  /** Page du lien de paiement en cours (`/payer/<jeton>`). */
  pendingPaymentUrl: z.nullable(z.string()),
  settlementCertificateDocumentId: z.nullable(z.string()),
});
export type DebtorCase = z.infer<typeof debtorCaseSchema>;

/** `RecoveryDebtorPaymentCreated`. */
export const paymentCreatedSchema = z.object({
  paymentUrl: z.string(),
  amount: moneySchema,
  expiresAt: z.string(),
});
export type DebtorPaymentCreated = z.infer<typeof paymentCreatedSchema>;

/** `RecoveryPlanSimulation`. */
export const planSimulationSchema = z.object({
  installments: z.array(installmentSchema),
  total: moneySchema,
  withinScale: z.boolean(),
  /** `duration`, `first_payment`, `installment_minimum`. */
  violations: z.array(z.string()),
});
export type DebtorPlanSimulation = z.infer<typeof planSimulationSchema>;

/** `RecoverySignatureResent`. */
export const signatureResentSchema = z.object({ signatureExpiresAt: z.string() });

/** `RecoveryDebtorUpload` : adresse PUT présignée (secret de courte durée) et en-têtes signés. */
export const debtorUploadSchema = z.object({
  fileId: z.string(),
  uploadUrl: z.string(),
  uploadExpiresAt: z.string(),
  uploadHeaders: z.record(z.string(), z.string()),
});

/** `RecoveryDebtorUploadCompleted`. */
export const uploadCompletedSchema = z.object({
  fileId: z.string(),
  /** `available` ou `rejected`. */
  status: z.string(),
});

/** `RecoveryDebtorCallback`. */
export const callbackSchema = z.object({ requestedAt: z.string() });

/** `RecoveryDownloadUrl`. */
export const downloadUrlSchema = z.object({ url: z.string(), expiresAt: z.string() });
