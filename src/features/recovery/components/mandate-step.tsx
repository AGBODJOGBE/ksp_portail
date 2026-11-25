'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { ChoicePill, SummaryRow } from '@/components/ui/form-fields';
import { formatDateTime, formatXof } from '@/lib/format';
import { DocumentSigning } from '@/features/document';
import { useReadOnly } from '@/features/identity';
import { getCase, prepareMandate } from '@/features/recovery/api';
import {
  type RecoveryErrorView,
  describeRecoveryError,
  errorWithReference,
} from '@/features/recovery/errors';
import { recoveryPaths } from '@/features/recovery/paths';
import type { RecoveryCase } from '@/features/recovery/schemas';
import { FEE_RULE, recoveryTexts } from '@/features/recovery/texts';
import { wizardTexts as t } from '@/features/recovery/wizard-texts';

/** Dossier semblable signalé (création : `possibleDuplicates` ; mandat : `details.duplicates`). */
export interface Duplicate {
  number: string;
  id?: string;
  debtorName?: string;
}

/** Relecture après la signature : toutes les 2 s pendant une minute, puis « Vérifier à nouveau ». */
const POLL_MS = 2000;
const POLL_TRIES = 30;

/**
 * Attend que recovery ait reçu la signature (événement `document.signature.completed`, asynchrone) : le
 * dossier relu passe `awaiting_fee`. `onReady` reçoit le dossier à jour.
 */
function useSignedCase(
  caseId: string,
  active: boolean,
  onReady: { current: (recoveryCase: RecoveryCase) => void },
) {
  const [slow, setSlow] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let tries = 0;
    let timer = 0;
    const check = async () => {
      tries += 1;
      try {
        const current = await getCase(caseId);
        if (stopped) return;
        if (current.status !== 'draft') return onReady.current(current);
      } catch {
        // Lecture manquée : la suivante réessaie.
      }
      if (stopped) return;
      if (tries >= POLL_TRIES) setSlow(true);
      else timer = window.setTimeout(check, POLL_MS);
    };
    timer = window.setTimeout(check, POLL_MS / 2);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [caseId, active, onReady, round]);

  return {
    slow,
    retry: () => {
      setSlow(false);
      setRound((value) => value + 1);
    },
  };
}

/** Conditions figées dans le mandat : frais de dossier et commission en clair. */
export function FrozenConditions({ recoveryCase }: { recoveryCase: RecoveryCase }) {
  if (!recoveryCase.fee && !recoveryCase.pricing) return null;
  return (
    <div className="rounded-card border-line bg-surface-muted grid gap-2 border p-4">
      <p className="text-ink font-semibold">{t.frozenTitle}</p>
      <dl>
        {recoveryCase.fee ? (
          <SummaryRow label={t.caseFee} strong>
            {formatXof(recoveryCase.fee.amount)}
          </SummaryRow>
        ) : null}
        {recoveryCase.pricing ? (
          <SummaryRow label={t.commission}>{recoveryCase.pricing.commissionSummary}</SummaryRow>
        ) : null}
      </dl>
      <p className="text-small text-ink-muted">{FEE_RULE}</p>
    </div>
  );
}

/**
 * Mandat d'un brouillon (R-SD-03) : dossiers semblables à confirmer, préparation (`POST …/mandate`, frais
 * et commission figés, code envoyé au créancier), lecture et signature par code (`DocumentSigning`), puis
 * relecture jusqu'au passage `awaiting_fee`. Le mandat est signé par le membre qui l'a préparé ; les
 * autres voient qu'il l'attend. Refus : tarif non publié, montant sous le minimum, pièce manquante.
 */
