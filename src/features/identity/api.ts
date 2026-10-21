import { api, parseResponse, type Session } from '@/lib/api';
import {
  type OtpChallenge,
  otpChallengeSchema,
  type Profile,
  profileSchema,
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
} as const;

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

/** Ferme la session de cet appareil ; la gateway efface le cookie de renouvellement. */
export async function logout(): Promise<void> {
  await api.post(PATHS.logout);
}
