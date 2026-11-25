'use client';

import { Button } from '@/components/ui/button';
import { FieldError, TextField } from '@/components/ui/field';
import { IconClose } from '@/components/ui/icons';
import { beninDate } from '@/lib/format';
import { MAX_SLOTS, type SlotDraft } from '@/features/cleaning/draft';
import { wizardTexts as t } from '@/features/cleaning/request-texts';
import { Fieldset } from '@/components/ui/form-fields';

/**
 * Créneaux de disponibilité pour la visite (1 à 3) : jour et plage horaire, heure du Bénin. Le délai
 * minimal avant la visite est contrôlé par la gateway (`CLEANING_SLOT_INVALID`), pas ici.
 */
export function SlotFields({
  slots,
  onChange,
  errors,
  idPrefix,
}: {
  slots: SlotDraft[];
  onChange: (slots: SlotDraft[]) => void;
  errors: Record<string, string>;
  idPrefix: string;
}) {
  const today = beninDate();
  const update = (index: number, patch: Partial<SlotDraft>) =>
    onChange(slots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot)));
  return (
    <Fieldset
      id={`${idPrefix}-creneaux`}
      legend={t.slotsLegend}
      hint={t.slotsHint}
      error={errors['visitSlots'] ?? null}
      legendClassName="text-lg"
    >
      <ol className="grid gap-4">
        {slots.map((slot, index) => {
          const error = Object.entries(errors).find(([key]) => key.startsWith(`visitSlots.${index}`))?.[1];
          return (
            <li key={index} className="rounded-card border-line bg-surface-muted grid gap-3 border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-ink font-semibold">{t.slot(index + 1)}</p>
                {slots.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.removeSlot(index + 1)}
                    onClick={() => onChange(slots.filter((_, position) => position !== index))}
                  >
                    <IconClose />
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <TextField
                  id={`${idPrefix}-jour-${index}`}
                  label={t.slotDate}
                  type="date"
                  min={today}
                  value={slot.date}
                  onChange={(event) => update(index, { date: event.target.value })}
                />
                <TextField
                  id={`${idPrefix}-de-${index}`}
                  label={t.slotFrom}
                  type="time"
                  value={slot.from}
                  onChange={(event) => update(index, { from: event.target.value })}
                />
                <TextField
                  id={`${idPrefix}-a-${index}`}
                  label={t.slotTo}
                  type="time"
                  value={slot.to}
                  onChange={(event) => update(index, { to: event.target.value })}
                />
              </div>
              {error ? <FieldError id={`${idPrefix}-creneau-${index}-erreur`}>{error}</FieldError> : null}
            </li>
          );
        })}
      </ol>
      {slots.length < MAX_SLOTS ? (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() =>
            onChange([
              ...slots,
              { date: '', from: slots.at(-1)?.from ?? '08:00', to: slots.at(-1)?.to ?? '12:00' },
            ])
          }
        >
          {t.addSlot}
        </Button>
      ) : null}
    </Fieldset>
  );
}
