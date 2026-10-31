import { api, parseResponse, type Session } from '@/lib/api';
import {
  type EmailChallenge,
  emailChallengeSchema,
  type Membership,
  membershipListSchema,
  membershipSchema,
  type OtpChallenge,
  otpChallengeSchema,
  type Profile,
  profileSchema,
  type SwitchContextResponse,
  switchContextResponseSchema,
  verifyOtpResponseSchema,
} from './schemas';

/**
 * Appels du navigateur à la gateway pour la connexion (option A, F-005) : la session vit dans le
 * navigateur, ces appels ne peuvent donc pas passer par le serveur Next.
 */

const PATHS = {
  requestOtp: '/api/v1/identity/otp/request',
  verifyOtp: '/api/v1/identity/otp/verify',
  logout: '/api/v1/identity/logout',
  me: '/api/v1/identity/me',
  email: '/api/v1/identity/me/email',
  emailVerify: '/api/v1/identity/me/email/verify',
  context: '/api/v1/identity/context',
  organizations: '/api/v1/identity/organizations',
} as const;

const organizationPath = (id: string) => `${PATHS.organizations}/${encodeURIComponent(id)}`;

/** Demande un code. Sans canal : la gateway choisit WhatsApp, canal par défaut du contrat (ADR-021). */
export async function requestOtp(phone: string): Promise<OtpChallenge> {
  return parseResponse(otpChallengeSchema, await api.post(PATHS.requestOtp, { phone }, { auth: false }));
}

export type VerifyOtpResult = { status: 'authenticated'; session: Session } | { status: 'mfa_required' };

/** Valide le code ; la gateway pose le cookie de renouvellement et renvoie la session. */
export async function verifyOtp(challengeId: string, code: string): Promise<VerifyOtpResult> {
  const body = parseResponse(
    verifyOtpResponseSchema,
    await api.post(PATHS.verifyOtp, { challengeId, code }, { auth: false }),
  );
  if (body.status === 'mfa_required') return { status: 'mfa_required' };
  const { isNewUser: _isNewUser, ...session } = body;
  return { status: 'authenticated', session };
}

/** Complète le profil (prénom et nom). */
export async function updateProfile(input: { firstName: string; lastName: string }): Promise<Profile> {
  return parseResponse(profileSchema, await api.patch(PATHS.me, input));
}

/** Lit son profil : e-mail vérifié, e-mail en attente de code, contexte actif. */
export async function getProfile(): Promise<Profile> {
  return parseResponse(profileSchema, await api.get(PATHS.me));
}

/** Déclare ou change son e-mail : un code est envoyé à l'adresse saisie (ADR-026). */
export async function changeEmail(email: string): Promise<EmailChallenge> {
  return parseResponse(emailChallengeSchema, await api.put(PATHS.email, { email }));
}

/** Confirme l'e-mail par le code reçu : il devient l'adresse vérifiée du compte. */
export async function confirmEmail(code: string): Promise<Profile> {
  return parseResponse(profileSchema, await api.post(PATHS.emailVerify, { code }));
}

/**
 * Change de contexte : une organisation validée, ou `null` pour le compte personnel (ADR-027). La
 * réponse porte un nouveau jeton d'accès, à mettre dans la session (`session.switchContext`).
 */
export async function switchContext(organizationId: string | null): Promise<SwitchContextResponse> {
  return parseResponse(switchContextResponseSchema, await api.post(PATHS.context, { organizationId }));
}

/** Mes organisations, les plus récentes d'abord, avec leur état. */
export async function listMyOrganizations(): Promise<Membership[]> {
  return parseResponse(membershipListSchema, await api.get(PATHS.organizations)).data;
}

/** `CreateOrganizationRequest` : IFU de 13 chiffres (espaces ignorés), RCCM facultatif. */
export interface OrganizationInput {
  legalName: string;
  address: string;
  ifu: string;
  rccm?: string;
}

/** Demande un compte entreprise : créé en attente de validation par KSP, l'utilisateur en est l'administrateur. */
export async function createOrganization(input: OrganizationInput): Promise<Membership> {
  return parseResponse(membershipSchema, await api.post(PATHS.organizations, input));
}

export async function getMyOrganization(id: string): Promise<Membership> {
  return parseResponse(membershipSchema, await api.get(organizationPath(id)));
}

/** Déclare ou change l'e-mail de facturation : un code est envoyé à cette adresse (ADR-027, 028). */
export async function changeBillingEmail(id: string, email: string): Promise<EmailChallenge> {
  return parseResponse(
    emailChallengeSchema,
    await api.put(`${organizationPath(id)}/billing-email`, { email }),
  );
}

export async function confirmBillingEmail(id: string, code: string): Promise<Membership> {
  return parseResponse(
    membershipSchema,
    await api.post(`${organizationPath(id)}/billing-email/verify`, { code }),
  );
}

/** Ferme la session de cet appareil ; la gateway efface le cookie de renouvellement. */
export async function logout(): Promise<void> {
  await api.post(PATHS.logout);
}
