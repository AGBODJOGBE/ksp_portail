'use client';

import { type FormEvent, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FormMessage } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { formatShortDate, formatSlot, formatXof } from '@/lib/format';
import { acceptGroupQuotes, type AcceptInput } from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError } from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import type { GroupOutcome, PaymentPlan, QuoteRequest, RequestGroup } from '@/features/cleaning/schemas';
import { spaceTexts } from '@/features/cleaning/space-texts';
import {
  OFFERED_PAYMENT_METHODS,
  cleaningTexts,
  planMethods,
  paymentOptions,
  paymentTimings,
} from '@/features/cleaning/texts';
import { Choices, OPTION, RADIO, StepLegend } from './accept-form';

const t = spaceTexts.accept;

/** Créneaux proposés par au moins un devis, du plus proche au plus lointain, avec le nombre de devis. */
function proposedSlots(quotes: ReadonlyArray<QuoteRequest>) {
  const slots = new Map<string, { slot: { start: string; end: string }; count: number }>();
  for (const request of quotes) {
    for (const slot of request.quote?.proposedSlots ?? []) {
      const known = slots.get(slot.start);
      if (known) known.count += 1;
      else slots.set(slot.start, { slot, count: 1 });
    }
  }
  return [...slots.values()].sort((a, b) => a.slot.start.localeCompare(b.slot.start));
}

/**
 * Acceptation commune des devis d'un groupe (`POST …/quote-request-groups/{id}/accept`, ADR-035) :
 * récapitulatif des devis (montants tels que les donne la gateway), un créneau commun et, pour un
 * particulier, une façon de payer commune. Les devis qui ne proposent pas le créneau sont laissés de côté
 * par la gateway (`skipped`). Une clé d'idempotence par contenu, reprise au renvoi.
 */
