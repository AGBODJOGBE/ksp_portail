'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { IconCalendar } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { contextKey, useSession } from '@/lib/api';
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
import { type OrganizationRole, useOrganizationRole } from '@/features/identity';
import {
  type CancelReason,
  cancelRequest,
  changeVisitSlot,
  getRequest,
  requestReactivation,
} from '@/features/cleaning/api';
import { MAX_COMMENT, type SlotDraft, buildSlots } from '@/features/cleaning/draft';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/lib/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { requestTexts as t } from '@/features/cleaning/request-texts';
import { describeSchedule } from '@/features/cleaning/schedule';
import type { CleaningRequest, Visit } from '@/features/cleaning/schemas';
import {
  CANCELLABLE_STATUSES,
  CLOSED_STATUSES,
  REQUEST_STAGES,
  feeStatus,
  requestStage,
  requestStatus,
  visitCancelCause,
  visitStatus,
} from '@/features/cleaning/status-texts';
import { CURRENT_TERMS_VERSION } from '@/features/cleaning/terms';
import { cleaningTexts } from '@/features/cleaning/texts';
import { AgentList } from './agents';
import { Panel, SelectField, SummaryRow, TextAreaField } from '@/components/ui/form-fields';
import { QuoteHistory, QuoteSection } from './quote-section';
import { PricingFigures } from './simulation-result';
import { SlotFields } from './slot-fields';
import { VisitFeePay } from './visit-fee-pay';

/**
 * Page d'une demande de devis (`/mon-espace/nettoyage/demandes/[id]`) : numéro DN, frise d'étapes,
 * action du moment selon le statut (frais de visite, visite programmée et changement de créneau,
 * réactivation d'un devis expiré), devis, visites, demande telle qu'envoyée, frais de visite et leurs
 * reçus, annulation. Tout vient de la gateway ; un changement de contexte relit la demande.
 */
