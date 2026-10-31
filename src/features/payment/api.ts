import { api, parseResponse } from '@/lib/api';
import { type Payment, type PaymentList, paymentListSchema, paymentSchema } from './schemas';

/** Paiement en ligne par Mobile Money (service payment, ADR-031) : session requise. */
const PAYMENTS = '/api/v1/payment/payments';

export const PAGE_SIZE = 10;

/**
 * `CreatePaymentRequest` : l'objet payé, jamais le montant (lu par payment dans cleaning ou billing).
 * `part` est obligatoire pour une mission et absent pour une facture.
 */
export type PaymentSubjectInput =
  | { subjectType: 'cleaning_mission'; subjectId: string; part: 'deposit' | 'balance' }
  | { subjectType: 'billing_invoice'; subjectId: string };

export async function createPayment(input: PaymentSubjectInput, idempotencyKey: string): Promise<Payment> {
  return parseResponse(paymentSchema, await api.post(PAYMENTS, input, { idempotencyKey }));
}

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
