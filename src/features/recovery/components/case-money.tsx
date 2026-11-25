'use client';

import { useRef, useState } from 'react';
import { BackendPending } from '@/components/ui/backend-pending';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { ChoicePill, Panel, TextAreaField } from '@/components/ui/form-fields';
import { IconFileCheck } from '@/components/ui/icons';
import { isBackendPending } from '@/lib/api';
import { beninDate, formatXof } from '@/lib/format';
import { idempotentSubmission } from '@/lib/idempotency';
import { FilePicker, type FilePickerTexts, type PickedFile } from '@/features/file';
import { EVIDENCE_MAX_BYTES, EVIDENCE_TYPES } from '@/features/recovery/draft';
import { describeRecoveryError, errorWithReference } from '@/features/recovery/errors';
import { type DirectPaymentBody, declareDirectPayment, stopCase } from '@/features/recovery/money-api';
import { directPaymentTexts, stopNeeds, stopTexts } from '@/features/recovery/money-texts';
import type { RecoveryCase } from '@/features/recovery/schemas';
import { wizardTexts } from '@/features/recovery/wizard-texts';

const NOTE_MAX = 500;
const REASON_MAX = 500;

export interface CaseMoneyProps {
  recoveryCase: RecoveryCase;
  /** Dossier à jour après l'action, et le message à garder affiché. */
  onChange: (recoveryCase: RecoveryCase, notice: string) => void;
  /** Dossier changé entre-temps : la fiche se relit. */
  onStale: () => void;
}

/**
 * Actions d'argent d'un dossier en cours (actif ou suspendu) : déclarer un paiement reçu directement, et
 * arrêter le dossier. Chacune s'ouvre d'un bouton, pour ne pas encombrer la fiche ; ses conséquences sont
 * écrites en clair avant l'envoi.
 */
export function CaseMoneyActions(props: CaseMoneyProps) {
  return (
    <div className="grid gap-8">
      <DirectPayment {...props} />
      <StopCase {...props} />
    </div>
  );
}

/* ——— Paiement reçu directement ——— */

const PROOF_TEXTS: FilePickerTexts = {
  add: directPaymentTexts.proofLegend,
  uploading: wizardTexts.uploading,
  remove: wizardTexts.removePiece,
  refused: wizardTexts.pieceRefused,
  wrongType: wizardTexts.pieceType,
  tooLarge: wizardTexts.pieceSize,
};

