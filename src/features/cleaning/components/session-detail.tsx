'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandHeader, BandTitle } from '@/components/ui/band-header';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { contextKey, useSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatTime, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { useOrganizationRole } from '@/features/identity';
import { getProgram, getSession, paySession } from '@/features/cleaning/api';
import { describeCleaningError, errorWithReference } from '@/features/cleaning/errors';
import { cleaningPaths } from '@/features/cleaning/paths';
import { programTexts, sessionTexts as t } from '@/features/cleaning/program-texts';
import type { ProgramDetail, Session } from '@/features/cleaning/schemas';
import {
  UPCOMING_SESSION_STATUSES,
  isPayable,
  sessionCancellationCause,
  sessionPaymentStatus,
  sessionStatus,
} from '@/features/cleaning/status-texts';
import { AgentList } from './agents';
import { Panel, SummaryRow } from './fields';
import { CleaningPay } from './pay-buttons';
import { SessionChange } from './session-actions';
import { SessionClaim, SessionRating } from './session-feedback';
import { SessionIncidents, SessionPhotos, SessionProgress } from './session-parts';

/**
 * Page d'une séance (`/mon-espace/nettoyage/programmes/[id]/seances/[sessionId]`, adresse des
 * notifications) : « séance r/n », date, état, équipe ; paiement d'un particulier (Mobile Money d'abord,
 * puis portefeuille) et facture ; déroulé, liste de contrôle, photos, incidents ; report et annulation
 * selon le délai ; note et réclamation après la séance. Entreprise : pas de paiement (facture mensuelle).
 * Lecteur : actions masquées. Le programme est lu à côté pour son lieu et sa suspension.
 */
export function SessionDetail({ programId, id }: { programId: string; id: string }) {
  const key = contextKey(useSession()) ?? 'none';
  return <Detail key={`${key}-${id}`} programId={programId} id={id} />;
}

