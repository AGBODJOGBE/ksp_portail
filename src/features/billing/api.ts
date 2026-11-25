import { api, parseResponse } from '@/lib/api';
import {
  type BillingPreferences,
  type Invoice,
  type InvoiceList,
  type InvoiceMobileMoneyPayment,
  billingPreferencesSchema,
  invoiceListSchema,
  invoiceMobileMoneyPaymentSchema,
  invoiceSchema,
} from './schemas';

/**
 * Factures de l'organisation active (contexte entreprise) ou du client lui-même (contexte personnel),
 * les plus récentes d'abord (session requise).
 */
const INVOICES = '/api/v1/billing/invoices';

export const PAGE_SIZE = 10;

/** États filtrables (`InvoiceStatus`). */
export const INVOICE_STATUSES = ['pending_payment', 'overdue', 'paid', 'cancelled'] as const;
export type InvoiceStatusFilter = (typeof INVOICE_STATUSES)[number];

export async function listInvoices(cursor?: string, status?: InvoiceStatusFilter): Promise<InvoiceList> {
  return parseResponse(
    invoiceListSchema,
    await api.get(INVOICES, { query: { limit: PAGE_SIZE, cursor, status } }),
  );
}

export async function getInvoice(id: string): Promise<Invoice> {
  return parseResponse(invoiceSchema, await api.get(`${INVOICES}/${encodeURIComponent(id)}`));
}

/**
 * Reste dû d'une facture payé depuis le portefeuille prépayé (ADR-046) : celui de l'organisation active ou
 * le mien. Débité en entier ; la même clé ne débite qu'une fois. Sans corps.
 */
export async function payInvoice(id: string, idempotencyKey: string): Promise<Invoice> {
  return parseResponse(
    invoiceSchema,
    await api.post(`${INVOICES}/${encodeURIComponent(id)}/pay`, undefined, { idempotencyKey }),
  );
}

/**
 * Reste dû d'une facture payé par Mobile Money (R-PE-04) : payment crédite d'abord le portefeuille, puis
 * billing débite la facture. Sans corps ; la même clé rend le même paiement. Membre `org_admin` ou
 * `org_member` de l'organisation active, sinon le client.
 */
export async function payInvoiceByMobileMoney(
  id: string,
  idempotencyKey: string,
): Promise<InvoiceMobileMoneyPayment> {
  return parseResponse(
    invoiceMobileMoneyPaymentSchema,
    await api.post(`${INVOICES}/${encodeURIComponent(id)}/pay-mobile-money`, undefined, { idempotencyKey }),
  );
}

const PREFERENCES = '/api/v1/billing/preferences';

/** Préférences de facturation de l'organisation active (tout membre). */
export async function getBillingPreferences(): Promise<BillingPreferences> {
  return parseResponse(billingPreferencesSchema, await api.get(PREFERENCES));
}

/** Active ou coupe le prélèvement automatique à l'échéance (administrateur de l'organisation active). */
export async function updateBillingPreferences(autoDebit: boolean): Promise<BillingPreferences> {
  return parseResponse(billingPreferencesSchema, await api.patch(PREFERENCES, { autoDebit }));
}
