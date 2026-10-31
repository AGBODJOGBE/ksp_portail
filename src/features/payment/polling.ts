/**
 * Attente du statut final d'un paiement sur la page de retour. payment relit le prestataire au plus
 * toutes les 10 secondes : interroger plus souvent au début (la notification arrive souvent vite), puis
 * espacer, et s'arrêter après environ trois minutes (le client peut relancer la vérification).
 */
export const POLL_DELAYS_MS: readonly number[] = [
  1500, 2000, 3000, 3000, 5000, 5000, 5000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000,
  10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000,
];

/** Délai avant la lecture n° `attempt` (0 = première relecture), ou null quand l'attente est épuisée. */
export function nextPollDelay(attempt: number, delays: readonly number[] = POLL_DELAYS_MS): number | null {
  return attempt < delays.length ? (delays[attempt] ?? null) : null;
}

/** Adresse de page de paiement acceptée pour une redirection : http(s) seulement. */
export function safeCheckoutUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
