'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SignatureProgress } from '@/components/ui/brand/signature';
import { Button, ButtonArrow, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowRight, IconCheck } from '@/components/ui/icons';
import { RequireSession } from '@/features/identity';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { frenchSpacing } from '@/lib/typography';
import { getRequestGroup } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { PlaceCatalog, RequestGroup } from '@/features/cleaning/schemas';
import { GroupRequests, placeLabel, usePlaceCatalog } from './request-group';

const t = journeyTexts.done;

/** Confirmation : numéro du groupe, prestations, prochaines étapes dans l'ordre, lien vers le suivi. */
function Confirmation({ group, catalog }: { group: RequestGroup; catalog: PlaceCatalog | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // La confirmation remplace le parcours : elle reçoit le focus (et vient à l'écran).
  useEffect(() => ref.current?.focus(), []);
  const steps = journeyTexts.steps.map((label) => ({ label }));
  return (
    <div className="grid gap-8">
      <SignatureProgress steps={steps} current={steps.length} label={journeyTexts.progressLabel} />
      <div
        ref={ref}
        tabIndex={-1}
        role="status"
        className="rounded-card border-action-muted bg-surface swap-in grid gap-6 border p-6 shadow-xs focus-visible:outline-none sm:p-8"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="bg-action text-on-action grid size-12 shrink-0 place-items-center rounded-full"
          >
            <IconCheck className="size-6" />
          </span>
          <div className="grid gap-2">
            <h2 className="font-display text-ink text-h2 font-semibold">{t.title}</h2>
            <p className="text-ink-muted">{frenchSpacing(t.text)}</p>
          </div>
        </div>
        <dl className="rounded-control bg-surface-muted grid gap-4 p-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <dt className="text-small text-ink-muted">{t.number}</dt>
            <dd className="text-ink font-mono text-sm font-semibold break-all">{group.groupId}</dd>
          </div>
          <div>
            <dt className="text-small text-ink-muted">{t.received}</dt>
            <dd className="text-ink font-semibold">{formatDateTime(group.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-small text-ink-muted">{t.commune}</dt>
            <dd className="text-ink font-semibold">
              {placeLabel(catalog, group.placeType)} · {group.commune}
            </dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="demande-prestations-titre" className="grid gap-3">
        <Heading as="h2" size="h3" id="demande-prestations-titre">
          {t.servicesTitle}
        </Heading>
        <GroupRequests group={group} catalog={catalog} />
      </section>

      <section aria-labelledby="demande-suite-titre" className="grid gap-4">
        <Heading as="h2" size="h3" id="demande-suite-titre">
          {t.nextTitle}
        </Heading>
        <ol className="grid gap-0">
          {t.next.map((step, index) => (
            <li
              key={step.title}
              className="before:bg-line-strong relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-5 before:absolute before:top-10 before:bottom-1 before:left-[1.0625rem] before:w-0.5 last:pb-0 last:before:hidden"
            >
              <span
                aria-hidden="true"
                className={
                  index === 0
                    ? 'bg-action text-on-action grid size-9 place-items-center rounded-full text-sm font-semibold'
                    : 'bg-surface text-ink ring-line-strong grid size-9 place-items-center rounded-full text-sm font-semibold ring-1'
                }
              >
                {index + 1}
              </span>
              <div className="pt-1.5">
                <p className="text-ink font-semibold">{step.title}</p>
                <p className="text-small text-ink-muted mt-1">{frenchSpacing(step.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ButtonLink href={cleaningPaths.group(group.groupId)} variant="action" size="lg">
          {t.follow}
          <ButtonArrow>
            <IconArrowRight />
          </ButtonArrow>
        </ButtonLink>
        <ButtonLink href={cleaningPaths.space} variant="secondary" size="lg">
          {t.space}
        </ButtonLink>
        <ButtonLink href={cleaningPaths.journey} variant="ghost" size="lg">
          {t.another}
        </ButtonLink>
      </div>
    </div>
  );
}

/** Confirmation relue après un rafraîchissement : la demande appartient au client connecté. */
function SentFromServer({ id, catalog }: { id: string; catalog: PlaceCatalog | null }) {
  const group = useResource(useCallback(() => getRequestGroup(id), [id]));
  if (group.state.status === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {t.loading}
      </p>
    );
  }
  if (group.state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-4">
        <FormMessage>{describeCleaningError(group.state.error).message}</FormMessage>
        <Button variant="secondary" onClick={group.reload}>
          {journeyTexts.retry}
        </Button>
      </div>
    );
  }
  return <Confirmation group={group.state.data} catalog={catalog} />;
}

/** Étape finale du parcours : la demande envoyée (reçue de l'envoi, ou relue par son numéro). */
export function JourneySent({
  id,
  group,
  catalog: initialCatalog,
}: {
  id: string;
  group: RequestGroup | null;
  catalog: PlaceCatalog | null;
}) {
  const catalog = usePlaceCatalog(initialCatalog);
  if (group) return <Confirmation group={group} catalog={catalog} />;
  return (
    <RequireSession>
      <SentFromServer id={id} catalog={catalog} />
    </RequireSession>
  );
}
