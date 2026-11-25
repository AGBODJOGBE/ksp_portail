import { ApiError } from '@/lib/api';
import { describeCheckoutOpen } from '@/features/payment';
import { billingTexts as t } from './texts';

/** Conséquence d'un refus du paiement Mobile Money d'une facture pour l'écran, en plus du message. */
export type InvoicePayErrorKind =
  /** Facture déjà réglée, annulée ou introuvable : elle est relue pour montrer son état réel. */
  | 'stale'
  /** Clé déjà utilisée : une clé neuve est tirée avant le renvoi. */
  | 'newKey'
  /** Prestataire injoignable, coupure, limite : renvoi avec la **même** clé (un seul paiement). */
  | 'retry'
  /** Membre lecteur de l'entreprise (`AUTH_FORBIDDEN`) : plus de bouton. */
  | 'forbidden'
  | 'other';

export interface InvoicePayErrorView {
  message: string;
  kind: InvoicePayErrorKind;
}

/**
 * Refus de `POST /billing/invoices/{id}/pay-mobile-money` (codes du contrat) → message clair. Le message
 * de la gateway (déjà en français) sert pour les autres codes, avec l'identifiant de corrélation.
 */
export function describeInvoicePayError(error: unknown): InvoicePayErrorView {
  if (!(error instanceof ApiError)) return { message: t.genericError, kind: 'other' };
  const { code, status } = error;
  if (code === 'BILLING_INVALID_TRANSITION') return { message: t.mobileMoneyStale, kind: 'stale' };
  if (code === 'BILLING_INVOICE_NOT_FOUND') return { message: t.notFound, kind: 'stale' };
  if (code === 'AUTH_FORBIDDEN' || status === 403)
    return { message: t.mobileMoneyForbidden, kind: 'forbidden' };
  if (code.endsWith('_IDEMPOTENCY_KEY_REUSED')) return { message: t.mobileMoneyKeyReused, kind: 'newKey' };
  // Une page de paiement déjà ouverte pour cette facture (ADR-048 §1) : son heure d'expiration.
  const checkoutOpen = describeCheckoutOpen(error);
  if (checkoutOpen) return { message: checkoutOpen, kind: 'other' };
  if (code === 'PAYMENT_PROVIDER_UNAVAILABLE') return { message: t.mobileMoneyUnavailable, kind: 'retry' };
  if (status === 429) return { message: t.mobileMoneyTooMany, kind: 'retry' };
  if (status === 0 || status >= 500) return { message: error.message, kind: 'retry' };
  return {
    message: error.correlationId ? t.reference(error.message, error.correlationId) : error.message,
    kind: 'other',
  };
}
