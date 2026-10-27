'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { formatShortDate, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listInvoices } from '@/features/billing/api';
import { billingPaths, billingTexts as t, invoiceStatus } from '@/features/billing/texts';

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';

/** « Mes factures » : liste paginée par curseur, la plus récente d'abord. */
export function InvoiceList() {
  const invoices = usePagedList(listInvoices);
  return (
    <PagedListState list={invoices} labels={t} empty={<p className="text-ink-muted">{t.empty}</p>}>
      <ul className="grid gap-3">
        {invoices.items.map((invoice) => {
          const status = invoiceStatus(invoice.status);
          return (
            <li key={invoice.id} className={ROW}>
              <div>
                <Link
                  href={billingPaths.invoice(invoice.id)}
                  className="stretched-link text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
                >
                  {t.invoice(invoice.number)}
                </Link>
                <p className="text-small text-ink-muted mt-1">
                  {t.source[invoice.source] ?? invoice.source} ·{' '}
                  {invoice.status === 'paid' && invoice.paidAt
                    ? t.paidOn(formatShortDate(invoice.paidAt))
                    : t.dueOn(formatShortDate(invoice.dueAt))}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span className="text-ink font-semibold tabular-nums">{formatXof(invoice.total)}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </PagedListState>
  );
}
