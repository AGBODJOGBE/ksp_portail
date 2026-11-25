'use client';

import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { ChoicePill, Fieldset, SelectField, TextAreaField } from '@/components/ui/form-fields';
import { IconCheck } from '@/components/ui/icons';
import { LinkSheet, LinkSheetEyebrow, LinkSheetOutcome, LinkSheetSection } from '@/components/ui/link-sheet';
import { formatDate } from '@/lib/format';
import { beninNoon, callbackBody, callbackDays, openSlots } from '@/features/recovery/debtor';
import { requestDebtorCallback } from '@/features/recovery/debtor-api';
import type { DebtorCase } from '@/features/recovery/debtor-schemas';
import { debtorTexts as t } from '@/features/recovery/debtor-texts';
import { BackToSituation, type Fail, useFocusOnMount } from './debtor-parts';

const NEEDS = [
  {
    method: 'POST' as const,
    path: '/api/v1/recovery/debtor/callbacks',
    purpose: 'Demande de rappel dans les plages de contact (lundi – samedi, 8 h – 19 h).',
  },
];

const MESSAGE_MAX = 500;
/** « 08:00 » → « 8 h », « 10:30 » → « 10 h 30 ». */
const hour = (time: string) => {
  const [h, m] = time.split(':');
  return m === '00' ? `${Number(h)} h` : `${Number(h)} h ${m}`;
};

/**
 * D7 — Être rappelé : un jour (du jour même aux 29 suivants, sans le dimanche) et un créneau de la plage
 * de contact, à l'heure du Bénin, envoyés en UTC ; message facultatif. Recovery reste juge (plage réglable,
 * un seul rappel en attente).
 */
export function DebtorCallback({
  session,
  fail,
  onBack,
  sessionBar,
}: {
  session: string;
  debtorCase: DebtorCase;
  fail: Fail;
  onBack: () => void;
  sessionBar: ReactNode;
}) {
  const [days] = useState(() => callbackDays());
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState<readonly [string, string] | null>(null);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(false);
  const [done, setDone] = useState<{ day: string; slot: readonly [string, string] } | null>(null);
  const dayRef = useRef<HTMLSelectElement>(null);
  const slotRef = useRef<HTMLInputElement>(null);
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  const slots = day ? openSlots(day) : [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const found: Record<string, string> = {};
    if (!day) found.day = t.dayMissing;
    else if (!slot) found.slot = t.slotMissing;
    if (message.length > MESSAGE_MAX) found.message = t.messageTooLong(MESSAGE_MAX);
    setErrors(found);
    if (!day || !slot || Object.keys(found).length) {
      (found.day ? dayRef : slotRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      await requestDebtorCallback(session, callbackBody(day, slot, message));
      setDone({ day, slot });
    } catch (caught) {
      const view = fail(caught);
      if (!view) return;
      if (view.kind === 'pending') return setPendingRoute(true);
      if (view.kind === 'fields' && (view.field === 'preferredFrom' || view.field === 'preferredTo')) {
        setErrors({ slot: view.message });
        slotRef.current?.focus();
        return;
      }
      setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  const head = (
    <div className="grid gap-4">
      <BackToSituation onBack={onBack} />
      <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
      <h1
        id="debiteur-rappel"
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-h2 text-ink font-bold focus:outline-none"
      >
        {t.callbackTitle}
      </h1>
      {sessionBar}
    </div>
  );

  if (done) {
    return (
      <LinkSheet labelledBy="debiteur-rappel" head={head}>
        <LinkSheetSection className="pb-8">
          <LinkSheetOutcome
            tone="success"
            icon={<IconCheck className="size-6" />}
            title={t.callbackDoneTitle}
          >
            <p>
              {t.callbackDoneText(formatDate(beninNoon(done.day)), hour(done.slot[0]), hour(done.slot[1]))}
            </p>
          </LinkSheetOutcome>
          <Button variant="action" size="lg" className="w-full" onClick={onBack}>
            {t.backToSituation}
          </Button>
        </LinkSheetSection>
      </LinkSheet>
    );
  }

  return (
    <LinkSheet labelledBy="debiteur-rappel" head={head}>
      {pendingRoute ? (
        <LinkSheetSection className="pb-8">
          <BackendPending
            id="debiteur-rappel-attente"
            title={t.callbackTitle}
            needs={NEEDS}
            className="shadow-none"
          >
            {t.callbackPending}
          </BackendPending>
        </LinkSheetSection>
      ) : (
        <form noValidate onSubmit={submit}>
          <LinkSheetSection>
            <p className="text-ink-muted">{t.callbackLead}</p>
            <SelectField
              id="debiteur-jour"
              ref={dayRef}
              label={t.dayLabel}
              value={day}
              onChange={(event) => {
                setDay(event.target.value);
                setSlot(null);
              }}
              error={errors.day}
            >
              <option value="">{t.dayPlaceholder}</option>
              {days.map((date) => (
                <option key={date} value={date}>
                  {formatDate(beninNoon(date))}
                </option>
              ))}
            </SelectField>
            {day ? (
              <Fieldset id="debiteur-creneau" legend={t.slotLegend} error={errors.slot}>
                {slots.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((item, index) => (
                      <ChoicePill
                        key={item[0]}
                        ref={index === 0 ? slotRef : undefined}
                        name="creneau"
                        value={item[0]}
                        checked={slot?.[0] === item[0]}
                        onChange={() => setSlot(item)}
                        label={t.slotLabel(hour(item[0]), hour(item[1]))}
                        aria-invalid={errors.slot ? true : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-muted">{t.noSlotToday}</p>
                )}
              </Fieldset>
            ) : null}
          </LinkSheetSection>
          <LinkSheetSection className="pb-8">
            <TextAreaField
              id="debiteur-message-rappel"
              label={t.callbackMessage}
              hint={t.callbackMessageHint}
              rows={3}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(event) => setMessage(event.target.value)}
              counter={t.counter(message.length, MESSAGE_MAX)}
              error={errors.message}
            />
            <FormMessage>{error}</FormMessage>
            <Button type="submit" variant="action" size="lg" className="w-full" aria-busy={busy || undefined}>
              {busy ? t.requestingCallback : t.requestCallback}
            </Button>
          </LinkSheetSection>
        </form>
      )}
    </LinkSheet>
  );
}
