'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, inputClasses } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { cleaningTexts } from '@/features/cleaning/texts';

const t = cleaningTexts.common;
/** `CleaningOptionalReasonRequest.reason` : 500 caractères au plus (contrat). */
export const MAX_REASON = 500;

/**
 * Action à confirmer avec un motif facultatif (refuser un devis, annuler une demande ou une mission).
 * Le panneau s'ouvre sous le bouton ; l'erreur éventuelle est renvoyée par `onConfirm` (message).
 * `tone="danger"` : action qui clôt le dossier (bouton et panneau en rouge discret).
 */
export function ReasonAction({
  label,
  title,
  confirmLabel,
  hint,
  tone = 'default',
  onConfirm,
}: {
  label: string;
  title: string;
  confirmLabel: string;
  hint?: string;
  tone?: 'default' | 'danger';
  /** Renvoie un message d'erreur, ou `null` si l'action a réussi. */
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const danger = tone === 'danger';

  useEffect(() => {
    if (open) fieldRef.current?.focus();
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const message = await onConfirm(reason);
    setPending(false);
    if (message) setError(message);
    else setOpen(false);
  }

  if (!open) {
    return (
      <Button
        variant={danger ? 'danger' : 'secondary'}
        size={danger ? 'md' : 'lg'}
        className={cn(danger && '-ml-3')}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
    );
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-titre`}
      className={cn(
        'rounded-card grid w-full gap-4 border p-5',
        danger ? 'border-danger/40 bg-danger-soft' : 'border-line bg-surface-muted',
      )}
    >
      <p id={`${id}-titre`} className="text-ink font-semibold">
        {title}
      </p>
      {hint ? <p className="text-small text-ink-muted">{hint}</p> : null}
      <div>
        <label htmlFor={`${id}-motif`} className="text-small text-ink font-semibold">
          {t.reasonLabel}
        </label>
        <textarea
          id={`${id}-motif`}
          ref={fieldRef}
          maxLength={MAX_REASON}
          rows={3}
          value={reason}
          aria-describedby={`${id}-compte`}
          onChange={(event) => setReason(event.target.value)}
          className={inputClasses({ className: 'mt-1 py-3' })}
        />
        <p id={`${id}-compte`} className="text-small text-ink-subtle mt-1 text-right tabular-nums">
          {t.reasonCount(reason.length, MAX_REASON)}
        </p>
      </div>
      <FormMessage>{error}</FormMessage>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" aria-busy={pending || undefined} disabled={pending}>
          {pending ? t.sending : confirmLabel}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
