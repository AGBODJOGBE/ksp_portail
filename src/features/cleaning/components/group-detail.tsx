'use client';

import Link from 'next/link';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { IconArrowRight } from '@/components/ui/icons';
import { StepTimeline } from '@/components/ui/step-timeline';
import { WalletPay, walletTexts } from '@/features/wallet';
import { formatDateTime, formatShortDate, formatXof, isPast } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { cancelRequestGroup, getMission, getRequestGroup, payMission } from '@/features/cleaning/api';
import { type CleaningErrorView, describeCleaningError } from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { journeyTexts } from '@/features/cleaning/journey-texts';
import { groupStage, LIFECYCLE, STEP } from '@/features/cleaning/lifecycle';
import { cleaningPaths } from '@/features/cleaning/paths';
import { paymentDue, paymentExpected } from '@/features/cleaning/payment-due';
import type { GroupOutcome, PlaceCatalog, QuoteRequest, RequestGroup } from '@/features/cleaning/schemas';
import { spaceTexts } from '@/features/cleaning/space-texts';
import { cleaningTexts, requestStatuses, statusOf } from '@/features/cleaning/texts';
import { BackLink, Loading, NextStep, Panel } from './detail-parts';
import { ReasonAction } from './reason-action';
import { placeLabel, usePlaceCatalog } from './request-group';

// Le formulaire d'acceptation n'est téléchargé que si le client choisit d'accepter.
const GroupAccept = lazy(() => import('./group-accept').then((m) => ({ default: m.GroupAccept })));

const t = spaceTexts.group;
const OPEN = new Set(['received', 'visit_scheduled', 'quote_sent']);

const nameOf = (catalog: PlaceCatalog | null) => (code: string) =>
  catalog?.services.find((service) => service.code === code)?.name ?? code;

/** Devis encore acceptables : envoyés et dans leur date de validité. */
function acceptable(group: RequestGroup): QuoteRequest[] {
  return group.items.filter(
    (request) => request.status === 'quote_sent' && request.quote && !isPast(request.quote.validUntil),
  );
}

/** Prochaine étape du groupe et son texte, d'après les états de ses demandes (la gateway en est juge). */
function nextText(group: RequestGroup, quotes: number): string {
  if (quotes) return t.nextQuotes(quotes);
  const open = group.items.filter((request) => OPEN.has(request.status));
  if (open.some((request) => request.visit?.status === 'completed')) return t.nextQuotePending;
  const planned = open.find((request) => request.visit?.status === 'scheduled');
  if (planned?.visit) return t.nextVisitOn(formatDateTime(planned.visit.scheduledAt));
  if (open.length) return t.nextVisit;
  if (group.items.some((request) => request.status === 'accepted')) return t.nextBooked;
  return t.nextClosed;
}

/**
 * Après l'acceptation : le paiement par le portefeuille de chaque mission créée, s'il est attendu
 * maintenant. Après une recharge, le client revient sur la fiche de la mission pour payer.
 */
function MissionPayment({ id, name }: { id: string; name: (code: string) => string }) {
  const mission = useResource(useCallback(() => getMission(id), [id]));
  const [paid, setPaid] = useState<string | null>(null);
  if (mission.state.status === 'loading') {
    return (
      <p role="status" className="text-small text-ink-muted">
        {spaceTexts.outcome.loadingMission}
      </p>
    );
  }
  if (mission.state.status === 'error') {
    return <FormMessage>{describeCleaningError(mission.state.error).message}</FormMessage>;
  }
  const data = mission.state.data;
  const due = paymentExpected(data) ? paymentDue(data) : null;
  return (
    <li className="rounded-control border-line grid gap-3 border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink font-semibold">{name(data.serviceCode)}</p>
        <Link
          href={cleaningPaths.mission(data.id)}
          className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {t.seeMission}
          <IconArrowRight className="size-4" />
        </Link>
      </div>
      <FormMessage tone="success">{paid}</FormMessage>
      {due ? (
        <WalletPay
          pay={(key) => payMission(data.id, due.part, key)}
          label={due.part === 'deposit' ? walletTexts.payDeposit : walletTexts.pay}
          amount={due.amount}
          returnTo={cleaningPaths.mission(data.id)}
          onPaid={(updated, notice) => {
            mission.set(updated);
            setPaid(notice);
          }}
          onStale={mission.refresh}
        />
      ) : paid ? null : (
        <p className="text-small text-ink-muted">{spaceTexts.outcome.noPayNow}</p>
      )}
    </li>
  );
}

