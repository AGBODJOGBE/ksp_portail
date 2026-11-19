'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, fieldIds, inputClasses } from '@/components/ui/field';
import { IconCalendar, IconClose, IconInfo } from '@/components/ui/icons';
import { MonthCalendar } from '@/components/ui/month-calendar';
import { cn } from '@/lib/cn';
import { frenchSpacing } from '@/lib/typography';
import type { ScheduleInput, Weekday } from '@/features/cleaning/api';
import {
  endDateOf,
  fieldId,
  firstAllowedDate,
  isDay,
  MAX_COMMENT,
  MAX_EVERY_WEEKS,
  type MonthlyForm,
  PERIOD_LENGTHS,
  periodEnd,
  type PeriodLength,
  SCHEDULE_MODES,
  type ScheduleDraft,
  scheduleInputOf,
  type ScheduleMode,
  type WeekOfMonth,
  WEEKDAYS,
  WEEKS_OF_MONTH,
} from '@/features/cleaning/journey';
import { scheduleTexts as t } from '@/features/cleaning/journey-schedule-texts';
import { formatPlanDay, formatPlanDayLong } from '@/features/cleaning/schedule';
import type { JourneyErrors } from '@/features/cleaning/journey';
import type { StepProps } from './journey';
import { type PreviewState, useSchedulePreview } from './use-schedule-preview';

/** Les dates libres couvrent 36 mois au plus (contrat) : borne de navigation du calendrier. */
const CALENDAR_MONTHS = 36;
/** Avertissements affichés d'emblée ; les suivants sont repliés. */
const WARNINGS_SHOWN = 3;

const WEEKDAY_NAMES: Record<Weekday, [string, string]> = {
  mon: ['Lun', 'lundi'],
  tue: ['Mar', 'mardi'],
  wed: ['Mer', 'mercredi'],
  thu: ['Jeu', 'jeudi'],
  fri: ['Ven', 'vendredi'],
  sat: ['Sam', 'samedi'],
  sun: ['Dim', 'dimanche'],
};

