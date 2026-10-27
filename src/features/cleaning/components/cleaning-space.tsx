'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { PagedListState } from '@/components/ui/paged-list-state';
import { listMissions, listRequests } from '@/features/cleaning/api';
import { formatShortDate } from '@/lib/format';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import { cleaningTexts, missionStatuses, requestStatuses, statusOf } from '@/features/cleaning/texts';
import { usePagedList } from '@/lib/use-paged-list';
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
      <Badge tone={status.tone}>{status.label}</Badge>
    </li>
  );
}

function MissionRow({ mission, name }: { mission: Mission; name: string }) {
  const status = statusOf(missionStatuses, mission.status);
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

/** « Mes prestations de nettoyage » : demandes de devis et missions, chacune paginée par curseur. */
export function CleaningSpace() {
  const services = useServices();
  const requests = usePagedList(listRequests);
  const missions = usePagedList(listMissions);

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
          empty={<p className="text-ink-muted">{t.noRequests}</p>}
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
          empty={<p className="text-ink-muted">{t.noMissions}</p>}
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
