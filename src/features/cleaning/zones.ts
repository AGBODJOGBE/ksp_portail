/**
 * Communes proposées dans le simulateur et la demande de devis (zones desservies au lancement). La gateway
 * reste seule juge : `covered` dans la simulation, `CLEANING_ZONE_NOT_COVERED` à la demande. La gateway
 * n'expose pas encore la liste des zones : elle est recopiée ici (à valider).
 */
export const COVERED_COMMUNES = ['Cotonou', 'Porto-Novo', 'Abomey-Calavi'] as const;

/** Valeur du choix « Autre commune » : hors zone d'intervention. */
export const OTHER_COMMUNE = 'other';

/** Clé de comparaison : minuscules, sans accents, tirets à la place des espaces (comme le backend). */
function key(commune: string): string {
  return commune
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/** Commune desservie, sous son nom officiel ; `null` hors zone. */
export function coveredCommune(commune: string | null | undefined): string | null {
  if (!commune) return null;
  return COVERED_COMMUNES.find((item) => key(item) === key(commune)) ?? null;
}
