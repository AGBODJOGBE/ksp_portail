'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { BandBack, BandHeader } from '@/components/ui/band-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { LinkSheetFacts } from '@/components/ui/link-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { useReadOnly } from '@/features/identity';
import { getCase } from '@/features/recovery/api';
import { caseTexts as t } from '@/features/recovery/case-texts';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCase } from '@/features/recovery/schemas';
import {
  caseStatus,
  closureLabel,
  deadlineLabel,
  kindLabel,
  natureLabel,
  rejectionLabel,
  stageLabel,
} from '@/features/recovery/texts';
import {
  AmountsPanel,
  ClaimsPanel,
  DebtorsPanel,
  DocumentsPanel,
  JournalPanel,
  PaymentsPanel,
  PlanPanel,
  PricingPanel,
  StageTimeline,
} from './case-parts';
import { CaseMoneyActions } from './case-money';
import { FeeStep } from './fee-step';
import { MandateStep } from './mandate-step';

const CARD = 'rounded-panel border-line bg-surface grid gap-4 border p-5 shadow-xs sm:p-7';

/** Débiteur principal (premier de la liste, rôle `main`) : il donne son nom au dossier. */
const mainDebtor = (recoveryCase: RecoveryCase) =>
  recoveryCase.debtors.find((debtor) => debtor.role === 'main') ?? recoveryCase.debtors[0] ?? null;

/**
 * Fiche d'un dossier (`/mon-espace/recouvrement/dossiers/[id]`, adresse des notifications) : action du
 * moment selon l'état (mandat, frais, complément…), frise des six étapes, montants, échéancier, débiteurs,
 * créances, paiements, pièces (ajout), frais et commission figés, onglet Journal ; pour un dossier en
 * cours, paiement reçu directement et arrêt (`CaseMoneyActions`). Le score de recouvrabilité n'est jamais
 * montré. Le message d'une action reste affiché après la mise à jour de la fiche.
 */
