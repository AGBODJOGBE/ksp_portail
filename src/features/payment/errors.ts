import { ApiError } from '@/lib/api';
import { paymentTexts } from './texts';

/** Lecture d'un paiement refusée : introuvable (hors périmètre) ou autre erreur. */
export function describePaymentReadError(error: unknown): { message: string; notFound: boolean } {
  const notFound = error instanceof ApiError && error.status === 404;
  if (notFound) return { message: paymentTexts.notFound, notFound };
  return { message: error instanceof ApiError ? error.message : paymentTexts.genericError, notFound };
}
