import * as z from 'zod/mini';
import { sessionSchema, sessionUserSchema } from '@/lib/api';

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

/** `MeResponse` : profil après `PATCH /me`. */
export const profileSchema = z.object({
  user: sessionUserSchema,
  profileIncomplete: z.boolean(),
});

export type OtpChallenge = z.infer<typeof otpChallengeSchema>;
export type VerifyOtpResponse = z.infer<typeof verifyOtpResponseSchema>;
export type Profile = z.infer<typeof profileSchema>;
