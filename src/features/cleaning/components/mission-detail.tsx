'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SignatureArrow } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconCheck } from '@/components/ui/icons';
import { useReadOnly } from '@/features/identity';
import { cancelMission, getMission, payMission } from '@/features/cleaning/api';
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
import { WalletPay, walletTexts } from '@/features/wallet';
import { cleaningPaths } from '@/features/cleaning/paths';
import { type Intervention, type Mission, suspensionCauses } from '@/features/cleaning/schemas';
import {
  type StatusLabel,
  cleaningTexts,
  interventionStatuses,
  missionStatuses,
  paymentMethods,
  paymentOptions,
  planMethods,
  paymentStatuses,
  paymentTimings,
  statusOf,
  suspendedStatus,
} from '@/features/cleaning/texts';
import { serviceName, useServices } from '@/features/cleaning/use-services';
import { LIFECYCLE, missionStage } from '@/features/cleaning/lifecycle';
import { paymentDue, paymentExpected } from '@/features/cleaning/payment-due';
import { spaceTexts } from '@/features/cleaning/space-texts';
import { StepTimeline } from '@/components/ui/step-timeline';
import { planLabel } from '@/features/cleaning/schedule';
import { DetailHeader, Facts, LoadError, Loading, NextStep, Panel } from './detail-parts';
import { InterventionPhotos } from './intervention-photos';
import { ReasonAction } from './reason-action';
import { SchedulePlan } from './schedule-plan';

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

/** Paiement en ligne proposé au particulier, avec son portefeuille (ADR-046), et le libellé de son bouton. */
const PAYMENT_ID = 'paiement';

function onlinePayment(mission: Mission) {
  const due = paymentDue(mission);
  if (!due) return null;
  const label =
    due.part === 'deposit'
      ? walletTexts.payDeposit
      : due.nothingPaid
        ? walletTexts.pay
        : walletTexts.payBalance;
  return { part: due.part, label, amount: due.amount };
}

/**
 * Paiement « avant » encore dû (ADR-049 §6) : aucun passage ne démarre tant que l'acompte (ou la totalité)
 * n'est pas payé. Montant lu sur la mission (`depositDue`, `remainingDue`), jamais calculé ; null s'il
 * n'est pas connu. `undefined` : rien n'empêche le démarrage.
 */
function upfrontDue(mission: Mission): { amount: string | null } | undefined {
  if (mission.payment.plan.timing !== 'before' || TERMINAL.has(mission.status)) return undefined;
  const due = paymentDue(mission);
  if (!due) return undefined;
  if (mission.payment.plan.option === 'deposit' && due.part !== 'deposit') return undefined;
  return { amount: due.amount ? formatXof(due.amount) : null };
}

