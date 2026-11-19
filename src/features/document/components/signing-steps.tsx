'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, FormMessage, TextField, fieldIds } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { formatTime, isPast } from '@/lib/format';
import { cleanSigningCode, describeDocumentError, isSigningCodeComplete } from '@/features/document/logic';
import type { CodeDelivery } from '@/features/document/schemas';
import { channelLabel, documentTexts as t } from '@/features/document/texts';
import { useCountdown } from './use-countdown';

const OPTION = cn(
  'flex min-h-14 cursor-pointer items-start gap-3 rounded-control border bg-surface p-4',
  'has-[:checked]:border-action has-[:checked]:bg-action-soft',
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
);

/**
 * Signature par code (ADR-044), commune au lien sans compte et à Mon espace : demander le code, puis le
 * saisir avec l'accord explicite (« J'ai lu le document et j'en accepte le contenu ») et signer. Le code
 * n'est gardé que dans le champ, vidé après chaque essai ; il n'est jamais journalisé ni stocké.
 * `codeExpiresAt` : un code déjà envoyé et encore valable ouvre directement la saisie.
 */
export function SigningSteps({
  idPrefix,
  phoneMasked,
  codeExpiresAt,
  requestCode,
  sign,
  onClosed,
}: {
  idPrefix: string;
  phoneMasked: string | null;
  codeExpiresAt: string | null;
  requestCode: () => Promise<CodeDelivery>;
  /** Signe ; rejette l'erreur de la gateway, que cet écran affiche. */
  sign: (code: string) => Promise<void>;
  /** Demande close entre-temps (signée, expirée, annulée) : l'écran parent relit son état. */
  onClosed: () => void;
}) {
  const stillValid = codeExpiresAt !== null && !isPast(codeExpiresAt);
  const [step, setStep] = useState<'intro' | 'code'>(stillValid ? 'code' : 'intro');
  const [delivery, setDelivery] = useState<CodeDelivery | null>(null);
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCodeNeeded, setNewCodeNeeded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState<'request' | 'sign' | null>(null);
  const resend = useCountdown();
  const codeRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const codeId = `${idPrefix}-code`;
  const consentId = `${idPrefix}-accord`;
  const sentId = `${idPrefix}-envoi`;

  // Code envoyé : le clavier numérique s'ouvre sur le champ (pas au premier affichage de la page).
  const [focusCode, setFocusCode] = useState(false);
  useEffect(() => {
    if (step === 'code' && focusCode) codeRef.current?.focus();
  }, [step, focusCode, delivery]);

  function fail(caught: unknown) {
    const view = describeDocumentError(caught);
    if (view.kind === 'closed') return onClosed();
    if (view.retryAfterSeconds) resend.start(view.retryAfterSeconds);
    if (view.kind === 'blocked') setBlocked(true);
    if (view.kind === 'code' || view.kind === 'newCode') {
      setCode('');
      setCodeError(view.message);
      if (view.kind === 'newCode') {
        setNewCodeNeeded(true);
        resend.start(0);
      }
      codeRef.current?.focus();
      return;
    }
    if (view.kind === 'consent') {
      setConsentError(view.message);
      consentRef.current?.focus();
      return;
    }
    setError(view.message);
  }

  async function request() {
    if (pending || resend.remaining > 0) return;
    setPending('request');
    setError(null);
    setCodeError(null);
    try {
      const sent = await requestCode();
      setDelivery(sent);
      setCode('');
      setNewCodeNeeded(false);
      resend.start(sent.resendAfterSeconds);
      setStep('code');
      setFocusCode(true);
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || newCodeNeeded || blocked) return;
    setError(null);
    setCodeError(null);
    setConsentError(null);
    if (!isSigningCodeComplete(code)) {
      setCodeError(t.codeIncomplete);
      codeRef.current?.focus();
      return;
    }
    if (!consent) {
      setConsentError(t.consentMissing);
      consentRef.current?.focus();
      return;
    }
    setPending('sign');
    try {
      await sign(code);
      setCode('');
    } catch (caught) {
      fail(caught);
    } finally {
      setPending(null);
    }
  }

  if (step === 'intro') {
    return (
      <div className="grid gap-4">
        <p className="text-ink-muted">{t.codeIntro(phoneMasked)}</p>
        <Button
          variant="action"
          size="lg"
          className="w-full"
          onClick={request}
          disabled={resend.remaining > 0 || blocked}
          aria-busy={pending === 'request' || undefined}
        >
          {pending === 'request'
            ? t.requesting
            : resend.remaining > 0
              ? t.resendIn(resend.remaining)
              : t.requestCode}
        </Button>
        <FormMessage>{error}</FormMessage>
      </div>
    );
  }

  const consentIds = fieldIds(consentId);
  const canResend = resend.remaining === 0;
  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <p id={sentId} className="text-ink-muted">
        {delivery
          ? t.codeSent(channelLabel(delivery.channel), formatTime(delivery.expiresAt))
          : codeExpiresAt
            ? t.codeStillValid(formatTime(codeExpiresAt))
            : null}
      </p>
      <TextField
        id={codeId}
        inputRef={codeRef}
        label={t.codeLabel}
        hint={t.codeHint}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(cleanSigningCode(event.target.value))}
        aria-describedby={sentId}
        error={codeError}
        inputClassName="max-w-56 text-center text-xl tracking-[0.3em] tabular-nums"
      />
      <div>
        <label
          className={cn(OPTION, consentError ? 'border-danger bg-danger-soft' : 'border-line-strong')}
          htmlFor={consentId}
        >
          <input
            ref={consentRef}
            id={consentId}
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? consentIds.error : undefined}
            className="accent-action mt-0.5 size-5 shrink-0 focus-visible:outline-none"
          />
          <span className="text-ink font-medium">{t.consent}</span>
        </label>
        {consentError ? <FieldError id={consentIds.error}>{consentError}</FieldError> : null}
      </div>
      <FormMessage>{error}</FormMessage>
      <div className="grid gap-3">
        <Button
          type="submit"
          variant="action"
          size="lg"
          className="w-full"
          disabled={newCodeNeeded || blocked}
          aria-busy={pending === 'sign' || undefined}
        >
          {pending === 'sign' ? t.signing : t.sign}
        </Button>
        <Button
          variant={newCodeNeeded ? 'primary' : 'secondary'}
          size="lg"
          className="w-full"
          onClick={request}
          disabled={!canResend || blocked}
          aria-busy={pending === 'request' || undefined}
        >
          {pending === 'request' ? t.requesting : canResend ? t.resend : t.resendIn(resend.remaining)}
        </Button>
      </div>
    </form>
  );
}
