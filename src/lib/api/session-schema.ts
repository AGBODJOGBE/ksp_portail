import * as z from 'zod/mini';

/**
 * Session renvoyée par la gateway (contrat `ksp-api.v1.yaml`, schémas `User` et `SessionResponse`),
 * à la connexion comme au renouvellement. Lecture tolérante : un champ ajouté par la gateway est ignoré.
 * Le jeton de renouvellement n'y figure jamais côté web : il voyage dans le cookie posé par la gateway.
 *
 * Schémas lus dans le navigateur : `zod/mini`, bien plus léger que `zod`.
 */
export const sessionUserSchema = z.object({
  id: z.string(),
  status: z.string(),
  firstName: z.nullable(z.string()),
  lastName: z.nullable(z.string()),
  phone: z.nullable(z.string()),
  /** Adresse vérifiée du compte (enregistrée seulement après confirmation par code, ADR-026). */
  email: z.nullable(z.string()),
  emailVerified: z.boolean(),
  preferredLanguage: z.string(),
  createdAt: z.string(),
});

/**
 * `ActiveContext` : contexte du jeton d'accès, qui fixe le type de compte lu par les services métier.
 * `individual` (contexte personnel) ou `business` (organisation active, avec sa raison sociale).
 */
export const activeContextSchema = z.object({
  /** Chaîne plutôt qu'énumération : un nouveau type s'affiche comme le contexte personnel. */
  type: z.string(),
  organizationId: z.nullable(z.string()),
  organizationName: z.optional(z.nullable(z.string())),
});

export const sessionSchema = z.object({
  status: z.literal('authenticated'),
  accessToken: z.string().check(z.minLength(1)),
  /** Date ISO 8601 d'expiration du jeton d'accès (15 minutes). */
  accessTokenExpiresAt: z.string(),
  sessionId: z.string(),
  user: sessionUserSchema,
  /** Le nom n'est pas encore renseigné : il est demandé avant d'entrer dans l'espace. */
  profileIncomplete: z.boolean(),
  activeContext: activeContextSchema,
});

export type ActiveContext = z.infer<typeof activeContextSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type Session = z.infer<typeof sessionSchema>;
