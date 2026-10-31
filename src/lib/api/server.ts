import { serverApiUrl } from '@/config/env';
import { type ApiClient, createApiClient } from './client';

export { parseResponse } from './validate';

/**
 * Client à utiliser côté serveur (pages publiques rendues par Next.js, contenus du CMS).
 * Sans cookie ni jeton : uniquement les routes publiques de la gateway. Ce module n'importe pas la
 * session du navigateur : un composant serveur peut l'importer (`@/lib/api/server`).
 */
export function serverApi(): ApiClient {
  return createApiClient({ baseUrl: serverApiUrl(), withCredentials: false });
}
