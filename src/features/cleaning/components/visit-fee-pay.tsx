'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconWallet } from '@/components/ui/icons';
import { formatDateTime, formatXof } from '@/lib/format';
import { safeCheckoutUrl } from '@/features/payment';
import { walletPaths } from '@/features/wallet';
import { payVisitFee } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { requestTexts as t } from '@/features/cleaning/request-texts';
import type { VisitFee } from '@/features/cleaning/schemas';

type Method = 'wallet' | 'mobile_money';

/**
 * Paiement des frais de visite d'une demande (`POST /requests/{id}/visit-fee/pay`, ADR-055 §2) : un seul
 * chemin pour l'argent, le portefeuille. Mobile Money en premier : seul ce qui manque au solde est payé,
 * puis le débit suit sa confirmation. Portefeuille ensuite ; solde insuffisant : Mobile Money ou recharge.
 * Montant et date limite tels que renvoyés par la gateway.
 */
export function VisitFeePay({
  requestId,
  fee,
  onChanged,
}: {
  requestId: string;
  fee: VisitFee;
  /** Paiement enregistré, ou état changé entre-temps : la demande est relue. */
  onChanged: () => void;
}) {
  const submissions = useRef<Record<Method, ReturnType<typeof idempotentSubmission>>>({
    wallet: idempotentSubmission(),
    mobile_money: idempotentSubmission(),
  });
  const [busy, setBusy] = useState<Method | null>(null);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<string | null>(null);

  async function pay(method: Method) {
    setBusy(method);
    setProblem(null);
    setNotice(null);
    const submission = submissions.current[method];
    try {
      const outcome = await payVisitFee(
        requestId,
        method,
        submission.keyFor({ requestId, method, fee: fee.id }),
      );
      if (outcome.status === 'paid') {
        submission.done();
        setNotice(t.paid);
        onChanged();
        return;
      }
      const url = safeCheckoutUrl(outcome.checkoutUrl);
      if (url) {
        setCheckout(url);
        window.location.assign(url);
        return;
      }
      setNotice(t.awaitingPayment);
      onChanged();
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.done();
      setProblem(view);
      if (view.kind === 'stale') onChanged();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <dl className="grid gap-1">
        <dt className="text-small text-ink-muted">{t.feeAmount}</dt>
        <dd className="font-display text-figure text-ink font-semibold tabular-nums">
          {fee.amount ? formatXof(fee.amount) : '—'}
        </dd>
      </dl>
      {fee.payBefore ? <p className="text-ink">{t.feeText(formatDateTime(fee.payBefore))}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button variant="action" size="lg" disabled={busy !== null} onClick={() => void pay('mobile_money')}>
          {busy === 'mobile_money' ? t.paying : t.payMobileMoney}
        </Button>
        <Button variant="secondary" size="lg" disabled={busy !== null} onClick={() => void pay('wallet')}>
          <IconWallet />
          {busy === 'wallet' ? t.paying : t.payWallet}
        </Button>
      </div>
      {checkout ? (
        <p className="text-small">
          <a href={checkout} className="text-brand-ink font-semibold underline underline-offset-4">
            {t.continuePayment}
          </a>
        </p>
      ) : null}
      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
      {problem?.kind === 'insufficientBalance' ? (
        <div className="grid justify-items-start gap-3">
          <FormMessage tone="info">{t.payInsufficient}</FormMessage>
          <Link
            href={walletPaths.home}
            className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline"
          >
            {t.topUp}
          </Link>
        </div>
      ) : problem ? (
        <FormMessage>
          {problem.kind === 'stale' ? `${problem.message} ${t.conflict}` : errorWithReference(problem)}
        </FormMessage>
      ) : null}
    </div>
  );
}
