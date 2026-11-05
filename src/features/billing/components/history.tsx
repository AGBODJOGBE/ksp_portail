'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconArrowRight } from '@/components/ui/icons';
import {
  PayButton,
  listPayments,
  paymentPaths,
  paymentStatus,
  paymentTexts,
  subjectLabel,
  type Payment,
} from '@/features/payment';
import { ApiError, contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate, formatXof, isPast } from '@/lib/format';
import { listInvoices } from '@/features/billing/api';
import type { Invoice } from '@/features/billing/schemas';
import { billingPaths, billingTexts, historyTexts as t, invoiceStatus } from '@/features/billing/texts';

type Entry =
  { kind: 'invoice'; date: string; invoice: Invoice } | { kind: 'payment'; date: string; payment: Payment };

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      entries: Entry[];
      cursors: { invoices: string | null; payments: string | null };
      more: boolean;
    };

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : billingTexts.genericError;

/** Factures et paiements fusionnés, les plus récents d'abord (date d'émission ou de paiement). */
function merge(previous: Entry[], invoices: Invoice[], payments: Payment[]): Entry[] {
  const seen = new Set(
    previous.map((entry) => (entry.kind === 'invoice' ? entry.invoice.id : entry.payment.id)),
  );
  const next: Entry[] = [
    ...invoices
      .filter((invoice) => !seen.has(invoice.id))
      .map((invoice) => ({ kind: 'invoice' as const, date: invoice.issuedAt, invoice })),
    ...payments
      .filter((payment) => !seen.has(payment.id))
      .map((payment) => ({
        kind: 'payment' as const,
        date: payment.completedAt ?? payment.createdAt,
        payment,
      })),
  ];
  return [...previous, ...next].sort((a, b) => b.date.localeCompare(a.date));
}

const DUE = new Set(['pending_payment', 'overdue']);

