'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowRight } from '@/components/ui/icons';
import { formatDateTime, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { frenchSpacing } from '@/lib/typography';
import { getPlaceCatalog, getRequestGroup } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { PlaceCatalog, RequestGroup } from '@/features/cleaning/schemas';
import { requestStatuses, statusOf } from '@/features/cleaning/texts';
import { BackLink } from './detail-parts';

const t = journeyTexts.group;

/** Catalogue par lieu pour nommer un lieu et ses prestations ; une panne n'empêche rien (codes affichés). */
export function usePlaceCatalog(initial: PlaceCatalog | null = null): PlaceCatalog | null {
  const [catalog, setCatalog] = useState<PlaceCatalog | null>(initial);
  useEffect(() => {
    if (initial) return;
    let active = true;
    getPlaceCatalog()
      .then((value) => active && setCatalog(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initial]);
  return catalog;
}

const serviceLabel = (catalog: PlaceCatalog | null, code: string) =>
  catalog?.services.find((service) => service.code === code)?.name ?? code;

export const placeLabel = (catalog: PlaceCatalog | null, code: string) =>
  catalog?.placeTypes.find((place) => place.code === code)?.label ?? code;

/** Demandes d'un groupe (une par prestation), avec leur état et le lien vers chacune. */
export function GroupRequests({ group, catalog }: { group: RequestGroup; catalog: PlaceCatalog | null }) {
  return (
    <ul className="divide-line border-line divide-y border-y">
      {group.items.map((request) => {
        const status = statusOf(requestStatuses, request.status);
        return (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <div className="grid min-w-0 gap-1">
              <p className="text-ink font-semibold">{serviceLabel(catalog, request.serviceCode)}</p>
              <Badge tone={status.tone} dot className="justify-self-start">
                {status.label}
              </Badge>
            </div>
            <Link
              href={cleaningPaths.request(request.id)}
              className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.seeRequest}
              <span className="sr-only"> : {serviceLabel(catalog, request.serviceCode)}</span>
              <IconArrowRight className="size-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Suivi d'une demande groupée (`GET /cleaning/quote-request-groups/{id}`), adresse citée par les
 * messages regroupés (ADR-035). Lecture seule ici : l'acceptation et l'annulation du groupe viendront
 * avec « Mon espace » (lot 2).
 */
export function RequestGroupDetail({ id }: { id: string }) {
  const catalog = usePlaceCatalog();
  const group = useResource(useCallback(() => getRequestGroup(id), [id]));

  if (group.state.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {journeyTexts.done.loading}
      </p>
    );
  }
  if (group.state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-4">
        <BackLink />
        <FormMessage>{describeCleaningError(group.state.error).message}</FormMessage>
        <Button variant="secondary" onClick={group.reload}>
          {journeyTexts.retry}
        </Button>
      </div>
    );
  }
  const data = group.state.data;
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <BackLink />
        <Heading as="h1" size="h1">
          {t.title}
        </Heading>
        <p className="text-lead text-ink-muted">
          {t.placeAndCommune(placeLabel(catalog, data.placeType), data.commune)} ·{' '}
          {t.sentOn(formatDateTime(data.createdAt))}
        </p>
        <p className="text-small text-ink-muted">{frenchSpacing(t.lead)}</p>
      </div>
      <GroupRequests group={data} catalog={catalog} />
      {data.quotesTotal || data.remainingDue ? (
        <dl className="rounded-card bg-surface-muted grid gap-3 p-5 sm:grid-cols-2">
          {data.quotesTotal ? (
            <div>
              <dt className="text-small text-ink-muted">{t.quotesTotal}</dt>
              <dd className="text-ink text-xl font-semibold tabular-nums">{formatXof(data.quotesTotal)}</dd>
            </div>
          ) : null}
          {data.remainingDue ? (
            <div>
              <dt className="text-small text-ink-muted">{t.remainingDue}</dt>
              <dd className="text-ink text-xl font-semibold tabular-nums">{formatXof(data.remainingDue)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="text-small text-ink-muted">
        {t.reference} : <span className="font-mono break-all">{data.groupId}</span>
      </p>
    </div>
  );
}
