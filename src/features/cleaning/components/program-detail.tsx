'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { IconAlert, IconArrowRight } from '@/components/ui/icons';
import { MonthCalendar } from '@/components/ui/month-calendar';
import { PagedListState } from '@/components/ui/paged-list-state';
import { Skeleton } from '@/components/ui/skeleton';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { beninDate, formatDate, formatShortDate, formatTime, formatXof } from '@/lib/format';
import { usePagedList } from '@/lib/use-paged-list';
import { useResource } from '@/lib/use-resource';
import { type OrganizationRole, useOrganizationRole } from '@/features/identity';
import {
  getProgram,
  getQuote,
  listProgramSessions,
  renewProgram,
  stopProgram,
} from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/features/cleaning/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { programTexts as t } from '@/features/cleaning/program-texts';
import { describeSchedule } from '@/features/cleaning/schedule';
import type { CleaningRequest, ProgramDetail as Program, Session } from '@/features/cleaning/schemas';
import {
  ACTIVE_PROGRAM_STATUSES,
  isPayable,
  programStatus,
  sessionCalendarTone,
  sessionPaymentStatus,
  sessionStatus,
  suspensionCause,
} from '@/features/cleaning/status-texts';
import { CURRENT_TERMS_VERSION } from '@/features/cleaning/terms';
import { cleaningTexts } from '@/features/cleaning/texts';
import { Panel, SummaryRow } from './fields';
import { ProgramProgress } from './program-list';

/**
 * R-PG-07 (`RENEWAL_WINDOW_DAYS` du back) : le renouvellement s'ouvre 14 jours avant la dernière séance.
 * Sert seulement à proposer le bouton au bon moment ; la gateway reste juge (`CLEANING_RENEWAL_NOT_ALLOWED`).
 */
const RENEWAL_WINDOW_MS = 14 * 86_400_000;
/** Séances lues pour un mois (le contrat en permet 100 par page). */
const MONTH_PAGE = 100;

/** Peut agir (membre ou plus) ; peut décider (administrateur, ou compte personnel). */
const canAct = (role: OrganizationRole) => role !== 'org_viewer';
const canDecide = (role: OrganizationRole) => role !== 'org_viewer' && role !== 'org_member';

/**
 * Page d'un programme (`/mon-espace/nettoyage/programmes/[id]`, adresse des notifications) : numéro PN,
 * état, avancement, causes de suspension et façon de les lever, renouvellement proposé, calendrier mois
 * par mois et séances du mois, actions du rôle (arrêter, renouveler, commander à nouveau). Tout vient de
 * la gateway ; un changement de contexte relit le programme.
 */
