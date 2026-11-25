import * as z from 'zod/mini';
import { membershipSchema } from './schemas';

/*
 * Membres et invitations d'un compte entreprise (contrat `ksp-api.v1.yaml`, R-CP-03), champ par champ :
 * un champ ajouté est ignoré, un rôle ou un état inconnu s'affiche avec un libellé neutre. Lus par
 * `members-api.ts`, chargé avec les seuls écrans des membres et des invitations.
 */

/** `OrganizationMemberView` : membre vu par les membres de son organisation, numéro masqué. */
export const memberViewSchema = z.object({
  userId: z.string(),
  role: z.string(),
  firstName: z.nullable(z.string()),
  lastName: z.nullable(z.string()),
  phoneMasked: z.nullable(z.string()),
  joinedAt: z.string(),
});

/** `OrganizationInvitation` : `pending`, `accepted`, `declined` ou `expired` ; expire après 7 jours. */
export const invitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  role: z.string(),
  phoneMasked: z.string(),
  status: z.string(),
  invitedAt: z.string(),
  expiresAt: z.string(),
});

/** `OrganizationMemberList` : invitations en attente vides pour un membre qui n'est pas administrateur. */
export const memberListSchema = z.object({
  data: z.array(memberViewSchema),
  pendingInvitations: z.array(invitationSchema),
});

export const invitationListSchema = z.object({ data: z.array(invitationSchema) });

/** `OrganizationInvitationResponse` : l'appartenance créée (invitation acceptée), sinon null. */
export const invitationResponseSchema = z.object({
  invitation: invitationSchema,
  membership: z.nullable(membershipSchema),
});

export type MemberView = z.infer<typeof memberViewSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type MemberList = z.infer<typeof memberListSchema>;
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
