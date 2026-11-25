'use client';

import { Agenda, type AgendaEntry } from '@/components/ui/agenda';
import { Badge } from '@/components/ui/badge';
import { FormMessage } from '@/components/ui/field';
import { IconNettoyage } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { formatDateTime, formatTime, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { describeCleaningError } from '@/features/cleaning/errors';
import {
  type CleaningOverview,
  type ProgramSession,
  loadCleaningOverview,
  loadCleaningTodo,
} from '@/features/cleaning/overview';
import { cleaningPaths } from '@/features/cleaning/paths';
import { dashboardTexts as d } from '@/features/cleaning/program-texts';
import { homeTexts as t } from '@/features/cleaning/request-texts';
import type { ProgramDetail, RequestSummary } from '@/features/cleaning/schemas';
import {
  programStatus,
  requestStatus,
  sessionPaymentStatus,
  suspensionCause,
} from '@/features/cleaning/status-texts';
import { CleaningTabs } from './cleaning-tabs';
import { Panel } from './fields';

type Todo = Pick<CleaningOverview, 'requests' | 'sessionsToPay' | 'suspended'>;

const todoCount = (todo: Todo) => todo.requests.length + todo.sessionsToPay.length + todo.suspended.length;

function RequestTodo({ request }: { request: RequestSummary }) {
  const status = requestStatus(request.status);
  const fee = request.status === 'awaiting_visit_fee';
  return (
    <TodoItem
      title={fee ? t.dashboardFee(request.number) : t.dashboardQuote(request.number)}
      badge={
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      }
      text={`${request.placeTypeName} · ${request.communeName} — ${fee ? t.dashboardFeeText(null) : t.dashboardQuoteText}`}
      action={{ href: cleaningPaths.requestDetail(request.id), label: t.dashboardAction }}
    />
  );
}

function SessionTodo({ item }: { item: ProgramSession }) {
  const { session, program } = item;
  const overdue = session.paymentStatus === 'overdue';
  const payment = sessionPaymentStatus(session.paymentStatus ?? '');
  return (
    <TodoItem
      title={(overdue ? d.sessionOverdue : d.sessionDue)(session.rank, session.sessionsCount, program.number)}
      badge={
        <Badge tone={payment.tone} dot>
          {payment.label}
        </Badge>
      }
      text={`${program.place.name} — ${overdue ? d.sessionOverdueText : d.sessionDueText(session.dueBy ? formatDateTime(session.dueBy) : null)}`}
      figure={session.amountDue ? { label: d.amount, value: formatXof(session.amountDue) } : undefined}
      action={{ href: cleaningPaths.session(program.id, session.id), label: d.sessionAction }}
    />
  );
}

function SuspendedTodo({ program }: { program: ProgramDetail }) {
  const status = programStatus(program.status);
  return (
    <TodoItem
      title={d.programSuspended(program.number)}
      badge={
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      }
      text={`${program.place.name} — ${program.suspensionCauses.map((item) => suspensionCause(item.cause).fix).join(' ')}`}
      action={{ href: cleaningPaths.program(program.id), label: d.programAction }}
    />
  );
}

/** Ce qui attend le client : séances à payer d'abord, puis frais, devis et programmes suspendus. */
function TodoList({ todo }: { todo: Todo }) {
  return (
    <ul className="grid gap-3">
      {todo.sessionsToPay.map((item) => (
        <SessionTodo key={item.session.id} item={item} />
      ))}
      {todo.requests.map((request) => (
        <RequestTodo key={request.id} request={request} />
      ))}
      {todo.suspended.map((program) => (
        <SuspendedTodo key={program.id} program={program} />
      ))}
    </ul>
  );
}

/** Panneau « Nettoyage » de l'accueil de Mon espace KSP : seulement ce qui attend le client. */
export function CleaningTodo() {
  const key = contextKey(useSession()) ?? 'none';
  return <MySpaceTodo key={key} />;
}

const loadTodo = () => loadCleaningTodo();
const loadOverview = () => loadCleaningOverview();

function MySpaceTodo() {
  const { state, reload } = useResource(loadTodo);
  // Service pas encore servi par la gateway : pas de panneau.
  if (state.status === 'error' && isBackendPending(state.error)) return null;
  return (
    <TodoPanel
      id="todo-nettoyage"
      title={t.dashboardTitle}
      icon={<IconNettoyage className="size-5" />}
      link={{ href: cleaningPaths.space, label: t.dashboardSeeAll }}
      count={state.status === 'ready' ? todoCount(state.data) : undefined}
    >
      {state.status === 'ready' ? (
        todoCount(state.data) ? (
          <TodoList todo={state.data} />
        ) : (
          <TodoNone>{t.dashboardNone}</TodoNone>
        )
      ) : (
        <TodoState
          loading={state.status === 'loading'}
          error={state.status === 'error' ? describeCleaningError(state.error).message : null}
          loadingLabel={t.todoLoading}
          retryLabel="Réessayer"
          onRetry={reload}
        />
      )}
    </TodoPanel>
  );
}

/** Prochains rendez-vous : visites des lieux et prochaine séance de chaque programme, la plus proche d'abord. */
function upcomingEntries(overview: CleaningOverview): AgendaEntry[] {
  const visits = overview.upcomingVisits.map((request) => ({
    key: `visite-${request.id}`,
    date: request.nextVisitAt!,
    when: formatDateTime(request.nextVisitAt!),
    title: d.upcomingVisit(request.number),
    text: d.upcomingVisitText(`${request.placeTypeName} · ${request.communeName}`),
    link: { href: cleaningPaths.requestDetail(request.id), label: d.openRequest },
  }));
  const sessions = overview.upcomingSessions.map(({ session, program }) => ({
    key: `seance-${session.id}`,
    date: session.scheduledStart,
    when: formatDateTime(session.scheduledStart),
    title: d.upcomingSession(session.rank, session.sessionsCount, program.number),
    text: `${program.place.name} · ${d.upcomingSessionText(formatTime(session.scheduledStart), formatTime(session.scheduledEnd))}`,
    link: { href: cleaningPaths.session(program.id, session.id), label: d.openSession },
  }));
  return [...visits, ...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry, index) => ({ ...entry, state: index === 0 ? ('next' as const) : ('default' as const) }));
}

