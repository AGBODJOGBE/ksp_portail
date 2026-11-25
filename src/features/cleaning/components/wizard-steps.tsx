'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { SkeletonCards } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatSlot, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { type ValuesBody, getPlace, listPlaces } from '@/features/cleaning/api';
import {
  MAX_COMMENT,
  MAX_PHOTOS,
  type RequestDraft,
  buildSlots,
  keptTypes,
  relevantParameters,
  buildValues,
} from '@/features/cleaning/draft';
import { describeCleaningError } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { wizardTexts as t } from '@/features/cleaning/request-texts';
import { describeSchedule, buildSchedule } from '@/features/cleaning/schedule';
import type { Place, PlaceTypeDetail } from '@/features/cleaning/schemas';
import { SummaryRow, TextAreaField } from './fields';
import { PhotoPicker } from './photo-picker';
import { PlaceForm } from './place-form';
import { PricingFigures } from './simulation-result';
import { useSimulation } from './use-public';

const loadPlaces = () => listPlaces({ limit: 100 });

/** Étape « Adresse du lieu » : un lieu de « Mes lieux » du même type, ou un nouveau lieu sur la carte. */
export function PlaceStep({
  draft,
  detail,
  onChange,
  error,
}: {
  draft: RequestDraft;
  detail: PlaceTypeDetail;
  onChange: (placeId: string | null, place?: Place) => void;
  error: string | null;
}) {
  const places = useResource(loadPlaces);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const placeCodes = new Set(detail.parameters.map((parameter) => parameter.code));
  const { values } = buildValues(
    relevantParameters(detail, keptTypes(detail, draft.cleaningTypeIds)),
    draft.values,
  );
  const declaredValues: ValuesBody = Object.fromEntries(
    Object.entries(values).filter(([code]) => placeCodes.has(code)),
  );

  if (places.state.status === 'loading') return <SkeletonCards label={t.placesLoading} rows={2} />;
  if (places.state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{describeCleaningError(places.state.error).message}</FormMessage>
        <Button variant="secondary" onClick={places.reload}>
          {t.retry}
        </Button>
      </div>
    );
  }
  const all = places.state.data.data;
  const sameType = all.filter((place) => place.placeTypeId === detail.placeType.id);
  const others = all.length - sameType.length;

  return (
    <div className="grid gap-6">
      {saved ? <FormMessage tone="success">{t.placeSaved}</FormMessage> : null}
      {sameType.length ? (
        <fieldset className="grid gap-3">
          <legend className="text-ink text-lg font-semibold">{t.placesTitle}</legend>
          {sameType.map((place) => {
            const usable = !!place.location && place.served;
            return (
              <label
                key={place.id}
                className={cn(
                  'rounded-card border-line bg-surface flex min-h-16 items-start gap-3 border p-4 shadow-xs',
                  usable ? 'cursor-pointer' : 'opacity-75',
                  'has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                )}
              >
                <input
                  type="radio"
                  name="demande-lieu"
                  className="accent-action mt-1 size-5"
                  checked={draft.placeId === place.id}
                  disabled={!usable}
                  onChange={() => onChange(place.id, place)}
                />
                <span className="grid min-w-0 gap-1">
                  <span className="text-ink font-semibold">{place.name}</span>
                  <span className="text-small text-ink-muted">
                    {place.communeName}
                    {place.location?.landmark ? ` · ${place.location.landmark}` : ''}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {!place.location ? <Badge tone="warning">{t.placeMissingLocation}</Badge> : null}
                    {!place.served ? <Badge tone="danger">{t.placeNotServed}</Badge> : null}
                  </span>
                  {!place.location ? (
                    <Link
                      href={cleaningPaths.place(place.id)}
                      className="text-small text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                    >
                      {t.fixPlace}
                    </Link>
                  ) : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <p className="text-ink-muted">{t.noPlace}</p>
      )}
      {others > 0 ? <p className="text-small text-ink-muted">{t.placesOtherType(others)}</p> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      {adding || !sameType.length ? (
        <div className="rounded-card border-line bg-surface-muted grid gap-4 border p-4 sm:p-6">
          <h3 className="font-display text-ink text-lg font-semibold">{t.addPlaceTitle}</h3>
          <PlaceForm
            placeTypeId={detail.placeType.id}
            declaredValues={declaredValues}
            onSaved={(place) => {
              setAdding(false);
              setSaved(true);
              onChange(place.id, place);
              places.refresh();
            }}
            onCancel={sameType.length ? () => setAdding(false) : undefined}
          />
        </div>
      ) : (
        <Button variant="secondary" className="justify-self-start" onClick={() => setAdding(true)}>
          {t.addPlace}
        </Button>
      )}
    </div>
  );
}

/** Étape « Photos et précisions » : photos facultatives (service file) et un mot pour l'équipe. */
export function DetailsStep({
  draft,
  onChange,
  errors,
}: {
  draft: RequestDraft;
  onChange: (patch: Partial<RequestDraft>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-8">
      <PhotoPicker
        photos={draft.photos}
        max={MAX_PHOTOS}
        onChange={(photos) => onChange({ photos })}
        legend={t.photosLegend}
        hint={t.photosHint}
        error={errors['photoFileIds']}
      />
      <TextAreaField
        id="demande-commentaire"
        label={t.commentLabel}
        hint={t.commentHint}
        value={draft.comment}
        maxLength={MAX_COMMENT}
        onChange={(event) => onChange({ comment: event.target.value })}
        counter={t.counter(draft.comment.length, MAX_COMMENT)}
        error={errors['comment']}
      />
    </div>
  );
}

/** Étape « Récapitulatif » : tout ce qui part, l'estimation avec la commune du lieu, les frais de visite. */
export function ReviewStep({
  draft,
  detail,
  place,
  onEdit,
  termsHref,
}: {
  draft: RequestDraft;
  detail: PlaceTypeDetail;
  place: Place | null;
  onEdit: (step: RequestDraft['step']) => void;
  termsHref: string;
}) {
  // Brouillon repris à cette étape : le lieu choisi est relu.
  const placeId = draft.placeId;
  const loadPlace = useCallback(
    () => (place || !placeId ? Promise.resolve(place) : getPlace(placeId)),
    [place, placeId],
  );
  const placeResource = useResource(loadPlace);
  const chosen = placeResource.state.status === 'ready' ? placeResource.state.data : place;
  const types = draft.freeDescription ? [] : keptTypes(detail, draft.cleaningTypeIds);
  const parameters = relevantParameters(detail, types);
  const { values } = buildValues(parameters, draft.values);
  const schedule = buildSchedule(draft.schedule);
  const slots = buildSlots(draft.slots).slots;
  const body =
    !draft.freeDescription && types.length && 'plan' in schedule
      ? {
          placeTypeId: detail.placeType.id,
          cleaningTypeIds: types,
          values,
          schedule: schedule.plan,
          ...(chosen ? { communeKey: chosen.communeKey } : {}),
        }
      : null;
  const estimate = useSimulation(body);
  const estimateData =
    estimate.status === 'ready' ? estimate.data : estimate.status === 'idle' ? null : estimate.last;
  const typeNames = detail.offers
    .filter((offer) => types.includes(offer.cleaningType.id))
    .map((offer) => offer.cleaningType.name);

  const section = (step: RequestDraft['step'], title: string, content: ReactNode) => (
    <div className="border-line grid gap-2 border-b pb-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-ink font-semibold">{title}</h3>
        <Button variant="ghost" onClick={() => onEdit(step)} aria-label={`${t.edit} : ${title}`}>
          {t.edit}
        </Button>
      </div>
      <div className="text-ink">{content}</div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="grid gap-4 lg:col-span-7">
        {section(
          'place',
          t.reviewPlace,
          chosen ? (
            <p>
              <strong className="font-semibold">{chosen.name}</strong> — {chosen.placeTypeName},{' '}
              {chosen.communeName}
              {chosen.location?.landmark ? (
                <span className="text-ink-muted block text-sm">{chosen.location.landmark}</span>
              ) : null}
            </p>
          ) : (
            '—'
          ),
        )}
        {draft.freeDescription
          ? section('params', t.reviewNeed, <p className="whitespace-pre-line">{draft.description}</p>)
          : section('type', t.reviewTypes, <p>{typeNames.join(', ') || '—'}</p>)}
        {parameters.length
          ? section(
              'params',
              t.reviewValues,
              <dl className="grid gap-0">
                {parameters
                  .filter((parameter) => (draft.values[parameter.code] ?? '') !== '')
                  .map((parameter) => {
                    const raw = draft.values[parameter.code] ?? '';
                    const display =
                      parameter.kind === 'boolean'
                        ? raw === 'yes'
                          ? 'Oui'
                          : 'Non'
                        : parameter.kind === 'choice'
                          ? (parameter.choices.find((choice) => choice.code === raw)?.label ?? raw)
                          : `${raw}${parameter.unit ? ` ${parameter.unit}` : ''}`;
                    return (
                      <SummaryRow key={parameter.code} label={parameter.label}>
                        {display}
                      </SummaryRow>
                    );
                  })}
              </dl>,
            )
          : null}
        {section(
          'schedule',
          t.reviewSchedule,
          <p>{'plan' in schedule ? describeSchedule(schedule.plan) : '—'}</p>,
        )}
        {section(
          'slots',
          t.reviewSlots,
          <ul className="grid gap-1">
            {slots.map((slot) => (
              <li key={slot.start}>{formatSlot(slot)}</li>
            ))}
          </ul>,
        )}
        {section(
          'details',
          t.steps.details,
          <div className="grid gap-1">
            <p>{t.reviewPhotos(draft.photos.length)}</p>
            {draft.comment.trim() ? (
              <p className="text-ink-muted whitespace-pre-line">{draft.comment.trim()}</p>
            ) : null}
          </div>,
        )}
      </div>
      <div className="grid content-start gap-4 lg:col-span-5">
        {estimateData ? (
          <section
            aria-labelledby="recap-estimation"
            className="rounded-card border-line bg-surface-muted border p-4 sm:p-5"
          >
            <h3 id="recap-estimation" className="text-ink font-semibold">
              {t.estimateTitle}
            </h3>
            <div className="mt-3">
              <PricingFigures pricing={estimateData.pricing} />
            </div>
            <p className="text-small text-ink-muted mt-3">{estimateData.disclaimer}</p>
          </section>
        ) : null}
        <section
          aria-labelledby="recap-frais"
          className="rounded-card border-accent-muted bg-accent-soft border p-4 sm:p-5"
        >
          <h3 id="recap-frais" className="text-ink font-semibold">
            {t.visitFeeTitle}
          </h3>
          <p className="font-display text-figure-sm text-ink mt-2 font-semibold tabular-nums">
            {formatXof(estimateData?.pricing.visitFee ?? detail.visitFee)}
          </p>
          <p className="text-small text-ink mt-2">{t.visitFeeText}</p>
          <Link
            href={termsHref}
            target="_blank"
            className="text-small text-brand-ink mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            {t.termsLink}
          </Link>
        </section>
      </div>
    </div>
  );
}