const toggle = <T,>(list: ReadonlyArray<T>, value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** Pastille d'un choix (radio ou case) : 44 px, bleu nuit une fois cochée. */
const PILL = cn(
  'relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 text-[0.9375rem] font-medium select-none',
  'ease-soft transition-colors duration-(--motion-fast)',
  'bg-surface text-ink hover:bg-surface-sunken',
  'has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-on-brand',
  'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
);

/** Groupe de pastilles (choix unique ou multiple), avec sa légende, son aide et son erreur. */
function Pills<T extends string | number>({
  name,
  legend,
  hint,
  type,
  options,
  checked,
  onChange,
  error,
  errorKey,
  className,
  itemClassName,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  type: 'radio' | 'checkbox';
  /** `name` : nom accessible, quand le libellé visible est abrégé (« Lun » pour lundi). */
  options: ReadonlyArray<{ value: T; label: ReactNode; name?: string }>;
  checked: (value: T) => boolean;
  onChange: (value: T) => void;
  error?: string;
  errorKey: string;
  className?: string;
  itemClassName?: string;
}) {
  const id = fieldId(errorKey);
  const ids = fieldIds(id);
  return (
    <fieldset
      aria-describedby={cn(hint ? ids.hint : null, error ? ids.error : null) || undefined}
      className="min-w-0"
    >
      <legend className="text-ink font-semibold">{legend}</legend>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <div className={cn('mt-2 flex flex-wrap gap-2', className)}>
        {options.map((option, index) => (
          <label
            key={String(option.value)}
            className={cn(PILL, error ? 'border-danger' : 'border-line-control', itemClassName)}
          >
            <input
              type={type}
              name={name}
              id={index === 0 ? id : undefined}
              value={String(option.value)}
              checked={checked(option.value)}
              aria-label={option.name}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </fieldset>
  );
}

/** Champ de date ou d'heure natif, libellé et erreur reliés. */
function NativeField({
  errorKey,
  label,
  hint,
  type,
  value,
  min,
  onChange,
  error,
}: {
  errorKey: string;
  label: string;
  hint?: string;
  type: 'date' | 'time';
  value: string;
  min?: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = fieldId(errorKey);
  const ids = fieldIds(id);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-ink block font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-small text-ink-muted mt-1">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? ids.hint : null, error ? ids.error : null) || undefined}
        className={inputClasses({ invalid: !!error, className: 'mt-2 sm:max-w-xs' })}
      />
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

const weekdayOptions = WEEKDAYS.map((day) => ({
  value: day,
  label: WEEKDAY_NAMES[day][0],
  name: WEEKDAY_NAMES[day][1],
}));

/** Période d'un plan hebdomadaire ou mensuel : début, puis durée (raccourcis) ou date de fin. */
function PeriodFields({
  schedule,
  set,
  errors,
  minDate,
}: {
  schedule: ScheduleDraft;
  set: (patch: Partial<ScheduleDraft>) => void;
  errors: JourneyErrors;
  minDate: string;
}) {
  const end = endDateOf(schedule);
  return (
    <fieldset className="rounded-card border-line grid min-w-0 gap-5 border p-4 sm:p-5">
      <legend className="text-ink px-1 font-semibold">{t.periodLegend}</legend>
      <NativeField
        errorKey="schedule.startDate"
        label={t.startDate}
        type="date"
        min={minDate}
        value={schedule.startDate}
        onChange={(startDate) => set({ startDate })}
        error={errors['schedule.startDate']}
      />
      <Pills<PeriodLength>
        name="demande-passages-duree"
        legend={t.periodLength}
        type="radio"
        options={PERIOD_LENGTHS.map((value) => ({ value, label: t.periods[value] }))}
        checked={(value) => schedule.period === value}
        onChange={(period) => set({ period })}
        error={schedule.period === 'until' ? undefined : errors['schedule.endDate']}
        errorKey={schedule.period === 'until' ? 'schedule.period' : 'schedule.endDate'}
      />
      {schedule.period === 'until' ? (
        <NativeField
          errorKey="schedule.endDate"
          label={t.endDate}
          type="date"
          min={isDay(schedule.startDate) ? schedule.startDate : minDate}
          value={schedule.endDate}
          onChange={(endDate) => set({ endDate })}
          error={errors['schedule.endDate']}
        />
      ) : end ? (
        <p className="text-small text-ink-muted -mt-2">{t.periodEnds(formatPlanDay(end))}</p>
      ) : null}
    </fieldset>
  );
}

/** Jours retirés ou ajoutés (« Ajuster ») : un champ de date, un bouton, et la liste des jours. */
function DayList({
  errorKey,
  legend,
  inputLabel,
  action,
  days,
  minDate,
  onAdd,
  onRemove,
  error,
}: {
  errorKey: string;
  legend: string;
  inputLabel: string;
  action: string;
  days: ReadonlyArray<string>;
  minDate: string;
  onAdd: (day: string) => void;
  onRemove: (day: string) => void;
  error?: string;
}) {
  const [value, setValue] = useState('');
  const id = fieldId(errorKey);
  const ids = fieldIds(id);
  return (
    <div className="grid min-w-0 gap-2">
      <p className="text-ink font-semibold">{legend}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 grow sm:max-w-xs">
          <label htmlFor={id} className="text-small text-ink-muted block">
            {inputLabel}
          </label>
          <input
            id={id}
            type="date"
            min={minDate}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.error : undefined}
            className={inputClasses({ invalid: !!error, className: 'mt-1' })}
          />
        </div>
        <Button
          variant="secondary"
          disabled={!isDay(value)}
          onClick={() => {
            onAdd(value);
            setValue('');
          }}
        >
          {action}
        </Button>
      </div>
      {days.length ? (
        <ul className="flex flex-wrap gap-2">
          {days.map((day) => (
            <li key={day}>
              <span className="rounded-control bg-surface-muted text-ink inline-flex min-h-11 items-center gap-1 pl-3">
                <span className="text-small">{formatPlanDay(day)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(day)}
                  aria-label={t.removeDay(formatPlanDayLong(day))}
                  className="text-ink-muted hover:text-ink focus-visible:outline-focus grid size-11 place-items-center rounded-full focus-visible:outline-2"
                >
                  <IconClose className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-ink-subtle">{t.noDay}</p>
      )}
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

/** Erreurs de l'aperçu à afficher sous les champs : un plan refusé par la gateway. */
function previewErrors(state: PreviewState): JourneyErrors {
  return state.status === 'invalid' ? { [state.key]: state.message } : {};
}

/**
 * Aperçu calculé par la gateway : nombre de passages (annoncé), premier et dernier, avertissements tels
 * quels, puis le calendrier des dates (brique `MonthCalendar`). Aucune date n'est calculée ici.
 */
export function SchedulePreviewPanel({
  input,
  state,
  retry,
  className,
}: {
  input: ScheduleInput | null;
  state: PreviewState;
  retry: () => void;
  className?: string;
}) {
  const p = t.preview;
  const preview =
    state.status === 'ready' ? state.preview : state.status === 'pending' ? state.previous : null;
  const stale = state.status === 'pending';
  const warnings = preview?.warnings ?? [];
  return (
    <section
      aria-labelledby={fieldId('schedule')}
      aria-busy={stale || undefined}
      className={cn('rounded-card border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-6', className)}
    >
      <h3
        id={fieldId('schedule')}
        tabIndex={-1}
        className="font-display text-ink text-h3 font-semibold focus:outline-none"
      >
        {p.title}
      </h3>

      {state.status === 'idle' ? (
        <p className="text-small text-ink-muted flex items-start gap-2">
          <IconCalendar className="text-brand-ink mt-0.5 size-5 shrink-0" />
          {p.idle}
        </p>
      ) : null}

      {preview && input ? (
        <div className={cn('grid gap-4 transition-opacity duration-(--motion-fast)', stale && 'opacity-60')}>
          <div>
            <p className="font-display text-ink text-3xl font-semibold tabular-nums">
              {p.count(preview.count)}
            </p>
            <p className="text-small text-ink-muted">
              {p.range(formatPlanDay(preview.firstDate), formatPlanDay(preview.lastDate), input.startTime)}
            </p>
          </div>
          {warnings.length ? (
            <div className="rounded-control border-accent-muted bg-accent-soft grid gap-2 border p-4">
              <p className="text-ink flex items-start gap-2 font-semibold">
                <IconInfo className="mt-0.5 size-5 shrink-0" />
                {p.warningsTitle(warnings.length)}
              </p>
              <ul className="text-small text-ink grid gap-1">
                {warnings.slice(0, WARNINGS_SHOWN).map((warning) => (
                  <li key={`${warning.code}-${warning.date}`}>
                    <span className="font-semibold">{formatPlanDay(warning.date)}</span> : {warning.message}
                  </li>
                ))}
              </ul>
              {warnings.length > WARNINGS_SHOWN ? (
                <details className="text-small">
                  <summary className="text-action-ink min-h-11 cursor-pointer content-center font-semibold">
                    {p.moreWarnings(warnings.length - WARNINGS_SHOWN)}
                  </summary>
                  <ul className="text-ink grid gap-1">
                    {warnings.slice(WARNINGS_SHOWN).map((warning) => (
                      <li key={`${warning.code}-${warning.date}`}>
                        <span className="font-semibold">{formatPlanDay(warning.date)}</span> :{' '}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
          <MonthCalendar
            key={preview.firstDate}
            className="w-full"
            marks={preview.dates.map((date) => ({ date, tone: 'soft', label: p.planDay }))}
            label={p.calendar}
            previousLabel={t.previousMonth}
            nextLabel={t.nextMonth}
            monthCount={p.monthCount}
            legend={[{ tone: 'soft', label: p.planLegend, count: preview.count }]}
          />
          <p className="text-small text-ink-muted">{p.lead}</p>
        </div>
      ) : null}

      {state.status === 'pending' ? (
        <p role="status" className="text-small text-ink-muted">
          {p.loading}
        </p>
      ) : null}
      {state.status === 'invalid' ? (
        <p className="text-small text-danger font-medium">
          {state.key === 'schedule' ? state.message : p.fix}
        </p>
      ) : null}
      {state.status === 'busy' ? (
        <p role="status" className="text-small text-ink">
          {p.busy(state.seconds)}
        </p>
      ) : null}
      {state.status === 'failed' ? (
        <div className="grid justify-items-start gap-2">
          <p className="text-small text-danger font-medium">{`${p.failed} ${state.message}`}</p>
          <Button variant="secondary" onClick={retry}>
            {p.retry}
          </Button>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {state.status === 'ready' ? p.announce(state.preview.count) : ''}
      </p>
    </section>
  );
}

/**
 * Étape 4 « Vos passages » (ADR-052) : mode du plan en langage client (dates précises, chaque semaine,
 * chaque mois), champs de ce mode seulement, heure, ajustements (jours retirés ou ajoutés) et
 * commentaire ; à côté (dessous sur téléphone), l'aperçu calculé par la gateway. Un plan refusé par
 * l'aperçu bloque « Continuer » (`block`) et s'affiche sous le champ en cause.
 */
export function ScheduleStep({ draft, errors, update, clearError, block }: StepProps) {
  const schedule = draft.schedule;
  const minDate = useMemo(() => firstAllowedDate(), []);
  const calendarEnd = useMemo(() => periodEnd(minDate, CALENDAR_MONTHS), [minDate]);
  const input = useMemo(() => scheduleInputOf(schedule), [schedule]);
  const { state, retry } = useSchedulePreview(input);
  const shown: JourneyErrors = { ...previewErrors(state), ...errors };
  const blocking = state.status === 'invalid' ? `${state.key}\n${state.message}` : '';

  // Un plan refusé par l'aperçu empêche de continuer (le message est déjà sous le champ).
  useEffect(() => {
    if (!block) return;
    const [key, message] = blocking ? blocking.split('\n') : [];
    block(key && message ? { [key]: message } : {});
    return () => block({});
  }, [block, blocking]);

  const set = (patch: Partial<ScheduleDraft>) => {
    update((current) => ({ ...current, schedule: { ...current.schedule, ...patch } }));
    for (const key of Object.keys(errors)) if (key.startsWith('schedule')) clearError(key);
  };
  const adjusting =
    schedule.excludedDates.length > 0 ||
    schedule.extraDates.length > 0 ||
    !!shown['schedule.excludedDates'] ||
    !!shown['schedule.extraDates'];
  const commentIds = fieldIds(fieldId('comment'));
  const datesIds = fieldIds(fieldId('schedule.dates'));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <div className="grid min-w-0 gap-8">
        {/* 1. Le mode, en langage client. */}
        <fieldset
          aria-describedby={shown['schedule.mode'] ? `${fieldId('schedule.mode')}-erreur` : undefined}
          className="grid min-w-0 gap-3"
        >
          <legend className="text-ink font-semibold">{t.modeLegend}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {SCHEDULE_MODES.map((mode, index) => (
              <label
                key={mode}
                className={cn(
                  'rounded-card border-line bg-surface relative grid cursor-pointer content-start gap-1 border p-4 shadow-xs',
                  'ease-soft transition-[border-color,box-shadow,background-color] duration-(--motion-fast)',
                  'hover:border-line-strong has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:checked]:shadow-card',
                  'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                )}
              >
                <input
                  type="radio"
                  name="demande-passages-mode"
                  id={index === 0 ? fieldId('schedule.mode') : undefined}
                  value={mode}
                  checked={schedule.mode === mode}
                  onChange={() => set({ mode: mode as ScheduleMode })}
                  className="sr-only"
                />
                <span className="font-display text-ink font-semibold">{t.modes[mode].label}</span>
                <span className="text-small text-ink-muted">{t.modes[mode].hint}</span>
              </label>
            ))}
          </div>
          {shown['schedule.mode'] ? (
            <FieldError id={`${fieldId('schedule.mode')}-erreur`}>{shown['schedule.mode']}</FieldError>
          ) : null}
        </fieldset>

        {/* 2. Les champs du mode choisi seulement. */}
        {schedule.mode === 'dates' ? (
          <div key="dates" className="swap-in grid gap-3">
            <p className="text-ink font-semibold">{t.datesLegend}</p>
            <p id={datesIds.hint} className="text-small text-ink-muted -mt-2">
              {t.datesHint(formatPlanDay(minDate))}
            </p>
            <MonthCalendar
              className="w-full max-w-md"
              marks={schedule.dates.map((date) => ({ date, tone: 'action', label: t.dayChosen }))}
              initialMonth={(schedule.dates[0] ?? minDate).slice(0, 7)}
              label={t.datesCalendar}
              previousLabel={t.previousMonth}
              nextLabel={t.nextMonth}
              monthCount={t.monthChosen}
              selection={{
                min: minDate,
                max: calendarEnd,
                onToggle: (date) => set({ dates: toggle(schedule.dates, date).sort() }),
                unavailableLabel: t.dayUnavailable,
                id: fieldId('schedule.dates'),
                describedBy: cn(datesIds.hint, shown['schedule.dates'] ? datesIds.error : null),
              }}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-small text-ink font-semibold tabular-nums">
                {t.datesChosen(schedule.dates.length)}
              </p>
              {schedule.dates.length ? (
                <Button variant="ghost" onClick={() => set({ dates: [] })} className="-ml-3">
                  {t.clearDates}
                </Button>
              ) : null}
            </div>
            {shown['schedule.dates'] ? (
              <FieldError id={datesIds.error}>{shown['schedule.dates']}</FieldError>
            ) : null}
          </div>
        ) : null}

        {schedule.mode === 'weekly' ? (
          <div key="weekly" className="swap-in grid gap-6">
            <Pills<Weekday>
              name="demande-passages-jours"
              legend={t.weekdaysLegend}
              type="checkbox"
              options={weekdayOptions}
              checked={(day) => schedule.weekdays.includes(day)}
              onChange={(day) => set({ weekdays: toggle(schedule.weekdays, day) })}
              error={shown['schedule.weekdays']}
              errorKey="schedule.weekdays"
              itemClassName="px-3"
            />
            <div className="min-w-0">
              <label htmlFor={fieldId('schedule.everyWeeks')} className="text-ink block font-semibold">
                {t.everyWeeks}
              </label>
              <select
                id={fieldId('schedule.everyWeeks')}
                value={schedule.everyWeeks}
                onChange={(event) => set({ everyWeeks: Number(event.target.value) })}
                aria-invalid={shown['schedule.everyWeeks'] ? true : undefined}
                aria-describedby={
                  shown['schedule.everyWeeks'] ? fieldIds(fieldId('schedule.everyWeeks')).error : undefined
                }
                className={inputClasses({
                  invalid: !!shown['schedule.everyWeeks'],
                  className: 'mt-2 sm:max-w-xs',
                })}
              >
                {Array.from({ length: MAX_EVERY_WEEKS }, (_, index) => index + 1).map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {t.everyWeeksOption(weeks)}
                  </option>
                ))}
              </select>
              {shown['schedule.everyWeeks'] ? (
                <FieldError id={fieldIds(fieldId('schedule.everyWeeks')).error}>
                  {shown['schedule.everyWeeks']}
                </FieldError>
              ) : null}
            </div>
            <PeriodFields schedule={schedule} set={set} errors={shown} minDate={minDate} />
          </div>
        ) : null}

        {schedule.mode === 'monthly' ? (
          <div key="monthly" className="swap-in grid gap-6">
            <Pills<MonthlyForm>
              name="demande-passages-forme"
              legend={t.monthlyFormLegend}
              type="radio"
              options={(['monthDays', 'weekdays'] as const).map((value) => ({
                value,
                label: t.monthlyForms[value],
              }))}
              checked={(value) => schedule.monthlyForm === value}
              onChange={(monthlyForm) => set({ monthlyForm })}
              errorKey="schedule.monthlyForm"
            />
            {schedule.monthlyForm === 'monthDays' ? (
              <Pills<number>
                key="jours"
                name="demande-passages-jours-du-mois"
                legend={t.monthDaysLegend}
                hint={t.monthDaysHint}
                type="checkbox"
                options={Array.from({ length: 31 }, (_, index) => ({
                  value: index + 1,
                  label: index + 1,
                  name: t.monthDayLabel(index + 1),
                }))}
                checked={(day) => schedule.monthDays.includes(day)}
                onChange={(day) => set({ monthDays: toggle(schedule.monthDays, day) })}
                error={shown['schedule.monthDays']}
                errorKey="schedule.monthDays"
                className="grid max-w-md grid-cols-7 gap-1.5"
                itemClassName="px-0 tabular-nums"
              />
            ) : (
              <div key="rangs" className="grid gap-6">
                <Pills<WeekOfMonth>
                  name="demande-passages-rangs"
                  legend={t.ranksLegend}
                  type="checkbox"
                  options={WEEKS_OF_MONTH.map((rank) => ({ value: rank, label: t.rank(rank) }))}
                  checked={(rank) => schedule.weeksOfMonth.includes(rank)}
                  onChange={(rank) => set({ weeksOfMonth: toggle(schedule.weeksOfMonth, rank) })}
                  error={shown['schedule.weeksOfMonth']}
                  errorKey="schedule.weeksOfMonth"
                />
                <Pills<Weekday>
                  name="demande-passages-jours-rang"
                  legend={t.rankWeekdaysLegend}
                  type="checkbox"
                  options={weekdayOptions}
                  checked={(day) => schedule.weekdays.includes(day)}
                  onChange={(day) => set({ weekdays: toggle(schedule.weekdays, day) })}
                  error={shown['schedule.weekdays']}
                  errorKey="schedule.weekdays"
                  itemClassName="px-3"
                />
              </div>
            )}
            <PeriodFields schedule={schedule} set={set} errors={shown} minDate={minDate} />
          </div>
        ) : null}

        {schedule.mode ? (
          <>
            {/* 3. L'heure, commune à tous les passages. */}
            <NativeField
              errorKey="schedule.startTime"
              label={t.startTime}
              hint={t.startTimeHint}
              type="time"
              value={schedule.startTime}
              onChange={(startTime) => set({ startTime })}
              error={shown['schedule.startTime']}
            />

            {/* 4. Ajuster : jours retirés (fériés, absences) ou ajoutés. */}
            <details open={adjusting || undefined} className="rounded-card border-line group border">
              <summary className="text-ink flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 font-semibold sm:px-5">
                {t.adjust}
                <span
                  aria-hidden="true"
                  className="text-ink-muted transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <div className="grid gap-6 px-4 pb-5 sm:px-5">
                <p className="text-small text-ink-muted">{frenchSpacing(t.adjustHint)}</p>
                <DayList
                  errorKey="schedule.excludedDates"
                  legend={t.excludedLegend}
                  inputLabel={t.excludedInput}
                  action={t.exclude}
                  days={schedule.excludedDates}
                  minDate={minDate}
                  onAdd={(day) =>
                    set({ excludedDates: [...new Set([...schedule.excludedDates, day])].sort() })
                  }
                  onRemove={(day) =>
                    set({ excludedDates: schedule.excludedDates.filter((item) => item !== day) })
                  }
                  error={shown['schedule.excludedDates']}
                />
                <DayList
                  errorKey="schedule.extraDates"
                  legend={t.extraLegend}
                  inputLabel={t.extraInput}
                  action={t.include}
                  days={schedule.extraDates}
                  minDate={minDate}
                  onAdd={(day) => set({ extraDates: [...new Set([...schedule.extraDates, day])].sort() })}
                  onRemove={(day) => set({ extraDates: schedule.extraDates.filter((item) => item !== day) })}
                  error={shown['schedule.extraDates']}
                />
              </div>
            </details>
          </>
        ) : null}

        {/* 5. Commentaire. */}
        <div>
          <label htmlFor={fieldId('comment')} className="text-ink block font-semibold">
            {t.comment}
          </label>
          <p id={commentIds.hint} className="text-small text-ink-muted mt-1">
            {t.commentHint}
          </p>
          <textarea
            id={fieldId('comment')}
            rows={4}
            maxLength={MAX_COMMENT}
            value={draft.comment}
            onChange={(event) => {
              update((current) => ({ ...current, comment: event.target.value }));
              clearError('comment');
            }}
            aria-invalid={errors['comment'] ? true : undefined}
            aria-describedby={cn(commentIds.hint, errors['comment'] ? commentIds.error : null)}
            className={inputClasses({ invalid: !!errors['comment'], className: 'mt-2 py-3' })}
          />
          <p className="text-small text-ink-subtle mt-1 text-right tabular-nums">
            {t.commentCount(draft.comment.length, MAX_COMMENT)}
          </p>
          {errors['comment'] ? <FieldError id={commentIds.error}>{errors['comment']}</FieldError> : null}
        </div>
      </div>

      {/* Téléphone : l'aperçu suit le formulaire ; ordinateur : colonne de droite. */}
      <SchedulePreviewPanel
        input={input}
        state={state}
        retry={retry}
        className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]"
      />
    </div>
  );
}
