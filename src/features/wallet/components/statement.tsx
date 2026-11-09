'use client';

import Link from 'next/link';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { IconArrowRight } from '@/components/ui/icons';
import { PagedListState } from '@/components/ui/paged-list-state';
import { formatDateTime, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listStatement } from '@/features/wallet/api';
import { objectPath } from '@/features/wallet/paths';
import type { StatementLine } from '@/features/wallet/schemas';
import { walletTexts as t } from '@/features/wallet/texts';

const TONES: Record<string, BadgeTone> = { top_up: 'success', service_payment: 'neutral', refund: 'brand' };

function Line({ line }: { line: StatementLine }) {
  const credit = line.direction === 'credit';
  const path = line.object ? objectPath(line.object) : null;
  const signed = `${credit ? '+' : '−'} ${formatXof(line.amount)}`;
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
      <div className="grid min-w-0 gap-1">
        <p className="text-small text-ink-muted">{formatDateTime(line.createdAt)}</p>
        <p className="text-ink font-semibold">{line.description}</p>
        <div>
          <Badge tone={TONES[line.kind] ?? 'neutral'}>{t.kinds[line.kind] ?? t.otherKind}</Badge>
        </div>
        {path && line.object ? (
          <Link
            href={path}
            className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
          >
            {line.object.objectType === 'billing_invoice' ? t.seeInvoice : t.seeMission}
            <IconArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      <div className="grid justify-items-end gap-1 text-right">
        <span
          className={
            credit ? 'text-action-ink font-semibold tabular-nums' : 'text-ink font-semibold tabular-nums'
          }
        >
          <span className="sr-only">{credit ? t.credit : t.debit} : </span>
          <span aria-hidden="true">{signed}</span>
          <span className="sr-only">{formatXof(line.amount)}</span>
        </span>
        <span className="text-small text-ink-muted tabular-nums">
          {t.balanceAfter(formatXof(line.balanceAfter))}
        </span>
      </div>
    </li>
  );
}

/** Relevé du portefeuille prépayé, les opérations les plus récentes d'abord, page par page. */
export function Statement() {
  const list = usePagedList(listStatement);
  return (
    <PagedListState
      list={list}
      labels={{ loading: t.loading, retry: t.retry, loadMore: t.loadMore, loadingMore: t.loadingMore }}
      empty={
        <div className="grid gap-1">
          <p className="text-ink">{t.statementEmpty}</p>
          <p className="text-small text-ink-muted">{t.statementEmptyHint}</p>
        </div>
      }
    >
      <ul className="rounded-card border-line bg-surface divide-line divide-y border px-4 shadow-xs sm:px-5">
        {list.items.map((line) => (
          <Line key={line.transactionId} line={line} />
        ))}
      </ul>
    </PagedListState>
  );
}
