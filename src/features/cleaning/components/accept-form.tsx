'use client';

import { type FormEvent, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FormMessage } from '@/components/ui/field';
import { acceptQuote } from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError } from '@/features/cleaning/errors';
import { formatSlot, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import type { AcceptResponse, PaymentPlan, Quote } from '@/features/cleaning/schemas';
import {
  OFFERED_PAYMENT_METHODS,
  cleaningTexts,
  paymentMethods,
  paymentOptions,
  paymentTimings,
} from '@/features/cleaning/texts';

const t = cleaningTexts.requestDetail;

/**
 * Une entreprise règle par facture mensuelle : aucun choix de paiement ne lui est proposé. La gateway
 * exige pourtant `paymentPlan` ; on envoie la formule que le service applique aux entreprises.
 */
export const BUSINESS_PAYMENT_PLAN: PaymentPlan = { option: 'full', timing: 'after', method: 'cash' };

const OPTION =
  'rounded-control border-line-strong bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-focus flex min-h-12 cursor-pointer items-start gap-3 border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2';

function Choices({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-small text-ink mb-1 font-semibold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className={OPTION}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="accent-accent mt-0.5 size-5 shrink-0"
            />
            <span className="text-ink">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Acceptation d'un devis : créneau parmi ceux proposés et façon de payer. Une clé d'idempotence par
 * soumission, reprise si l'utilisateur renvoie le même choix (réseau coupé, double clic).
 */
export function AcceptForm({
  requestId,
  quote,
  business = false,
  onAccepted,
  onFailure,
}: {
  requestId: string;
  quote: Quote;
  /** Demande d'une entreprise : règlement par facture mensuelle. */
  business?: boolean;
  onAccepted: (response: AcceptResponse) => void;
  /** Erreur qui demande de relire la demande (devis expiré, modification concurrente). */
  onFailure: (view: CleaningErrorView) => void;
}) {
  const id = useId();
  const submission = useRef(idempotentSubmission());
  const slotsRef = useRef<HTMLFieldSetElement>(null);
  const [slot, setSlot] = useState(quote.proposedSlots.length === 1 ? quote.proposedSlots[0]!.start : '');
  const [plan, setPlan] = useState<PaymentPlan>({
    option: quote.depositPercent > 0 ? 'deposit' : 'full',
    timing: 'before',
    method: 'cash',
  });
  const [slotError, setSlotError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const options = Object.entries(paymentOptions)
    .filter(([value]) => value !== 'deposit' || quote.depositPercent > 0)
    .map(([value, label]) => ({
      value,
      label:
        value === 'deposit'
          ? `${label} de ${quote.depositPercent} % (${formatXof(quote.depositAmount)})`
          : `${label} (${formatXof(quote.total)})`,
    }));

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
    const input = { slotStart: slot, paymentPlan: business ? BUSINESS_PAYMENT_PLAN : plan };
    setPending(true);
    try {
      const response = await acceptQuote(requestId, input, submission.current.keyFor(input));
      submission.current.done();
      onAccepted(response);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'expired' || view.kind === 'stale' || view.kind === 'notFound') onFailure(view);
      else if (view.kind === 'slots') setSlotError(view.message);
      else setError(view.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-titre`}
      className="rounded-card border-accent-muted bg-accent-soft grid gap-6 border p-5 sm:p-6"
    >
      <p id={`${id}-titre`} className="font-display text-ink text-lg font-semibold">
        {t.acceptTitle}
      </p>
      <fieldset
        ref={slotsRef}
        aria-describedby={slotError ? `${id}-creneau-erreur` : undefined}
        className="grid gap-2"
      >
        <legend className="text-ink mb-1 font-semibold">{t.chooseSlot}</legend>
        {quote.proposedSlots.map((proposed) => (
          <label key={proposed.start} className={OPTION}>
            <input
              type="radio"
              name={`${id}-creneau`}
              value={proposed.start}
              checked={slot === proposed.start}
              onChange={() => setSlot(proposed.start)}
              className="accent-accent mt-0.5 size-5 shrink-0"
            />
            <span className="text-ink">{formatSlot(proposed)}</span>
          </label>
        ))}
        {slotError ? <FieldError id={`${id}-creneau-erreur`}>{slotError}</FieldError> : null}
      </fieldset>

      {business ? (
        <div className="grid gap-1">
          <p className="text-ink font-semibold">{t.paymentTitle}</p>
          <p className="text-ink-muted">{t.businessPayment}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-ink font-semibold">{t.paymentTitle}</p>
          <Choices
            legend={t.paymentOption}
            name={`${id}-montant`}
            value={plan.option}
            options={options}
            onChange={(option) => setPlan({ ...plan, option })}
          />
          <Choices
            legend={t.paymentTiming}
            name={`${id}-moment`}
            value={plan.timing}
            options={Object.entries(paymentTimings).map(([value, label]) => ({ value, label }))}
            onChange={(timing) => setPlan({ ...plan, timing })}
          />
          <Choices
            legend={t.paymentMethod}
            name={`${id}-moyen`}
            value={plan.method}
            options={OFFERED_PAYMENT_METHODS.map((value) => ({ value, label: paymentMethods[value]! }))}
            onChange={(method) => setPlan({ ...plan, method })}
          />
        </div>
      )}

      <FormMessage>{error}</FormMessage>
      <Button type="submit" size="lg" className="sm:justify-self-start" aria-busy={pending || undefined}>
        {pending ? cleaningTexts.common.sending : t.confirmAccept}
      </Button>
    </form>
  );
}
