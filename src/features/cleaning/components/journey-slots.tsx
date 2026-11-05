'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, fieldIds, inputClasses } from '@/components/ui/field';
import { IconCalendar } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';
import {
  fieldId,
  firstAllowedDate,
  MAX_COMMENT,
  MAX_SLOTS,
  type SlotDraft,
} from '@/features/cleaning/journey';
import { journeyTexts, type SlotPeriod, slotPeriods } from '@/features/cleaning/journey-texts';
import type { StepProps } from './journey';

const t = journeyTexts.slots;

/** Étape 4 : jusqu'à trois créneaux souhaités (date et moment, heures du Bénin) et un commentaire. */
export function SlotsStep({ draft, errors, update, clearError }: StepProps) {
  const minDate = useMemo(() => firstAllowedDate(), []);
  const slotIds = fieldIds(fieldId('slots'));
  const commentIds = fieldIds(fieldId('comment'));
  const slotsError = errors['slots'];
  const setSlots = (slots: SlotDraft[]) => {
    update((current) => ({ ...current, slots }));
    clearError('slots');
  };
  const setSlot = (index: number, patch: Partial<SlotDraft>) =>
    setSlots(draft.slots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot)));

  return (
    <div className="grid max-w-2xl gap-8">
      <fieldset aria-describedby={cn(slotIds.hint, slotsError ? slotIds.error : null)} className="grid gap-3">
        <legend className="text-ink flex items-center gap-2 font-semibold">
          <IconCalendar className="text-brand-ink" />
          {t.legend}
        </legend>
        <p id={slotIds.hint} className="text-small text-ink-muted -mt-1">
          {t.hint(formatShortDate(`${minDate}T12:00:00Z`))}
        </p>
        {draft.slots.map((slot, index) => (
          <div
            key={index}
            className="rounded-control bg-surface-muted swap-in grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div>
              <label
                htmlFor={index === 0 ? fieldId('slots') : `${fieldId('slots')}-${index}`}
                className="text-small text-ink font-semibold"
              >
                {t.date(index + 1)}
              </label>
              <input
                id={index === 0 ? fieldId('slots') : `${fieldId('slots')}-${index}`}
                type="date"
                min={minDate}
                value={slot.date}
                onChange={(event) => setSlot(index, { date: event.target.value })}
                aria-invalid={slotsError ? true : undefined}
                aria-describedby={slotsError ? slotIds.error : undefined}
                className={inputClasses({ invalid: !!slotsError, className: 'mt-1' })}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId('slots')}-moment-${index}`}
                className="text-small text-ink font-semibold"
              >
                {t.period(index + 1)}
              </label>
              <select
                id={`${fieldId('slots')}-moment-${index}`}
                value={slot.period}
                onChange={(event) => setSlot(index, { period: event.target.value as SlotPeriod })}
                className={inputClasses({ className: 'mt-1' })}
              >
                {slotPeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
            {draft.slots.length > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setSlots(draft.slots.filter((_, position) => position !== index))}
              >
                {t.remove(index + 1)}
              </Button>
            ) : null}
          </div>
        ))}
        {slotsError ? <FieldError id={slotIds.error}>{slotsError}</FieldError> : null}
        {draft.slots.length < MAX_SLOTS ? (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => setSlots([...draft.slots, { date: '', period: 'morning' }])}
          >
            {t.add}
          </Button>
        ) : null}
      </fieldset>

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
  );
}
