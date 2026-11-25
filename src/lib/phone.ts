/*
 * Téléphones : miroir exact de la règle commune du backend (`tryNormalizePhone`,
 * `libs/platform/src/phone/phone.ts` de `ksp_back`, ADR-063). Module pur, sans dépendance : la page
 * Contact (publique) et les espaces connectés le lisent sans rien télécharger d'autre. Le backend reste
 * juge : il refait la même normalisation et refuse ce qui ne s'y ramène pas.
 */

const E164 = /^\+[1-9]\d{6,14}$/;
/** Ancien plan béninois : +229 suivi de 8 chiffres exactement. */
const BENIN_EIGHT_DIGITS = /^\+229\d{8}$/;
/** Numéro béninois à 10 chiffres. */
const BENIN_TEN_DIGITS = /^\+229\d{10}$/;

/** Espaces, points, tirets et parenthèses retirés (après NFKC), préfixe `00` lu comme `+`. */
export function compactPhone(value: string): string {
  const phone = value.normalize('NFKC').replace(/[\s.\-()]/g, '');
  return phone.startsWith('00') ? `+${phone.slice(2)}` : phone;
}

/**
 * Numéro au format E.164, ou `null` s'il ne s'y ramène pas ; aucun indicatif n'est deviné.
 * Bénin (ADR-063) : la numérotation est passée à 10 chiffres en ajoutant `01` devant les 8 chiffres ; un
 * numéro `+229` à 8 chiffres devient `+229 01` suivi des 8 chiffres. Un numéro à 10 chiffres n'est
 * jamais retouché ; les autres pays sont inchangés.
 */
export function normalizePhone(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const phone = compactPhone(value);
  if (!E164.test(phone)) return null;
  return BENIN_EIGHT_DIGITS.test(phone) ? `+22901${phone.slice(4)}` : phone;
}

/** Ancien numéro béninois à 8 chiffres (`+229` et 8 chiffres), que la normalisation complète par `01`. */
export function isBeninEightDigits(value: string): boolean {
  return BENIN_EIGHT_DIGITS.test(compactPhone(value));
}

/** Numéro béninois, une fois normalisé (10 chiffres) : bénéficiaire Mobile Money d'un retrait. */
export function isBeninPhone(value: string | null | undefined): boolean {
  return BENIN_TEN_DIGITS.test(normalizePhone(value) ?? '');
}

/**
 * Affichage lisible d'un numéro reçu du backend, sans en changer la valeur : « +229 01 97 00 00 45 ».
 * Seuls les numéros béninois complets sont regroupés par deux chiffres ; un numéro étranger reste en
 * E.164 ; un numéro masqué (`+229********45`, `+229 •• •• 45`) ou illisible est rendu tel quel.
 */
export function formatPhone(value: string): string {
  const match = /^\+229(\d{8}|\d{10})$/.exec(value);
  if (!match) return value;
  return `+229 ${match[1]!.replace(/(\d{2})(?=\d)/g, '$1 ')}`;
}

/**
 * Numéro saisi en un seul champ (bénéficiaire d'un retrait, débiteur d'un dossier) → E.164, ou `null` :
 * 8 ou 10 chiffres sans indicatif sont lus comme un numéro béninois, le reste suit `normalizePhone`.
 */
export function phoneFromInput(value: string): string | null {
  const compact = compactPhone(value);
  if (/^\d{8}$|^\d{10}$/.test(compact)) return normalizePhone(`+229${compact}`);
  return normalizePhone(compact);
}
