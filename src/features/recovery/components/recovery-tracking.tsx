'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { IconRecouvrement } from '@/components/ui/icons';
import { TodoState } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { listCases } from '@/features/recovery/api';
import { describeRecoveryError } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCaseSummary } from '@/features/recovery/schemas';
import { caseStatus, deadlineLabel, stageLabel } from '@/features/recovery/texts';
import { isYourTurn, trackingNext, trackingTexts as t } from '@/features/recovery/tracking-texts';

/** Dossiers affichés au plus ; les suivants sont comptés, avec un lien vers la liste. */
const SHOWN = 8;
const ENDED = new Set(['closed', 'rejected']);

/** Dossiers en cours (ni clos ni refusés), parmi les 100 plus récents. */
async function loadTracking() {
  const page = await listCases();
  return page.cases.filter((summary) => !ENDED.has(summary.status));
}

const CARD =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:p-5';

function CaseCard({ summary }: { summary: RecoveryCaseSummary }) {
  const status = caseStatus(summary.status);
  const deadline = summary.nextDeadline;
  const yours = isYourTurn(summary.status, deadline?.kind ?? null);
  const next =
    deadline?.kind === 'dispute_answer'
      ? t.disputeAnswer
      : deadline?.kind === 'creditor_decision'
        ? t.decisionWaiting
        : (trackingNext(summary.status) ?? t.stage(stageLabel(summary.stage)));
  return (
    <li className={cn(CARD, yours && 'border-l-action border-l-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={recoveryPaths.case(summary.id)}
          className="stretched-link font-display text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${summary.number} · ${summary.debtorName}`}
        </Link>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
      <p className="text-ink flex flex-wrap items-center gap-2">
        <span className="text-small text-ink-muted font-semibold">{t.next} :</span>
        {next}
        <Badge tone={yours ? 'action' : 'neutral'}>{yours ? t.yourTurn : t.kspTurn}</Badge>
      </p>
      {deadline ? (
        <p className="text-small text-ink-muted">
          {t.deadline(deadlineLabel(deadline.kind), formatDateTime(deadline.dueAt))}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Section Recouvrement de « Suivre ma demande » : dossiers en cours, avec la prochaine étape, sa date et
 * qui doit agir. Service pas encore servi : la section se tait. Relue à chaque changement de compte actif.
 */
export function RecoveryTracking() {
  const key = contextKey(useSession()) ?? 'none';
  return <Tracking key={key} />;
}

function Tracking() {
  const { state, reload } = useResource(loadTracking);
  if (state.status === 'error' && isBackendPending(state.error)) return null;
  return (
    <section
      aria-labelledby="suivi-recouvrement"
      className="rounded-panel border-line bg-surface grid gap-6 border p-5 shadow-xs sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="suivi-recouvrement"
          className="font-display text-h3 text-ink flex items-center gap-2.5 font-semibold"
        >
          <IconRecouvrement className="text-brand-ink size-6" />
          {t.title}
        </h2>
        <Link
          href={recoveryPaths.space}
          className="text-action-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t.all}
        </Link>
      </div>
      {state.status === 'ready' ? (
        state.data.length ? (
          <div className="grid gap-3">
            <ul className="grid gap-3 lg:grid-cols-2">
              {state.data.slice(0, SHOWN).map((summary) => (
                <CaseCard key={summary.id} summary={summary} />
              ))}
            </ul>
            {state.data.length > SHOWN ? (
              <Link
                href={recoveryPaths.cases}
                className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                {t.more(state.data.length - SHOWN)}
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="text-ink-muted">{t.none}</p>
        )
      ) : (
        <TodoState
          loading={state.status === 'loading'}
          error={state.status === 'error' ? describeRecoveryError(state.error).message : null}
          loadingLabel={t.loading}
          retryLabel={t.retry}
          onRetry={reload}
        />
      )}
    </section>
  );
}
