'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Panel, SummaryRow } from '@/components/ui/form-fields';
import { IconCheck, IconFileCheck } from '@/components/ui/icons';
import { SkeletonCards } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatDateTime, formatShortDate, formatXof } from '@/lib/format';
import { formatPhone } from '@/lib/phone';
import { useResource } from '@/lib/use-resource';
import { FilePicker, type FilePickerTexts, type PickedFile } from '@/features/file';
import { addCaseDocument, listJournal } from '@/features/recovery/api';
import { caseTexts as t } from '@/features/recovery/case-texts';
import { EVIDENCE_MAX_BYTES, EVIDENCE_TYPES, MAX_EVIDENCE } from '@/features/recovery/draft';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCase } from '@/features/recovery/schemas';
import {
  STAGES,
  documentKindLabel,
  feeStatus,
  installmentStatus,
  journalKindLabel,
  roleLabel,
  sourceLabel,
  stageHint,
  stageLabel,
} from '@/features/recovery/texts';
import { wizardTexts } from '@/features/recovery/wizard-texts';

const LINK = 'text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4';

/* ——— Frise des six étapes ——— */

/**
 * Frise des étapes d'un dossier accepté (notification → procédure judiciaire) : étapes passées (lues dans
 * `stageHistory`), étape en cours (`stage`), étapes à venir. Un saut d'étape laisse l'étape sautée « à
 * venir ». Avant l'acceptation, toutes les étapes sont à venir.
 */
