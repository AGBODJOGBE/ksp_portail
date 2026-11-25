import { ApiError } from '@/lib/api';
import { formatXof } from '@/lib/format';
import { isBeninPhone, phoneFromInput } from '@/lib/phone';
import type { WithdrawalInput, WithdrawalOperator } from './api';
import { withdrawalTexts as t } from './withdrawal-texts';

/*
 * Retrait vers Mobile Money (R-WL-04) : contrôle de forme avant l'envoi et lecture des refus. Le service
 * wallet reste seul juge (montant, solde, numéro, droits) ; ces contrôles évitent seulement un aller-retour.
 */

export const OPERATORS: ReadonlyArray<WithdrawalOperator> = ['mtn', 'moov', 'celtiis'];

/** Bornes du montant d'un retrait (`requireXof` du service wallet : entier de 1 à 1 000 000 000 FCFA). */
export const MAX_WITHDRAWAL = 1_000_000_000;
/** Longueur maximale du nom du bénéficiaire (`RequestWithdrawalRequest.beneficiary.name`). */
export const NAME_MAX = 120;

export type WithdrawalField = 'amount' | 'operator' | 'phone' | 'name';

export interface WithdrawalValues {
  amount: string;
  operator: WithdrawalOperator | '';
  phone: string;
  name: string;
}

export type WithdrawalErrors = Partial<Record<WithdrawalField, string>>;

export type WithdrawalCheck = { input: WithdrawalInput } | { errors: WithdrawalErrors };

/** Ordre des champs à l'écran : le premier en erreur reçoit le focus. */
export const FIELD_ORDER: ReadonlyArray<WithdrawalField> = ['amount', 'operator', 'phone', 'name'];

/**
 * Numéro du bénéficiaire tel que saisi → E.164 (règle de `lib/phone`, ADR-063), ou `null`. Un numéro écrit
 * sans indicatif (« 01 97 00 00 45 », ou l'ancien « 97 00 00 45 ») est lu comme béninois : le retrait
 * ne va que vers un compte Mobile Money du Bénin.
 */
export function beneficiaryPhone(value: string): string | null {
  return phoneFromInput(value);
}

/**
 * Saisie → corps de `POST /wallet/me/withdrawals`. Montant « 15 000 » ou « 15000 » (entier de FCFA),
 * au plus le solde connu ; numéro béninois normalisé (`lib/phone`, ADR-063) ; nom de 1 à 120 caractères.
 */
export function checkWithdrawal(values: WithdrawalValues, balance: number | null): WithdrawalCheck {
  const errors: WithdrawalErrors = {};
  const digits = values.amount.replace(/[\s  .]/g, '');
  const amount = Number(digits);
  if (!digits) errors.amount = t.errors.amountEmpty;
  else if (!/^\d{1,10}$/.test(digits) || amount < 1) errors.amount = t.errors.amountInvalid;
  else if (amount > MAX_WITHDRAWAL) errors.amount = t.errors.amountTooHigh(formatXof(MAX_WITHDRAWAL));
  else if (balance !== null && amount > balance)
    errors.amount = t.errors.amountOverBalance(formatXof(balance));

  if (!values.operator) errors.operator = t.errors.operatorEmpty;

  const phone = beneficiaryPhone(values.phone);
  if (!values.phone.trim()) errors.phone = t.errors.phoneEmpty;
  else if (!phone || !isBeninPhone(phone)) errors.phone = t.errors.phoneInvalid;

  const name = values.name.trim();
  if (!name) errors.name = t.errors.nameEmpty;
  else if (name.length > NAME_MAX) errors.name = t.errors.nameTooLong(NAME_MAX);

  if (Object.keys(errors).length || !values.operator || !phone) return { errors };
  return {
    input: {
      amount: { amount, currency: 'XOF' },
      beneficiary: { phone, operator: values.operator, name },
    },
  };
}

/** Conséquence d'un refus pour l'écran. */
export type WithdrawalErrorKind =
  /** Champ refusé par la gateway : retour à la saisie, erreur sous le champ. */
  | 'field'
  /** Solde insuffisant (`WALLET_INSUFFICIENT_FUNDS`) : rien n'est retenu, solde relu. */
  | 'insufficient'
  /** Clé déjà utilisée pour une autre demande : une clé neuve est tirée au prochain envoi. */
  | 'newKey'
  /** Coupure, conflit, limite, service injoignable : renvoi avec la **même** clé (un seul retrait). */
  | 'retry'
  /** Membre d'entreprise qui n'en est pas administrateur (`AUTH_FORBIDDEN`). */
  | 'forbidden'
  | 'other';

export interface WithdrawalErrorView {
  message: string;
  kind: WithdrawalErrorKind;
  field?: WithdrawalField;
}

/** Champ du contrat (`beneficiary.phone`, `/beneficiary/phone`…) → champ de l'écran. */
function fieldOf(value: unknown): WithdrawalField | undefined {
  if (typeof value !== 'string') return undefined;
  if (/phone$/.test(value)) return 'phone';
  if (/operator$/.test(value)) return 'operator';
  if (/name$/.test(value)) return 'name';
  if (/amount(\.amount)?$/.test(value)) return 'amount';
  return undefined;
}

const amountOf = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : typeof value === 'object' && value !== null && 'amount' in value
      ? amountOf((value as { amount: unknown }).amount)
      : undefined;

/** Traduit un refus de la gateway ; le message de la gateway (déjà en français) sert pour les autres codes. */
export function describeWithdrawalError(error: unknown): WithdrawalErrorView {
  if (!(error instanceof ApiError)) return { message: t.genericError, kind: 'other' };
  const { code, details, status } = error;
  if (code === 'WALLET_INSUFFICIENT_FUNDS') {
    const missing = amountOf(details.missing);
    return {
      message: missing === undefined ? t.insufficientUnknown : t.insufficient(formatXof(missing)),
      kind: 'insufficient',
    };
  }
  if (code === 'WALLET_VALIDATION_FAILED' || code === 'GATEWAY_VALIDATION_FAILED') {
    const fields = Array.isArray(details.fields) ? (details.fields as Array<{ field?: unknown }>) : [];
    const field = fieldOf(details.field) ?? fields.map((item) => fieldOf(item.field)).find(Boolean);
    if (field) return { message: error.message, kind: 'field', field };
  }
  if (code === 'WALLET_IDEMPOTENCY_KEY_REUSED') return { message: t.keyReused, kind: 'newKey' };
  if (code === 'AUTH_FORBIDDEN' || status === 403) return { message: t.adminOnly, kind: 'forbidden' };
  if (status === 409 && code.endsWith('_CONCURRENT_UPDATE')) return { message: t.concurrent, kind: 'retry' };
  if (status === 429) return { message: t.tooMany, kind: 'retry' };
  if (status === 0 || status >= 500) return { message: error.message, kind: 'retry' };
  return {
    message: error.correlationId ? t.reference(error.message, error.correlationId) : error.message,
    kind: 'other',
  };
}

/**
 * Clé d'idempotence par saisie : un renvoi du même contenu (coupure, double clic, « Confirmer » de
 * nouveau) reprend la même clé, et la gateway ne crée qu'un retrait ; une saisie modifiée reçoit une
 * clé neuve. `done()` après un envoi réussi ou une clé refusée.
 */
export function withdrawalKeys(create: () => string = () => crypto.randomUUID()) {
  let last: { key: string; payload: string } | null = null;
  return {
    keyFor(input: WithdrawalInput): string {
      const payload = JSON.stringify(input);
      if (!last || last.payload !== payload) last = { key: create(), payload };
      return last.key;
    },
    done() {
      last = null;
    },
  };
}
