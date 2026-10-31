import { ApiError } from '@/lib/api';
import { accountTexts } from './texts';

/** Champ des écrans du compte (e-mail, code, demande de compte entreprise) auquel une erreur se rattache. */
export type AccountField = 'email' | 'code' | 'legalName' | 'address' | 'ifu' | 'rccm';

export interface AccountErrorView {
  message: string;
  field?: AccountField;
  /** Délai imposé avant un nouvel envoi de code (limite atteinte). */
  retryAfterSeconds?: number;
  /** Le code n'est plus utilisable (expiré, trop d'essais) : il faut en demander un nouveau. */
  newCodeNeeded?: boolean;
  /** Organisation inconnue, ou l'utilisateur n'en est pas membre. */
  notFound?: boolean;
}

const FIELDS: ReadonlySet<string> = new Set<AccountField>([
  'email',
  'code',
  'legalName',
  'address',
  'ifu',
  'rccm',
]);

const asField = (value: unknown): AccountField | undefined =>
  typeof value === 'string' && FIELDS.has(value) ? (value as AccountField) : undefined;

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Premier champ refusé par la validation de la gateway (`details.fields[].field`). */
function invalidField(details: Record<string, unknown>): AccountField | undefined {
  const fields = Array.isArray(details.fields) ? (details.fields as Array<{ field?: unknown }>) : [];
  return fields.map((item) => asField(item.field)).find(Boolean);
}

/**
 * Traduit une erreur de la gateway pour le profil, l'e-mail et les comptes entreprise. Le message vient
 * de la réponse (`message`, déjà en français) ; le code (`IDENTITY_*`, `GATEWAY_*`) décide du traitement.
 */
export function describeAccountError(error: unknown): AccountErrorView {
  const t = accountTexts;
  if (!(error instanceof ApiError)) return { message: t.common.genericError };
  const { code, message, details } = error;

  switch (code) {
    case 'IDENTITY_EMAIL_INVALID':
    case 'IDENTITY_EMAIL_ALREADY_VERIFIED':
      return { message, field: 'email' };
    case 'IDENTITY_OTP_INVALID': {
      const remaining = nonNegativeInteger(details.attemptsRemaining);
      return {
        message: remaining ? `${message} ${t.email.attemptsRemaining(remaining)}` : message,
        field: 'code',
      };
    }
    case 'IDENTITY_OTP_EXPIRED':
    case 'IDENTITY_OTP_TOO_MANY_ATTEMPTS':
      return { message, field: 'code', newCodeNeeded: true };
    case 'IDENTITY_OTP_RATE_LIMITED':
    case 'GATEWAY_RATE_LIMITED': {
      const retryAfterSeconds = nonNegativeInteger(details.retryAfterSeconds);
      return retryAfterSeconds ? { message, retryAfterSeconds } : { message };
    }
    case 'IDENTITY_ORGANIZATION_INVALID':
      return { message, field: asField(details.field) };
    case 'IDENTITY_ORGANIZATION_ALREADY_EXISTS':
      return { message, field: 'ifu' };
    case 'IDENTITY_ORGANIZATION_NOT_FOUND':
      return { message: t.organization.notFound, notFound: true };
    case 'GATEWAY_VALIDATION_FAILED': {
      // Message générique de la gateway : on précise le champ en cause quand on le connaît.
      const field = invalidField(details);
      if (field === 'email') return { message: t.email.invalid, field };
      if (field === 'code') return { message: t.email.codeInvalid, field };
      return field ? { message, field } : { message };
    }
    default:
      // Organisation non validée ou suspendue, droits insuffisants, envoi impossible, panne : message tel quel.
      return { message };
  }
}
