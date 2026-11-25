'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatShortDate } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listRequests } from '@/features/cleaning/api';
import { cleaningPaths } from '@/features/cleaning/paths';
import { listTexts as t } from '@/features/cleaning/request-texts';
import type { RequestSummary } from '@/features/cleaning/schemas';
import {
  REQUEST_FILTERS,
  REQUEST_STATUS_PARAMS,
  requestStatus,
  statusFromParam,
} from '@/features/cleaning/status-texts';
import { StatusFilters } from './status-filters';

export const REQUEST_ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-3 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';

/** Demande qui attend le client : liseré à gauche. */
const WAITING: Record<string, string> = {
  awaiting_visit_fee: 'border-l-4 border-l-warning',
  quote_sent: 'border-l-4 border-l-action',
};

/** Une demande dans une liste : numéro, lieu, types, prochaine visite, état. */
export function RequestRow({ request }: { request: RequestSummary }) {
  const status = requestStatus(request.status);
  return (
    <li className={cn(REQUEST_ROW, WAITING[request.status])}>
      <div className="min-w-0">
        <Link
          href={cleaningPaths.requestDetail(request.id)}
          className="stretched-link font-display text-ink text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${request.number} · ${request.placeTypeName}`}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {[
            request.communeName,
            request.cleaningTypes.map((type) => type.name).join(', ') || null,
            request.nextVisitAt
              ? t.nextVisit(formatDateTime(request.nextVisitAt))
              : t.createdAt(formatShortDate(request.createdAt)),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <Badge tone={status.tone} dot>
        {status.label}
      </Badge>
    </li>
  );
}

function Requests({ status }: { status: string | undefined }) {
  const list = usePagedList(useCallback((cursor?: string) => listRequests({ cursor, status }), [status]));
  return (
    <PagedListState
      list={list}
      labels={t}
      empty={
        <div className="grid justify-items-start gap-2">
          <p className="text-ink">{status ? t.emptyFiltered : t.empty}</p>
          {status ? null : (
            <Link
              href={cleaningPaths.request}
              className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >
              {t.newRequest}
            </Link>
          )}
        </div>
      }
    >
      <ul className="grid gap-3">
        {list.items.map((request) => (
          <RequestRow key={request.id} request={request} />
        ))}
      </ul>
    </PagedListState>
  );
}

/** « Mes demandes de devis » : filtre par état dans l'adresse (`?statut=`), liste paginée par curseur. */
export function RequestList() {
  const status = statusFromParam(useSearchParams().get('statut'));
  const context = contextKey(useSession()) ?? 'none';
  return (
    <div className="grid gap-6">
      <StatusFilters
        basePath={cleaningPaths.requests}
        label={t.filter}
        allLabel={t.all}
        choices={REQUEST_FILTERS.map((value) => ({
          status: value,
          label: requestStatus(value).label,
          param: REQUEST_STATUS_PARAMS[value]!,
        }))}
        current={status}
      />
      <Requests key={`${context}:${status ?? 'all'}`} status={status} />
    </div>
  );
}
