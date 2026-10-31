'use client';

import { useEffect, useState } from 'react';
import { listZones } from './api';
import type { ServedZone } from './schemas';

export type ZonesState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'ready'; zones: ReadonlyArray<ServedZone> };

/**
 * Zones desservies d'un écran : celles lues par le serveur pour la page (`initial`), sinon relues par
 * le navigateur (le serveur n'a pas pu joindre la gateway pendant la construction de la page).
 */
export function useZones(initial: ReadonlyArray<ServedZone> | null): ZonesState {
  const [state, setState] = useState<ZonesState>(
    initial ? { status: 'ready', zones: initial } : { status: 'loading' },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initial) return;
    let active = true;
    listZones().then(
      (zones) => {
        if (active) setState({ status: 'ready', zones });
      },
      (error: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          error,
          retry: () => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          },
        });
      },
    );
    return () => {
      active = false;
    };
  }, [initial, attempt]);

  return state;
}
