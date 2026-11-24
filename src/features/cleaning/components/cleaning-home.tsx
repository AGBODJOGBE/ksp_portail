'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IconNettoyage } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { contextKey, isBackendPending, useSession } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { listPlaces, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { homeTexts as t } from '@/features/cleaning/request-texts';
import type { RequestSummary } from '@/features/cleaning/schemas';
import { requestStatus } from '@/features/cleaning/status-texts';
import { Panel } from './fields';
import { PlaceRow } from './places';
import { RequestRow } from './request-list';

const RECENT = 5;

/** Demandes qui attendent le client : frais de visite à payer, devis à accepter (filtrés par la gateway). */
async function loadTodo(): Promise<RequestSummary[]> {
  const [fees, quotes] = await Promise.all([
    listRequests({ status: 'awaiting_visit_fee', limit: 10 }),
    listRequests({ status: 'quote_sent', limit: 10 }),
  ]);
  return [...fees.data, ...quotes.data];
}

const loadRecent = () => listRequests({ limit: RECENT });
const loadPlaces = () => listPlaces({ limit: RECENT });

function TodoList({ requests }: { requests: RequestSummary[] }) {
  return (
    <ul className="grid gap-3">
      {requests.map((request) => {
        const status = requestStatus(request.status);
        const fee = request.status === 'awaiting_visit_fee';
        return (
          <TodoItem
            key={request.id}
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
      })}
    </ul>
  );
}

/** Panneau « Nettoyage » de l'accueil de Mon espace KSP : seulement ce qui attend le client. */
export function CleaningTodo() {
  const key = contextKey(useSession()) ?? 'none';
  return <Todo key={key} />;
}

function Todo() {
  const { state, reload } = useResource(loadTodo);
  // Service pas encore servi par la gateway : pas de panneau.
  if (state.status === 'error' && isBackendPending(state.error)) return null;
  return (
    <TodoPanel
      id="todo-nettoyage"
      title={t.dashboardTitle}
      icon={<IconNettoyage className="size-5" />}
      link={{ href: cleaningPaths.space, label: t.dashboardSeeAll }}
      count={state.status === 'ready' ? state.data.length : undefined}
    >
      {state.status === 'ready' ? (
        state.data.length ? (
          <TodoList requests={state.data} />
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

/**
 * Tableau du Nettoyage (`/mon-espace/nettoyage`), version simple : ce qui attend le client, dernières
 * demandes, lieux enregistrés. Programmes, séances et réclamations arrivent avec l'étape suivante.
 */
export function CleaningHome() {
  const key = contextKey(useSession()) ?? 'none';
  return <Home key={key} />;
}

function Home() {
  const todo = useResource(loadTodo);
  const recent = useResource(loadRecent);
  const places = useResource(loadPlaces);
  return (
    <div className="grid gap-8">
      <Panel id="nettoyage-a-faire" title={t.todoTitle}>
        {todo.state.status === 'ready' ? (
          todo.state.data.length ? (
            <TodoList requests={todo.state.data} />
          ) : (
            <TodoNone>{t.todoNone}</TodoNone>
          )
        ) : (
          <TodoState
            loading={todo.state.status === 'loading'}
            error={todo.state.status === 'error' ? describeCleaningError(todo.state.error).message : null}
            loadingLabel={t.todoLoading}
            retryLabel="Réessayer"
            onRetry={todo.reload}
          />
        )}
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel
          id="nettoyage-demandes"
          title={t.recentRequests}
          action={
            <Link
              href={cleaningPaths.requests}
              className="text-action-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.allRequests}
            </Link>
          }
        >
          {recent.state.status === 'ready' ? (
            recent.state.data.data.length ? (
              <ul className="grid gap-3">
                {recent.state.data.data.map((request) => (
                  <RequestRow key={request.id} request={request} />
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted">{t.noRequest}</p>
            )
          ) : (
            <TodoState
              loading={recent.state.status === 'loading'}
              error={
                recent.state.status === 'error' ? describeCleaningError(recent.state.error).message : null
              }
              loadingLabel={t.todoLoading}
              retryLabel="Réessayer"
              onRetry={recent.reload}
            />
          )}
        </Panel>
        <Panel
          id="nettoyage-lieux"
          title={t.places}
          action={
            <Link
              href={cleaningPaths.places}
              className="text-action-ink inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.allPlaces}
            </Link>
          }
        >
          {places.state.status === 'ready' ? (
            places.state.data.data.length ? (
              <ul className="grid gap-3">
                {places.state.data.data.map((place) => (
                  <PlaceRow key={place.id} place={place} />
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted">{t.noPlace}</p>
            )
          ) : (
            <TodoState
              loading={places.state.status === 'loading'}
              error={
                places.state.status === 'error' ? describeCleaningError(places.state.error).message : null
              }
              loadingLabel={t.todoLoading}
              retryLabel="Réessayer"
              onRetry={places.reload}
            />
          )}
        </Panel>
      </div>

      <section
        aria-labelledby="nettoyage-bientot"
        className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-6"
      >
        <EmptyState compact illustration="soon" title={t.soonTitle} titleAs="h2" titleId="nettoyage-bientot">
          {t.soonText}
        </EmptyState>
      </section>
    </div>
  );
}
