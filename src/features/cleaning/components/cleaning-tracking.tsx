'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { IconNettoyage } from '@/components/ui/icons';
import { TodoState } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useResource } from '@/lib/use-resource';
import { listPrograms, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { cleaningTrackingTexts as t } from '@/features/cleaning/program-texts';
import { describeSchedule } from '@/features/cleaning/schedule';
import type { ProgramDetail, RequestSummary } from '@/features/cleaning/schemas';
import { ACTIVE_PROGRAM_STATUSES, programStatus, requestStatus } from '@/features/cleaning/status-texts';
import { ProgramProgress } from './program-list';

/** Demandes et programmes en cours (avant l'acceptation, programmes vivants). */
async function loadTracking() {
  const [requests, programs] = await Promise.all([
    listRequests({ limit: 20 }),
    listPrograms({ sort: 'nextSession', limit: 20 }),
  ]);
  return {
    requests: requests.data.filter((request) => request.status in t.requestNext),
    programs: programs.data.filter((program) => ACTIVE_PROGRAM_STATUSES.has(program.status)),
  };
}

const CARD =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:p-5';

function Turn({ yours }: { yours: boolean }) {
  return <Badge tone={yours ? 'action' : 'neutral'}>{yours ? t.yourTurn : t.kspTurn}</Badge>;
}

function RequestCard({ request }: { request: RequestSummary }) {
  const status = requestStatus(request.status);
  const yours = t.requestYourTurn.has(request.status);
  return (
    <li className={cn(CARD, yours && 'border-l-action border-l-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={cleaningPaths.requestDetail(request.id)}
          className="stretched-link font-display text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${request.number} · ${request.placeTypeName}`}
        </Link>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
      <p className="text-small text-ink-muted">{request.communeName}</p>
      <p className="text-ink flex flex-wrap items-center gap-2">
        <span className="text-small text-ink-muted font-semibold">{t.next} :</span>
        {t.requestNext[request.status]}
        <Turn yours={yours} />
      </p>
    </li>
  );
}

function ProgramCard({ program }: { program: ProgramDetail }) {
  const status = programStatus(program.status);
  const yours = program.status === 'suspended';
  return (
    <li className={cn(CARD, yours && 'border-l-warning border-l-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={cleaningPaths.program(program.id)}
          className="stretched-link font-display text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${program.number} · ${program.place.name}`}
        </Link>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
      <p className="text-small text-ink-muted">{describeSchedule(program.schedule)}</p>
      <ProgramProgress program={program} className="max-w-xs" />
      <p className="text-ink flex flex-wrap items-center gap-2">
        <span className="text-small text-ink-muted font-semibold">{t.next} :</span>
        {t.programNext[program.status]}
        <Turn yours={yours} />
      </p>
    </li>
  );
}

/**
 * « Suivre ma demande » : le Nettoyage en cours, demandes avant l'acceptation et programmes vivants, avec
 * la prochaine étape et qui doit agir. Rien en cours : la section le dit et mène au tableau.
 */
export function CleaningTracking() {
  const key = contextKey(useSession()) ?? 'none';
  return <Tracking key={key} />;
}

function Tracking() {
  const { state, reload } = useResource(loadTracking);
  if (state.status === 'error' && isBackendPending(state.error)) return null;
  return (
    <section
      aria-labelledby="suivi-nettoyage"
      className="rounded-panel border-line bg-surface grid gap-6 border p-5 shadow-xs sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="suivi-nettoyage"
          className="font-display text-h3 text-ink flex items-center gap-2.5 font-semibold"
        >
          <IconNettoyage className="text-brand-ink size-6" />
          {t.title}
        </h2>
        <Link
          href={cleaningPaths.space}
          className="text-action-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t.all}
        </Link>
      </div>
      {state.status === 'ready' ? (
        state.data.requests.length || state.data.programs.length ? (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {state.data.requests.length ? (
              <div className="grid gap-3">
                <h3 className="text-ink font-semibold">{t.requestsTitle}</h3>
                <ul className="grid gap-3">
                  {state.data.requests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </ul>
              </div>
            ) : null}
            {state.data.programs.length ? (
              <div className="grid gap-3">
                <h3 className="text-ink font-semibold">{t.programsTitle}</h3>
                <ul className="grid gap-3">
                  {state.data.programs.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-ink-muted">{t.none}</p>
        )
      ) : (
        <TodoState
          loading={state.status === 'loading'}
          error={state.status === 'error' ? describeCleaningError(state.error).message : null}
          loadingLabel={t.loading}
          retryLabel={t.retry}
          onRetry={reload}
        />
      )}
    </section>
  );
}
