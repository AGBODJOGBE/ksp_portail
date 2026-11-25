'use client';

import { type FormEvent, type ReactNode, useCallback, useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { ChoicePill, Fieldset, TextAreaField } from '@/components/ui/form-fields';
import { IconCheck, IconFileCheck } from '@/components/ui/icons';
import { LinkSheet, LinkSheetEyebrow, LinkSheetOutcome, LinkSheetSection } from '@/components/ui/link-sheet';
import { formatShortDate } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { FilePicker, type PickedFile } from '@/features/file';
import { type DisputeReason, disputeDebtorCase, uploadDebtorFile } from '@/features/recovery/debtor-api';
import type { DebtorCase, DebtorDispute as Dispute } from '@/features/recovery/debtor-schemas';
import { DISPUTE_REASONS, debtorTexts as t } from '@/features/recovery/debtor-texts';
import { BackToSituation, type Fail, useFocusOnMount } from './debtor-parts';

const NEEDS = [
  {
    method: 'POST' as const,
    path: '/api/v1/recovery/debtor/uploads',
    purpose: 'Pièce de la contestation : adresse PUT présignée, puis confirmation (`uploads/{id}/complete`).',
  },
  {
    method: 'POST' as const,
    path: '/api/v1/recovery/debtor/disputes',
    purpose: 'Contestation : motif, texte, pièces ; le dossier est suspendu.',
  },
];

/** Contrat : texte de 10 à 2 000 caractères, 10 pièces au plus (PDF, JPEG, PNG, WebP ; 10 Mo). */
const TEXT_MIN = 10;
const TEXT_MAX = 2000;
const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * D6 — Contester : motif (cinq valeurs du contrat), texte, jusqu'à dix pièces envoyées une à une par le
 * dépôt du débiteur (`debtor/uploads`, `PUT` présigné, `uploads/{id}/complete`), puis la contestation
 * (`Idempotency-Key` par saisie). Le dossier est alors suspendu ; la situation le montre au retour.
 */
export function DebtorDispute({
  session,
  fail,
  onBack,
  sessionBar,
}: {
  session: string;
  debtorCase: DebtorCase;
  fail: Fail;
  onBack: () => void;
  sessionBar: ReactNode;
}) {
  const [reason, setReason] = useState<DisputeReason | ''>('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(false);
  const [sent, setSent] = useState<Dispute | null>(null);
  const [submission] = useState(() => idempotentSubmission());
  const reasonRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useFocusOnMount<HTMLHeadingElement>();

  // Dépôt d'une pièce avec la session ; session perdue : l'écran parent revient au code.
  const upload = useCallback(
    async (file: File) => {
      try {
        return await uploadDebtorFile(session, file);
      } catch (caught) {
        const view = fail(caught);
        if (view?.kind === 'pending') setPendingRoute(true);
        throw caught;
      }
    },
    [session, fail],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const trimmed = text.trim();
    const found: Record<string, string> = {};
    if (!reason) found.reason = t.reasonMissing;
    if (trimmed.length < TEXT_MIN) found.text = t.disputeTextShort;
    else if (trimmed.length > TEXT_MAX) found.text = t.disputeTextLong;
    setErrors(found);
    if (!reason || Object.keys(found).length) {
      (found.reason ? reasonRef : textRef).current?.focus();
      return;
    }
    const body = { reason, text: trimmed, fileIds: files.map((file) => file.id) };
    setBusy(true);
    try {
      const dispute = await disputeDebtorCase(session, body, submission.keyFor(body));
      submission.done();
      setSent(dispute);
    } catch (caught) {
      const view = fail(caught);
      if (!view) return;
      if (view.kind === 'pending') return setPendingRoute(true);
      if (view.kind === 'newKey') submission.done();
      if (view.kind === 'fields' && view.field && ['reason', 'text', 'fileIds'].includes(view.field)) {
        setErrors({ [view.field === 'fileIds' ? 'files' : view.field]: view.message });
        if (view.field === 'reason') reasonRef.current?.focus();
        if (view.field === 'text') textRef.current?.focus();
        return;
      }
      setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  const head = (
    <div className="grid gap-4">
      <BackToSituation onBack={onBack} />
      <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
      <h1
        id="debiteur-contester"
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-h2 text-ink font-bold focus:outline-none"
      >
        {t.disputeTitle}
      </h1>
      {sessionBar}
    </div>
  );

  if (sent) {
    return (
      <LinkSheet labelledBy="debiteur-contester" head={head}>
        <LinkSheetSection className="pb-8">
          <LinkSheetOutcome tone="success" icon={<IconCheck className="size-6" />} title={t.disputedTitle}>
            <p>{t.disputedText(formatShortDate(sent.creditorAnswerDueAt))}</p>
          </LinkSheetOutcome>
          <Button variant="action" size="lg" className="w-full" onClick={onBack}>
            {t.backToSituation}
          </Button>
        </LinkSheetSection>
      </LinkSheet>
    );
  }

  return (
    <LinkSheet labelledBy="debiteur-contester" head={head}>
      {pendingRoute ? (
        <LinkSheetSection className="pb-8">
          <BackendPending
            id="debiteur-contestation-attente"
            title={t.disputeTitle}
            needs={NEEDS}
            className="shadow-none"
          >
            {t.disputePending}
          </BackendPending>
        </LinkSheetSection>
      ) : (
        <form noValidate onSubmit={submit}>
          <LinkSheetSection>
            <p className="text-ink-muted">{t.disputeLead}</p>
            <Fieldset
              id="debiteur-motif"
              legend={t.reasonLegend}
              error={errors.reason}
              legendClassName="text-lg"
            >
              <div className="grid gap-2">
                {DISPUTE_REASONS.map((item, index) => (
                  <ChoicePill
                    key={item.value}
                    ref={index === 0 ? reasonRef : undefined}
                    name="motif"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    label={item.label}
                    hint={item.hint}
                    aria-invalid={errors.reason ? true : undefined}
                  />
                ))}
              </div>
            </Fieldset>
            <TextAreaField
              id="debiteur-explication"
              ref={textRef}
              label={t.disputeText}
              hint={t.disputeTextHint}
              rows={6}
              value={text}
              maxLength={TEXT_MAX}
              onChange={(event) => setText(event.target.value)}
              counter={t.counter(text.length, TEXT_MAX)}
              error={errors.text}
            />
          </LinkSheetSection>
          <LinkSheetSection>
            <FilePicker
              upload={upload}
              accept={FILE_TYPES}
              maxBytes={MAX_BYTES}
              files={files}
              max={MAX_FILES}
              onChange={setFiles}
              legend={t.filesLegend}
              hint={t.filesHint}
              icon={<IconFileCheck />}
              texts={t.files}
              error={errors.files}
              disabled={busy}
            />
          </LinkSheetSection>
          <LinkSheetSection className="pb-8">
            <FormMessage>{error}</FormMessage>
            <Button type="submit" variant="action" size="lg" className="w-full" aria-busy={busy || undefined}>
              {busy ? t.sendingDispute : t.sendDispute}
            </Button>
          </LinkSheetSection>
        </form>
      )}
    </LinkSheet>
  );
}
