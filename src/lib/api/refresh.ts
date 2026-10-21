import { publicEnv } from '@/config/env';
import { type ApiClient, createApiClient } from './client';
import { ApiError } from './errors';
import { type Session, sessionSchema } from './session-schema';
import { parseResponse } from './validate';

/**
 * Route de renouvellement de la gateway (contrat `ksp-api.v1.yaml`, opération `refreshSession`).
 * Côté web, sans corps : le jeton de renouvellement est lu dans le cookie `__Secure-ksp_rt`, limité
 * au chemin `/api/v1/identity/token`.
 */
export const SESSION_REFRESH_PATH = '/api/v1/identity/token/refresh';

/** Statuts qui signifient « pas de session valide » (cookie absent, expiré, révoqué, compte suspendu). */
const NO_SESSION_STATUSES = new Set([400, 401, 403]);

/**
 * Renouvellement de session : nouvelle session, `null` s'il n'y en a pas, exception si la gateway
 * n'a pas pu répondre (réseau, limite d'appels, panne) — l'interface distingue ces cas.
 */
export function createSessionRefresher(client: ApiClient) {
  return async (): Promise<Session | null> => {
    try {
      // auth: false — aucun jeton d'accès, et surtout pas de renouvellement en boucle sur 401.
      const body = await client.post(SESSION_REFRESH_PATH, undefined, { auth: false });
      return parseResponse(sessionSchema, body);
    } catch (error) {
      if (error instanceof ApiError && NO_SESSION_STATUSES.has(error.status)) return null;
      throw error;
    }
  };
}

export const refreshSession = createSessionRefresher(
  createApiClient({ baseUrl: publicEnv.apiUrl, withCredentials: true }),
);
