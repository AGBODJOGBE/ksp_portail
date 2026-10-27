'use client';

import { useRouter } from 'next/navigation';
import { lazy, Suspense, useCallback, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { cancelRequest, declineQuote, getRequest } from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError } from '@/features/cleaning/errors';
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  formatShortDate,
  formatSlot,
  formatXof,
  isPast,
} from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { cleaningPaths } from '@/features/cleaning/paths';
import type { Quote, QuoteRequest } from '@/features/cleaning/schemas';
import {
  cleaningTexts,
  premisesTypes,
  requestStatuses,
  statusOf,
  visitStatuses,
} from '@/features/cleaning/texts';
import { optionLabels, quantityLabel, serviceName, useServices } from '@/features/cleaning/use-services';
import { DetailHeader, Facts, LoadError, Loading, Panel } from './detail-parts';
import { ReasonAction } from './reason-action';

// Le formulaire d'acceptation n'est téléchargé que si le client choisit d'accepter.
const AcceptForm = lazy(() => import('./accept-form').then((module_) => ({ default: module_.AcceptForm })));

const t = cleaningTexts.requestDetail;
const OPEN = new Set(['received', 'visit_scheduled', 'quote_sent']);

function recurrenceLabel(recurrence: QuoteRequest['recurrence']): string | null {
  if (!recurrence) return null;
  const per = recurrence.period === 'month' ? 'par mois' : 'par semaine';
  return `${recurrence.visitsPerPeriod} passage${recurrence.visitsPerPeriod > 1 ? 's' : ''} ${per}, pendant ${recurrence.durationMonths} mois`;
}

