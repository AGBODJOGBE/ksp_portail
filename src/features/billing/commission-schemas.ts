import * as z from 'zod/mini';
import { invoiceOrganizationSchema } from './schemas';

/*
 * Factures de commission et reçus des frais du Recouvrement (ADR-064 ; contrat `CommissionInvoice`,
 * `FeeReceipt`, routes `/api/v1/billing/commission-invoices` et `/api/v1/billing/receipts`). Chaînes plutôt
 * qu'énumérations fermées : un état ou une nature inconnus s'affichent avec un libellé neutre. Lus dans le
 * navigateur : `zod/mini`.
 */

const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });

/** `CommissionInvoiceLine` : un encaissement du mois, hors taxe. */
const commissionLineSchema = z.object({
  caseId: z.string(),
  caseNumber: z.string(),
  collectionId: z.string(),
  receivedAt: z.string(),
  /** Jour de l'encaissement (heure du Bénin), AAAA-MM-JJ. */
  receivedOn: z.string(),
  /** `payment_link`, `offline_cash`, `offline_transfer`, `partner`, `direct_to_creditor`. */
  source: z.string(),
  gross: moneySchema,
  commission: moneySchema,
  /** `deducted` : retenue à l'encaissement ; `invoiced` : débitée du portefeuille du créancier. */
  settlement: z.string(),
});
export type CommissionLine = z.infer<typeof commissionLineSchema>;

/** `CommissionDebit` : débit automatique de la commission à débiter. */
const commissionDebitSchema = z.object({
  attempts: z.int(),
  lastAttemptAt: z.nullable(z.string()),
  nextAttemptAt: z.nullable(z.string()),
  /** `insufficient_funds`, `wallet_error`. */
  lastFailure: z.nullable(z.string()),
  missing: z.nullable(moneySchema),
});

export const commissionInvoiceSchema = z.object({
  id: z.string(),
  /** `FCR-2026-000007`. */
  number: z.string(),
  /** `pending_payment`, `paid`, `cancelled`. */
  status: z.string(),
  /** Mois facturé AAAA-MM (heure du Bénin). */
  period: z.string(),
  periodStart: z.string(),
  /** Borne exclusive. */
  periodEnd: z.string(),
  lines: z.array(commissionLineSchema),
  totalCollected: moneySchema,
  commissionDeducted: moneySchema,
  commissionInvoiced: moneySchema,
  commissionTotal: moneySchema,
  balance: moneySchema,
  issuedAt: z.string(),
  paidAt: z.nullable(z.string()),
  walletTransactionId: z.nullable(z.string()),
  debit: z.nullable(commissionDebitSchema),
  organization: z.nullable(invoiceOrganizationSchema),
});
export type CommissionInvoice = z.infer<typeof commissionInvoiceSchema>;

export const commissionInvoiceListSchema = z.object({
  data: z.array(commissionInvoiceSchema),
  nextCursor: z.nullable(z.string()),
});

/** `FeeReceipt` : reçu d'un débit du portefeuille pour des frais du recouvrement. */
export const feeReceiptSchema = z.object({
  id: z.string(),
  /** `RFD-2026-000012`. */
  number: z.string(),
  /** `case_fee` (frais de dossier) ou `study_fee` (forfait d'étude) ; d'autres natures pourront s'ajouter. */
  kind: z.string(),
  caseId: z.string(),
  caseNumber: z.nullable(z.string()),
  label: z.string(),
  amount: moneySchema,
  paidAt: z.string(),
  issuedAt: z.string(),
  walletTransactionId: z.string(),
});
export type FeeReceipt = z.infer<typeof feeReceiptSchema>;

export const feeReceiptListSchema = z.object({
  data: z.array(feeReceiptSchema),
  nextCursor: z.nullable(z.string()),
});
