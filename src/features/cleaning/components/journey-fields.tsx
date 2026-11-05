'use client';

import type { ReactNode } from 'react';
import { FieldError, inputClasses } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { boundsOf, fieldId } from '@/features/cleaning/journey';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import type { FormField } from '@/features/cleaning/schemas';

const t = journeyTexts.services;

/** Au-delà, un choix s'affiche en liste déroulante plutôt qu'en pastilles. */
const MAX_PILLS = 4;

/** Pastilles à choix unique (boutons radio natifs) : flèches du clavier, focus visible, cible de 44 px. */
export function ChoicePills({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  errorKey,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorKey: string;
}) {
  const id = fieldId(errorKey);
  const describedBy = cn(hint ? `${id}-aide` : null, error ? `${id}-erreur` : null) || undefined;
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={error ? true : undefined} className="min-w-0">
      <legend className="text-ink font-semibold">{legend}</legend>
      {hint ? (
        <p id={`${id}-aide`} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option, index) => (
          <label
            key={option.value}
            className={cn(
              'relative inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[0.9375rem] font-medium select-none',
              'ease-soft transition-colors duration-(--motion-fast)',
              'bg-surface text-ink hover:bg-surface-sunken',
              error ? 'border-danger' : 'border-line-control',
              'has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-on-brand',
              'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
            )}
          >
            <input
              type="radio"
              name={name}
              id={index === 0 ? id : undefined}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <FieldError id={`${id}-erreur`}>{error}</FieldError> : null}
    </fieldset>
  );
}

/**
 * Un champ du formulaire d'une prestation (ADR-033) : nombre entier (avec son unité et ses bornes),
 * choix parmi des valeurs, ou oui/non. Rien de calculé : la saisie brute est gardée telle quelle.
 */
export function AnswerField({
  field,
  value,
  onChange,
  errorKey,
  error,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  errorKey: string;
  error?: string;
}) {
  const label = (
    <>
      {field.label}
      {field.required ? null : <span className="text-ink-muted font-normal"> {t.optional}</span>}
    </>
  );
  const id = fieldId(errorKey);

  if (field.type === 'number') {
    const { max } = boundsOf(field);
    const range = t.range(field.min, field.max, field.unitLabel);
    const hint = [field.helpText, range].filter(Boolean).join(' ');
    const describedBy = cn(hint ? `${id}-aide` : null, error ? `${id}-erreur` : null) || undefined;
    return (
      <div>
        <label htmlFor={id} className="text-ink block font-semibold">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-aide`} className="text-small text-ink-muted mt-1">
            {hint}
          </p>
        ) : null}
        {/* L'unité reste visible à droite du nombre (« m² », « fenêtres »), sans entrer dans la saisie. */}
        <div className="relative mt-2">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={String(max).length}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={inputClasses({
              invalid: !!error,
              className: cn('tabular-nums', field.unitLabel && 'pr-28'),
            })}
          />
          {field.unitLabel ? (
            <span
              aria-hidden="true"
              className="text-small text-ink-muted pointer-events-none absolute inset-y-0 right-4 flex max-w-24 items-center truncate"
            >
              {field.unitLabel}
            </span>
          ) : null}
        </div>
        {error ? <FieldError id={`${id}-erreur`}>{error}</FieldError> : null}
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <ChoicePills
        name={id}
        legend={label}
        hint={field.helpText ?? undefined}
        options={[
          { value: 'yes', label: t.yes },
          { value: 'no', label: t.no },
        ]}
        value={value}
        onChange={onChange}
        error={error}
        errorKey={errorKey}
      />
    );
  }

  if (field.type === 'choice' && field.choices.length <= MAX_PILLS) {
    return (
      <ChoicePills
        name={id}
        legend={label}
        hint={field.helpText ?? undefined}
        options={field.choices.map((choice) => ({ value: choice.code, label: choice.label }))}
        value={value}
        onChange={onChange}
        error={error}
        errorKey={errorKey}
      />
    );
  }

  if (field.type === 'choice') {
    const describedBy = cn(field.helpText ? `${id}-aide` : null, error ? `${id}-erreur` : null) || undefined;
    return (
      <div>
        <label htmlFor={id} className="text-ink block font-semibold">
          {label}
        </label>
        {field.helpText ? (
          <p id={`${id}-aide`} className="text-small text-ink-muted mt-1">
            {field.helpText}
          </p>
        ) : null}
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={inputClasses({ invalid: !!error, className: 'mt-2' })}
        >
          <option value="">{t.choose}</option>
          {field.choices.map((choice) => (
            <option key={choice.code} value={choice.code}>
              {choice.label}
            </option>
          ))}
        </select>
        {error ? <FieldError id={`${id}-erreur`}>{error}</FieldError> : null}
      </div>
    );
  }

  // Type ajouté par la gateway après ce front : rien à saisir ici.
  return null;
}