export function CaseDetail({ id }: { id: string }) {
  const { state, reload, refresh, set } = useResource(useCallback(() => getCase(id), [id]));
  const readOnly = useReadOnly();
  const [notice, setNotice] = useState<string | null>(null);

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid gap-8">
        <span className="sr-only">{t.loading}</span>
        <BandHeader overlap={<Skeleton className="rounded-card h-36" />}>
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-11 w-2/3 max-w-md" />
          </div>
        </BandHeader>
      </div>
    );
  }
  if (state.status === 'error') {
    const view = describeRecoveryError(state.error);
    return (
      <div className="grid gap-8">
        <BandHeader>
          <BandBack href={recoveryPaths.cases} label={t.back} />
        </BandHeader>
        <div className={`${CARD} justify-items-start`}>
          <FormMessage>{view.kind === 'notFound' ? t.notFound : errorWithReference(view)}</FormMessage>
          {view.kind === 'notFound' || view.kind === 'forbidden' ? null : (
            <Button variant="secondary" onClick={reload}>
              {t.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const recoveryCase = state.data;
  const status = caseStatus(recoveryCase.status);
  const debtor = mainDebtor(recoveryCase);
  const deadline = recoveryCase.nextDeadline;
  const running = recoveryCase.status === 'active' || recoveryCase.status === 'suspended';
  const canAddPieces = !readOnly && recoveryCase.status !== 'closed' && recoveryCase.status !== 'rejected';

  return (
    <div className="grid gap-8">
      <BandHeader
        overlap={
          <section aria-label={t.numberOf(recoveryCase.number)} className={`${CARD} shadow-float`}>
            <LinkSheetFacts
              rows={[
                [t.due, formatXof(recoveryCase.amounts.due)],
                [t.paid, formatXof(recoveryCase.amounts.paid)],
                [t.stage, running ? stageLabel(recoveryCase.stage) : null],
                [
                  t.nextDeadline,
                  deadline ? `${deadlineLabel(deadline.kind)} : ${formatDateTime(deadline.dueAt)}` : null,
                ],
                [t.createdAt, formatShortDate(recoveryCase.createdAt)],
                [t.acceptedAt, recoveryCase.acceptedAt ? formatShortDate(recoveryCase.acceptedAt) : null],
              ]}
            />
          </section>
        }
      >
        <BandBack href={recoveryPaths.cases} label={t.back} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <span className="text-small text-ink-muted tabular-nums">{t.numberOf(recoveryCase.number)}</span>
        </div>
        <Heading as="h1" size="h1" className="mt-3">
          {debtor?.displayName ?? recoveryCase.number}
        </Heading>
        <p className="text-ink-muted mt-2">
          {`${kindLabel(recoveryCase.kind)} · ${natureLabel(recoveryCase.nature)}`}
        </p>
      </BandHeader>

      <FormMessage tone="success">{notice}</FormMessage>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid min-w-0 gap-8">
          <CurrentAction
            recoveryCase={recoveryCase}
            readOnly={readOnly}
            onChange={(next, message) => {
              set(next);
              if (message) setNotice(message);
            }}
            onStale={refresh}
          />
          <section
            aria-label={t.tabsLabel}
            className="rounded-panel border-line bg-surface border p-5 shadow-xs sm:p-7"
          >
            <Tabs
              label={t.tabsLabel}
              items={[
                {
                  key: 'dossier',
                  label: t.tabs.case,
                  render: () => (
                    <div className="divide-line grid divide-y [&>section]:py-6 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
                      <StageTimeline recoveryCase={recoveryCase} />
                      <AmountsPanel recoveryCase={recoveryCase} />
                      {recoveryCase.currentPlan ? <PlanPanel plan={recoveryCase.currentPlan} /> : null}
                      <PaymentsPanel recoveryCase={recoveryCase} />
                      <DebtorsPanel recoveryCase={recoveryCase} />
                      <ClaimsPanel recoveryCase={recoveryCase} />
                      <DocumentsPanel recoveryCase={recoveryCase} canAdd={canAddPieces} onAdded={refresh} />
                    </div>
                  ),
                },
                {
                  key: 'journal',
                  label: t.tabs.journal,
                  render: () => <JournalPanel caseId={recoveryCase.id} />,
                },
              ]}
            />
          </section>
        </div>
        <div className="grid gap-8">
          <PricingPanel recoveryCase={recoveryCase} />
          {running && !readOnly ? (
            <CaseMoneyActions
              recoveryCase={recoveryCase}
              onChange={(next, message) => {
                set(next);
                setNotice(message);
              }}
              onStale={refresh}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Ce que le dossier attend maintenant, selon son état. */
function CurrentAction({
  recoveryCase,
  readOnly,
  onChange,
  onStale,
}: {
  recoveryCase: RecoveryCase;
  readOnly: boolean;
  onChange: (recoveryCase: RecoveryCase, notice?: string) => void;
  onStale: () => void;
}) {
  const deadline = recoveryCase.nextDeadline ? formatDateTime(recoveryCase.nextDeadline.dueAt) : null;
  const frame = (title: string, children: ReactNode, tone: 'action' | 'neutral' = 'action') => (
    <section
      aria-labelledby="dossier-action"
      className={`${CARD} ${tone === 'action' ? 'border-l-action border-l-4' : ''}`}
    >
      <p className="text-ink-muted text-[0.8125rem] font-bold tracking-[0.12em] uppercase">{t.actionTitle}</p>
      <Heading as="h2" size="h3" id="dossier-action">
        {title}
      </Heading>
      {children}
    </section>
  );

  switch (recoveryCase.status) {
    case 'draft':
      return frame(
        recoveryCase.mandate ? t.mandateTitle : t.draftTitle,
        <div className="grid gap-5">
          {recoveryCase.mandate ? null : <p className="text-ink-muted">{t.draftText}</p>}
          {deadline ? <p className="text-small text-ink-muted">{t.draftBefore(deadline)}</p> : null}
          {readOnly ? (
            <FormMessage tone="info">{t.readOnly}</FormMessage>
          ) : (
            <>
              <MandateStep recoveryCase={recoveryCase} onReady={(next) => onChange(next)} />
              <Link
                href={recoveryPaths.editCase(recoveryCase.id)}
                className="text-brand-ink inline-flex min-h-11 items-center justify-self-start font-semibold underline underline-offset-4"
              >
                {t.editDraft}
              </Link>
            </>
          )}
        </div>,
      );
    case 'awaiting_fee':
      return frame(
        t.feeTitle,
        readOnly ? (
          <FormMessage tone="info">{t.readOnly}</FormMessage>
        ) : (
          <FeeStep
            recoveryCase={recoveryCase}
            returnTo={recoveryPaths.case(recoveryCase.id)}
            onPaid={(paid, notice) => onChange(paid, notice)}
            onStale={onStale}
          />
        ),
      );
    case 'under_review':
      return frame(
        t.reviewTitle,
        <div className="grid gap-2">
          <p className="text-ink">{t.reviewText}</p>
          {deadline ? <p className="text-small text-ink-muted">{t.reviewBefore(deadline)}</p> : null}
        </div>,
        'neutral',
      );
    case 'info_requested':
      return frame(
        t.infoTitle,
        <div className="grid gap-4">
          {recoveryCase.reviewNote ? (
            <p className="text-ink whitespace-pre-line">{recoveryCase.reviewNote}</p>
          ) : null}
          {deadline ? <p className="text-small text-ink-muted">{t.infoBefore(deadline)}</p> : null}
          {readOnly ? (
            <FormMessage tone="info">{t.readOnly}</FormMessage>
          ) : (
            <ButtonLink
              href={recoveryPaths.editCase(recoveryCase.id)}
              variant="action"
              className="justify-self-start"
            >
              {t.complete}
            </ButtonLink>
          )}
        </div>,
      );
    case 'active':
      return frame(
        t.activeTitle,
        <p className="text-ink">{t.activeText(stageLabel(recoveryCase.stage))}</p>,
        'neutral',
      );
    case 'suspended':
      return frame(
        t.suspendedTitle,
        <div className="grid gap-3">
          <p className="text-ink">{t.suspendedText}</p>
          <Link
            href={recoveryPaths.decisions}
            className="text-brand-ink inline-flex min-h-11 items-center justify-self-start font-semibold underline underline-offset-4"
          >
            {t.decisionsLink}
          </Link>
        </div>,
      );
    case 'closed':
      return frame(
        t.closedTitle,
        <div className="grid gap-2">
          {recoveryCase.closure ? (
            <>
              <p className="text-ink">{closureLabel(recoveryCase.closure.reason)}</p>
              <p className="text-small text-ink-muted">
                {t.closedOn(formatShortDate(recoveryCase.closure.closedAt))}
              </p>
              {recoveryCase.closure.note ? (
                <p className="text-small text-ink-muted whitespace-pre-line">{recoveryCase.closure.note}</p>
              ) : null}
              {recoveryCase.closure.settlementCertificateDocumentId ? (
                <Link
                  href={recoveryPaths.document(recoveryCase.closure.settlementCertificateDocumentId)}
                  className="text-brand-ink inline-flex min-h-11 items-center justify-self-start font-semibold underline underline-offset-4"
                >
                  {t.certificate}
                </Link>
              ) : null}
            </>
          ) : null}
        </div>,
        'neutral',
      );
    case 'rejected':
      return frame(
        t.rejectedTitle,
        <div className="grid gap-2">
          {rejectionLabel(recoveryCase.rejectionReason) ? (
            <p className="text-ink">{rejectionLabel(recoveryCase.rejectionReason)}</p>
          ) : null}
          {recoveryCase.reviewNote ? (
            <>
              <p className="text-small text-ink-muted font-semibold">{t.rejectedNote}</p>
              <p className="text-ink whitespace-pre-line">{recoveryCase.reviewNote}</p>
            </>
          ) : null}
        </div>,
        'neutral',
      );
    default:
      return null;
  }
}
