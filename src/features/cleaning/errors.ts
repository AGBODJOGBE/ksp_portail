import { ApiError } from '@/lib/api';

/*
 * Erreurs de la gateway pour les écrans du Nettoyage. Le message vient de la réponse (déjà en français) ;
 * le code décide du traitement. Les deux formes de 400 sont rattachées aux champs :
 * - `GATEWAY_VALIDATION_FAILED` : `details.fields[] = { field, reason }` (contrôle du corps par la
 *   gateway, raisons de zod, jamais la valeur envoyée) ;
 * - `CLEANING_VALIDATION_FAILED` : `details.field` et `details.reason` (contrôle du service, message
 *   déjà propre au champ).
 * `CLEANING_SLOT_INVALID` (`details.reason` : malformed, too_many, in_past) va aux créneaux de visite.
 */

export type CleaningErrorKind =
  /** Membre lecteur de l'organisation active (`AUTH_FORBIDDEN`) : actions masquées. */
  | 'forbidden'
  | 'notFound'
  /** Nom absent du profil (`IDENTITY_PROFILE_INCOMPLETE`) : « Compléter mon profil ». */
  | 'profile'
  /** Trop d'appels (429) : nouvel essai après le délai. */
  | 'rateLimited'
  /** Solde du portefeuille insuffisant : Mobile Money, ou recharge. */
  | 'insufficientBalance'
  /** État changé entre-temps (transition refusée, conflit) : la fiche est relue. */
  | 'stale'
  /** Champs refusés : messages près des champs (`fields`). */
  | 'fields'
  /** Service de localisation indisponible (`CLEANING_GEO_UNAVAILABLE`). */
  | 'geo'
  | 'other';

export interface CleaningErrorView {
  message: string;
  kind: CleaningErrorKind;
  code: string;
  /** Message par champ, sous son chemin du contrat (`values.surface`, `visitSlots.0.start`, `landmark`). */
  fields: Record<string, string>;
  /** 429 : secondes avant un nouvel essai, quand la gateway les donne. */
  retryAfterSeconds: number | null;
  correlationId: string | null;
}

const GENERIC = 'Une erreur est survenue. Réessayez dans quelques instants.';

/** Raisons de la gateway (codes de zod) → message près du champ. */
const GATEWAY_REASONS: Record<string, string> = {
  too_small: 'Cette valeur est trop petite ou ce champ est vide.',
  too_big: 'Cette valeur est trop grande ou ce texte trop long.',
  invalid_type: 'Ce champ est obligatoire ou n’a pas le bon format.',
  invalid_format: 'Ce champ n’a pas le bon format.',
  invalid_value: 'Cette valeur n’est pas acceptée.',
  invalid_union: 'Cette valeur n’est pas acceptée.',
  not_multiple_of: 'Cette valeur doit être un nombre entier.',
  unknown_field: 'Ce champ n’est pas attendu.',
};

/** Créneau de visite refusé (`CLEANING_SLOT_INVALID`, `details.reason`). */
const SLOT_FIELD = 'visitSlots';

const NOT_FOUND_CODES = new Set([
  'CLEANING_REQUEST_NOT_FOUND',
  'CLEANING_QUOTE_NOT_FOUND',
  'CLEANING_PLACE_NOT_FOUND',
  'CLEANING_PROGRAM_NOT_FOUND',
]);

const STALE_CODES = new Set([
  'CLEANING_INVALID_TRANSITION',
  'CLEANING_NOTHING_TO_PAY',
  'CLEANING_CONCURRENT_UPDATE',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Messages par champ d'une erreur 400 (les deux formes du contrat). */
export function fieldErrors(error: ApiError): Record<string, string> {
  const fields: Record<string, string> = {};
  if (error.code === 'GATEWAY_VALIDATION_FAILED' && Array.isArray(error.details['fields'])) {
    for (const item of error.details['fields']) {
      const entry = asRecord(item);
      const field = typeof entry?.['field'] === 'string' ? entry['field'] : null;
      if (!field) continue;
      const reason = typeof entry?.['reason'] === 'string' ? entry['reason'] : '';
      fields[field] ??= GATEWAY_REASONS[reason] ?? error.message;
    }
  }
  const field = error.details['field'];
  if (error.code === 'CLEANING_VALIDATION_FAILED' && typeof field === 'string') fields[field] = error.message;
  if (error.code === 'CLEANING_SLOT_INVALID') fields[SLOT_FIELD] = error.message;
  return fields;
}

/** Premier message dont le chemin commence par l'un des préfixes (`values`, `schedule`…). */
export function fieldMessage(fields: Record<string, string>, ...prefixes: string[]): string | null {
  for (const [path, message] of Object.entries(fields)) {
    if (
      prefixes.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`),
      )
    ) {
      return message;
    }
  }
  return null;
}

export function describeCleaningError(error: unknown): CleaningErrorView {
  if (!(error instanceof ApiError)) {
    return {
      message: GENERIC,
      kind: 'other',
      code: 'UNKNOWN',
      fields: {},
      retryAfterSeconds: null,
      correlationId: null,
    };
  }
  const base = {
    message: error.message,
    code: error.code,
    fields: {} as Record<string, string>,
    retryAfterSeconds: null as number | null,
    correlationId: error.correlationId ?? null,
  };
  if (error.status === 429) {
    const seconds = error.details['retryAfterSeconds'];
    return {
      ...base,
      kind: 'rateLimited',
      retryAfterSeconds: typeof seconds === 'number' && seconds > 0 ? Math.ceil(seconds) : null,
    };
  }
  if (error.code === 'AUTH_FORBIDDEN' || error.status === 403) return { ...base, kind: 'forbidden' };
  if (error.code === 'IDENTITY_PROFILE_INCOMPLETE') return { ...base, kind: 'profile' };
  if (error.code === 'CLEANING_INSUFFICIENT_BALANCE') return { ...base, kind: 'insufficientBalance' };
  if (error.code === 'CLEANING_GEO_UNAVAILABLE') return { ...base, kind: 'geo' };
  if (error.status === 400) {
    const fields = fieldErrors(error);
    if (Object.keys(fields).length) return { ...base, kind: 'fields', fields };
  }
  if (NOT_FOUND_CODES.has(error.code)) return { ...base, kind: 'notFound' };
  if (STALE_CODES.has(error.code) || error.status === 409) return { ...base, kind: 'stale' };
  return { ...base, kind: 'other' };
}

/** Message d'erreur affichable, avec la référence à donner au support quand il y en a une. */
export function errorWithReference(view: CleaningErrorView): string {
  return view.correlationId && view.kind === 'other'
    ? `${view.message} (référence : ${view.correlationId})`
    : view.message;
}
