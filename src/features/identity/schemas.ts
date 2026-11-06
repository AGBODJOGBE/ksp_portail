import * as z from 'zod/mini';
import { activeContextSchema, sessionSchema, sessionUserSchema } from '@/lib/api';

/**
 * Réponses de la gateway pour la connexion par téléphone (contrat `ksp-api.v1.yaml`, routes
 * `/api/v1/identity/*`). Lecture tolérante : un champ ajouté par la gateway est ignoré.
 * Schémas lus dans le navigateur : `zod/mini`, bien plus léger que `zod`.
 */

/** `RequestOtpResponse` : code envoyé. */
export const otpChallengeSchema = z.object({
  challengeId: z.string(),
  /** Numéro masqué, par exemple `+229********45`. */
  maskedTarget: z.string(),
  /** Canal réellement utilisé, après une éventuelle bascule de WhatsApp vers le SMS. */
  channel: z.string(),
  expiresInSeconds: z.int().check(z.positive()),
  resendAfterSeconds: z.int().check(z.nonnegative()),
});

/** `VerifyOtpSessionResponse` ou `MfaRequiredResponse` (comptes internes, non concernés au lot 1). */
export const verifyOtpResponseSchema = z.discriminatedUnion('status', [
  z.extend(sessionSchema, { isNewUser: z.boolean() }),
  z.object({ status: z.literal('mfa_required') }),
]);

/** `DeletionObstacle` : raison lisible qui empêche (ou reporte) la suppression du compte (ADR-036). */
export const deletionObstacleSchema = z.object({
  /** Service qui l'a signalée (`cleaning`, `billing`, `payment`…) ou `identity` (compte entreprise). */
  service: z.string(),
  /** Nature : `open_cleaning_mission`, `unpaid_invoice`, `pending_payment`… (chaîne : liste ouverte). */
  kind: z.string(),
  reference: z.string(),
  description: z.string(),
});

/** `AccountDeletion` : suppression demandée, date prévue fixée à la demande, raisons d'un report. */
export const accountDeletionSchema = z.object({
  requestedAt: z.string(),
  scheduledFor: z.string(),
  postponedBy: z.array(deletionObstacleSchema),
});

/**
 * `MeResponse` : profil (`GET`/`PATCH /me`, confirmation de l'e-mail). `user.email` est l'adresse
 * vérifiée ; `pendingEmail`, celle qui attend son code (ADR-026).
 */
export const profileSchema = z.object({
  user: sessionUserSchema,
  profileIncomplete: z.boolean(),
  activeContext: activeContextSchema,
  pendingEmail: z.nullable(z.string()),
  /** Suppression demandée (ADR-036) ; null sinon. Facultatif : absent d'une gateway antérieure. */
  deletion: z.optional(z.nullable(accountDeletionSchema)),
});

/** `RequestAccountDeletionResponse`. */
export const requestDeletionResponseSchema = z.object({ deletion: accountDeletionSchema });

/**
 * `CancelAccountDeletionResponse` : compte de nouveau actif, nouveau jeton d'accès complet à mettre à la
 * place du jeton restreint (le jeton de renouvellement ne change pas).
 */
export const cancelDeletionResponseSchema = z.object({
  user: sessionUserSchema,
  profileIncomplete: z.boolean(),
  activeContext: activeContextSchema,
  accessToken: z.string().check(z.minLength(1)),
  accessTokenExpiresAt: z.string(),
});

/** `ChangeEmailResponse` : code envoyé par e-mail à l'adresse à confirmer (profil ou facturation). */
export const emailChallengeSchema = z.object({
  pendingEmail: z.string(),
  expiresInSeconds: z.int().check(z.positive()),
  resendAfterSeconds: z.int().check(z.nonnegative()),
});

/** `SwitchContextResponse` : nouveau jeton d'accès dans le contexte demandé (ADR-027). */
export const switchContextResponseSchema = z.object({
  accessToken: z.string().check(z.minLength(1)),
  accessTokenExpiresAt: z.string(),
  activeContext: activeContextSchema,
});

/**
 * `Organization` : compte entreprise. `status` : `pending_review`, `active`, `rejected` ou `suspended`
 * (chaîne : un nouvel état s'affiche avec un libellé neutre).
 */
export const organizationSchema = z.object({
  id: z.string(),
  legalName: z.string(),
  address: z.string(),
  ifu: z.string(),
  rccm: z.nullable(z.string()),
  /** E-mail de facturation confirmé par code ; null si aucun ne l'est. */
  billingEmail: z.nullable(z.string()),
  status: z.string(),
  rejectionReason: z.nullable(z.string()),
  suspensionReason: z.nullable(z.string()),
  createdAt: z.string(),
  reviewedAt: z.nullable(z.string()),
});

/** `OrganizationMembership` : une organisation, mon rôle, l'e-mail de facturation en attente de code. */
export const membershipSchema = z.object({
  organization: organizationSchema,
  role: z.string(),
  pendingBillingEmail: z.nullable(z.string()),
});

export const membershipListSchema = z.object({ data: z.array(membershipSchema) });

export type OtpChallenge = z.infer<typeof otpChallengeSchema>;
export type VerifyOtpResponse = z.infer<typeof verifyOtpResponseSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type DeletionObstacle = z.infer<typeof deletionObstacleSchema>;
export type AccountDeletion = z.infer<typeof accountDeletionSchema>;
export type CancelDeletionResponse = z.infer<typeof cancelDeletionResponseSchema>;
export type EmailChallenge = z.infer<typeof emailChallengeSchema>;
export type SwitchContextResponse = z.infer<typeof switchContextResponseSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Membership = z.infer<typeof membershipSchema>;
