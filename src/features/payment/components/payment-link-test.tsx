'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { ApiError } from '@/lib/api';
import { simulatePaymentLink } from '@/features/payment/api';
import { paymentLinkTexts as t } from '@/features/payment/link-texts';

type Outcome = 'succeeded' | 'failed';

/**
 * Mode test du lien de paiement (**développement seulement**, jamais chargé par un build de production) :
 * remplace la page du prestataire simulé, qui demande une session et ne connaît pas le jeton. Le choix est
 * envoyé à `POST /payment/links/{token}/simulate`, puis la page relit le lien (`onDone`).
 */
export function PaymentLinkTest({ token, onDone }: { token: string; onDone: () => void }) {
  const [sending, setSending] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(outcome: Outcome) {
    setSending(outcome);
    setError(null);
    try {
      await simulatePaymentLink(token, outcome);
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.genericError);
    } finally {
      setSending(null);
    }
  }

  return (
    <section
      aria-labelledby="lien-test-titre"
      className="rounded-control border-warning bg-warning-soft grid gap-3 border border-dashed p-4"
    >
      <h2 id="lien-test-titre" className="text-warning font-semibold">
        {t.testTitle}
      </h2>
      <p className="text-small text-ink">{t.testLead}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={sending !== null}
          aria-busy={sending === 'succeeded' || undefined}
          onClick={() => simulate('succeeded')}
        >
          {sending === 'succeeded' ? t.testSending : t.testSuccess}
        </Button>
        <Button
          variant="ghost"
          disabled={sending !== null}
          aria-busy={sending === 'failed' || undefined}
          onClick={() => simulate('failed')}
        >
          {sending === 'failed' ? t.testSending : t.testFailure}
        </Button>
      </div>
      <FormMessage>{error}</FormMessage>
    </section>
  );
}