function Detail({ programId, id }: { programId: string; id: string }) {
  const load = useCallback(() => getSession(id), [id]);
  const resource = useResource(load);
  const loadProgram = useCallback(() => getProgram(programId), [programId]);
  const program = useResource(loadProgram).state;
  const role = useOrganizationRole();
  const state = resource.state;
  const backToProgram = {
    href: cleaningPaths.program(programId),
    label: program.status === 'ready' ? t.backToProgram(program.data.number) : programTexts.back,
  };

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader>
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
          <BandTitle back={backToProgram} title={programTexts.sessionsTitle} />
        </BandHeader>
        <div className="rounded-card border-line bg-surface grid justify-items-start gap-4 border p-5 shadow-xs sm:p-6">
          <FormMessage>{view.kind === 'notFound' ? t.notFound : errorWithReference(view)}</FormMessage>
          {view.kind === 'notFound' ? null : (
            <Button variant="secondary" onClick={resource.reload}>
              {programTexts.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const session = state.data;
  const status = sessionStatus(session.status);
  const payment = session.paymentStatus ? sessionPaymentStatus(session.paymentStatus) : null;
  const canAct = role !== 'org_viewer';
  const place = program.status === 'ready' ? program.data.place : null;
  const programSuspended = program.status === 'ready' && program.data.status === 'suspended';
  const upcoming = UPCOMING_SESSION_STATUSES.has(session.status) || session.status === 'suspended';
  return (
    <div className="grid gap-8">
      <BandHeader>
        <BandTitle
          back={backToProgram}
          eyebrow={t.eyebrow(session.rank, session.sessionsCount, session.programNumber)}
          title={formatDate(session.scheduledStart)}
          lead={[
            t.time(formatTime(session.scheduledStart), formatTime(session.scheduledEnd)),
            place ? `${place.name} · ${place.communeName}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            {payment && session.paymentStatus !== 'not_due' ? (
              <Badge tone={payment.tone}>{payment.label}</Badge>
            ) : null}
            {session.isRedo ? <Badge tone="accent">{t.redo}</Badge> : null}
          </div>
        </BandTitle>
      </BandHeader>

      {isPayable(session.paymentStatus) ? (
        <PayPanel session={session} canAct={canAct} onChanged={resource.refresh} />
      ) : null}
      <Closure session={session} />
      {upcoming && canAct ? (
        <SessionChange
          session={session}
          programSuspended={programSuspended}
          onReplace={resource.set}
          onChanged={resource.refresh}
        />
      ) : null}
      {upcoming && !canAct ? <FormMessage tone="info">{t.readOnly}</FormMessage> : null}

      <Panel id="equipe-titre" title={t.teamTitle}>
        {session.agents.length ? (
          <AgentList agents={session.agents} title="" />
        ) : (
          <p className="text-ink-muted">{t.teamPending}</p>
        )}
      </Panel>
      <SessionProgress session={session} />
      <SessionPhotos photos={session.photos} onRefresh={resource.refresh} />
      <SessionIncidents session={session} />
      <PaymentSummary session={session} program={program.status === 'ready' ? program.data : null} />
      {session.status === 'completed' ? (
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <SessionRating session={session} canAct={canAct} onReplace={resource.set} />
          <SessionClaim session={session} canAct={canAct} />
        </div>
      ) : null}
    </div>
  );
}

/** Séance à payer (particulier) : montant dû, échéance, Mobile Money d'abord, puis portefeuille. */
function PayPanel({
  session,
  canAct,
  onChanged,
}: {
  session: Session;
  canAct: boolean;
  onChanged: () => void;
}) {
  const overdue = session.paymentStatus === 'overdue';
  return (
    <section
      id="maintenant"
      aria-labelledby="payer-titre"
      className={cn(
        'rounded-panel bg-surface signature-edge scroll-mt-24 border p-5 shadow-xs sm:p-8',
        overdue ? 'border-danger' : 'border-action-muted',
      )}
    >
      <h2 id="payer-titre" className="font-display text-h3 text-ink font-semibold">
        {t.payTitle}
      </h2>
      <p className="text-ink-muted mt-2">{overdue ? t.payOverdue : t.payLead}</p>
      <div className="mt-5">
        {canAct ? (
          <CleaningPay
            amount={session.amountDue}
            amountLabel={t.amountDue}
            deadline={session.dueBy ? t.dueBy(formatDateTime(session.dueBy)) : null}
            subjectKey={{ session: session.id, status: session.paymentStatus }}
            pay={(method, key) => paySession(session.id, method, key)}
            paidText={t.paid}
            awaitingText={t.awaitingPayment}
            conflictText={t.conflict}
            onChanged={onChanged}
          />
        ) : (
          <FormMessage tone="info">{t.readOnlyPay}</FormMessage>
        )}
      </div>
    </section>
  );
}

/** Séance annulée, manquée ou reportée : ce qui s'est passé. */
function Closure({ session }: { session: Session }) {
  const cancellation = session.cancellation;
  if (!cancellation && session.status !== 'missed' && !session.reschedules.length) return null;
  return (
    <Panel id="historique-titre" title={cancellation ? t.cancelledTitle : t.reschedulesTitle}>
      <div className="grid gap-3">
        {cancellation ? (
          <>
            <p className="text-ink">
              {t.cancelledOn(formatDateTime(cancellation.at), sessionCancellationCause(cancellation.cause))}
            </p>
            {cancellation.reason ? <p className="text-small text-ink-muted">{cancellation.reason}</p> : null}
            {cancellation.late ? <p className="text-ink">{t.cancelledLate}</p> : null}
          </>
        ) : null}
        {session.status === 'missed' ? <p className="text-ink">{t.missed}</p> : null}
        {session.reschedules.length ? (
          <ul className="grid gap-1.5">
            {session.reschedules.map((item) => (
              <li key={item.at} className="text-ink">
                {t.rescheduled(
                  formatDateTime(item.previousStart),
                  formatDateTime(item.newStart),
                  item.by === 'ksp',
                )}
                {item.reason ? <span className="text-small text-ink-muted"> — {item.reason}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}

/** Prix, frais déduits, montant dû, état du paiement, facture ; entreprise : facture mensuelle. */
function PaymentSummary({ session, program }: { session: Session; program: ProgramDetail | null }) {
  const payment = session.paymentStatus ? sessionPaymentStatus(session.paymentStatus) : null;
  return (
    <Panel id="paiement-titre" title={t.paymentTitle}>
      <dl>
        {session.price ? <SummaryRow label={t.price}>{formatXof(session.price)}</SummaryRow> : null}
        {session.visitFeeDeduction && session.visitFeeDeduction.amount ? (
          <SummaryRow label={t.visitFeeDeduction}>{`− ${formatXof(session.visitFeeDeduction)}`}</SummaryRow>
        ) : null}
        {session.amountDue && payment ? (
          <SummaryRow label={t.amountDue} strong>
            {formatXof(session.amountDue)}
          </SummaryRow>
        ) : null}
        {payment ? (
          <SummaryRow label={t.paymentStatus}>
            <Badge tone={payment.tone}>{payment.label}</Badge>
          </SummaryRow>
        ) : null}
      </dl>
      {!session.paymentStatus && (program?.payerKind === 'organization' || !program) ? (
        <p className="text-ink-muted mt-3">{t.monthlyInvoice}</p>
      ) : null}
      {session.invoiceId ? (
        <Link
          href={cleaningPaths.invoice(session.invoiceId)}
          className="text-brand-ink mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
        >
          {t.invoice}
        </Link>
      ) : null}
    </Panel>
  );
}
