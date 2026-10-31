import { parseResponse, serverApi } from '@/lib/api/server';
import { ZONES_PATH } from './zones';
import { type ServedZone, servedZoneListSchema } from './schemas';

/*
 * Lectures côté serveur du Nettoyage (pages publiques statiques, revalidées). Données publiques
 * seulement : rien de personnel n'entre dans le cache partagé de Next.
 */

/**
 * Durée de validité des zones desservies dans le cache de Next : une heure (à valider). L'étiquette
 * permettra une revalidation à la demande quand le back-office saura la déclencher.
 */
export const ZONES_REVALIDATE_SECONDS = 3600;
export const ZONES_TAG = 'cleaning:zones';

/**
 * Zones desservies (`GET /api/v1/cleaning/zones`) lues pendant la construction de la page, puis
 * revalidées. `null` si la gateway ne répond pas : la page reste construite, et le navigateur relit
 * alors les zones lui-même.
 */
export async function getServedZones(): Promise<ServedZone[] | null> {
  try {
    const body = await serverApi().get(ZONES_PATH, {
      auth: false,
      next: { revalidate: ZONES_REVALIDATE_SECONDS, tags: [ZONES_TAG] },
    });
    return parseResponse(servedZoneListSchema, body).data;
  } catch {
    return null;
  }
}
