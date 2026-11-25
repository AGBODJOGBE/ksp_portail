'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandBack, BandHeader } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Panel, SummaryRow } from '@/components/ui/form-fields';
import { Heading } from '@/components/ui/heading';
import { LinkSheetFacts } from '@/components/ui/link-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { formatExclusiveEndDate, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { getCommissionInvoice } from '@/features/billing/commission-api';
import {
  commissionPaths,
  commissionSettlement,
  commissionSource,
  commissionStatus,
  commissionTexts as t,
  periodLabel,
} from '@/features/billing/commission-texts';
import { DebitProblem } from './commission-invoices';

const CARD = 'rounded-panel border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-7';
const LINK = 'text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4';

const GENERIC = 'Une erreur est survenue. Réessayez dans quelques instants.';

/**
 * Facture de commission du Recouvrement (`/mon-espace/factures/commissions/[id]`, ADR-064) : en-tête de
 * l'organisation figé à l'émission, une ligne par encaissement du mois (retenue ou débitée), récapitulatif
 * hors taxe, état du débit automatique.
 */
export function CommissionInvoiceDetail({ id }: { id: string }) {
  const { state, reload } = useResource(useCallback(() => getCommissionInvoice(id), [id]));

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-32" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
      </div>
    );
  }
  if (state.status === 'error') {
    const error = state.error;
    const notFound = error instanceof ApiError && error.status === 404;
    const message = notFound
      ? t.notFound
      : error instanceof ApiError
        ? error.correlationId
          ? `${error.message} (référence : ${error.correlationId})`
          : error.message
        : GENERIC;
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandBack href={commissionPaths.list} label={t.back} />
        </BandHeader>
        <div className={`${CARD} justify-items-start`}>
          <FormMessage>{message}</FormMessage>
          {notFound ? null : (
            <Button variant="secondary" onClick={reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const invoice = state.data;
  const status = commissionStatus(invoice.status);
  return (
    <div className="grid gap-8">
      <BandHeader
        overlap={
          <section aria-label={t.invoice(invoice.number)} className={`${CARD} shadow-float`}>
            <LinkSheetFacts
              rows={[
                [t.commissionTotal, formatXof(invoice.commissionTotal)],
                [t.balance, invoice.status === 'pending_payment' ? formatXof(invoice.balance) : null],
                [t.issuedLabel, formatShortDate(invoice.issuedAt)],
                [t.paidLabel, invoice.paidAt ? formatShortDate(invoice.paidAt) : null],
              ]}
            />
          </section>
        }
      >
        <BandBack href={commissionPaths.list} label={t.back} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <span className="text-small text-ink-muted tabular-nums">{t.invoice(invoice.number)}</span>
        </div>
        <Heading as="h1" size="h1" className="mt-3">
          {t.period(periodLabel(invoice.period))}
        </Heading>
        <p className="text-ink-muted mt-2">
          {t.periodRange(formatShortDate(invoice.periodStart), formatExclusiveEndDate(invoice.periodEnd))}
        </p>
      </BandHeader>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Panel id="commission-lignes" title={t.linesTitle}>
          {invoice.lines.length ? (
            <ul className="grid gap-4">
              {invoice.lines.map((line) => (
                <li
                  key={line.collectionId}
                  className="border-line grid gap-1 border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={commissionPaths.recoveryCase(line.caseId)}
                      className="text-ink font-semibold underline underline-offset-4"
                    >
                      {t.caseLink(line.caseNumber)}
                    </Link>
                    <span className="text-small text-ink-muted">
                      {t.receivedOn(formatShortDate(line.receivedOn))}
                    </span>
                  </p>
                  <p className="text-small text-ink-muted">
                    {`${commissionSource(line.source)} · ${commissionSettlement(line.settlement)}`}
                  </p>
                  <dl>
                    <SummaryRow label={t.gross}>{formatXof(line.gross)}</SummaryRow>
                    <SummaryRow label={t.commission}>{formatXof(line.commission)}</SummaryRow>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">{t.linesNone}</p>
          )}
        </Panel>
        <div className="grid gap-8">
          <Panel id="commission-recapitulatif" title={t.totalsTitle}>
            <dl>
              <SummaryRow label={t.totalCollected}>{formatXof(invoice.totalCollected)}</SummaryRow>
              <SummaryRow label={t.commissionDeducted}>{formatXof(invoice.commissionDeducted)}</SummaryRow>
              <SummaryRow label={t.commissionInvoiced}>{formatXof(invoice.commissionInvoiced)}</SummaryRow>
              <SummaryRow label={t.commissionTotal} strong>
                {formatXof(invoice.commissionTotal)}
              </SummaryRow>
              <SummaryRow label={t.balance}>{formatXof(invoice.balance)}</SummaryRow>
            </dl>
            <p className="text-small text-ink-muted mt-4">{t.excludingTax}</p>
          </Panel>
          {invoice.debit ? (
            <Panel id="commission-debit" title={t.debitTitle}>
              <div className="grid gap-3">
                <p className="text-ink">{invoice.status === 'paid' ? t.debitPaid : t.debitPending}</p>
                <DebitProblem invoice={invoice} />
              </div>
            </Panel>
          ) : null}
          {invoice.organization ? (
            <Panel id="commission-entete" title={t.billedTo}>
              <address className="text-ink grid gap-1 not-italic">
                <span className="font-semibold">{invoice.organization.legalName}</span>
                <span>{invoice.organization.address}</span>
                <span className="text-small text-ink-muted">
                  {`${t.ifu} : ${invoice.organization.ifu}`}
                  {invoice.organization.rccm ? ` · ${t.rccm} : ${invoice.organization.rccm}` : ''}
                </span>
              </address>
              <p className="text-small text-ink-muted mt-3">{t.headerFrozen}</p>
            </Panel>
          ) : null}
          <Link href={commissionPaths.receipts} className={LINK}>
            {t.receiptsTitle}
          </Link>
        </div>
      </div>
    </div>
  );
}
