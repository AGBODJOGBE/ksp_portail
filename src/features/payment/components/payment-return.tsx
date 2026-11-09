'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { contactHref } from '@/config/navigation';
import { useSession } from '@/lib/api';
import { formatDateTime, formatXof } from '@/lib/format';
import { getPayment } from '@/features/payment/api';
import { describePaymentReadError } from '@/features/payment/errors';
import { nextPollDelay, safeCheckoutUrl } from '@/features/payment/polling';
import type { Payment } from '@/features/payment/schemas';
import {
  FINAL_STATUSES,
  TOP_UP,
  UNSUCCESSFUL,
  paymentPaths,
  paymentTexts as t,
  paymentView,
  subjectLabel,
  subjectPath,
} from '@/features/payment/texts';

type View =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; payment: Payment; polling: boolean };

/**
 * Reçu d'un paiement réussi, tel que confirmé par le prestataire : montant, objet, date, référence et
 * payeur (session). Rien n'est calculé ; « Imprimer » ouvre l'impression du navigateur (ou l'export PDF).
 */
function Receipt({ payment }: { payment: Payment }) {
  const user = useSession()?.user;
  const payer = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const rows: ReadonlyArray<readonly [string, string | null]> = [
    [t.receiptObject, subjectLabel(payment.subject)],
    [t.amount, formatXof(payment.amount)],
    [t.receiptMethod, t.receiptMobileMoney],
    [t.completedAt, payment.completedAt ? formatDateTime(payment.completedAt) : null],
    [t.reference, payment.providerReference],
    [t.receiptPayer, payer || null],
    [t.receiptNumber, payment.id],
  ];
  return (
    <section
      id="recu"
      aria-labelledby="recu-titre"
      className="rounded-card border-line bg-surface grid scroll-mt-[calc(var(--header-h)+1rem)] gap-5 border p-5 shadow-xs sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-small text-ink-muted font-semibold">{t.receiptIssuer}</p>
          <Heading as="h2" size="h3" id="recu-titre">
            {t.receiptTitle}
          </Heading>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
          {t.receiptPrint}
        </Button>
      </div>
      <p className="font-display text-ink text-3xl font-semibold tabular-nums">{formatXof(payment.amount)}</p>
      <dl className="divide-line grid divide-y">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="text-small text-ink-muted">{label}</dt>
              <dd className="text-ink font-medium break-all tabular-nums">{value}</dd>
            </div>
          ))}
      </dl>
      <p className="text-small text-ink-muted">{t.receiptNote}</p>
    </section>
  );
}

function BackLink() {
  return (
    <ButtonLink href={paymentPaths.list} variant="ghost" className="-ml-3 justify-self-start">
      <IconArrowLeft />
      {t.back}
    </ButtonLink>
  );
}

/**
 * Suit un paiement jusqu'à son statut final, sans rechargement : lecture immédiate, puis relectures
 * espacées (`POLL_DELAYS_MS`, environ trois minutes au plus). La gateway relit le prestataire au passage ;
 * le retour du navigateur ne confirme jamais rien (ADR-031).
 */
function usePaymentPolling(id: string) {
  const [view, setView] = useState<View>({ status: 'loading' });
  // Une nouvelle « série » d'attente : chargement initial, « Vérifier à nouveau », « Réessayer ».
  const [round, setRound] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function read(attempt: number) {
      getPayment(id).then(
        (payment) => {
          if (!active) return;
          const delay = FINAL_STATUSES.has(payment.status) ? null : nextPollDelay(attempt);
          setView({ status: 'ready', payment, polling: delay !== null });
          if (delay !== null) timer = setTimeout(() => read(attempt + 1), delay);
        },
        (caught: unknown) => {
          if (!active) return;
          setView((previous) =>
            // Erreur passagère pendant l'attente : on garde le dernier état lu, sans relancer.
            previous.status === 'ready'
              ? { ...previous, polling: false }
              : { status: 'error', ...describePaymentReadError(caught) },
          );
        },
      );
    }
    read(0);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, round]);

  return {
    view,
    restart: () => {
      setView((previous) =>
        previous.status === 'ready' ? { ...previous, polling: true } : { status: 'loading' },
      );
      setRound((value) => value + 1);
    },
  };
}