export function ProgramDetail({ id }: { id: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <Detail key={`${key}-${id}`} id={id} />;
}

function Detail({ id }: { id: string }) {
  const load = useCallback(() => getProgram(id), [id]);
  const resource = useResource(load);
  const role = useOrganizationRole();
  const state = resource.state;

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.detailLoading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-24" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-48" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
        <Skeleton className="rounded-card h-72" />
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describeCleaningError(state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandTitle
            back={{ href: cleaningPaths.programs, label: t.back }}
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

  const program = state.data;
  const status = programStatus(program.status);
  // Renouvellement proposé par KSP : en tête ; sinon après les séances.
  const renewalFirst = program.renewal?.status === 'proposed';
  return (
    <div className="grid gap-8">
      <BandHeader overlap={<Overview program={program} />}>
        <BandTitle
          back={{ href: cleaningPaths.programs, label: t.back }}
          eyebrow={t.eyebrow(program.number)}
          title={program.place.name}
          lead={`${program.place.placeTypeName} · ${program.place.communeName}${program.cleaningTypes.length ? ` · ${program.cleaningTypes.map((type) => type.name).join(', ')}` : ''}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <span className="text-small text-ink-muted">
              {t.createdAt(formatShortDate(program.createdAt))}
            </span>
          </div>
        </BandTitle>
      </BandHeader>

      {program.status === 'suspended' ? <Suspension program={program} /> : null}
      {renewalFirst ? <RenewalPanel program={program} role={role} /> : null}
      {program.schedule.kind === 'one_off' && program.status === 'completed' && canAct(role) ? (
        <Panel id="commander-titre" title={t.reorderTitle}>
          <div className="grid justify-items-start gap-4">
            <p className="text-ink">{t.reorderText}</p>
            <ButtonLink href={cleaningPaths.reorder(program.id)} variant="action" size="lg">
              {t.reorder}
            </ButtonLink>
          </div>
        </Panel>
      ) : null}

      <Sessions program={program} />
      {renewalFirst ? null : <RenewalPanel program={program} role={role} />}
      <Terms program={program} />
      {ACTIVE_PROGRAM_STATUSES.has(program.status) ? (
        <StopPanel program={program} role={role} onReplace={resource.set} />
      ) : null}
    </div>
  );
}

/** Bloc blanc sous la bande : avancement, rythme, première et dernière séances. */
function Overview({ program }: { program: Program }) {
  return (
    <div className="rounded-card border-line bg-surface grid gap-4 border p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:p-5">
      <ProgramProgress program={program} />
      <dl className="text-small grid gap-1 sm:grid-cols-2 sm:gap-x-6">
        <div className="sm:col-span-2">
          <dt className="sr-only">{t.rhythm}</dt>
          <dd className="text-ink font-medium">{describeSchedule(program.schedule)}</dd>
        </div>
        {program.firstSessionAt ? (
          <div className="flex gap-1.5">
            <dt className="text-ink-muted">{t.firstSession} :</dt>
            <dd className="text-ink">{formatShortDate(program.firstSessionAt)}</dd>
          </div>
        ) : null}
        {program.lastSessionAt ? (
          <div className="flex gap-1.5">
            <dt className="text-ink-muted">{t.lastSession} :</dt>
            <dd className="text-ink">{formatShortDate(program.lastSessionAt)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/** Programme suspendu : chaque cause, depuis quand, et comment la lever. */
function Suspension({ program }: { program: Program }) {
  return (
    <section
      aria-labelledby="suspension-titre"
      className="rounded-panel border-warning bg-surface signature-edge border p-5 shadow-xs sm:p-8"
    >
      <h2
        id="suspension-titre"
        className="font-display text-h3 text-ink flex items-center gap-2 font-semibold"
      >
        <IconAlert className="text-warning size-5" />
        {t.suspendedTitle}
      </h2>
      <p className="text-ink-muted mt-2">{t.suspendedLead}</p>
      <ul className="mt-5 grid gap-4">
        {program.suspensionCauses.map((item) => {
          const cause = suspensionCause(item.cause);
          return (
            <li key={`${item.cause}-${item.since}`} className="border-line grid gap-2 border-l-4 pl-4">
              <p className="text-ink font-semibold">
                {cause.label}{' '}
                <span className="text-ink-muted font-normal">({t.since(formatShortDate(item.since))})</span>
              </p>
              {item.reason ? <p className="text-small text-ink">{t.reason(item.reason)}</p> : null}
              <p className="text-ink">{cause.fix}</p>
              {item.cause === 'unpaid_invoices' ? (
                <InlineLink href={cleaningPaths.unpaidInvoices}>{t.seeInvoices}</InlineLink>
              ) : item.cause === 'ksp_decision' || item.cause === 'organization_suspended' ? (
                <InlineLink href={cleaningPaths.support}>{t.contact}</InlineLink>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InlineLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-brand-ink inline-flex min-h-11 items-center gap-1.5 justify-self-start font-semibold underline underline-offset-4 hover:no-underline"
    >
      {children}
      <IconArrowRight className="size-4" />
    </Link>
  );
}

/** Lien vers la demande qui porte un devis (le devis n'a pas d'adresse propre). */
function QuoteLink({ quoteId, label }: { quoteId: string; label: string }) {
  const load = useCallback(() => getQuote(quoteId), [quoteId]);
  const { state } = useResource(load);
  if (state.status !== 'ready') return null;
  return (
    <ButtonLink
      href={`${cleaningPaths.requestDetail(state.data.requestId)}#devis`}
      variant="action"
      size="lg"
    >
      {label}
    </ButtonLink>
  );
}

/**
 * Renouvellement : proposé par KSP (`renewal`, lien vers le devis), ou demandé par le client dans les
 * derniers jours d'un programme récurrent (administrateur seulement).
 */
function RenewalPanel({ program, role }: { program: Program; role: OrganizationRole }) {
  const renewal = program.renewal;
  const recurring = program.schedule.kind !== 'one_off';
  const renewable = recurring && ['confirmed', 'in_progress', 'completed'].includes(program.status);
  // Heure lue à l'affichage de la page.
  const [now] = useState(() => Date.now());
  if (!renewal && !renewable) return null;
  const windowOpen =
    !program.lastSessionAt || now >= new Date(program.lastSessionAt).getTime() - RENEWAL_WINDOW_MS;

  let content;
  if (renewal && renewal.status !== 'declined') {
    content = (
      <div className="grid justify-items-start gap-3">
        <p className="text-ink">{renewal.status === 'accepted' ? t.renewalAccepted : t.renewalProposed}</p>
        {renewal.visitRequired && renewal.status === 'proposed' ? (
          <p className="text-small text-ink-muted">{t.renewalVisit}</p>
        ) : null}
        {renewal.quoteId && renewal.status === 'proposed' ? (
          <QuoteLink quoteId={renewal.quoteId} label={t.seeRenewalQuote} />
        ) : null}
      </div>
    );
  } else if (!renewable) {
    content = <p className="text-ink">{t.renewalDeclined}</p>;
  } else if (!windowOpen) {
    content = <p className="text-ink-muted">{t.renewLater}</p>;
  } else if (!canAct(role)) {
    content = <FormMessage tone="info">{t.readOnly}</FormMessage>;
  } else if (!canDecide(role)) {
    content = <FormMessage tone="info">{t.renewAdminOnly}</FormMessage>;
  } else {
    content = <RenewForm program={program} />;
  }
  return (
    <Panel id="renouvellement-titre" title={t.renewalTitle}>
      {content}
    </Panel>
  );
}

function RenewForm({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const [created, setCreated] = useState<CleaningRequest | null>(null);
  const submission = useRef(idempotentSubmission());

  async function send() {
    setBusy(true);
    setProblem(null);
    const body = startDate ? { startDate } : {};
    try {
      setCreated(await renewProgram(program.id, body, submission.current.keyFor(body)));
      submission.current.done();
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      setProblem(view);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage tone="success">{t.renewed(created.number)}</FormMessage>
        <ButtonLink href={cleaningPaths.requestDetail(created.id)} variant="action">
          {t.seeRequest}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="grid justify-items-start gap-4">
      <p className="text-ink">{t.renewText}</p>
      {open ? (
        <form
          className="swap-in grid w-full gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <TextField
            id="renouveler-debut"
            label={t.renewStart}
            hint={t.renewStartHint}
            type="date"
            min={beninDate()}
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            error={problem?.fields['startDate'] ?? null}
            className="sm:max-w-xs"
          />
          {problem && !problem.fields['startDate'] ? (
            <FormMessage>{errorWithReference(problem)}</FormMessage>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="action" disabled={busy}>
              {busy ? t.renewing : t.renewConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              {t.renewCancel}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="action" onClick={() => setOpen(true)}>
          {t.renew}
        </Button>
      )}
    </div>
  );
}

/** Conditions du programme : prix, total, paiement, demande d'origine. */
function Terms({ program }: { program: Program }) {
  return (
    <Panel id="conditions-titre" title={t.termsTitle}>
      <dl>
        {program.sessionPrice ? (
          <SummaryRow label={t.sessionPrice}>{formatXof(program.sessionPrice)}</SummaryRow>
        ) : null}
        {program.total ? (
          <SummaryRow label={t.total} strong>
            {formatXof(program.total)}
          </SummaryRow>
        ) : null}
        <SummaryRow label={t.payment}>
          {program.payerKind === 'organization' ? t.monthlyInvoice : t.perSession}
        </SummaryRow>
      </dl>
      <InlineLink href={cleaningPaths.requestDetail(program.requestId)}>{t.seeRequest}</InlineLink>
    </Panel>
  );
}

/* ——— Séances : calendrier mois par mois ——— */

/** Mois `AAAA-MM` décalé de `delta` mois. */
function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Début d'un mois au Bénin (UTC+1, sans heure d'été), en ISO 8601. */
const monthStart = (month: string) => new Date(`${month}-01T00:00:00+01:00`).toISOString();

const monthOfInstant = (iso: string) => beninDate(new Date(iso)).slice(0, 7);

function Sessions({ program }: { program: Program }) {
  const range = useMemo(
    () =>
      program.firstSessionAt && program.lastSessionAt
        ? { first: monthOfInstant(program.firstSessionAt), last: monthOfInstant(program.lastSessionAt) }
        : null,
    [program.firstSessionAt, program.lastSessionAt],
  );
  const [month, setMonth] = useState(() => {
    const current = beninDate().slice(0, 7);
    if (!range) return current;
    return current < range.first ? range.first : current > range.last ? range.last : current;
  });
  return (
    <Panel id="seances-titre" title={t.sessionsTitle}>
      {range ? (
        <MonthSessions key={month} program={program} month={month} range={range} onMonthChange={setMonth} />
      ) : (
        <p className="text-ink-muted">{t.monthEmpty}</p>
      )}
    </Panel>
  );
}

function MonthSessions({
  program,
  month,
  range,
  onMonthChange,
}: {
  program: Program;
  month: string;
  range: { first: string; last: string };
  onMonthChange: (month: string) => void;
}) {
  const list = usePagedList(
    useCallback(
      (cursor?: string) =>
        listProgramSessions(program.id, {
          from: monthStart(month),
          to: monthStart(shiftMonth(month, 1)),
          cursor,
          limit: MONTH_PAGE,
        }),
      [program.id, month],
    ),
  );
  const marks = list.items.map((session) => {
    const tone = sessionCalendarTone(session.status);
    return {
      date: beninDate(new Date(session.scheduledStart)),
      tone,
      label: `${t.sessionLabel(session.rank, session.sessionsCount)}, ${sessionStatus(session.status).label}`,
    };
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <MonthCalendar
        marks={marks}
        range={range}
        month={month}
        onMonthChange={onMonthChange}
        busy={list.loading}
        label={t.calendarLabel}
        previousLabel={t.previousMonth}
        nextLabel={t.nextMonth}
        monthCount={t.monthCount}
        legend={[
          { tone: 'brand', label: t.legendDone },
          { tone: 'action', label: t.legendPlanned },
          { tone: 'pending', label: t.legendOther },
          { tone: 'muted', label: t.legendClosed },
        ]}
      />
      <PagedListState
        list={list}
        labels={{ ...t, loading: t.monthLoading }}
        empty={<p className="text-ink-muted">{t.monthEmpty}</p>}
      >
        <ul className="grid gap-3">
          {list.items.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </ul>
      </PagedListState>
    </div>
  );
}

/** Une séance du mois : rang, date et heure, état, paiement à faire. */
export function SessionRow({ session, className }: { session: Session; className?: string }) {
  const status = sessionStatus(session.status);
  const pay = isPayable(session.paymentStatus) ? sessionPaymentStatus(session.paymentStatus!) : null;
  return (
    <li
      className={cn(
        'rounded-card border-line bg-surface hover:border-line-strong has-[.stretched-link:focus-visible]:outline-focus relative grid gap-2 border p-4 shadow-xs has-[.stretched-link:focus-visible]:outline-2 has-[.stretched-link:focus-visible]:outline-offset-2 sm:grid-cols-[1fr_auto] sm:items-center',
        pay && 'border-l-warning border-l-4',
        className,
      )}
    >
      <div className="min-w-0">
        <Link
          href={cleaningPaths.session(session.programId, session.id)}
          className="stretched-link text-ink font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
        >
          {`${t.sessionLabel(session.rank, session.sessionsCount)} · ${formatDate(session.scheduledStart)}`}
        </Link>
        <p className="text-small text-ink-muted mt-0.5">
          {t.sessionTime(formatTime(session.scheduledStart), formatTime(session.scheduledEnd))}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
        {pay ? <Badge tone={pay.tone}>{pay.label}</Badge> : null}
      </div>
    </li>
  );
}

/* ——— Arrêt ——— */

function StopPanel({
  program,
  role,
  onReplace,
}: {
  program: Program;
  role: OrganizationRole;
  onReplace: (program: Program) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const submission = useRef(idempotentSubmission());
  if (!canAct(role)) return null;

  async function stop() {
    setBusy(true);
    setProblem(null);
    try {
      const updated = await stopProgram(program.id, submission.current.keyFor(program.id));
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
      aria-labelledby="arreter-titre"
      className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-8"
    >
      <h2 id="arreter-titre" className="font-display text-h3 text-ink font-semibold">
        {t.stopTitle}
      </h2>
      <p className="text-ink mt-3">{t.stopEffect}</p>
      <Link
        href={`${cleaningPaths.terms(CURRENT_TERMS_VERSION)}#arret-renouvellement`}
        target="_blank"
        className="text-small text-brand-ink mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
      >
        {t.stopRulesLink}
      </Link>
      {!canDecide(role) ? (
        <FormMessage tone="info" className="mt-2">
          {t.stopAdminOnly}
        </FormMessage>
      ) : open ? (
        <div role="group" aria-labelledby="arreter-titre" className="swap-in mt-4 grid gap-4">
          {problem ? <FormMessage>{errorWithReference(problem)}</FormMessage> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" disabled={busy} onClick={() => void stop()}>
              {busy ? t.stopping : t.stopConfirm}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              {t.stopKeep}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" className="mt-2" onClick={() => setOpen(true)}>
          {t.stop}
        </Button>
      )}
    </section>
  );
}