export function StageTimeline({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  const history = recoveryCase.stageHistory;
  const visited = new Set(history.map((transition) => transition.toStage));
  const running = recoveryCase.status === 'active' || recoveryCase.status === 'suspended';
  const current = running ? recoveryCase.stage : null;
  const since = (stage: string) =>
    [...history].reverse().find((transition) => transition.toStage === stage)?.at ?? null;
  return (
    <Panel flat id="dossier-etapes" title={t.timelineTitle}>
      {!history.length && !current ? (
        <p className="text-small text-ink-muted mb-4">{t.timelineBefore}</p>
      ) : null}
      <ol className="grid gap-3 sm:grid-cols-3">
        {STAGES.map((stage) => {
          const state = stage === current ? 'current' : visited.has(stage) ? 'done' : 'next';
          const at = state === 'next' ? null : since(stage);
          return (
            <li
              key={stage}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'rounded-card grid content-start gap-1 border p-3',
                state === 'current' && 'border-action bg-action-soft',
                state === 'done' && 'border-line bg-surface',
                state === 'next' && 'border-line bg-surface-muted border-dashed',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                    state === 'done' && 'bg-action text-on-action',
                    state === 'current' && 'bg-action text-on-action ring-action-soft ring-4',
                    state === 'next' && 'bg-line text-ink-muted',
                  )}
                >
                  {state === 'done' ? <IconCheck className="size-3.5" /> : STAGES.indexOf(stage) + 1}
                </span>
                <span className="text-ink text-sm leading-tight font-semibold">{stageLabel(stage)}</span>
              </span>
              <span className="text-ink-muted text-xs">
                {state === 'done' ? t.stageDone : state === 'current' ? t.stageCurrent : t.stageNext}
                {at ? ` · ${t.stageSince(formatShortDate(at))}` : ''}
              </span>
              {state !== 'done' ? <span className="text-ink-subtle text-xs">{stageHint(stage)}</span> : null}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/* ——— Montants et échéancier ——— */

export function AmountsPanel({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  const amounts = recoveryCase.amounts;
  return (
    <Panel flat id="dossier-montants" title={t.amountsTitle}>
      <dl>
        <SummaryRow label={t.principal}>{formatXof(amounts.principal)}</SummaryRow>
        {amounts.interests.amount ? (
          <SummaryRow label={t.interests}>{formatXof(amounts.interests)}</SummaryRow>
        ) : null}
        {amounts.costs.amount ? <SummaryRow label={t.costs}>{formatXof(amounts.costs)}</SummaryRow> : null}
        <SummaryRow label={t.paidAmount}>{formatXof(amounts.paid)}</SummaryRow>
        {amounts.waived.amount ? <SummaryRow label={t.waived}>{formatXof(amounts.waived)}</SummaryRow> : null}
        <SummaryRow label={t.dueAmount} strong>
          {formatXof(amounts.due)}
        </SummaryRow>
        {amounts.overpaid.amount ? (
          <SummaryRow label={t.overpaid}>{formatXof(amounts.overpaid)}</SummaryRow>
        ) : null}
        {recoveryCase.prescriptionDate ? (
          <SummaryRow label={t.prescription}>{formatShortDate(recoveryCase.prescriptionDate)}</SummaryRow>
        ) : null}
      </dl>
    </Panel>
  );
}

export function PlanPanel({ plan }: { plan: NonNullable<RecoveryCase['currentPlan']> }) {
  return (
    <Panel flat id="dossier-echeancier" title={t.planTitle}>
      <dl className="mb-4">
        <SummaryRow label={t.planTotal}>{formatXof(plan.total)}</SummaryRow>
      </dl>
      {plan.missedCount ? (
        <p className="text-small text-danger mb-3 font-semibold">{t.planMissed(plan.missedCount)}</p>
      ) : null}
      <ol className="grid gap-2">
        {plan.installments.map((installment) => {
          const status = installmentStatus(installment.status);
          return (
            <li
              key={installment.rank}
              className="border-line flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0"
            >
              <span className="text-ink text-sm">
                {`${t.installment(installment.rank)} · ${formatShortDate(installment.dueDate)}`}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-ink font-medium tabular-nums">{formatXof(installment.amount)}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/* ——— Débiteurs et créances ——— */

export function DebtorsPanel({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  return (
    <Panel flat id="dossier-debiteurs" title={t.debtorsTitle}>
      <ul className="grid gap-4">
        {recoveryCase.debtors.map((debtor) => {
          const company = [
            debtor.ifu ? `${t.ifu} ${debtor.ifu}` : null,
            debtor.rccm ? `${t.rccm} ${debtor.rccm}` : null,
            debtor.representativeName ? `${t.representative} : ${debtor.representativeName}` : null,
          ].filter(Boolean);
          return (
            <li key={debtor.id} className="border-line grid gap-1 border-b pb-4 last:border-b-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-ink font-semibold">{debtor.displayName}</span>
                <Badge tone={debtor.role === 'main' ? 'brand' : 'neutral'}>{roleLabel(debtor.role)}</Badge>
              </p>
              {debtor.phones.length ? (
                <p className="text-small text-ink-muted">{debtor.phones.map(formatPhone).join(' · ')}</p>
              ) : null}
              {debtor.emails.length ? (
                <p className="text-small text-ink-muted break-all">{debtor.emails.join(' · ')}</p>
              ) : null}
              {debtor.address ? <p className="text-small text-ink-muted">{debtor.address}</p> : null}
              {company.length ? <p className="text-small text-ink-muted">{company.join(' · ')}</p> : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function ClaimsPanel({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  return (
    <Panel flat id="dossier-creances" title={t.claimsTitle}>
      <ul className="grid gap-2">
        {recoveryCase.claims.map((claim) => (
          <li
            key={claim.id}
            className="border-line flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-2 last:border-b-0"
          >
            <span className="grid gap-0.5">
              <span className="text-ink font-medium">{claim.reference}</span>
              <span className="text-small text-ink-muted">
                {[t.dueDate(formatShortDate(claim.dueDate)), claim.description].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="text-ink font-semibold tabular-nums">{formatXof(claim.amount)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ——— Paiements ——— */

export function PaymentsPanel({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  const collections = recoveryCase.collections;
  return (
    <Panel
      flat
      id="dossier-paiements"
      title={t.paymentsTitle}
      action={
        collections.length ? (
          <Link href={recoveryPaths.wallet} className={LINK}>
            {t.walletLink}
          </Link>
        ) : null
      }
    >
      {collections.length ? (
        <ul className="grid gap-4">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="border-line grid gap-1 border-b pb-4 last:border-b-0 last:pb-0"
            >
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-ink font-semibold">{formatDateTime(collection.receivedAt)}</span>
                <span className="text-small text-ink-muted">{sourceLabel(collection.source)}</span>
              </p>
              <dl>
                <SummaryRow label={t.gross}>{formatXof(collection.gross)}</SummaryRow>
                <SummaryRow label={t.commission}>{formatXof(collection.commission)}</SummaryRow>
                <SummaryRow label={t.net} strong>
                  {formatXof(collection.netToCreditor)}
                </SummaryRow>
              </dl>
              {collection.receiptDocumentId ? (
                <Link href={recoveryPaths.document(collection.receiptDocumentId)} className={LINK}>
                  {t.receipt}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{t.paymentsNone}</p>
      )}
    </Panel>
  );
}

/* ——— Pièces ——— */

const PIECE_TEXTS: FilePickerTexts = {
  add: t.addLegend,
  uploading: wizardTexts.uploading,
  remove: wizardTexts.removePiece,
  refused: wizardTexts.pieceRefused,
  wrongType: wizardTexts.pieceType,
  tooLarge: wizardTexts.pieceSize,
};

/** Ajout de pièces à un dossier : dépôt par file, puis rattachement (`POST …/documents`), une par une. */
function AddPieces({ recoveryCase, onAdded }: { recoveryCase: RecoveryCase; onAdded: () => void }) {
  const [attaching, setAttaching] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const evidence = recoveryCase.documents.filter((document) => document.kind === 'evidence').length;

  async function attach(files: PickedFile[]) {
    if (!files.length) return;
    setAttaching(true);
    setMessage(null);
    let added = 0;
    const refused: string[] = [];
    for (const file of files) {
      try {
        await addCaseDocument(recoveryCase.id, { fileId: file.id, label: file.name.slice(0, 140) });
        added += 1;
      } catch (caught) {
        refused.push(wizardTexts.pieceRefused(file.name, errorWithReference(describeRecoveryError(caught))));
      }
    }
    setAttaching(false);
    setMessage(
      refused.length ? { tone: 'error', text: refused.join(' ') } : { tone: 'success', text: t.added(added) },
    );
    if (added) onAdded();
  }

  return (
    <div className="border-line grid gap-3 border-t pt-5">
      <FilePicker
        purpose="recovery_evidence"
        accept={EVIDENCE_TYPES}
        maxBytes={EVIDENCE_MAX_BYTES}
        files={[]}
        max={Math.max(0, MAX_EVIDENCE - evidence)}
        onChange={(files) => void attach(files)}
        legend={t.addLegend}
        hint={t.addHint}
        icon={<IconFileCheck />}
        texts={PIECE_TEXTS}
        disabled={attaching}
      />
      <div aria-live="polite">
        {attaching ? <p className="text-small text-ink-muted">{t.adding}</p> : null}
      </div>
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
    </div>
  );
}

export function DocumentsPanel({
  recoveryCase,
  canAdd,
  onAdded,
}: {
  recoveryCase: RecoveryCase;
  canAdd: boolean;
  onAdded: () => void;
}) {
  const documents = recoveryCase.documents;
  return (
    <Panel flat id="dossier-pieces" title={t.documentsTitle}>
      {documents.length ? (
        <ul className="grid gap-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="border-line flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b py-2 last:border-b-0"
            >
              <span className="grid min-w-0 gap-0.5">
                <span className="text-ink flex flex-wrap items-center gap-2 font-medium">
                  <IconFileCheck className="text-brand-ink size-4" />
                  <span className="break-all">{document.label}</span>
                  <Badge tone="neutral">{documentKindLabel(document.kind)}</Badge>
                </span>
                <span className="text-small text-ink-muted">
                  {t.addedOn(formatShortDate(document.addedAt), document.addedBy.displayName)}
                </span>
              </span>
              {document.documentId ? (
                <Link href={recoveryPaths.document(document.documentId)} className={LINK}>
                  {t.open}
                  <span className="sr-only">{` : ${document.label}`}</span>
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{t.documentsNone}</p>
      )}
      {canAdd ? (
        <div className="mt-5">
          <AddPieces recoveryCase={recoveryCase} onAdded={onAdded} />
        </div>
      ) : null}
    </Panel>
  );
}

/* ——— Frais, commission, mandat ——— */

/**
 * Tarification figée au mandat et frais de dossier, tels que les renvoie recovery (`fee.status`,
 * `refundedAmount` affichés fidèlement) ; la règle des frais (frais d'étude, jamais remboursés) est
 * rappelée.
 */
export function PricingPanel({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  const { fee, pricing, mandate, assignedAgent } = recoveryCase;
  const status = fee ? feeStatus(fee.status) : null;
  return (
    <Panel id="dossier-tarification" title={t.pricingTitle}>
      {fee || pricing ? (
        <dl>
          {fee ? (
            <SummaryRow label={t.feeAmount} strong>
              {formatXof(fee.amount)}
            </SummaryRow>
          ) : null}
          {fee && status ? (
            <SummaryRow label={t.feeStatus}>
              <span className="inline-flex flex-wrap items-center justify-end gap-2">
                <Badge tone={status.tone}>{status.label}</Badge>
                {fee.paidAt ? (
                  <span className="text-small">{t.feePaidOn(formatShortDate(fee.paidAt))}</span>
                ) : null}
              </span>
            </SummaryRow>
          ) : null}
          {fee && fee.refundedAmount.amount > 0 ? (
            <SummaryRow label={t.refunded}>{formatXof(fee.refundedAmount)}</SummaryRow>
          ) : null}
          {pricing ? <SummaryRow label={t.commissionRule}>{pricing.commissionSummary}</SummaryRow> : null}
          {mandate ? (
            <SummaryRow label={t.mandate}>
              {mandate.signedAt ? t.mandateSigned(formatShortDate(mandate.signedAt)) : t.mandatePending}
            </SummaryRow>
          ) : null}
          {assignedAgent?.displayName ? (
            <SummaryRow label={t.agent}>{assignedAgent.displayName}</SummaryRow>
          ) : null}
        </dl>
      ) : (
        <p className="text-ink-muted">{t.pricingPending}</p>
      )}
      <p className="text-small text-ink-muted mt-4">{t.feeRule}</p>
      {mandate ? (
        <Link href={recoveryPaths.document(mandate.documentId)} className={cn(LINK, 'mt-2')}>
          {t.readMandate}
        </Link>
      ) : null}
    </Panel>
  );
}

/* ——— Journal ——— */

/** Journal du dossier (`GET …/journal`, les 100 dernières actions), lu à l'ouverture de l'onglet. */
export function JournalPanel({ caseId }: { caseId: string }) {
  const { state, reload } = useResource(useCallback(() => listJournal(caseId), [caseId]));
  if (state.status === 'loading') return <SkeletonCards label={t.journalLoading} rows={3} media={false} />;
  if (state.status === 'error') {
    return (
      <div className="grid justify-items-start gap-3">
        <FormMessage>{errorWithReference(describeRecoveryError(state.error))}</FormMessage>
        <Button variant="secondary" onClick={reload}>
          {t.retry}
        </Button>
      </div>
    );
  }
  const entries = state.data.filter((entry) => !entry.internal);
  return (
    <section aria-labelledby="dossier-journal" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="dossier-journal" className="font-display text-h3 text-ink font-semibold">
          {t.journalTitle}
        </h2>
        <p className="text-small text-ink-muted">{t.journalLead}</p>
      </div>
      {entries.length ? (
        <ol className="border-line grid gap-0 border-l-2 pl-5">
          {entries.map((entry) => (
            <li key={entry.id} className="relative grid gap-1 pb-5 last:pb-0">
              <span
                aria-hidden="true"
                className="bg-surface border-action absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2"
              />
              <p className="text-small text-ink-muted flex flex-wrap items-center gap-2">
                <time dateTime={entry.occurredAt}>{formatDateTime(entry.occurredAt)}</time>
                <Badge tone="neutral">{journalKindLabel(entry.kind)}</Badge>
              </p>
              <p className="text-ink">{entry.summary}</p>
              <p className="text-small text-ink-muted">
                {[
                  entry.amount ? formatXof(entry.amount) : null,
                  entry.author.displayName ? t.by(entry.author.displayName) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {entry.documentId ? (
                <Link href={recoveryPaths.document(entry.documentId)} className={LINK}>
                  {t.open}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-ink-muted">{t.journalNone}</p>
      )}
      {state.data.length >= 100 ? <p className="text-small text-ink-muted">{t.journalTruncated}</p> : null}
    </section>
  );
}