function PaymentView({
  mission,
  kind,
  notice,
  onPaid,
  onStale,
}: {
  mission: Mission;
  kind: Kind;
  /** Paiement par le portefeuille enregistré : montant et solde restant, annoncés (zone `status`). */
  notice: string | null;
  onPaid: (mission: Mission, notice: string) => void;
  onStale: () => void;
}) {
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
  const upfront = upfrontDue(mission);
  return (
    <div className="grid gap-4">
      <div>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
      {/* Deux colonnes seulement si la place suffit : un grand montant ne chevauche pas l'autre. */}
      <dl className="rounded-control bg-surface-muted grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 p-4">
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
              (planMethods[plan.method] ?? plan.method).toLowerCase(),
            ].join(', '),
          ],
          [
            t.deposit(payment.depositPercent),
            plan.option === 'deposit' && payment.depositPercent > 0 ? formatXof(payment.depositAmount) : null,
          ],
        ]}
      />
      {upfront ? <FormMessage tone="info">{t.upfront(upfront.amount)}</FormMessage> : null}
      <FormMessage tone="success">{notice}</FormMessage>
      {online ? (
        <WalletPay
          pay={(key) => payMission(mission.id, online.part, key)}
          label={online.label}
          amount={online.amount}
          onPaid={onPaid}
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
                  {record.reference && record.method !== 'wallet' ? ` · ${record.reference}` : ''}
                  {record.refundedAt ? ` · ${t.refunded(formatShortDate(record.refundedAt))}` : ''}
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
  toReschedule: 'bg-accent-soft text-ink border-accent-strong border-dashed',
};

function InterventionItem({ intervention, index }: { intervention: Intervention; index: number }) {
  const bySuspension = intervention.status === 'cancelled' && intervention.cancellationCause === 'suspension';
  // Annulé pour être replanifié (ADR-053) : pas un passage perdu, la mission en a de nouveau un à planifier.
  const toReschedule = intervention.status === 'cancelled' && intervention.toReschedule === true;
  const status: StatusLabel = toReschedule
    ? { label: t.toReschedule, tone: 'warning' }
    : bySuspension
      ? { label: t.cancelledBySuspension, tone: 'warning' }
      : statusOf(interventionStatuses, intervention.status);
  const photoCount = intervention.beforePhotoFileIds.length + intervention.afterPhotoFileIds.length;
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
          (toReschedule ? MARKERS.toReschedule : MARKERS[intervention.status]) ?? MARKERS.planned,
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
        {toReschedule ? <p className="text-small text-ink">{t.toRescheduleHint}</p> : null}
        {intervention.changeReason ? (
          <p className="text-small text-ink">
            {toReschedule ? t.rescheduledReason : t.changeReason} : {intervention.changeReason}
          </p>
        ) : null}
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
        {photoCount ? (
          <InterventionPhotos
            interventionId={intervention.id}
            count={photoCount}
            date={formatShortDate(intervention.scheduledStart)}
          />
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
  const [paid, setPaid] = useState<string | null>(null);
  const readOnly = useReadOnly();

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return <LoadError message={view.message} onRetry={view.kind === 'notFound' ? undefined : reload} />;
  }

  const mission = state.data;
  const kind: Kind = mission.customerKind === 'business' ? 'business' : 'individual';
  const causes = mission.suspension ? suspensionCauses(mission.suspension) : [];
  /**
   * Mission récurrente déjà commencée (ADR-049 §7) : l'annulation arrête la suite ; les passages faits
   * restent dus et le trop-payé est crédité au portefeuille (montants calculés par cleaning).
   */
  const started =
    mission.completedInterventions > 0 && (mission.plannedInterventions > 1 || mission.recurrence !== null);
  async function cancel(reason: string): Promise<string | null> {
    try {
      set(await cancelMission(mission.id, reason));
      setNotice(null);
      setDone(started ? (kind === 'business' ? t.stoppedBusiness : t.stopped) : j.missionCancelled);
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
  const stage = missionStage(mission);
  const payNow = paymentExpected(mission) && !readOnly ? onlinePayment(mission) : null;
  const upfront = kind === 'individual' && !mission.suspension ? upfrontDue(mission) : undefined;
  const nextBase = mission.suspension
    ? t.suspended(mission.suspension, formatShortDate(mission.suspension.since))
    : mission.status === 'on_hold'
      ? t.onHold
      : next && !TERMINAL.has(mission.status)
        ? `${status.hint ?? ''} ${j.nextVisit(formatDateTime(next.scheduledStart))}`.trim()
        : (status.hint ?? status.label);
  const nextText = upfront ? `${nextBase} ${t.upfront(upfront.amount)}` : nextBase;
  const plan = mission.schedule && mission.scheduledDates?.length ? mission.schedule : null;

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
      <StepTimeline
        steps={LIFECYCLE}
        current={stage.current}
        stopped={stage.stopped}
        label={spaceTexts.lifecycle.label}
        currentLabel={spaceTexts.lifecycle.current}
        stoppedLabel={spaceTexts.lifecycle.stopped}
      />
      <FormMessage tone="success">{done ?? (booked ? j.booked : null)}</FormMessage>
      <FormMessage tone="info">{notice}</FormMessage>
      {resumed ? <FormMessage tone="info">{t.resumed}</FormMessage> : null}

      {mission.suspension ? <FormMessage>{nextText}</FormMessage> : null}

      <NextStep
        // Paiement « avant » attendu : c'est au client d'agir pour que les passages commencent.
        actor={TERMINAL.has(mission.status) ? undefined : upfront && payNow ? 'client' : status.actor}
        text={
          mission.suspension ? (status.actor === 'client' ? j.suspendedAction : j.suspendedByKsp) : nextText
        }
      >
        {causes.includes('unpaid_invoices') ? (
          <ButtonLink href={INVOICES_PATH} variant="action">
            {t.seeInvoices}
          </ButtonLink>
        ) : payNow ? (
          <ButtonLink href={`#${PAYMENT_ID}`} variant="action">
            {payNow.label}
          </ButtonLink>
        ) : null}
      </NextStep>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-8">
          {plan ? (
            <Panel id="plan-titre" title={cleaningTexts.schedule.title}>
              <SchedulePlan
                schedule={plan}
                dates={mission.scheduledDates ?? []}
                lead={cleaningTexts.schedule.missionLead}
                mission={{
                  interventions: mission.interventions,
                  completed: mission.completedInterventions,
                  planned: mission.plannedInterventions,
                }}
              />
            </Panel>
          ) : null}
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
        </div>

        <aside className="grid gap-8">
          <Panel id="mission-titre" title={t.bookingTitle}>
            <Facts
              stacked
              rows={[
                [mission.schedule ? t.firstPassage : t.slot, formatSlot(mission.chosenSlot)],
                [t.address, `${mission.address}, ${mission.commune}`],
                [t.recurrence, planLabel(mission)],
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

          <div id={PAYMENT_ID} className="scroll-mt-[calc(var(--header-h)+1rem)]">
            <Panel id="paiement-titre" title={t.paymentTitle}>
              <PaymentView
                mission={mission}
                kind={kind}
                notice={paid}
                onPaid={(updated, notice) => {
                  set(updated);
                  setNotice(null);
                  setPaid(notice);
                }}
                onStale={refresh}
              />
            </Panel>
          </div>

          {CANCELLABLE.has(mission.status) ? (
            readOnly ? (
              <FormMessage tone="info">{t.readOnly}</FormMessage>
            ) : (
              <div className="grid justify-items-start">
                <ReasonAction
                  label={started ? t.stop : t.cancel}
                  title={started ? t.stopTitle : t.cancelTitle}
                  hint={
                    started
                      ? kind === 'business'
                        ? t.stopHintBusiness(mission.completedInterventions)
                        : t.stopHint(mission.completedInterventions)
                      : t.cancelHint
                  }
                  confirmLabel={started ? t.confirmStop : t.confirmCancel}
                  tone="danger"
                  onConfirm={cancel}
                />
              </div>
            )
          ) : null}
        </aside>
      </div>
    </div>
  );
}