/** Résultat d'une acceptation ou d'une annulation : ce qui a changé, ce qui a été laissé de côté. */
function Outcome({
  outcome,
  kind,
  name,
}: {
  outcome: GroupOutcome;
  kind: 'accept' | 'cancel';
  name: (code: string) => string;
}) {
  const requests = new Map(outcome.group.items.map((request) => [request.id, request]));
  return (
    <section
      aria-labelledby="resultat-titre"
      className="rounded-card border-action-muted bg-action-soft grid gap-5 border p-5 sm:p-6"
    >
      <div role="status" className="grid gap-1">
        <h2 id="resultat-titre" className="font-display text-ink text-xl font-semibold">
          {kind === 'accept' ? spaceTexts.outcome.title : t.cancelled}
        </h2>
        <p className="text-ink">
          {kind === 'accept'
            ? spaceTexts.outcome.booked(outcome.missionIds.length)
            : spaceTexts.outcome.cancelledCount(outcome.affectedRequestIds.length)}
        </p>
      </div>
      {outcome.skipped.length ? (
        <div className="grid gap-1">
          <p className="text-small text-ink-muted font-semibold">{spaceTexts.outcome.skippedTitle}</p>
          <ul className="text-small text-ink grid gap-1">
            {outcome.skipped.map((item) => {
              const request = requests.get(item.requestId);
              return (
                <li key={item.requestId}>
                  {request ? (request.serviceName ?? name(request.serviceCode)) : item.requestId} :{' '}
                  {spaceTexts.skipped[item.reason] ?? item.reason}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {kind === 'accept' && outcome.missionIds.length ? (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <h3 className="text-ink font-semibold">{spaceTexts.outcome.payTitle}</h3>
            <p className="text-small text-ink-muted">{spaceTexts.outcome.payLead}</p>
          </div>
          <ul className="grid gap-3">
            {outcome.missionIds.map((missionId) => (
              <MissionPayment key={missionId} id={missionId} name={name} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Une prestation du groupe : état, devis, lien vers la demande ou la mission. */
function GroupItem({ request, name }: { request: QuoteRequest; name: (code: string) => string }) {
  const status = statusOf(requestStatuses, request.status);
  const label = request.serviceName ?? name(request.serviceCode);
  return (
    <li className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid min-w-0 gap-1.5">
        <p className="text-ink font-semibold">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          {request.quote ? (
            <span className="text-small text-ink tabular-nums">
              {t.quoteOf(formatXof(request.quote.total))}
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={
          request.missionId ? cleaningPaths.mission(request.missionId) : cleaningPaths.request(request.id)
        }
        className="text-action-ink inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        {request.missionId ? t.seeMission : journeyTexts.group.seeRequest}
        <span className="sr-only"> : {label}</span>
        <IconArrowRight className="size-4" />
      </Link>
    </li>
  );
}

/**
 * Suivi d'une demande groupée (`GET /cleaning/quote-request-groups/{id}`, adresse des messages
 * regroupés, ADR-035) : frise de la prestation, une action principale (accepter les devis en une fois),
 * prestations et montants, annulation de ce qui est encore ouvert, puis paiement par le portefeuille des
 * missions créées.
 */
export function RequestGroupDetail({ id }: { id: string }) {
  const catalog = usePlaceCatalog();
  const name = nameOf(catalog);
  const group = useResource(useCallback(() => getRequestGroup(id), [id]));
  const [accepting, setAccepting] = useState(false);
  const [outcome, setOutcome] = useState<{ value: GroupOutcome; kind: 'accept' | 'cancel' } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelSubmission = useRef(idempotentSubmission());

  const afterFailure = useCallback(
    (view: CleaningErrorView) => {
      setNotice(view.message);
      setAccepting(false);
      group.refresh();
    },
    [group],
  );

  if (group.state.status === 'loading') return <Loading />;
  if (group.state.status === 'error') {
    const view = describeCleaningError(group.state.error);
    return (
      <div className="grid justify-items-start gap-4">
        <BackLink />
        <FormMessage>{view.message}</FormMessage>
        {view.kind === 'notFound' ? null : (
          <Button variant="secondary" onClick={group.reload}>
            {cleaningTexts.common.retry}
          </Button>
        )}
      </div>
    );
  }

  const data = group.state.data;
  const quotes = acceptable(data);
  const stage = groupStage(data.items);
  const business = data.items.some((request) => request.customerKind === 'business');
  const open = data.items.some((request) => OPEN.has(request.status));

  async function cancel(reason: string): Promise<string | null> {
    const key = cancelSubmission.current.keyFor({ reason });
    try {
      const result = await cancelRequestGroup(data.groupId, reason, key);
      cancelSubmission.current.done();
      setOutcome({ value: result, kind: 'cancel' });
      setNotice(null);
      group.set(result.group);
      return null;
    } catch (caught) {
      const view = describeCleaningError(caught);
      if (view.kind === 'stale') {
        afterFailure(view);
        return null;
      }
      return view.message;
    }
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <BackLink />
        <Heading as="h1" size="h2">
          {journeyTexts.group.title}
        </Heading>
        <p className="text-ink-muted">
          {journeyTexts.group.placeAndCommune(placeLabel(catalog, data.placeType), data.commune)} ·{' '}
          {journeyTexts.group.sentOn(formatDateTime(data.createdAt))}
        </p>
      </div>

      <StepTimeline
        steps={LIFECYCLE}
        current={stage.current}
        stopped={stage.stopped}
        label={spaceTexts.lifecycle.label}
        currentLabel={spaceTexts.lifecycle.current}
        stoppedLabel={spaceTexts.lifecycle.stopped}
      />

      <FormMessage tone="info">{notice}</FormMessage>
      {outcome ? <Outcome outcome={outcome.value} kind={outcome.kind} name={name} /> : null}

      {!outcome || outcome.kind === 'cancel' ? (
        <NextStep
          actor={quotes.length ? 'client' : open ? 'ksp' : undefined}
          text={nextText(data, quotes.length)}
        >
          {quotes.length && !accepting ? (
            <Button size="lg" variant="action" onClick={() => setAccepting(true)}>
              {t.acceptAll}
            </Button>
          ) : null}
          {!open && stage.current < STEP.accepted ? (
            <ButtonLink href={cleaningPaths.journey} variant="secondary">
              {cleaningTexts.journey.newRequest}
            </ButtonLink>
          ) : null}
        </NextStep>
      ) : null}

      {accepting && quotes.length ? (
        <Suspense fallback={<Loading />}>
          <GroupAccept
            group={data}
            quotes={quotes}
            names={name}
            business={business}
            onAccepted={(result) => {
              setOutcome({ value: result, kind: 'accept' });
              setAccepting(false);
              group.set(result.group);
            }}
            onFailure={afterFailure}
            onCancel={() => setAccepting(false)}
          />
        </Suspense>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Panel id="prestations-titre" title={t.requestsTitle}>
          <ul className="divide-line -my-4 divide-y">
            {data.items.map((request) => (
              <GroupItem key={request.id} request={request} name={name} />
            ))}
          </ul>
        </Panel>
        <aside className="grid gap-8">
          {data.quotesTotal || data.remainingDue ? (
            <Panel id="montants-titre" title={t.totalsTitle}>
              <dl className="grid gap-3">
                {data.quotesTotal ? (
                  <div>
                    <dt className="text-small text-ink-muted">{journeyTexts.group.quotesTotal}</dt>
                    <dd className="font-display text-ink text-2xl font-semibold tabular-nums">
                      {formatXof(data.quotesTotal)}
                    </dd>
                  </div>
                ) : null}
                {data.remainingDue ? (
                  <div>
                    <dt className="text-small text-ink-muted">{journeyTexts.group.remainingDue}</dt>
                    <dd className="font-display text-ink text-2xl font-semibold tabular-nums">
                      {formatXof(data.remainingDue)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Panel>
          ) : null}
          <p className="text-small text-ink-muted">
            {journeyTexts.group.reference} : <span className="font-mono break-all">{data.groupId}</span> ·{' '}
            {formatShortDate(data.createdAt)}
          </p>
          {open ? (
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
