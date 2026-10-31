import { publicEnv } from '@/config/env';
import { type ApiClient, createApiClient } from './client';
import { session } from './session';

export { ApiError } from './errors';
export type { ApiClient, RequestOptions } from './client';
export {
  contextKey,
  session,
  useSession,
  type ActiveContext,
  type RestoreResult,
  type Session,
  type SessionUser,
} from './session';
export { activeContextSchema, sessionSchema, sessionUserSchema } from './session-schema';
export { parseResponse } from './validate';

/** Client à utiliser dans les composants du navigateur (jeton d'accès de la session, cookies inclus). */
export const api: ApiClient = createApiClient({
  baseUrl: publicEnv.apiUrl,
  withCredentials: true,
  getAccessToken: () => session.getAccessToken(),
  refreshSession: () => session.refresh(),
});

// Client du serveur : aussi importable seul (`@/lib/api/server`) par un composant serveur, sans la
// session du navigateur (hook React) que ce module charge.
export { serverApi } from './server';
