import type { Money } from './schemas';

/** Montants de recharge acceptés (`topUpLimits` de `GET /wallet/me`), en entiers de FCFA. */
export interface TopUpLimits {
  min: Money;
  max: Money;
}

/** Raccourcis courants d'une recharge ; seuls ceux compris dans les limites de la gateway sont proposés. */
const PRESETS = [2_000, 5_000, 10_000, 25_000, 50_000];

export function topUpPresets(limits: TopUpLimits): number[] {
  const inRange = PRESETS.filter((amount) => amount >= limits.min.amount && amount <= limits.max.amount);
  return inRange.length ? inRange.slice(0, 4) : [limits.min.amount];
}

export type AmountCheck = { amount: number } | { error: 'empty' | 'invalid' | 'tooLow' | 'tooHigh' };

/**
 * Montant saisi (« 15 000 », « 15000 ») : entier de FCFA dans les limites. La gateway contrôle de nouveau
 * (`WALLET_VALIDATION_FAILED`) : ce contrôle évite seulement un aller-retour.
 */
export function checkTopUpAmount(value: string, limits: TopUpLimits): AmountCheck {
  const digits = value.replace(/[\s  .]/g, '');
  if (!digits) return { error: 'empty' };
  if (!/^\d{1,9}$/.test(digits)) return { error: 'invalid' };
  const amount = Number(digits);
  if (amount < limits.min.amount) return { error: 'tooLow' };
  if (amount > limits.max.amount) return { error: 'tooHigh' };
  return { amount };
}

/**
 * Recharge proposée quand le solde ne suffit pas : le montant manquant (`details.missing`), relevé au
 * minimum accepté et plafonné au maximum (le client rechargera alors deux fois).
 */
export function topUpFor(missing: number, limits: TopUpLimits | null): number {
  if (!limits) return missing;
  return Math.min(Math.max(missing, limits.min.amount), limits.max.amount);
}

/*
 * Reprise d'un paiement après une recharge : la page de retour du prestataire est celle de tous les
 * paiements (`/mon-espace/paiements/<id>`, fixée par la gateway). L'écran d'où part la recharge (fiche d'une
 * mission, d'une facture) est gardé dans l'onglet pour y ramener le client, solde rechargé.
 */
const RESUME_KEY = 'ksp:portefeuille:reprise';

/** Écran de Mon espace seulement : jamais `//`, `\`, schéma ou caractère de contrôle (pas de redirection ouverte). */
export function isResumePath(path: string): boolean {
  return /^\/mon-espace\/[^\s\\]*$/.test(path) && ![...path].some((char) => char.charCodeAt(0) < 32);
}

export function rememberResume(path: string | null): void {
  try {
    if (path && isResumePath(path)) sessionStorage.setItem(RESUME_KEY, path);
    else sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : la recharge se fait quand même, sans lien de reprise.
  }
}

export function readResume(): string | null {
  try {
    const path = sessionStorage.getItem(RESUME_KEY);
    return path && isResumePath(path) ? path : null;
  } catch {
    return null;
  }
}

export function forgetResume(): void {
  rememberResume(null);
}
