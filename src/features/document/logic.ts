import { ApiError } from '@/lib/api/errors';
import { documentTexts as t } from './texts';

/** Jeton d'un lien de signature (contrat, `SigningToken`) : un autre jeton est introuvable, sans appel. */
export function isSigningToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,100}$/.test(token);
}

/** Code de signature : 6 chiffres (contrat, `SignDocumentRequest.code`). */
export function cleanSigningCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function isSigningCodeComplete(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/** Adresse de lecture du PDF acceptée : http(s) seulement. */
export function safeDocumentUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Conséquence d'un refus pour l'écran, en plus du message. */
export type DocumentErrorKind =
  /** Lien ou document introuvable (404). */
  | 'notFound'
  /** Demande close entre-temps (signée, expirée, annulée) : relire pour montrer son état. */
  | 'closed'
  /** Code faux, essais restants : sous le champ. */
  | 'code'
  /** Code expiré ou épuisé : en demander un nouveau. */
  | 'newCode'
  /** Accord manquant : sous la case. */
  | 'consent'
  /** Limite atteinte : attendre `retryAfterSeconds`. */
  | 'wait'
  /** Panne d'un service, coupure : réessayer. */
  | 'unavailable'
  /** Rien ne peut être fait ici (document modifié, signataire injoignable, droits) : message seul. */
  | 'blocked'
  | 'other';

export interface DocumentErrorView {
  message: string;
  kind: DocumentErrorKind;
  retryAfterSeconds?: number;
}

function positiveSeconds(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 ? Math.ceil(value) : undefined;
}

/**
 * Erreur du service document (ADR-044) : message en français et conduite à tenir. `notFound` : message
 * d'un 404 (lien de signature ou document de Mon espace).
 */
export function describeDocumentError(error: unknown, notFound: string = t.notFoundText): DocumentErrorView {
  if (!(error instanceof ApiError)) return { message: t.genericError, kind: 'other' };
  switch (error.code) {
    case 'DOCUMENT_SIGNATURE_CLOSED':
      return { message: t.closedNow, kind: 'closed' };
    case 'DOCUMENT_CODE_INVALID': {
      const left = error.details.attemptsLeft;
      const attemptsLeft = typeof left === 'number' ? left : null;
      return { message: t.codeInvalid(attemptsLeft), kind: attemptsLeft === 0 ? 'newCode' : 'code' };
    }
    case 'DOCUMENT_CODE_EXPIRED':
      return { message: t.codeExpired, kind: 'newCode' };
    case 'DOCUMENT_CONSENT_REQUIRED':
      return { message: t.consentMissing, kind: 'consent' };
    case 'DOCUMENT_SIGNER_UNREACHABLE':
      return { message: t.unreachable, kind: 'blocked' };
    case 'DOCUMENT_CONTENT_CHANGED':
      return { message: t.contentChanged, kind: 'blocked' };
    case 'DOCUMENT_DEPENDENCY_UNAVAILABLE':
      return { message: t.unavailable, kind: 'unavailable' };
  }
  if (error.status === 404) return { message: notFound, kind: 'notFound' };
  if (error.status === 403) return { message: t.forbidden, kind: 'blocked' };
  if (error.status === 429) {
    const retryAfterSeconds = positiveSeconds(error.details.retryAfterSeconds);
    return {
      message: retryAfterSeconds ? t.rateLimited(retryAfterSeconds) : error.message,
      kind: 'wait',
      retryAfterSeconds,
    };
  }
  if (error.status === 0 || error.status >= 500) return { message: error.message, kind: 'unavailable' };
  return { message: error.message, kind: 'other' };
}
