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
  | 'notFound'
  | 'other';

export interface CleaningErrorView {
  message: string;
  kind: CleaningErrorKind;
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
  if (NOT_FOUND.has(code) || (status === 404 && code !== 'CLEANING_SERVICE_NOT_FOUND')) {
    return { message: t.common.notFound, kind: 'notFound' };
  }
  if (status === 409 || code === 'CLEANING_INVALID_TRANSITION') {
    return { message: `${message} ${t.requestDetail.conflict}`, kind: 'stale' };
  }
  return { message, kind: 'other' };
}
