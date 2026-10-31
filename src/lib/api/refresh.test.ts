import { createApiClient } from './client';
import { ApiError } from './errors';
import { createSessionRefresher, SESSION_REFRESH_PATH } from './refresh';

const SESSION = {
  status: 'authenticated',
  accessToken: 'jeton',
  accessTokenExpiresAt: '2026-10-21T10:15:00Z',
  refreshTokenExpiresAt: '2026-11-20T10:00:00Z',
  sessionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e10',
  user: {
    id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
    status: 'active',
    firstName: 'Koffi',
    lastName: 'Adjovi',
    phone: '+2290197000045',
    email: null,
    emailVerified: false,
    preferredLanguage: 'fr',
    createdAt: '2026-10-17T10:00:00Z',
  },
  profileIncomplete: false,
  activeContext: { type: 'individual', organizationId: null, organizationName: null },
};

function setup(response: Response | Error) {
  const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    return response;
  });
  const refresh = createSessionRefresher(
    createApiClient({
      baseUrl: 'http://localhost:3000',
      withCredentials: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
  );
  return { refresh, fetchImpl };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('renouvellement de session', () => {
  it('appelle la route du contrat, sans corps, avec le cookie', async () => {
    const { refresh, fetchImpl } = setup(json(200, SESSION));

    await expect(refresh()).resolves.toMatchObject({ accessToken: 'jeton', profileIncomplete: false });

    expect(SESSION_REFRESH_PATH).toBe('/api/v1/identity/token/refresh');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe('http://localhost:3000/api/v1/identity/token/refresh');
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: undefined });
    expect(init?.headers).not.toHaveProperty('Authorization');
  });

  it.each([400, 401, 403])('renvoie « pas de session » sur %i', async (status) => {
    const { refresh } = setup(
      json(status, { error: { code: 'IDENTITY_REFRESH_TOKEN_INVALID', message: 'Expirée.', details: {} } }),
    );
    await expect(refresh()).resolves.toBeNull();
  });

  it('signale une panne plutôt qu’une absence de session', async () => {
    await expect(setup(new TypeError('Failed to fetch')).refresh()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    const { refresh } = setup(
      json(503, { error: { code: 'IDENTITY_UNAVAILABLE', message: 'Indisponible.', details: {} } }),
    );
    await expect(refresh()).rejects.toMatchObject({ status: 503 });
  });

  it('refuse une réponse hors contrat', async () => {
    const error = await setup(json(200, { accessToken: 'jeton' }))
      .refresh()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
