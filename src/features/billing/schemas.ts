import * as z from 'zod/mini';

/*
 * Factures lues par le client (contrat `ksp-api.v1.yaml`, routes `/api/v1/billing/invoices`). Lecture
 * tolérante : un champ ajouté est ignoré, un état inconnu s'affiche avec un libellé neutre.
 * Schémas lus dans le navigateur : `zod/mini`.
 */

const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });

export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  source: z.string(),
  contractId: z.string(),
  periodIndex: z.int(),
  periodStart: z.string(),
  periodEnd: z.string(),
  lines: z.array(
    z.object({ label: z.string(), quantity: z.int(), unitPrice: moneySchema, amount: moneySchema }),
  ),
  total: moneySchema,
  paid: moneySchema,
  balance: moneySchema,
  issuedAt: z.string(),
  dueAt: z.string(),
  paidAt: z.nullable(z.string()),
  payments: z.array(
    z.object({
      id: z.string(),
      amount: moneySchema,
      method: z.string(),
      reference: z.nullable(z.string()),
      recordedAt: z.string(),
    }),
  ),
});

export const invoiceListSchema = z.object({
  data: z.array(invoiceSchema),
  nextCursor: z.nullable(z.string()),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceList = z.infer<typeof invoiceListSchema>;
