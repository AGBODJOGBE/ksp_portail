'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FieldError, TextField, fieldIds, inputClasses } from '@/components/ui/field';
import { IconAlert, IconLocate, IconPin } from '@/components/ui/icons';
import { contactHref } from '@/config/navigation';
import { ApiError, session } from '@/lib/api';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';
import { resolveLocation } from '@/features/cleaning/api';
import {
  type AddressDraft,
  fieldId,
  MAX_LANDMARK,
  OTHER_COMMUNE,
  outOfZone,
} from '@/features/cleaning/journey';
import { journeyTexts, servedLine } from '@/features/cleaning/journey-texts';
import type { ServedZone } from '@/features/cleaning/schemas';
import type { StepProps } from './journey';

const t = journeyTexts.address;

type LocateState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'resolving' }
  /** Pas de session : la commune sera retrouvée à l'envoi (la route demande un client connecté). */
  | { status: 'later' }
  | { status: 'error'; message: string };

const GEO_ERRORS: Record<number, string> = { 1: t.denied, 2: t.unavailable, 3: t.timeout };

/** Coordonnées arrondies au millionième de degré (une dizaine de centimètres) : assez pour un GPS. */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Commune d'une position (`POST /cleaning/locations/resolve`, client connecté seulement). Sans session,
 * la commune est retrouvée par la gateway au moment de l'envoi : rien n'est demandé ici.
 */
export function useResolveLocation(
  address: AddressDraft,
  setResolved: (resolved: AddressDraft['resolved']) => void,
): LocateState {
  const [outcome, setOutcome] = useState<{ key: string; state: LocateState } | null>(null);
  const location = address.location;
  const needed = !!location && !address.resolved;
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const key = needed ? `${latitude},${longitude}` : '';

  useEffect(() => {
    if (!key || latitude === undefined || longitude === undefined) return;
    let active = true;
    const finish = (state: LocateState) => active && setOutcome({ key, state });
    session
      .restore()
      .then(async (result) => {
        if (result.status !== 'authenticated') return finish({ status: 'later' });
        const found = await resolveLocation({ latitude, longitude });
        if (!active) return;
        setResolved({ commune: found.commune, served: found.served, displayAddress: found.displayAddress });
        finish({ status: 'idle' });
      })
      .catch((error: unknown) => {
        const later = error instanceof ApiError && error.status === 401;
        finish(later ? { status: 'later' } : { status: 'error', message: t.resolveError });
      });
    return () => {
      active = false;
    };
  }, [key, latitude, longitude, setResolved]);

  if (!key) return { status: 'idle' };
  return outcome?.key === key ? outcome.state : { status: 'resolving' };
}

/** Message hors zone, avec le contact : le client sait tout de suite à quoi s'en tenir. */
export function OutOfZoneNotice({
  commune,
  zones,
  id,
}: {
  commune: string | null;
  zones: ReadonlyArray<ServedZone>;
  id?: string;
}) {
  return (
    <div
      id={id}
      role="alert"
      className="rounded-card border-warning bg-warning-soft grid justify-items-start gap-3 border p-4 sm:p-5"
    >
      <p className="text-ink flex items-start gap-2 font-semibold">
        <IconAlert className="text-warning mt-0.5 size-5" />
        {t.outOfZoneTitle}
      </p>
      <p className="text-small text-ink">
        {frenchSpacing(t.outOfZone(commune, servedLine(zones.map((zone) => zone.commune))))}
      </p>
      <ButtonLink href={contactHref('nettoyage-devis')} variant="secondary">
        {journeyTexts.contactUs}
      </ButtonLink>
    </div>
  );
}

/**
 * Étape 3 : position GPS (« Me localiser », permission demandée seulement au clic), commune en repli,
 * quartier et point de repère. La gateway retrouve la commune depuis la position et reste seule juge de
 * la zone desservie.
 */
