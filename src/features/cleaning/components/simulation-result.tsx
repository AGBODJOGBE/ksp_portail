'use client';

import type { ReactNode } from 'react';
import { FormMessage } from '@/components/ui/field';
import { IconInfo } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { formatDuration, formatXof } from '@/lib/format';
import type { Pricing, Simulation } from '@/features/cleaning/schemas';
import {
  ON_QUOTE_REASONS,
  SIMULATION_NOTICES,
  simulatorTexts as t,
} from '@/features/cleaning/simulator-texts';
import type { LiveState } from './use-public';

/**
 * Résultat d'une simulation, tel que calculé par la gateway : fourchette et prix d'une séance, nombre de
 * séances et total, frais de visite, équipe et durée ; détail ligne par ligne replié ; mentions
 * (`notices`). Un prix partiel n'est jamais présenté comme le prix d'une séance (R-PX-08).
 */
export function SimulationResult({
  state,
  waiting,
  footer,
}: {
  state: LiveState<Simulation>;
  waiting?: string;
  footer?: ReactNode;
}) {
  const data = state.status === 'ready' ? state.data : state.status === 'idle' ? null : state.last;
  return (
    <section
      aria-labelledby="estimation-titre"
      aria-busy={state.status === 'loading'}
      className="rounded-panel border-line bg-surface shadow-card border p-5 sm:p-6"
    >
      <h2 id="estimation-titre" className="font-display text-h3 text-ink font-semibold">
        {t.resultTitle}
      </h2>
      <div aria-live="polite" className="mt-4 grid gap-4">
        {state.status === 'idle' ? <p className="text-ink-muted">{waiting ?? t.resultWaiting}</p> : null}
        {state.status === 'loading' && !data ? (
          <p role="status" className="text-ink-muted">
            {t.resultLoading}
          </p>
        ) : null}
        {state.status === 'error' ? (
          <FormMessage>
            {state.error.kind === 'rateLimited'
              ? t.rateLimited(state.error.retryAfterSeconds)
              : `${t.resultError} ${state.error.message}`}
          </FormMessage>
        ) : null}
        {data ? (
          <div className={cn('grid gap-4', state.status === 'loading' && 'opacity-60 transition-opacity')}>
            <PricingFigures pricing={data.pricing} />
            {data.notices.length ? (
              <ul className="grid gap-2">
                {data.notices.map((notice) =>
                  SIMULATION_NOTICES[notice] ? (
                    <li key={notice} className="text-small text-ink flex gap-2">
                      <IconInfo className="text-brand-ink mt-0.5 size-4 shrink-0" />
                      {SIMULATION_NOTICES[notice]}
                    </li>
                  ) : null,
                )}
              </ul>
            ) : null}
            <PricingDetails pricing={data.pricing} />
            <p className="text-small text-ink-muted">{data.disclaimer}</p>
          </div>
        ) : null}
        {footer}
      </div>
    </section>
  );
}

/** Chiffres principaux d'un calcul : prix d'une séance ou « à partir de », total, frais, équipe. */
export function PricingFigures({ pricing }: { pricing: Pricing }) {
  const range = pricing.range;
  return (
    <div className="grid gap-4">
      {pricing.status === 'priced' && pricing.sessionPrice ? (
        <div>
          <p className="text-small text-ink-muted">{t.sessionPrice}</p>
          {range?.low && range.high ? (
            <p className="font-display text-figure-sm text-ink mt-1 font-semibold tabular-nums sm:text-[1.625rem] sm:leading-tight">
              {t.range(formatXof(range.low), formatXof(range.high))}
            </p>
          ) : null}
          <p
            className={cn(
              'text-ink tabular-nums',
              range ? 'text-small mt-1' : 'font-display text-figure font-semibold',
            )}
          >
            {range ? `Estimation : ${formatXof(pricing.sessionPrice)}` : formatXof(pricing.sessionPrice)}
          </p>
        </div>
      ) : pricing.status === 'partially_priced' && pricing.pricedSubtotal ? (
        <div>
          <p className="text-small text-ink-muted">{t.from}</p>
          <p className="font-display text-figure text-ink font-semibold tabular-nums">
            {formatXof(pricing.pricedSubtotal)}
          </p>
          <p className="text-small text-ink-muted mt-1">{t.fromNote}</p>
        </div>
      ) : (
        <div>
          <p className="font-display text-figure text-ink font-semibold">{t.onQuote}</p>
          <p className="text-small text-ink-muted mt-1">{t.onQuoteText}</p>
        </div>
      )}

      <dl className="border-line grid gap-0 border-t">
        {pricing.sessionsCount !== null ? (
          <Row label={t.sessionsCount(pricing.sessionsCount)}>
            {pricing.programTotal ? formatXof(pricing.programTotal) : '—'}
          </Row>
        ) : null}
        {pricing.programRange?.low && pricing.programRange.high ? (
          <Row label={t.programTotal}>
            {t.range(formatXof(pricing.programRange.low), formatXof(pricing.programRange.high))}
          </Row>
        ) : null}
        {pricing.frequencyDiscount && pricing.frequencyDiscount.amount > 0 ? (
          <Row label={t.frequencyDiscount}>{formatXof(pricing.frequencyDiscount)}</Row>
        ) : null}
        {pricing.visitFee ? <Row label={t.visitFee}>{formatXof(pricing.visitFee)}</Row> : null}
        {pricing.teamSize ? <Row label={t.teamLabel}>{t.team(pricing.teamSize)}</Row> : null}
        {pricing.durationMinutes ? (
          <Row label={t.duration}>{formatDuration(pricing.durationMinutes)}</Row>
        ) : null}
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="border-line flex flex-wrap items-baseline justify-between gap-x-4 border-b py-2.5">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/** Détail du calcul, offre par offre, replié. */
export function PricingDetails({ pricing }: { pricing: Pricing }) {
  if (!pricing.offers.length) return null;
  return (
    <details className="group rounded-control border-line border">
      <summary className="text-ink flex min-h-11 cursor-pointer items-center px-4 font-semibold">
        {t.details}
      </summary>
      <div className="disclosure-body grid gap-4 px-4 pb-4">
        {pricing.offers.map((offer) => (
          <div key={offer.offerId}>
            <p className="text-ink flex flex-wrap items-baseline justify-between gap-2 font-semibold">
              <span>{offer.name}</span>
              <span className="tabular-nums">
                {offer.status === 'priced' && offer.price
                  ? formatXof(offer.price)
                  : t.offerOnQuote(
                      offer.onQuoteReason ? (ON_QUOTE_REASONS[offer.onQuoteReason] ?? null) : null,
                    )}
              </span>
            </p>
            {offer.lines.length ? (
              <ul className="text-small text-ink-muted mt-1 grid gap-1">
                {offer.lines.map((line, index) => (
                  <li key={`${line.kind}-${index}`} className="flex flex-wrap justify-between gap-2">
                    <span>{line.label}</span>
                    {line.amount ? <span className="tabular-nums">{formatXof(line.amount)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {offer.minimumApplied ? (
              <p className="text-small text-ink-muted mt-1">{t.minimumApplied}</p>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}
