import { useSyncExternalStore } from 'react';
import type { Session } from './session-schema';

/**
 * Session côté navigateur (F-005).
 *
 * - Le jeton d'accès (court) reste en mémoire : jamais dans localStorage ni sessionStorage, perdu à la
 *   fermeture de l'onglet ou au rechargement de la page.
 * - Le jeton de renouvellement est dans un cookie HttpOnly posé par la gateway, illisible par le JavaScript.
 * - Au chargement d'un espace connecté, ou sur une réponse 401, la session est redemandée à la gateway.
 *
 * Ce module n'importe ni la configuration ni zod : l'en-tête du site le lit sur toutes les pages sans
 * alourdir leur JavaScript. Le renouvellement réel (`./refresh`) n'est chargé qu'au premier besoin.
 * Importer `@/lib/api/session` (et non `@/lib/api`) depuis un composant présent sur toutes les pages.
 */

export type { Session, SessionUser } from './session-schema';

/** Issue d'une tentative de reprise de session. */
export type RestoreResult =
  | { status: 'authenticated'; session: Session }
  /** Aucune session valide : il faut se connecter. */
  | { status: 'anonymous' }
  /** La gateway n'a pas pu répondre (réseau, limite, panne) : on ne sait pas. */
  | { status: 'unavailable'; error: unknown };

type Listener = (session: Session | null) => void;

/** On renouvelle un peu avant l'expiration réelle du jeton d'accès. */
const EXPIRY_MARGIN_MS = 30_000;

/**
 * Instant (horloge locale) à partir duquel le jeton n'est plus envoyé. Si l'horloge du téléphone avance
 * au point de voir le jeton déjà expiré, on le garde : la gateway répondra 401 et la session sera
 * renouvelée à ce moment-là, plutôt que de boucler sur des renouvellements inutiles.
 */
function expiryOf(isoDate: string, now: number): number {
  const expiresAt = Date.parse(isoDate) - EXPIRY_MARGIN_MS;
  return Number.isFinite(expiresAt) && expiresAt > now ? expiresAt : Number.POSITIVE_INFINITY;
}

export function createSessionStore(options: {
  /** Demande une nouvelle session : `null` si aucune session valide, exception si la gateway ne répond pas. */
  refresh: () => Promise<Session | null>;
  now?: () => number;
}) {
  const now = options.now ?? (() => Date.now());
  let current: Session | null = null;
  let expiresAt = 0;
  let pending: Promise<RestoreResult> | null = null;
  const listeners = new Set<Listener>();

  function set(next: Session | null): void {
    current = next;
    expiresAt = next ? expiryOf(next.accessTokenExpiresAt, now()) : 0;
    listeners.forEach((listener) => listener(current));
  }

  /** Un seul renouvellement à la fois, même si plusieurs requêtes reçoivent 401 en même temps. */
  function renew(): Promise<RestoreResult> {
    pending ??= options
      .refresh()
      .then((next): RestoreResult => {
        set(next);
        return next ? { status: 'authenticated', session: next } : { status: 'anonymous' };
      })
      .catch((error: unknown): RestoreResult => {
        set(null);
        return { status: 'unavailable', error };
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  return {
    /** Jeton d'accès encore valide, sinon `null`. */
    getAccessToken(): string | null {
      return current && now() < expiresAt ? current.accessToken : null;
    },
    /** Session en mémoire (référence stable entre deux changements, pour `useSyncExternalStore`). */
    get(): Session | null {
      return current;
    },
    set,
    clear: () => set(null),
    /** Met à jour le profil de la session (après « Compléter mon profil »), sans toucher aux jetons. */
    updateProfile(profile: Pick<Session, 'user' | 'profileIncomplete'>): void {
      if (current) set({ ...current, user: profile.user, profileIncomplete: profile.profileIncomplete });
    },
    /** Renouvelle la session ; `true` si un nouveau jeton est disponible (utilisé par le client sur 401). */
    refresh(): Promise<boolean> {
      return renew().then((result) => result.status === 'authenticated');
    },
    /** Reprend la session au chargement d'un espace connecté : mémoire d'abord, sinon renouvellement. */
    restore(): Promise<RestoreResult> {
      return current ? Promise.resolve({ status: 'authenticated', session: current }) : renew();
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;

/** Session du navigateur, unique pour tout le site. */
export const session: SessionStore = createSessionStore({
  refresh: async () => (await import('./refresh')).refreshSession(),
});

const noSession = () => null;

/** Session en mémoire dans un composant client, à jour à chaque changement. Rien au rendu serveur. */
export function useSession(): Session | null {
  return useSyncExternalStore(session.subscribe, session.get, noSession);
}
