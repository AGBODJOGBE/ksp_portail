'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { SummaryRow } from '@/components/ui/form-fields';
import {
  IconAlert,
  IconCalendar,
  IconCard,
  IconCheck,
  IconChevronRight,
  IconFileCheck,
  IconPhone,
} from '@/components/ui/icons';
import {
  LinkSheet,
  LinkSheetEyebrow,
  LinkSheetFacts,
  LinkSheetOutcome,
  LinkSheetSection,
  LinkSheetSkeleton,
} from '@/components/ui/link-sheet';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { type DebtorErrorView, payableOffer } from '@/features/recovery/debtor';
import { getDebtorCase, getDebtorDocumentUrl } from '@/features/recovery/debtor-api';
import type { DebtorCase, DebtorPlan, DebtorSession } from '@/features/recovery/debtor-schemas';
import {
  debtorCaseStatus,
  disputeReasonLabel,
  disputeStatus,
  paymentChannelLabel,
  planStatus,
  debtorTexts as t,
} from '@/features/recovery/debtor-texts';
import { documentKindLabel, installmentStatus, natureLabel } from '@/features/recovery/texts';
import { DebtorCallback } from './debtor-callback';
import { DebtorDispute } from './debtor-dispute';
import { DebtorPay, type PayChoice } from './debtor-pay';
import { DebtorPlanForm, ResendSignature } from './debtor-plan';
import { type Fail, NewTabLink, OpenDocumentButton, SessionBar, useFocusOnMount } from './debtor-parts';

/** Routes attendues, montrées hors production quand la situation n'est pas encore servie. */
const CASE_NEEDS = [
  {
    method: 'GET' as const,
    path: '/api/v1/recovery/debtor/case',
    purpose: 'Situation du débiteur : montant dû détaillé, paiements, documents, échéancier, remise.',
  },
];

type View = 'situation' | 'pay' | 'plan' | 'dispute' | 'callback';

type Load =
  | { status: 'loading' }
  | { status: 'pending' }
  | { status: 'error'; error: DebtorErrorView }
  | { status: 'ready'; data: DebtorCase };

/** Échéancier en cours d'accord ou signé : ce qu'il attend du débiteur. */
function planGuidance(plan: DebtorPlan): string | null {
  if (plan.status === 'pending_creditor') return t.planCreditor;
  if (plan.status !== 'proposed') return null;
  return plan.documentId && plan.signedAt === null ? t.planSignature : t.planReview;
}

function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-display text-ink text-lg font-semibold">
      {children}
    </h2>
  );
}

/** Autre possibilité : un écran d'action, ouvert depuis la situation. */
function ActionRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="rounded-control border-line bg-surface hover:bg-surface-muted focus-visible:outline-focus flex min-h-16 w-full items-center gap-4 border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          className="bg-brand-soft text-brand-ink grid size-10 shrink-0 place-items-center rounded-full [&>svg]:size-5"
        >
          {icon}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-ink font-semibold">{title}</span>
          <span className="text-small text-ink-muted">{hint}</span>
        </span>
        <IconChevronRight className="text-ink-muted size-5 shrink-0" />
      </button>
    </li>
  );
}

/**
 * Espace du débiteur, session ouverte (ADR-061) : D3 situation (montant dû, détail, dette, remise,
 * échéancier, contestations, paiements et reçus, documents), puis les écrans d'action D4 payer, D5
 * échéancier, D6 contester, D7 être rappelé ; D8 documents dans un nouvel onglet ; D9 terminer.
 * Une seule action principale par écran (« Payer » sur la situation).
 */
