import * as z from 'zod/mini';

/*
 * Paiements en ligne lus par le client (contrat `ksp-api.v1.yaml`, routes `/api/v1/payment/payments`),
 * champ par champ : un champ obligatoire absent rend la réponse invalide, un champ ajouté est ignoré, un
 * statut inconnu s'affiche avec un libellé neutre. Schémas lus dans le navigateur : `zod/mini`.
 */

const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });

/** `PaymentSubject` : mission (`part` = `deposit` ou `balance`) ou facture (`reference` = son numéro). */
export const paymentSubjectSchema = z.object({
  type: z.string(),
  id: z.string(),
  part: z.nullable(z.string()),
  reference: z.nullable(z.string()),
});

/** `Payment` : intention de paiement par Mobile Money (ADR-031). */
export const paymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  subject: paymentSubjectSchema,
  amount: moneySchema,
  customerId: z.string(),
  organizationId: z.nullable(z.string()),
  method: z.string(),
  provider: z.string(),
  /** Référence chez le prestataire, à citer au support. */
  providerReference: z.nullable(z.string()),
  /** Page du prestataire tant que le paiement est `pending` ; null si elle n'a pas encore pu être obtenue. */
  checkoutUrl: z.nullable(z.string()),
  failureReason: z.nullable(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  completedAt: z.nullable(z.string()),
  /**
   * Écart de montant pas encore traité par la finance (ADR-032, décision 10) : tout nouveau paiement de
   * l'objet est refusé. Facultatif : absent d'une gateway antérieure.
   */
  underReview: z.optional(z.boolean()),
});

export const paymentListSchema = z.object({
  data: z.array(paymentSchema),
  nextCursor: z.nullable(z.string()),
});

export type Payment = z.infer<typeof paymentSchema>;
export type PaymentList = z.infer<typeof paymentListSchema>;

/*
 * Lien de paiement vu par un payeur sans compte (ADR-040, routes publiques `/api/v1/payment/links/{token}`) :
 * aucune donnée personnelle, aucun identifiant interne sauf celui de la tentative.
 */

/** `PaymentLinkPayment` : tentative de paiement d'un lien. */
export const paymentLinkPaymentSchema = z.object({
  id: z.string(),
  status: z.string(),
  /** Page du prestataire tant que la tentative est `pending` ; null sinon. */
  checkoutUrl: z.nullable(z.string()),
  expiresAt: z.string(),
  failureReason: z.nullable(z.string()),
});

/** `PublicPaymentLink` : `active`, `paid`, `under_review`, `revoked` ou `expired`. */
export const publicPaymentLinkSchema = z.object({
  status: z.string(),
  /** Bénéficiaire affiché (créancier). */
  beneficiaryName: z.string(),
  /** Libellé, par exemple « Échéance 2 sur 6 ». */
  description: z.string(),
  /** Référence de l'émetteur, à citer au support. */
  reference: z.string(),
  amount: moneySchema,
  /** Date seule (AAAA-MM-JJ). */
  dueDate: z.nullable(z.string()),
  expiresAt: z.string(),
  paidAt: z.nullable(z.string()),
  /** Dernière tentative, null si aucune. */
  payment: z.nullable(paymentLinkPaymentSchema),
});

export type PaymentLinkPayment = z.infer<typeof paymentLinkPaymentSchema>;
export type PublicPaymentLink = z.infer<typeof publicPaymentLinkSchema>;
