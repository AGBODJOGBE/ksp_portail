import * as z from 'zod/mini';

/*
 * Import de dossiers par tableur (contrat `RecoveryCaseImport`, `RecoveryImportLine`) : lignes lues et
 * contrôlées par recovery, corrigées ou ignorées avant la confirmation, puis un brouillon par débiteur.
 * Lus dans le navigateur : `zod/mini`.
 */

/** `RecoveryImportLineValues` : valeurs lues (texte), dans l'ordre du modèle. Toutes facultatives. */
export const importValuesSchema = z.object({
  debtorKind: z.optional(z.string()),
  debtorName: z.optional(z.string()),
  debtorFirstNames: z.optional(z.string()),
  debtorIfu: z.optional(z.string()),
  debtorPhone: z.optional(z.string()),
  debtorEmail: z.optional(z.string()),
  debtorAddress: z.optional(z.string()),
  invoiceReference: z.optional(z.string()),
  amount: z.optional(z.string()),
  dueDate: z.optional(z.string()),
  description: z.optional(z.string()),
  nature: z.optional(z.string()),
});
export type ImportValues = z.infer<typeof importValuesSchema>;

export const importLineSchema = z.object({
  /** Numéro de la ligne dans le fichier, en-tête exclu (1 : première facture). */
  row: z.int(),
  /** `valid`, `invalid`, `ignored`. */
  status: z.string(),
  values: importValuesSchema,
  /** `field` (nom du contrat en snake_case : `debtor_phone`…) et `code` (`phone_invalid`…). */
  errors: z.array(z.object({ field: z.string(), code: z.string() })),
});
export type ImportLine = z.infer<typeof importLineSchema>;

export const caseImportSchema = z.object({
  id: z.string(),
  /** `checked`, `confirmed`, `expired`. */
  status: z.string(),
  /** `b2b` ou `b2c`. */
  kind: z.string(),
  linesTotal: z.int(),
  linesValid: z.int(),
  linesInvalid: z.int(),
  /** Un dossier par débiteur. */
  casesPlanned: z.int(),
  lines: z.array(importLineSchema),
  /** Brouillons créés à la confirmation. */
  caseIds: z.array(z.string()),
  createdAt: z.string(),
});
export type RecoveryCaseImport = z.infer<typeof caseImportSchema>;
