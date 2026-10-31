'use client';

import { useRouter } from 'next/navigation';
import { lazy, Suspense, useCallback, useState } from 'react';
import { SignatureProgress } from '@/components/ui/brand/signature';
import { Badge } from '@/components/ui/badge';
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
  recurrenceLabel,
  requestJourney,
  requestStage,
  requestStatuses,
  statusOf,
  visitStatuses,
} from '@/features/cleaning/texts';
import { optionLabels, quantityLabel, serviceName, useServices } from '@/features/cleaning/use-services';
import { DetailHeader, Facts, LoadError, Loading, NextStep, Panel } from './detail-parts';
import { ReasonAction } from './reason-action';

// Le formulaire d'acceptation n'est téléchargé que si le client choisit d'accepter.
const AcceptForm = lazy(() => import('./accept-form').then((module_) => ({ default: module_.AcceptForm })));

const t = cleaningTexts.requestDetail;
const j = cleaningTexts.journey;
const OPEN = new Set(['received', 'visit_scheduled', 'quote_sent']);
const QUOTE_ID = 'devis';

/** Montants du devis : total en grand, puis passages, acompte et validité. */
function QuoteSummary({ quote, expired, business }: { quote: Quote; expired: boolean; business: boolean }) {
  return (
    <div className="rounded-control bg-surface-muted grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
      <div>
        <p className="text-small text-ink-muted font-semibold">{t.total}</p>
        <p className="font-display text-ink mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">
          {formatXof(quote.total)}
        </p>
        <p className="text-small text-ink-muted mt-1">
          {t.interventions(quote.interventionCount)} · {t.subtotal} : {formatXof(quote.subtotal)}
        </p>
      </div>
      <div className="grid gap-1 sm:justify-items-end">
        {/* Une entreprise règle par facture mensuelle : l'acompte ne la concerne pas. */}
        {!business && quote.depositPercent > 0 ? (
          <p className="text-small text-ink">
            {t.deposit(quote.depositPercent)} :{' '}
            <span className="font-semibold tabular-nums">{formatXof(quote.depositAmount)}</span>
          </p>
        ) : null}
        {expired ? (
          <Badge tone="warning" dot>
            {cleaningTexts.requestDetail.expiredBadge}
          </Badge>
        ) : (
          <p className="text-small text-ink font-semibold">
            {t.validUntil(formatDateTime(quote.validUntil))}
          </p>
        )}
      </div>
    </div>
  );
}

