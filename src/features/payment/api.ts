'use client';

import { api, parseResponse } from '@/lib/api';
import {
  type Payment,
  type PaymentLinkPayment,
  type PaymentList,
  type PublicPaymentLink,
  paymentLinkPaymentSchema,
  paymentListSchema,
  paymentSchema,
  publicPaymentLinkSchema,
} from './schemas';

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

/*
 * Lien de paiement d'un payeur sans compte (ADR-040) : routes **publiques**, aucun jeton de session envoyé
 * (`auth: false`). Le jeton du lien n'est jamais journalisé ni gardé par le portail : il ne vit que dans
 * l'adresse de la page.
 */
const LINKS = '/api/v1/payment/links';
const linkPath = (token: string) => `${LINKS}/${encodeURIComponent(token)}`;

/** Résumé du lien ; une tentative en attente est relue chez le prestataire au passage. */
export async function getPaymentLink(token: string): Promise<PublicPaymentLink> {
  return parseResponse(publicPaymentLinkSchema, await api.get(linkPath(token), { auth: false }));
}

/** Lance (ou reprend) le paiement du lien : le montant est celui du lien, jamais envoyé par la page. */
export async function payPaymentLink(token: string, idempotencyKey: string): Promise<PaymentLinkPayment> {
  return parseResponse(
    paymentLinkPaymentSchema,
    await api.post(`${linkPath(token)}/pay`, undefined, { auth: false, idempotencyKey }),
  );
}

/** Développement seulement (prestataire simulé) : 404 `PAYMENT_SIMULATION_DISABLED` ailleurs. */
export async function simulatePaymentLink(
  token: string,
  outcome: 'succeeded' | 'failed',
): Promise<PaymentLinkPayment> {
  return parseResponse(
    paymentLinkPaymentSchema,
    await api.post(`${linkPath(token)}/simulate`, { outcome }, { auth: false }),
  );
}
