'use client';

import { useCallback } from 'react';
import { type LiveState as GenericLiveState, useLive as useLiveCalculation } from '@/lib/use-live';
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

export type LiveState<T> = GenericLiveState<T, CleaningErrorView>;

function useLive<B, T>(body: B | null, run: (body: B, signal: AbortSignal) => Promise<T>): LiveState<T> {
  return useLiveCalculation(body, run, describeCleaningError);
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
