import * as z from 'zod/mini';
import { caseSchema, collectionSchema, moneySchema } from './schemas';

/*
 * Argent du créancier (contrat `RecoveryRemittance`, `RecoveryStatement`, `RecoveryCaseWithCollection`) :
 * reversements crédités au portefeuille, relevés mensuels, paiement reçu directement. Lus dans le
 * navigateur : `zod/mini`.
 */

/** `RecoveryRemittance` : encaissement crédité au portefeuille (brut, commission, net). */
export const remittanceSchema = z.object({
  collectionId: z.string(),
  caseId: z.string(),
  caseNumber: z.string(),
  /** `payment_link`, `offline_cash`, `offline_transfer`, `partner`, `direct_to_creditor`. */
  source: z.string(),
  gross: moneySchema,
  commission: moneySchema,
  net: moneySchema,
  creditedAt: z.string(),
  walletTransactionId: z.string(),
});
export type RecoveryRemittance = z.infer<typeof remittanceSchema>;

export const remittancePageSchema = z.object({
  remittances: z.array(remittanceSchema),
  nextCursor: z.nullable(z.string()),
});

/** `RecoveryStatement` : relevé d'un dossier pour un mois, PDF et facture de commission. */
export const statementSchema = z.object({
  id: z.string(),
  /** Mois AAAA-MM. */
  period: z.string(),
  caseId: z.string(),
  caseNumber: z.string(),
  collected: moneySchema,
  commission: moneySchema,
  costs: moneySchema,
  remitted: moneySchema,
  /** Relevé PDF (service document). */
  documentId: z.nullable(z.string()),
  /** Facture de commission émise par billing. */
  invoiceId: z.nullable(z.string()),
  issuedAt: z.string(),
});
export type RecoveryStatement = z.infer<typeof statementSchema>;

export const statementPageSchema = z.object({
  statements: z.array(statementSchema),
  nextCursor: z.nullable(z.string()),
});

/** `RecoveryCaseWithCollection` : dossier à jour et encaissement enregistré (paiement direct). */
export const caseWithCollectionSchema = z.object({ case: caseSchema, collection: collectionSchema });
export type RecoveryCaseWithCollection = z.infer<typeof caseWithCollectionSchema>;
