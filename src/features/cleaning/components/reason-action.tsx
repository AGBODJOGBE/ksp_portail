'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, inputClasses } from '@/components/ui/field';
import { cleaningTexts } from '@/features/cleaning/texts';

const t = cleaningTexts.common;

/**
 * Action à confirmer avec un motif facultatif (refuser un devis, annuler une demande ou une mission).
 * Le panneau s'ouvre sous le bouton ; l'erreur éventuelle est renvoyée par `onConfirm` (message).
 */
export function ReasonAction({
  label,
  title,
  confirmLabel,
  hint,
  onConfirm,
}: {
  label: string;
  title: string;
  confirmLabel: string;
  hint?: string;
  /** Renvoie un message d'erreur, ou `null` si l'action a réussi. */
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

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
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-titre`}
      className="rounded-card border-line bg-surface-muted grid gap-4 border p-5 sm:col-span-full"
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
          maxLength={500}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={inputClasses({ className: 'mt-1 py-3' })}
        />
      </div>
      <FormMessage>{error}</FormMessage>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" aria-busy={pending || undefined}>
          {pending ? t.sending : confirmLabel}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
