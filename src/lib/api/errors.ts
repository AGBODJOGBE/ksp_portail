/**
 * Erreur renvoyée par la gateway, au format commun de l'écosystème :
 *   { "error": { "code", "message", "details", "correlationId" } }
 * Le message est en français et peut être affiché tel quel ; le code sert aux décisions du front.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Erreur réseau : la gateway n'a pas pu être jointe (connexion coupée, délai dépassé). */
  static network(correlationId?: string): ApiError {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Connexion impossible. Vérifiez votre connexion internet et réessayez.',
      {},
      correlationId,
    );
  }

  /** Réponse de la gateway qui ne respecte pas le contrat (schéma zod refusé). */
  static invalidResponse(correlationId?: string): ApiError {
    return new ApiError(
      502,
      'INVALID_RESPONSE',
      'Réponse inattendue du serveur. Réessayez dans quelques instants.',
      {},
      correlationId,
    );
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

interface ErrorBody {
  error?: { code?: unknown; message?: unknown; details?: unknown; correlationId?: unknown };
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'La demande est invalide.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Vous n'avez pas accès à cette action.",
  404: 'Élément introuvable.',
  409: 'Cette action entre en conflit avec une autre.',
  422: "Cette action n'est pas possible pour le moment.",
  429: 'Trop de tentatives. Patientez avant de réessayer.',
  503: 'Service momentanément indisponible. Réessayez dans quelques instants.',
};

/**
 * Erreur de la gateway. Sur un 429, `retryAfter` (en-tête `Retry-After`) complète
 * `details.retryAfterSeconds` quand le corps ne le donne pas : les écrans ne lisent que ce détail.
 */
export function apiErrorFromResponse(
  status: number,
  body: unknown,
  correlationId?: string,
  retryAfter?: string | null,
): ApiError {
  const error = (body as ErrorBody | null)?.error;
  const code = typeof error?.code === 'string' ? error.code : `HTTP_${status}`;
  const message =
    typeof error?.message === 'string'
      ? error.message
      : (DEFAULT_MESSAGES[status] ?? 'Une erreur est survenue. Réessayez plus tard.');
  const details: Record<string, unknown> =
    error?.details && typeof error.details === 'object'
      ? { ...(error.details as Record<string, unknown>) }
      : {};
  // `Retry-After` en secondes entières ; une date HTTP ou une valeur illisible est ignorée.
  const delay = Number(retryAfter);
  if (status === 429 && Number.isInteger(delay) && delay > 0 && typeof details.retryAfterSeconds !== 'number')
    details.retryAfterSeconds = delay;
  const id = typeof error?.correlationId === 'string' ? error.correlationId : correlationId;
  return new ApiError(status, code, message, details, id);
}
