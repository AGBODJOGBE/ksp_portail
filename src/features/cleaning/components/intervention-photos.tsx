'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconImage } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { listInterventionPhotos } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import type { InterventionPhoto } from '@/features/cleaning/schemas';
import { cleaningTexts } from '@/features/cleaning/texts';

const t = cleaningTexts.missionDetail;

type State =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; photos: InterventionPhoto[] };

/** Marge avant l'expiration d'une adresse : elle est redemandée un peu avant. */
const EXPIRY_MARGIN_MS = 10_000;
/** Délai minimal entre deux relectures (horloge de l'appareil décalée : pas de relecture en boucle). */
const MIN_REFRESH_MS = 30_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Photos avant et après d'un passage (ADR-053), chargées à l'ouverture seulement. Les adresses de lecture
 * sont de courte durée : jamais gardées d'une ouverture à l'autre, redemandées avant leur expiration
 * tant que la galerie est ouverte, et après une image qui ne se charge plus (adresse expirée).
 * Les images sont lues directement (`<img>`), jamais par l'optimiseur de Next, qui les garderait dans
 * un cache partagé.
 */
export function InterventionPhotos({
  interventionId,
  count,
  date,
}: {
  interventionId: string;
  count: number;
  date: string;
}) {
  const id = useId();
  const [state, setState] = useState<State>({ status: 'closed' });
  /** Une image en échec relance la lecture une fois par chargement, pas en boucle. */
  const retried = useRef(false);
  const request = useRef(0);

  const load = useCallback(
    (showLoading: boolean) => {
      const current = ++request.current;
      if (showLoading) setState({ status: 'loading' });
      listInterventionPhotos(interventionId).then(
        (photos) => {
          if (current !== request.current) return;
          retried.current = false;
          setState({ status: 'ready', photos });
        },
        (error: unknown) => {
          if (current !== request.current) return;
          setState({ status: 'error', message: describeCleaningError(error).message });
        },
      );
    },
    [interventionId],
  );

  // Adresses redemandées juste avant la première expiration, tant que la galerie est ouverte.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const expiries = state.photos
      .map((photo) => (photo.downloadExpiresAt ? new Date(photo.downloadExpiresAt).getTime() : NaN))
      .filter((time) => Number.isFinite(time));
    if (!expiries.length) return;
    const delay = Math.max(MIN_REFRESH_MS, Math.min(...expiries) - Date.now() - EXPIRY_MARGIN_MS);
    // Au-delà de la limite de `setTimeout` (environ 24 jours), le minuteur partirait aussitôt.
    if (delay > MAX_TIMEOUT_MS) return;
    const timer = setTimeout(() => load(false), delay);
    return () => clearTimeout(timer);
  }, [state, load]);

  const open = state.status !== 'closed';
  function toggle() {
    if (open) {
      request.current += 1;
      setState({ status: 'closed' });
    } else load(true);
  }

  function imageFailed() {
    if (retried.current) return;
    retried.current = true;
    load(false);
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="ghost"
        className="-ml-3 justify-self-start"
        aria-expanded={open}
        aria-controls={`${id}-photos`}
        onClick={toggle}
      >
        <IconImage className="size-4" />
        {open ? t.photosHide : t.photosShow(count)}
      </Button>
      <div id={`${id}-photos`} hidden={!open} className="grid gap-3">
        {state.status === 'loading' ? (
          <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <span className="sr-only">{t.photosLoading}</span>
            <Skeleton className="rounded-control aspect-[4/3]" />
            <Skeleton className="rounded-control aspect-[4/3]" />
          </div>
        ) : null}
        {state.status === 'error' ? (
          <div className="grid justify-items-start gap-2">
            <FormMessage>{`${t.photosError} ${state.message}`}</FormMessage>
            <Button variant="secondary" onClick={() => load(true)}>
              {cleaningTexts.common.retry}
            </Button>
          </div>
        ) : null}
        {state.status === 'ready' ? (
          state.photos.length ? (
            <>
              {(['before', 'after'] as const).map((kind) => {
                const photos = state.photos.filter((photo) => photo.kind === kind);
                if (!photos.length) return null;
                return (
                  <figure key={kind} className="grid gap-2">
                    <figcaption className="text-small text-ink-muted font-semibold">
                      {kind === 'before' ? t.photoBefore : t.photoAfter} ({photos.length})
                    </figcaption>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photos.map((photo) => (
                        <li key={photo.fileId}>
                          {photo.downloadUrl ? (
                            <a
                              href={photo.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-control border-line bg-surface-sunken focus-visible:outline-focus block overflow-hidden border focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- adresse signée de courte durée : jamais par l'optimiseur (cache partagé). */}
                              <img
                                src={photo.downloadUrl}
                                alt={t.photoAlt(photo.kind, date)}
                                loading="lazy"
                                decoding="async"
                                onError={imageFailed}
                                className="aspect-[4/3] w-full object-cover"
                              />
                              <span className="sr-only"> ({t.photoOpen})</span>
                            </a>
                          ) : (
                            <span className="rounded-control border-line bg-surface-sunken text-small text-ink-muted grid aspect-[4/3] place-items-center border p-2 text-center">
                              {t.photoUnavailable}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </figure>
                );
              })}
            </>
          ) : (
            <p className="text-small text-ink-muted">{t.photosEmpty}</p>
          )
        ) : null}
      </div>
    </div>
  );
}
