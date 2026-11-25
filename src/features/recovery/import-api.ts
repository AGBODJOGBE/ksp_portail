'use client';

import { api, parseResponse } from '@/lib/api';
import { type ImportValues, type RecoveryCaseImport, caseImportSchema } from './import-schemas';

/*
 * Import de dossiers par tableur (ADR-060, R-SD-01, R-SD-02) : le tableur est d'abord déposé par file
 * (finalité `recovery_import`), puis contrôlé ligne par ligne par recovery ; rien n'est créé avant la
 * confirmation. `Idempotency-Key` sur le contrôle et la confirmation (contrat).
 */

const IMPORTS = '/api/v1/recovery/imports';
const importPath = (importId: string) => `${IMPORTS}/${encodeURIComponent(importId)}`;

/** Contrôle d'un tableur déposé : lignes valides et en erreur, dossiers prévus. */
export async function createImport(
  body: { kind: 'b2b' | 'b2c'; fileId: string },
  idempotencyKey: string,
): Promise<RecoveryCaseImport> {
  return parseResponse(caseImportSchema, await api.post(IMPORTS, body, { idempotencyKey }));
}

export async function getImport(importId: string): Promise<RecoveryCaseImport> {
  return parseResponse(caseImportSchema, await api.get(importPath(importId)));
}

/** Ligne corrigée (valeurs saisies) ou mise de côté (`ignore`), avant la confirmation. */
export async function updateImportLine(
  importId: string,
  row: number,
  body: { values: ImportValues } | { ignore: true },
): Promise<RecoveryCaseImport> {
  return parseResponse(
    caseImportSchema,
    await api.put(`${IMPORTS}/${encodeURIComponent(importId)}/lines/${row}`, body),
  );
}

/** Un brouillon par débiteur, à partir des lignes valides. */
export async function confirmImport(importId: string, idempotencyKey: string): Promise<RecoveryCaseImport> {
  return parseResponse(
    caseImportSchema,
    await api.post(`${importPath(importId)}/confirm`, undefined, { idempotencyKey }),
  );
}
