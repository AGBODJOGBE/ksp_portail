import { ApiError } from './errors';

/**
 * Route du contrat pas encore servie par le backend : la section affiche « Bientôt disponible » au lieu
 * d'une erreur, et s'active d'elle-même dès que la route est livrée.
 *
 * - 404 `GATEWAY_ROUTE_NOT_FOUND` : la gateway n'expose pas encore la route (liste `NOT_YET_EXPOSED` de
 *   `services/gateway/test/openapi.contract.spec.ts` dans `ksp_back`) ;
 * - 501, ou code `*_NOT_IMPLEMENTED` : la route est exposée, mais le service ne l'a pas encore livrée.
 *
 * Un autre 404 (élément introuvable) n'est pas une route en attente.
 */
export function isBackendPending(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 404) return error.code === 'GATEWAY_ROUTE_NOT_FOUND';
  return error.status === 501 || error.code.endsWith('_NOT_IMPLEMENTED');
}
