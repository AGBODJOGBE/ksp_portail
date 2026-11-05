'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { IconArrowRight, IconNettoyage } from '@/components/ui/icons';
import { TodoItem, TodoNone, TodoPanel, TodoState } from '@/components/ui/todo-panel';
import { listMissions, listRequests } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { ownedBy } from '@/features/cleaning/owned';
import { cleaningPaths } from '@/features/cleaning/paths';
import { paymentDue, paymentExpected } from '@/features/cleaning/payment-due';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import { spaceTexts } from '@/features/cleaning/space-texts';
import {
  cleaningTexts,
  missionStatuses,
  requestStatuses,
  statusOf,
  suspendedStatus,
} from '@/features/cleaning/texts';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { contextKey, useSession } from '@/lib/api';
import { formatDateTime, formatShortDate, formatXof, isPast } from '@/lib/format';
import { useResource } from '@/lib/use-resource';

const t = cleaningTexts.dashboard;
const s = spaceTexts.todo;
const OPEN_REQUESTS = new Set(['received', 'visit_scheduled', 'quote_sent']);
const ACTIVE_MISSIONS = new Set(['to_schedule', 'scheduled', 'in_progress', 'on_hold']);

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

/** Prochain passage planifié d'une mission, s'il y en a un à venir. */
function nextPassage(mission: Mission) {
  return mission.interventions
    .filter((item) => item.status === 'planned' && !isPast(item.scheduledStart))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))[0];
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
 * Nettoyage dans la rubrique « À faire » de « Mon espace KSP » : devis à accepter (un groupe = une
 * action), paiements attendus avec leur montant, service suspendu, visite et prochain passage prévus.
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

  const body = () => {
    if (!data) {
      return (
        <TodoState
          loading={resource.state.status === 'loading'}
          error={
            resource.state.status === 'error' ? describeCleaningError(resource.state.error).message : null
          }
          loadingLabel={cleaningTexts.space.loading}
          retryLabel={cleaningTexts.common.retry}
          onRetry={resource.reload}
        />
      );
    }
    const quotes = quoteItems(data.requests);
    const payments = data.missions.filter((mission) => !mission.suspension && paymentExpected(mission));
    const suspended = data.missions.filter(
      (mission) => mission.suspension && suspendedStatus(mission.suspension).actor === 'client',
    );
    const visits = data.requests.filter(
      (request) =>
        request.visit?.status === 'scheduled' &&
        OPEN_REQUESTS.has(request.status) &&
        !isPast(request.visit.scheduledAt),
    );
    // Une visite commune à un groupe n'est annoncée qu'une fois.
    const visitSeen = new Set<string>();
    const uniqueVisits = visits.filter((request) => {
      const key = `${request.groupId ?? request.id}:${request.visit!.scheduledAt}`;
      if (visitSeen.has(key)) return false;
      visitSeen.add(key);
      return true;
    });
    const passages = data.missions
      .filter((mission) => ACTIVE_MISSIONS.has(mission.status) && !mission.suspension)
      .map((mission) => ({ mission, next: nextPassage(mission) }))
      .filter((item) => item.next);

    if (!quotes.length && !payments.length && !suspended.length && !uniqueVisits.length && !passages.length) {
      return <TodoNone>{t.nothing}</TodoNone>;
    }
    return (
      <ul className="grid gap-3">
        {quotes.map((item) => (
          <TodoItem
            key={item.key}
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
        {uniqueVisits.map((request) => (
          <TodoItem
            key={`visite-${request.id}`}
            title={s.visitTitle}
            text={s.visitText(formatDateTime(request.visit!.scheduledAt))}
            action={{
              href:
                request.groupId && (request.groupSize ?? 1) > 1
                  ? cleaningPaths.group(request.groupId)
                  : cleaningPaths.request(request.id),
              label: s.seeAction,
            }}
          />
        ))}
        {passages.map(({ mission, next }) => (
          <TodoItem
            key={`passage-${mission.id}`}
            title={`${s.passageTitle} · ${name(mission)}`}
            text={s.passageText(formatDateTime(next!.scheduledStart))}
            action={{ href: cleaningPaths.mission(mission.id), label: s.seeAction }}
          />
        ))}
      </ul>
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

/**
 * « Prestations en cours » du tableau de bord : demandes ouvertes et missions actives, avec leur état
 * et le lien vers leur suivi (un groupe n'apparaît qu'une fois).
 */
export function CleaningOngoing() {
  const key = contextKey(useSession());
  return <Ongoing key={key ?? 'none'} organizationId={key === 'personal' ? null : key} />;
}

function Ongoing({ organizationId }: { organizationId: string | null }) {
  const services = useServices();
  const { resource, data } = useRecent(organizationId);
  if (!data) {
    return (
      <TodoState
        loading={resource.state.status === 'loading'}
        error={resource.state.status === 'error' ? describeCleaningError(resource.state.error).message : null}
        loadingLabel={cleaningTexts.space.loading}
        retryLabel={cleaningTexts.common.retry}
        onRetry={resource.reload}
      />
    );
  }
  const seen = new Set<string>();
  const requests = data.requests
    .filter((request) => OPEN_REQUESTS.has(request.status))
    .filter((request) => {
      const key = request.groupId ?? request.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const missions = data.missions.filter((mission) => ACTIVE_MISSIONS.has(mission.status));
  const rows = [
    ...requests.map((request) => {
      const grouped = !!request.groupId && (request.groupSize ?? 1) > 1;
      const status = statusOf(requestStatuses, request.status);
      return {
        key: request.id,
        title: grouped
          ? `${request.placeTypeLabel ?? cleaningTexts.space.requestsTitle} · ${request.groupSize} prestations`
          : (request.serviceName ?? serviceName(services, request.serviceCode)),
        meta: cleaningTexts.space.requestedOn(formatShortDate(request.createdAt)),
        status,
        href: grouped ? cleaningPaths.group(request.groupId!) : cleaningPaths.request(request.id),
      };
    }),
    ...missions.map((mission) => ({
      key: mission.id,
      title: serviceName(services, mission.serviceCode),
      meta: mission.commune,
      status: mission.suspension
        ? suspendedStatus(mission.suspension)
        : statusOf(missionStatuses, mission.status),
      href: cleaningPaths.mission(mission.id),
    })),
  ];
  if (!rows.length) return <p className="text-ink-muted">{s.ongoingNone}</p>;
  return (
    <ul className="divide-line border-line divide-y border-y">
      {rows.map((row) => (
        <li
          key={row.key}
          className="has-[.stretched-link:focus-visible]:outline-focus relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2"
        >
          <div className="grid min-w-0 gap-1">
            <Link
              href={row.href}
              className="stretched-link text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
            >
              {row.title}
            </Link>
            <p className="text-small text-ink-muted">{row.meta}</p>
          </div>
          <span className="flex items-center gap-2">
            <Badge tone={row.status.tone} dot>
              {row.status.label}
            </Badge>
            <IconArrowRight aria-hidden="true" className="text-ink-subtle size-4" />
          </span>
        </li>
      ))}
    </ul>
  );
}
