import { ApiError } from '@/lib/api';
import { paymentTexts } from './texts';

/** Conséquence d'un refus de création pour le bouton de paiement, en plus du message. */
export type PaymentErrorKind =
  /** Rien à payer, ou objet annulé : la fiche est relue pour montrer son état réel. */
  | 'stale'
  /** Clé déjà utilisée pour un autre objet : une clé neuve est tirée avant le renvoi. */
  | 'newKey'
  /** Coupure, prestataire injoignable, limite d'appels : renvoi possible avec la même clé. */
  | 'retry'
  | 'other';

export interface PaymentErrorView {
  message: string;
  kind: PaymentErrorKind;
}

const MESSAGES: Record<string, { message: string; kind: PaymentErrorKind }> = {
  PAYMENT_NOTHING_DUE: {
    message: 'Ce montant est déjà réglé : il n’y a plus rien à payer pour le moment.',
    kind: 'stale',
  },
  PAYMENT_SUBJECT_NOT_PAYABLE: {
    message: 'Cette prestation ou cette facture a été annulée : elle ne peut plus être payée.',
    kind: 'stale',
  },
  PAYMENT_VIA_INVOICE: {
    message: 'Une prestation d’entreprise se règle par sa facture mensuelle, dans « Mes factures ».',
    kind: 'other',
  },
  PAYMENT_SUBJECT_NOT_FOUND: {
    message:
      'Cette prestation ou cette facture n’est pas payable depuis le compte actif. Vérifiez le compte sélectionné (personnel ou entreprise).',
    kind: 'other',
  },
  PAYMENT_IDEMPOTENCY_KEY_REUSED: {
    message: 'Le paiement n’a pas pu être préparé. Réessayez.',
    kind: 'newKey',
  },
  PAYMENT_PROVIDER_UNAVAILABLE: {
    message:
      'Le service de paiement Mobile Money est momentanément indisponible. Réessayez dans quelques instants.',
    kind: 'retry',
  },
};

/**
 * Traduit un refus de `POST /payment/payments` (codes du contrat) en message clair. Le message de la
 * gateway (déjà en français) sert pour les autres codes.
 */
export function describePaymentError(error: unknown): PaymentErrorView {
  if (!(error instanceof ApiError)) return { message: paymentTexts.genericError, kind: 'other' };
  const known = MESSAGES[error.code];
  if (known) return known;
  if (error.status === 429) {
    return {
      message: 'Trop de tentatives de paiement en peu de temps. Patientez une minute avant de réessayer.',
      kind: 'retry',
    };
  }
  if (error.status === 0 || error.status >= 500) return { message: error.message, kind: 'retry' };
  return { message: error.message, kind: 'other' };
}

/** Lecture d'un paiement refusée : introuvable (hors périmètre) ou autre erreur. */
export function describePaymentReadError(error: unknown): { message: string; notFound: boolean } {
  const notFound = error instanceof ApiError && error.status === 404;
  if (notFound) return { message: paymentTexts.notFound, notFound };
  return { message: error instanceof ApiError ? error.message : paymentTexts.genericError, notFound };
}
