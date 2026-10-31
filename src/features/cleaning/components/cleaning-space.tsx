'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { PagedListState } from '@/components/ui/paged-list-state';
import { listMissions, listRequests, PAGE_SIZE } from '@/features/cleaning/api';
import { contextKey, useSession } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import {
  cleaningTexts,
  missionStatuses,
  requestStatuses,
  statusOf,
  suspendedStatus,
} from '@/features/cleaning/texts';
import { useFilteredList, usePagedList } from '@/lib/use-paged-list';
import { serviceName, useServices } from '@/features/cleaning/use-services';

const t = cleaningTexts.space;
const labels = { ...cleaningTexts.common, loading: t.loading };

const ROW =
  'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 gap-2 border p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5';
const LINK =
  'stretched-link text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none';

function RequestRow({ request, name }: { request: QuoteRequest; name: string }) {
  const status = statusOf(requestStatuses, request.status);
  return (
    <li className={ROW}>
      <div>
        <Link href={cleaningPaths.request(request.id)} className={LINK}>
          {name}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {request.commune} · {t.requestedOn(formatShortDate(request.createdAt))}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {request.customerKind === 'business' ? <Badge>{cleaningTexts.context.businessTag}</Badge> : null}
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </li>
  );
}

function MissionRow({ mission, name }: { mission: Mission; name: string }) {
  const status = mission.suspension
    ? suspendedStatus(mission.suspension)
    : statusOf(missionStatuses, mission.status);
  return (
    <li className={ROW}>
      <div>
        <Link href={cleaningPaths.mission(mission.id)} className={LINK}>
          {name}
        </Link>
        <p className="text-small text-ink-muted mt-1">
          {mission.commune} · {t.firstVisit(formatShortDate(mission.chosenSlot.start))}
        </p>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </li>
  );
}

/** Ce qui appartient au contexte : une organisation (`organizationId`), ou le compte personnel (aucune). */
type Owned = { organizationId: string | null };

/**
 * « Mes prestations de nettoyage » : demandes de devis et missions du contexte actif, chacune paginée par
 * curseur. Un changement de contexte relit les deux listes depuis la première page (clé).
 */
export function CleaningSpace() {
  const key = contextKey(useSession());
  return <CleaningLists key={key ?? 'none'} organizationId={key === 'personal' ? null : key} />;
}

/**
 * La gateway renvoie toutes les demandes et missions du client, personnelles comme d'entreprise : on
 * garde celles du contexte actif (**à valider** : filtrage à porter par le service cleaning).
 */
function CleaningLists({ organizationId }: { organizationId: string | null }) {
  const services = useServices();
  const keep = useCallback((item: Owned) => item.organizationId === organizationId, [organizationId]);
  const requests = useFilteredList(usePagedList(listRequests), keep, PAGE_SIZE);
  const missions = useFilteredList(usePagedList(listMissions), keep, PAGE_SIZE);

  return (
    <div className="grid gap-12">
      <section aria-labelledby="demandes-titre" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading as="h2" size="h3" id="demandes-titre">
            {t.requestsTitle}
          </Heading>
          <ButtonLink href={cleaningPaths.simulator} variant="secondary">
            {t.newRequest}
          </ButtonLink>
        </div>
        <PagedListState
          list={requests}
          labels={labels}
          empty={<p className="text-ink-muted">{organizationId ? t.noRequestsBusiness : t.noRequests}</p>}
        >
          <ul className="grid gap-3">
            {requests.items.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                name={serviceName(services, request.serviceCode)}
              />
            ))}
          </ul>
        </PagedListState>
      </section>

      <section aria-labelledby="missions-titre" className="grid gap-4">
        <Heading as="h2" size="h3" id="missions-titre">
          {t.missionsTitle}
        </Heading>
        <PagedListState
          list={missions}
          labels={labels}
          empty={<p className="text-ink-muted">{organizationId ? t.noMissionsBusiness : t.noMissions}</p>}
        >
          <ul className="grid gap-3">
            {missions.items.map((mission) => (
              <MissionRow
                key={mission.id}
                mission={mission}
                name={serviceName(services, mission.serviceCode)}
              />
            ))}
          </ul>
        </PagedListState>
      </section>
    </div>
  );
}