export function RequestDetail({ id }: { id: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <Detail key={`${key}-${id}`} id={id} />;
}

function Detail({ id }: { id: string }) {
  const load = useCallback(() => getRequest(id), [id]);
  const resource = useResource(load);
  const role = useOrganizationRole();
  const state = resource.state;

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-24" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
        <Skeleton className="rounded-card h-56" />
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandTitle
            back={{ href: cleaningPaths.requests, label: t.back }}
            title={cleaningTexts.space.title}
          />
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
          <FormMessage>{view.kind === 'notFound' ? t.notFound : errorWithReference(view)}</FormMessage>
          {view.kind === 'notFound' ? null : (
            <Button variant="secondary" onClick={resource.reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const request = state.data;
  const status = requestStatus(request.status);
  const quote = request.currentQuote;
  return (
    <div className="grid gap-8 max-lg:pb-20">
      <BandHeader overlap={<Stages status={request.status} />}>
        <BandTitle
          back={{ href: cleaningPaths.requests, label: t.back }}
          eyebrow={t.eyebrow(request.number)}
          title={request.place.name}
          lead={`${request.place.placeTypeName} · ${request.place.communeName}${request.cleaningTypes.length ? ` · ${request.cleaningTypes.map((type) => type.name).join(', ')}` : ''}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <span className="text-small text-ink-muted">
              {t.createdAt(formatShortDate(request.createdAt))}
            </span>
          </div>
        </BandTitle>
      </BandHeader>

      <NowPanel request={request} role={role} onChanged={resource.refresh} onReplace={resource.set} />
      {(request.status === 'awaiting_visit_fee' || request.status === 'quote_sent') &&
      role !== 'org_viewer' ? (
        <MobileActionBar
          href={request.status === 'quote_sent' ? '#devis' : '#maintenant'}
          label={request.status === 'quote_sent' ? t.seeQuote : t.stickyPay}
        />
      ) : null}

      {quote ? (
        <QuoteSection request={request} quote={quote} role={role} onChanged={resource.refresh} />
      ) : null}
      <QuoteHistory quotes={request.quoteHistory} />

      {request.visits.length ? <Visits visits={request.visits} /> : null}

      <YourRequest request={request} />
      <VisitFees request={request} />

      {CANCELLABLE_STATUSES.has(request.status) && role !== 'org_viewer' ? (
        <CancelPanel request={request} onReplace={resource.set} />
      ) : null}
    </div>
  );
}

/** Frise : demande, frais de visite, visite, devis, programme. */
function Stages({ status }: { status: string }) {
  const current = requestStage(status);
  const closed = CLOSED_STATUSES.has(status);
  return (
    <div className="rounded-card border-line bg-surface border p-4 shadow-sm sm:p-5">
      <ol aria-label={t.stagesLabel} className="grid grid-cols-5 gap-2">
        {REQUEST_STAGES.map((label, index) => {
          const done = index < current || (status === 'accepted' && index <= current);
          const isCurrent = index === current && !done && !closed;
          return (
            <li key={label} className="grid gap-2" aria-current={isCurrent ? 'step' : undefined}>
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 rounded-full',
                  done ? 'bg-action' : isCurrent ? 'bg-accent progress-grow' : 'bg-line',
                  closed && 'opacity-50',
                )}
              />
              <span
                className={cn(
                  'text-xs leading-tight sm:text-sm',
                  isCurrent ? 'text-ink font-semibold' : 'text-ink-muted',
                )}
              >
                {label}
                <span className="sr-only">
                  {done ? ` (${t.stageDone})` : isCurrent ? ` (${t.stageCurrent})` : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {closed ? <p className="text-small text-ink-muted mt-3">{t.closedStage}</p> : null}
    </div>
  );
}

/** Action du moment selon le statut de la demande. */
function NowPanel({
  request,
  role,
  onChanged,
  onReplace,
}: {
  request: CleaningRequest;
  role: OrganizationRole;
  onChanged: () => void;
  onReplace: (request: CleaningRequest) => void;
}) {
  const readOnly = role === 'org_viewer';
  const visit =
    request.visits.find((item) => item.status === 'scheduled' || item.status === 'in_progress') ?? null;
  const body = (() => {
    switch (request.status) {
      case 'awaiting_visit_fee':
        return {
          title: t.feeTitle,
          content: readOnly ? (
            <FormMessage tone="info">{t.readOnly}</FormMessage>
          ) : (
            <VisitFeePay requestId={request.id} fee={request.visitFee} onChanged={onChanged} />
          ),
        };
      case 'visit_to_schedule':
        return {
          title: t.toScheduleTitle,
          content: (
            <div className="grid gap-3">
              <p className="text-ink">{t.toScheduleText}</p>
              <p className="text-small text-ink-muted font-semibold">{t.yourSlots}</p>
              <ul className="grid gap-1">
                {request.visitSlots.map((slot) => (
                  <li key={slot.start} className="text-ink flex items-center gap-2">
                    <IconCalendar className="text-brand-ink size-4" />
                    {formatSlot(slot)}
                  </li>
                ))}
              </ul>
            </div>
          ),
        };
      case 'visit_scheduled':
        return {
          title: t.scheduledTitle,
          content: (
            <div className="grid gap-5">
              {visit ? <VisitCard visit={visit} /> : null}
              {readOnly ? null : <ChangeSlot request={request} onReplace={onReplace} />}
            </div>
          ),
        };
      case 'visit_missed':
        return { title: t.missedTitle, content: <p className="text-ink">{t.missedText}</p> };
      case 'visit_done':
        return { title: t.doneTitle, content: <p className="text-ink">{t.doneText}</p> };
      case 'quote_sent':
        return {
          title: t.quoteReadyTitle,
          content: (
            <div className="grid justify-items-start gap-3">
              <p className="text-ink">
                {t.quoteReadyText(
                  request.currentQuote?.validUntil ? formatDateTime(request.currentQuote.validUntil) : null,
                )}
              </p>
              <ButtonLink href="#devis" variant="action" size="lg">
                {t.seeQuote}
              </ButtonLink>
            </div>
          ),
        };
      case 'accepted':
        return {
          title: t.acceptedTitle,
          content: (
            <div className="grid justify-items-start gap-3">
              <p className="text-ink">{t.acceptedText}</p>
              {request.programId ? (
                <ButtonLink href={cleaningPaths.program(request.programId)} variant="action" size="lg">
                  {t.seeProgram}
                </ButtonLink>
              ) : null}
            </div>
          ),
        };
      case 'expired':
        return {
          title: t.expiredTitle,
          content: <Reactivation request={request} readOnly={readOnly} onReplace={onReplace} />,
        };
      case 'declined':
        return { title: t.declinedTitle, content: <Closed text={t.declinedText} /> };
      case 'cancelled':
        return { title: t.cancelledTitle, content: <Closed text={t.cancelledText} /> };
      case 'rejected':
        return { title: t.rejectedTitle, content: <Closed text={t.rejectedText} /> };
      default:
        return null;
    }
  })();
  if (!body) return null;
  const urgent = request.status === 'awaiting_visit_fee' || request.status === 'quote_sent';
  return (
    <section
      id="maintenant"
      aria-labelledby="maintenant-titre"
      className={cn(
        'scroll-mt-24',
        'rounded-panel bg-surface border p-5 shadow-xs sm:p-8',
        urgent ? 'border-action-muted signature-edge' : 'border-line',
      )}
    >
      <p className="text-eyebrow text-ink-muted font-semibold uppercase">{t.nowTitle}</p>
      <h2 id="maintenant-titre" className="font-display text-h3 text-ink mt-2 font-semibold">
        {body.title}
      </h2>
      {request.warnings.includes('organization_unpaid_invoices') && request.status !== 'quote_sent' ? (
        <FormMessage tone="info" className="mt-4">
          {t.warningsUnpaid}
        </FormMessage>
      ) : null}
      <div className="mt-5">{body.content}</div>
    </section>
  );
}

function Closed({ text }: { text: string }) {
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-ink">{text}</p>
      <ButtonLink href={cleaningPaths.request} variant="secondary">
        {t.newRequest}
      </ButtonLink>
    </div>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  return (
    <div className="grid gap-4">
      <p className="text-ink text-lg font-semibold">
        {t.scheduledText(`${formatDate(visit.scheduledAt)} à ${formatTime(visit.scheduledAt)}`)}
      </p>
      <p className="text-small text-ink-muted">{t.duration(formatDuration(visit.durationMinutes))}</p>
      <AgentList agents={visit.agents} />
    </div>
  );
}

function ChangeSlot({
  request,
  onReplace,
}: {
  request: CleaningRequest;
  onReplace: (request: CleaningRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<SlotDraft[]>([{ date: '', from: '08:00', to: '12:00' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [done, setDone] = useState(false);
  const submission = useRef(idempotentSubmission());

  async function send() {
    const built = buildSlots(slots);
    setErrors(built.errors);
    if (Object.keys(built.errors).length) return;
    setBusy(true);
    setProblem(null);
    try {
      const updated = await changeVisitSlot(request.id, built.slots, submission.current.keyFor(built.slots));
      submission.current.done();
      setDone(true);
      setOpen(false);
      onReplace(updated);
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      if (view.kind === 'fields') setErrors(view.fields);
      setProblem(view);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <FormMessage tone="success">{t.changeSlotDone}</FormMessage>;
  if (!open) {
    return (
      <Button variant="secondary" className="justify-self-start" onClick={() => setOpen(true)}>
        {t.changeSlot}
      </Button>
    );
  }
  return (
    <form
      className="swap-in rounded-card border-line bg-surface-muted grid gap-4 border p-4 sm:p-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <p className="text-small text-ink-muted">{t.changeSlotHint}</p>
      <SlotFields idPrefix="nouveau-creneau" slots={slots} onChange={setSlots} errors={errors} />
      {problem && problem.kind !== 'fields' ? <FormMessage>{errorWithReference(problem)}</FormMessage> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="action" disabled={busy}>
          {t.changeSlotSubmit}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          {t.cancelKeep}
        </Button>
      </div>
    </form>
  );
}

function Reactivation({
  request,
  readOnly,
  onReplace,
}: {
  request: CleaningRequest;
  readOnly: boolean;
  onReplace: (request: CleaningRequest) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const submission = useRef(idempotentSubmission());
  const reactivation = request.reactivation;
  if (reactivation) {
    const text =
      reactivation.status === 'pending'
        ? t.reactivationPending
        : reactivation.status === 'accepted'
          ? t.reactivationAccepted
          : t.reactivationRefused;
    return <FormMessage tone="info">{text}</FormMessage>;
  }
  return (
    <div className="grid justify-items-start gap-3">
      <p className="text-ink">{t.expiredText}</p>
      {readOnly ? null : (
        <Button
          variant="action"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setProblem(null);
            try {
              onReplace(await requestReactivation(request.id, submission.current.keyFor(request.id)));
              submission.current.done();
            } catch (error) {
              setProblem(describeCleaningError(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t.reactivate}
        </Button>
      )}
      {problem ? <FormMessage>{errorWithReference(problem)}</FormMessage> : null}
    </div>
  );
}

function Visits({ visits }: { visits: ReadonlyArray<Visit> }) {
  return (
    <Panel id="visites-titre" title={t.visitsTitle}>
      <ul className="grid gap-4">
        {visits.map((visit) => {
          const status = visitStatus(visit.status);
          const cause = visitCancelCause(visit.cancelCause);
          return (
            <li key={visit.id} className="border-line grid gap-3 border-b pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink font-semibold">{formatDateTime(visit.scheduledAt)}</p>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
              {cause && visit.status === 'cancelled' ? (
                <p className="text-small text-ink-muted">{t.visitCancelled(cause)}</p>
              ) : null}
              <AgentList agents={visit.agents} />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function YourRequest({ request }: { request: CleaningRequest }) {
  return (
    <Panel id="ma-demande-titre" title={t.yourRequestTitle}>
      <div className="grid gap-6 lg:grid-cols-12">
        <dl className="lg:col-span-7">
          <SummaryRow label={t.place}>{`${request.place.name} — ${request.place.communeName}`}</SummaryRow>
          {request.cleaningTypes.length ? (
            <SummaryRow label={t.types}>
              {request.cleaningTypes.map((type) => type.name).join(', ')}
            </SummaryRow>
          ) : null}
          {request.freeDescription ? (
            <SummaryRow label={t.need}>
              <span className="whitespace-pre-line">{request.freeDescription}</span>
            </SummaryRow>
          ) : null}
          {request.declaredRows.map((row) => (
            <SummaryRow key={row.code} label={row.label}>
              {row.display}
            </SummaryRow>
          ))}
          <SummaryRow label={t.schedule}>{describeSchedule(request.schedule)}</SummaryRow>
          {request.comment ? (
            <SummaryRow label={t.comment}>
              <span className="whitespace-pre-line">{request.comment}</span>
            </SummaryRow>
          ) : null}
          {request.photos.length ? (
            <SummaryRow label={t.photos(request.photos.length)}>{' '}</SummaryRow>
          ) : null}
        </dl>
        <div className="rounded-card border-line bg-surface-muted border p-4 lg:col-span-5">
          <h3 className="text-ink font-semibold">{t.declaredEstimate}</h3>
          <div className="mt-3">
            <PricingFigures pricing={request.declaredPricing} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function VisitFees({ request }: { request: CleaningRequest }) {
  const fees = request.visitFees.length ? request.visitFees : [request.visitFee];
  return (
    <Panel id="frais-titre" title={t.feesTitle}>
      <ul className="grid gap-3">
        {fees.map((fee) => {
          const status = feeStatus(fee.status);
          const when = fee.refundedAt
            ? t.feeRefundedAt(formatShortDate(fee.refundedAt))
            : fee.paidAt
              ? t.feePaidAt(formatShortDate(fee.paidAt))
              : fee.payBefore && fee.status === 'awaiting_payment'
                ? t.feePayBefore(formatDateTime(fee.payBefore))
                : null;
          return (
            <li
              key={fee.id}
              className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div className="grid gap-1">
                <p className="text-ink font-semibold">
                  {t.feeRank(fee.rank)}
                  {fee.amount ? <span className="tabular-nums"> · {formatXof(fee.amount)}</span> : null}
                </p>
                <p className="text-small text-ink-muted flex flex-wrap items-center gap-2">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {when}
                </p>
              </div>
              {fee.invoiceId ? (
                <Link
                  href={`/mon-espace/factures/${encodeURIComponent(fee.invoiceId)}`}
                  className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                >
                  {t.receipt}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** Effet de l'annulation sur les frais, d'après les règles du back (sans délai écrit en chiffres). */
function cancelEffect(request: CleaningRequest): string {
  if (request.visitFee.status === 'awaiting_payment') return t.cancelUnpaid;
  if (request.status === 'visit_done' || request.status === 'quote_sent') return t.cancelAfterVisit;
  const visit = request.visits.find((item) => item.status === 'scheduled');
  if (request.status === 'visit_scheduled' && visit)
    return t.cancelScheduled(formatDateTime(visit.scheduledAt));
  return t.cancelBeforeVisit;
}

function CancelPanel({
  request,
  onReplace,
}: {
  request: CleaningRequest;
  onReplace: (request: CleaningRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancelReason | ''>('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const submission = useRef(idempotentSubmission());

  async function cancel() {
    setBusy(true);
    setProblem(null);
    const body = {
      ...(reason ? { reasonCode: reason } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };
    try {
      const updated = await cancelRequest(request.id, body, submission.current.keyFor(body));
      submission.current.done();
      setOpen(false);
      onReplace(updated);
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      setProblem(view);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="annuler-titre"
      className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
    >
      <h2 id="annuler-titre" className="font-display text-h3 text-ink font-semibold">
        {t.cancelTitle}
      </h2>
      <p className="text-ink mt-3">{cancelEffect(request)}</p>
      <Link
        href={`${cleaningPaths.terms(request.currentQuote?.termsVersion ?? CURRENT_TERMS_VERSION)}#frais-de-visite`}
        target="_blank"
        className="text-small text-brand-ink mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
      >
        {t.cancelRulesLink}
      </Link>
      {open ? (
        <form
          className="swap-in mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void cancel();
          }}
        >
          <SelectField
            id="annuler-motif"
            label={t.cancelReason}
            value={reason}
            onChange={(event) => setReason(event.target.value as CancelReason | '')}
            className="sm:max-w-sm"
          >
            <option value="">—</option>
            {(Object.keys(t.cancelReasons) as CancelReason[]).map((code) => (
              <option key={code} value={code}>
                {t.cancelReasons[code]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            id="annuler-precision"
            label={t.cancelComment}
            value={comment}
            maxLength={Math.min(MAX_COMMENT, 500)}
            rows={3}
            onChange={(event) => setComment(event.target.value)}
          />
          {problem ? <FormMessage>{errorWithReference(problem)}</FormMessage> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? t.cancelling : t.cancelConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {t.cancelKeep}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="danger" className="mt-2" onClick={() => setOpen(true)}>
          {t.cancelTitle}
        </Button>
      )}
    </section>
  );
}

/** Action du moment fixée en bas de l'écran du téléphone (frais à régler, devis à lire). */
function MobileActionBar({ href, label }: { href: string; label: string }) {
  return (
    <div className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 shadow-[0_-8px_24px_-16px_rgb(15_40_80/0.35)] backdrop-blur lg:hidden">
      <ButtonLink href={href} variant="action" className="w-full">
        {label}
      </ButtonLink>
    </div>
  );
}
