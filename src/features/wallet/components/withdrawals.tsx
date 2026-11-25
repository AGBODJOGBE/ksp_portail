'use client';

import { Badge, type BadgeTone } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { formatDateTime, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listWithdrawals } from '@/features/wallet/api';
import type { Withdrawal } from '@/features/wallet/schemas';
import { walletTexts } from '@/features/wallet/texts';
import { withdrawalTexts as t } from '@/features/wallet/withdrawal-texts';

const TONES: Record<string, BadgeTone> = {
  requested: 'warning',
  awaiting_approval: 'warning',
  submitted: 'brand',
  completed: 'success',
  failed: 'danger',
  rejected: 'danger',
};

/** Ce qui s'est passé, ou ce qui se passe maintenant, pour un retrait. */
function outcome(withdrawal: Withdrawal): string | null {
  if (withdrawal.completedAt) return t.completed(formatDateTime(withdrawal.completedAt));
  if (withdrawal.failedAt) return t.failed(formatDateTime(withdrawal.failedAt));
  if (withdrawal.rejectedAt) return t.rejected(formatDateTime(withdrawal.rejectedAt));
  return t.progress[withdrawal.status] ?? null;
}

function Line({ withdrawal }: { withdrawal: Withdrawal }) {
  const operator = walletTexts.operators[withdrawal.beneficiaryOperator] ?? withdrawal.beneficiaryOperator;
  const text = outcome(withdrawal);
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
      <div className="grid min-w-0 gap-1">
        <p className="text-small text-ink-muted">{formatDateTime(withdrawal.requestedAt)}</p>
        <p className="text-ink font-semibold tabular-nums">
          {t.to(operator, withdrawal.beneficiaryPhoneMasked)}
        </p>
        <div>
          <Badge tone={TONES[withdrawal.status] ?? 'neutral'} dot>
            {t.statuses[withdrawal.status] ?? withdrawal.status}
          </Badge>
        </div>
        {text ? <p className="text-small text-ink-muted">{text}</p> : null}
        {withdrawal.rejectionReason ? (
          <p className="text-small text-ink">{t.rejectedReason(withdrawal.rejectionReason)}</p>
        ) : null}
      </div>
      <span className="text-ink font-semibold tabular-nums">{formatXof(withdrawal.amount)}</span>
    </li>
  );
}

/**
 * « Mes retraits » : retraits du titulaire (ou de l'organisation active), les plus récents d'abord, page
 * par page. Visible de tous les membres ; pas d'annulation en ligne (R-WL-04).
 */
export function Withdrawals() {
  const list = usePagedList(listWithdrawals);
  return (
    <PagedListState
      list={list}
      labels={{
        loading: walletTexts.loading,
        retry: walletTexts.retry,
        loadMore: walletTexts.loadMore,
        loadingMore: walletTexts.loadingMore,
      }}
      empty={<p className="text-ink">{t.listEmpty}</p>}
    >
      <ul className="rounded-card border-line bg-surface divide-line divide-y border px-4 shadow-xs sm:px-5">
        {list.items.map((withdrawal) => (
          <Line key={withdrawal.id} withdrawal={withdrawal} />
        ))}
      </ul>
    </PagedListState>
  );
}
