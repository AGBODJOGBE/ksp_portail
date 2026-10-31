/*
 * Causes d'une suspension de mission (ADR-030), sans zod : `texts.ts`, importé par des pages qui ne
 * valident aucune réponse (accueil de l'espace, simulateur), s'en sert sans télécharger zod.
 */

/** Champs de `CleaningSuspension` utiles ici (voir `schemas.ts`). */
export interface SuspensionCausesInput {
  cause: string;
  causes?: string[] | undefined;
}

/**
 * Causes actives d'une suspension, sans doublon. `causes` est obligatoire au contrat (ADR-030) ; le repli
 * sur `[cause]` ne sert qu'aux textes appelés sans la liste.
 */
export function suspensionCauses(suspension: SuspensionCausesInput): string[] {
  const causes = suspension.causes?.length ? suspension.causes : [suspension.cause];
  return [...new Set(causes)];
}