export function DebtorCaseScreen({
  session,
  fail,
  onEnd,
  ending,
}: {
  session: DebtorSession;
  fail: Fail;
  onEnd: () => void;
  ending: boolean;
}) {
  const token = session.sessionToken;
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [round, setRound] = useState(0);
  const [view, setView] = useState<View>('situation');
  const [payChoice, setPayChoice] = useState<PayChoice>('all');

  useEffect(() => {
    let active = true;
    getDebtorCase(token).then(
      (data) => {
        if (active) setLoad({ status: 'ready', data });
      },
      (caught: unknown) => {
        if (!active) return;
        const failure = fail(caught);
        if (!failure) return;
        setLoad(failure.kind === 'pending' ? { status: 'pending' } : { status: 'error', error: failure });
      },
    );
    return () => {
      active = false;
    };
  }, [token, fail, round]);

  /** Relit la situation en gardant l'affichage (après une action, au retour d'un paiement). */
  const refresh = useCallback(() => setRound((value) => value + 1), []);

  // Retour sur l'onglet (paiement fait dans l'autre onglet) : la situation est relue.
  useEffect(() => {
    if (view !== 'situation') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [view, refresh]);
  const reload = () => {
    setLoad({ status: 'loading' });
    refresh();
  };
  const back = () => {
    setView('situation');
    refresh();
  };
  const open = (next: View, choice: PayChoice = 'all') => {
    setPayChoice(choice);
    setView(next);
  };

  const sessionBar = <SessionBar expiresAt={session.sessionExpiresAt} onEnd={onEnd} ending={ending} />;

  if (load.status === 'loading') return <LinkSheetSkeleton label={t.loading} />;
  if (load.status !== 'ready') {
    return (
      <LinkSheet
        labelledBy="debiteur-titre"
        head={
          <div className="grid gap-4">
            <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
            <h1 id="debiteur-titre" className="font-display text-h2 text-ink font-bold">
              {t.situationTitle}
            </h1>
            {sessionBar}
          </div>
        }
      >
        <LinkSheetSection className="pb-8">
          {load.status === 'pending' ? (
            <BackendPending
              id="debiteur-situation"
              title={t.situationTitle}
              needs={CASE_NEEDS}
              className="shadow-none"
            >
              {t.casePending}
            </BackendPending>
          ) : (
            <div className="grid justify-items-start gap-4">
              <FormMessage>{load.error.message}</FormMessage>
              <Button variant="secondary" onClick={reload}>
                {t.retry}
              </Button>
            </div>
          )}
        </LinkSheetSection>
      </LinkSheet>
    );
  }

  const debtorCase = load.data;
  const common = { session: token, debtorCase, fail, onBack: back };
  if (view === 'pay') return <DebtorPay {...common} preset={payChoice} sessionBar={sessionBar} />;
  if (view === 'plan') return <DebtorPlanForm {...common} sessionBar={sessionBar} />;
  if (view === 'dispute') return <DebtorDispute {...common} sessionBar={sessionBar} />;
  if (view === 'callback') return <DebtorCallback {...common} sessionBar={sessionBar} />;
  return (
    <Situation
      debtorCase={debtorCase}
      session={token}
      fail={fail}
      sessionBar={sessionBar}
      onOpen={open}
      onEnd={onEnd}
      ending={ending}
    />
  );
}

function Situation({
  debtorCase,
  session,
  fail,
  sessionBar,
  onOpen,
  onEnd,
  ending,
}: {
  debtorCase: DebtorCase;
  session: string;
  fail: Fail;
  sessionBar: ReactNode;
  onOpen: (view: View, choice?: PayChoice) => void;
  onEnd: () => void;
  ending: boolean;
}) {
  // Toujours atteinte par une action (code validé, retour d'un écran) : le titre reçoit le focus.
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  const { amounts, plan, status } = debtorCase;
  const active = status === 'active';
  const due = amounts.due.amount;
  const offer = active ? payableOffer(debtorCase) : null;
  const caseStatus = debtorCaseStatus(status);
  const documentUrl = (id: string) => () => getDebtorDocumentUrl(session, id);
  const guidance = plan ? planGuidance(plan) : null;
  const canPropose = active && debtorCase.planScale.acceptsPaymentPlan && plan?.status !== 'pending_creditor';

  return (
    <LinkSheet
      labelledBy="debiteur-titre"
      head={
        <div className="grid gap-4">
          <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
          <div className="grid gap-1">
            {debtorCase.creditorName ? (
              <p className="text-small text-ink-muted">{t.forCreditor(debtorCase.creditorName)}</p>
            ) : null}
            <h1
              id="debiteur-titre"
              ref={titleRef}
              tabIndex={-1}
              className="font-display text-h2 text-ink font-bold focus:outline-none"
            >
              {t.situationTitle}
            </h1>
            <p className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
              {t.caseNumber(debtorCase.caseNumber)}
              <Badge tone={caseStatus.tone} dot>
                {caseStatus.label}
              </Badge>
            </p>
          </div>
          {sessionBar}
        </div>
      }
    >
      {/* Montant dû et action principale. */}
      <LinkSheetSection className="gap-5">
        {due > 0 ? (
          <div className="grid gap-1">
            <p className="text-small text-ink-muted font-semibold">{t.amountDue}</p>
            <p className="font-display text-ink text-[2.5rem] leading-none font-bold tabular-nums sm:text-5xl">
              {formatXof(amounts.due)}
            </p>
          </div>
        ) : (
          <LinkSheetOutcome tone="success" icon={<IconCheck className="size-6" />} title={t.settledTitle}>
            <p>{t.settledText}</p>
          </LinkSheetOutcome>
        )}
        {status === 'suspended' ? <FormMessage tone="info">{t.suspendedText}</FormMessage> : null}
        {active && due > 0 ? (
          <div className="grid gap-3">
            <Button variant="action" size="lg" className="w-full" onClick={() => onOpen('pay')}>
              <IconCard className="size-5" />
              {t.pay}
            </Button>
            <p className="text-small text-ink-muted text-center">{t.payHint}</p>
            {debtorCase.pendingPaymentUrl ? (
              <NewTabLink href={debtorCase.pendingPaymentUrl}>{t.resumePayment}</NewTabLink>
            ) : null}
          </div>
        ) : null}
        {debtorCase.settlementCertificateDocumentId ? (
          <OpenDocumentButton
            label={t.certificate}
            getUrl={documentUrl(debtorCase.settlementCertificateDocumentId)}
            fail={fail}
            variant="primary"
          />
        ) : null}
      </LinkSheetSection>

      {offer ? (
        <LinkSheetSection>
          <div className="rounded-control border-action-muted bg-action-soft grid gap-3 border p-4">
            <SectionTitle>{t.offerTitle}</SectionTitle>
            <p className="text-ink">
              {t.offerText(
                formatXof(offer.payNow),
                formatXof(amounts.due),
                formatShortDate(offer.validUntil),
              )}
            </p>
            <p className="text-small text-ink-muted">{t.offerWaived(formatXof(offer.waived))}</p>
            <Button variant="secondary" className="justify-self-start" onClick={() => onOpen('pay', 'offer')}>
              {t.payWithOffer}
            </Button>
          </div>
        </LinkSheetSection>
      ) : null}

      <LinkSheetSection>
        <SectionTitle id="debiteur-detail">{t.detailTitle}</SectionTitle>
        <dl aria-labelledby="debiteur-detail">
          <SummaryRow label={t.principal}>{formatXof(amounts.principal)}</SummaryRow>
          {amounts.interests.amount > 0 ? (
            <SummaryRow label={t.interests}>{formatXof(amounts.interests)}</SummaryRow>
          ) : null}
          {amounts.costs.amount > 0 ? (
            <SummaryRow label={t.costs}>{formatXof(amounts.costs)}</SummaryRow>
          ) : null}
          {amounts.paid.amount > 0 ? (
            <SummaryRow label={t.paid}>{`− ${formatXof(amounts.paid)}`}</SummaryRow>
          ) : null}
          {amounts.waived.amount > 0 ? (
            <SummaryRow label={t.waived}>{`− ${formatXof(amounts.waived)}`}</SummaryRow>
          ) : null}
          <SummaryRow label={t.due} strong>
            {formatXof(amounts.due)}
          </SummaryRow>
        </dl>
        {amounts.overpaid.amount > 0 ? (
          <FormMessage tone="info">{t.overpaid(formatXof(amounts.overpaid))}</FormMessage>
        ) : null}
      </LinkSheetSection>

      <LinkSheetSection>
        <SectionTitle>{t.debtTitle}</SectionTitle>
        <LinkSheetFacts
          rows={[
            [t.creditor, debtorCase.creditorName],
            [t.nature, natureLabel(debtorCase.nature)],
            [t.references, debtorCase.references.join(', ')],
          ]}
        />
      </LinkSheetSection>

      {plan ? (
        <LinkSheetSection>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>{t.planTitle}</SectionTitle>
            <Badge tone={planStatus(plan.status).tone} dot>
              {planStatus(plan.status).label}
            </Badge>
          </div>
          {guidance ? <p className="text-ink-muted">{guidance}</p> : null}
          <ol className="grid gap-2">
            {plan.installments.map((installment) => {
              const state = installmentStatus(installment.status);
              return (
                <li
                  key={installment.rank}
                  className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b pb-2 last:border-b-0"
                >
                  <span className="grid">
                    <span className="text-ink font-medium">{t.installment(installment.rank)}</span>
                    <span className="text-small text-ink-muted">{formatShortDate(installment.dueDate)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-ink font-semibold tabular-nums">
                      {formatXof(installment.amount)}
                    </span>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="text-ink flex justify-between font-semibold tabular-nums">
            <span>{t.planTotal}</span>
            <span>{formatXof(plan.total)}</span>
          </p>
          {plan.missedCount > 0 ? <FormMessage>{t.planMissed(plan.missedCount)}</FormMessage> : null}
          {plan.status === 'proposed' && plan.documentId && plan.signedAt === null ? (
            <ResendSignature session={session} planId={plan.id} fail={fail} />
          ) : null}
        </LinkSheetSection>
      ) : null}

      {debtorCase.disputes.length ? (
        <LinkSheetSection>
          <SectionTitle>{t.disputesTitle}</SectionTitle>
          <ul className="grid gap-4">
            {debtorCase.disputes.map((dispute) => {
              const state = disputeStatus(dispute.status);
              return (
                <li key={dispute.id} className="rounded-control border-line grid gap-2 border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-ink font-semibold">{disputeReasonLabel(dispute.reason)}</p>
                    <Badge tone={state.tone} dot>
                      {state.label}
                    </Badge>
                  </div>
                  <p className="text-small text-ink-muted">
                    {t.disputeOpened(formatDateTime(dispute.openedAt))}
                  </p>
                  {dispute.status === 'open' ? (
                    <p className="text-small text-ink">
                      {t.disputeAnswerBy(formatShortDate(dispute.creditorAnswerDueAt))}
                    </p>
                  ) : null}
                  {dispute.creditorAnswer ? (
                    <p className="text-small text-ink">
                      <span className="font-semibold">{t.creditorAnswer} : </span>
                      {dispute.creditorAnswer}
                    </p>
                  ) : null}
                  {dispute.resolutionNote ? (
                    <p className="text-small text-ink">
                      <span className="font-semibold">{t.resolution} : </span>
                      {dispute.resolutionNote}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </LinkSheetSection>
      ) : null}

      <LinkSheetSection>
        <SectionTitle>{t.paymentsTitle}</SectionTitle>
        {debtorCase.payments.length ? (
          <ul className="grid gap-3">
            {debtorCase.payments.map((payment, index) => (
              <li
                key={`${payment.paidAt}-${index}`}
                className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0"
              >
                <span className="grid">
                  <span className="text-ink font-semibold tabular-nums">{formatXof(payment.amount)}</span>
                  <span className="text-small text-ink-muted">
                    {formatShortDate(payment.paidAt)} · {paymentChannelLabel(payment.channel)}
                  </span>
                </span>
                {payment.receiptDocumentId ? (
                  <OpenDocumentButton
                    label={t.receipt}
                    accessibleLabel={t.receiptOf(formatShortDate(payment.paidAt))}
                    getUrl={documentUrl(payment.receiptDocumentId)}
                    fail={fail}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t.noPayments}</p>
        )}
      </LinkSheetSection>

      <LinkSheetSection>
        <SectionTitle>{t.documentsTitle}</SectionTitle>
        {debtorCase.documents.length ? (
          <ul className="grid gap-3">
            {debtorCase.documents.map((document, index) => {
              const id = document.documentId ?? document.fileId;
              return (
                <li
                  key={id ?? `${document.label}-${index}`}
                  className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <IconFileCheck className="text-brand-ink size-5 shrink-0" />
                    <span className="grid min-w-0">
                      <span className="text-ink font-medium break-words">{document.label}</span>
                      <span className="text-small text-ink-muted">{documentKindLabel(document.kind)}</span>
                    </span>
                  </span>
                  {id ? (
                    <OpenDocumentButton
                      label={t.open}
                      accessibleLabel={t.openDocument(document.label)}
                      getUrl={documentUrl(id)}
                      fail={fail}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-muted">{t.noDocuments}</p>
        )}
      </LinkSheetSection>

      <LinkSheetSection className="pb-8">
        <SectionTitle>{t.otherTitle}</SectionTitle>
        <ul className="grid gap-3">
          {canPropose ? (
            <ActionRow
              icon={<IconCalendar />}
              title={t.planAction}
              hint={t.planActionHint}
              onClick={() => onOpen('plan')}
            />
          ) : null}
          {active ? (
            <ActionRow
              icon={<IconAlert />}
              title={t.disputeAction}
              hint={t.disputeActionHint}
              onClick={() => onOpen('dispute')}
            />
          ) : null}
          <ActionRow
            icon={<IconPhone />}
            title={t.callbackAction}
            hint={t.callbackActionHint}
            onClick={() => onOpen('callback')}
          />
        </ul>
        {active && !debtorCase.planScale.acceptsPaymentPlan ? (
          <p className="text-small text-ink-muted">{t.planRefused}</p>
        ) : null}
        <Button
          variant="ghost"
          className="justify-self-start"
          onClick={onEnd}
          disabled={ending}
          aria-busy={ending || undefined}
        >
          {ending ? t.ending : t.endLong}
        </Button>
      </LinkSheetSection>
    </LinkSheet>
  );
}
