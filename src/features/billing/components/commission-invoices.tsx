'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listCommissionInvoices, listFeeReceipts } from '@/features/billing/commission-api';
import type { CommissionInvoice } from '@/features/billing/commission-schemas';
import {
  commissionPaths,
  commissionStatus,
  commissionTexts as t,
  periodLabel,
  receiptKind,
} from '@/features/billing/commission-texts';

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-3 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';
const LINK = 'text-brand-ink relative z-10 font-semibold underline underline-offset-4';

/** Débit de la commission en échec : montant manquant et prochain essai, lien de recharge. */
export function DebitProblem({ invoice }: { invoice: CommissionInvoice }) {
  const debit = invoice.debit;
  if (invoice.status !== 'pending_payment' || !debit?.lastFailure) return null;
  return (
    <p className="text-small text-ink flex flex-wrap items-baseline gap-x-2">
      <span>
        {t.debitFailed(
          debit.missing ? formatXof(debit.missing) : null,
          debit.nextAttemptAt ? formatShortDate(debit.nextAttemptAt) : null,
        )}
      </span>
      <Link href={commissionPaths.wallet} className={LINK}>
        {t.topUp}
      </Link>
    </p>
  );
}

/**
 * Factures de commission du Recouvrement (`GET /billing/commission-invoices`, ADR-064) : une par mois,
 * commission hors taxe, reste à débiter et échec du débit automatique. Relu à chaque changement de compte
 * actif.
 */
export function CommissionInvoiceList() {
  const key = contextKey(useSession()) ?? 'none';
  return <InvoiceItems key={key} />;
}

function InvoiceItems() {
  const invoices = usePagedList(listCommissionInvoices);
  return (
    <PagedListState list={invoices} labels={t} empty={<p className="text-ink">{t.empty}</p>}>
      <ul className="grid gap-3">
        {invoices.items.map((invoice) => {
          const status = commissionStatus(invoice.status);
          const due = invoice.status === 'pending_payment' && invoice.balance.amount > 0;
          return (
            <li key={invoice.id} className={cn(ROW, due && 'border-l-action border-l-4')}>
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={commissionPaths.invoice(invoice.id)}
                    className="stretched-link font-display text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
                  >
                    {t.period(periodLabel(invoice.period))}
                  </Link>
                  <Badge tone={status.tone} dot>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-small text-ink-muted tabular-nums">
                  {`${t.invoice(invoice.number)} · ${
                    invoice.paidAt
                      ? t.paidOn(formatShortDate(invoice.paidAt))
                      : t.issuedOn(formatShortDate(invoice.issuedAt))
                  }`}
                </p>
                <DebitProblem invoice={invoice} />
              </div>
              <dl className="grid gap-0.5 sm:text-right">
                <dt className="text-small text-ink-muted">{t.totalHt}</dt>
                <dd className="text-ink font-semibold tabular-nums">{formatXof(invoice.commissionTotal)}</dd>
                {due ? (
                  <>
                    <dt className="text-small text-ink-muted">{t.balance}</dt>
                    <dd className="text-ink font-semibold tabular-nums">{formatXof(invoice.balance)}</dd>
                  </>
                ) : null}
              </dl>
            </li>
          );
        })}
      </ul>
    </PagedListState>
  );
}

/**
 * Reçus des frais du Recouvrement (`GET /billing/receipts`, ADR-064) : un par débit du portefeuille,
 * frais de dossier ou forfait d'étude. `caseId` : ceux d'un dossier.
 */
export function FeeReceiptList({ caseId }: { caseId?: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <ReceiptItems key={`${key}-${caseId ?? ''}`} caseId={caseId} />;
}

function ReceiptItems({ caseId }: { caseId?: string }) {
  const receipts = usePagedList(useCallback((cursor?: string) => listFeeReceipts(cursor, caseId), [caseId]));
  return (
    <PagedListState
      list={receipts}
      labels={{ ...t, loading: t.receiptsLoading }}
      empty={<p className="text-ink">{t.receiptsEmpty}</p>}
    >
      <ul className="grid gap-3">
        {receipts.items.map((receipt) => (
          <li key={receipt.id} className={ROW}>
            <div className="grid min-w-0 gap-1">
              <p className="text-ink flex flex-wrap items-center gap-2 font-semibold">
                {receipt.label}
                <Badge tone="neutral">{receiptKind(receipt.kind)}</Badge>
              </p>
              <p className="text-small text-ink-muted tabular-nums">
                {`${t.receipt(receipt.number)} · ${t.paidAt(formatShortDate(receipt.paidAt))}`}
              </p>
              {receipt.caseNumber ? (
                <Link href={commissionPaths.recoveryCase(receipt.caseId)} className={LINK}>
                  {t.caseLink(receipt.caseNumber)}
                </Link>
              ) : null}
            </div>
            <p className="text-ink text-lg font-semibold tabular-nums sm:text-right">
              {formatXof(receipt.amount)}
            </p>
          </li>
        ))}
      </ul>
    </PagedListState>
  );
}
