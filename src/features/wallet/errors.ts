import { ApiError } from '@/lib/api';
import { describeCheckoutOpen } from '@/features/payment';
import { walletTexts } from './texts';

/** Conséquence d'un refus pour l'écran, en plus du message. */
export type WalletErrorKind =
  /** Solde insuffisant : rien n'est débité, proposer de recharger le montant manquant. */
  | 'insufficient'
  /** Rien à payer, objet déjà payé ou annulé : la fiche est relue pour montrer son état réel. */
  | 'stale'
  /** Clé déjà utilisée, ou débit remboursé : une clé neuve est tirée avant le renvoi. */
  | 'newKey'
  /** Coupure, conflit d'écriture, service injoignable : renvoi avec la **même** clé (rien n'est payé deux fois). */
  | 'retry'
  /** Membre lecteur d'une entreprise (`AUTH_FORBIDDEN`) : ni recharge ni paiement. */
  | 'forbidden'
  | 'other';

export interface WalletErrorView {
  message: string;
  kind: WalletErrorKind;
  /** Solde insuffisant : montant manquant et solde actuel (`details.missing`, `details.balance`). */
  missing?: number;
  balance?: number;
}

const MESSAGES: Record<string, { message: string; kind: WalletErrorKind }> = {
  WALLET_DEBIT_REFUNDED: {
    message: 'Ce paiement a été remboursé dans votre portefeuille entre-temps. Vous pouvez payer de nouveau.',
    kind: 'newKey',
  },
  WALLET_IDEMPOTENCY_KEY_REUSED: {
    message: 'Le paiement n’a pas pu être préparé. Réessayez.',
    kind: 'newKey',
  },
  PAYMENT_IDEMPOTENCY_KEY_REUSED: {
    message: 'La recharge n’a pas pu être préparée. Réessayez.',
    kind: 'newKey',
  },
  CLEANING_NOTHING_DUE: {
    message: 'Ce montant est déjà réglé : il n’y a plus rien à payer pour le moment.',
    kind: 'stale',
  },
  CLEANING_INVALID_TRANSITION: {
    message: 'Cette prestation ne peut plus être payée (annulée ou déjà réglée).',
    kind: 'stale',
  },
  BILLING_INVALID_TRANSITION: {
    message: 'Cette facture ne peut plus être payée : elle est déjà réglée ou annulée.',
    kind: 'stale',
  },
  RECOVERY_MANDATE_NOT_SIGNED: {
    message: 'Le mandat doit être signé avant le paiement des frais de dossier.',
    kind: 'stale',
  },
  RECOVERY_INVALID_TRANSITION: {
    message: 'Les frais de ce dossier ne peuvent plus être payés : son état a changé.',
    kind: 'stale',
  },
  RECOVERY_IDEMPOTENCY_KEY_REUSED: {
    message: 'Le paiement n’a pas pu être préparé. Réessayez.',
    kind: 'newKey',
  },
  CLEANING_PAYMENT_VIA_INVOICE: {
    message: 'Une prestation d’entreprise se règle par sa facture mensuelle, dans « Mes factures ».',
    kind: 'other',
  },
  AUTH_FORBIDDEN: { message: walletTexts.readOnly, kind: 'forbidden' },
  PAYMENT_PROVIDER_UNAVAILABLE: {
    message:
      'Le service de paiement Mobile Money est momentanément indisponible. Réessayez dans quelques instants.',
    kind: 'retry',
  },
};

const amountOf = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : typeof value === 'object' && value !== null && 'amount' in value
      ? amountOf((value as { amount: unknown }).amount)
      : undefined;

/**
 * Traduit un refus d'un paiement par le portefeuille (mission, facture) ou d'une recharge (codes du
 * contrat) en message clair. Le message de la gateway (déjà en français) sert pour les autres codes.
 */
export function describeWalletError(error: unknown): WalletErrorView {
  if (!(error instanceof ApiError)) return { message: walletTexts.genericError, kind: 'other' };
  // Même forme pour les frais d'un dossier de recouvrement (`fee/pay`, ADR-060) : `details.missing`, `details.balance`.
  if (error.code === 'WALLET_INSUFFICIENT_FUNDS' || error.code === 'RECOVERY_INSUFFICIENT_FUNDS') {
    return {
      message: error.message,
      kind: 'insufficient',
      missing: amountOf(error.details.missing),
      balance: amountOf(error.details.balance),
    };
  }
  // Recharge : une page de paiement déjà ouverte (ADR-048 §1 ; les recharges en sont exclues aujourd'hui).
  const checkoutOpen = describeCheckoutOpen(error);
  if (checkoutOpen) return { message: checkoutOpen, kind: 'other' };
  const known = MESSAGES[error.code];
  if (known) return known;
  if (error.status === 403) return { message: walletTexts.readOnly, kind: 'forbidden' };
  if (error.status === 409 && error.code.endsWith('_CONCURRENT_UPDATE')) {
    return {
      message:
        'Une autre opération était en cours sur ce paiement. Réessayez : vous ne paierez pas deux fois.',
      kind: 'retry',
    };
  }
  if (error.status === 429) {
    return {
      message: 'Trop de tentatives en peu de temps. Patientez une minute avant de réessayer.',
      kind: 'retry',
    };
  }
  if (error.status === 0 || error.status >= 500) return { message: error.message, kind: 'retry' };
  return { message: error.message, kind: 'other' };
}
