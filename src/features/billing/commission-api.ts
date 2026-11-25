'use client';

import { api, parseResponse } from '@/lib/api';
import {
  type CommissionInvoice,
  type FeeReceipt,
  commissionInvoiceListSchema,
  commissionInvoiceSchema,
  feeReceiptListSchema,
} from './commission-schemas';

/*
 * Factures de commission et reçus des frais du Recouvrement (ADR-064) : ceux de l'organisation active
 * (tout membre) ou du client lui-même, les plus récents d'abord. Module à part : seuls leurs écrans le
 * lisent, pas les pages qui importent `billing/api.ts`.
 */

const COMMISSION_INVOICES = '/api/v1/billing/commission-invoices';
const RECEIPTS = '/api/v1/billing/receipts';

export const COMMISSION_PAGE_SIZE = 10;

export async function listCommissionInvoices(
  cursor?: string,
  filters: { status?: string; period?: string } = {},
): Promise<{ data: CommissionInvoice[]; nextCursor: string | null }> {
  return parseResponse(
    commissionInvoiceListSchema,
    await api.get(COMMISSION_INVOICES, { query: { limit: COMMISSION_PAGE_SIZE, cursor, ...filters } }),
  );
}

/** Hors du périmètre du client : 404, sans révéler l'existence de la facture. */
export async function getCommissionInvoice(id: string): Promise<CommissionInvoice> {
  return parseResponse(
    commissionInvoiceSchema,
    await api.get(`${COMMISSION_INVOICES}/${encodeURIComponent(id)}`),
  );
}

/** Reçus des frais de dossier et des forfaits d'étude, d'un dossier (`caseId`) ou de tous. */
export async function listFeeReceipts(
  cursor?: string,
  caseId?: string,
): Promise<{ data: FeeReceipt[]; nextCursor: string | null }> {
  return parseResponse(
    feeReceiptListSchema,
    await api.get(RECEIPTS, { query: { limit: COMMISSION_PAGE_SIZE, cursor, caseId } }),
  );
}