/** Montant saisi (espaces tolérés) → entier strictement positif, ou null. */
function amountOf(value: string): number | null {
  const compact = value.replace(/[\s  ]/g, '');
  if (!/^\d+$/.test(compact)) return null;
  const amount = Number(compact);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

/**
 * « Déclarer un paiement reçu » (`POST …/direct-payments`, R-PR-07) : montant, date (aujourd'hui au plus),
 * note et preuve facultatives. La commission de KSP sur ce paiement est facturée chaque mois. Clé
 * d'idempotence par contenu : un renvoi du même paiement ne l'enregistre qu'une fois.
 */
function DirectPayment({ recoveryCase, onChange, onStale }: CaseMoneyProps) {
  const t = directPaymentTexts;
  const today = beninDate();
  const submission = useRef(idempotentSubmission());
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<PickedFile[]>([]);
  const [fields, setFields] = useState<{ amount?: string; receivedOn?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = 'paiement-direct';

  function reset() {
    setOpen(false);
    setAmount('');
    setDate(today);
    setNote('');
    setProof([]);
    setFields({});
    setError(null);
  }

  async function submit() {
    const value = amountOf(amount);
    const problems = {
      ...(value === null ? { amount: t.amountInvalid } : {}),
      ...(!date || date > today ? { receivedOn: t.dateInvalid } : {}),
    };
    setFields(problems);
    if (Object.keys(problems).length) {
      document.getElementById(problems.amount ? `${id}-montant` : `${id}-date`)?.focus();
      return;
    }
    const body: DirectPaymentBody = {
      amount: { amount: value!, currency: 'XOF' },
      receivedOn: date,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(proof[0] ? { proofFileId: proof[0].id } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      const result = await declareDirectPayment(recoveryCase.id, body, submission.current.keyFor(body));
      submission.current.done();
      setBusy(false);
      reset();
      onChange(result.case, t.done(formatXof(body.amount), formatXof(result.case.amounts.due)));
    } catch (caught) {
      setBusy(false);
      const view = describeRecoveryError(caught);
      if (view.kind === 'newKey') submission.current.done();
      if (view.kind === 'fields' && view.fields['amount']) {
        setFields({ amount: view.fields['amount'] });
        document.getElementById(`${id}-montant`)?.focus();
        return;
      }
      if (view.kind === 'fields' && view.fields['receivedOn']) {
        setFields({ receivedOn: view.fields['receivedOn'] });
        return;
      }
      setError(errorWithReference(view));
      if (view.kind === 'stale') onStale();
    }
  }

  return (
    <Panel id={`${id}-titre`} title={t.title}>
      <div className="grid gap-4">
        <p className="text-ink-muted">{t.lead}</p>
        <p className="text-small text-ink">{t.commission}</p>
        {recoveryCase.status === 'suspended' ? (
          <p className="text-small text-ink-muted">{t.suspended}</p>
        ) : null}
        {!open ? (
          <Button variant="secondary" className="justify-self-start" onClick={() => setOpen(true)}>
            {t.open}
          </Button>
        ) : (
          <form
            noValidate
            className="rounded-control border-line bg-surface-muted grid gap-5 border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <TextField
              id={`${id}-montant`}
              label={t.amountLabel}
              hint={t.amountHint(formatXof(recoveryCase.amounts.due))}
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={fields.amount}
            />
            <TextField
              id={`${id}-date`}
              type="date"
              label={t.dateLabel}
              hint={t.dateHint}
              max={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              error={fields.receivedOn}
            />
            <TextAreaField
              id={`${id}-note`}
              label={t.noteLabel}
              hint={t.noteHint}
              rows={3}
              maxLength={NOTE_MAX}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              counter={t.counter(note.length)}
            />
            <FilePicker
              purpose="recovery_evidence"
              accept={EVIDENCE_TYPES}
              maxBytes={EVIDENCE_MAX_BYTES}
              files={proof}
              max={1}
              onChange={setProof}
              legend={t.proofLegend}
              hint={t.proofHint}
              icon={<IconFileCheck />}
              texts={PROOF_TEXTS}
              disabled={busy}
            />
            <FormMessage>{error}</FormMessage>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="action" disabled={busy} aria-busy={busy || undefined}>
                {busy ? t.submitting : t.submit}
              </Button>
              <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
                {t.cancel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Panel>
  );
}

/* ——— Arrêt du dossier ——— */

/**
 * Route du contrat pas encore servie (501 `RECOVERY_NOT_IMPLEMENTED`), vue une fois dans l'onglet : les
 * autres dossiers affichent directement « Bientôt disponible » (un arrêt ne se sonde pas).
 */
let stopPending = false;

/** Pour les tests : oublie la route vue « pas encore servie ». */
export function resetStopPending() {
  stopPending = false;
}

/**
 * « Arrêter le dossier » (`POST …/stop`, R-PR-06) : conséquences écrites en clair (commission due sur
 * l'encaissé et sur un paiement direct reçu dans les 30 jours ; frais de dossier jamais remboursés), motif
 * de 3 à 500 caractères, case de confirmation.
 */
function StopCase({ recoveryCase, onChange, onStale }: CaseMoneyProps) {
  const t = stopTexts;
  const [pending, setPending] = useState(stopPending);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [fields, setFields] = useState<{ reason?: string; acknowledged?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = 'arret-dossier';

  if (pending) {
    return (
      <BackendPending id={id} title={t.pendingTitle} needs={stopNeeds} headingAs="h2">
        {t.pendingText}
      </BackendPending>
    );
  }

  async function submit() {
    const trimmed = reason.trim();
    const problems = {
      ...(trimmed.length < 3 ? { reason: t.reasonTooShort } : {}),
      ...(!acknowledged ? { acknowledged: t.acknowledgeRequired } : {}),
    };
    setFields(problems);
    if (Object.keys(problems).length) {
      document.getElementById(problems.reason ? `${id}-motif` : `${id}-accord`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const stopped = await stopCase(recoveryCase.id, trimmed);
      setBusy(false);
      setOpen(false);
      onChange(stopped, t.done);
    } catch (caught) {
      setBusy(false);
      if (isBackendPending(caught)) {
        stopPending = true;
        setPending(true);
        return;
      }
      const view = describeRecoveryError(caught);
      if (view.kind === 'fields' && view.fields['reason']) {
        setFields({ reason: view.fields['reason'] });
        return;
      }
      setError(errorWithReference(view));
      if (view.kind === 'stale') onStale();
    }
  }

  return (
    <Panel id={`${id}-titre`} title={t.title}>
      <div className="grid gap-4">
        <p className="text-ink-muted">{t.lead}</p>
        <div className="grid gap-2">
          <h3 className="text-ink font-semibold">{t.consequencesTitle}</h3>
          <ul className="text-ink grid list-disc gap-1.5 pl-5">
            {t.consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {!open ? (
          <Button variant="danger" className="justify-self-start" onClick={() => setOpen(true)}>
            {t.open}
          </Button>
        ) : (
          <form
            noValidate
            className="rounded-control border-danger/40 bg-surface-muted grid gap-5 border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <TextAreaField
              id={`${id}-motif`}
              label={t.reasonLabel}
              hint={t.reasonHint}
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              counter={t.counter(reason.length)}
              error={fields.reason}
            />
            <div className="grid gap-1">
              <ChoicePill
                id={`${id}-accord`}
                type="checkbox"
                label={t.acknowledge}
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                aria-invalid={fields.acknowledged ? true : undefined}
                aria-describedby={fields.acknowledged ? `${id}-accord-erreur` : undefined}
              />
              {fields.acknowledged ? (
                <p id={`${id}-accord-erreur`} className="text-small text-danger font-medium">
                  {fields.acknowledged}
                </p>
              ) : null}
            </div>
            <FormMessage>{error}</FormMessage>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary" disabled={busy} aria-busy={busy || undefined}>
                {busy ? t.submitting : t.submit}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                {t.cancel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Panel>
  );
}
