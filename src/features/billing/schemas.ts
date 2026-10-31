import * as z from 'zod/mini';

/*
 * Factures lues par le client (contrat `ksp-api.v1.yaml`, routes `/api/v1/billing/invoices`), champ
 * par champ : un champ obligatoire absent rend la réponse invalide, un champ ajouté est ignoré, un état
 * inconnu s'affiche avec un libellé neutre. Schémas lus dans le navigateur : `zod/mini`.
 */

const moneySchema = z.object({ amount: z.int(), currency: z.literal('XOF') });

/**
 * `InvoiceOrganization` : en-tête de la facture d'une organisation, copié à l'émission (ADR-028) ;
 * il ne suit pas les modifications ultérieures de la fiche.
 */
export const invoiceOrganizationSchema = z.object({
  legalName: z.string(),
  address: z.string(),
  ifu: z.string(),
  rccm: z.nullable(z.string()),
});

/** `Invoice` : facture mensuelle d'un contrat (pour le Nettoyage, une mission d'entreprise). */
export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  customerId: z.string(),
  organizationId: z.nullable(z.string()),
  source: z.string(),
  contractId: z.string(),
  /** Rang du mois facturé dans le contrat. */
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
      recordedBy: z.string(),
      recordedAt: z.string(),
    }),
  ),
  /** `null` pour un particulier et pour une facture émise avant l'enregistrement de l'en-tête. */
  organization: z.nullable(invoiceOrganizationSchema),
});

export const invoiceListSchema = z.object({
  data: z.array(invoiceSchema),
  nextCursor: z.nullable(z.string()),
});

export type InvoiceOrganization = z.infer<typeof invoiceOrganizationSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceList = z.infer<typeof invoiceListSchema>;
