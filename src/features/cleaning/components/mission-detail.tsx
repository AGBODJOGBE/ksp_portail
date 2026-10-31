'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SignatureArrow } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconCheck } from '@/components/ui/icons';
import { cancelMission, getMission } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
import { cn } from '@/lib/cn';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatShortDate,
  formatSlot,
  formatTime,
  formatXof,
} from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { PayButton, paymentTexts } from '@/features/payment';
import { cleaningPaths } from '@/features/cleaning/paths';
import { type Intervention, type Mission, suspensionCauses } from '@/features/cleaning/schemas';
import {
  type StatusLabel,
  cleaningTexts,
  interventionStatuses,
  missionStatuses,
  paymentMethods,
  paymentOptions,
  paymentStatuses,
  paymentTimings,
  recurrenceLabel,
  statusOf,
  suspendedStatus,
} from '@/features/cleaning/texts';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { DetailHeader, Facts, LoadError, Loading, NextStep, Panel } from './detail-parts';
import { ReasonAction } from './reason-action';

const t = cleaningTexts.missionDetail;
const j = cleaningTexts.journey;
/** « Mes factures » (fonctionnalité billing) : règlement des contrats d'entreprise. */
const INVOICES_PATH = '/mon-espace/factures';
const CANCELLABLE = new Set(['to_schedule', 'scheduled']);
const TERMINAL = new Set(['completed', 'cancelled']);

/** Type de client de la mission : `business` (facture mensuelle) ou `individual`. */
type Kind = 'business' | 'individual';

/**
 * Avancement des passages : part effectuée en bleu nuit, flèche or au bout (signature). Les nombres
 * viennent de la gateway (`completedInterventions`, `plannedInterventions`).
 */
function PassagesProgress({ done, planned, label }: { done: number; planned: number; label: string }) {
  const ratio = planned > 0 ? Math.min(1, done / planned) : 0;
  return (
    <div className="grid gap-2">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="text-small text-ink-muted font-semibold">{label}</p>
        <p className="text-ink font-semibold tabular-nums">{t.progress(done, planned)}</p>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={planned}
        aria-valuenow={done}
        aria-valuetext={t.progress(done, planned)}
        className="bg-signature-track relative flex h-1.5 items-center rounded-full"
      >
        <span
          className="bg-signature-1 progress-grow h-full rounded-l-full"
          style={{ width: `${ratio * 100}%` }}
        />
        {ratio < 1 ? <SignatureArrow className="-ml-px h-3.5 w-3" /> : null}
      </div>
    </div>
  );
}

/**
 * Paiement en ligne proposé au particulier (ADR-031) : l'acompte tant qu'il est attendu, sinon le reste
 * dû. Le montant affiché est lu tel quel sur la mission (acompte, ou total quand rien n'est encore réglé) ;
 * après un règlement partiel, la page du prestataire affiche le montant calculé par KSP.
 */
function onlinePayment(mission: Mission) {
  const payment = mission.payment;
  if (mission.status === 'cancelled' || payment.status === 'paid') return null;
  const nothingPaid = payment.paid.amount === 0;
  if (payment.status === 'due' && payment.plan.option === 'deposit' && payment.depositPercent > 0) {
    return {
      part: 'deposit' as const,
      label: paymentTexts.payDeposit,
      amount: nothingPaid ? payment.depositAmount : null,
    };
  }
  return {
    part: 'balance' as const,
    label: nothingPaid ? paymentTexts.pay : paymentTexts.payBalance,
    amount: nothingPaid ? payment.total : null,
  };
}

