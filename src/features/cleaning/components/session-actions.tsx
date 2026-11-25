'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { beninDate, formatDateTime, formatTime } from '@/lib/format';
import { cancelSession, rescheduleSession } from '@/features/cleaning/api';
import {
  type CleaningErrorView,
  describeCleaningError,
  errorWithReference,
} from '@/features/cleaning/errors';
import { idempotentSubmission } from '@/lib/idempotency';
import { cleaningPaths } from '@/features/cleaning/paths';
import { sessionTexts as t } from '@/features/cleaning/program-texts';
import type { Session } from '@/features/cleaning/schemas';
import { CURRENT_TERMS_VERSION } from '@/features/cleaning/terms';
import { Panel } from '@/components/ui/form-fields';

/**
 * Délai avant la séance pendant lequel le client agit seul (partie 12, R-RP-01 : « plus de 24 h avant »,
 * `DEFAULT_FREE_CANCELLATION_HOURS` du back, réglable par KSP). Sert seulement à proposer les boutons ou
 * le support ; la gateway reste juge (`CLEANING_CANCELLATION_TOO_LATE`, `CLEANING_LEAD_TIME_TOO_SHORT`).
 */
export const FREE_CHANGE_MS = 24 * 3_600_000;

/** Codes qui renvoient vers le support plutôt qu'un nouvel essai. */
const SUPPORT_CODES = new Set(['CLEANING_CANCELLATION_TOO_LATE', 'CLEANING_RESCHEDULE_LIMIT_REACHED']);

/** Heure du Bénin (UTC+1, sans heure d'été) → ISO 8601 UTC. */
const beninInstant = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function SupportLink() {
  return (
    <Link
      href={cleaningPaths.support}
      className="text-brand-ink inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline"
    >
      {t.contact}
    </Link>
  );
}

/** Erreur d'un report ou d'une annulation : message de la gateway, et le support quand il le faut. */
function Problem({ problem }: { problem: CleaningErrorView }) {
  return (
    <div className="grid justify-items-start gap-2">
      <FormMessage>
        {problem.code === 'CLEANING_INVALID_TRANSITION'
          ? `${problem.message} ${t.conflict}`
          : errorWithReference(problem)}
      </FormMessage>
      {SUPPORT_CODES.has(problem.code) ? <SupportLink /> : null}
    </div>
  );
}

/**
 * Reporter ou annuler une séance pas encore commencée. Au-delà du délai : nouvelle date et heure, ou
 * annulation confirmée, sans frais. En deçà : le support seulement (une annulation tardive reste due en
 * partie). Programme suspendu : pas de report. La réponse remplace la séance affichée.
 */
