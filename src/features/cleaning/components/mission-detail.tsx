'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { cancelMission, getMission } from '@/features/cleaning/api';
import { describeCleaningError } from '@/features/cleaning/errors';
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
import { cleaningPaths } from '@/features/cleaning/paths';
import { type Intervention, type Mission, suspensionCauses } from '@/features/cleaning/schemas';
import {
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
import { DetailHeader, Facts, LoadError, Loading, Panel } from './detail-parts';
import { ReasonAction } from './reason-action';

const t = cleaningTexts.missionDetail;
/** « Mes factures » (fonctionnalité billing) : règlement des contrats d'entreprise. */
const INVOICES_PATH = '/mon-espace/factures';
const CANCELLABLE = new Set(['to_schedule', 'scheduled']);
const TERMINAL = new Set(['completed', 'cancelled']);

/** Type de client de la mission : `business` (facture mensuelle) ou `individual`. */
type Kind = 'business' | 'individual';

function PaymentView({ payment, kind }: { payment: Mission['payment']; kind: Kind }) {
  if (kind === 'business') {
    return (
      <div className="grid justify-items-start gap-4">
        <p className="text-ink">{t.businessPayment}</p>
        <Facts rows={[[t.total, formatXof(payment.total)]]} />
        <ButtonLink href={INVOICES_PATH} variant="secondary">
          {t.seeInvoices}
        </ButtonLink>
      </div>
    );
  }
  const status = statusOf(paymentStatuses, payment.status);
  const { plan } = payment;
  return (
    <div className="grid gap-4">
      <div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <Facts
        rows={[
          [
            t.paymentPlan,
            [
              paymentOptions[plan.option] ?? plan.option,
              (paymentTimings[plan.timing] ?? plan.timing).toLowerCase(),
              (paymentMethods[plan.method] ?? plan.method).toLowerCase(),
            ].join(', '),
          ],
          [t.total, formatXof(payment.total)],
          [
            t.deposit(payment.depositPercent),
            plan.option === 'deposit' && payment.depositPercent > 0 ? formatXof(payment.depositAmount) : null,
          ],
          [t.paid, formatXof(payment.paid)],
        ]}
      />
      {payment.status !== 'paid' ? <p className="text-small text-ink-muted">{t.howToPay}</p> : null}
      <div>
        <p className="text-small text-ink-muted">{t.paymentsTitle}</p>
        {payment.payments.length ? (
          <ul className="mt-1 grid gap-1">
            {payment.payments.map((record) => (
              <li key={record.id} className="text-ink">
                <span className="font-semibold tabular-nums">{formatXof(record.amount)}</span> ·{' '}
                {paymentMethods[record.method] ?? record.method} · {formatShortDate(record.recordedAt)}
                {record.reference ? ` · ${record.reference}` : ''}
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

function InterventionItem({ intervention }: { intervention: Intervention }) {
  const bySuspension = intervention.status === 'cancelled' && intervention.cancellationCause === 'suspension';
  const status = bySuspension
    ? { label: t.cancelledBySuspension, tone: 'warning' as const }
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
  const photos = intervention.beforePhotoFileIds.length + intervention.afterPhotoFileIds.length;

  return (
    <li className="border-line grid gap-1 border-l-2 pl-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink font-semibold">
          {formatDate(intervention.scheduledStart)}, {formatTime(intervention.scheduledStart)}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="text-small text-ink-muted">{details.join(' · ')}</p>
      {intervention.incidentNote ? (
        <p className="text-small text-warning">
          {t.incident} : {intervention.incidentNote}
        </p>
      ) : null}
      {intervention.checklist.length ? (
        <details className="text-small">
          <summary className="text-accent-ink min-h-11 cursor-pointer content-center font-semibold">
            {t.checklist(checklistDone, intervention.checklist.length)}
          </summary>
          <ul className="mt-1 grid gap-1">
            {intervention.checklist.map((item) => (
              <li key={item.code} className="text-ink">
                <span aria-hidden="true">{item.done ? '✓' : '○'}</span>{' '}
                <span className="sr-only">{item.done ? 'Fait :' : 'À faire :'}</span> {item.label}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {photos ? (
        <p className="text-small text-ink-muted">
          {t.photos(intervention.beforePhotoFileIds.length, intervention.afterPhotoFileIds.length)}
        </p>
      ) : null}
    </li>
  );
}

/** Détail d'une mission : créneau, passages, paiement, suspension éventuelle, annulation. */
export function MissionDetail({ id }: { id: string }) {
  const services = useServices();
  const { state, reload, refresh, set } = useResource(useCallback(() => getMission(id), [id]));
  const [notice, setNotice] = useState<string | null>(null);

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

  return (
    <div className="grid gap-8">
      <DetailHeader
        title={serviceName(services, mission.serviceCode)}
        subtitle={`${t.title} · ${t.progress(mission.completedInterventions, mission.plannedInterventions)}`}
        status={
          mission.suspension ? suspendedStatus(mission.suspension) : statusOf(missionStatuses, mission.status)
        }
        tag={kind === 'business' ? cleaningTexts.context.businessTag : undefined}
      />
      <FormMessage tone="info">{notice}</FormMessage>
      {mission.suspension ? (
        <div className="grid justify-items-start gap-3">
          <FormMessage>
            {t.suspended(mission.suspension, formatShortDate(mission.suspension.since))}
          </FormMessage>
          {causes.includes('unpaid_invoices') ? (
            <ButtonLink href={INVOICES_PATH} variant="secondary">
              {t.seeInvoices}
            </ButtonLink>
          ) : null}
        </div>
      ) : mission.status === 'on_hold' ? (
        <FormMessage>{t.onHold}</FormMessage>
      ) : resumed ? (
        <FormMessage tone="info">{t.resumed}</FormMessage>
      ) : null}

      <Panel id="mission-titre" title={t.bookingTitle}>
        <Facts
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
      </Panel>

      <Panel id="passages-titre" title={t.interventionsTitle}>
        {mission.interventions.length ? (
          <ol className="grid gap-3">
            {mission.interventions.map((intervention) => (
              <InterventionItem key={intervention.id} intervention={intervention} />
            ))}
          </ol>
        ) : (
          <p className="text-ink-muted">{t.noInterventions}</p>
        )}
      </Panel>

      <Panel id="paiement-titre" title={t.paymentTitle}>
        <PaymentView payment={mission.payment} kind={kind} />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={cleaningPaths.request(mission.requestId)} variant="secondary">
          {t.seeRequest}
        </ButtonLink>
        {CANCELLABLE.has(mission.status) ? (
          <ReasonAction
            label={t.cancel}
            title={t.cancelTitle}
            hint={t.cancelHint}
            confirmLabel={t.confirmCancel}
            onConfirm={cancel}
          />
        ) : null}
      </div>
    </div>
  );
}
