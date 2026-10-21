import type { Page, Route } from '@playwright/test';

/**
 * Gateway simulée par interception des requêtes du navigateur : routes `/api/v1/identity/*` du contrat
 * `ksp-api.v1.yaml`, en-têtes CORS avec cookies comme la vraie gateway, et état de session côté
 * « serveur » (le cookie de renouvellement n'est pas reproduit : la session vit dans ce simulateur).
 */

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** En-têtes autorisés par la politique CORS de la gateway (services/gateway, enableCors). */
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-App-Version, Idempotency-Key';

export const VALID_CODE = '482913';

export interface GatewayOptions {
  /** Réponse imposée à la demande de code (limite atteinte, panne…). */
  requestOtp?: { status: number; body: unknown };
  /** Session déjà ouverte (cookie de renouvellement valide). */
  signedIn?: boolean;
}

export interface FakeGateway {
  /** En-têtes refusés par la gateway réelle (préfixe `x-` hors `x-app-version`) vus dans les requêtes. */
  forbiddenHeaders: string[];
  calls: Array<{ method: string; path: string; body: unknown }>;
}

const user = (firstName: string | null, lastName: string | null) => ({
  id: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e11',
  status: 'active',
  firstName,
  lastName,
  phone: '+2290197000045',
  email: null,
  preferredLanguage: 'fr',
  createdAt: '2026-10-21T09:00:00Z',
});

const error = (code: string, message: string, details: Record<string, unknown> = {}) => ({
  error: { code, message, details, correlationId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e12' },
});

export async function mockGateway(page: Page, options: GatewayOptions = {}): Promise<FakeGateway> {
  const state = {
    signedIn: options.signedIn ?? false,
    firstName: options.signedIn ? 'Koffi' : (null as string | null),
    lastName: options.signedIn ? 'Adjovi' : (null as string | null),
    attempts: 5,
  };
  const gateway: FakeGateway = { forbiddenHeaders: [], calls: [] };

  const session = () => ({
    status: 'authenticated',
    accessToken: 'jeton-acces-e2e',
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    sessionId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e10',
    user: user(state.firstName, state.lastName),
    profileIncomplete: !state.firstName || !state.lastName,
  });

  await page.route(`${GATEWAY}/api/v1/**`, async (route: Route) => {
    const request = route.request();
    const origin = request.headers().origin ?? 'http://localhost:3010';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'X-Correlation-Id, Retry-After',
      'X-Correlation-Id': '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e13',
    };
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        },
      });
    }

    const path = new URL(request.url()).pathname;
    const body = request.postData()
      ? (JSON.parse(request.postData() ?? '{}') as Record<string, unknown>)
      : undefined;
    gateway.calls.push({ method: request.method(), path, body });
    gateway.forbiddenHeaders.push(
      ...Object.keys(request.headers()).filter((name) => name.startsWith('x-') && name !== 'x-app-version'),
    );
    const reply = (status: number, json: unknown) => route.fulfill({ status, headers: cors, json });
    const authorized = request.headers().authorization === 'Bearer jeton-acces-e2e' && state.signedIn;

    switch (`${request.method()} ${path}`) {
      case 'POST /api/v1/identity/otp/request':
        if (options.requestOtp) return reply(options.requestOtp.status, options.requestOtp.body);
        state.attempts = 5;
        return reply(200, {
          challengeId: '0192f1c4-7a2b-7c3d-8e4f-5a6b7c8d9e0f',
          maskedTarget: '+229********45',
          channel: 'whatsapp',
          expiresInSeconds: 300,
          resendAfterSeconds: 60,
        });
      case 'POST /api/v1/identity/otp/verify':
        if (body?.code !== VALID_CODE) {
          state.attempts -= 1;
          return reply(
            400,
            error('IDENTITY_OTP_INVALID', 'Le code est incorrect.', { attemptsRemaining: state.attempts }),
          );
        }
        state.signedIn = true;
        return reply(200, { ...session(), isNewUser: true });
      case 'POST /api/v1/identity/token/refresh':
        return state.signedIn
          ? reply(200, session())
          : reply(401, error('IDENTITY_REFRESH_TOKEN_INVALID', 'Votre session a expiré, reconnectez-vous.'));
      case 'PATCH /api/v1/identity/me':
        if (!authorized) return reply(401, error('GATEWAY_TOKEN_MISSING', 'Vous devez être connecté.'));
        state.firstName = String(body?.firstName ?? state.firstName);
        state.lastName = String(body?.lastName ?? state.lastName);
        return reply(200, { user: user(state.firstName, state.lastName), profileIncomplete: false });
      case 'POST /api/v1/identity/logout':
        if (!authorized) return reply(401, error('GATEWAY_TOKEN_MISSING', 'Vous devez être connecté.'));
        state.signedIn = false;
        return reply(200, { revokedSessions: 1 });
      default:
        return reply(404, error('GATEWAY_ROUTE_NOT_FOUND', "Cette adresse n'existe pas."));
    }
  });

  return gateway;
}
