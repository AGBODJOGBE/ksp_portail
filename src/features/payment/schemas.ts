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
});

export const paymentListSchema = z.object({
  data: z.array(paymentSchema),
  nextCursor: z.nullable(z.string()),
});

export type Payment = z.infer<typeof paymentSchema>;
export type PaymentList = z.infer<typeof paymentListSchema>;
