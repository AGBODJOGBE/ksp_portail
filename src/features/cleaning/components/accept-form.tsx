'use client';

import { type FormEvent, type ReactNode, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FormMessage } from '@/components/ui/field';
import { type AcceptInput, acceptQuote } from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError } from '@/features/cleaning/errors';
import { cn } from '@/lib/cn';
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

const OPTION = cn(
  'rounded-control border-line-strong bg-surface flex min-h-12 cursor-pointer items-start gap-3 border p-3.5',
  'has-[:checked]:border-action has-[:checked]:bg-action-soft has-[:checked]:ring-action has-[:checked]:ring-1',
  'has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
);
const RADIO = 'accent-action mt-0.5 size-5 shrink-0';

/** Titre numéroté d'une partie du formulaire (1. Créneau, 2. Paiement). */
function StepLegend({ index, children }: { index: number; children: ReactNode }) {
  return (
    <legend className="text-ink mb-3 flex items-center gap-3 font-semibold">
      <span
        aria-hidden="true"
        className="bg-brand text-on-brand grid size-7 place-items-center rounded-full text-xs tabular-nums"
      >
        {index}
      </span>
      {children}
    </legend>
  );
}

function Choices({
  legend,
  name,
  value,
  options,
  onChange,
  errorId,
}: {
  legend: string;
  name: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  errorId?: string;
}) {
  return (
    <fieldset className="grid gap-2" aria-describedby={errorId}>
      <legend className="text-small text-ink-muted mb-1 font-semibold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className={OPTION}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className={RADIO}
            />
            <span className="text-ink">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Acceptation d'un devis (`POST …/accept`) : un créneau parmi ceux proposés (`slotStart`) et, pour un
 * particulier, sa façon de payer (`paymentPlan` : `option`, `timing`, `method`) ; une entreprise n'envoie
 * pas de plan (facture mensuelle). Une clé d'idempotence par soumission, reprise si l'utilisateur renvoie
 * le même choix (réseau coupé, double clic).
 */
export function AcceptForm({
  requestId,
  quote,
  business = false,
  onAccepted,
  onFailure,
  onCancel,
}: {
  requestId: string;
  quote: Quote;
  /** Demande d'une entreprise : règlement par facture mensuelle. */
  business?: boolean;
  onAccepted: (response: AcceptResponse) => void;
  /** Erreur qui demande de relire la demande (devis expiré, modification concurrente). */
  onFailure: (view: CleaningErrorView) => void;
  /** Fermer le formulaire sans rien envoyer. */
  onCancel?: () => void;
}) {
  const id = useId();
  const submission = useRef(idempotentSubmission());
  const slotsRef = useRef<HTMLFieldSetElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState(quote.proposedSlots.length === 1 ? quote.proposedSlots[0]!.start : '');
  const [plan, setPlan] = useState<PaymentPlan>({
    option: quote.depositPercent > 0 ? 'deposit' : 'full',
    timing: 'before',
    method: 'cash',
  });
  const [slotError, setSlotError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
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
  const chosen = quote.proposedSlots.find((proposed) => proposed.start === slot);
  const firstPayment = plan.option === 'deposit' ? quote.depositAmount : quote.total;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPlanError(null);
    if (!slot) {
      setSlotError(t.slotRequired);
      slotsRef.current?.querySelector('input')?.focus();
      return;
    }
    setSlotError(null);
    // Une entreprise règle par facture mensuelle : `paymentPlan` n'est pas envoyé (contrat, #19).
    const input: AcceptInput = business ? { slotStart: slot } : { slotStart: slot, paymentPlan: plan };
    setPending(true);
    try {
      const response = await acceptQuote(requestId, input, submission.current.keyFor(input));
      submission.current.done();
      onAccepted(response);
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'expired' || view.kind === 'stale' || view.kind === 'notFound') onFailure(view);
      else if (view.kind === 'slots' || (view.kind === 'field' && view.field === 'slotStart')) {
        setSlotError(view.message);
        slotsRef.current?.querySelector('input')?.focus();
      } else if (view.kind === 'field' && view.field === 'paymentPlan') {
        setPlanError(view.message);
        paymentRef.current?.querySelector('input')?.focus();
      } else if (view.kind === 'organizationSuspended')
        setError(cleaningTexts.common.organizationSuspendedAccept);
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
      className="rounded-card border-action-muted bg-surface grid gap-7 border p-5 sm:p-6"
    >
      <div className="grid gap-1">
        <p id={`${id}-titre`} className="font-display text-ink text-xl font-semibold">
          {t.acceptTitle}
        </p>
        <p className="text-small text-ink-muted">{t.acceptLead}</p>
      </div>

      <fieldset
        ref={slotsRef}
        aria-describedby={slotError ? `${id}-creneau-erreur` : undefined}
        className="grid gap-2"
      >
        <StepLegend index={1}>{t.chooseSlot}</StepLegend>
        {quote.proposedSlots.map((proposed) => (
          <label key={proposed.start} className={OPTION}>
            <input
              type="radio"
              name={`${id}-creneau`}
              value={proposed.start}
              checked={slot === proposed.start}
              onChange={() => setSlot(proposed.start)}
              className={RADIO}
            />
            <span className="text-ink font-medium">{formatSlot(proposed)}</span>
          </label>
        ))}
        {slotError ? <FieldError id={`${id}-creneau-erreur`}>{slotError}</FieldError> : null}
      </fieldset>

      {business ? (
        <div className="grid gap-1">
          <p className="text-ink flex items-center gap-3 font-semibold">
            <span
              aria-hidden="true"
              className="bg-brand text-on-brand grid size-7 place-items-center rounded-full text-xs"
            >
              2
            </span>
            {t.paymentTitle}
          </p>
          <p className="text-ink-muted">{t.businessPayment}</p>
        </div>
      ) : (
        <fieldset className="grid gap-4" aria-describedby={planError ? `${id}-paiement-erreur` : undefined}>
          <StepLegend index={2}>{t.paymentTitle}</StepLegend>
          <div ref={paymentRef} className="grid gap-4">
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
          {planError ? <FieldError id={`${id}-paiement-erreur`}>{planError}</FieldError> : null}
        </fieldset>
      )}

      {/* Récapitulatif avant confirmation : montants et créneau tels que les donne le devis. */}
      <div className="rounded-control bg-surface-muted grid gap-1.5 p-4" aria-live="polite">
        <p className="text-small text-ink-muted font-semibold">{t.acceptRecap}</p>
        <p className="text-ink">{chosen ? formatSlot(chosen) : t.noSlotYet}</p>
        {business ? null : (
          <p className="text-ink">
            {t.firstPayment(
              formatXof(firstPayment),
              (paymentTimings[plan.timing] ?? plan.timing).toLowerCase(),
              (paymentMethods[plan.method] ?? plan.method).toLowerCase(),
            )}
          </p>
        )}
      </div>

      <FormMessage>{error}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="submit" size="lg" variant="action" aria-busy={pending || undefined} disabled={pending}>
          {pending ? cleaningTexts.common.sending : t.confirmAccept}
        </Button>
        {onCancel ? (
          <Button variant="ghost" size="lg" onClick={onCancel} disabled={pending}>
            {cleaningTexts.common.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
