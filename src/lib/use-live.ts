'use client';

import { useEffect, useState } from 'react';

/*
 * Calcul en direct par la gateway (simulation du Nettoyage, estimation des frais du Recouvrement) : il part
 * après une courte pause de saisie, l'ancien est abandonné ; le dernier résultat reste affiché pendant le
 * nouveau calcul.
 */

/** Pause de saisie avant un calcul : évite un appel par touche (limite de la gateway par adresse). */
export const LIVE_DELAY_MS = 600;

export type LiveState<T, E> =
  | { status: 'idle' }
  | { status: 'loading'; last: T | null }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: E; last: T | null };

/**
 * `body` null : rien à calculer (saisie incomplète). `run` et `describe` doivent être stables (fonctions de
 * module) : un changement relance le calcul.
 */
export function useLive<B, T, E>(
  body: B | null,
  run: (body: B, signal: AbortSignal) => Promise<T>,
  describe: (error: unknown) => E,
): LiveState<T, E> {
  const key = body === null ? null : JSON.stringify(body);
  // Résultat du dernier calcul terminé, avec la saisie qui l'a produit.
  const [done, setDone] = useState<{ key: string; result: LiveState<T, E> } | null>(null);
  const [last, setLast] = useState<T | null>(null);

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      run(JSON.parse(key) as B, controller.signal).then(
        (data) => {
          if (controller.signal.aborted) return;
          setLast(data);
          setDone({ key, result: { status: 'ready', data } });
        },
        (error: unknown) => {
          if (controller.signal.aborted || (error as Error)?.name === 'AbortError') return;
          setDone({ key, result: { status: 'error', error: describe(error), last: null } });
        },
      );
    }, LIVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, run, describe]);

  if (key === null) return { status: 'idle' };
  if (done?.key !== key) return { status: 'loading', last };
  return done.result.status === 'error' ? { ...done.result, last } : done.result;
}
