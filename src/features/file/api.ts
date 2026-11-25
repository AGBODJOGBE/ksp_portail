'use client';

import { api, parseResponse } from '@/lib/api';
// Hors de l'index de `lib/api` : seul le dépôt de fichiers télécharge cet envoi.
import { putToStorage } from '@/lib/api/upload';
import { type StoredFile, fileUploadSchema, storedFileSchema } from './schemas';

/**
 * Finalités ouvertes au client (`FileUploadPurpose`) : `recovery_import` est le tableur d'import des
 * dossiers du Recouvrement (XLSX ou CSV, 5 Mo).
 */
export type FilePurpose = 'cleaning_intervention_photo' | 'recovery_evidence' | 'recovery_import' | 'avatar';

/** Types acceptés pour une photo du Nettoyage (contrat de `POST /file/uploads`). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Dépose un fichier en trois temps (ADR-038) : déclaration (`POST /file/uploads`), envoi direct au
 * stockage (`PUT` présigné), confirmation (`POST /file/files/{id}/complete`). Renvoie le fichier
 * disponible, dont l'identifiant est ensuite transmis au service métier qui le rattache.
 * `contentType` : type déclaré quand celui du navigateur n'est pas fiable (un CSV est souvent annoncé
 * `application/vnd.ms-excel` sous Windows, ou sans type) ; par défaut, celui du fichier.
 */
export async function uploadFile(
  file: File,
  purpose: FilePurpose,
  signal?: AbortSignal,
  contentType: string = file.type,
): Promise<StoredFile> {
  const declared = parseResponse(
    fileUploadSchema,
    await api.post(
      '/api/v1/file/uploads',
      { purpose, fileName: file.name || 'photo', contentType, sizeBytes: file.size },
      { signal },
    ),
  );
  await putToStorage(declared.upload.url, declared.upload.headers, file, signal);
  return parseResponse(
    storedFileSchema,
    await api.post(`/api/v1/file/files/${encodeURIComponent(declared.file.id)}/complete`, undefined, {
      signal,
    }),
  );
}
