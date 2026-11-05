'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { cn } from '@/lib/cn';
import { formatXof } from '@/lib/format';
import { frenchSpacing } from '@/lib/typography';
import { estimatePlace } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { estimateInput, itemsOf, type JourneyDraft, placeOf, servicesOf } from '@/features/cleaning/journey';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import type { Estimate, PlaceCatalog } from '@/features/cleaning/schemas';

const t = journeyTexts.estimate;

/** Délai après la dernière saisie avant de demander l'estimation (une requête par pause, pas par touche). */
export const ESTIMATE_DELAY_MS = 450;

type Outcome = { key: string } & (
  { status: 'done'; estimate: Estimate } | { status: 'error'; message: string }
);

/**
 * Récapitulatif d'estimation du parcours, mis à jour en direct (`POST /cleaning/estimates`) : une
 * requête après chaque pause de saisie, la précédente annulée. Les montants viennent tels quels de la
 * gateway (fourchette par prestation, total) ; rien n'est calculé ici. La zone `aria-live` n'annonce
 * qu'un résultat arrivé, jamais la frappe.
 */
export function JourneyEstimate({
  catalog,
  draft,
  commune,
  className,
}: {
  catalog: PlaceCatalog;
  draft: JourneyDraft;
  /** Commune connue du lieu (étape de l'adresse franchie) ; sans elle, estimation indicative. */
  commune: string | null;
  className?: string;
}) {
  const input = useMemo(() => estimateInput(catalog, draft, commune), [catalog, draft, commune]);
  const incomplete = useMemo(() => new Set(itemsOf(catalog, draft).incomplete), [catalog, draft]);
  const key = input ? JSON.stringify(input) : '';
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [announce, setAnnounce] = useState('');
  const requested = `${attempt}:${key}`;

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      estimatePlace(JSON.parse(key) as NonNullable<typeof input>, controller.signal).then(
        (estimate) => {
          setOutcome({ key: requested, status: 'done', estimate });
          setAnnounce(t.announce(estimate.total !== null ? formatXof(estimate.total) : null));
        },
        (error: unknown) => {
          if ((error as Error).name === 'AbortError') return;
          setOutcome({ key: requested, status: 'error', message: describeCleaningError(error).message });
        },
      );
    }, ESTIMATE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, requested]);

  const selected = servicesOf(catalog, placeOf(catalog, draft.placeType)).filter((service) =>
    draft.services.includes(service.code),
  );
  const pending = !!key && outcome?.key !== requested;
  const estimate = key && outcome?.status === 'done' ? outcome.estimate : null;
  const failed = !pending && outcome?.status === 'error' ? outcome.message : null;

  return (
    <section
      aria-labelledby="estimation-titre"
      aria-busy={pending || undefined}
      className={cn('rounded-card border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-6', className)}
    >
      <Heading as="h3" size="h3" id="estimation-titre">
        {t.title}
      </Heading>

      {!selected.length || !key ? <p className="text-small text-ink-muted">{t.idle}</p> : null}

      {selected.length ? (
        <ul
          className={cn('divide-line grid divide-y transition-opacity', pending && estimate && 'opacity-60')}
        >
          {selected.map((service) => {
            const item = estimate?.items.find((entry) => entry.serviceCode === service.code);
            const range = item?.priced && item.estimate ? item.estimate : null;
            return (
              <li
                key={service.code}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <span className="text-ink min-w-0 font-medium">{service.name}</span>
                {incomplete.has(service.code) ? (
                  <Badge tone="warning">{t.toComplete}</Badge>
                ) : range ? (
                  <span className="text-ink font-semibold tabular-nums">
                    {formatXof(range.low)} – {formatXof(range.high)}
                  </span>
                ) : item ? (
                  <Badge>{t.unpriced}</Badge>
                ) : (
                  <span aria-hidden="true" className="bg-surface-sunken h-4 w-24 rounded-full" />
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {estimate && estimate.total !== null && estimate.status === 'priced' ? (
        <div className="rounded-control bg-surface-muted grid gap-1 p-4">
          <p className="text-small text-ink-muted">{t.total}</p>
          <p className="font-display text-ink text-3xl font-semibold tabular-nums">
            {formatXof(estimate.total)}
          </p>
          <p className="text-small text-ink-muted">{t.totalHint}</p>
        </div>
      ) : null}

      {estimate && estimate.status !== 'priced' ? (
        <p className="text-small text-ink-muted">{frenchSpacing(estimate.notice || t.partial)}</p>
      ) : null}

      {pending ? (
        <p role="status" className="text-small text-ink-muted">
          {t.updating}
        </p>
      ) : null}

      {failed ? (
        <div className="grid justify-items-start gap-2">
          <p className="text-small text-danger font-medium">{`${t.error} ${failed}`}</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            {journeyTexts.retry}
          </Button>
        </div>
      ) : null}

      <div className="text-small border-line grid gap-1 border-t pt-3">
        {estimate && !estimate.communeApplied ? (
          <p className="text-ink-muted">{frenchSpacing(t.indicative)}</p>
        ) : null}
        <p className="text-ink font-medium">{frenchSpacing(t.notContractual)}</p>
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}
