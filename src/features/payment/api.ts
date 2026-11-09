'use client';

import { api, parseResponse } from '@/lib/api';
import { type Payment, type PaymentList, paymentListSchema, paymentSchema } from './schemas';

/**
 * Paiements en ligne par Mobile Money (service payment, ADR-031) : session requise. Le portail ne crée plus
 * de paiement direct (`POST /payment/payments`, déprécié par ADR-046) : il suit les recharges du
 * portefeuille et relit l'historique.
 */
const PAYMENTS = '/api/v1/payment/payments';

export const PAGE_SIZE = 10;

export async function getPayment(id: string): Promise<Payment> {
  return parseResponse(paymentSchema, await api.get(`${PAYMENTS}/${encodeURIComponent(id)}`));
}

export async function listPayments(cursor?: string): Promise<PaymentList> {
  return parseResponse(paymentListSchema, await api.get(PAYMENTS, { query: { limit: PAGE_SIZE, cursor } }));
}

/** Développement seulement (prestataire simulé) : 404 `PAYMENT_SIMULATION_DISABLED` ailleurs. */
export async function simulatePayment(id: string, outcome: 'succeeded' | 'failed'): Promise<Payment> {
  return parseResponse(
    paymentSchema,
    await api.post(`${PAYMENTS}/${encodeURIComponent(id)}/simulate`, { outcome }),
  );
}