function QuoteView({ quote, expired, business }: { quote: Quote; expired: boolean; business: boolean }) {
  return (
    <div className="grid gap-5">
      <QuoteSummary quote={quote} expired={expired} business={business} />
      {/* Téléphone : lignes empilées ; à partir de 640 px : tableau. */}
      <ul className="divide-line border-line grid divide-y border-y sm:hidden">
        {quote.lines.map((line) => (
          <li key={line.label} className="flex items-start justify-between gap-4 py-2.5">
            <span className="min-w-0">
              <span className="text-ink block font-medium">{line.label}</span>
              <span className="text-small text-ink-muted tabular-nums">
                {formatNumber(line.quantity)} × {formatXof(line.unitPrice)}
              </span>
            </span>
            <span className="text-ink shrink-0 font-semibold tabular-nums">{formatXof(line.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="hidden sm:block">
        <table className="w-full text-left">
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
                <th scope="row" className="text-ink py-2.5 pr-3 font-medium">
                  {line.label}
                </th>
                <td className="px-3 py-2.5 text-right">{formatNumber(line.quantity)}</td>
                <td className="px-3 py-2.5 text-right">{formatXof(line.unitPrice)}</td>
                <td className="text-ink py-2.5 pl-3 text-right font-semibold">{formatXof(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Facts
        rows={[
          [t.recurrence, recurrenceLabel(quote.recurrence)],
          [t.teamLabel, t.team(quote.teamSize, formatDuration(quote.durationMinutes))],
          [
            t.proposedSlots,
            <ul key="slots" className="grid gap-1">
              {quote.proposedSlots.map((slot) => (
                <li key={slot.start}>{formatSlot(slot)}</li>
              ))}
            </ul>,
          ],
        ]}
      />
      {business ? <p className="text-small text-ink-muted">{t.businessPayment}</p> : null}
      {expired ? <FormMessage tone="info">{t.expired}</FormMessage> : null}
    </div>
  );
}

/** Visite des lieux, obligatoire avant tout devis (particulier comme entreprise). */
function VisitView({ visit }: { visit: QuoteRequest['visit'] }) {
  if (!visit) return <p className="text-ink-muted">{t.visitPending}</p>;
  const status = statusOf(visitStatuses, visit.status);
  return (
    <div className="grid gap-3">
      <div>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>
      <Facts
        rows={[
          [
            'Date',
            visit.status === 'completed' && visit.completedAt
              ? t.visitDoneOn(formatDateTime(visit.completedAt))
              : t.visitOn(formatDateTime(visit.scheduledAt)),
          ],
          [t.visitReport, visit.report],
        ]}
      />
      {visit.status === 'scheduled' ? <p className="text-small text-ink-muted">{t.visitScheduled}</p> : null}
      {visit.status === 'cancelled' ? <FormMessage tone="info">{t.visitCancelled}</FormMessage> : null}
    </div>
  );
}

/** Texte de la prochaine étape, selon l'état de la demande (la gateway en est seule juge). */
function nextStepText(request: QuoteRequest, expired: boolean): string {
  const status = statusOf(requestStatuses, request.status);
  if (request.status === 'quote_sent' && request.quote && !expired) {
    return j.quoteToAnswer(formatDateTime(request.quote.validUntil));
  }
  if (request.status === 'quote_sent' && expired) return t.expired;
  if (request.status === 'visit_scheduled' && request.visit?.status === 'completed') return j.visitDone;
  if (request.status === 'visit_scheduled' && request.visit?.status === 'scheduled') {
    return j.visitPlanned(formatDateTime(request.visit.scheduledAt));
  }
  return status.hint ?? status.label;
}

/** Détail d'une demande de devis : avancement, prochaine étape, devis, visite, besoin, actions. */
export function RequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const services = useServices();
  const { state, reload, refresh, set } = useResource(useCallback(() => getRequest(id), [id]));
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  /** Erreur d'une action : la demande est relue pour montrer son état réel. */
  const afterFailure = useCallback(
    (view: CleaningErrorView) => {
      setNotice(view.message);
      setDone(null);
      setAccepting(false);
      refresh();
    },
    [refresh],
  );

  const act =
    (action: (reason: string) => Promise<QuoteRequest>, success: string) => async (reason: string) => {
      try {
        const request = await action(reason);
        setNotice(null);
        setDone(success);
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
  const business = request.customerKind === 'business';
  const expired =
    request.status === 'expired' || (!!quote && request.status === 'quote_sent' && isPast(quote.validUntil));
  const canAnswer = request.status === 'quote_sent' && !!quote && !expired;
  const options = optionLabels(services, request.serviceCode, request.options);
  const status = statusOf(requestStatuses, request.status);
  const stage = requestStage(request);
  const closed = !OPEN.has(request.status) && request.status !== 'accepted';

  return (
    <div className="grid gap-8">
      <DetailHeader
        title={serviceName(services, request.serviceCode)}
        subtitle={`${t.title} · ${cleaningTexts.space.requestedOn(formatShortDate(request.createdAt))} · ${request.commune}`}
        status={status}
        tag={business ? cleaningTexts.context.businessTag : undefined}
        progress={
          <SignatureProgress
            steps={requestJourney}
            current={stage.current}
            stopped={stage.stopped}
            label={j.requestProgress}
          />
        }
      />
      <FormMessage tone="info">{notice}</FormMessage>
      <FormMessage tone="success">{done}</FormMessage>

      <NextStep actor={expired ? undefined : status.actor} text={nextStepText(request, expired)}>
        {canAnswer && !accepting ? (
          <ButtonLink href={`#${QUOTE_ID}`} variant="action">
            {j.seeQuote}
          </ButtonLink>
        ) : null}
        {request.missionId ? (
          <ButtonLink href={cleaningPaths.mission(request.missionId)} variant="action">
            {j.followMission}
          </ButtonLink>
        ) : null}
        {closed ? (
          <ButtonLink href={cleaningPaths.simulator} variant="secondary">
            {j.newRequest}
          </ButtonLink>
        ) : null}
      </NextStep>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-8">
          {/* Sans devis, la visite des lieux est l'étape en cours : elle vient d'abord. */}
          {quote ? null : (
            <Panel id="visite-titre" title={t.visitTitle}>
              <VisitView visit={request.visit} />
            </Panel>
          )}
          <div id={QUOTE_ID} className="scroll-mt-[calc(var(--header-h)+1rem)]">
            <Panel id="devis-titre" title={t.quoteTitle}>
              {quote ? (
                <>
                  <QuoteView quote={quote} expired={expired} business={business} />
                  {canAnswer ? (
                    <div className="border-line grid gap-4 border-t pt-5">
                      {accepting ? (
                        <Suspense fallback={<Loading />}>
                          <AcceptForm
                            requestId={request.id}
                            quote={quote}
                            business={business}
                            onAccepted={(response) =>
                              router.push(cleaningPaths.missionBooked(response.mission.id))
                            }
                            onFailure={afterFailure}
                            onCancel={() => setAccepting(false)}
                          />
                        </Suspense>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
                          <Button size="lg" variant="action" onClick={() => setAccepting(true)}>
                            {t.accept}
                          </Button>
                          <ReasonAction
                            label={t.decline}
                            title={t.declineTitle}
                            hint={t.declineHint}
                            confirmLabel={t.confirmDecline}
                            onConfirm={act((reason) => declineQuote(request.id, reason), j.declined)}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-ink-muted">{t.quotePending}</p>
              )}
            </Panel>
          </div>

          {quote ? (
            <Panel id="visite-titre" title={t.visitTitle}>
              <VisitView visit={request.visit} />
            </Panel>
          ) : null}
        </div>

        <aside className="grid gap-8">
          <Panel id="besoin-titre" title={t.need}>
            <Facts
              stacked
              rows={[
                [
                  t.customer,
                  business ? cleaningTexts.context.business(null) : cleaningTexts.context.individual,
                ],
                [t.premises, premisesTypes[request.premisesType] ?? request.premisesType],
                [t.quantity, quantityLabel(services, request.serviceCode, request.quantity)],
                [t.options, options.join(', ')],
                [t.address, `${request.address}, ${request.commune}`],
                [t.recurrence, recurrenceLabel(request.recurrence)],
                [
                  t.daysPerWeek,
                  request.daysPerWeek ? cleaningTexts.missionDetail.daysPerWeek(request.daysPerWeek) : null,
                ],
                [t.requestedTeam, request.requestedTeamSize ? t.agents(request.requestedTeamSize) : null],
                [t.recommendedTeam, t.agents(request.recommendedTeamSize)],
                [
                  t.estimate,
                  request.estimate
                    ? `${formatXof(request.estimate.low)} – ${formatXof(request.estimate.high)}`
                    : null,
                ],
                [
                  t.preferredSlots,
                  <ul key="slots" className="grid gap-1">
                    {request.preferredSlots.map((slot) => (
                      <li key={slot.start}>{formatSlot(slot)}</li>
                    ))}
                  </ul>,
                ],
                [t.comment, request.comment],
                [t.closingReason, request.closingReason],
              ]}
            />
          </Panel>

          {OPEN.has(request.status) ? (
            <div className="grid justify-items-start gap-2">
              <ReasonAction
                label={t.cancelRequest}
                title={t.cancelTitle}
                hint={t.cancelHint}
                confirmLabel={t.confirmCancel}
                tone="danger"
                onConfirm={act((reason) => cancelRequest(request.id, reason), j.cancelled)}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
