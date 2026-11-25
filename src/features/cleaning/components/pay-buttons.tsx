'use client';

import Link from 'next/link';
import { type ReactNode, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconWallet } from '@/components/ui/icons';
import { formatXof } from '@/lib/format';
import { safeCheckoutUrl } from '@/features/payment';
import { walletPaths } from '@/features/wallet';
import type { PayMethod } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { requestTexts as t } from '@/features/cleaning/request-texts';
import type { Money, PaymentOutcome } from '@/features/cleaning/schemas';

/**
 * Paiement d'un montant du Nettoyage (frais de visite, séance) : un seul chemin pour l'argent, le
 * portefeuille (R-WL-05). « Payer par Mobile Money » d'abord : seul ce qui manque au solde est payé,
 * puis le débit suit sa confirmation (redirection vers la page du prestataire, http(s) seulement).
 * « Payer avec mon portefeuille » ensuite ; solde insuffisant : Mobile Money, ou recharge. Une clé
 * d'idempotence par moyen de paiement, gardée pendant les renvois. Montant et échéance tels que renvoyés
 * par la gateway.
 */
export function CleaningPay({
  amount,
  amountLabel,
  deadline,
  subjectKey,
  pay,
  paidText,
  awaitingText,
  conflictText,
  onChanged,
}: {
  amount: Money | null | undefined;
  amountLabel: string;
  /** Échéance écrite (« À payer avant le … »), ou rien. */
  deadline?: ReactNode;
  /** Ce qui est payé (identifiant) : une clé neuve pour un autre objet. */
  subjectKey: unknown;
  pay: (method: PayMethod, idempotencyKey: string) => Promise<PaymentOutcome>;
  paidText: string;
  awaitingText: string;
  conflictText: string;
  /** Paiement enregistré, ou état changé entre-temps : l'objet est relu. */
  onChanged: () => void;
}) {
  const submissions = useRef<Record<PayMethod, ReturnType<typeof idempotentSubmission>>>({
    wallet: idempotentSubmission(),
    mobile_money: idempotentSubmission(),
  });
  const [busy, setBusy] = useState<PayMethod | null>(null);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<string | null>(null);

  async function run(method: PayMethod) {
    setBusy(method);
    setProblem(null);
    setNotice(null);
    const submission = submissions.current[method];
    try {
      const outcome = await pay(method, submission.keyFor({ subject: subjectKey, method }));
      if (outcome.status === 'paid') {
        submission.done();
        setNotice(paidText);
        onChanged();
        return;
      }
      const url = safeCheckoutUrl(outcome.checkoutUrl);
      if (url) {
        setCheckout(url);
        window.location.assign(url);
        return;
      }
      setNotice(awaitingText);
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
        <dt className="text-small text-ink-muted">{amountLabel}</dt>
        <dd className="font-display text-figure text-ink font-semibold tabular-nums">
          {amount ? formatXof(amount) : '—'}
        </dd>
      </dl>
      {deadline ? <p className="text-ink">{deadline}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button variant="action" size="lg" disabled={busy !== null} onClick={() => void run('mobile_money')}>
          {busy === 'mobile_money' ? t.paying : t.payMobileMoney}
        </Button>
        <Button variant="secondary" size="lg" disabled={busy !== null} onClick={() => void run('wallet')}>
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
          {problem.kind === 'stale' ? `${problem.message} ${conflictText}` : errorWithReference(problem)}
        </FormMessage>
      ) : null}
    </div>
  );
}
