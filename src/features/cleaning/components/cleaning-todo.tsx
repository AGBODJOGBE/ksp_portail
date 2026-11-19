'use client';

import type { ReactNode } from 'react';
import { ActionCardIcon } from '@/components/ui/action-card';
import { Badge } from '@/components/ui/badge';
import { IconAlert, IconCard, IconFileCheck, IconNettoyage } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { listMissions, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { ownedBy } from '@/features/cleaning/owned';
import { cleaningPaths } from '@/features/cleaning/paths';
import { paymentDue, paymentExpected } from '@/features/cleaning/payment-due';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import { spaceTexts } from '@/features/cleaning/space-texts';
import { cleaningTexts, suspendedStatus } from '@/features/cleaning/texts';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { contextKey, useSession } from '@/lib/api';
import { formatDateTime, formatShortDate, formatXof, isPast } from '@/lib/format';
import { useResource } from '@/lib/use-resource';

const t = cleaningTexts.dashboard;
const s = spaceTexts.todo;

/** Dernières demandes et missions (première page de chaque liste), lues ensemble. */
async function loadRecent(): Promise<{ requests: QuoteRequest[]; missions: Mission[] }> {
  const [requests, missions] = await Promise.all([listRequests(), listMissions()]);
  return { requests: requests.data, missions: missions.data };
}

type Data = { requests: QuoteRequest[]; missions: Mission[] };

/** Devis à accepter, regroupés comme ils ont été demandés (un groupe = une seule action). */
function quoteItems(requests: ReadonlyArray<QuoteRequest>) {
  const valid = requests.filter(
    (request) => request.status === 'quote_sent' && request.quote && !isPast(request.quote.validUntil),
  );
  const groups = new Map<string, QuoteRequest[]>();
  for (const request of valid) {
    const key = request.groupId && (request.groupSize ?? 1) > 1 ? request.groupId : request.id;
    groups.set(key, [...(groups.get(key) ?? []), request]);
  }
  return [...groups.entries()].map(([key, items]) => {
    const grouped = items[0]!.groupId === key;
    const earliest = items
      .map((request) => request.quote!.validUntil)
      .sort()
      .at(0)!;
    return {
      key,
      items,
      href: grouped ? cleaningPaths.group(key) : cleaningPaths.request(items[0]!.id),
      validUntil: earliest,
    };
  });
}

function useRecent(organizationId: string | null) {
  const resource = useResource(loadRecent);
  const keep = ownedBy(organizationId);
  const data: Data | null =
    resource.state.status === 'ready'
      ? {
          requests: resource.state.data.requests.filter(keep),
          missions: resource.state.data.missions.filter(keep),
        }
      : null;
  return { resource, data };
}

/**
 * Nettoyage dans la rubrique « À faire maintenant » de « Mon espace KSP » : seulement ce qui attend le
 * client, devis à accepter (un groupe = une action), paiements attendus avec leur montant, service
 * suspendu. Les rendez-vous (visite, prochain passage) et l'avancement vivent dans « Suivre ma demande ».
 * Tout vient des demandes et missions de la gateway, filtrées sur le contexte actif.
 */
export function CleaningTodo() {
  const key = contextKey(useSession());
  return <Todo key={key ?? 'none'} organizationId={key === 'personal' ? null : key} />;
}

function Todo({ organizationId }: { organizationId: string | null }) {
  const services = useServices();
  const { resource, data } = useRecent(organizationId);
  const name = (request: { serviceCode: string; serviceName?: string | null }) =>
    request.serviceName ?? serviceName(services, request.serviceCode);
  // Contenu du panneau et nombre d'actions qui attendent le client (pastille du titre).
  const body = (): { node: ReactNode; count?: number } => {
    if (!data) {
      return {
        node: (
          <TodoState
            loading={resource.state.status === 'loading'}
            error={
              resource.state.status === 'error' ? describeCleaningError(resource.state.error).message : null
            }
            loadingLabel={cleaningTexts.space.loading}
            retryLabel={cleaningTexts.common.retry}
            onRetry={resource.reload}
          />
        ),
      };
    }
    const quotes = quoteItems(data.requests);
    const payments = data.missions.filter((mission) => !mission.suspension && paymentExpected(mission));
    const suspended = data.missions.filter(
      (mission) => mission.suspension && suspendedStatus(mission.suspension).actor === 'client',
    );
    const actions = quotes.length + payments.length + suspended.length;
    if (!actions) return { node: <TodoNone>{t.nothing}</TodoNone> };
    return {
      count: actions,
      node: (
        <ul className="grid gap-3">
          {quotes.map((item) => (
            <TodoItem
              key={item.key}
              media={
                <ActionCardIcon>
                  <IconFileCheck />
                </ActionCardIcon>
              }
              title={item.items.length > 1 ? s.quoteGroup(item.items.length) : name(item.items[0]!)}
              badge={
                <Badge tone="accent" dot>
                  {t.quoteBadge}
                </Badge>
              }
              text={`${item.items.length > 1 ? `${item.items.map(name).join(', ')}. ` : ''}${s.quoteText(formatDateTime(item.validUntil))}`}
              action={{ href: item.href, label: s.quoteAction }}
            />
          ))}
          {payments.map((mission) => {
            const due = paymentDue(mission)!;
            return (
              <TodoItem
                key={mission.id}
                media={
                  <ActionCardIcon>
                    <IconCard />
                  </ActionCardIcon>
                }
                title={name(mission)}
                badge={
                  <Badge tone="warning" dot>
                    {s.payTitle}
                  </Badge>
                }
                text={s.payText(
                  due.amount ? formatXof(due.amount) : null,
                  mission.status === 'completed' ? s.payAfter : s.payBefore,
                )}
                action={{ href: `${cleaningPaths.mission(mission.id)}#paiement`, label: s.payAction }}
              />
            );
          })}
          {suspended.map((mission) => (
            <TodoItem
              key={mission.id}
              media={
                <ActionCardIcon>
                  <IconAlert />
                </ActionCardIcon>
              }
              title={name(mission)}
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
      ),
    };
  };

  const { node, count } = body();
  return (
    <TodoPanel
      id="todo-nettoyage"
      title={t.title}
      icon={<IconNettoyage className="size-5" />}
      link={{ href: cleaningPaths.space, label: t.seeAll }}
      count={count}
    >
      {node}
    </TodoPanel>
  );
}