export function MandateStep({
  recoveryCase: initial,
  duplicates: known = [],
  onReady,
  onPrepared,
  onFix,
}: {
  recoveryCase: RecoveryCase;
  /** Dossiers semblables déjà connus (réponse de la création). */
  duplicates?: ReadonlyArray<Duplicate>;
  /** Mandat signé et dossier passé « frais à payer » (ou au-delà). */
  onReady: (recoveryCase: RecoveryCase) => void;
  /** Refus rattaché à la saisie : revenir à l'étape des créances (`claims`) ou des pièces (`evidence`). */
  onFix?: (step: 'claims' | 'evidence') => void;
  /** Mandat préparé : le dossier à jour (frais et commission figés). */
  onPrepared?: (recoveryCase: RecoveryCase) => void;
}) {
  const readOnly = useReadOnly();
  const [current, setCurrent] = useState(initial);
  const [duplicates, setDuplicates] = useState<ReadonlyArray<Duplicate>>(known);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [error, setError] = useState<RecoveryErrorView | null>(null);
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(false);
  const heading = useRef<HTMLParagraphElement>(null);
  // Rappel du parent gardé dans une référence : la relecture ne repart pas à chaque rendu.
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });
  const waiting = useSignedCase(current.id, signed, ready);
  const pendingMandate = current.mandate?.status === 'pending_signature' ? current.mandate : null;

  useEffect(() => {
    if (current.status !== 'draft') ready.current(current);
  }, [current]);

  async function prepare() {
    if (busy) return;
    if (duplicates.length && !acknowledged) {
      setAckError(t.duplicatesMissing);
      return;
    }
    setBusy(true);
    setError(null);
    setAckError(null);
    try {
      const prepared = await prepareMandate(current.id, duplicates.length > 0 && acknowledged);
      setCurrent(prepared.case);
      onPrepared?.(prepared.case);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (caught) {
      const view = describeRecoveryError(caught);
      if (view.kind === 'duplicates') {
        setDuplicates(view.duplicates.map((number) => ({ number })));
        setAcknowledged(false);
      }
      if (view.kind === 'stale') {
        getCase(current.id).then(setCurrent, () => undefined);
      }
      setError(view);
    } finally {
      setBusy(false);
    }
  }

  if (readOnly) return <FormMessage tone="info">{recoveryTexts.readOnly}</FormMessage>;

  if (signed) {
    return (
      <div className="grid justify-items-start gap-3" aria-live="polite">
        <p className="text-ink">{waiting.slow ? t.signedSlow : t.signedWaiting}</p>
        {waiting.slow ? (
          <Button variant="secondary" onClick={waiting.retry}>
            {t.checkAgain}
          </Button>
        ) : null}
      </div>
    );
  }

  if (pendingMandate) {
    return (
      <div className="grid gap-5">
        <p ref={heading} tabIndex={-1} className="sr-only">
          {t.steps.mandate}
        </p>
        <FrozenConditions recoveryCase={current} />
        <DocumentSigning
          documentId={pendingMandate.documentId}
          idPrefix="mandat"
          waiting={t.waitingSigner}
          onSigned={() => setSigned(true)}
        />
      </div>
    );
  }

  const deadline =
    current.nextDeadline?.kind === 'fee_payment' ? formatDateTime(current.nextDeadline.dueAt) : null;
  return (
    <div className="grid gap-5">
      {duplicates.length ? (
        <div className="rounded-card border-warning bg-warning-soft grid gap-3 border p-4">
          <p className="text-ink font-semibold">{t.duplicatesTitle}</p>
          <p className="text-small text-ink">{t.duplicatesText}</p>
          <ul className="grid gap-1">
            {duplicates.map((duplicate) => (
              <li key={duplicate.number} className="text-small text-ink">
                {duplicate.id ? (
                  <Link
                    href={recoveryPaths.case(duplicate.id)}
                    className="text-brand-ink font-semibold underline underline-offset-4"
                  >
                    {duplicate.number}
                  </Link>
                ) : (
                  <span className="font-semibold">{duplicate.number}</span>
                )}
                {duplicate.debtorName ? ` · ${duplicate.debtorName}` : ''}
              </li>
            ))}
          </ul>
          <ChoicePill
            type="checkbox"
            className="justify-self-start"
            label={t.duplicatesConfirm}
            checked={acknowledged}
            onChange={(event) => {
              setAcknowledged(event.target.checked);
              setAckError(null);
            }}
          />
          {ackError ? <FormMessage>{ackError}</FormMessage> : null}
        </div>
      ) : null}
      <div className="grid gap-2">
        <p ref={heading} tabIndex={-1} className="text-ink font-semibold focus:outline-none">
          {t.prepareTitle}
        </p>
        <p className="text-small text-ink-muted">{t.prepareText}</p>
        {deadline ? <p className="text-small text-ink-muted">{t.draftDeadline(deadline)}</p> : null}
      </div>
      <Button
        variant="action"
        size="lg"
        className="justify-self-start"
        onClick={() => void prepare()}
        disabled={busy}
        aria-busy={busy || undefined}
      >
        {busy ? t.preparing : t.prepare}
      </Button>
      {error && error.kind !== 'duplicates' ? (
        <div className="grid justify-items-start gap-3">
          <FormMessage tone={error.kind === 'pricingUnavailable' ? 'info' : 'error'}>
            {error.kind === 'belowMinimum'
              ? t.belowMinimum(error.minimum === null ? null : formatXof(error.minimum))
              : errorWithReference(error)}
          </FormMessage>
          {onFix && (error.kind === 'belowMinimum' || error.kind === 'fields') ? (
            <Button
              variant="secondary"
              onClick={() =>
                onFix(error.kind === 'fields' && error.fields['evidenceFileIds'] ? 'evidence' : 'claims')
              }
            >
              {t.goToStep}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
