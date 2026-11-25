'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Panel } from '@/components/ui/form-fields';
import { IconClock } from '@/components/ui/icons';
import { SkeletonCards } from '@/components/ui/skeleton';
import { TodoNone } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatShortDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { listDecisions } from '@/features/recovery/decision-api';
import type { RecoveryDecision } from '@/features/recovery/decision-schemas';
import { decisionKind, decisionStatus, decisionTexts as t } from '@/features/recovery/decision-texts';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';

/** En attente, la plus proche échéance d'abord. */
export const byDeadline = (a: RecoveryDecision, b: RecoveryDecision) =>
  a.expiresAt.localeCompare(b.expiresAt);

/** Décisions en attente (toutes, 100 au plus) et les 100 plus récentes, dont les passées sont gardées. */
async function loadDecisions() {
  const [pending, recent] = await Promise.all([listDecisions({ status: 'pending' }), listDecisions()]);
  return {
    pending: [...pending.decisions].sort(byDeadline),
    past: recent.decisions.filter((decision) => decision.status !== 'pending'),
    truncated: !!recent.nextCursor,
  };
}

const CARD =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:p-5';

/** Une décision en attente : type, dossier, date limite et conséquence d'une absence de réponse. */
function PendingCard({ decision }: { decision: RecoveryDecision }) {
  const kind = decisionKind(decision.kind);
  const deadline = formatDateTime(decision.expiresAt);
  return (
    <li className={cn(CARD, 'border-l-warning border-l-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={recoveryPaths.decision(decision.id)}
          className="stretched-link font-display text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {kind.title}
        </Link>
        <span className="text-small text-ink-muted tabular-nums">{t.caseNumber(decision.caseNumber)}</span>
      </div>
      <p className="text-ink flex items-center gap-2 font-medium">
        <IconClock className="text-warning size-4 shrink-0" />
        {t.answerBefore(deadline)}
      </p>
      <p className="text-small text-ink-muted">{t.withoutAnswer(deadline, kind.withoutAnswer)}</p>
      <span className="text-action-ink text-sm font-semibold">{t.open}</span>
    </li>
  );
}

function PastRow({ decision }: { decision: RecoveryDecision }) {
  const status = decisionStatus(decision.status);
  const date = decision.answeredAt ?? decision.expiresAt;
  return (
    <li className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-3 last:border-b-0">
      <span className="grid min-w-0 gap-0.5">
        <Link
          href={recoveryPaths.decision(decision.id)}
          className="text-ink font-medium underline-offset-4 hover:underline"
        >
          {`${decisionKind(decision.kind).title} · ${t.caseNumber(decision.caseNumber)}`}
        </Link>
        <span className="text-small text-ink-muted">
          {decision.answeredAt ? t.answeredOn(formatShortDate(date)) : t.closedOn(formatShortDate(date))}
        </span>
      </span>
      <Badge tone={status.tone}>{status.label}</Badge>
    </li>
  );
}

/**
 * « Décisions » (`/mon-espace/recouvrement/decisions`) : celles qui attendent une réponse d'abord, la plus
 * proche échéance en tête, avec ce qui se passe sans réponse ; puis les décisions passées. Relu à chaque
 * changement de compte actif.
 */
export function DecisionList() {
  const key = contextKey(useSession()) ?? 'none';
  return <List key={key} />;
}

function List() {
  const { state, reload } = useResource(loadDecisions);
  if (state.status === 'loading') return <SkeletonCards label={t.loading} rows={3} />;
  if (state.status === 'error') {
    if (isBackendPending(state.error)) {
      return (
        <BackendPending
          id="decisions-attente"
          title={t.listTitle}
          needs={[{ method: 'GET', path: '/api/v1/recovery/decisions', purpose: 'Décisions du créancier.' }]}
        >
          {t.listLead}
        </BackendPending>
      );
    }
    return (
      <div className="rounded-panel border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-7">
        <FormMessage>{errorWithReference(describeRecoveryError(state.error))}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }
  const { pending, past, truncated } = state.data;
  return (
    <div className="grid gap-8">
      <Panel id="decisions-en-attente" title={t.pendingTitle}>
        {pending.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {pending.map((decision) => (
              <PendingCard key={decision.id} decision={decision} />
            ))}
          </ul>
        ) : (
          <TodoNone>{t.pendingNone}</TodoNone>
        )}
      </Panel>
      <Panel id="decisions-passees" title={t.pastTitle}>
        {past.length ? (
          <>
            <ul>
              {past.map((decision) => (
                <PastRow key={decision.id} decision={decision} />
              ))}
            </ul>
            {truncated ? <p className="text-small text-ink-muted mt-3">{t.truncated}</p> : null}
          </>
        ) : (
          <p className="text-ink-muted">{t.pastNone}</p>
        )}
      </Panel>
    </div>
  );
}
