/**
 * Données d'un compte gardées dans l'onglet (`sessionStorage`) : brouillons de demande de nettoyage et
 * de dossier de recouvrement, reprise d'un paiement après une recharge du portefeuille. Toutes leurs
 * clés commencent par `ksp.` ou `ksp:`.
 *
 * Elles appartiennent au compte connecté : effacées à la déconnexion, et dès qu'un autre compte se
 * connecte dans le même onglet. Un brouillon commencé sans compte (simulateur public) est gardé par le
 * premier compte qui se connecte : c'est le parcours « demander un devis, puis se connecter ».
 *
 * Module sans dépendance : la session (chargée sur toutes les pages) l'importe.
 */

const PREFIXES = ['ksp.', 'ksp:'];

/** Compte propriétaire des données de l'onglet. */
const OWNER_KEY = 'ksp.compte';

function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Efface toutes les données de compte de l'onglet (déconnexion). */
export function clearAccountData(): void {
  const storage = tabStorage();
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Stockage bloqué : il n'y a rien à effacer.
  }
}

/** Attribue les données de l'onglet au compte connecté ; celles d'un autre compte sont effacées. */
export function claimAccountData(userId: string): void {
  const storage = tabStorage();
  if (!storage) return;
  try {
    const owner = storage.getItem(OWNER_KEY);
    if (owner !== null && owner !== userId) clearAccountData();
    storage.setItem(OWNER_KEY, userId);
  } catch {
    // Stockage bloqué : les brouillons ne sont pas gardés non plus.
  }
}
