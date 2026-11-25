'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PagedListState } from '@/components/ui/paged-list-state';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { usePagedList } from '@/lib/use-paged-list';
import { listPrograms } from '@/features/cleaning/api';
import { cleaningPaths } from '@/features/cleaning/paths';
import { programTexts as t } from '@/features/cleaning/program-texts';
import { describeSchedule } from '@/features/cleaning/schedule';
import type { ProgramDetail } from '@/features/cleaning/schemas';
import { PROGRAM_STATUSES, programFilter, programStatus } from '@/features/cleaning/status-texts';
import { REQUEST_ROW } from './request-list';
import { StatusFilters } from './status-filters';

/** Avancement d'un programme : séances réalisées sur le total (chiffres de la gateway). */
export function ProgramProgress({ program, className }: { program: ProgramDetail; className?: string }) {
  const ratio = program.sessionsCount ? Math.min(1, program.sessionsCompleted / program.sessionsCount) : 0;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <p className="text-small text-ink-muted tabular-nums">
        {t.progress(program.sessionsCompleted, program.sessionsCount)}
      </p>
      <div
        role="progressbar"
        aria-label={t.progressLabel}
        aria-valuemin={0}
        aria-valuemax={program.sessionsCount}
        aria-valuenow={program.sessionsCompleted}
        className="bg-line h-1.5 overflow-hidden rounded-full"
      >
        <span className="bg-action block h-full rounded-full" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** Un programme dans une liste : numéro, lieu, rythme, avancement, état ; liseré si suspendu. */
export function ProgramRow({ program }: { program: ProgramDetail }) {
  const status = programStatus(program.status);
  return (
    <li className={cn(REQUEST_ROW, program.status === 'suspended' && 'border-l-warning border-l-4')}>
      <div className="grid min-w-0 gap-2">
        <Link
          href={cleaningPaths.program(program.id)}
          className="stretched-link font-display text-ink text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${program.number} · ${program.place.name}`}
        </Link>
        <p className="text-small text-ink-muted">
          {[
            `${program.place.placeTypeName} · ${program.place.communeName}`,
            program.cleaningTypes.map((type) => type.name).join(', ') || null,
            describeSchedule(program.schedule),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <ProgramProgress program={program} className="max-w-xs" />
      </div>
      <Badge tone={status.tone} dot>
        {status.label}
      </Badge>
    </li>
  );
}

function Programs({ status }: { status: string | undefined }) {
  const list = usePagedList(useCallback((cursor?: string) => listPrograms({ cursor, status }), [status]));
  return (
    <PagedListState
      list={list}
      labels={t}
      empty={
        <div className="grid justify-items-start gap-2">
          <p className="text-ink">{status ? t.emptyFiltered : t.empty}</p>
          {status ? null : (
            <Link
              href={cleaningPaths.requests}
              className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >
              {t.seeRequests}
            </Link>
          )}
        </div>
      }
    >
      <ul className="grid gap-3">
        {list.items.map((program) => (
          <ProgramRow key={program.id} program={program} />
        ))}
      </ul>
    </PagedListState>
  );
}

/** « Mes programmes » : filtre par état dans l'adresse (`?statut=`), liste paginée par curseur. */
export function ProgramList() {
  const status = programFilter.fromParam(useSearchParams().get('statut'));
  const context = contextKey(useSession()) ?? 'none';
  return (
    <div className="grid gap-6">
      <StatusFilters
        basePath={cleaningPaths.programs}
        label={t.filter}
        allLabel={t.all}
        choices={programFilter.keys.map((value) => ({
          status: value,
          label: PROGRAM_STATUSES[value]!.label,
          param: PROGRAM_STATUSES[value]!.param,
        }))}
        current={status}
      />
      <Programs key={`${context}:${status ?? 'all'}`} status={status} />
    </div>
  );
}
