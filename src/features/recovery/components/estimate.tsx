'use client';

import { FormMessage } from '@/components/ui/field';
import { SummaryRow } from '@/components/ui/form-fields';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatXof } from '@/lib/format';
import { type LiveState, useLive } from '@/lib/use-live';
import { estimateFees } from '@/features/recovery/api';
import { type RecoveryErrorView, describeRecoveryError } from '@/features/recovery/errors';
import type { RecoveryFeeEstimate } from '@/features/recovery/schemas';
import { formatRate } from '@/features/recovery/texts';
import { wizardTexts as t } from '@/features/recovery/wizard-texts';

export type EstimateState = LiveState<RecoveryFeeEstimate, RecoveryErrorView>;

type EstimateBody = { kind: string; amountDue: { amount: number; currency: 'XOF' } };

const runEstimate = (body: EstimateBody, signal: AbortSignal) => estimateFees(body, signal);

/**
 * Estimation en direct (`POST /recovery/estimates`) : frais de dossier, commission et minimum, calculés
 * par la gateway sur le montant déclaré, après une pause de saisie (`useLive`).
 */
export function useEstimate(kind: string, amount: number | null): EstimateState {
  const body: EstimateBody | null =
    kind && amount !== null ? { kind, amountDue: { amount, currency: 'XOF' } } : null;
  return useLive(body, runEstimate, describeRecoveryError);
}

/** Frais et commission estimés, avec le montant déclaré ; refus de la gateway en clair (minimum, tarif). */
export function EstimatePanel({
  state,
  declared,
  className,
}: {
  state: EstimateState;
  declared: number | null;
  className?: string;
}) {
  const data = state.status === 'ready' ? state.data : state.status === 'loading' ? state.last : null;
  return (
    <section
      aria-labelledby="estimation-titre"
      aria-busy={state.status === 'loading' || undefined}
      className={cn('rounded-card border-line bg-surface-muted grid gap-3 border p-4 sm:p-5', className)}
    >
      <h3 id="estimation-titre" className="font-display text-ink text-lg font-semibold">
        {t.estimateTitle}
      </h3>
      <p className="text-small text-ink-muted">{t.estimateLead}</p>
      <div aria-live="polite" className="grid gap-3">
        {state.status === 'idle' ? <p className="text-small text-ink-muted">{t.estimateWaiting}</p> : null}
        {state.status === 'error' ? (
          <FormMessage tone={state.error.kind === 'pricingUnavailable' ? 'info' : 'error'}>
            {state.error.kind === 'belowMinimum'
              ? t.belowMinimum(state.error.minimum === null ? null : formatXof(state.error.minimum))
              : state.error.message}
          </FormMessage>
        ) : null}
        {state.status === 'loading' && !data ? (
          <div className="grid gap-2" role="status">
            <span className="sr-only">{t.estimating}</span>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : null}
        {data && state.status !== 'error' ? (
          <dl className={cn('grid', state.status === 'loading' && 'opacity-60')}>
            {declared !== null ? <SummaryRow label={t.declared}>{formatXof(declared)}</SummaryRow> : null}
            <SummaryRow label={t.caseFee} strong>
              {formatXof(data.caseFee)}
            </SummaryRow>
            <SummaryRow label={t.commission}>{data.commissionSummary}</SummaryRow>
            {data.stageRates.length ? (
              <SummaryRow label={t.stageRates}>
                <ul className="grid gap-0.5 text-sm">
                  {data.stageRates.map((rate) => (
                    <li key={rate.stageGroup}>
                      {`${t.stageGroups[rate.stageGroup] ?? rate.stageGroup} : ${formatRate(rate.rateBps)}`}
                    </li>
                  ))}
                </ul>
              </SummaryRow>
            ) : null}
          </dl>
        ) : null}
      </div>
      {data ? (
        <p className="text-small text-ink-muted">{t.minimum(formatXof(data.minimumAmountDue))}</p>
      ) : null}
      <p className="text-small text-ink-muted">{t.feeRule}</p>
    </section>
  );
}
