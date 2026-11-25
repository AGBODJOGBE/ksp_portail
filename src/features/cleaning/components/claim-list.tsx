'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listClaims } from '@/features/cleaning/api';
import { cleaningPaths } from '@/features/cleaning/paths';
import { claimTexts as t } from '@/features/cleaning/program-texts';
import type { Claim } from '@/features/cleaning/schemas';
import {
  CLAIM_STATUSES,
  OPEN_CLAIM_STATUSES,
  claimCategory,
  claimFilter,
  claimStatus,
} from '@/features/cleaning/status-texts';
import { REQUEST_ROW } from './request-list';
import { StatusFilters } from './status-filters';

/** Une réclamation dans une liste : nature, date d'ouverture, messages, état ; liseré si ouverte. */
export function ClaimRow({ claim }: { claim: Claim }) {
  const status = claimStatus(claim.status);
  return (
    <li className={cn(REQUEST_ROW, OPEN_CLAIM_STATUSES.has(claim.status) && 'border-l-warning border-l-4')}>
      <div className="min-w-0">
        <Link
          href={cleaningPaths.claim(claim.id)}
          className="stretched-link font-display text-ink text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {claimCategory(claim.category)}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {[t.openedAt(formatShortDate(claim.openedAt)), t.messages(claim.messages.length)].join(' · ')}
        </p>
        <p className="text-small text-ink mt-1 line-clamp-2">{claim.text}</p>
      </div>
      <Badge tone={status.tone} dot>
        {status.label}
      </Badge>
    </li>
  );
}

function Claims({ status }: { status: string | undefined }) {
  const list = usePagedList(useCallback((cursor?: string) => listClaims({ cursor, status }), [status]));
  return (
    <PagedListState
      list={list}
      labels={t}
      emptyIllustration={status ? 'soon' : 'done'}
      empty={<p className="text-ink">{status ? t.emptyFiltered : t.empty}</p>}
    >
      <ul className="grid gap-3">
        {list.items.map((claim) => (
          <ClaimRow key={claim.id} claim={claim} />
        ))}
      </ul>
    </PagedListState>
  );
}

/** « Mes réclamations » : filtre par état dans l'adresse (`?statut=`), liste paginée par curseur. */
export function ClaimList() {
  const status = claimFilter.fromParam(useSearchParams().get('statut'));
  const context = contextKey(useSession()) ?? 'none';
  return (
    <div className="grid gap-6">
      <StatusFilters
        basePath={cleaningPaths.claims}
        label={t.filter}
        allLabel={t.all}
        choices={claimFilter.keys.map((value) => ({
          status: value,
          label: CLAIM_STATUSES[value]!.label,
          param: CLAIM_STATUSES[value]!.param,
        }))}
        current={status}
      />
      <Claims key={`${context}:${status ?? 'all'}`} status={status} />
    </div>
  );
}