export function SessionChange({
  session,
  programSuspended,
  onReplace,
  onChanged,
  now = new Date(),
}: {
  session: Session;
  programSuspended: boolean;
  onReplace: (session: Session) => void;
  onChanged: () => void;
  now?: Date;
}) {
  const [mode, setMode] = useState<'idle' | 'reschedule' | 'cancel'>('idle');
  const [done, setDone] = useState<string | null>(null);
  const tooLate = new Date(session.scheduledStart).getTime() - now.getTime() < FREE_CHANGE_MS;

  return (
    <Panel id="reporter-titre" title={t.changeTitle}>
      <div className="grid gap-4">
        {done ? <FormMessage tone="success">{done}</FormMessage> : null}
        {tooLate ? (
          <div className="grid justify-items-start gap-2">
            <p className="text-ink">{t.tooLate}</p>
            <SupportLink />
          </div>
        ) : (
          <>
            <p className="text-ink">{t.changeLead}</p>
            <Link
              href={`${cleaningPaths.terms(CURRENT_TERMS_VERSION)}#report-annulation`}
              target="_blank"
              className="text-small text-brand-ink inline-flex min-h-11 items-center justify-self-start font-semibold underline underline-offset-4"
            >
              {t.rulesLink}
            </Link>
            {programSuspended ? <FormMessage tone="info">{t.suspendedProgram}</FormMessage> : null}
            {mode === 'reschedule' ? (
              <RescheduleForm
                session={session}
                onClose={() => setMode('idle')}
                onDone={(updated) => {
                  setMode('idle');
                  setDone(t.rescheduleDone);
                  onReplace(updated);
                }}
                onStale={onChanged}
              />
            ) : mode === 'cancel' ? (
              <CancelConfirm
                session={session}
                onClose={() => setMode('idle')}
                onDone={(updated) => {
                  setMode('idle');
                  setDone(t.cancelled);
                  onReplace(updated);
                }}
                onStale={onChanged}
              />
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                {programSuspended ? null : (
                  <Button variant="secondary" onClick={() => setMode('reschedule')}>
                    {t.reschedule}
                  </Button>
                )}
                <Button variant="danger" onClick={() => setMode('cancel')}>
                  {t.cancel}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function RescheduleForm({
  session,
  onClose,
  onDone,
  onStale,
}: {
  session: Session;
  onClose: () => void;
  onDone: (session: Session) => void;
  onStale: () => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState(() => formatTime(session.scheduledStart));
  const [errors, setErrors] = useState<{ date?: string; time?: string }>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const submission = useRef(idempotentSubmission());

  async function send() {
    const found = {
      ...(date ? {} : { date: t.dateRequired }),
      ...(TIME.test(time) ? {} : { time: t.timeRequired }),
    };
    setErrors(found);
    if (Object.keys(found).length) return;
    const newStart = beninInstant(date, time);
    setBusy(true);
    setProblem(null);
    try {
      const updated = await rescheduleSession(session.id, newStart, submission.current.keyFor(newStart));
      submission.current.done();
      onDone(updated);
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      if (view.fields['newStart']) setErrors({ date: view.fields['newStart'] });
      setProblem(view);
      if (view.code === 'CLEANING_INVALID_TRANSITION') onStale();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      className="swap-in rounded-card border-line bg-surface-muted grid gap-4 border p-4 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <p className="text-small text-ink-muted">{t.rescheduleHint}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="report-date"
          label={t.rescheduleDate}
          type="date"
          min={beninDate()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          error={errors.date ?? null}
        />
        <TextField
          id="report-heure"
          label={t.rescheduleTime}
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          error={errors.time ?? null}
        />
      </div>
      {problem && !problem.fields['newStart'] ? <Problem problem={problem} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="action" disabled={busy}>
          {busy ? t.rescheduling : t.rescheduleSubmit}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t.cancelKeep}
        </Button>
      </div>
    </form>
  );
}

function CancelConfirm({
  session,
  onClose,
  onDone,
  onStale,
}: {
  session: Session;
  onClose: () => void;
  onDone: (session: Session) => void;
  onStale: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CleaningErrorView | null>(null);
  const submission = useRef(idempotentSubmission());

  async function cancel() {
    setBusy(true);
    setProblem(null);
    try {
      const updated = await cancelSession(session.id, submission.current.keyFor(session.id));
      submission.current.done();
      onDone(updated);
    } catch (error) {
      const view = describeCleaningError(error);
      if (view.code === 'CLEANING_IDEMPOTENCY_KEY_REUSED') submission.current.done();
      setProblem(view);
      if (view.code === 'CLEANING_INVALID_TRANSITION') onStale();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="group"
      aria-label={t.cancel}
      className="swap-in rounded-card border-line bg-surface-muted grid gap-4 border p-4 sm:p-6"
    >
      <p className="text-ink font-medium">{t.cancelEffect(formatDateTime(session.scheduledStart))}</p>
      {problem ? <Problem problem={problem} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" disabled={busy} onClick={() => void cancel()}>
          {busy ? t.cancelling : t.cancelConfirm}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          {t.cancelKeep}
        </Button>
      </div>
    </div>
  );
}
