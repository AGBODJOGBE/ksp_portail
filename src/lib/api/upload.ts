import { ApiError } from './errors';

/**
 * Envoi d'un contenu au stockage, à l'adresse présignée donnée par le service file (ADR-038) : `PUT`
 * direct, avec exactement les en-têtes signés, sans jeton ni cookie. Le contenu ne passe jamais par la
 * gateway. L'adresse est un secret de courte durée : jamais journalisée ni gardée.
 */
export async function putToStorage(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'PUT', headers, body, signal, credentials: 'omit' });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    // Téléphone hors ligne : vraie coupure. Sinon la gateway vient de répondre (déclaration du fichier) :
    // c'est le stockage qui ne répond pas, et « vérifiez votre connexion » serait trompeur.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw ApiError.network();
    throw new ApiError(
      0,
      'FILE_STORAGE_UNREACHABLE',
      'Envoi du fichier impossible pour le moment : le stockage des fichiers ne répond pas. Réessayez dans un instant.',
    );
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      'FILE_STORAGE_REJECTED',
      'Le stockage a refusé le fichier. Réessayez, ou continuez sans cette photo.',
    );
  }
}
