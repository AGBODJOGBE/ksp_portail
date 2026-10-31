import { ApiError } from '@/lib/api';
import { cleaningTexts } from './texts';

/** Conséquence d'une erreur pour l'écran, en plus du message. */
export type CleaningErrorKind =
  /** Nom absent du profil : « Compléter mon profil » avant d'envoyer. */
  | 'profile'
  /** Devis expiré : la demande est relue, l'acceptation n'est plus proposée. */
  | 'expired'
  /** Modification concurrente (409) ou transition refusée : la demande est relue. */
  | 'stale'
  /** Créneaux refusés (délai trop court, créneau invalide) : le message va aux créneaux. */
  | 'slots'
  /** Commune hors des zones desservies (`CLEANING_ZONE_NOT_COVERED`) : le message va à la commune. */
  | 'zone'
  /**
   * Contexte actif sur un compte entreprise suspendu par KSP (`CLEANING_ORGANIZATION_SUSPENDED`, 422,
   * ADR-030) : ni nouvelle demande ni acceptation de devis jusqu'à sa réactivation.
   */
  | 'organizationSuspended'
  /** Trop de demandes en cours (`CLEANING_TOO_MANY_OPEN_REQUESTS`) : renvoi vers « Mes prestations ». */
  | 'tooManyOpen'
  /**
   * Champ refusé par le service (`CLEANING_VALIDATION_FAILED`, `details.field`) : le message va au champ
   * nommé (`field`, nom du contrat : `address`, `commune`, `recurrence`, `paymentPlan`…).
   */
  | 'field'
  | 'notFound'
  | 'other';

export interface CleaningErrorView {
  message: string;
  kind: CleaningErrorKind;
  /** Champ du contrat en cause (`kind: 'field'`), sans indice de tableau (`preferredSlots[0].start` → `preferredSlots`). */
  field?: string;
}

const SLOT_CODES = new Set(['CLEANING_SLOT_INVALID', 'CLEANING_LEAD_TIME_TOO_SHORT']);
const NOT_FOUND = new Set(['CLEANING_REQUEST_NOT_FOUND', 'CLEANING_MISSION_NOT_FOUND']);

/**
 * Traduit une erreur de la gateway pour les écrans du Nettoyage. Le message vient de la réponse
 * (`message`, déjà en français) ; le code (`CLEANING_*`, `IDENTITY_*`) décide du traitement.
 */
export function describeCleaningError(error: unknown): CleaningErrorView {
  const t = cleaningTexts;
  if (!(error instanceof ApiError)) return { message: t.common.genericError, kind: 'other' };
  const { code, message, status } = error;

  if (code === 'IDENTITY_PROFILE_INCOMPLETE') return { message, kind: 'profile' };
  if (code === 'CLEANING_QUOTE_EXPIRED') return { message, kind: 'expired' };
  if (SLOT_CODES.has(code)) return { message, kind: 'slots' };
  if (code === 'CLEANING_ZONE_NOT_COVERED') return { message, kind: 'zone' };
  if (code === 'CLEANING_ORGANIZATION_SUSPENDED') return { message, kind: 'organizationSuspended' };
  if (code === 'CLEANING_TOO_MANY_OPEN_REQUESTS') return { message, kind: 'tooManyOpen' };
  const field = error.details['field'];
  if (code === 'CLEANING_VALIDATION_FAILED' && typeof field === 'string') {
    return { message, kind: 'field', field: field.replace(/[[.].*$/, '') };
  }
  if (NOT_FOUND.has(code) || (status === 404 && code !== 'CLEANING_SERVICE_NOT_FOUND')) {
    return { message: t.common.notFound, kind: 'notFound' };
  }
  if (status === 409 || code === 'CLEANING_INVALID_TRANSITION') {
    return { message: `${message} ${t.requestDetail.conflict}`, kind: 'stale' };
  }
  return { message, kind: 'other' };
}