function InvoiceRow({ invoice, onStale }: { invoice: Invoice; onStale: () => void }) {
  const status = invoiceStatus(invoice.status);
  const due = DUE.has(invoice.status) && invoice.balance.amount > 0;
  const [paying, setPaying] = useState(false);
  return (
    <li className={cn('grid gap-3 py-4', due && 'border-l-warning -ml-4 border-l-4 pl-3 sm:-ml-5 sm:pl-4')}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="grid gap-1">
          <p className="text-small text-ink-muted">
            {t.invoiceKind} · {formatShortDate(invoice.issuedAt)}
          </p>
          <Link
            href={billingPaths.invoice(invoice.id)}
            className="text-ink font-semibold underline-offset-4 hover:underline"
          >
            {billingTexts.invoice(invoice.number)}
          </Link>
        </div>
        <div className="grid justify-items-end gap-1 text-right">
          <span className="text-ink font-semibold tabular-nums">{formatXof(invoice.total)}</span>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>
      </div>
      {due ? (
        <div className="rounded-control bg-surface-muted grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-ink">
            {t.balance} : <span className="font-semibold tabular-nums">{formatXof(invoice.balance)}</span>
            <span
              className={cn(
                'text-small block',
                isPast(invoice.dueAt) ? 'text-danger font-semibold' : 'text-ink-muted',
              )}
            >
              {t.dueAt(formatShortDate(invoice.dueAt))}
            </span>
          </p>
          {paying ? null : (
            <Button variant="action" onClick={() => setPaying(true)}>
              {t.pay}
            </Button>
          )}
          {paying ? (
            <div className="sm:col-span-2">
              <PayButton
                subject={{ subjectType: 'billing_invoice', subjectId: invoice.id }}
                amount={invoice.balance}
                onStale={onStale}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const status = paymentStatus(payment.status);
  const succeeded = payment.status === 'succeeded';
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
      <div className="grid gap-1">
        <p className="text-small text-ink-muted">
          {t.paymentKind} · {formatShortDate(payment.completedAt ?? payment.createdAt)}
          {payment.providerReference ? ` · ${payment.providerReference}` : ''}
        </p>
        <p className="text-ink font-semibold">{subjectLabel(payment.subject)}</p>
        <Link
          href={`${paymentPaths.payment(payment.id)}${succeeded ? '#recu' : ''}`}
          className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {succeeded ? t.receipt : t.details}
          <IconArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid justify-items-end gap-1 text-right">
        <span className="text-ink font-semibold tabular-nums">{formatXof(payment.amount)}</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </li>
  );
}

function History() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([listInvoices(), listPayments()]).then(
      ([invoices, payments]) => {
        if (!active) return;
        setState({
          status: 'ready',
          entries: merge([], invoices.data, payments.data),
          cursors: { invoices: invoices.nextCursor, payments: payments.nextCursor },
          more: !!(invoices.nextCursor || payments.nextCursor),
        });
      },
      (error: unknown) => active && setState({ status: 'error', message: errorMessage(error) }),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  async function loadMore() {
    if (state.status !== 'ready' || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const { invoices: invoiceCursor, payments: paymentCursor } = state.cursors;
      const [invoices, payments] = await Promise.all([
        invoiceCursor ? listInvoices(invoiceCursor) : Promise.resolve({ data: [], nextCursor: null }),
        paymentCursor ? listPayments(paymentCursor) : Promise.resolve({ data: [], nextCursor: null }),
      ]);
      setState({
        status: 'ready',
        entries: merge(state.entries, invoices.data, payments.data),
        cursors: { invoices: invoices.nextCursor, payments: payments.nextCursor },
        more: !!(invoices.nextCursor || payments.nextCursor),
      });
    } catch (error) {
      setMoreError(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-3">
        <span className="sr-only">{billingTexts.loading}</span>
        {[0, 1, 2].map((row) => (
          <span
            key={row}
            aria-hidden="true"
            className="bg-surface-sunken rounded-control block h-20 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{state.message}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {billingTexts.retry}
        </Button>
      </div>
    );
  }

  const due = state.entries.filter(
    (entry): entry is Extract<Entry, { kind: 'invoice' }> =>
      entry.kind === 'invoice' && DUE.has(entry.invoice.status) && entry.invoice.balance.amount > 0,
  );

  return (
    <div className="grid gap-8">
      <section
        aria-labelledby="historique-du"
        className="rounded-card border-line bg-surface grid gap-2 border p-5 shadow-xs sm:p-6"
      >
        <h2 id="historique-du" className="font-display text-ink text-xl font-semibold">
          {t.dueTitle}
        </h2>
        {due.length ? (
          <p className="text-ink">{t.dueCount(due.length)}</p>
        ) : (
          <p className="text-ink-muted">{t.nothingDue}</p>
        )}
      </section>

      <section aria-labelledby="historique-titre" className="grid gap-3">
        <h2 id="historique-titre" className="font-display text-ink text-xl font-semibold">
          {t.title}
        </h2>
        {state.entries.length ? (
          <ul className="rounded-card border-line bg-surface divide-line divide-y border px-4 shadow-xs sm:px-5">
            {state.entries.map((entry) =>
              entry.kind === 'invoice' ? (
                <InvoiceRow key={entry.invoice.id} invoice={entry.invoice} onStale={reload} />
              ) : (
                <PaymentRow key={entry.payment.id} payment={entry.payment} />
              ),
            )}
          </ul>
        ) : (
          <div className="grid gap-1">
            <p className="text-ink">{t.empty}</p>
            <p className="text-small text-ink-muted">{paymentTexts.emptyHint}</p>
          </div>
        )}
        {state.more ? (
          <Button
            variant="secondary"
            onClick={loadMore}
            aria-busy={loadingMore || undefined}
            className="justify-self-start"
          >
            {loadingMore ? billingTexts.loading : t.more}
          </Button>
        ) : null}
        <FormMessage>{moreError}</FormMessage>
      </section>
    </div>
  );
}

/**
 * « Factures et paiements » : historique unifié du compte actif (factures de billing, paiements en ligne
 * de payment), le plus récent d'abord ; reste dû et échéance en évidence, paiement direct d'une facture,
 * reçu de chaque paiement réussi. Montants lus tels quels : aucun total calculé ici.
 */
export function BillingHistory() {
  const context = contextKey(useSession()) ?? 'none';
  return <History key={context} />;
}
