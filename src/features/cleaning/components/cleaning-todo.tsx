'use client';

import { Badge } from '@/components/ui/badge';
import { IconNettoyage } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { listMissions, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { ownedBy } from '@/features/cleaning/owned';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import { cleaningTexts, suspendedStatus } from '@/features/cleaning/texts';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { contextKey, useSession } from '@/lib/api';
import { formatDateTime, formatShortDate, isPast } from '@/lib/format';
import { useResource } from '@/lib/use-resource';

const t = cleaningTexts.dashboard;
const OPEN_REQUESTS = new Set(['received', 'visit_scheduled']);
const ACTIVE_MISSIONS = new Set(['to_schedule', 'scheduled', 'in_progress', 'on_hold']);

/** Dernières demandes et missions (première page de chaque liste), lues ensemble. */
async function loadRecent(): Promise<{ requests: QuoteRequest[]; missions: Mission[] }> {
  const [requests, missions] = await Promise.all([listRequests(), listMissions()]);
  return { requests: requests.data, missions: missions.data };
}

/**
 * Nettoyage dans le tableau de bord de « Mon espace KSP » : d'abord ce qui attend le client (devis à
 * étudier avant leur date de validité, service suspendu pour impayés), puis ce que KSP a en cours.
 * Lit la première page des demandes et des missions, filtrée sur le contexte actif.
 */
export function CleaningTodo() {
  const key = contextKey(useSession());
  return <Todo key={key ?? 'none'} organizationId={key === 'personal' ? null : key} />;
}

function Todo({ organizationId }: { organizationId: string | null }) {
  const services = useServices();
  const { state, reload } = useResource(loadRecent);
  const keep = ownedBy(organizationId);

  const body = () => {
    if (state.status !== 'ready') {
      return (
        <TodoState
          loading={state.status === 'loading'}
          error={state.status === 'error' ? describeCleaningError(state.error).message : null}
          loadingLabel={cleaningTexts.space.loading}
          retryLabel={cleaningTexts.common.retry}
          onRetry={reload}
        />
      );
    }
    const requests = state.data.requests.filter(keep);
    const missions = state.data.missions.filter(keep);
    const quotes = requests.filter(
      (request) => request.status === 'quote_sent' && request.quote && !isPast(request.quote.validUntil),
    );
    const suspended = missions.filter(
      (mission) => mission.suspension && suspendedStatus(mission.suspension).actor === 'client',
    );
    const waiting = requests.filter((request) => OPEN_REQUESTS.has(request.status)).length;
    const active = missions.filter(
      (mission) => ACTIVE_MISSIONS.has(mission.status) && !mission.suspension,
    ).length;

    return (
      <>
        {quotes.length || suspended.length ? (
          <ul className="grid gap-3">
            {quotes.map((request) => (
              <TodoItem
                key={request.id}
                title={serviceName(services, request.serviceCode)}
                badge={
                  <Badge tone="accent" dot>
                    {t.quoteBadge}
                  </Badge>
                }
                text={t.quoteText(formatDateTime(request.quote!.validUntil))}
                action={{ href: cleaningPaths.request(request.id), label: t.quoteAction }}
              />
            ))}
            {suspended.map((mission) => (
              <TodoItem
                key={mission.id}
                title={serviceName(services, mission.serviceCode)}
                badge={
                  <Badge tone="danger" dot>
                    {suspendedStatus(mission.suspension!).label}
                  </Badge>
                }
                text={t.suspendedText(formatShortDate(mission.suspension!.since))}
                action={{ href: cleaningPaths.mission(mission.id), label: t.suspendedAction }}
              />
            ))}
          </ul>
        ) : (
          <TodoNone>{t.nothing}</TodoNone>
        )}
        <p className="text-small text-ink-muted border-line border-t pt-3">{t.summary(waiting, active)}</p>
      </>
    );
  };

  return (
    <TodoPanel
      id="todo-nettoyage"
      title={t.title}
      icon={<IconNettoyage className="size-5" />}
      link={{ href: cleaningPaths.space, label: t.seeAll }}
    >
      {body()}
    </TodoPanel>
  );
}
