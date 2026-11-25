'use client';

import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { ChoicePill, Fieldset } from '@/components/ui/form-fields';
import { IconArrowUpRight, IconCheck } from '@/components/ui/icons';
import { LinkSheet, LinkSheetEyebrow, LinkSheetOutcome, LinkSheetSection } from '@/components/ui/link-sheet';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { parseAmount, payableOffer } from '@/features/recovery/debtor';
import { createDebtorPayment } from '@/features/recovery/debtor-api';
import type { DebtorCase, DebtorPaymentCreated } from '@/features/recovery/debtor-schemas';
import { debtorTexts as t } from '@/features/recovery/debtor-texts';
import type { Money } from '@/features/recovery/schemas';
import {
  BackToSituation,
  BlockedTabLink,
  type Fail,
  NewTabLink,
  openInNewTab,
  useFocusOnMount,
} from './debtor-parts';

export type PayChoice = 'all' | 'offer' | 'other';

const NEEDS = [
  {
    method: 'POST' as const,
    path: '/api/v1/recovery/debtor/payments',
    purpose: 'Lien de paiement Mobile Money du montant choisi (au plus le montant dû) ou de la remise.',
  },
];

/**
 * D4 — Payer : la totalité, un montant libre (au plus le montant dû, rappelé ; recovery juge) ou la remise
 * proposée. Un lien de paiement est créé (`Idempotency-Key` par saisie, gardée pendant les renvois) et sa
 * page (`/payer/<jeton>`) s'ouvre dans un **nouvel onglet** : la session reste ouverte ici.
 */
