import * as z from 'zod/mini';
import { caseSchema, installmentSchema, moneySchema } from './schemas';

/*
 * Décisions du créancier (`GET /recovery/decisions`, `POST /recovery/decisions/{id}`, contrat
 * `RecoveryDecision`) : échéancier hors barème, remise, devis d'huissier ou judiciaire, contestation, saut
 * d'étape. Chaînes plutôt qu'énumérations fermées : un type ou un état inconnus s'affichent avec un libellé
 * neutre. Lus dans le navigateur : `zod/mini`.
 */

/** `RecoveryPlanTerms` : premier versement, rythme et nombre d'échéances après lui. */
const planTermsSchema = z.object({
  firstAmount: moneySchema,
  firstDueDate: z.string(),
  /** `weekly`, `biweekly`, `monthly`. */
  rhythm: z.string(),
  installmentsCount: z.int(),
});

/** `RecoveryPaymentPlan` proposé hors du barème du créancier. */
const decisionPlanSchema = z.object({
  id: z.string(),
  status: z.string(),
  terms: planTermsSchema,
  total: moneySchema,
  installments: z.array(installmentSchema),
  withinScale: z.boolean(),
  /** `duration`, `first_payment`, `installment_minimum` : ce qui sort du barème. */
  violations: z.array(z.string()),
  /** `debtor` ou `agent`. */
  proposedBy: z.string(),
  renegotiation: z.boolean(),
});

/** `RecoverySettlement` : payer `payNow` tout de suite contre l'abandon de `waived`. */
const settlementSchema = z.object({
  id: z.string(),
  payNow: moneySchema,
  waived: moneySchema,
  /** Points de base (1 000 = 10 %). */
  discountBps: z.int(),
  validUntil: z.string(),
  status: z.string(),
});

/** `RecoveryFeeQuote` : devis du partenaire (huissier ou avocat) et provision à verser. */
const feeQuoteSchema = z.object({
  id: z.string(),
  /** `bailiff` ou `litigation`. */
  stage: z.string(),
  partner: z.object({
    id: z.string(),
    /** `bailiff` ou `lawyer`. */
    kind: z.string(),
    name: z.string(),
    office: z.nullable(z.string()),
  }),
  lines: z.array(z.object({ label: z.string(), amount: moneySchema })),
  total: moneySchema,
  provision: moneySchema,
  documentId: z.nullable(z.string()),
  validUntil: z.string(),
});

/** `RecoveryDispute` : contestation du débiteur, et la réponse du créancier. */
const disputeSchema = z.object({
  id: z.string(),
  /** `already_paid`, `wrong_amount`, `service_not_rendered`, `wrong_person`, `other`. */
  reason: z.string(),
  text: z.string(),
  fileIds: z.array(z.string()),
  status: z.string(),
  openedAt: z.string(),
  creditorAnswerDueAt: z.string(),
  creditorAnswer: z.nullable(z.string()),
  creditorFileIds: z.array(z.string()),
  resolutionNote: z.nullable(z.string()),
  resolvedAt: z.nullable(z.string()),
});

export const decisionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  caseNumber: z.string(),
  /** `plan_off_scale`, `settlement_discount`, `bailiff_escalation`, `litigation_escalation`, `dispute_response`, `stage_skip`. */
  kind: z.string(),
  /** `pending`, `approved`, `rejected`, `answered`, `expired`. */
  status: z.string(),
  createdAt: z.string(),
  /** Sans réponse à cette date : refus (échéancier, remise) ou abandon du dossier (étape payante). */
  expiresAt: z.string(),
  paymentPlan: z.nullable(decisionPlanSchema),
  settlement: z.nullable(settlementSchema),
  feeQuote: z.nullable(feeQuoteSchema),
  dispute: z.nullable(disputeSchema),
  answeredAt: z.nullable(z.string()),
});
export type RecoveryDecision = z.infer<typeof decisionSchema>;

export const decisionPageSchema = z.object({
  decisions: z.array(decisionSchema),
  nextCursor: z.nullable(z.string()),
});
export type RecoveryDecisionPage = z.infer<typeof decisionPageSchema>;

/** `RecoveryDecisionAnswered` : la décision prise et le dossier à jour. */
export const decisionAnsweredSchema = z.object({ decision: decisionSchema, case: caseSchema });
export type RecoveryDecisionAnswered = z.infer<typeof decisionAnsweredSchema>;
