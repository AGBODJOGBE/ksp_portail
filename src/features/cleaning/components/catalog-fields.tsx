'use client';

import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { inputClasses } from '@/components/ui/field';
import {
  IconApartment,
  IconConstruction,
  IconHouse,
  IconNettoyage,
  IconOffice,
  IconVilla,
  type IconProps,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { visibleOffers } from '@/features/cleaning/draft';
import type { Catalog, Parameter, PlaceTypeDetail } from '@/features/cleaning/schemas';
import { simulatorTexts as t } from '@/features/cleaning/simulator-texts';
import { ChoicePill, Fieldset, SelectField } from './fields';

/*
 * Champs pilotés par le catalogue de la gateway : lieu (catégories et lieux), types de nettoyage (packs
 * compris) et paramètres (nombre, choix, oui/non) avec leurs bornes, leur unité et leur aide.
 */

type Icon = ComponentType<IconProps>;

/** Pictogramme d'un lieu d'après son code d'icône (catalogue) ; repli sur le pictogramme du Nettoyage. */
const PLACE_ICONS: Record<string, Icon> = {
  house: IconHouse,
  villa: IconVilla,
  apartment: IconApartment,
  office: IconOffice,
  construction: IconConstruction,
  site: IconConstruction,
};

export function PlaceTypeIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Component = (icon && PLACE_ICONS[icon]) || IconNettoyage;
  return <Component className={className} />;
}

/** Choix du lieu, par catégorie. */
export function PlaceTypePicker({
  catalog,
  value,
  onChange,
  error,
  id,
}: {
  catalog: Catalog;
  value: string | null;
  onChange: (placeTypeId: string, freeDescription: boolean) => void;
  error?: string | null;
  id: string;
}) {
  return (
    <Fieldset id={id} legend={t.placeLegend} hint={t.placeHint} error={error} legendClassName="text-lg">
      <div className="grid gap-6">
        {catalog.data.map((category) => (
          <div key={category.id} className="grid gap-3">
            <p className="text-small text-ink-muted font-semibold tracking-wide uppercase">{category.name}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.placeTypes.map((placeType) => (
                <label
                  key={placeType.id}
                  className={cn(
                    'rounded-card border-line bg-surface relative flex min-h-16 cursor-pointer items-start gap-3 border p-4 shadow-xs',
                    'has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                    'ease-soft hover:border-line-strong transition-colors duration-(--motion-fast)',
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-lieu`}
                    className="sr-only"
                    checked={value === placeType.id}
                    onChange={() => onChange(placeType.id, placeType.freeDescription)}
                  />
                  <span
                    aria-hidden="true"
                    className="rounded-icon bg-brand-soft text-brand-ink grid size-11 shrink-0 place-items-center"
                  >
                    <PlaceTypeIcon icon={placeType.icon} className="size-6" />
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="text-ink font-semibold">{placeType.name}</span>
                    {placeType.description ? (
                      <span className="text-small text-ink-muted">{placeType.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Fieldset>
  );
}

/** Types de nettoyage proposés pour le lieu ; un pack choisi masque ses types. */
export function CleaningTypePicker({
  detail,
  selected,
  onToggle,
  error,
  id,
}: {
  detail: PlaceTypeDetail;
  selected: ReadonlyArray<string>;
  onToggle: (typeId: string) => void;
  error?: string | null;
  id: string;
}) {
  const offers = visibleOffers(detail, selected);
  if (!detail.offers.length) return <p className="text-ink-muted">{t.noOffer}</p>;
  return (
    <Fieldset id={id} legend={t.typesLegend} hint={t.typesHint} error={error} legendClassName="text-lg">
      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((offer) => (
          <ChoicePill
            key={offer.offerId}
            type="checkbox"
            checked={selected.includes(offer.cleaningType.id)}
            onChange={() => onToggle(offer.cleaningType.id)}
            label={
              <span className="inline-flex flex-wrap items-center gap-2">
                {offer.cleaningType.name}
                {offer.cleaningType.isPack ? <Badge tone="accent">{t.pack}</Badge> : null}
              </span>
            }
            hint={offer.cleaningType.description}
          />
        ))}
      </div>
    </Fieldset>
  );
}

/** Un paramètre : nombre (avec unité et bornes), choix, ou oui/non. */
export function ParameterField({
  parameter,
  value,
  onChange,
  error,
  idPrefix,
}: {
  parameter: Parameter;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${parameter.code}`;
  const label = (
    <>
      {parameter.label}
      {parameter.required ? (
        <span aria-hidden="true" className="text-danger">
          {' '}
          *
        </span>
      ) : null}
      {parameter.required ? <span className="sr-only"> ({t.required})</span> : null}
    </>
  );
  const range =
    parameter.kind === 'number' && (parameter.min !== null || parameter.max !== null)
      ? `${parameter.min ?? 0} à ${parameter.max ?? '…'}${parameter.unit ? ` ${parameter.unit}` : ''}`
      : null;
  const hint = [parameter.help, range].filter(Boolean).join(' · ') || undefined;

  if (parameter.kind === 'boolean') {
    return (
      <Fieldset id={id} legend={label} hint={hint} error={error}>
        <div className="flex flex-wrap gap-3">
          {(['yes', 'no'] as const).map((choice) => (
            <ChoicePill
              key={choice}
              name={id}
              checked={value === choice}
              onChange={() => onChange(choice)}
              label={choice === 'yes' ? t.yes : t.no}
              className="min-w-28"
            />
          ))}
        </div>
      </Fieldset>
    );
  }

  if (parameter.kind === 'choice') {
    const choices = parameter.choices.filter((choice) => choice.active);
    if (choices.length <= 4) {
      return (
        <Fieldset id={id} legend={label} hint={hint} error={error}>
          <div className="flex flex-wrap gap-3">
            {choices.map((choice) => (
              <ChoicePill
                key={choice.code}
                name={id}
                checked={value === choice.code}
                onChange={() => onChange(choice.code)}
                label={choice.label}
              />
            ))}
          </div>
        </Fieldset>
      );
    }
    return (
      <SelectField
        id={id}
        label={label}
        hint={hint}
        error={error}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{t.choose}</option>
        {choices.map((choice) => (
          <option key={choice.code} value={choice.code}>
            {choice.label}
          </option>
        ))}
      </SelectField>
    );
  }

  const ids = { hint: `${id}-aide`, error: `${id}-erreur` };
  return (
    <div>
      <label htmlFor={id} className="text-ink block font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <div className="relative mt-2">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hint ? ids.hint : null, error ? ids.error : null) || undefined}
          className={inputClasses({ invalid: !!error, className: parameter.unit ? 'pr-24' : undefined })}
        />
        {parameter.unit ? (
          <span
            aria-hidden="true"
            className="text-ink-muted pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm"
          >
            {parameter.unit}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={ids.error} className="text-small text-danger mt-2 font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Paramètres du lieu et des types choisis, dans l'ordre du catalogue. */
export function ParameterFields({
  parameters,
  values,
  errors,
  onChange,
  idPrefix,
}: {
  parameters: ReadonlyArray<Parameter>;
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (code: string, value: string) => void;
  idPrefix: string;
}) {
  if (!parameters.length) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {parameters.map((parameter) => (
        <div key={parameter.code} className={parameter.kind === 'number' ? undefined : 'sm:col-span-2'}>
          <ParameterField
            parameter={parameter}
            value={values[parameter.code] ?? ''}
            onChange={(value) => onChange(parameter.code, value)}
            error={errors[`values.${parameter.code}`]}
            idPrefix={idPrefix}
          />
        </div>
      ))}
    </div>
  );
}