export function DebtorPay({
  session,
  debtorCase,
  fail,
  onBack,
  preset,
  sessionBar,
}: {
  session: string;
  debtorCase: DebtorCase;
  fail: Fail;
  onBack: () => void;
  preset: PayChoice;
  sessionBar: ReactNode;
}) {
  const due = debtorCase.amounts.due;
  const offer = payableOffer(debtorCase);
  const [choice, setChoice] = useState<PayChoice>(preset === 'offer' && !offer ? 'all' : preset);
  const [other, setOther] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(false);
  const [created, setCreated] = useState<(DebtorPaymentCreated & { fallback: string | null }) | null>(null);
  const [submission] = useState(() => idempotentSubmission());
  const amountRef = useRef<HTMLInputElement>(null);
  const titleRef = useFocusOnMount<HTMLHeadingElement>();

  function body(): { amount: Money; settlementId?: string } | null {
    if (choice === 'offer' && offer) return { amount: offer.payNow, settlementId: offer.id };
    if (choice === 'all') return { amount: due };
    const amount = parseAmount(other);
    if (amount === null) {
      setAmountError(t.amountMissing);
      return null;
    }
    if (amount > due.amount) {
      setAmountError(t.amountTooHigh(formatXof(due)));
      return null;
    }
    return { amount: { amount, currency: 'XOF' } };
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setAmountError(null);
    const payload = body();
    if (!payload) {
      amountRef.current?.focus();
      return;
    }
    setBusy(true);
    const key = submission.keyFor(payload);
    const holder: { link?: DebtorPaymentCreated } = {};
    try {
      const fallback = await openInNewTab(async () => {
        holder.link = await createDebtorPayment(session, payload, key);
        return holder.link.paymentUrl;
      });
      submission.done();
      if (holder.link) setCreated({ ...holder.link, fallback });
    } catch (caught) {
      const view = fail(caught);
      if (!view) return;
      if (view.kind === 'pending') return setPendingRoute(true);
      if (view.kind === 'newKey') submission.done();
      if (view.kind === 'amount') {
        setChoice('other');
        setAmountError(view.message);
        amountRef.current?.focus();
        return;
      }
      setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  const amountLabel = (() => {
    if (choice === 'offer' && offer) return formatXof(offer.payNow);
    if (choice === 'all') return formatXof(due);
    const amount = parseAmount(other);
    return amount ? formatXof(amount) : null;
  })();

  return (
    <LinkSheet
      labelledBy="debiteur-payer"
      head={
        <div className="grid gap-4">
          <BackToSituation onBack={onBack} />
          <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
          <h1
            id="debiteur-payer"
            ref={titleRef}
            tabIndex={-1}
            className="font-display text-h2 text-ink font-bold focus:outline-none"
          >
            {t.payTitle}
          </h1>
          {sessionBar}
        </div>
      }
    >
      {pendingRoute ? (
        <LinkSheetSection className="pb-8">
          <BackendPending id="debiteur-paiement" title={t.payTitle} needs={NEEDS} className="shadow-none">
            {t.payPending}
          </BackendPending>
        </LinkSheetSection>
      ) : created ? (
        <LinkSheetSection className="pb-8">
          <LinkSheetOutcome tone="success" icon={<IconCheck className="size-6" />} title={t.payOpenedTitle}>
            <p>{t.payOpenedText(formatXof(created.amount), formatDateTime(created.expiresAt))}</p>
          </LinkSheetOutcome>
          <BlockedTabLink
            url={created.fallback}
            text={t.payBlocked}
            label={t.openPayment}
            onUsed={() => setCreated({ ...created, fallback: null })}
          />
          <Button variant="action" size="lg" className="w-full" onClick={onBack}>
            {t.refresh}
          </Button>
          <NewTabLink href={created.paymentUrl}>{t.payAgain}</NewTabLink>
        </LinkSheetSection>
      ) : (
        <form noValidate onSubmit={pay}>
          <LinkSheetSection>
            <p className="text-ink-muted">{t.payLead}</p>
            {debtorCase.pendingPaymentUrl ? (
              <div className="rounded-control border-line bg-surface-muted grid gap-3 border p-4">
                <p className="text-ink font-medium">{t.pendingPayment}</p>
                <NewTabLink href={debtorCase.pendingPaymentUrl}>{t.resumePayment}</NewTabLink>
                <p className="text-small text-ink-muted">{t.replacesPending}</p>
              </div>
            ) : null}
            <Fieldset id="debiteur-montant" legend={t.amountLegend} legendClassName="text-lg">
              <div className="grid gap-2">
                <ChoicePill
                  name="montant"
                  value="all"
                  checked={choice === 'all'}
                  onChange={() => setChoice('all')}
                  label={t.payAll}
                  hint={formatXof(due)}
                />
                {offer ? (
                  <ChoicePill
                    name="montant"
                    value="offer"
                    checked={choice === 'offer'}
                    onChange={() => setChoice('offer')}
                    label={t.payOffer}
                    hint={t.payOfferHint(formatXof(offer.payNow), formatShortDate(offer.validUntil))}
                  />
                ) : null}
                <ChoicePill
                  name="montant"
                  value="other"
                  checked={choice === 'other'}
                  onChange={() => setChoice('other')}
                  label={t.payOther}
                />
              </div>
            </Fieldset>
            {choice === 'other' ? (
              <TextField
                id="debiteur-montant-libre"
                inputRef={amountRef}
                label={t.otherAmount}
                hint={t.otherAmountHint(formatXof(due))}
                inputMode="numeric"
                autoComplete="off"
                value={other}
                onChange={(event) => setOther(event.target.value)}
                error={amountError}
                inputClassName="max-w-64 tabular-nums"
              />
            ) : amountError ? (
              <FormMessage>{amountError}</FormMessage>
            ) : null}
          </LinkSheetSection>
          <LinkSheetSection className="pb-8">
            <FormMessage>{error}</FormMessage>
            <Button type="submit" variant="action" size="lg" className="w-full" aria-busy={busy || undefined}>
              {busy ? t.creating : amountLabel ? t.payAmount(amountLabel) : t.pay}
              {busy ? null : <IconArrowUpRight className="size-5" />}
            </Button>
            <p className="text-small text-ink-muted text-center">{t.newTabNotice}</p>
          </LinkSheetSection>
        </form>
      )}
    </LinkSheet>
  );
}
