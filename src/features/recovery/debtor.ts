import { ApiError } from '@/lib/api/errors';
import { isBackendPending } from '@/lib/api/pending';
import { beninDate, beninSlot, formatTime, isPast } from '@/lib/format';
import type { DebtorCase, DebtorSettlement } from './debtor-schemas';
import { debtorTexts as t } from './debtor-texts';

/*
 * Espace du débiteur sans compte (ADR-061) : logique sans React de la page `/recouvrement/[token]`.
 * Contrôles de forme seulement (la gateway et recovery restent juges) et lecture des refus.
 */

/** Jeton du lien ou de la session : 43 caractères base64url (contrat, `DebtorLinkToken`). */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Un autre jeton est introuvable, sans appel (la gateway répondrait 404 sans distinction). */
export function isDebtorLinkToken(token: string): boolean {
  return TOKEN.test(token);
}

/** Code d'accès : 6 chiffres (contrat, `RecoveryDebtorCodeRequest.code`). */
export function cleanDebtorCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function isDebtorCodeComplete(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Montant saisi en francs CFA (« 50 000 », « 50.000 ») : entier positif, ou null. Aucun calcul : le
 * plafond (montant dû) est rappelé par l'écran et contrôlé par recovery.
 */
export function parseAmount(value: string): number | null {
  const digits = value.replace(/[\s.  ]/g, '');
  if (!/^\d{1,12}$/.test(digits)) return null;
  const amount = Number(digits);
  return amount > 0 ? amount : null;
}

/** Adresse ouverte dans un nouvel onglet (page de paiement, document) : http(s) seulement. */
export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Remise encore payable : proposée ou acceptée par le créancier, non échue (miroir de recovery, qui
 * reste juge et refuse une remise échue).
 */
export function payableOffer(debtorCase: DebtorCase, now: Date = new Date()): DebtorSettlement | null {
  const offer = debtorCase.settlementOffer;
  if (!offer || !['proposed', 'accepted'].includes(offer.status) || isPast(offer.validUntil, now))
    return null;
  return offer;
}

/* ——— Refus ——— */

export type DebtorErrorKind =
  /** Lien inconnu, expiré, renouvelé ou dossier clos (404, sans distinction). */
  | 'linkInvalid'
  /** Session absente, expirée ou fermée (401) : retour au code. */
  | 'session'
  /** Code faux, essais restants : sous le champ. */
  | 'code'
  /** Plus de code valable : en demander un nouveau. */
  | 'codeExpired'
  /** Cinq codes faux : accès bloqué (`retryAfterSeconds`, une heure). */
  | 'locked'
  /** Limite de débit (code trop tôt, trop de requêtes) : attendre `retryAfterSeconds`. */
  | 'wait'
  /** Route au contrat, pas encore servie (501) : section « Bientôt disponible ». */
  | 'pending'
  /** Service injoignable ou coupure : réessayer. */
  | 'unavailable'
  /** Dossier suspendu par une contestation. */
  | 'suspended'
  /** Montant refusé (`details.due`). */
  | 'amount'
  /** Dossier changé entre-temps : la situation est relue. */
  | 'stale'
  /** Champ refusé par la gateway ou recovery (`details.field`). */
  | 'fields'
  /** Clé d'idempotence déjà utilisée pour un autre contenu : une clé neuve est tirée. */
  | 'newKey'
  | 'other';

export interface DebtorErrorView {
  message: string;
  kind: DebtorErrorKind;
  /** Code de la gateway (`RECOVERY_DEBTOR_CODE_TOO_SOON`…), vide hors réponse de la gateway. */
  code: string;
  retryAfterSeconds?: number;
  attemptsLeft?: number | null;
  /** Montant dû rappelé par recovery (`RECOVERY_PAYMENT_AMOUNT_INVALID`). */
  due?: number;
  /** Champ en cause (`terms`, `amount`, `preferredFrom`, `fileIds`…), première partie du chemin. */
  field?: string;
  correlationId?: string;
}

function positiveSeconds(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 ? Math.ceil(value) : undefined;
}

function fieldOf(details: Record<string, unknown>): string | undefined {
  if (typeof details.field === 'string') return details.field.split(/[.[/]/).filter(Boolean)[0];
  const fields = details.fields;
  if (Array.isArray(fields)) {
    const first = fields[0] as { field?: unknown } | undefined;
    if (typeof first?.field === 'string') return first.field.split(/[.[/]/).filter(Boolean)[0];
  }
  return undefined;
}

/** Refus de la gateway ou de recovery : message en français et conduite à tenir. */
export function describeDebtorError(error: unknown, now: Date = new Date()): DebtorErrorView {
  return { ...readError(error, now), code: error instanceof ApiError ? error.code : '' };
}

function readError(error: unknown, now: Date): Omit<DebtorErrorView, 'code'> {
  if (!(error instanceof ApiError)) return { message: t.genericError, kind: 'other' };
  const correlationId = error.correlationId;
  if (isBackendPending(error)) return { message: error.message, kind: 'pending', correlationId };
  const retryAfterSeconds = positiveSeconds(error.details.retryAfterSeconds);
  switch (error.code) {
    case 'RECOVERY_DEBTOR_LINK_INVALID':
      return { message: t.invalidText, kind: 'linkInvalid' };
    case 'RECOVERY_DEBTOR_SESSION_INVALID':
      return { message: t.sessionExpired, kind: 'session' };
    case 'RECOVERY_DEBTOR_CODE_INVALID': {
      const left = error.details.attemptsLeft;
      const attemptsLeft = typeof left === 'number' ? left : null;
      return { message: t.codeInvalid(attemptsLeft), kind: 'code', attemptsLeft };
    }
    case 'RECOVERY_DEBTOR_CODE_EXPIRED':
      return { message: t.codeExpired, kind: 'codeExpired' };
    case 'RECOVERY_DEBTOR_LOCKED': {
      const until = new Date(now.getTime() + (retryAfterSeconds ?? 3600) * 1000).toISOString();
      return { message: t.lockedText(formatTime(until)), kind: 'locked', retryAfterSeconds };
    }
    case 'RECOVERY_DEBTOR_CODE_TOO_SOON':
      // Code d'accès ou lien de signature demandé trop tôt : message de recovery, et le délai.
      return { message: error.message, kind: 'wait', retryAfterSeconds };
    case 'RECOVERY_CASE_SUSPENDED':
      return { message: error.message, kind: 'suspended', correlationId };
    case 'RECOVERY_PAYMENT_AMOUNT_INVALID': {
      const due = (error.details.due as { amount?: unknown } | undefined)?.amount;
      return {
        message: error.message,
        kind: 'amount',
        ...(typeof due === 'number' ? { due } : {}),
        field: 'amount',
      };
    }
    case 'RECOVERY_INVALID_TRANSITION':
      return { message: error.message, kind: 'stale', correlationId };
    case 'RECOVERY_IDEMPOTENCY_KEY_REUSED':
      return { message: t.genericError, kind: 'newKey', correlationId };
    case 'RECOVERY_VALIDATION_FAILED':
    case 'GATEWAY_VALIDATION_FAILED':
      return { message: error.message, kind: 'fields', field: fieldOf(error.details), correlationId };
  }
  // Un autre 404 (échéancier, document) : message de recovery.
  if (error.status === 401) return { message: t.sessionExpired, kind: 'session' };
  if (error.status === 429) {
    return {
      message: retryAfterSeconds ? t.rateLimited(retryAfterSeconds) : t.rateLimitedShort,
      kind: 'wait',
      retryAfterSeconds,
    };
  }
  if (error.status === 0) return { message: error.message, kind: 'unavailable' };
  if (error.status >= 500) return { message: t.unavailable, kind: 'unavailable', correlationId };
  return { message: error.message, kind: 'other', correlationId };
}

/* ——— Rappel ——— */

/**
 * Plages de contact par défaut de recovery (miroir des réglages, ADR-061 : lundi au samedi, 8 h – 19 h,
 * heure du Bénin, 30 jours au plus) ; recovery reste juge et refuse un créneau hors plage.
 * Découpage en créneaux de deux heures : choix du portail (**à valider**).
 */
export const CALLBACK_SLOTS: ReadonlyArray<readonly [string, string]> = [
  ['08:00', '10:00'],
  ['10:00', '12:00'],
  ['12:00', '14:00'],
  ['14:00', '16:00'],
  ['16:00', '18:00'],
  ['18:00', '19:00'],
];
const CALLBACK_HORIZON_DAYS = 30;

/** Jour de la semaine d'une date du Bénin (`AAAA-MM-JJ`) : 0 = dimanche. */
export function beninWeekday(date: string): number {
  return new Date(`${date}T12:00:00+01:00`).getUTCDay();
}

/** Créneaux encore à venir d'une journée. */
export function openSlots(date: string, now: Date = new Date()): ReadonlyArray<readonly [string, string]> {
  return CALLBACK_SLOTS.filter(([from, to]) => new Date(beninSlot(date, from, to).start) > now);
}

/** Jours proposés : du jour même aux 29 suivants, sans les dimanches ni un jour sans créneau à venir. */
export function callbackDays(now: Date = new Date()): string[] {
  const days: string[] = [];
  for (let offset = 0; offset < CALLBACK_HORIZON_DAYS; offset += 1) {
    const date = beninDate(now, offset);
    if (beninWeekday(date) === 0) continue;
    if (offset === 0 && openSlots(date, now).length === 0) continue;
    days.push(date);
  }
  return days;
}

/** Créneau envoyé à recovery, en ISO 8601 UTC. */
export function callbackBody(date: string, slot: readonly [string, string], message: string) {
  const { start, end } = beninSlot(date, slot[0], slot[1]);
  const trimmed = message.trim();
  return { preferredFrom: start, preferredTo: end, ...(trimmed ? { message: trimmed } : {}) };
}

/** Une date du Bénin à midi, pour l'afficher (`formatDate`). */
export const beninNoon = (date: string) => `${date}T12:00:00+01:00`;
