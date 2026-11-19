import * as z from 'zod/mini';

/*
 * Documents PDF et signature par code (service document, ADR-044), tels que les décrit le contrat
 * `ksp-api.v1.yaml` (`Document`, `DocumentSignature`, `DocumentDownloadUrl`, `SignatureCodeDelivery`,
 * `SigningSession`), champ par champ : un champ obligatoire absent rend la réponse invalide, un champ
 * ajouté est ignoré, un statut inconnu s'affiche avec un libellé neutre. Lus dans le navigateur : `zod/mini`.
 */

/** Adresse présignée de **courte durée** (5 minutes) : demandée juste avant la lecture, jamais gardée. */
export const downloadUrlSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
  /** `original` (PDF produit) ou `signed` (pages d'origine et page de certificat). */
  version: z.string(),
});

/** `DocumentSignature` : demande de signature en cours ou la plus récente. */
export const signatureSchema = z.object({
  id: z.string(),
  /** `pending`, `signed`, `expired`, `cancelled`. */
  status: z.string(),
  signer: z.object({
    displayName: z.string(),
    /** Téléphone masqué (+229********45) ; jamais le numéro en clair. */
    phoneMasked: z.nullable(z.string()),
    hasAccount: z.boolean(),
  }),
  /** Le compte connecté est le signataire attendu d'une demande en attente. */
  canSign: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string(),
  signedAt: z.nullable(z.string()),
  /** Expiration du code en cours ; null si aucun code valable. */
  codeExpiresAt: z.nullable(z.string()),
});

/** `Document` : `draft`, `pending_signature`, `signed`, `expired` (demande expirée), `cancelled`. */
export const documentSchema = z.object({
  id: z.string(),
  template: z.string(),
  templateVersion: z.int(),
  title: z.string(),
  /** Numéro lisible unique (MAN-2026-000042). */
  number: z.string(),
  status: z.string(),
  subject: z.nullable(z.object({ type: z.string(), id: z.string() })),
  /** Empreinte SHA-256 du PDF produit (celui présenté au signataire). */
  sha256: z.string(),
  sizeBytes: z.int(),
  /** Empreinte SHA-256 du PDF signé (pages d'origine et page de certificat). */
  signedSha256: z.nullable(z.string()),
  createdAt: z.string(),
  signedAt: z.nullable(z.string()),
  cancelledAt: z.nullable(z.string()),
  signature: z.nullable(signatureSchema),
});

/** `SignatureCodeDelivery` : canal qui a acheminé le code (jamais le code lui-même). */
export const codeDeliverySchema = z.object({
  /** `whatsapp`, `email` ou `sms`. */
  channel: z.string(),
  expiresAt: z.string(),
  resendAfterSeconds: z.int(),
});

/** `SigningSession` : ce que voit un signataire sans compte par son lien personnel. */
export const signingSessionSchema = z.object({
  documentTitle: z.string(),
  documentNumber: z.string(),
  /** `pending`, `signed`, `expired`, `cancelled`. */
  status: z.string(),
  signer: z.object({ displayName: z.string(), phoneMasked: z.nullable(z.string()) }),
  expiresAt: z.string(),
  signedAt: z.nullable(z.string()),
  codeExpiresAt: z.nullable(z.string()),
  /** Lecture du PDF (signé s'il l'est) ; null pour une demande expirée ou annulée. */
  download: z.nullable(downloadUrlSchema),
});

export type DownloadUrl = z.infer<typeof downloadUrlSchema>;
export type DocumentSignature = z.infer<typeof signatureSchema>;
export type KspDocument = z.infer<typeof documentSchema>;
export type CodeDelivery = z.infer<typeof codeDeliverySchema>;
export type SigningSession = z.infer<typeof signingSessionSchema>;
