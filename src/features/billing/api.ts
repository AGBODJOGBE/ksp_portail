import { api, parseResponse } from '@/lib/api';
import { type Invoice, type InvoiceList, invoiceListSchema, invoiceSchema } from './schemas';

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
