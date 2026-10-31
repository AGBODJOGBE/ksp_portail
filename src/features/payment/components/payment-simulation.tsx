'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { ApiError } from '@/lib/api';
import { formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getPayment, simulatePayment } from '@/features/payment/api';
import { describePaymentReadError } from '@/features/payment/errors';
import { paymentPaths, paymentTexts as t, subjectLabel } from '@/features/payment/texts';

type Outcome = 'succeeded' | 'failed';

/**
 * Page de paiement simulée (développement, prestataire `simulated`) : joue le rôle de la page du
 * prestataire. Le choix est envoyé à `POST /payment/payments/{id}/simulate`, puis le client revient sur
 * la page de retour, qui lit le statut confirmé par payment.
 */
export function PaymentSimulation({ id }: { id: string }) {
  const router = useRouter();
  const { state, reload } = useResource(useCallback(() => getPayment(id), [id]));
  const [sending, setSending] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(outcome: Outcome) {
    setSending(outcome);
    setError(null);
    try {
      await simulatePayment(id, outcome);
      router.push(paymentPaths.payment(id));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.genericError);
      setSending(null);
    }
  }

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {t.loading}
      </p>
    );
  }
  if (state.status === 'error') {
    const view = describePaymentReadError(state.error);
    return (
      <div className="grid justify-items-start gap-4">
        <FormMessage>{view.message}</FormMessage>
        {view.notFound ? null : (
          <Button variant="secondary" onClick={reload}>
            {t.retry}
          </Button>
        )}
      </div>
    );
  }

  const payment = state.data;
  const pending = payment.status === 'pending';
  return (
    <div className="rounded-card border-line bg-surface grid max-w-xl gap-5 border p-5 sm:p-6">
      <div className="grid gap-2">
        <Heading as="h1" size="h2">
          {t.simulationTitle}
        </Heading>
        <p className="text-small text-ink-muted">{t.simulationLead}</p>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
        <dt className="text-small text-ink-muted">{subjectLabel(payment.subject)}</dt>
        <dd className="text-ink text-lg font-semibold tabular-nums">{formatXof(payment.amount)}</dd>
        {payment.providerReference ? (
          <>
            <dt className="text-small text-ink-muted">{t.reference}</dt>
            <dd className="text-ink font-medium">{payment.providerReference}</dd>
          </>
        ) : null}
      </dl>
      {pending ? (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="accent"
            disabled={sending !== null}
            aria-busy={sending === 'succeeded' || undefined}
            onClick={() => simulate('succeeded')}
          >
            {sending === 'succeeded' ? t.simulating : t.simulateSuccess}
          </Button>
          <Button
            variant="secondary"
            disabled={sending !== null}
            aria-busy={sending === 'failed' || undefined}
            onClick={() => simulate('failed')}
          >
            {sending === 'failed' ? t.simulating : t.simulateFailure}
          </Button>
        </div>
      ) : (
        <div className="grid justify-items-start gap-3">
          <FormMessage tone="info">{t.notPending}</FormMessage>
          <ButtonLink href={paymentPaths.payment(id)} variant="secondary">
            {t.seeResult}
          </ButtonLink>
        </div>
      )}
      <FormMessage>{error}</FormMessage>
    </div>
  );
}
