'use client';

import { useCallback, useEffect, useState } from 'react';
import { useResource } from '@/lib/use-resource';
import {
  type SchedulePlan,
  type SimulateBody,
  getPlaceType,
  listCatalog,
  listZones,
  previewSchedule,
  simulate,
} from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError } from '@/features/cleaning/errors';
import type { PlaceTypeDetail, SchedulePreview, Simulation, Zone } from '@/features/cleaning/schemas';

/*
 * Lectures publiques du Nettoyage (catalogue, lieu, communes) et calculs en direct (simulation, aperçu
 * des dates). Un calcul part après une courte pause de saisie, l'ancien est abandonné ; le dernier
 * résultat reste affiché pendant le nouveau calcul.
 */

/** Pause de saisie avant un calcul : évite un appel par touche (limite de la gateway par adresse). */
export const LIVE_DELAY_MS = 600;

export function useCatalog() {
  return useResource(listCatalog);
}

export function useZones() {
  return useResource(listZones);
}

/** Lieu choisi : paramètres, offres, frais de visite. */
export function usePlaceType(placeTypeId: string | null) {
  const load = useCallback(
    () => (placeTypeId ? getPlaceType(placeTypeId) : Promise.resolve(null)),
    [placeTypeId],
  );
  return useResource<PlaceTypeDetail | null>(load);
}

export type LiveState<T> =
  | { status: 'idle' }
  | { status: 'loading'; last: T | null }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: CleaningErrorView; last: T | null };

function useLive<B, T>(body: B | null, run: (body: B, signal: AbortSignal) => Promise<T>): LiveState<T> {
  const key = body === null ? null : JSON.stringify(body);
  // Résultat du dernier calcul terminé, avec la saisie qui l'a produit.
  const [done, setDone] = useState<{ key: string; result: LiveState<T> } | null>(null);
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
          setDone({ key, result: { status: 'error', error: describeCleaningError(error), last: null } });
        },
      );
    }, LIVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, run]);

  if (key === null) return { status: 'idle' };
  if (done?.key !== key) return { status: 'loading', last };
  return done.result.status === 'error' ? { ...done.result, last } : done.result;
}

/** Estimation en direct (`POST /cleaning/simulations`), null tant que la saisie n'est pas complète. */
export function useSimulation(body: SimulateBody | null): LiveState<Simulation> {
  return useLive(body, simulate);
}

/** Aperçu des dates (`POST /cleaning/schedule-previews`). */
export function useSchedulePreview(plan: SchedulePlan | null): LiveState<SchedulePreview> {
  return useLive(plan, previewSchedule);
}

export type { Zone };