/**
 * Page de retour du prestataire : statut du paiement, message clair, liens vers l'objet payé.
 * `topUpResult` : rendu sous le statut d'une recharge réussie du portefeuille (solde relu, retour au
 * paiement interrompu), fourni par la route pour que cette fonctionnalité n'importe pas le portefeuille.
 */
export function PaymentReturn({ id, topUpResult }: { id: string; topUpResult?: ReactNode }) {
  const { view, restart } = usePaymentPolling(id);

  if (view.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {t.loading}
      </p>
    );
  }
  if (view.status === 'error') {
    return (
      <div className="grid justify-items-start gap-4">
        <BackLink />
        <FormMessage>{view.message}</FormMessage>
        {view.notFound ? null : (
          <Button variant="secondary" onClick={restart}>
            {t.retry}
          </Button>
        )}
      </div>
    );
  }

  const { payment, polling } = view;
  const status = paymentView(payment);
  const pending = payment.status === 'pending';
  const checkout = pending ? safeCheckoutUrl(payment.checkoutUrl) : null;
  const subject = subjectPath(payment.subject);
  const isInvoice = payment.subject.type === 'billing_invoice';
  const isTopUp = payment.subject.type === TOP_UP;
  // Recharge réussie : le bloc du portefeuille porte déjà ses liens.
  const toppedUp = isTopUp && payment.status === 'succeeded' && !!topUpResult;
  const facts: ReadonlyArray<readonly [string, string | null]> = [
    [t.amount, formatXof(payment.amount)],
    [t.reference, payment.providerReference],
    [t.createdAt, formatDateTime(payment.createdAt)],
    [
      payment.status === 'succeeded' ? t.completedAt : t.closedAt,
      payment.completedAt ? formatDateTime(payment.completedAt) : null,
    ],
  ];

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <Heading as="h1" size="h2">
            {subjectLabel(payment.subject)}
          </Heading>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <section
        aria-labelledby="paiement-statut"
        className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
      >
        <Heading as="h2" size="h3" id="paiement-statut" className="sr-only">
          {status.label}
        </Heading>
        {/* Annoncé aux lecteurs d'écran à chaque changement de statut. */}
        <div role="status" className="grid gap-2">
          <p className="text-ink text-lg font-semibold">{status.message}</p>
          {UNSUCCESSFUL.has(payment.status) ? (
            <p className="text-ink-muted">{`${t.lateSuccess} ${isTopUp ? t.tryTopUpAgain : t.tryAgain}`}</p>
          ) : null}
          {pending && polling ? <p className="text-small text-ink-muted">{t.checking}</p> : null}
          {pending && !polling ? <p className="text-ink-muted">{t.stillPending}</p> : null}
          {payment.underReview ? <p className="text-ink-muted">{t.underReviewHint}</p> : null}
        </div>
        {/* Paiement réussi : le détail est dans le reçu, juste en dessous. */}
        {payment.status === 'succeeded' ? null : (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[11rem_1fr]">
            {facts
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-small text-ink-muted">{label}</dt>
                  <dd className="text-ink font-medium tabular-nums">{value}</dd>
                </div>
              ))}
          </dl>
        )}
      </section>

      {toppedUp ? topUpResult : null}
      {payment.status === 'succeeded' ? <Receipt payment={payment} /> : null}

      <div className="flex flex-wrap gap-3 print:hidden">
        {checkout ? (
          <a href={checkout} className={buttonClasses({ variant: 'action' })}>
            {t.resume}
          </a>
        ) : null}
        {pending && !polling ? (
          <Button variant="secondary" onClick={restart}>
            {t.checkAgain}
          </Button>
        ) : null}
        {payment.underReview ? (
          <ButtonLink href={contactHref('paiement')} variant="primary">
            {t.contactSupport}
          </ButtonLink>
        ) : null}
        {subject && !toppedUp ? (
          <ButtonLink href={subject} variant={checkout || payment.underReview ? 'secondary' : 'primary'}>
            {isTopUp ? t.seeWallet : isInvoice ? t.seeInvoice : t.seeMission}
          </ButtonLink>
        ) : null}
        <ButtonLink href={paymentPaths.list} variant="ghost">
          {t.seeAll}
        </ButtonLink>
      </div>
    </div>
  );
}
