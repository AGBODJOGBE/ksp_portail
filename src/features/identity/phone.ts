import { compactPhone, isBeninEightDigits, normalizePhone } from '@/lib/phone';

/** Indicatif proposé par défaut : Bénin. */
export const DEFAULT_COUNTRY_CODE = '+229';

const COUNTRY_CODE = /^\+[1-9]\d{0,3}$/;

/** Numéro saisi en deux champs (indicatif, numéro), mis bout à bout ; `null` si l'indicatif est impossible. */
function joinInput(countryCode: string, number: string): string | null {
  const national = compactPhone(number);
  if (!national) return null;
  // Saisi au format international (`+…` ou `00…`) : pris tel quel, quel que soit l'indicatif.
  if (national.startsWith('+')) return national;
  const prefix = compactPhone(countryCode);
  const code = prefix.startsWith('+') ? prefix : `+${prefix}`;
  return COUNTRY_CODE.test(code) ? `${code}${national}` : null;
}

export interface PhoneInput {
  /** Numéro envoyé à la gateway (E.164, normalisé comme le backend), ou `null` s'il est impossible. */
  phone: string | null;
  /** Ancien numéro béninois à 8 chiffres, complété par `01` (ADR-063) : à montrer au client. */
  converted: boolean;
}

/**
 * Lecture de la saisie : l'indicatif est ajouté devant le numéro, sans retirer de 0 initial (au Bénin, le
 * `01` des numéros à 10 chiffres fait partie du numéro), puis la règle du backend s'applique
 * (`normalizePhone`, miroir de `tryNormalizePhone`) : un numéro `+229` à 8 chiffres devient
 * `+229 01` suivi des 8 chiffres. Validation légère : la gateway reste juge (`IDENTITY_PHONE_INVALID`).
 */
export function readPhoneInput(countryCode: string, number: string): PhoneInput {
  const joined = joinInput(countryCode, number);
  const phone = joined ? normalizePhone(joined) : null;
  return { phone, converted: phone !== null && joined !== null && isBeninEightDigits(joined) };
}

/** Numéro au format E.164 normalisé, ou `null` s'il ne peut pas l'être (voir `readPhoneInput`). */
export function toE164(countryCode: string, number: string): string | null {
  return readPhoneInput(countryCode, number).phone;
}

/** Code reçu : chiffres uniquement, 4 à 8 (6 par défaut côté identity). */
export function cleanCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function isCodeComplete(code: string): boolean {
  return /^\d{4,8}$/.test(code);
}