export function GroupAccept({
  group,
  quotes,
  names,
  business,
  onAccepted,
  onFailure,
  onCancel,
}: {
  group: RequestGroup;
  /** Demandes dont le devis peut être accepté. */
  quotes: ReadonlyArray<QuoteRequest>;
  names: (code: string) => string;
  business: boolean;
  onAccepted: (outcome: GroupOutcome) => void;
  onFailure: (view: CleaningErrorView) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const submission = useRef(idempotentSubmission());
  const slotsRef = useRef<HTMLFieldSetElement>(null);
  const slots = useMemo(() => proposedSlots(quotes), [quotes]);
  const withDeposit = quotes.some((request) => (request.quote?.depositPercent ?? 0) > 0);
  const [slot, setSlot] = useState(slots.length === 1 ? slots[0]!.slot.start : '');
  const [plan, setPlan] = useState<PaymentPlan>({
    option: withDeposit ? 'deposit' : 'full',
    timing: 'before',
    method: 'mobile_money_online',
  });
  const [slotError, setSlotError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (!slot) {
      setSlotError(t.slotRequired);
      slotsRef.current?.querySelector('input')?.focus();
      return;
    }
    setSlotError(null);
    const input: AcceptInput = business ? { slotStart: slot } : { slotStart: slot, paymentPlan: plan };
    setPending(true);
    try {
      const outcome = await acceptGroupQuotes(group.groupId, input, submission.current.keyFor(input));
      submission.current.done();
      onAccepted(outcome);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'expired' || view.kind === 'stale' || view.kind === 'notFound') onFailure(view);
      else if (view.kind === 'slots' || (view.kind === 'field' && view.field === 'slotStart')) {
        setSlotError(view.message);
        slotsRef.current?.querySelector('input')?.focus();
      } else if (view.kind === 'organizationSuspended') {
        setError(cleaningTexts.common.organizationSuspendedAccept);
      } else setError(view.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-titre`}
      className="rounded-card border-action-muted bg-surface grid gap-7 border p-5 sm:p-6"
    >
      <div className="grid gap-1">
        <h3 id={`${id}-titre`} className="font-display text-ink text-xl font-semibold">
          {t.title}
        </h3>
        <p className="text-small text-ink-muted">{t.lead}</p>
      </div>

      <section aria-labelledby={`${id}-recap`} className="rounded-control bg-surface-muted grid gap-3 p-4">
        <p id={`${id}-recap`} className="text-small text-ink-muted font-semibold">
          {t.recapTitle}
        </p>
        <ul className="divide-line grid divide-y">
          {quotes.map((request) => {
            const quote = request.quote!;
            return (
              <li key={request.id} className="grid gap-1 py-2.5 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="text-ink font-semibold">
                    {request.serviceName ?? names(request.serviceCode)}
                  </span>
                  <span className="text-ink font-semibold tabular-nums">{formatXof(quote.total)}</span>
                </div>
                <p className="text-small text-ink-muted">
                  {[
                    !business && quote.depositPercent > 0
                      ? `${t.deposit(quote.depositPercent)} : ${formatXof(quote.depositAmount)}`
                      : null,
                    spaceTexts.group.quoteValidUntil(formatShortDate(quote.validUntil)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            );
          })}
        </ul>
        {group.quotesTotal ? (
          <div className="border-line flex flex-wrap items-baseline justify-between gap-x-4 border-t pt-3">
            <span className="text-ink font-semibold">{t.groupTotal}</span>
            <span className="font-display text-ink text-2xl font-semibold tabular-nums">
              {formatXof(group.quotesTotal)}
            </span>
          </div>
        ) : null}
      </section>

      <fieldset
        ref={slotsRef}
        aria-describedby={cn(`${id}-creneau-aide`, slotError ? `${id}-creneau-erreur` : null)}
        className="grid gap-2"
      >
        <StepLegend index={1}>{t.slotLegend}</StepLegend>
        <p id={`${id}-creneau-aide`} className="text-small text-ink-muted -mt-1">
          {t.slotHint}
        </p>
        {slots.map(({ slot: proposed, count }) => (
          <label key={proposed.start} className={OPTION}>
            <input
              type="radio"
              name={`${id}-creneau`}
              value={proposed.start}
              checked={slot === proposed.start}
              onChange={() => setSlot(proposed.start)}
              className={RADIO}
            />
            <span className="grid gap-0.5">
              <span className="text-ink font-medium">{formatSlot(proposed)}</span>
              <span className="text-small text-ink-muted">{t.slotQuotes(count, quotes.length)}</span>
            </span>
          </label>
        ))}
        {slotError ? <FieldError id={`${id}-creneau-erreur`}>{slotError}</FieldError> : null}
      </fieldset>

      {business ? (
        <div className="grid gap-1">
          <p className="text-ink font-semibold">{t.paymentLegend}</p>
          <p className="text-ink-muted">{t.businessPayment}</p>
        </div>
      ) : (
        <fieldset className="grid gap-4">
          <StepLegend index={2}>{t.paymentLegend}</StepLegend>
          <Choices
            legend={cleaningTexts.requestDetail.paymentOption}
            name={`${id}-montant`}
            value={plan.option}
            options={Object.entries(paymentOptions)
              .filter(([value]) => value !== 'deposit' || withDeposit)
              .map(([value, label]) => ({ value, label }))}
            onChange={(option) => setPlan({ ...plan, option })}
          />
          <Choices
            legend={cleaningTexts.requestDetail.paymentTiming}
            name={`${id}-moment`}
            value={plan.timing}
            options={Object.entries(paymentTimings).map(([value, label]) => ({ value, label }))}
            onChange={(timing) => setPlan({ ...plan, timing })}
          />
          <Choices
            legend={cleaningTexts.requestDetail.paymentMethod}
            name={`${id}-moyen`}
            value={plan.method}
            options={OFFERED_PAYMENT_METHODS.map((value) => ({ value, label: planMethods[value]! }))}
            onChange={(method) => setPlan({ ...plan, method })}
          />
        </fieldset>
      )}

      <FormMessage>{error}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="submit" size="lg" variant="action" aria-busy={pending || undefined} disabled={pending}>
          {pending ? t.sending : t.submit}
        </Button>
        <Button variant="ghost" size="lg" onClick={onCancel} disabled={pending}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
