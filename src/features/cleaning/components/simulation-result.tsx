'use client';

import { useEffect, useState } from 'react';
import { Button, ButtonArrow, ButtonLink } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { FormMessage } from '@/components/ui/field';
import { IconArrowRight, IconClock } from '@/components/ui/icons';
import { contactHref } from '@/config/navigation';
import { frenchSpacing } from '@/lib/typography';
import { simulate } from '@/features/cleaning/api';
import { requestHref, type SimulationDraft } from '@/features/cleaning/draft';
import { describeCleaningError } from '@/features/cleaning/errors';
import { formatNumber, formatXof } from '@/lib/format';
import type { ServedZone, Simulation } from '@/features/cleaning/schemas';
import { cleaningTexts } from '@/features/cleaning/texts';
import { OTHER_COMMUNE, zonesSentence } from '@/features/cleaning/zones';

const t = cleaningTexts.simulator;

/** Réponse reçue, rattachée à la demande qui l'a produite (réponses + essai) : une autre demande = chargement. */
type Outcome = { for: string } & (
  { status: 'error'; message: string } | { status: 'done'; simulation: Simulation }
);

const PANEL = 'rounded-card border-line bg-surface-muted border p-5 sm:p-6';

function OutOfZone({ zones }: { zones: ReadonlyArray<ServedZone> }) {
  return (
    <div className={PANEL} role="status">
      <p className="font-display text-ink text-xl font-semibold">{t.outOfZoneTitle}</p>
      <p className="text-ink-muted mt-2">{frenchSpacing(t.outOfZoneText(zonesSentence(zones)))}</p>
      <ButtonLink href={contactHref('nettoyage-devis')} variant="secondary" className="mt-5">
        {t.contactUs}
      </ButtonLink>
    </div>
  );
}

/** Étape suivante de la démarche : la demande de devis, qui reprend la simulation. */
function RequestQuote({ draft }: { draft: SimulationDraft }) {
  return (
    <div className="rounded-control border-action-muted bg-action-soft mt-6 grid gap-3 border p-4 sm:p-5">
      <p className="text-ink font-semibold">{t.nextTitle}</p>
      <p className="text-small text-ink-muted inline-flex items-start gap-2">
        <IconClock className="text-action-ink mt-0.5 size-4 shrink-0" />
        {t.visitNotice}
      </p>
      <ButtonLink href={requestHref(draft)} size="lg" variant="action" className="sm:justify-self-start">
        {t.requestQuote}
        <ButtonArrow>
          <IconArrowRight />
        </ButtonArrow>
      </ButtonLink>
    </div>
  );
}

function Estimate({ simulation, draft }: { simulation: Simulation; draft: SimulationDraft }) {
  if (!simulation.priced || !simulation.estimate) {
    return (
      <div className={PANEL} role="status">
        <p className="font-display text-ink text-xl font-semibold">{t.unpricedTitle}</p>
        <p className="text-ink-muted mt-2">{frenchSpacing(simulation.notice || t.unpricedText)}</p>
        <RequestQuote draft={draft} />
      </div>
    );
  }
  const { low, high } = simulation.estimate;
  return (
    <div className="rounded-card border-line bg-surface border p-5 shadow-xs sm:p-6" role="status">
      <Eyebrow as="p">{t.estimateTitle}</Eyebrow>
      <p className="font-display text-ink mt-3 text-3xl font-semibold tabular-nums sm:text-4xl">
        {t.estimateRange(formatXof(low), formatXof(high))}
      </p>
      <p className="text-small text-ink-muted mt-1">{t.perVisit}</p>
      {simulation.breakdown.length ? (
        <details className="mt-4">
          <summary className="text-action-ink min-h-11 cursor-pointer content-center font-semibold">
            {t.breakdownTitle}
          </summary>
          <ul className="disclosure-body divide-line border-line mt-2 divide-y border-y">
            {simulation.breakdown.map((line) => (
              <li key={line.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
                <span className="text-ink">
                  {line.label}
                  <span className="text-small text-ink-muted">
                    {' '}
                    · {formatNumber(line.quantity)} × {formatXof(line.unitPrice)}
                  </span>
                </span>
                <span className="text-ink font-semibold tabular-nums">{formatXof(line.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <ul className="text-small text-ink-muted mt-4 grid gap-1">
        {simulation.minimumApplied ? <li>{t.minimumApplied}</li> : null}
        <li>{t.teamSize(simulation.recommendedTeamSize)}</li>
      </ul>
      <p className="text-small text-ink mt-4 font-medium">
        {frenchSpacing(simulation.notice || t.notContractual)}
      </p>
      <RequestQuote draft={draft} />
    </div>
  );
}

/** Écran final du simulateur : estimation demandée à la gateway pour les réponses données. */
export function SimulationResult({
  draft,
  zones,
}: {
  draft: SimulationDraft;
  zones: ReadonlyArray<ServedZone>;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const outOfZone = draft.commune === OTHER_COMMUNE;
  const key = JSON.stringify(draft);
  const current = `${attempt}:${key}`;

  useEffect(() => {
    if (outOfZone) return;
    const controller = new AbortController();
    const requested = `${attempt}:${key}`;
    simulate(JSON.parse(key) as SimulationDraft, controller.signal)
      .then((simulation) => setOutcome({ for: requested, status: 'done', simulation }))
      .catch((error: unknown) => {
        if ((error as Error).name === 'AbortError') return;
        setOutcome({ for: requested, status: 'error', message: describeCleaningError(error).message });
      });
    return () => controller.abort();
  }, [key, attempt, outOfZone]);

  if (outOfZone) return <OutOfZone zones={zones} />;
  const state = outcome?.for === current ? outcome : null;
  if (!state) {
    return (
      <p role="status" className="text-ink-muted">
        {t.computing}
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-4">
        <FormMessage>{`${t.errorTitle} : ${state.message}`}</FormMessage>
        <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
          {cleaningTexts.common.retry}
        </Button>
      </div>
    );
  }
  if (!state.simulation.covered) return <OutOfZone zones={zones} />;
  return <Estimate simulation={state.simulation} draft={draft} />;
}
