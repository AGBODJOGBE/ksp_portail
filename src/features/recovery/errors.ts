import { ApiError } from '@/lib/api';

/*
 * Erreurs de la gateway pour les écrans du Recouvrement. Le message vient de la réponse (déjà en
 * français) ; le code décide du traitement. Les deux formes de 400 sont rattachées aux champs :
 * - `GATEWAY_VALIDATION_FAILED` : `details.fields[] = { field, reason }` (contrôle du corps par la gateway) ;
 * - `RECOVERY_VALIDATION_FAILED` : `details.field` (contrôle du service : `debtors[0].lastName`,
 *   `claims[1].dueDate`, `evidenceFileIds`…), message propre au champ.
 * Les chemins sont ramenés à la forme pointée (`debtors.0.lastName`).
 */

export type RecoveryErrorKind =
  /** Membre lecteur de l'organisation active (`AUTH_FORBIDDEN`) : consultation seulement. */
  | 'forbidden'
  | 'notFound'
  /** Champs refusés : messages près des champs (`fields`). */
  | 'fields'
  /** Montant dû sous le minimum (`RECOVERY_AMOUNT_BELOW_MINIMUM`, `details.minimum`). */
  | 'belowMinimum'
  /** Aucune règle tarifaire publiée (`RECOVERY_PRICING_RULE_INVALID`) : réessayer plus tard. */
  | 'pricingUnavailable'
  /** Dossiers semblables à confirmer avant le mandat (`details.duplicates`). */
  | 'duplicates'
  /** Dossier changé entre-temps (transition refusée) : la fiche est relue. */
  | 'stale'
  /** Clé d'idempotence déjà utilisée pour un autre contenu : une clé neuve est tirée. */
  | 'newKey'
  /** Trop d'appels (429). */
  | 'rateLimited'
  /** Service injoignable (503, coupure) : réessayer. */
  | 'unavailable'
  | 'other';

export interface RecoveryErrorView {
  message: string;
  kind: RecoveryErrorKind;
  code: string;
  /** Message par champ, sous son chemin pointé (`debtors.0.phones.1`, `claims.0.amount`). */
  fields: Record<string, string>;
  /** Montant minimum d'un dossier (`details.minimum`), en FCFA. */
  minimum: number | null;
  /** Numéros des dossiers semblables (`details.duplicates`). */
  duplicates: string[];
  correlationId: string | null;
}

const GENERIC = 'Une erreur est survenue. Réessayez dans quelques instants.';

/** Message affiché quand aucun tarif n'est publié (décision Q14). */
export const PRICING_UNAVAILABLE = 'Tarif en cours de publication : réessayez plus tard.';

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

const NOT_FOUND_CODES = new Set([
  'RECOVERY_CASE_NOT_FOUND',
  'RECOVERY_IMPORT_NOT_FOUND',
  'RECOVERY_DECISION_NOT_FOUND',
]);
/** Objet changé entre-temps : la décision déjà prise ou expirée (`RECOVERY_DECISION_CLOSED`) comprise. */
const STALE_CODES = new Set([
  'RECOVERY_INVALID_TRANSITION',
  'RECOVERY_MANDATE_NOT_SIGNED',
  'RECOVERY_DECISION_CLOSED',
]);

/** `debtors[0].phones[1]` → `debtors.0.phones.1` ; `/input/debtors/0` (gateway) → `debtors.0`. */
export function normalizeField(field: string): string {
  return field
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\/+/, '')
    .replace(/\//g, '.')
    .replace(/^input\./, '');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function fieldErrors(error: ApiError): Record<string, string> {
  const fields: Record<string, string> = {};
  if (error.code === 'GATEWAY_VALIDATION_FAILED' && Array.isArray(error.details['fields'])) {
    for (const item of error.details['fields']) {
      const entry = asRecord(item);
      const field = typeof entry?.['field'] === 'string' ? normalizeField(entry['field']) : null;
      if (!field) continue;
      const reason = typeof entry?.['reason'] === 'string' ? entry['reason'] : '';
      fields[field] ??= GATEWAY_REASONS[reason] ?? error.message;
    }
  }
  const field = error.details['field'];
  if (error.code === 'RECOVERY_VALIDATION_FAILED' && typeof field === 'string') {
    fields[normalizeField(field)] = error.message;
  }
  return fields;
}

const amountOf = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  const record = asRecord(value);
  return record && typeof record['amount'] === 'number' ? record['amount'] : null;
};

export function describeRecoveryError(error: unknown): RecoveryErrorView {
  const empty = { fields: {}, minimum: null, duplicates: [] as string[] };
  if (!(error instanceof ApiError)) {
    return { message: GENERIC, kind: 'other', code: 'UNKNOWN', correlationId: null, ...empty };
  }
  const base = { message: error.message, code: error.code, correlationId: error.correlationId ?? null };
  if (error.code === 'RECOVERY_PRICING_RULE_INVALID') {
    return { ...base, ...empty, message: PRICING_UNAVAILABLE, kind: 'pricingUnavailable' };
  }
  if (error.code === 'RECOVERY_AMOUNT_BELOW_MINIMUM') {
    return { ...base, ...empty, kind: 'belowMinimum', minimum: amountOf(error.details['minimum']) };
  }
  const duplicates = error.details['duplicates'];
  if (error.code === 'RECOVERY_VALIDATION_FAILED' && Array.isArray(duplicates)) {
    return {
      ...base,
      ...empty,
      kind: 'duplicates',
      duplicates: duplicates.filter((item): item is string => typeof item === 'string'),
    };
  }
  // Paiement déclaré au-delà du reste dû (`details.due`) : message propre au champ du montant.
  if (error.code === 'RECOVERY_PAYMENT_AMOUNT_INVALID') {
    return { ...base, ...empty, kind: 'fields', fields: { amount: error.message } };
  }
  if (error.code === 'RECOVERY_IDEMPOTENCY_KEY_REUSED') return { ...base, ...empty, kind: 'newKey' };
  if (error.status === 429) return { ...base, ...empty, kind: 'rateLimited' };
  if (error.code === 'AUTH_FORBIDDEN' || error.status === 403)
    return { ...base, ...empty, kind: 'forbidden' };
  if (error.status === 400) {
    const fields = fieldErrors(error);
    if (Object.keys(fields).length) return { ...base, ...empty, kind: 'fields', fields };
  }
  if (NOT_FOUND_CODES.has(error.code) || error.status === 404) return { ...base, ...empty, kind: 'notFound' };
  if (STALE_CODES.has(error.code) || error.status === 409) return { ...base, ...empty, kind: 'stale' };
  if (error.status === 0 || error.status >= 500) return { ...base, ...empty, kind: 'unavailable' };
  return { ...base, ...empty, kind: 'other' };
}

/** Message affichable, avec la référence à donner au support quand elle aide. */
export function errorWithReference(view: RecoveryErrorView): string {
  return view.correlationId && (view.kind === 'other' || view.kind === 'unavailable')
    ? `${view.message} (référence : ${view.correlationId})`
    : view.message;
}
