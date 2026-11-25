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

/** Texte v2 facultatif : absent d'une facture v1, parfois `null`, parfois vide (gateway actuelle). */
const optionalText = z.optional(z.nullable(z.string()));

/**
 * `InvoiceLine`. v2 (Nettoyage, ADR-055) : nature (`kind` : `session`, `missed_session`,
 * `late_cancellation`, `visit_fee`, `visit_fee_deduction`, `adjustment`), date de la séance (AAAA-MM-JJ,
 * heure du Bénin), programme (PN-…) et nom du lieu donné par le client ; absents d'une ligne v1.
 */
export const invoiceLineSchema = z.object({
  label: z.string(),
  quantity: z.int(),
  unitPrice: moneySchema,
  amount: moneySchema,
  kind: optionalText,
  serviceDate: optionalText,
  programNumber: optionalText,
  placeLabel: optionalText,
});

/**
 * `CreditNote` (R-PE-07) : avoir sur une facture émise, numéro `AV-AAAA-NNNNNN`. `appliedToBalance` :
 * part déduite du reste dû ; `creditedToWallet` : part créditée au portefeuille (facture déjà réglée).
 */
export const creditNoteSchema = z.object({
  id: z.string(),
  number: z.string(),
  lines: z.array(invoiceLineSchema),
  total: moneySchema,
  reason: z.string(),
  issuedAt: z.string(),
  appliedToBalance: moneySchema,
  creditedToWallet: moneySchema,
});

/**
 * `Invoice`. v1 : facture mensuelle d'un contrat (rang et période du mois). v2 (Nettoyage, ADR-055) :
 * facture de séance, reçu des frais de visite ou facture mensuelle (`kind`), avec demande (DN-…),
 * programme (PN-…), rang de la séance (`3/15`), lieu, date de la prestation et avoirs. Schéma tolérant :
 * les champs v2 sont facultatifs, et `contractId`, `periodIndex`, `periodStart`, `periodEnd` (renvoyés
 * vides ou à 0 pour une facture v2) aussi ; l'écran masque ce qui est vide.
 */
export const invoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: z.string(),
  customerId: z.string(),
  organizationId: z.nullable(z.string()),
  source: z.string(),
  contractId: z.optional(z.string()),
  /** Rang du mois facturé dans le contrat (v1) ; 0 ou absent pour une facture v2. */
  periodIndex: z.optional(z.int()),
  periodStart: z.optional(z.string()),
  periodEnd: z.optional(z.string()),
  lines: z.array(invoiceLineSchema),
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
  kind: optionalText,
  requestNumber: optionalText,
  programNumber: optionalText,
  sessionRank: optionalText,
  placeLabel: optionalText,
  serviceDate: optionalText,
  creditNotes: z.optional(z.array(creditNoteSchema)),
});

/**
 * `InvoiceMobileMoneyPayment` : paiement Mobile Money du reste dû (R-PE-04), suivi par
 * `GET /payment/payments/{paymentId}` ; `checkoutUrl` null si la page du prestataire n'a pas pu être créée.
 */
export const invoiceMobileMoneyPaymentSchema = z.object({
  paymentId: z.string(),
  amount: moneySchema,
  checkoutUrl: z.nullable(z.string()),
  expiresAt: z.string(),
  created: z.boolean(),
});

/** `BillingPreferences` de l'organisation active : prélèvement automatique de la facture mensuelle (R-PE-04). */
export const billingPreferencesSchema = z.object({
  organizationId: z.string(),
  autoDebit: z.boolean(),
  updatedBy: z.nullable(z.string()),
  updatedAt: z.nullable(z.string()),
});

export const invoiceListSchema = z.object({
  data: z.array(invoiceSchema),
  nextCursor: z.nullable(z.string()),
});

export type InvoiceOrganization = z.infer<typeof invoiceOrganizationSchema>;
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
export type CreditNote = z.infer<typeof creditNoteSchema>;
export type InvoiceMobileMoneyPayment = z.infer<typeof invoiceMobileMoneyPaymentSchema>;
export type BillingPreferences = z.infer<typeof billingPreferencesSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceList = z.infer<typeof invoiceListSchema>;
