'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { IconLocate } from '@/components/ui/icons';
import {
  type PlaceBody,
  type PlaceUpdateBody,
  type ValuesBody,
  createPlace,
  locatePoint,
  updatePlace,
} from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError, fieldMessage } from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { placeTexts as t } from '@/features/cleaning/place-texts';
import type { Catalog, Place } from '@/features/cleaning/schemas';
import { SelectField } from './fields';
import { PlaceMap, type PlacedPoint } from './place-map';

const MAX_NAME = 100;
const MAX_LANDMARK = 300;

interface Position extends PlacedPoint {
  accuracyMeters: number | null;
}

type Problem =
  { kind: 'notServed'; commune: string | null } | { kind: 'error'; view: CleaningErrorView } | null;

/**
 * Formulaire d'un lieu (« Mes lieux », assistant de demande) : nom, carte (toucher, glisser, clavier,
 * « Utiliser ma position »), repère obligatoire, adresse facultative. À la validation, la position est
 * d'abord vérifiée (`POST /places/locate`) : une commune non desservie est dite sans rien enregistrer ;
 * sinon le lieu est créé (clé d'idempotence) ou modifié.
 */
export function PlaceForm({
  place,
  placeTypeId,
  catalog,
  declaredValues,
  onSaved,
  onCancel,
  submitLabel,
}: {
  /** Lieu à modifier ; absent : création. */
  place?: Place;
  /** Type imposé (demande en cours) ; sinon choisi dans `catalog`. */
  placeTypeId?: string;
  catalog?: Catalog | null;
  /** Paramètres du lieu déclarés dans la demande, gardés avec le lieu. */
  declaredValues?: ValuesBody;
  onSaved: (place: Place) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [typeId, setTypeId] = useState(place?.placeTypeId ?? placeTypeId ?? '');
  const [name, setName] = useState(place?.name ?? '');
  const [landmark, setLandmark] = useState(place?.location?.landmark ?? '');
  const [address, setAddress] = useState(place?.location?.address ?? '');
  const [position, setPosition] = useState<Position | null>(
    place?.location
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
          accuracyMeters: place.location.accuracyMeters,
        }
      : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const submission = useRef(idempotentSubmission());
  const editing = !!place;
  const positionChanged =
    !place?.location ||
    !position ||
    position.latitude !== place.location.latitude ||
    position.longitude !== place.location.longitude;

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setGeoMessage(t.geolocationUnavailable);
      return;
    }
    setLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setLocating(false);
        setPosition({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracyMeters: Number.isFinite(result.coords.accuracy) ? Math.round(result.coords.accuracy) : null,
        });
      },
      (error) => {
        setLocating(false);
        setGeoMessage(
          error.code === error.PERMISSION_DENIED ? t.geolocationDenied : t.geolocationUnavailable,
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!editing && !typeId) found['placeTypeId'] = t.required;
    if (!name.trim()) found['name'] = t.required;
    if (!landmark.trim()) found['landmark'] = t.required;
    if (!position) found['latitude'] = t.positionMissing;
    return found;
  }

  async function submit() {
    const found = validate();
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length || !position) return;
    setBusy(true);
    try {
      if (positionChanged) {
        const located = await locatePoint({ latitude: position.latitude, longitude: position.longitude });
        if (!located.served) {
          setProblem({ kind: 'notServed', commune: located.communeName });
          return;
        }
      }
      const point = {
        latitude: position.latitude,
        longitude: position.longitude,
        ...(position.accuracyMeters ? { accuracyMeters: position.accuracyMeters } : {}),
      };
      let saved: Place;
      if (place) {
        const patch: PlaceUpdateBody = {
          name: name.trim(),
          landmark: landmark.trim(),
          ...(address.trim() !== (place.location?.address ?? '') ? { address: address.trim() } : {}),
          ...(positionChanged ? point : {}),
        };
        saved = await updatePlace(place.id, patch);
      } else {
        const body: PlaceBody = {
          name: name.trim(),
          placeTypeId: typeId,
          landmark: landmark.trim(),
          ...(address.trim() ? { address: address.trim() } : {}),
          ...(declaredValues && Object.keys(declaredValues).length ? { declaredValues } : {}),
          ...point,
        };
        saved = await createPlace(body, submission.current.keyFor(body));
        submission.current.done();
      }
      onSaved(saved);
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      if (view.code === 'CLEANING_ZONE_NOT_COVERED') {
        setProblem({ kind: 'notServed', commune: null });
      } else if (view.kind === 'fields') {
        setErrors({
          ...(fieldMessage(view.fields, 'name') ? { name: fieldMessage(view.fields, 'name') ?? '' } : {}),
          ...(fieldMessage(view.fields, 'landmark')
            ? { landmark: fieldMessage(view.fields, 'landmark') ?? '' }
            : {}),
          ...(fieldMessage(view.fields, 'address')
            ? { address: fieldMessage(view.fields, 'address') ?? '' }
            : {}),
          ...(fieldMessage(view.fields, 'latitude', 'longitude', 'accuracyMeters')
            ? { latitude: fieldMessage(view.fields, 'latitude', 'longitude', 'accuracyMeters') ?? '' }
            : {}),
        });
        setProblem({ kind: 'error', view });
      } else {
        setProblem({ kind: 'error', view });
      }
    } finally {
      setBusy(false);
    }
  }

  const placeTypes = catalog?.data.flatMap((category) =>
    category.placeTypes.map((item) => ({ ...item, category: category.name })),
  );

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {!editing && !placeTypeId ? (
        <SelectField
          id="lieu-type"
          label={t.type}
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          error={errors['placeTypeId']}
          disabled={!placeTypes}
          className="sm:max-w-md"
        >
          <option value="">{placeTypes ? t.choose : t.typesLoading}</option>
          {placeTypes?.map((item) => (
            <option key={item.id} value={item.id}>
              {`${item.category} — ${item.name}`}
            </option>
          ))}
        </SelectField>
      ) : null}
      {editing ? (
        <p className="text-small text-ink-muted">{`${t.type} : ${place.placeTypeName}. ${t.typeHint}`}</p>
      ) : null}

      <TextField
        id="lieu-nom"
        label={t.name}
        hint={t.nameHint}
        value={name}
        maxLength={MAX_NAME}
        autoComplete="off"
        onChange={(event) => setName(event.target.value)}
        error={errors['name']}
        className="sm:max-w-md"
      />

      <div className="grid gap-3">
        <div>
          <p className="text-ink font-semibold" id="lieu-position-titre">
            {t.position}
          </p>
          <p className="text-small text-ink-muted mt-1">{t.positionHint}</p>
        </div>
        <Button
          variant="secondary"
          onClick={locateMe}
          disabled={locating}
          className="w-full sm:w-auto sm:justify-self-start"
        >
          <IconLocate />
          {locating ? t.locating : t.useMyPosition}
        </Button>
        {geoMessage ? <FormMessage tone="info">{geoMessage}</FormMessage> : null}
        <PlaceMap location={position} onPlace={(point) => setPosition({ ...point, accuracyMeters: null })} />
        {position?.accuracyMeters ? (
          <p className="text-small text-ink-muted">{t.accuracy(position.accuracyMeters)}</p>
        ) : null}
        {errors['latitude'] ? <FormMessage>{errors['latitude']}</FormMessage> : null}
      </div>

      <TextField
        id="lieu-repere"
        label={t.landmark}
        hint={t.landmarkHint}
        value={landmark}
        maxLength={MAX_LANDMARK}
        onChange={(event) => setLandmark(event.target.value)}
        error={errors['landmark']}
      />
      <TextField
        id="lieu-adresse"
        label={t.address}
        value={address}
        maxLength={MAX_LANDMARK}
        autoComplete="street-address"
        onChange={(event) => setAddress(event.target.value)}
        error={errors['address']}
      />

      {problem?.kind === 'notServed' ? (
        <FormMessage>{`${t.notServedTitle(problem.commune)}. ${t.notServedText}`}</FormMessage>
      ) : null}
      {problem?.kind === 'error' ? (
        <FormMessage>{problem.view.kind === 'geo' ? t.geoUnavailable : problem.view.message}</FormMessage>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" variant="action" size="lg" disabled={busy}>
          {busy ? t.saving : (submitLabel ?? (editing ? t.saveChanges : t.save))}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
