'use client';

import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowLeft } from '@/components/ui/icons';
import { ApiError } from '@/lib/api';
import { formatNumber, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getInvoice } from '@/features/billing/api';
import { billingPaths, billingTexts as t, invoiceMethods, invoiceStatus } from '@/features/billing/texts';

/** Contrat d'origine : pour le Nettoyage, la mission (adresse fixée par la fonctionnalité cleaning). */
const SOURCE_PATHS: Record<string, (id: string) => string> = {
  cleaning: (id) => `/mon-espace/nettoyage/missions/${encodeURIComponent(id)}`,
};

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
  const { state, reload } = useResource(useCallback(() => getInvoice(id), [id]));

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {t.loading}
      </p>
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
    ['Échéance', formatShortDate(invoice.dueAt)],
    [t.total, formatXof(invoice.total)],
    [t.paid, formatXof(invoice.paid)],
    [t.balance, formatXof(invoice.balance)],
    ['Règlement', invoice.paidAt ? t.paidOn(formatShortDate(invoice.paidAt)) : null],
  ];

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <BackLink />
        <div className="flex flex-wrap items-center gap-3">
          <Heading as="h1" size="h2">
            {t.invoice(invoice.number)}
          </Heading>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-ink-muted">
          {t.period(formatShortDate(invoice.periodStart), formatShortDate(invoice.periodEnd))}
        </p>
      </div>

      {invoice.status === 'overdue' ? <FormMessage>{`${t.overdueNotice} ${t.howToPay}`}</FormMessage> : null}
      {invoice.status === 'pending_payment' ? (
        <FormMessage tone="info">{`${t.pendingNotice(formatShortDate(invoice.dueAt))} ${t.howToPay}`}</FormMessage>
      ) : null}
      {invoice.status === 'cancelled' ? <FormMessage tone="info">{t.cancelledNotice}</FormMessage> : null}

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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left">
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
