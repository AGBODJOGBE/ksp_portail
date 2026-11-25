'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { SummaryRow, TextAreaField } from '@/components/ui/form-fields';
import { IconFileCheck } from '@/components/ui/icons';
import { formatShortDate, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { useResource } from '@/lib/use-resource';
import { FilePicker, type FilePickerTexts, type PickedFile } from '@/features/file';
import { WalletPay } from '@/features/wallet';
import { getCase } from '@/features/recovery/api';
import { type DecisionAnswer, answerDecision } from '@/features/recovery/decision-api';
import type { RecoveryDecision, RecoveryDecisionAnswered } from '@/features/recovery/decision-schemas';
import {
  decisionTexts as t,
  disputeReason,
  partnerLabel,
  rhythmLabel,
  violationLabel,
} from '@/features/recovery/decision-texts';
import { EVIDENCE_MAX_BYTES, EVIDENCE_TYPES } from '@/features/recovery/draft';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import { formatRate, stageLabel } from '@/features/recovery/texts';
import { wizardTexts } from '@/features/recovery/wizard-texts';

const LINK = 'text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4';
const COMMENT_MAX = 2000;
/** Pièces jointes à une réponse (contrat `RecoveryAnswerDecisionRequest.fileIds`, 20 au plus). */
const ANSWER_FILES_MAX = 20;

/* ——— Contenu d'une décision, selon son type ——— */

function PlanBody({ plan }: { plan: NonNullable<RecoveryDecision['paymentPlan']> }) {
  return (
    <div className="grid gap-5">
      <p className="text-small text-ink-muted">
        {t.proposedBy(plan.proposedBy)} {plan.renegotiation ? t.renegotiation : null}
      </p>
      <dl>
        <SummaryRow label={t.firstPayment}>{formatXof(plan.terms.firstAmount)}</SummaryRow>
        <SummaryRow label={t.firstDueDate}>{formatShortDate(plan.terms.firstDueDate)}</SummaryRow>
        <SummaryRow label={t.rhythm}>
          {t.rhythmText(plan.terms.installmentsCount, rhythmLabel(plan.terms.rhythm))}
        </SummaryRow>
        <SummaryRow label={t.total} strong>
          {formatXof(plan.total)}
        </SummaryRow>
      </dl>
      {plan.violations.length ? (
        <div className="grid gap-2">
          <h3 className="text-ink font-semibold">{t.outOfScale}</h3>
          <ul className="grid gap-1.5">
            {plan.violations.map((violation) => (
              <li key={violation} className="text-ink flex items-start gap-2">
                <Badge tone="warning">!</Badge>
                {violationLabel(violation)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {plan.installments.length ? (
        <details className="group/details">
          <summary className="text-brand-ink min-h-11 cursor-pointer py-2 font-semibold">
            {`${t.installments} (${plan.installments.length})`}
          </summary>
          <ol className="mt-2 grid gap-1">
            {plan.installments.map((installment) => (
              <li
                key={installment.rank}
                className="border-line flex flex-wrap justify-between gap-x-4 border-b py-1.5 last:border-b-0"
              >
                <span className="text-ink">
                  {`${t.installment(installment.rank)} · ${formatShortDate(installment.dueDate)}`}
                </span>
                <span className="text-ink font-medium tabular-nums">{formatXof(installment.amount)}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

function SettlementBody({ settlement }: { settlement: NonNullable<RecoveryDecision['settlement']> }) {
  return (
    <dl>
      <SummaryRow label={t.payNow} strong>
        {formatXof(settlement.payNow)}
      </SummaryRow>
      <SummaryRow label={t.waived}>{formatXof(settlement.waived)}</SummaryRow>
      <SummaryRow label={t.discount}>{formatRate(settlement.discountBps)}</SummaryRow>
      <SummaryRow label={t.validUntil}>{formatShortDate(settlement.validUntil)}</SummaryRow>
    </dl>
  );
}

function QuoteBody({ quote }: { quote: NonNullable<RecoveryDecision['feeQuote']> }) {
  const partner = [quote.partner.name, quote.partner.office].filter(Boolean).join(', ');
  return (
    <div className="grid gap-5">
      <dl>
        <SummaryRow label={t.partner}>{`${partnerLabel(quote.partner.kind)} · ${partner}`}</SummaryRow>
        <SummaryRow label={t.quoteValidUntil}>{formatShortDate(quote.validUntil)}</SummaryRow>
      </dl>
      {quote.lines.length ? (
        <div className="grid gap-2">
          <h3 className="text-ink font-semibold">{t.quoteLines}</h3>
          <dl>
            {quote.lines.map((line, index) => (
              <SummaryRow key={`${line.label}-${index}`} label={line.label}>
                {formatXof(line.amount)}
              </SummaryRow>
            ))}
          </dl>
        </div>
      ) : null}
      <dl>
        <SummaryRow label={t.quoteTotal}>{formatXof(quote.total)}</SummaryRow>
        <SummaryRow label={t.provision} strong>
          {formatXof(quote.provision)}
        </SummaryRow>
      </dl>
      {quote.documentId ? (
        <Link href={recoveryPaths.document(quote.documentId)} className={LINK}>
          {t.readQuote}
        </Link>
      ) : null}
    </div>
  );
}

function DisputeBody({ dispute }: { dispute: NonNullable<RecoveryDecision['dispute']> }) {
  return (
    <div className="grid gap-4">
      <dl>
        <SummaryRow label={t.reason}>{disputeReason(dispute.reason)}</SummaryRow>
      </dl>
      <p className="text-small text-ink-muted">{t.disputeOpened(formatShortDate(dispute.openedAt))}</p>
      <div className="grid gap-1">
        <h3 className="text-ink font-semibold">{t.debtorText}</h3>
        <p className="text-ink rounded-control bg-surface-muted p-4 whitespace-pre-line">{dispute.text}</p>
        {dispute.fileIds.length ? (
          <p className="text-small text-ink-muted">{t.debtorFiles(dispute.fileIds.length)}</p>
        ) : null}
      </div>
      {dispute.creditorAnswer ? (
        <div className="grid gap-1">
          <h3 className="text-ink font-semibold">{t.yourAnswer}</h3>
          <p className="text-ink whitespace-pre-line">{dispute.creditorAnswer}</p>
        </div>
      ) : null}
      {dispute.resolutionNote ? (
        <div className="grid gap-1">
          <h3 className="text-ink font-semibold">{t.resolution}</h3>
          <p className="text-ink whitespace-pre-line">{dispute.resolutionNote}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Saut d'étape : le contrat ne décrit pas l'étape proposée ; l'étape actuelle est lue sur le dossier. */
function StageSkipBody({ caseId }: { caseId: string }) {
  const { state } = useResource(useCallback(() => getCase(caseId), [caseId]));
  return (
    <div className="grid gap-3">
      {state.status === 'ready' ? (
        <dl>
          <SummaryRow label={t.skipTitle}>{stageLabel(state.data.stage)}</SummaryRow>
        </dl>
      ) : null}
      <p className="text-ink-muted">{t.skipDetailsMissing}</p>
    </div>
  );
}

/** Ce que porte la décision : échéancier, remise, devis, contestation ou saut d'étape. */
export function DecisionBody({ decision }: { decision: RecoveryDecision }) {
  if (decision.paymentPlan) return <PlanBody plan={decision.paymentPlan} />;
  if (decision.settlement) return <SettlementBody settlement={decision.settlement} />;
  if (decision.feeQuote) return <QuoteBody quote={decision.feeQuote} />;
  if (decision.dispute) return <DisputeBody dispute={decision.dispute} />;
  if (decision.kind === 'stage_skip') return <StageSkipBody caseId={decision.caseId} />;
  return null;
}

/** Titre de la section du contenu, selon ce que porte la décision. */
export function bodyTitle(decision: RecoveryDecision): string | null {
  if (decision.paymentPlan) return t.planTitle;
  if (decision.settlement) return t.settlementTitle;
  if (decision.feeQuote) return t.quoteTitle;
  if (decision.dispute) return t.disputeTitle;
  return null;
}

/* ——— Réponse ——— */

export interface AnswerHandlers {
  /** Réponse enregistrée : la décision à jour et le message à garder affiché. */
  onAnswered: (result: RecoveryDecisionAnswered, notice: string) => void;
  /** Décision prise ou expirée entre-temps : la page la relit et garde ce message affiché. */
  onStale: (message: string) => void;
}

/** Envoi d'une réponse : clé d'idempotence par contenu, erreurs ramenées à un message. */
function useAnswer(decision: RecoveryDecision, { onAnswered, onStale }: AnswerHandlers) {
  const submission = useRef(idempotentSubmission());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: DecisionAnswer, notice: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await answerDecision(decision.id, body, submission.current.keyFor(body));
      submission.current.done();
      setBusy(false);
      onAnswered(result, notice);
    } catch (caught) {
      setBusy(false);
      const view = describeRecoveryError(caught);
      if (view.kind === 'newKey') submission.current.done();
      if (view.kind === 'stale' || view.kind === 'notFound') {
        submission.current.done();
        onStale(view.kind === 'stale' ? `${view.message} ${t.closedRefresh}` : t.closedRefresh);
        return;
      }
      setError(errorWithReference(view));
    }
  }
  return { busy, error, send };
}

/**
 * Accepter ou refuser (échéancier, remise, saut d'étape ; refus d'un devis) : le choix ouvre une
 * confirmation avec un commentaire facultatif, puis l'envoi.
 */
export function ApproveReject({
  decision,
  approveHint,
  approve = true,
  rejectLabel = t.reject,
  ...handlers
}: AnswerHandlers & {
  decision: RecoveryDecision;
  /** Ce qu'entraîne l'accord. */
  approveHint?: string;
  /** Faux : seul le refus est proposé ici (l'accord d'un devis passe par le portefeuille). */
  approve?: boolean;
  rejectLabel?: string;
}) {
  const { busy, error, send } = useAnswer(decision, handlers);
  const [choice, setChoice] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const id = `decision-${decision.id}`;

  if (!choice) {
    return (
      <div className="grid gap-4">
        {approve && approveHint ? <p className="text-ink">{approveHint}</p> : null}
        <div className="flex flex-wrap gap-3">
          {approve ? (
            <Button variant="action" onClick={() => setChoice('approve')}>
              {t.approve}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setChoice('reject')}>
            {rejectLabel}
          </Button>
        </div>
      </div>
    );
  }

  const approving = choice === 'approve';
  return (
    <form
      className="rounded-control border-line bg-surface-muted grid gap-4 border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = comment.trim();
        void send(
          { answer: choice, ...(trimmed ? { comment: trimmed } : {}) },
          approving ? t.approved : t.rejected,
        );
      }}
    >
      {approving && approveHint ? <p className="text-ink font-medium">{approveHint}</p> : null}
      <TextAreaField
        id={`${id}-commentaire`}
        label={t.commentLabel}
        hint={t.commentHint}
        value={comment}
        maxLength={COMMENT_MAX}
        onChange={(event) => setComment(event.target.value)}
        counter={t.counter(comment.length, COMMENT_MAX)}
        rows={3}
      />
      <FormMessage>{error}</FormMessage>
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant={approving ? 'action' : 'primary'}
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy ? t.sending : approving ? t.confirmApprove : t.confirmReject}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setChoice(null)} disabled={busy}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Devis d'huissier ou judiciaire : l'accord débite la provision du portefeuille (`WalletPay` : confirmation,
 * solde insuffisant → recharge puis retour ici, clé gardée pendant les renvois) ; le refus passe par la
 * confirmation ordinaire.
 */
export function QuoteAnswer({
  decision,
  ...handlers
}: AnswerHandlers & {
  decision: RecoveryDecision & { feeQuote: NonNullable<RecoveryDecision['feeQuote']> };
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <p className="text-ink">{t.approveQuote(formatXof(decision.feeQuote.provision))}</p>
        <WalletPay
          pay={(key) => answerDecision(decision.id, { answer: 'approve' }, key)}
          amount={decision.feeQuote.provision}
          label={t.payProvision}
          returnTo={recoveryPaths.decision(decision.id)}
          onPaid={(result, notice) => handlers.onAnswered(result, `${t.approved} ${notice}`)}
          onStale={() => handlers.onStale(t.closedRefresh)}
        />
      </div>
      <div className="border-line border-t pt-5">
        <ApproveReject decision={decision} approve={false} rejectLabel={t.rejectQuote} {...handlers} />
      </div>
    </div>
  );
}

const ANSWER_FILE_TEXTS: FilePickerTexts = {
  add: t.filesLegend,
  uploading: wizardTexts.uploading,
  remove: wizardTexts.removePiece,
  refused: wizardTexts.pieceRefused,
  wrongType: wizardTexts.pieceType,
  tooLarge: wizardTexts.pieceSize,
};

/** Réponse à une contestation : explications et pièces (déposées par file, `recovery_evidence`). */
export function DisputeAnswer({ decision, ...handlers }: AnswerHandlers & { decision: RecoveryDecision }) {
  const { busy, error, send } = useAnswer(decision, handlers);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [missing, setMissing] = useState(false);
  const id = `contestation-${decision.id}`;

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = text.trim();
        if (!trimmed && !files.length) {
          setMissing(true);
          document.getElementById(`${id}-reponse`)?.focus();
          return;
        }
        setMissing(false);
        void send(
          {
            answer: 'answer',
            ...(trimmed ? { comment: trimmed } : {}),
            ...(files.length ? { fileIds: files.map((file) => file.id) } : {}),
          },
          t.answered,
        );
      }}
    >
      <TextAreaField
        id={`${id}-reponse`}
        label={t.answerLabel}
        hint={t.answerHint}
        value={text}
        maxLength={COMMENT_MAX}
        onChange={(event) => setText(event.target.value)}
        counter={t.counter(text.length, COMMENT_MAX)}
        error={missing ? t.answerRequired : null}
        rows={5}
      />
      <FilePicker
        purpose="recovery_evidence"
        accept={EVIDENCE_TYPES}
        maxBytes={EVIDENCE_MAX_BYTES}
        files={files}
        max={ANSWER_FILES_MAX}
        onChange={setFiles}
        legend={t.filesLegend}
        hint={t.filesHint}
        icon={<IconFileCheck />}
        texts={ANSWER_FILE_TEXTS}
        disabled={busy}
      />
      <FormMessage>{error}</FormMessage>
      <Button
        type="submit"
        variant="action"
        className="justify-self-start"
        disabled={busy}
        aria-busy={busy || undefined}
      >
        {busy ? t.sending : t.sendAnswer}
      </Button>
    </form>
  );
}
