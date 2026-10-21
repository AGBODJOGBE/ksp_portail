import { getDictionary } from '@/i18n';
import { ApiError } from '@/lib/api';

/** Champ du parcours de connexion auquel une erreur se rattache. */
export type LoginField = 'phone' | 'code' | 'firstName' | 'lastName';

/** Erreur prête à afficher : message en français et conséquences pour l'écran. */
export interface ErrorView {
  message: string;
  /** Champ en cause : il reçoit le focus et porte le message. Sinon, message général annoncé. */
  field?: LoginField;
  /** Délai imposé avant une nouvelle demande de code (limite atteinte). */
  retryAfterSeconds?: number;
  /** Le code n'est plus utilisable (expiré, trop d'essais) : il faut en demander un nouveau. */
  newCodeNeeded?: boolean;
}

const FIELDS: ReadonlySet<string> = new Set<LoginField>(['phone', 'code', 'firstName', 'lastName']);

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Premier champ refusé par la validation de la gateway (`details.fields[].field`). */
function invalidField(details: Record<string, unknown>): LoginField | undefined {
  const fields = Array.isArray(details.fields) ? (details.fields as Array<{ field?: unknown }>) : [];
  const field = fields.map((item) => item.field).find((name) => typeof name === 'string' && FIELDS.has(name));
  return field as LoginField | undefined;
}

/**
 * Traduit une erreur de la gateway pour le parcours de connexion. Le message vient de la réponse
 * (`message`, déjà en français) ; le code (`IDENTITY_*`, `GATEWAY_*`) décide du traitement.
 */
export function describeError(error: unknown): ErrorView {
  const t = getDictionary();
  if (!(error instanceof ApiError)) return { message: t.login.genericError };
  const { code, message, details } = error;

  switch (code) {
    case 'IDENTITY_OTP_INVALID': {
      const remaining = positiveInteger(details.attemptsRemaining);
      return {
        message: remaining ? `${message} ${t.login.attemptsRemaining(remaining)}` : message,
        field: 'code',
      };
    }
    case 'IDENTITY_OTP_EXPIRED':
    case 'IDENTITY_OTP_TOO_MANY_ATTEMPTS':
      return { message, field: 'code', newCodeNeeded: true };
    case 'IDENTITY_PHONE_INVALID':
      return { message, field: 'phone' };
    case 'IDENTITY_NAME_INVALID': {
      const field = details.field === 'lastName' ? 'lastName' : 'firstName';
      return { message: `${message} ${t.profile.nameInvalid}`, field };
    }
    case 'GATEWAY_VALIDATION_FAILED': {
      // Message générique de la gateway (« La requête est invalide. ») : on précise le champ en cause.
      const field = invalidField(details);
      if (field === 'phone') return { message: t.login.phoneInvalid, field };
      if (field === 'code') return { message: t.login.codeInvalid, field };
      if (field) return { message: t.profile.nameInvalid, field };
      return { message };
    }
    case 'IDENTITY_OTP_RATE_LIMITED':
    case 'GATEWAY_RATE_LIMITED': {
      const retryAfterSeconds = positiveInteger(details.retryAfterSeconds);
      return retryAfterSeconds ? { message, retryAfterSeconds } : { message };
    }
    default:
      // Envoi impossible, service indisponible, délai dépassé, réseau, compte suspendu… : message tel quel.
      return { message };
  }
}
