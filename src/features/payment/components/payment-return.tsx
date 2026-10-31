'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { formatDateTime, formatXof } from '@/lib/format';
import { getPayment } from '@/features/payment/api';
import { describePaymentReadError } from '@/features/payment/errors';
import { nextPollDelay, safeCheckoutUrl } from '@/features/payment/polling';
import type { Payment } from '@/features/payment/schemas';
import {
  FINAL_STATUSES,
  UNSUCCESSFUL,
  paymentPaths,
  paymentStatus,
  paymentTexts as t,
  subjectLabel,
  subjectPath,
} from '@/features/payment/texts';

type View =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; payment: Payment; polling: boolean };

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

/** Page de retour du prestataire : statut du paiement, message clair, liens vers l'objet payé. */
export function PaymentReturn({ id }: { id: string }) {
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
  const status = paymentStatus(payment.status);
  const pending = payment.status === 'pending';
  const checkout = pending ? safeCheckoutUrl(payment.checkoutUrl) : null;
  const subject = subjectPath(payment.subject);
  const isInvoice = payment.subject.type === 'billing_invoice';
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
            <p className="text-ink-muted">{`${t.lateSuccess} ${t.tryAgain}`}</p>
          ) : null}
          {pending && polling ? <p className="text-small text-ink-muted">{t.checking}</p> : null}
          {pending && !polling ? <p className="text-ink-muted">{t.stillPending}</p> : null}
        </div>
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
      </section>

      <div className="flex flex-wrap gap-3">
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
        {subject ? (
          <ButtonLink href={subject} variant={checkout ? 'secondary' : 'primary'}>
            {isInvoice ? t.seeInvoice : t.seeMission}
          </ButtonLink>
        ) : null}
        <ButtonLink href={paymentPaths.list} variant="ghost">
          {t.seeAll}
        </ButtonLink>
      </div>
    </div>
  );
}
