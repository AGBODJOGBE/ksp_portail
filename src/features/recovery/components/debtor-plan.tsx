'use client';

import { type FormEvent, type ReactNode, useCallback, useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { ChoicePill, Fieldset, TextAreaField } from '@/components/ui/form-fields';
import { IconAlert, IconCheck, IconInfo } from '@/components/ui/icons';
import { LinkSheet, LinkSheetEyebrow, LinkSheetOutcome, LinkSheetSection } from '@/components/ui/link-sheet';
import { beninDate, formatShortDate, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { useCountdown } from '@/lib/use-countdown';
import { useLive } from '@/lib/use-live';
import { describeDebtorError, parseAmount } from '@/features/recovery/debtor';
import {
  type PlanTermsBody,
  proposeDebtorPlan,
  resendPlanSignature,
  simulateDebtorPlan,
} from '@/features/recovery/debtor-api';
import type { DebtorCase, DebtorPlan, DebtorPlanSimulation } from '@/features/recovery/debtor-schemas';
import { RHYTHMS, debtorTexts as t, violationLabel } from '@/features/recovery/debtor-texts';
import { formatRate } from '@/features/recovery/texts';
import { BackToSituation, type Fail, useFocusOnMount } from './debtor-parts';

const NEEDS = [
  {
    method: 'POST' as const,
    path: '/api/v1/recovery/debtor/payment-plans/simulate',
    purpose: 'Échéances calculées sur le montant dû et contrôle du barème du créancier.',
  },
  {
    method: 'POST' as const,
    path: '/api/v1/recovery/debtor/payment-plans',
    purpose: 'Proposition : signature par lien dans le barème, sinon transmise au chargé.',
  },
];

const MESSAGE_MAX = 1000;
type Rhythm = PlanTermsBody['rhythm'];

/** Renvoi du lien de signature de l'échéancier (deux minutes entre deux envois, côté recovery). */
export function ResendSignature({ session, planId, fail }: { session: string; planId: string; fail: Fail }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wait = useCountdown();

  async function resend() {
    if (busy || wait.remaining > 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setDone(t.signatureResent(formatShortDate(await resendPlanSignature(session, planId))));
    } catch (caught) {
      const view = fail(caught);
      if (!view) return;
      if (view.retryAfterSeconds) wait.start(view.retryAfterSeconds);
      setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        variant="secondary"
        onClick={resend}
        disabled={wait.remaining > 0}
        aria-busy={busy || undefined}
      >
        {busy
          ? t.resendingSignature
          : wait.remaining > 0
            ? t.resendSignatureIn(wait.remaining)
            : t.resendSignature}
      </Button>
      <FormMessage tone="success">{done}</FormMessage>
      <FormMessage>{error}</FormMessage>
    </div>
  );
}

function Simulation({ simulation }: { simulation: DebtorPlanSimulation }) {
  return (
    <div className="grid gap-3">
      <ol className="grid gap-2">
        {simulation.installments.map((installment) => (
          <li
            key={installment.rank}
            className="border-line flex items-center justify-between gap-4 border-b pb-2 last:border-b-0"
          >
            <span className="grid">
              <span className="text-ink font-medium">{t.installment(installment.rank)}</span>
              <span className="text-small text-ink-muted">{formatShortDate(installment.dueDate)}</span>
            </span>
            <span className="text-ink font-semibold tabular-nums">{formatXof(installment.amount)}</span>
          </li>
        ))}
      </ol>
      <p className="text-ink flex justify-between font-semibold tabular-nums">
        <span>{t.planTotal}</span>
        <span>{formatXof(simulation.total)}</span>
      </p>
      {simulation.withinScale ? (
        <FormMessage tone="success">{t.withinScale}</FormMessage>
      ) : (
        <div className="rounded-control border-warning bg-warning-soft text-ink grid gap-2 border p-4">
          <p className="text-small flex items-start gap-2 font-medium">
            <IconInfo className="text-warning mt-0.5 size-4 shrink-0" />
            {t.outOfScale}
          </p>
          {simulation.violations.length ? (
            <ul className="text-small grid gap-1 pl-6">
              {simulation.violations.map((violation) => (
                <li key={violation} className="list-disc">
                  {violationLabel(violation)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * D5 — Proposer un échéancier : premier versement, date, rythme et nombre d'échéances ; calcul en direct
 * par recovery (`payment-plans/simulate`, après une pause de saisie), puis proposition
 * (`Idempotency-Key` par saisie). Dans le barème : lien de signature envoyé par message ; sinon,
 * transmise au chargé. Aucun montant n'est calculé ici.
 */
export function DebtorPlanForm({
  session,
  debtorCase,
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
  const scale = debtorCase.planScale;
  const [firstAmount, setFirstAmount] = useState('');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [rhythm, setRhythm] = useState<Rhythm>('monthly');
  const [count, setCount] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(false);
  const [proposed, setProposed] = useState<DebtorPlan | null>(null);
  const [submission] = useState(() => idempotentSubmission());
  const [today] = useState(() => beninDate());
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);
  const titleRef = useFocusOnMount<HTMLHeadingElement>();

  const amount = parseAmount(firstAmount);
  const installments = /^\d{1,2}$/.test(count) ? Number(count) : null;
  const terms: PlanTermsBody | null =
    amount && firstDueDate && installments && installments >= 1 && installments <= 52
      ? { firstAmount: { amount, currency: 'XOF' }, firstDueDate, rhythm, installmentsCount: installments }
      : null;

  // Session perdue pendant un calcul : l'écran parent revient au code.
  const run = useCallback(
    async (body: PlanTermsBody, signal: AbortSignal) => {
      try {
        return await simulateDebtorPlan(session, body, signal);
      } catch (caught) {
        fail(caught);
        throw caught;
      }
    },
    [session, fail],
  );
  const live = useLive(terms, run, describeDebtorError);
  const routePending = pendingRoute || (live.status === 'error' && live.error.kind === 'pending');

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const found: Record<string, string> = {};
    if (!amount) found.firstAmount = t.firstAmountMissing;
    if (!firstDueDate) found.firstDueDate = t.firstDateMissing;
    if (!installments || installments < 1 || installments > 52) found.count = t.countInvalid;
    if (message.length > MESSAGE_MAX) found.message = t.messageTooLong(MESSAGE_MAX);
    setErrors(found);
    if (!terms || Object.keys(found).length) {
      (found.firstAmount ? amountRef : found.firstDueDate ? dateRef : countRef).current?.focus();
      return;
    }
    const body = { terms, ...(message.trim() ? { message: message.trim() } : {}) };
    setBusy(true);
    try {
      const plan = await proposeDebtorPlan(session, body, submission.keyFor(body));
      submission.done();
      setProposed(plan);
    } catch (caught) {
      const view = fail(caught);
      if (!view) return;
      if (view.kind === 'pending') return setPendingRoute(true);
      if (view.kind === 'newKey') submission.done();
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
        id="debiteur-echeancier"
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-h2 text-ink font-bold focus:outline-none"
      >
        {t.planFormTitle}
      </h1>
      {sessionBar}
    </div>
  );

  if (proposed) {
    const toSign = proposed.withinScale && proposed.documentId !== null;
    return (
      <LinkSheet labelledBy="debiteur-echeancier" head={head}>
        <LinkSheetSection className="pb-8">
          <LinkSheetOutcome
            tone={toSign ? 'success' : 'neutral'}
            icon={toSign ? <IconCheck className="size-6" /> : <IconInfo className="size-6" />}
            title={toSign ? t.proposedSignTitle : t.proposedReviewTitle}
          >
            <p>{toSign ? t.proposedSignText : t.proposedReviewText}</p>
          </LinkSheetOutcome>
          {toSign ? <ResendSignature session={session} planId={proposed.id} fail={fail} /> : null}
          <Button variant="action" size="lg" className="w-full" onClick={onBack}>
            {t.backToSituation}
          </Button>
        </LinkSheetSection>
      </LinkSheet>
    );
  }

  return (
    <LinkSheet labelledBy="debiteur-echeancier" head={head}>
      {routePending ? (
        <LinkSheetSection className="pb-8">
          <BackendPending
            id="debiteur-echeancier-attente"
            title={t.planFormTitle}
            needs={NEEDS}
            className="shadow-none"
          >
            {t.planPending}
          </BackendPending>
        </LinkSheetSection>
      ) : (
        <form noValidate onSubmit={propose}>
          <LinkSheetSection>
            <p className="text-ink-muted">{t.planLead}</p>
            <div className="rounded-control bg-surface-muted grid gap-1 p-4">
              <p className="text-ink font-semibold">{t.scaleTitle}</p>
              <ul className="text-small text-ink-muted grid gap-1 pl-5">
                <li className="list-disc">{t.scaleDuration(scale.maxDurationMonths)}</li>
                <li className="list-disc">
                  {t.scaleFirst(formatRate(scale.minFirstPaymentBps), scale.firstPaymentWithinDays)}
                </li>
                <li className="list-disc">{t.scaleMinimum(formatXof(scale.minInstallment))}</li>
              </ul>
            </div>
            <TextField
              id="debiteur-premier-versement"
              inputRef={amountRef}
              label={t.firstAmount}
              hint={t.otherAmountHint(formatXof(debtorCase.amounts.due))}
              inputMode="numeric"
              autoComplete="off"
              value={firstAmount}
              onChange={(event) => setFirstAmount(event.target.value)}
              error={errors.firstAmount}
              inputClassName="max-w-64 tabular-nums"
            />
            <TextField
              id="debiteur-premiere-date"
              inputRef={dateRef}
              label={t.firstDueDate}
              type="date"
              min={today}
              value={firstDueDate}
              onChange={(event) => setFirstDueDate(event.target.value)}
              error={errors.firstDueDate}
              inputClassName="max-w-64"
            />
            <Fieldset id="debiteur-rythme" legend={t.rhythm}>
              <div className="grid gap-2 sm:grid-cols-3">
                {RHYTHMS.map((item) => (
                  <ChoicePill
                    key={item.value}
                    name="rythme"
                    value={item.value}
                    checked={rhythm === item.value}
                    onChange={() => setRhythm(item.value)}
                    label={item.label}
                  />
                ))}
              </div>
            </Fieldset>
            <TextField
              id="debiteur-echeances"
              inputRef={countRef}
              label={t.installmentsCount}
              hint={t.installmentsHint}
              type="number"
              inputMode="numeric"
              min={1}
              max={52}
              value={count}
              onChange={(event) => setCount(event.target.value.replace(/\D/g, '').slice(0, 2))}
              error={errors.count}
              inputClassName="max-w-32 tabular-nums"
            />
          </LinkSheetSection>

          <LinkSheetSection>
            <h2 className="font-display text-ink text-lg font-semibold">{t.simulationTitle}</h2>
            <div aria-live="polite" aria-busy={live.status === 'loading' || undefined} className="grid gap-3">
              {live.status === 'idle' ? <p className="text-ink-muted">{t.planIncomplete}</p> : null}
              {live.status === 'loading' ? (
                live.last ? (
                  <div className="opacity-60">
                    <Simulation simulation={live.last} />
                  </div>
                ) : (
                  <p className="text-ink-muted">{t.simulating}</p>
                )
              ) : null}
              {live.status === 'ready' ? <Simulation simulation={live.data} /> : null}
              {live.status === 'error' && live.error.kind !== 'session' ? (
                <p className="text-small text-danger flex items-start gap-2 font-medium">
                  <IconAlert className="mt-0.5 size-4 shrink-0" />
                  {live.error.message}
                </p>
              ) : null}
            </div>
          </LinkSheetSection>

          <LinkSheetSection className="pb-8">
            <TextAreaField
              id="debiteur-message-echeancier"
              label={t.planMessage}
              hint={t.planMessageHint}
              value={message}
              maxLength={MESSAGE_MAX}
              onChange={(event) => setMessage(event.target.value)}
              counter={t.counter(message.length, MESSAGE_MAX)}
              error={errors.message}
            />
            <FormMessage>{error}</FormMessage>
            <Button type="submit" variant="action" size="lg" className="w-full" aria-busy={busy || undefined}>
              {busy ? t.proposing : t.propose}
            </Button>
          </LinkSheetSection>
        </form>
      )}
    </LinkSheet>
  );
}
