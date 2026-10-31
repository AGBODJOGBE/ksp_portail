'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { SignatureArrow, SignatureProgress } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { IconArrowRight } from '@/components/ui/icons';
import { PagedListState } from '@/components/ui/paged-list-state';
import { listMissions, listRequests, PAGE_SIZE } from '@/features/cleaning/api';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatShortDate } from '@/lib/format';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { Mission, QuoteRequest } from '@/features/cleaning/schemas';
import {
  cleaningTexts,
  missionStatuses,
  requestJourney,
  requestStage,
  requestStatuses,
  statusOf,
  suspendedStatus,
} from '@/features/cleaning/texts';
import { useFilteredList, usePagedList } from '@/lib/use-paged-list';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { type Owned, ownedBy } from '@/features/cleaning/owned';
import { ActorBadge } from './detail-parts';

const t = cleaningTexts.space;
const labels = { ...cleaningTexts.common, loading: t.loading };

const ROW = cn(
  'group/row rounded-card border-line bg-surface relative grid gap-4 border p-4 shadow-xs sm:p-5',
  'md:grid-cols-[minmax(0,1fr)_14rem] md:items-center',
  'hover:border-line-strong transition-colors duration-(--motion-base)',
  'has-[.stretched-link:focus-visible]:outline-focus has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2',
);
/** Ligne qui attend le client : liseré vert à gauche. */
const YOURS = 'border-l-action border-l-4';
const LINK =
  'stretched-link font-display text-ink text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none';

function RowTitle({ href, children }: { href: string; children: string }) {
  return (
    <p className="mt-2 flex items-center gap-2">
      <Link href={href} className={LINK}>
        {children}
      </Link>
      <IconArrowRight
        aria-hidden="true"
        className="text-ink-subtle ease-soft size-4 transition-transform duration-(--motion-base) group-hover/row:translate-x-1"
      />
    </p>
  );
}

function RequestRow({ request, name }: { request: QuoteRequest; name: string }) {
  const status = statusOf(requestStatuses, request.status);
  const stage = requestStage(request);
  const yours = status.actor === 'client';
  return (
    <li className={cn(ROW, yours && YOURS)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {request.customerKind === 'business' ? <Badge>{cleaningTexts.context.businessTag}</Badge> : null}
          {status.actor ? <ActorBadge actor={status.actor} /> : null}
        </div>
        <RowTitle href={cleaningPaths.request(request.id)}>{name}</RowTitle>
        <p className="text-small text-ink-muted mt-1">
          {request.commune} · {t.requestedOn(formatShortDate(request.createdAt))}
        </p>
      </div>
      {/* Avancement en un coup d'œil ; l'état est déjà dit par l'étiquette (masqué aux lecteurs d'écran). */}
      <div aria-hidden="true">
        <SignatureProgress
          steps={requestJourney}
          current={stage.current}
          stopped={stage.stopped}
          label={cleaningTexts.journey.requestProgress}
          showLabels={false}
        />
        <p className="text-ink-subtle mt-1 text-xs">
          {stage.current >= requestJourney.length
            ? requestJourney[requestJourney.length - 1]!.label
            : requestJourney[stage.current]!.label}
        </p>
      </div>
    </li>
  );
}

function MissionRow({ mission, name }: { mission: Mission; name: string }) {
  const status = mission.suspension
    ? suspendedStatus(mission.suspension)
    : statusOf(missionStatuses, mission.status);
  const ratio =
    mission.plannedInterventions > 0
      ? Math.min(1, mission.completedInterventions / mission.plannedInterventions)
      : 0;
  return (
    <li className={cn(ROW, status.actor === 'client' && YOURS)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {mission.customerKind === 'business' ? <Badge>{cleaningTexts.context.businessTag}</Badge> : null}
          {status.actor === 'client' ? <ActorBadge actor="client" /> : null}
        </div>
        <RowTitle href={cleaningPaths.mission(mission.id)}>{name}</RowTitle>
        <p className="text-small text-ink-muted mt-1">
          {mission.commune} · {t.firstVisit(formatShortDate(mission.chosenSlot.start))}
        </p>
      </div>
      <div>
        <p className="text-small text-ink font-semibold tabular-nums">
          {cleaningTexts.missionDetail.progress(mission.completedInterventions, mission.plannedInterventions)}
        </p>
        <div aria-hidden="true" className="bg-signature-track mt-2 flex h-1.5 items-center rounded-full">
          <span className="bg-signature-1 h-full rounded-l-full" style={{ width: `${ratio * 100}%` }} />
          {ratio < 1 ? <SignatureArrow className="-ml-px h-3 w-2.5" /> : null}
        </div>
      </div>
    </li>
  );
}

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
  const keep = useCallback((item: Owned) => ownedBy(organizationId)(item), [organizationId]);
  const requests = useFilteredList(usePagedList(listRequests), keep, PAGE_SIZE);
  const missions = useFilteredList(usePagedList(listMissions), keep, PAGE_SIZE);

  return (
    <div className="grid gap-12">
      <section aria-labelledby="demandes-titre" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Heading as="h2" size="h3" id="demandes-titre">
              {t.requestsTitle}
            </Heading>
            <p className="text-small text-ink-muted mt-1">{t.requestsLead}</p>
          </div>
          <ButtonLink href={cleaningPaths.simulator} variant="action">
            {t.newRequest}
          </ButtonLink>
        </div>
        <PagedListState
          list={requests}
          labels={labels}
          empty={
            <EmptyState text={organizationId ? t.noRequestsBusiness : t.noRequests} hint={t.noRequestsHint} />
          }
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
        <div>
          <Heading as="h2" size="h3" id="missions-titre">
            {t.missionsTitle}
          </Heading>
          <p className="text-small text-ink-muted mt-1">{t.missionsLead}</p>
        </div>
        <PagedListState
          list={missions}
          labels={labels}
          empty={<EmptyState text={organizationId ? t.noMissionsBusiness : t.noMissions} />}
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

function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="rounded-card border-line-strong grid justify-items-start gap-2 border border-dashed p-6">
      <p className="text-ink font-medium">{text}</p>
      {hint ? <p className="text-small text-ink-muted">{hint}</p> : null}
    </div>
  );
}
