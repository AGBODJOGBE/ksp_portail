'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { formatShortDate, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listPayments } from '@/features/payment/api';
import { paymentPaths, paymentStatus, paymentTexts as t, subjectLabel } from '@/features/payment/texts';

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';

function Payments() {
  const payments = usePagedList(listPayments);
  return (
    <PagedListState
      list={payments}
      labels={t}
      empty={
        <div className="grid gap-1">
          <p className="text-ink">{t.empty}</p>
          <p className="text-small text-ink-muted">{t.emptyHint}</p>
        </div>
      }
    >
      <ul className="grid gap-3">
        {payments.items.map((payment) => {
          const status = paymentStatus(payment.status);
          return (
            <li key={payment.id} className={ROW}>
              <div>
                <Link
                  href={paymentPaths.payment(payment.id)}
                  className="stretched-link text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
                >
                  {subjectLabel(payment.subject)}
                </Link>
                <p className="text-small text-ink-muted mt-1">
                  {[formatShortDate(payment.createdAt), payment.providerReference]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span className="text-ink font-semibold tabular-nums">{formatXof(payment.amount)}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </PagedListState>
  );
}

/** « Mes paiements » : paiements en ligne du compte actif, les plus récents d'abord. */
export function PaymentList() {
  // Paiements du contexte actif (filtrés par la gateway) : un changement de contexte relit la liste.
  const context = contextKey(useSession()) ?? 'none';
  return <Payments key={context} />;
}
