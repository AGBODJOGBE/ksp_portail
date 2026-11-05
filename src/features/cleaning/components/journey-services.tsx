'use client';

import { FieldError } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconCheck } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';
import {
  communeOf,
  emptyServiceDraft,
  fieldId,
  type JourneyDraft,
  placeOf,
  type ServiceDraft,
  servicesOf,
  toggleService,
} from '@/features/cleaning/journey';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import type { PlaceService } from '@/features/cleaning/schemas';
import type { StepProps } from './journey';
import { JourneyEstimate } from './journey-estimate';
import { AnswerField, ChoicePills } from './journey-fields';

const t = journeyTexts.services;

/** Case à cocher en carte (prestation, option) : la case native reste lisible au clavier. */
const CHECK_CARD = cn(
  'group rounded-card border-line bg-surface relative flex cursor-pointer items-start gap-3 border p-4',
  'ease-soft transition-colors duration-(--motion-fast) hover:border-line-strong',
  'has-[:checked]:border-action has-[:checked]:bg-action-soft',
  'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
);

function CheckMark() {
  return (
    <span
      aria-hidden="true"
      className="border-line-control bg-surface group-has-[:checked]:border-action group-has-[:checked]:bg-action text-on-action mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors duration-(--motion-fast)"
    >
      <IconCheck className="size-3.5 opacity-0 group-has-[:checked]:opacity-100" />
    </span>
  );
}

/** Formulaire d'une prestation cochée : ses champs, ses options (et leurs champs), sa fréquence. */
function ServicePanel({
  service,
  answers,
  errors,
  change,
  clearError,
}: {
  service: PlaceService;
  answers: ServiceDraft;
  errors: StepProps['errors'];
  change: (next: ServiceDraft) => void;
  clearError: (key: string) => void;
}) {
  const titleId = `demande-${service.code}-titre`;
  const prefix = `${service.code}.fields`;
  const { form } = service;
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-card border-line bg-surface swap-in grid gap-6 border p-5 shadow-xs sm:p-6"
    >
      <Heading as="h3" size="h3" id={titleId}>
        {t.details(service.name)}
      </Heading>

      {form.fields.length ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {form.fields.map((field) => {
            const key = `${prefix}.${field.code}`;
            return (
              <AnswerField
                key={field.code}
                field={field}
                value={answers.fields[field.code] ?? ''}
                onChange={(value) => {
                  change({ ...answers, fields: { ...answers.fields, [field.code]: value } });
                  clearError(key);
                }}
                errorKey={key}
                error={errors[key]}
              />
            );
          })}
        </div>
      ) : null}

      {form.options.length ? (
        <fieldset className="grid gap-3">
          <legend className="text-ink font-semibold">{t.options}</legend>
          <p className="text-small text-ink-muted -mt-1">{t.optionsHint}</p>
          {form.options.map((option) => {
            const raw = answers.options[option.code];
            const checked = !!raw;
            return (
              <div key={option.code} className="grid gap-3">
                <label className={CHECK_CARD}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const options = { ...answers.options };
                      if (checked) delete options[option.code];
                      else options[option.code] = {};
                      change({ ...answers, options });
                    }}
                    className="sr-only"
                  />
                  <CheckMark />
                  <span className="grid gap-0.5">
                    <span className="text-ink font-medium">{option.label}</span>
                    {option.description ? (
                      <span className="text-small text-ink-muted">{frenchSpacing(option.description)}</span>
                    ) : null}
                  </span>
                </label>
                {checked && option.fields.length ? (
                  <div className="border-action-muted swap-in ml-2 grid gap-5 border-l-2 pl-4 sm:grid-cols-2">
                    {option.fields.map((field) => {
                      const key = `${service.code}.options.${option.code}.${field.code}`;
                      return (
                        <AnswerField
                          key={field.code}
                          field={field}
                          value={raw[field.code] ?? ''}
                          onChange={(value) => {
                            change({
                              ...answers,
                              options: { ...answers.options, [option.code]: { ...raw, [field.code]: value } },
                            });
                            clearError(key);
                          }}
                          errorKey={key}
                          error={errors[key]}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ) : null}

      {form.frequencies.length ? (
        <ChoicePills
          name={`demande-${service.code}-frequence`}
          legend={t.frequency}
          options={form.frequencies.map((item) => ({ value: item.code, label: item.label }))}
          value={answers.frequency}
          onChange={(value) => {
            change({ ...answers, frequency: value });
            clearError(`${service.code}.frequency`);
          }}
          error={errors[`${service.code}.frequency`]}
          errorKey={`${service.code}.frequency`}
        />
      ) : null}
    </section>
  );
}

/**
 * Étape 2 : prestations proposées par le lieu (choix multiple), formulaire de chacune (ADR-033) et
 * estimation mise à jour en direct, à côté sur ordinateur, dessous sur téléphone.
 */
export function ServicesStep({ draft, catalog, zones, errors, update, clearError }: StepProps) {
  const services = servicesOf(catalog, placeOf(catalog, draft.placeType));
  const selected = services.filter((service) => draft.services.includes(service.code));
  const error = errors['services'];
  const setAnswers = (code: string, next: ServiceDraft) =>
    update((current: JourneyDraft) => ({ ...current, answers: { ...current.answers, [code]: next } }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="grid min-w-0 gap-6">
        <fieldset
          aria-describedby={error ? `${fieldId('services')}-erreur` : undefined}
          className="grid gap-3"
        >
          <legend className="text-ink font-semibold">{t.legend}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((service, index) => (
              <label key={service.code} className={CHECK_CARD}>
                <input
                  type="checkbox"
                  id={index === 0 ? fieldId('services') : undefined}
                  checked={draft.services.includes(service.code)}
                  onChange={() => {
                    update((current) => toggleService(current, catalog, service.code));
                    clearError('services');
                  }}
                  className="sr-only"
                />
                <CheckMark />
                <span className="grid gap-0.5">
                  <span className="text-ink font-semibold">{service.name}</span>
                  <span className="text-small text-ink-muted">{frenchSpacing(service.description)}</span>
                </span>
              </label>
            ))}
          </div>
          {error ? <FieldError id={`${fieldId('services')}-erreur`}>{error}</FieldError> : null}
        </fieldset>

        {selected.map((service) => (
          <ServicePanel
            key={service.code}
            service={service}
            answers={draft.answers[service.code] ?? emptyServiceDraft()}
            errors={errors}
            change={(next) => setAnswers(service.code, next)}
            clearError={clearError}
          />
        ))}
      </div>

      <JourneyEstimate
        catalog={catalog}
        draft={draft}
        commune={communeOf(draft.address, zones)}
        className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
      />
    </div>
  );
}