/**
 * Tableau du Nettoyage (`/mon-espace/nettoyage`) : « À faire » (séances à payer, frais de visite, devis,
 * programmes suspendus), « Prochains rendez-vous » (visites et séances), puis les onglets Demandes,
 * Programmes, Réclamations et Mes lieux.
 */
export function CleaningHome() {
  const key = contextKey(useSession()) ?? 'none';
  return <Home key={key} />;
}

function Home() {
  const { state, reload } = useResource(loadOverview);
  const entries = state.status === 'ready' ? upcomingEntries(state.data) : [];
  return (
    <div className="grid gap-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <Panel id="nettoyage-a-faire" title={t.todoTitle}>
          {state.status === 'ready' ? (
            <div className="grid gap-4">
              {todoCount(state.data) ? <TodoList todo={state.data} /> : <TodoNone>{t.todoNone}</TodoNone>}
              {state.data.partial ? <FormMessage tone="info">{d.partial}</FormMessage> : null}
            </div>
          ) : (
            <TodoState
              loading={state.status === 'loading'}
              error={state.status === 'error' ? describeCleaningError(state.error).message : null}
              loadingLabel={t.todoLoading}
              retryLabel="Réessayer"
              onRetry={reload}
            />
          )}
        </Panel>
        <Panel id="nettoyage-rendez-vous" title={d.upcomingTitle}>
          {state.status === 'ready' ? (
            entries.length ? (
              <Agenda entries={entries} label={d.upcomingLabel} />
            ) : (
              <p className="text-ink-muted">{d.upcomingNone}</p>
            )
          ) : (
            <TodoState
              loading={state.status === 'loading'}
              error={state.status === 'error' ? describeCleaningError(state.error).message : null}
              loadingLabel={t.todoLoading}
              retryLabel="Réessayer"
              onRetry={reload}
            />
          )}
        </Panel>
      </div>
      <CleaningTabs />
    </div>
  );
}
