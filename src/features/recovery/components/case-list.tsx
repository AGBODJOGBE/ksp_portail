'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { SelectField } from '@/components/ui/form-fields';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { listCases } from '@/features/recovery/api';
import { describeRecoveryError } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCaseSummary } from '@/features/recovery/schemas';
import { spaceTexts as t } from '@/features/recovery/space-texts';
import {
  KIND_PARAMS,
  STAGES,
  STAGE_PARAMS,
  STATUS_FILTERS,
  caseStatus,
  deadlineLabel,
  kindLabel,
  stageLabel,
} from '@/features/recovery/texts';

export const CASE_ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-3 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';

/** Dossier qui attend le créancier : liseré à gauche. */
const WAITING: Record<string, string> = {
  draft: 'border-l-4 border-l-warning',
  awaiting_fee: 'border-l-4 border-l-warning',
  info_requested: 'border-l-4 border-l-warning',
};

/** Un dossier dans une liste : numéro, débiteur, étape, reste dû, prochaine échéance, état. */
export function CaseRow({ summary }: { summary: RecoveryCaseSummary }) {
  const status = caseStatus(summary.status);
  return (
    <li className={cn(CASE_ROW, WAITING[summary.status])}>
      <div className="min-w-0">
        <Link
          href={recoveryPaths.case(summary.id)}
          className="stretched-link font-display text-ink text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${summary.number} · ${summary.debtorName}`}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {[
            kindLabel(summary.kind),
            summary.stage ? stageLabel(summary.stage) : null,
            summary.nextDeadline
              ? `${deadlineLabel(summary.nextDeadline.kind)} : ${formatDateTime(summary.nextDeadline.dueAt)}`
              : t.createdAt(formatShortDate(summary.createdAt)),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span className="text-ink font-semibold tabular-nums">
          <span className="sr-only">{`${t.due} : `}</span>
          {formatXof(summary.due)}
        </span>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
    </li>
  );
}

/** Valeur de l'adresse (`?etat=en-cours`) → valeur de la gateway (`active`), ou undefined. */
function fromParam(params: Record<string, string>, value: string | null): string | undefined {
  if (!value) return undefined;
  return Object.entries(params).find(([, param]) => param === value)?.[0];
}

const STATUS_PARAMS = Object.fromEntries(STATUS_FILTERS.map((item) => [item.value, item.param]));

interface Filters {
  status?: string;
  stage?: string;
  kind?: string;
  search?: string;
}

const describe = (error: unknown) => describeRecoveryError(error).message;

function Cases({ filters }: { filters: Filters }) {
  const [total, setTotal] = useState<number | null>(null);
  // Clé stable : la lecture ne repart que si les filtres changent vraiment.
  const json = JSON.stringify(filters);
  const list = usePagedList(
    useCallback(async () => {
      // Une seule page (100 dossiers) : la page suivante est refusée par la gateway aujourd'hui.
      const page = await listCases(JSON.parse(json) as Filters);
      setTotal(page.total);
      return { data: page.cases, nextCursor: null };
    }, [json]),
    describe,
  );
  const filtered = !!(filters.status || filters.stage || filters.kind || filters.search);
  return (
    <PagedListState
      list={list}
      labels={t}
      empty={
        <div className="grid justify-items-start gap-2">
          <p className="text-ink">{filtered ? t.emptyFiltered : t.empty}</p>
          {filtered ? null : (
            <Link
              href={recoveryPaths.newCase}
              className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >
              {t.newCase}
            </Link>
          )}
        </div>
      }
    >
      <div className="grid gap-3">
        {total !== null ? (
          <p className="text-small text-ink-muted" aria-live="polite">
            {t.total(total)}
          </p>
        ) : null}
        <ul className="grid gap-3">
          {list.items.map((summary) => (
            <CaseRow key={summary.id} summary={summary} />
          ))}
        </ul>
        {total !== null && total > list.items.length ? (
          <p className="text-small text-ink-muted">{t.truncated(list.items.length, total)}</p>
        ) : null}
      </div>
    </PagedListState>
  );
}

/**
 * « Mes dossiers » : filtres d'état, d'étape et de type et recherche (numéro ou nom du débiteur) dans
 * l'adresse (`?etat=`, `?etape=`, `?type=`, `?q=`), lus sous Suspense (page statique). Les 100 plus récents
 * sont lus d'un coup, sans « Afficher plus » (la page suivante est refusée par la gateway).
 */
export function CaseList() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const context = contextKey(useSession()) ?? 'none';
  const query = params.get('q')?.trim() ?? '';
  const filters: Filters = {
    status: fromParam(STATUS_PARAMS, params.get('etat')),
    stage: fromParam(STAGE_PARAMS, params.get('etape')),
    kind: fromParam(KIND_PARAMS, params.get('type')),
    search: query.length >= 3 ? query : undefined,
  };
  const [search, setSearch] = useState(query);
  const [searchError, setSearchError] = useState<string | null>(null);

  function navigate(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    if (value && value.length < 3) {
      setSearchError(t.searchTooShort);
      return;
    }
    setSearchError(null);
    navigate({ q: value || undefined });
  }

  const key = `${context}:${JSON.stringify(filters)}`;
  return (
    <div className="grid gap-6">
      <section
        aria-label={t.filtersLabel}
        className="rounded-panel border-line bg-surface grid gap-5 border p-4 shadow-xs sm:p-6"
      >
        <form
          role="search"
          onSubmit={submit}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        >
          <TextField
            id="dossiers-recherche"
            type="search"
            label={t.searchLabel}
            hint={t.searchHint}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            error={searchError}
          />
          <Button type="submit" variant="secondary" className="sm:mb-0.5">
            {t.search}
          </Button>
        </form>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            id="dossiers-etat"
            label={t.statusLabel}
            value={params.get('etat') ?? ''}
            onChange={(event) => navigate({ etat: event.target.value || undefined })}
          >
            <option value="">{t.all}</option>
            {STATUS_FILTERS.map((item) => (
              <option key={item.value} value={item.param}>
                {caseStatus(item.value).label}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="dossiers-etape"
            label={t.stageLabel}
            value={params.get('etape') ?? ''}
            onChange={(event) => navigate({ etape: event.target.value || undefined })}
          >
            <option value="">{t.all}</option>
            {STAGES.map((stage) => (
              <option key={stage} value={STAGE_PARAMS[stage]}>
                {stageLabel(stage)}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="dossiers-type"
            label={t.kindLabel}
            value={params.get('type') ?? ''}
            onChange={(event) => navigate({ type: event.target.value || undefined })}
          >
            <option value="">{t.all}</option>
            {Object.entries(KIND_PARAMS).map(([kind, param]) => (
              <option key={kind} value={param}>
                {kindLabel(kind)}
              </option>
            ))}
          </SelectField>
        </div>
        {['etat', 'etape', 'type', 'q'].some((name) => params.get(name)) ? (
          <button
            type="button"
            className="text-brand-ink inline-flex min-h-11 items-center justify-self-start font-semibold underline underline-offset-4"
            onClick={() => {
              setSearch('');
              setSearchError(null);
              navigate({ etat: undefined, etape: undefined, type: undefined, q: undefined });
            }}
          >
            {t.clear}
          </button>
        ) : null}
      </section>
      <Cases key={key} filters={filters} />
    </div>
  );
}
