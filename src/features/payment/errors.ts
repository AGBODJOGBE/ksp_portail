// Module d'erreurs seul, sans la session : l'index du paiement est lu par des pages serveur.
import { ApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { paymentTexts } from './texts';

/** Lecture d'un paiement refusée : introuvable (hors périmètre) ou autre erreur. */
export function describePaymentReadError(error: unknown): { message: string; notFound: boolean } {
  const notFound = error instanceof ApiError && error.status === 404;
  if (notFound) return { message: paymentTexts.notFound, notFound };
  return { message: error instanceof ApiError ? error.message : paymentTexts.genericError, notFound };
}

/**
 * `PAYMENT_CHECKOUT_OPEN` (409, ADR-048 §1) : une page de paiement est déjà ouverte pour cet objet (autre
 * payeur, autre part d'une mission, ou page du prestataire qui ne s'annule pas). Message avec l'heure
 * d'expiration de cette page (`details.expiresAt`, heure du Bénin) ; null pour une autre erreur.
 */
export function describeCheckoutOpen(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'PAYMENT_CHECKOUT_OPEN') return null;
  const expiresAt = error.details.expiresAt;
  const valid = typeof expiresAt === 'string' && !Number.isNaN(Date.parse(expiresAt));
  return valid ? paymentTexts.checkoutOpenUntil(formatDateTime(expiresAt)) : paymentTexts.checkoutOpen;
}
