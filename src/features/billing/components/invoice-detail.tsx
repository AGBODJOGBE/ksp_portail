'use client';

import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatNumber, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { PayButton } from '@/features/payment';
import { getInvoice } from '@/features/billing/api';
import { billingPaths, billingTexts as t, invoiceMethods, invoiceStatus } from '@/features/billing/texts';

/** Contrat d'origine : pour le Nettoyage, la mission (adresse fixée par la fonctionnalité cleaning). */
const SOURCE_PATHS: Record<string, (id: string) => string> = {
  cleaning: (id) => `/mon-espace/nettoyage/missions/${encodeURIComponent(id)}`,
};
/** Factures payables en ligne (le reste dû est vérifié par payment, ADR-031). */
const PAYABLE = new Set(['pending_payment', 'overdue']);

/** Message d'une lecture refusée ; une facture introuvable ne se « réessaie » pas. */
function describe(error: unknown): { message: string; notFound: boolean } {
  const notFound = error instanceof ApiError && error.status === 404;
  if (notFound) return { message: t.notFound, notFound };
  return {
    message:
      error instanceof ApiError
        ? error.message
        : 'Une erreur est survenue. Réessayez dans quelques instants.',
    notFound,
  };
}

function BackLink() {
  return (
    <ButtonLink href={billingPaths.list} variant="ghost" className="-ml-3 justify-self-start">
      <IconArrowLeft />
      {t.back}
    </ButtonLink>
  );
}

