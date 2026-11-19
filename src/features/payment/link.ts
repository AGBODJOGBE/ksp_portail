import { ApiError } from '@/lib/api/errors';
import { paymentLinkTexts as t } from './link-texts';
import { paymentPaths } from './texts';

/*
 * Lien de paiement d'un payeur sans compte (ADR-040) : logique sans React de la page `/payer/[token]`.
 */

/** Jeton d'un lien : 43 caractères base64url (contrat, `LinkToken`). Un autre jeton est introuvable. */
export function isPaymentLinkToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Attente de la confirmation au retour du prestataire (ADR-040) : une relecture toutes les 3 secondes,
 * une minute au plus, puis « Vérifier à nouveau ». La route est limitée à 30 lectures par minute.
 */
export const LINK_POLL_DELAYS_MS: readonly number[] = Array.from({ length: 20 }, () => 3000);

/**
 * Page de paiement simulée du portail (prestataire `simulated`, développement) : elle demande une session
 * et ne connaît pas le jeton du lien. La page du lien la remplace alors par ses propres boutons de test.
 */
export function isPortalSimulation(checkoutUrl: string): boolean {
  try {
    return new URL(checkoutUrl, 'http://localhost').pathname === paymentPaths.simulation;
  } catch {
    return false;
  }
}

/** Conséquence d'un refus pour l'écran, en plus du message. */
export type LinkErrorKind =
  /** Jeton inconnu ou mal formé (404) : rien à afficher du lien. */
  | 'notFound'
  /** Lien payé, en vérification, révoqué ou expiré entre-temps : il est relu pour montrer son état réel. */
  | 'stale'
  /** Prestataire injoignable, coupure : nouvel essai avec la **même** clé (jamais deux paiements). */
  | 'retry'
  /** Trop d'essais : attendre `retryAfterSeconds`. */
  | 'wait'
  | 'other';

export interface LinkErrorView {
  message: string;
  kind: LinkErrorKind;
  retryAfterSeconds?: number;
}

const STALE = new Set([
  'PAYMENT_LINK_ALREADY_PAID',
  'PAYMENT_UNDER_REVIEW',
  'PAYMENT_LINK_REVOKED',
  'PAYMENT_LINK_EXPIRED',
]);

/** Lecture ou paiement d'un lien refusé : message en français (celui de la gateway) et conduite à tenir. */
export function describeLinkError(error: unknown): LinkErrorView {
  if (!(error instanceof ApiError)) return { message: t.genericError, kind: 'other' };
  if (error.status === 404) return { message: t.notFoundText, kind: 'notFound' };
  if (STALE.has(error.code)) return { message: error.message, kind: 'stale' };
  if (error.status === 429) {
    const seconds = error.details.retryAfterSeconds;
    const retryAfterSeconds = typeof seconds === 'number' && seconds > 0 ? Math.ceil(seconds) : undefined;
    return {
      message: retryAfterSeconds ? t.rateLimited(retryAfterSeconds) : error.message,
      kind: 'wait',
      retryAfterSeconds,
    };
  }
  if (error.status === 0 || error.status >= 500) return { message: error.message, kind: 'retry' };
  return { message: error.message, kind: 'other' };
}
