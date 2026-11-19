'use client';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { formatDateTime, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listPayouts } from '@/features/wallet/api';
import type { Payout } from '@/features/wallet/schemas';
import { walletTexts as t } from '@/features/wallet/texts';

const TONES: Record<string, BadgeTone> = {
  pending_submission: 'warning',
  submitted: 'warning',
  completed: 'success',
  failed: 'danger',
};

function Line({ payout }: { payout: Payout }) {
  const operator = t.operators[payout.beneficiaryOperator] ?? payout.beneficiaryOperator;
  const outcome = payout.completedAt
    ? t.payoutCompleted(formatDateTime(payout.completedAt))
    : payout.failedAt
      ? t.payoutFailed(formatDateTime(payout.failedAt))
      : null;
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
      <div className="grid min-w-0 gap-1">
        <p className="text-small text-ink-muted">{formatDateTime(payout.createdAt)}</p>
        <p className="text-ink font-semibold tabular-nums">
          {t.payoutTo(operator, payout.beneficiaryPhoneMasked)}
        </p>
        <div>
          <Badge tone={TONES[payout.status] ?? 'neutral'} dot>
            {t.payoutStatuses[payout.status] ?? payout.status}
          </Badge>
        </div>
        {outcome ? <p className="text-small text-ink-muted">{outcome}</p> : null}
      </div>
      <span className="text-ink font-semibold tabular-nums">{formatXof(payout.amount)}</span>
    </li>
  );
}

/** Reversements du titulaire (ADR-041), les plus récents d'abord, page par page. */
export function Payouts() {
  const list = usePagedList(listPayouts);
  return (
    <PagedListState
      list={list}
      labels={{ loading: t.loading, retry: t.retry, loadMore: t.loadMore, loadingMore: t.loadingMore }}
      empty={<p className="text-ink">{t.payoutsEmpty}</p>}
    >
      <ul className="rounded-card border-line bg-surface divide-line divide-y border px-4 shadow-xs sm:px-5">
        {list.items.map((payout) => (
          <Line key={payout.id} payout={payout} />
        ))}
      </ul>
    </PagedListState>
  );
}