function QuoteView({ quote, expired }: { quote: Quote; expired: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left">
          <caption className="sr-only">{t.quoteTitle}</caption>
          <thead className="text-small text-ink-muted">
            <tr className="border-line border-b">
              <th scope="col" className="py-2 pr-3 font-semibold">
                {t.quoteLine}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                {t.quoteQuantity}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                {t.quoteUnitPrice}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">
                {t.quoteAmount}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {quote.lines.map((line) => (
              <tr key={line.label} className="border-line border-b">
                <th scope="row" className="text-ink py-2 pr-3 font-medium">
                  {line.label}
                </th>
                <td className="px-3 py-2 text-right">{formatNumber(line.quantity)}</td>
                <td className="px-3 py-2 text-right">{formatXof(line.unitPrice)}</td>
                <td className="py-2 pl-3 text-right">{formatXof(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Facts
        rows={[
          [t.subtotal, formatXof(quote.subtotal)],
          ['Nombre de passages', t.interventions(quote.interventionCount)],
          [t.total, <strong key="total">{formatXof(quote.total)}</strong>],
          [t.deposit(quote.depositPercent), quote.depositPercent > 0 ? formatXof(quote.depositAmount) : null],
          [t.recurrence, recurrenceLabel(quote.recurrence)],
          ['Équipe', t.team(quote.teamSize, formatDuration(quote.durationMinutes))],
        ]}
      />
      <div>
        <p className="text-small text-ink-muted">{t.proposedSlots}</p>
        <ul className="mt-1 grid gap-1">
          {quote.proposedSlots.map((slot) => (
            <li key={slot.start} className="text-ink font-medium">
              {formatSlot(slot)}
            </li>
          ))}
        </ul>
      </div>
      {expired ? (
        <FormMessage tone="info">{t.expired}</FormMessage>
      ) : (
        <p className="text-small text-ink font-semibold">{t.validUntil(formatDateTime(quote.validUntil))}</p>
      )}
    </div>
  );
}

/** Détail d'une demande de devis : besoin, visite, devis, et les actions possibles selon son état. */
export function RequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const services = useServices();
  const { state, reload, refresh, set } = useResource(useCallback(() => getRequest(id), [id]));
  const [notice, setNotice] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  /** Erreur d'une action : la demande est relue pour montrer son état réel. */
  const afterFailure = useCallback(
    (view: CleaningErrorView) => {
      setNotice(view.message);
      setAccepting(false);
      refresh();
    },
    [refresh],
  );

  const act = (action: (reason: string) => Promise<QuoteRequest>) => async (reason: string) => {
    try {
      const request = await action(reason);
      setNotice(null);
      set(request);
      return null;
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'stale' || view.kind === 'expired') {
        afterFailure(view);
        return null;
      }
      return view.message;
    }
  };

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return <LoadError message={view.message} onRetry={view.kind === 'notFound' ? undefined : reload} />;
  }

  const request = state.data;
  const quote = request.quote;
  const expired =
    request.status === 'expired' || (!!quote && request.status === 'quote_sent' && isPast(quote.validUntil));
  const canAnswer = request.status === 'quote_sent' && !!quote && !expired;
  const options = optionLabels(services, request.serviceCode, request.options);

  return (
    <div className="grid gap-8">
      <DetailHeader
        title={serviceName(services, request.serviceCode)}
        subtitle={`${t.title} · ${cleaningTexts.space.requestedOn(formatShortDate(request.createdAt))}`}
        status={statusOf(requestStatuses, request.status)}
      />
      <FormMessage tone="info">{notice}</FormMessage>

      {quote ? (
        <Panel id="devis-titre" title={t.quoteTitle}>
          <QuoteView quote={quote} expired={expired} />
          {canAnswer ? (
            <div className="grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-start">
              {accepting ? (
                <div className="sm:col-span-full">
                  <Suspense fallback={<Loading />}>
                    <AcceptForm
                      requestId={request.id}
                      quote={quote}
                      business={request.customerKind === 'business'}
                      onAccepted={(response) => router.push(cleaningPaths.mission(response.mission.id))}
                      onFailure={afterFailure}
                    />
                  </Suspense>
                </div>
              ) : (
                <Button size="lg" onClick={() => setAccepting(true)}>
                  {t.accept}
                </Button>
              )}
              <ReasonAction
                label={t.decline}
                title={t.declineTitle}
                confirmLabel={t.confirmDecline}
                onConfirm={act((reason) => declineQuote(request.id, reason))}
              />
            </div>
          ) : null}
        </Panel>
      ) : (
        <Panel id="devis-titre" title={t.quoteTitle}>
          <p className="text-ink-muted">{t.quotePending}</p>
        </Panel>
      )}

      {request.missionId ? (
        <ButtonLink href={cleaningPaths.mission(request.missionId)} size="lg" className="justify-self-start">
          {t.seeMission}
        </ButtonLink>
      ) : null}

      <Panel id="visite-titre" title={t.visitTitle}>
        {request.visit ? (
          <Facts
            rows={[
              ['État', visitStatuses[request.visit.status] ?? request.visit.status],
              ['Date', t.visitOn(formatDateTime(request.visit.scheduledAt))],
              [t.visitReport, request.visit.report],
            ]}
          />
        ) : (
          <p className="text-ink-muted">{t.visitPending}</p>
        )}
      </Panel>

      <Panel id="besoin-titre" title={t.need}>
        <Facts
          rows={[
            [t.premises, premisesTypes[request.premisesType] ?? request.premisesType],
            [t.quantity, quantityLabel(services, request.serviceCode, request.quantity)],
            [t.options, options.join(', ')],
            [t.commune, request.commune],
            [t.address, request.address],
            [t.recurrence, recurrenceLabel(request.recurrence)],
            [
              t.daysPerWeek,
              request.daysPerWeek ? cleaningTexts.missionDetail.daysPerWeek(request.daysPerWeek) : null,
            ],
            [
              t.estimate,
              request.estimate
                ? `${formatXof(request.estimate.low)} – ${formatXof(request.estimate.high)}`
                : null,
            ],
            [t.comment, request.comment],
            [t.closingReason, request.closingReason],
          ]}
        />
        <div>
          <p className="text-small text-ink-muted">{t.preferredSlots}</p>
          <ul className="mt-1 grid gap-1">
            {request.preferredSlots.map((slot) => (
              <li key={slot.start} className="text-ink font-medium">
                {formatSlot(slot)}
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {OPEN.has(request.status) ? (
        <div>
          <ReasonAction
            label={t.cancelRequest}
            title={t.cancelTitle}
            confirmLabel={t.confirmCancel}
            onConfirm={act((reason) => cancelRequest(request.id, reason))}
          />
        </div>
      ) : null}
    </div>
  );
}
