'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { IconCalendar, IconClose } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { beninDate, formatShortDate, formatTime } from '@/lib/format';
import type { MonthRank, Weekday } from '@/features/cleaning/api';
import {
  MAX_EVERY_WEEKS,
  MAX_MONTH_WEEKDAYS,
  MONTH_RANKS,
  SCHEDULE_KINDS,
  type ScheduleDraft,
  WEEKDAYS,
  WEEKDAY_LABELS,
  MONTH_RANK_LABELS,
  buildSchedule,
  formatDay,
} from '@/features/cleaning/schedule';
import { SCHEDULE_NOTICES, scheduleTexts as t } from '@/features/cleaning/simulator-texts';
import { ChoicePill, Fieldset, SelectField } from './fields';
import { useSchedulePreview } from './use-public';

/** Dates montrées dans l'aperçu avant « et N autres ». */
const PREVIEW_DATES = 12;

/**
 * Rythme du programme (ponctuel, hebdomadaire, mensuel), puis l'aperçu exact des dates calculé par la
 * gateway (`schedule-previews`) : nombre de séances, première et dernière, ajustements (jours fériés,
 * jours absents du mois). Une date de l'aperçu peut être retirée.
 */
export function ScheduleFields({
  draft,
  onChange,
  errors,
  idPrefix,
}: {
  draft: ScheduleDraft;
  onChange: (next: ScheduleDraft) => void;
  errors: Record<string, string>;
  idPrefix: string;
}) {
  const set = (patch: Partial<ScheduleDraft>) => onChange({ ...draft, ...patch });
  const built = buildSchedule(draft);
  const preview = useSchedulePreview('plan' in built ? built.plan : null);
  const today = beninDate();
  const [dateToAdd, setDateToAdd] = useState('');
  const [rank, setRank] = useState<MonthRank>('first');
  const [weekday, setWeekday] = useState<Weekday>('sat');
  const error = (key: string) => errors[`schedule.${key}`];

  return (
    <div className="grid gap-6">
      <Fieldset id={`${idPrefix}-nature`} legend={t.legend} error={error('kind')} legendClassName="text-lg">
        <div className="grid gap-3 sm:grid-cols-3">
          {SCHEDULE_KINDS.map((kind) => (
            <ChoicePill
              key={kind}
              name={`${idPrefix}-nature`}
              checked={draft.kind === kind}
              onChange={() => set({ kind })}
              label={t.kinds[kind]}
              hint={t.kindHints[kind]}
            />
          ))}
        </div>
      </Fieldset>

      {draft.kind ? (
        <div className="swap-in grid gap-6" key={draft.kind}>
          {draft.kind === 'one_off' ? (
            <Fieldset id={`${idPrefix}-jours`} legend={t.dates} error={error('dates')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <TextField
                  id={`${idPrefix}-jour-ajout`}
                  label={t.dateToAdd}
                  type="date"
                  min={today}
                  value={dateToAdd}
                  onChange={(event) => setDateToAdd(event.target.value)}
                  className="sm:w-64"
                />
                <Button
                  variant="secondary"
                  disabled={!dateToAdd || draft.dates.includes(dateToAdd)}
                  onClick={() => {
                    set({ dates: [...draft.dates, dateToAdd].sort() });
                    setDateToAdd('');
                  }}
                >
                  <IconCalendar />
                  {t.addDate}
                </Button>
              </div>
              {draft.dates.length ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {draft.dates.map((date) => (
                    <li key={date}>
                      <DateChip
                        label={formatDay(date)}
                        action={t.removeDate(formatDay(date))}
                        onClick={() => set({ dates: draft.dates.filter((value) => value !== date) })}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-ink-muted mt-3">{t.noDate}</p>
              )}
            </Fieldset>
          ) : null}

          {draft.kind === 'weekly' ? (
            <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
              <Fieldset id={`${idPrefix}-jours-semaine`} legend={t.weekdays} error={error('weekdays')}>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <ChoicePill
                      key={day}
                      type="checkbox"
                      checked={draft.weekdays.includes(day)}
                      onChange={() =>
                        set({
                          weekdays: draft.weekdays.includes(day)
                            ? draft.weekdays.filter((value) => value !== day)
                            : [...draft.weekdays, day],
                        })
                      }
                      label={<span className="capitalize">{WEEKDAY_LABELS[day]}</span>}
                      className="px-3"
                    />
                  ))}
                </div>
              </Fieldset>
              <SelectField
                id={`${idPrefix}-frequence`}
                label={t.everyWeeks}
                value={String(draft.everyWeeks)}
                onChange={(event) => set({ everyWeeks: Number(event.target.value) })}
              >
                {Array.from({ length: MAX_EVERY_WEEKS }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {t.everyWeeksOption(value)}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : null}

          {draft.kind === 'monthly' ? (
            <div className="grid gap-6">
              <Fieldset id={`${idPrefix}-forme-mois`} legend={t.monthlyForm}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoicePill
                    name={`${idPrefix}-forme-mois`}
                    checked={draft.monthlyForm === 'days'}
                    onChange={() => set({ monthlyForm: 'days' })}
                    label={t.monthlyDays}
                  />
                  <ChoicePill
                    name={`${idPrefix}-forme-mois`}
                    checked={draft.monthlyForm === 'weekdays'}
                    onChange={() => set({ monthlyForm: 'weekdays' })}
                    label={t.monthlyWeekdays}
                  />
                </div>
              </Fieldset>
              {draft.monthlyForm === 'days' ? (
                <Fieldset
                  id={`${idPrefix}-jours-mois`}
                  legend={t.monthDays}
                  hint={t.monthDaysHint}
                  error={error('monthDays')}
                >
                  <div className="grid grid-cols-7 gap-1.5 sm:max-w-md">
                    {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                      const checked = draft.monthDays.includes(day);
                      return (
                        <label
                          key={day}
                          className={cn(
                            'rounded-control border-line-control grid min-h-11 cursor-pointer place-items-center border text-sm font-semibold tabular-nums',
                            'has-[:checked]:border-action has-[:checked]:bg-action has-[:checked]:text-on-action has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() =>
                              set({
                                monthDays: checked
                                  ? draft.monthDays.filter((value) => value !== day)
                                  : [...draft.monthDays, day],
                              })
                            }
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                </Fieldset>
              ) : (
                <Fieldset id={`${idPrefix}-rangs`} legend={t.monthlyWeekdays} error={error('monthWeekdays')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <SelectField
                      id={`${idPrefix}-rang`}
                      label={t.rank}
                      value={rank}
                      onChange={(event) => setRank(event.target.value as MonthRank)}
                    >
                      {MONTH_RANKS.map((value) => (
                        <option key={value} value={value}>
                          {MONTH_RANK_LABELS[value]}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      id={`${idPrefix}-jour-rang`}
                      label={t.weekday}
                      value={weekday}
                      onChange={(event) => setWeekday(event.target.value as Weekday)}
                    >
                      {WEEKDAYS.map((value) => (
                        <option key={value} value={value}>
                          {WEEKDAY_LABELS[value]}
                        </option>
                      ))}
                    </SelectField>
                    <Button
                      variant="secondary"
                      disabled={
                        draft.monthWeekdays.length >= MAX_MONTH_WEEKDAYS ||
                        draft.monthWeekdays.some((item) => item.rank === rank && item.weekday === weekday)
                      }
                      onClick={() => set({ monthWeekdays: [...draft.monthWeekdays, { rank, weekday }] })}
                    >
                      {t.addMonthWeekday}
                    </Button>
                  </div>
                  {draft.monthWeekdays.length ? (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {draft.monthWeekdays.map((item) => {
                        const label = t.monthWeekdayLabel(item.rank, item.weekday);
                        return (
                          <li key={`${item.rank}-${item.weekday}`}>
                            <DateChip
                              label={label}
                              action={t.removeMonthWeekday(label)}
                              onClick={() =>
                                set({
                                  monthWeekdays: draft.monthWeekdays.filter(
                                    (value) => value.rank !== item.rank || value.weekday !== item.weekday,
                                  ),
                                })
                              }
                            />
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </Fieldset>
              )}
            </div>
          ) : null}

          {draft.kind !== 'one_off' ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                id={`${idPrefix}-debut`}
                label={t.startDate}
                type="date"
                min={today}
                value={draft.startDate}
                onChange={(event) => set({ startDate: event.target.value })}
                error={error('startDate')}
              />
              <div className="grid gap-3">
                <SelectField
                  id={`${idPrefix}-fin-mode`}
                  label={t.end}
                  value={draft.endMode}
                  onChange={(event) => set({ endMode: event.target.value as ScheduleDraft['endMode'] })}
                >
                  {(['months', 'weeks', 'date'] as const).map((mode) => (
                    <option key={mode} value={mode}>
                      {t.endModes[mode]}
                    </option>
                  ))}
                </SelectField>
                {draft.endMode === 'months' ? (
                  <TextField
                    id={`${idPrefix}-mois`}
                    label={t.durationMonths}
                    inputMode="numeric"
                    value={draft.durationMonths}
                    onChange={(event) => set({ durationMonths: event.target.value.replace(/[^\d]/g, '') })}
                    error={error('durationMonths')}
                  />
                ) : draft.endMode === 'weeks' ? (
                  <TextField
                    id={`${idPrefix}-semaines`}
                    label={t.durationWeeks}
                    inputMode="numeric"
                    value={draft.durationWeeks}
                    onChange={(event) => set({ durationWeeks: event.target.value.replace(/[^\d]/g, '') })}
                    error={error('durationWeeks')}
                  />
                ) : (
                  <TextField
                    id={`${idPrefix}-fin`}
                    label={t.endDate}
                    type="date"
                    min={draft.startDate || today}
                    value={draft.endDate}
                    onChange={(event) => set({ endDate: event.target.value })}
                    error={error('endDate')}
                  />
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
            <TextField
              id={`${idPrefix}-heure`}
              label={t.startTime}
              hint={t.startTimeHint}
              type="time"
              value={draft.startTime}
              onChange={(event) => set({ startTime: event.target.value })}
              error={error('startTime')}
            />
            <ChoicePill
              type="checkbox"
              checked={draft.excludeHolidays}
              onChange={() => set({ excludeHolidays: !draft.excludeHolidays })}
              label={t.excludeHolidays}
            />
          </div>

          <SchedulePreviewPanel
            preview={preview}
            excluded={draft.excludedDates}
            onExclude={(date) => set({ excludedDates: [...draft.excludedDates, date] })}
            onRestore={(date) =>
              set({ excludedDates: draft.excludedDates.filter((value) => value !== date) })
            }
            error={error('excludedDates')}
          />
        </div>
      ) : null}
    </div>
  );
}

function DateChip({ label, action, onClick }: { label: string; action: string; onClick: () => void }) {
  return (
    <span className="bg-brand-soft text-brand-ink ring-brand-muted inline-flex min-h-11 items-center gap-1 rounded-full pl-4 text-sm font-medium ring-1 ring-inset">
      {label}
      <button
        type="button"
        onClick={onClick}
        aria-label={action}
        className="hover:bg-brand-100 focus-visible:outline-focus grid size-11 place-items-center rounded-full focus-visible:outline-2"
      >
        <IconClose className="size-4" />
      </button>
    </span>
  );
}

function SchedulePreviewPanel({
  preview,
  excluded,
  onExclude,
  onRestore,
  error,
}: {
  preview: ReturnType<typeof useSchedulePreview>;
  excluded: ReadonlyArray<string>;
  onExclude: (date: string) => void;
  onRestore: (date: string) => void;
  error?: string;
}) {
  const data = preview.status === 'ready' ? preview.data : preview.status === 'idle' ? null : preview.last;
  if (preview.status === 'idle' && !excluded.length) return null;
  return (
    <section
      aria-labelledby="apercu-dates-titre"
      aria-busy={preview.status === 'loading'}
      className="rounded-card border-line bg-surface-muted border p-4 sm:p-5"
    >
      <h3 id="apercu-dates-titre" className="text-ink flex items-center gap-2 font-semibold">
        <IconCalendar className="text-brand-ink size-5" />
        {t.previewTitle}
      </h3>
      <div aria-live="polite" className="mt-3 grid gap-3">
        {preview.status === 'loading' && !data ? (
          <p className="text-ink-muted text-small">{t.previewLoading}</p>
        ) : null}
        {preview.status === 'error' ? (
          <FormMessage>{`${t.previewError} ${preview.error.message}`}</FormMessage>
        ) : null}
        {data ? (
          <>
            <p className="text-ink">
              <strong className="font-semibold">{t.previewCount(data.count)}</strong>
              {data.firstStart && data.lastStart && data.count > 1
                ? ` ${t.previewRange(formatShortDate(data.firstStart), formatShortDate(data.lastStart))}`
                : ''}
              {data.firstStart ? `, à ${formatTime(data.firstStart)}` : ''}
            </p>
            <ul className={cn('flex flex-wrap gap-2', preview.status === 'loading' && 'opacity-60')}>
              {data.occurrences.slice(0, PREVIEW_DATES).map((occurrence) => (
                <li key={occurrence.start}>
                  <DateChip
                    label={formatDay(occurrence.date)}
                    action={t.excludeDate(formatDay(occurrence.date))}
                    onClick={() => onExclude(occurrence.date)}
                  />
                </li>
              ))}
              {data.occurrences.length > PREVIEW_DATES ? (
                <li className="text-small text-ink-muted self-center">
                  {t.previewMore(data.occurrences.length - PREVIEW_DATES)}
                </li>
              ) : null}
            </ul>
            {data.notices.length ? (
              <ul className="text-small text-ink-muted grid gap-1">
                {data.notices.map((notice) => (
                  <li key={`${notice.code}-${notice.date}`}>
                    {formatDay(notice.date)} :{' '}
                    {(SCHEDULE_NOTICES[notice.code] ?? (() => notice.code))(notice.label)}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
        {excluded.length ? (
          <div>
            <p className="text-small text-ink font-semibold">{t.excludedTitle}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {excluded.map((date) => (
                <li key={date}>
                  <Button variant="ghost" className="border-line border" onClick={() => onRestore(date)}>
                    {t.restoreDate(formatDay(date))}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? <FormMessage>{error}</FormMessage> : null}
        <p className="text-small text-ink-muted">{t.leadNote}</p>
      </div>
    </section>
  );
}
