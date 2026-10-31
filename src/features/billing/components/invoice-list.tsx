'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { INVOICE_STATUSES, type InvoiceStatusFilter, listInvoices } from '@/features/billing/api';
import {
  billingPaths,
  billingTexts as t,
  invoiceStatus,
  invoiceStatuses,
  statusParams,
} from '@/features/billing/texts';

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';

const CHIP =
  'rounded-full border px-4 text-sm font-semibold inline-flex min-h-11 items-center focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2';

/** État demandé dans l'adresse (`?etat=impayee`) ; `undefined` pour toutes les factures. */
function statusFromParam(value: string | null): InvoiceStatusFilter | undefined {
  return INVOICE_STATUSES.find((status) => statusParams[status] === value);
}

/** Filtre par état : des liens (l'état se partage par l'adresse), l'actif signalé par `aria-current`. */
function Filters({ current }: { current: InvoiceStatusFilter | undefined }) {
  const choices: Array<{ status: InvoiceStatusFilter | undefined; label: string }> = [
    { status: undefined, label: t.filterAll },
    ...INVOICE_STATUSES.map((status) => ({ status, label: invoiceStatuses[status]!.label })),
  ];
  return (
    <nav aria-label={t.filtersLabel}>
      <ul className="flex flex-wrap gap-2">
        {choices.map(({ status, label }) => {
          const active = status === current;
          return (
            <li key={label}>
              <Link
                href={status ? `${billingPaths.list}?etat=${statusParams[status]}` : billingPaths.list}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  CHIP,
                  active
                    ? 'border-accent bg-accent-soft text-accent-ink'
                    : 'border-line-strong bg-surface text-ink hover:border-accent',
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Invoices({ status }: { status: InvoiceStatusFilter | undefined }) {
  const invoices = usePagedList(useCallback((cursor?: string) => listInvoices(cursor, status), [status]));
  return (
    <PagedListState
      list={invoices}
      labels={t}
      empty={
        <div className="grid gap-1">
          <p className="text-ink">{status ? t.emptyFiltered : t.empty}</p>
          {status ? null : <p className="text-small text-ink-muted">{t.emptyHint}</p>}
        </div>
      }
    >
      <ul className="grid gap-3">
        {invoices.items.map((invoice) => {
          const label = invoiceStatus(invoice.status);
          const partial = invoice.status !== 'paid' && invoice.paid.amount > 0;
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
                  {[
                    t.source[invoice.source] ?? invoice.source,
                    invoice.organization?.legalName,
                    t.month(invoice.periodIndex),
                    invoice.status === 'paid' && invoice.paidAt
                      ? t.paidOn(formatShortDate(invoice.paidAt))
                      : t.dueOn(formatShortDate(invoice.dueAt)),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {partial ? (
                  <p className="text-small text-ink mt-1 font-medium">
                    {t.balanceLeft(formatXof(invoice.balance))}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span className="text-ink font-semibold tabular-nums">{formatXof(invoice.total)}</span>
                <Badge tone={label.tone}>{label.label}</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </PagedListState>
  );
}

/** « Mes factures » : filtre par état (dans l'adresse) et liste paginée par curseur, la plus récente d'abord. */
export function InvoiceList() {
  const status = statusFromParam(useSearchParams().get('etat'));
  // Factures du contexte actif (filtrées par la gateway) : un changement de contexte relit la liste.
  const context = contextKey(useSession()) ?? 'none';
  return (
    <div className="grid gap-6">
      <Filters current={status} />
      {/* Une clé par filtre et par contexte : la liste repart de la première page, avec son chargement. */}
      <Invoices key={`${context}:${status ?? 'all'}`} status={status} />
    </div>
  );
}
