/**
 * Gateway simulée pour les tests unitaires de la connexion : `fetch` remplacé, réponses au format du
 * contrat `ksp-api.v1.yaml`. Les requêtes reçues sont gardées pour vérifier ce que le front envoie.
 */

export type FakeResponse = { status: number; body?: unknown };
type Handler = FakeResponse | ((body: unknown) => FakeResponse);

export interface GatewayCall {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

export const USER = {
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
  status: 'active',
  firstName: null as string | null,
  lastName: null as string | null,
  phone: '+2290197000045',
  email: null,
  emailVerified: false,
  preferredLanguage: 'fr',
  createdAt: '2026-10-21T09:00:00Z',
};

export const PERSONAL = { type: 'individual', organizationId: null, organizationName: null };

export function sessionBody(overrides: { profileIncomplete?: boolean; firstName?: string | null } = {}) {
  const profileIncomplete = overrides.profileIncomplete ?? true;
  return {
    status: 'authenticated',
    accessToken: 'jeton-acces',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    refreshTokenExpiresAt: '2099-01-31T00:00:00Z',
    sessionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e10',
    user: {
      ...USER,
      firstName: overrides.firstName ?? (profileIncomplete ? null : 'Koffi'),
      lastName: profileIncomplete ? null : 'Adjovi',
    },
    profileIncomplete,
    activeContext: PERSONAL,
  };
}

export function challengeBody(resendAfterSeconds = 60) {
  return {
    challengeId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e0f',
    maskedTarget: '+229********45',
    channel: 'whatsapp',
    expiresInSeconds: 300,
    resendAfterSeconds,
  };
}

export function errorBody(code: string, message: string, details: Record<string, unknown> = {}) {
  return { error: { code, message, details, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' } };
}

export const NO_SESSION: FakeResponse = {
  status: 401,
  body: errorBody('IDENTITY_REFRESH_TOKEN_INVALID', 'Votre session a expiré, reconnectez-vous.'),
};

/**
 * Remplace `fetch`. `routes` associe « MÉTHODE /chemin » à une réponse, ou à une liste de réponses
 * données dans l'ordre (la dernière est répétée).
 */
export function stubGateway(routes: Record<string, Handler | Handler[]>) {
  const calls: GatewayCall[] = [];
  const queues = new Map(Object.entries(routes).map(([key, value]) => [key, [value].flat()]));

  const fetchMock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({
      method,
      path: url.pathname,
      body,
      headers: { ...(init.headers as Record<string, string>) },
    });

    const queue = queues.get(`${method} ${url.pathname}`);
    if (!queue?.length) throw new Error(`Route non simulée : ${method} ${url.pathname}`);
    const handler = (queue.length > 1 ? queue.shift() : queue[0]) as Handler;
    const response = typeof handler === 'function' ? handler(body) : handler;
    return new Response(response.body === undefined ? null : JSON.stringify(response.body), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': 'c-test' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}