function PaymentView({ mission, kind, onStale }: { mission: Mission; kind: Kind; onStale: () => void }) {
  const payment = mission.payment;
  if (kind === 'business') {
    return (
      <div className="grid justify-items-start gap-4">
        <p className="text-ink">{t.businessPayment}</p>
        <Facts stacked rows={[[t.total, formatXof(payment.total)]]} />
        <ButtonLink href={INVOICES_PATH} variant="secondary">
          {t.seeInvoices}
        </ButtonLink>
      </div>
    );
  }
  const status = statusOf(paymentStatuses, payment.status);
  const { plan } = payment;
  const online = onlinePayment(mission);
  return (
    <div className="grid gap-4">
      <div>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
      <dl className="rounded-control bg-surface-muted grid grid-cols-2 gap-3 p-4">
        <div>
          <dt className="text-small text-ink-muted">{t.total}</dt>
          <dd className="font-display text-ink text-lg font-semibold tabular-nums sm:text-xl">
            {formatXof(payment.total)}
          </dd>
        </div>
        <div>
          <dt className="text-small text-ink-muted">{t.paid}</dt>
          <dd className="font-display text-ink text-lg font-semibold tabular-nums sm:text-xl">
            {formatXof(payment.paid)}
          </dd>
        </div>
      </dl>
      <Facts
        stacked
        rows={[
          [
            t.paymentPlan,
            [
              paymentOptions[plan.option] ?? plan.option,
              (paymentTimings[plan.timing] ?? plan.timing).toLowerCase(),
              (paymentMethods[plan.method] ?? plan.method).toLowerCase(),
            ].join(', '),
          ],
          [
            t.deposit(payment.depositPercent),
            plan.option === 'deposit' && payment.depositPercent > 0 ? formatXof(payment.depositAmount) : null,
          ],
        ]}
      />
      {online ? (
        <PayButton
          subject={{ subjectType: 'cleaning_mission', subjectId: mission.id, part: online.part }}
          label={online.label}
          amount={online.amount}
          onStale={onStale}
        />
      ) : null}
      {payment.status !== 'paid' ? <p className="text-small text-ink-muted">{t.howToPay}</p> : null}
      <div>
        <p className="text-small text-ink-muted font-semibold">{t.paymentsTitle}</p>
        {payment.payments.length ? (
          <ul className="divide-line mt-1 grid divide-y">
            {payment.payments.map((record) => (
              <li key={record.id} className="text-ink flex flex-wrap justify-between gap-x-4 py-2">
                <span>
                  {paymentMethods[record.method] ?? record.method} · {formatShortDate(record.recordedAt)}
                  {record.reference ? ` · ${record.reference}` : ''}
                </span>
                <span className="font-semibold tabular-nums">{formatXof(record.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted mt-1">{t.noPayments}</p>
        )}
      </div>
    </div>
  );
}

const MARKERS: Record<string, string> = {
  completed: 'bg-brand text-on-brand border-brand',
  in_progress: 'bg-action text-on-action border-action',
  on_hold: 'bg-warning-soft text-warning border-warning',
  cancelled: 'bg-surface-sunken text-ink-subtle border-line-strong',
  planned: 'bg-surface text-ink-muted border-line-control',
};

function InterventionItem({ intervention, index }: { intervention: Intervention; index: number }) {
  const bySuspension = intervention.status === 'cancelled' && intervention.cancellationCause === 'suspension';
  const status: StatusLabel = bySuspension
    ? { label: t.cancelledBySuspension, tone: 'warning' }
    : statusOf(interventionStatuses, intervention.status);
  const details = [
    formatDuration(intervention.durationMinutes),
    intervention.agents.length
      ? `${t.agents} : ${intervention.agents.map((agent) => agent.displayName).join(', ')}`
      : null,
    intervention.completedAt
      ? t.completedOn(formatDateTime(intervention.completedAt))
      : intervention.startedAt
        ? t.startedOn(formatDateTime(intervention.startedAt))
        : null,
  ].filter(Boolean);
  const checklistDone = intervention.checklist.filter((item) => item.done).length;

  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0">
      {/* Fil qui relie les passages. */}
      <span
        aria-hidden="true"
        className="bg-line-strong absolute top-9 bottom-1 left-[0.9375rem] w-px [li:last-child>&]:hidden"
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative grid size-8 place-items-center rounded-full border text-xs font-semibold tabular-nums',
          MARKERS[intervention.status] ?? MARKERS.planned,
        )}
      >
        {intervention.status === 'completed' ? <IconCheck className="size-4" /> : index + 1}
      </span>
      <div className="grid gap-1 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink font-semibold">
            {formatDate(intervention.scheduledStart)}, {formatTime(intervention.scheduledStart)}
          </span>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>
        <p className="text-small text-ink-muted">{details.join(' · ')}</p>
        {intervention.incidentNote ? (
          <p className="text-small text-warning">
            {t.incident} : {intervention.incidentNote}
          </p>
        ) : null}
        {intervention.checklist.length ? (
          <details className="text-small">
            <summary className="text-action-ink min-h-11 cursor-pointer content-center font-semibold">
              {t.checklist(checklistDone, intervention.checklist.length)}
            </summary>
            <ul className="disclosure-body mt-1 grid gap-1">
              {intervention.checklist.map((item) => (
                <li key={item.code} className="text-ink flex items-start gap-2">
                  {item.done ? (
                    <IconCheck className="text-action-ink mt-0.5 size-4" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="border-line-control mt-1 size-3 rounded-full border"
                    />
                  )}
                  <span>
                    <span className="sr-only">{item.done ? 'Fait :' : 'À faire :'}</span> {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {intervention.beforePhotoFileIds.length + intervention.afterPhotoFileIds.length ? (
          <p className="text-small text-ink-muted">
            {t.photos(intervention.beforePhotoFileIds.length, intervention.afterPhotoFileIds.length)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** Prochain passage prévu (le plus proche des passages `planned`), pour la prochaine étape. */
function nextPlanned(mission: Mission): Intervention | undefined {
  return mission.interventions
    .filter((item) => item.status === 'planned')
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))[0];
}

/** Détail d'une mission : avancement, prochaine étape, passages, paiement, suspension, annulation. */
export function MissionDetail({ id }: { id: string }) {
  const services = useServices();
  const booked = useSearchParams().get('reservation') === 'confirmee';
  const { state, reload, refresh, set } = useResource(useCallback(() => getMission(id), [id]));
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return <LoadError message={view.message} onRetry={view.kind === 'notFound' ? undefined : reload} />;
  }

  const mission = state.data;
  const kind: Kind = mission.customerKind === 'business' ? 'business' : 'individual';
  const causes = mission.suspension ? suspensionCauses(mission.suspension) : [];
  async function cancel(reason: string): Promise<string | null> {
    try {
      set(await cancelMission(mission.id, reason));
      setNotice(null);
      setDone(j.missionCancelled);
      return null;
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'stale') {
        setNotice(view.message);
        refresh();
        return null;
      }
      return view.message;
    }
  }

  const resumed =
    !mission.suspension &&
    !TERMINAL.has(mission.status) &&
    mission.interventions.some((item) => item.cancellationCause === 'suspension');
  const status = mission.suspension
    ? suspendedStatus(mission.suspension)
    : statusOf(missionStatuses, mission.status);
  const next = nextPlanned(mission);
  const nextText = mission.suspension
    ? t.suspended(mission.suspension, formatShortDate(mission.suspension.since))
    : mission.status === 'on_hold'
      ? t.onHold
      : next && !TERMINAL.has(mission.status)
        ? `${status.hint ?? ''} ${j.nextVisit(formatDateTime(next.scheduledStart))}`.trim()
        : (status.hint ?? status.label);

  return (
    <div className="grid gap-8">
      <DetailHeader
        title={serviceName(services, mission.serviceCode)}
        subtitle={`${t.title} · ${mission.commune}`}
        status={status}
        tag={kind === 'business' ? cleaningTexts.context.businessTag : undefined}
        progress={
          <PassagesProgress
            done={mission.completedInterventions}
            planned={mission.plannedInterventions}
            label={j.missionProgress}
          />
        }
      />
      <FormMessage tone="success">{done ?? (booked ? j.booked : null)}</FormMessage>
      <FormMessage tone="info">{notice}</FormMessage>
      {resumed ? <FormMessage tone="info">{t.resumed}</FormMessage> : null}

      {mission.suspension ? <FormMessage>{nextText}</FormMessage> : null}

      <NextStep
        actor={TERMINAL.has(mission.status) ? undefined : status.actor}
        text={
          mission.suspension ? (status.actor === 'client' ? j.suspendedAction : j.suspendedByKsp) : nextText
        }
      >
        {causes.includes('unpaid_invoices') ? (
          <ButtonLink href={INVOICES_PATH} variant="action">
            {t.seeInvoices}
          </ButtonLink>
        ) : null}
      </NextStep>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Panel id="passages-titre" title={t.interventionsTitle}>
          {mission.interventions.length ? (
            <ol className="grid">
              {mission.interventions.map((intervention, index) => (
                <InterventionItem key={intervention.id} intervention={intervention} index={index} />
              ))}
            </ol>
          ) : (
            <p className="text-ink-muted">{t.noInterventions}</p>
          )}
        </Panel>

        <aside className="grid gap-8">
          <Panel id="mission-titre" title={t.bookingTitle}>
            <Facts
              stacked
              rows={[
                [t.slot, formatSlot(mission.chosenSlot)],
                [t.address, `${mission.address}, ${mission.commune}`],
                [t.recurrence, recurrenceLabel(mission.recurrence)],
                [
                  cleaningTexts.requestDetail.daysPerWeek,
                  mission.daysPerWeek ? t.daysPerWeek(mission.daysPerWeek) : null,
                ],
                [t.cancellationReason, mission.cancellationReason],
              ]}
            />
            <ButtonLink
              href={cleaningPaths.request(mission.requestId)}
              variant="secondary"
              className="justify-self-start"
            >
              {t.seeRequest}
            </ButtonLink>
          </Panel>

          <Panel id="paiement-titre" title={t.paymentTitle}>
            <PaymentView mission={mission} kind={kind} onStale={refresh} />
          </Panel>

          {CANCELLABLE.has(mission.status) ? (
            <div className="grid justify-items-start">
              <ReasonAction
                label={t.cancel}
                title={t.cancelTitle}
                hint={t.cancelHint}
                confirmLabel={t.confirmCancel}
                tone="danger"
                onConfirm={cancel}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
