import type { ServedZone } from './schemas';

/*
 * Zones desservies : la liste vient de la gateway (`GET /api/v1/cleaning/zones`), lue par le serveur
 * pour les pages publiques, ou par le navigateur si le serveur n'a pas pu la lire. La gateway reste seule
 * juge : `covered` dans la simulation, `CLEANING_ZONE_NOT_COVERED` à la demande de devis.
 */

/** Route publique des zones desservies (lue par le serveur et, à défaut, par le navigateur). */
export const ZONES_PATH = '/api/v1/cleaning/zones';

/** Valeur du choix « Autre commune » : hors zone d'intervention. */
export const OTHER_COMMUNE = 'other';

/**
 * Zone choisie : le nom de commune renvoyé par la gateway (ou sa clé), tel quel. Aucune normalisation
 * ici : les choix proposés au client sont ceux de la liste.
 */
export function zoneFor(
  zones: ReadonlyArray<ServedZone>,
  commune: string | null | undefined,
): ServedZone | null {
  if (!commune) return null;
  return zones.find((zone) => zone.commune === commune || zone.code === commune) ?? null;
}

const list = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' });

/** « Cotonou, Porto-Novo et Abomey-Calavi », dans l'ordre de la gateway ; `null` sans aucune zone. */
export function zonesSentence(zones: ReadonlyArray<ServedZone>): string | null {
  return zones.length ? list.format(zones.map((zone) => zone.commune)) : null;
}
