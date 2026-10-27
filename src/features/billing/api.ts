import { api, parseResponse } from '@/lib/api';
import { type Invoice, type InvoiceList, invoiceListSchema, invoiceSchema } from './schemas';

/** Factures du client ou de son organisation active, les plus récentes d'abord (session requise). */
const INVOICES = '/api/v1/billing/invoices';

export const PAGE_SIZE = 10;

export async function listInvoices(cursor?: string): Promise<InvoiceList> {
  return parseResponse(invoiceListSchema, await api.get(INVOICES, { query: { limit: PAGE_SIZE, cursor } }));
}

export async function getInvoice(id: string): Promise<Invoice> {
  return parseResponse(invoiceSchema, await api.get(`${INVOICES}/${encodeURIComponent(id)}`));
}
