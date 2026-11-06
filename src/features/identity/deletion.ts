import { ApiError } from '@/lib/api';
import type { DeletionObstacle } from './schemas';
import { deletionTexts } from './deletion-texts';
import { accountTexts } from './texts';

/* Suppression du compte (ADR-036), logique sans React : refus de la demande traduit pour l'écran. */

export interface DeletionErrorView {
  message: string;
  /** Obligations en cours, dans l'ordre de la gateway : chacune est affichée avec son explication. */
  obstacles: DeletionObstacle[];
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function obstaclesOf(details: Record<string, unknown>): DeletionObstacle[] {
  const obligations = Array.isArray(details.obligations) ? (details.obligations as unknown[]) : [];
  const listed = obligations.flatMap((item) => {
    const value = (item ?? {}) as Record<string, unknown>;
    return isText(value.kind) && isText(value.description)
      ? [
          {
            service: isText(value.service) ? value.service : '',
            kind: value.kind,
            reference: isText(value.reference) ? value.reference : '',
            description: value.description,
          },
        ]
      : [];
  });
  if (listed.length) return listed;
  // `IDENTITY_DELETION_LAST_ORG_ADMIN` : `details.organizations` (identifiant et raison sociale).
  const organizations = Array.isArray(details.organizations) ? (details.organizations as unknown[]) : [];
  return organizations.flatMap((item) => {
    const legalName = ((item ?? {}) as Record<string, unknown>).legalName;
    return isText(legalName)
      ? [
          {
            service: 'identity',
            kind: 'last_org_admin',
            reference: legalName,
            description: `Vous êtes le seul administrateur du compte entreprise ${legalName} : nommez un autre administrateur ou contactez KSP.`,
          },
        ]
      : [];
  });
}

/**
 * Refus de `POST /identity/me/deletion` : obligations en cours (422, `details.obligations`), seul
 * administrateur d'un compte entreprise (422, `details.organizations`), service injoignable (503 :
 * « réessayez plus tard », jamais d'accord par défaut), compte interne ou suspendu (message tel quel).
 */
export function describeDeletionError(error: unknown): DeletionErrorView {
  if (!(error instanceof ApiError)) return { message: accountTexts.common.genericError, obstacles: [] };
  if (error.code === 'IDENTITY_DELETION_CHECK_UNAVAILABLE') {
    return { message: deletionTexts.deletion.unavailable, obstacles: [] };
  }
  return { message: error.message, obstacles: obstaclesOf(error.details) };
}
