import { api, parseResponse } from '@/lib/api';
import {
  type Invitation,
  type InvitationResponse,
  type MemberList,
  type MemberView,
  invitationListSchema,
  invitationResponseSchema,
  invitationSchema,
  memberListSchema,
  memberViewSchema,
} from './member-schemas';

/*
 * Membres et invitations d'un compte entreprise (R-CP-03). Module à part de `api.ts`, que lisent toutes
 * les pages de l'espace (rôle, déconnexion) : seuls les écrans des membres et des invitations, chargés à
 * la demande, l'importent. Lu aussi par `pnpm routes:coverage` (fichiers `*-api.ts`).
 */

const PATHS = {
  organizations: '/api/v1/identity/organizations',
  myInvitations: '/api/v1/identity/me/organization-invitations',
  invitations: '/api/v1/identity/organization-invitations',
} as const;

const organizationPath = (id: string) => `${PATHS.organizations}/${encodeURIComponent(id)}`;
const memberPath = (id: string, userId: string) =>
  `${PATHS.organizations}/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`;

/** Rôle fixe dans un compte entreprise (`OrgRole` du contrat). */
export type OrgRole = 'org_admin' | 'org_member' | 'org_viewer';

/** Membres (tout membre) et invitations en attente (administrateur seulement, sinon vide). */
export async function listMembers(organizationId: string): Promise<MemberList> {
  return parseResponse(memberListSchema, await api.get(`${organizationPath(organizationId)}/members`));
}

/** Invite un numéro avec un rôle (administrateur, entreprise validée) ; même réponse avec ou sans compte. */
export async function inviteMember(
  organizationId: string,
  input: { phone: string; role: OrgRole },
): Promise<Invitation> {
  return parseResponse(
    invitationSchema,
    await api.post(`${organizationPath(organizationId)}/invitations`, input),
  );
}

/** Change le rôle d'un membre (administrateur ; jamais le dernier administrateur). */
export async function changeMemberRole(
  organizationId: string,
  userId: string,
  role: OrgRole,
): Promise<MemberView> {
  return parseResponse(memberViewSchema, await api.patch(memberPath(organizationId, userId), { role }));
}

/** Retire un membre (administrateur), ou quitte l'entreprise (le membre lui-même). Réponse 204. */
export async function removeMember(organizationId: string, userId: string): Promise<void> {
  await api.post(`${memberPath(organizationId, userId)}/remove`);
}

/** Invitations en attente adressées au compte connecté. */
export async function listMyInvitations(): Promise<Invitation[]> {
  return parseResponse(invitationListSchema, await api.get(PATHS.myInvitations)).data;
}

/** Accepte (le compte devient membre) ou refuse une invitation. */
export async function respondToInvitation(id: string, accept: boolean): Promise<InvitationResponse> {
  return parseResponse(
    invitationResponseSchema,
    await api.post(`${PATHS.invitations}/${encodeURIComponent(id)}/respond`, { accept }),
  );
}