/** Détail d'une facture : période, lignes, total, échéance, règlements. */
export function InvoiceDetail({ id }: { id: string }) {
  const { state, reload, refresh } = useResource(useCallback(() => getInvoice(id), [id]));

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-6">
        <span className="sr-only">{t.loading}</span>
        {['h-11 w-48', 'h-9 w-2/3 max-w-md', 'h-28', 'h-56'].map((size) => (
          <span
            key={size}
            aria-hidden="true"
            className={`bg-surface-sunken rounded-card block animate-pulse motion-reduce:animate-none ${size}`}
          />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describe(state.error);
    return (
      <div className="grid justify-items-start gap-4">
        <BackLink />
        <FormMessage>{view.message}</FormMessage>
        {view.notFound ? null : (
          <Button variant="secondary" onClick={reload}>
            {t.retry}
          </Button>
        )}
      </div>
    );
  }

  const invoice = state.data;
  const status = invoiceStatus(invoice.status);
  const sourcePath = SOURCE_PATHS[invoice.source];
  const facts: ReadonlyArray<readonly [string, string | null]> = [
    ['Origine', t.source[invoice.source] ?? invoice.source],
    ['Mois facturé', t.month(invoice.periodIndex)],
    ['Émission', formatShortDate(invoice.issuedAt)],
    ['Règlement', invoice.paidAt ? t.paidOn(formatShortDate(invoice.paidAt)) : null],
  ];

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <BackLink />
        <div>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>
        <Heading as="h1" size="h2">
          {t.invoice(invoice.number)}
        </Heading>
        <p className="text-ink-muted">
          {t.period(formatShortDate(invoice.periodStart), formatShortDate(invoice.periodEnd))}
        </p>
      </div>

      {/* Montants de la gateway : total, déjà réglé, reste à régler (`balance`), échéance. */}
      <dl className="rounded-card border-line bg-surface grid grid-cols-2 gap-4 border p-5 shadow-xs sm:grid-cols-4 sm:p-6">
        {(
          [
            [t.total, formatXof(invoice.total)],
            [t.paid, formatXof(invoice.paid)],
            [t.balance, formatXof(invoice.balance)],
            [t.dueLabel, formatShortDate(invoice.dueAt)],
          ] as const
        ).map(([label, value], index) => (
          <div key={label} className={index === 2 ? 'sm:border-line sm:border-l sm:pl-4' : undefined}>
            <dt className="text-small text-ink-muted">{label}</dt>
            <dd
              className={cn(
                'font-display text-ink mt-1 text-xl font-semibold tabular-nums',
                index === 2 && invoice.status === 'overdue' && 'text-danger',
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {invoice.status === 'overdue' ? <FormMessage>{`${t.overdueNotice} ${t.howToPay}`}</FormMessage> : null}
      {invoice.status === 'pending_payment' ? (
        <FormMessage tone="info">{`${t.pendingNotice(formatShortDate(invoice.dueAt))} ${t.howToPay}`}</FormMessage>
      ) : null}
      {invoice.status === 'cancelled' ? <FormMessage tone="info">{t.cancelledNotice}</FormMessage> : null}

      {PAYABLE.has(invoice.status) && invoice.balance.amount > 0 ? (
        <section
          aria-labelledby="facture-payer"
          className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
        >
          <Heading as="h2" size="h3" id="facture-payer">
            {t.payTitle}
          </Heading>
          <PayButton
            subject={{ subjectType: 'billing_invoice', subjectId: invoice.id }}
            amount={invoice.balance}
            onStale={refresh}
          />
        </section>
      ) : null}

      {invoice.organization ? (
        <section
          aria-labelledby="facture-entete"
          className="rounded-card border-line bg-surface grid gap-2 border p-5 sm:p-6"
        >
          <Heading as="h2" size="h3" id="facture-entete">
            {t.billedTo}
          </Heading>
          <address className="text-ink grid gap-1 not-italic">
            <span className="font-semibold">{invoice.organization.legalName}</span>
            <span>{invoice.organization.address}</span>
            <span className="text-small tabular-nums">
              {t.ifu} : {invoice.organization.ifu}
              {invoice.organization.rccm ? ` · ${t.rccm} : ${invoice.organization.rccm}` : ''}
            </span>
          </address>
          <p className="text-small text-ink-muted">{t.headerFrozen}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="facture-detail"
        className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6"
      >
        <Heading as="h2" size="h3" id="facture-detail">
          {t.linesTitle}
        </Heading>
        {/* Téléphone : lignes empilées ; à partir de 640 px : tableau. */}
        <ul className="divide-line border-line grid divide-y border-y sm:hidden">
          {invoice.lines.map((line) => (
            <li
              key={`${line.label}-${line.amount.amount}`}
              className="flex items-start justify-between gap-4 py-2.5"
            >
              <span className="min-w-0">
                <span className="text-ink block font-medium">{line.label}</span>
                <span className="text-small text-ink-muted tabular-nums">
                  {formatNumber(line.quantity)} × {formatXof(line.unitPrice)}
                </span>
              </span>
              <span className="text-ink shrink-0 font-semibold tabular-nums">{formatXof(line.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
          <table className="w-full text-left">
            <thead className="text-small text-ink-muted">
              <tr className="border-line border-b">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  {t.line}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t.quantity}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  {t.unitPrice}
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">
                  {t.amount}
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {invoice.lines.map((line) => (
                <tr key={`${line.label}-${line.amount.amount}`} className="border-line border-b">
                  <th scope="row" className="text-ink py-2 pr-3 font-medium">
                    {line.label}
                  </th>
                  <td className="px-3 py-2 text-right">{formatNumber(line.quantity)}</td>
                  <td className="px-3 py-2 text-right">{formatXof(line.unitPrice)}</td>
                  <td className="py-2 pl-3 text-right">{formatXof(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-small text-ink-muted">{t.prorata}</p>
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

      <section
        aria-labelledby="facture-reglements"
        className="rounded-card border-line bg-surface grid gap-3 border p-5 sm:p-6"
      >
        <Heading as="h2" size="h3" id="facture-reglements">
          {t.paymentsTitle}
        </Heading>
        {invoice.payments.length ? (
          <ul className="grid gap-1">
            {invoice.payments.map((payment) => (
              <li key={payment.id} className="text-ink">
                <span className="font-semibold tabular-nums">{formatXof(payment.amount)}</span> ·{' '}
                {invoiceMethods[payment.method] ?? payment.method} · {formatShortDate(payment.recordedAt)}
                {payment.reference ? ` · ${payment.reference}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t.noPayments}</p>
        )}
      </section>

      {sourcePath ? (
        <ButtonLink href={sourcePath(invoice.contractId)} variant="secondary" className="justify-self-start">
          {t.seeMission}
        </ButtonLink>
      ) : null}
    </div>
  );
}
