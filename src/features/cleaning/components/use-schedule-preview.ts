'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { previewSchedule, type ScheduleInput } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { leadTimeKey, scheduleErrorKey } from '@/features/cleaning/journey';
import { scheduleTexts } from '@/features/cleaning/journey-schedule-texts';
import type { SchedulePreview } from '@/features/cleaning/schemas';

/** Délai après le dernier changement du plan avant de demander l'aperçu (une requête par pause). */
export const PREVIEW_DELAY_MS = 400;
/** Attente par défaut après un 429 sans `retryAfterSeconds`, et attente maximale. */
const DEFAULT_WAIT_S = 5;
const MAX_WAIT_S = 60;

/** Échec d'un aperçu, rangé pour l'écran. */
export type PreviewProblem =
  /** Plan refusé (400 `CLEANING_VALIDATION_FAILED`, 422 délai) : message sous le champ `key`. */
  | { status: 'invalid'; key: string; message: string }
  /** Trop de demandes (429) : nouvel essai automatique après `seconds`. */
  | { status: 'busy'; seconds: number }
  /** Autre échec (réseau, service) : « Réessayer ». */
  | { status: 'failed'; message: string };

/**
 * Range une erreur de `POST /cleaning/schedules/preview` : champ du plan nommé par la gateway
 * (`details.field` = `schedule.<champ>`), délai minimum (`CLEANING_LEAD_TIME_TOO_SHORT`, sous la date de
 * début ou le calendrier, avec `details.minimumHours` si le message manque), 429 (attente).
 */
export function previewProblem(error: unknown, mode: ScheduleInput['mode']): PreviewProblem {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      const asked = Number(error.details['retryAfterSeconds']);
      const seconds = Number.isFinite(asked) && asked > 0 ? Math.ceil(asked) : DEFAULT_WAIT_S;
      return { status: 'busy', seconds: Math.min(MAX_WAIT_S, seconds) };
    }
    if (error.code === 'CLEANING_LEAD_TIME_TOO_SHORT') {
      const hours = Number(error.details['minimumHours']);
      const fallback = Number.isFinite(hours) && hours > 0 ? scheduleTexts.preview.leadTime(hours) : '';
      return { status: 'invalid', key: leadTimeKey(mode), message: error.message || fallback };
    }
    const field = error.details['field'];
    const validation =
      error.code === 'CLEANING_VALIDATION_FAILED' || error.code === 'GATEWAY_VALIDATION_FAILED';
    if (validation && typeof field === 'string') {
      return { status: 'invalid', key: scheduleErrorKey(field), message: error.message };
    }
    if (error.code === 'CLEANING_VALIDATION_FAILED') {
      return { status: 'invalid', key: 'schedule', message: error.message };
    }
  }
  return { status: 'failed', message: describeCleaningError(error).message };
}

export type PreviewState =
  | { status: 'idle' }
  /** Calcul en cours ; `previous` : dernier aperçu reçu, affiché atténué en attendant. */
  | { status: 'pending'; previous: SchedulePreview | null }
  | { status: 'ready'; preview: SchedulePreview }
  | PreviewProblem;

// Aperçus déjà reçus pendant la visite (un plan revu au récapitulatif ne refait pas d'appel).
const CACHE_SIZE = 20;
const cache = new Map<string, SchedulePreview>();

function remember(key: string, preview: SchedulePreview) {
  cache.delete(key);
  cache.set(key, preview);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
}

/** Réservé aux tests : oublie les aperçus reçus. */
export function resetPreviewCache(): void {
  cache.clear();
}

type Outcome = { request: string; result: { status: 'ready'; preview: SchedulePreview } | PreviewProblem };

/**
 * Aperçu du plan par la gateway (`POST /cleaning/schedules/preview`, public) : demandé 400 ms après le
 * dernier changement d'un plan complet, la requête précédente annulée et toute réponse dépassée ignorée.
 * Après un 429, nouvel essai automatique au bout du délai indiqué. Aucune date n'est calculée ici.
 */
export function useSchedulePreview(input: ScheduleInput | null): {
  state: PreviewState;
  retry: () => void;
} {
  const key = input ? JSON.stringify(input) : '';
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [last, setLast] = useState<SchedulePreview | null>(null);
  const request = `${attempt}:${key}`;
  const cached = key ? cache.get(key) : undefined;

  useEffect(() => {
    if (!key || cache.has(key)) return;
    const plan = JSON.parse(key) as ScheduleInput;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      previewSchedule(plan, controller.signal).then(
        (preview) => {
          if (controller.signal.aborted) return;
          remember(key, preview);
          setLast(preview);
          setOutcome({ request, result: { status: 'ready', preview } });
        },
        (error: unknown) => {
          if (controller.signal.aborted || (error as Error).name === 'AbortError') return;
          setOutcome({ request, result: previewProblem(error, plan.mode) });
        },
      );
    }, PREVIEW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, request]);

  // 429 : nouvel essai une fois l'attente écoulée.
  const waiting =
    outcome?.request === request && outcome.result.status === 'busy' ? outcome.result.seconds : 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => setAttempt((value) => value + 1), waiting * 1000);
    return () => window.clearTimeout(timer);
  }, [waiting, request]);

  const retry = () => setAttempt((value) => value + 1);
  if (!key) return { state: { status: 'idle' }, retry };
  if (cached) return { state: { status: 'ready', preview: cached }, retry };
  if (outcome?.request !== request) return { state: { status: 'pending', previous: last }, retry };
  return { state: outcome.result, retry };
}