export function AddressStep({ draft, zones, errors, update, clearError }: StepProps) {
  const address = draft.address;
  const [locating, setLocating] = useState<LocateState>({ status: 'idle' });
  const watching = useRef(true);
  const setAddress = useCallback(
    (patch: Partial<AddressDraft>) =>
      update((current) => ({ ...current, address: { ...current.address, ...patch } })),
    [update],
  );
  const setResolved = useCallback(
    (resolved: AddressDraft['resolved']) => setAddress({ resolved }),
    [setAddress],
  );
  const resolving = useResolveLocation(address, setResolved);

  useEffect(() => {
    watching.current = true;
    return () => {
      watching.current = false;
    };
  }, []);

  function locate() {
    if (!('geolocation' in navigator)) {
      setLocating({ status: 'error', message: t.unsupported });
      return;
    }
    setLocating({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!watching.current) return;
        const accuracy = Math.round(position.coords.accuracy);
        setAddress({
          location: {
            latitude: round(position.coords.latitude),
            longitude: round(position.coords.longitude),
            ...(Number.isFinite(accuracy) && accuracy <= 100_000 ? { accuracyMeters: accuracy } : {}),
          },
          resolved: null,
        });
        clearError('address.location');
        clearError('address.commune');
        setLocating({ status: 'idle' });
      },
      (error) => {
        if (!watching.current) return;
        setLocating({ status: 'error', message: GEO_ERRORS[error.code] ?? t.unavailable });
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    );
  }

  const located = address.location;
  const resolved = address.resolved;
  const away = outOfZone(address);
  const showCommune = !(resolved?.served && resolved.commune);
  const positionError = errors['address.location'];
  const communeError = away ? null : errors['address.commune'];
  const communeIds = fieldIds(fieldId('address.commune'));
  const landmarkIds = fieldIds(fieldId('address.landmark'));
  const status = locating.status === 'locating' ? locating : resolving;

  return (
    <div className="grid max-w-2xl gap-6">
      <section
        aria-labelledby="demande-position-titre"
        className={cn(
          'rounded-card bg-surface grid gap-4 border p-5 shadow-xs sm:p-6',
          positionError ? 'border-danger' : 'border-line',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="bg-brand-soft text-brand-ink grid size-10 shrink-0 place-items-center rounded-full"
          >
            <IconPin className="size-5" />
          </span>
          <div className="grid gap-1">
            <h3 id="demande-position-titre" className="font-display text-ink text-lg font-semibold">
              {t.positionTitle}
            </h3>
            <p className="text-small text-ink-muted">{frenchSpacing(t.positionHint)}</p>
          </div>
        </div>

        <Button
          id={fieldId('address.location')}
          variant={located ? 'secondary' : 'action'}
          size="lg"
          onClick={locate}
          disabled={locating.status === 'locating'}
          aria-busy={locating.status === 'locating' || undefined}
          aria-describedby={positionError ? `${fieldId('address.location')}-erreur` : undefined}
          className="w-full sm:w-auto sm:justify-self-start"
        >
          <IconLocate />
          {locating.status === 'locating' ? t.locating : located ? t.relocate : t.locate}
        </Button>

        <div role="status" className="grid gap-2 empty:hidden">
          {located && locating.status !== 'locating' ? (
            <p className="text-small text-ink font-medium">{t.located(located.accuracyMeters ?? null)}</p>
          ) : null}
          {status.status === 'locating' ? null : status.status === 'resolving' ? (
            <p className="text-small text-ink-muted">{t.resolving}</p>
          ) : null}
          {status.status === 'later' && located ? (
            <p className="text-small text-ink-muted">{frenchSpacing(t.resolveLater)}</p>
          ) : null}
          {resolved?.commune && resolved.served ? (
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ink font-semibold">{t.found(resolved.commune)}</span>
              <Badge tone="success" dot>
                {t.served}
              </Badge>
            </p>
          ) : null}
          {resolved?.displayAddress ? (
            <p className="text-small text-ink-muted">{resolved.displayAddress}</p>
          ) : null}
          {resolved && !resolved.commune ? (
            <p className="text-small text-ink">{frenchSpacing(t.notFound)}</p>
          ) : null}
        </div>

        {locating.status === 'error' || status.status === 'error' ? (
          <p className="text-small text-danger flex items-start gap-2 font-medium">
            <IconAlert className="mt-0.5 size-4" />
            {locating.status === 'error' ? locating.message : status.status === 'error' ? status.message : ''}
          </p>
        ) : null}
        {positionError ? (
          <FieldError id={`${fieldId('address.location')}-erreur`}>{positionError}</FieldError>
        ) : null}
        {!located ? <p className="text-small text-ink-muted">{frenchSpacing(t.positionHelp)}</p> : null}
      </section>

      {away ? (
        <OutOfZoneNotice commune={away.commune} zones={zones} id={`${fieldId('address.commune')}-zone`} />
      ) : null}

      {showCommune ? (
        <div>
          <label htmlFor={fieldId('address.commune')} className="text-ink block font-semibold">
            {t.commune}
          </label>
          <p id={communeIds.hint} className="text-small text-ink-muted mt-1">
            {t.communeHint}
          </p>
          <select
            id={fieldId('address.commune')}
            value={address.commune}
            onChange={(event) => {
              setAddress({ commune: event.target.value });
              clearError('address.commune');
            }}
            aria-invalid={communeError ? true : undefined}
            aria-describedby={cn(communeIds.hint, communeError ? communeIds.error : null)}
            className={inputClasses({ invalid: !!communeError, className: 'mt-2' })}
          >
            <option value="">{journeyTexts.services.choose}</option>
            {zones.map((zone) => (
              <option key={zone.code} value={zone.commune}>
                {zone.commune}
              </option>
            ))}
            <option value={OTHER_COMMUNE}>{t.otherCommune}</option>
          </select>
          {communeError ? <FieldError id={communeIds.error}>{communeError}</FieldError> : null}
        </div>
      ) : null}

      <TextField
        id={fieldId('address.district')}
        label={t.district}
        hint={t.districtHint}
        autoComplete="address-level3"
        maxLength={100}
        value={address.district}
        onChange={(event) => setAddress({ district: event.target.value })}
      />

      <div>
        <label htmlFor={fieldId('address.landmark')} className="text-ink block font-semibold">
          {t.landmark}
        </label>
        <p id={landmarkIds.hint} className="text-small text-ink-muted mt-1">
          {frenchSpacing(t.landmarkHint)}
        </p>
        <textarea
          id={fieldId('address.landmark')}
          rows={3}
          maxLength={MAX_LANDMARK}
          required
          value={address.landmark}
          onChange={(event) => {
            setAddress({ landmark: event.target.value });
            clearError('address.landmark');
          }}
          aria-invalid={errors['address.landmark'] ? true : undefined}
          aria-describedby={cn(landmarkIds.hint, errors['address.landmark'] ? landmarkIds.error : null)}
          className={inputClasses({ invalid: !!errors['address.landmark'], className: 'mt-2 py-3' })}
        />
        {errors['address.landmark'] ? (
          <FieldError id={landmarkIds.error}>{errors['address.landmark']}</FieldError>
        ) : null}
      </div>
    </div>
  );
}
