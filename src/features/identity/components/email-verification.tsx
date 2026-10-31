'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { getDictionary } from '@/i18n';
import { describeAccountError } from '@/features/identity/account-errors';
import { useCountdown } from '@/features/identity/countdown';
import { cleanCode, isCodeComplete } from '@/features/identity/phone';
import type { EmailChallenge } from '@/features/identity/schemas';
import { accountTexts } from '@/features/identity/texts';

const t = accountTexts.email;

/** Contrôle de forme seulement (le format exact est vérifié par identity) : `x@y.z`, sans espace. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step =
  { name: 'idle' } | { name: 'email' } | { name: 'code'; email: string; challenge: EmailChallenge | null };

/**
 * Adresse e-mail confirmée par code (ADR-026), pour le profil comme pour la facturation d'une entreprise
 * (ADR-027, 028) : état (vérifiée, en attente, aucune), saisie de l'adresse, puis du code reçu par e-mail.
 * L'adresse n'est enregistrée qu'à la confirmation ; jusque-là, l'ancienne reste celle du compte.
 */
export function EmailVerification({
  id,
  verified,
  pending,
  send,
  confirm,
  onConfirmed,
  onPending,
  disabledReason,
}: {
  /** Préfixe des identifiants des champs. */
  id: string;
  /** Adresse vérifiée, ou `null`. */
  verified: string | null;
  /** Adresse en attente de son code (code envoyé, encore valable), ou `null`. */
  pending: string | null;
  send: (email: string) => Promise<EmailChallenge>;
  /** Confirme le code ; renvoie l'adresse désormais vérifiée. */
  confirm: (code: string) => Promise<string | null>;
  onConfirmed?: (email: string | null) => void;
  /** Code envoyé : l'adresse est désormais en attente de confirmation. */
  onPending?: (email: string) => void;
  /** Changement impossible (droits, compte fermé) : l'état reste affiché, sans action. */
  disabledReason?: string;
}) {
  const [step, setStep] = useState<Step>({ name: 'idle' });
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      <EmailStatus verified={verified} pending={step.name === 'idle' ? pending : null} />
      <FormMessage tone="info">{notice}</FormMessage>
      {disabledReason ? (
        <p className="text-small text-ink-muted">{disabledReason}</p>
      ) : step.name === 'idle' ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {pending ? (
            <Button onClick={() => setStep({ name: 'code', email: pending, challenge: null })}>
              {t.enterCode}
            </Button>
          ) : null}
          <Button
            variant={pending ? 'secondary' : 'primary'}
            onClick={() => {
              setNotice(null);
              setStep({ name: 'email' });
            }}
          >
            {verified || pending ? t.change : t.declare}
          </Button>
        </div>
      ) : step.name === 'email' ? (
        <EmailForm
          id={id}
          initial={pending ?? ''}
          send={send}
          onCancel={() => setStep({ name: 'idle' })}
          onSent={(email, challenge) => {
            onPending?.(email);
            setStep({ name: 'code', email, challenge });
          }}
        />
      ) : (
        <CodeForm
          id={id}
          email={step.email}
          challenge={step.challenge}
          send={send}
          confirm={confirm}
          onOtherAddress={() => setStep({ name: 'email' })}
          onCancel={() => setStep({ name: 'idle' })}
          onConfirmed={(email) => {
            setStep({ name: 'idle' });
            setNotice(email ? t.confirmed(email) : null);
            onConfirmed?.(email);
          }}
        />
      )}
    </div>
  );
}

function EmailStatus({ verified, pending }: { verified: string | null; pending: string | null }) {
  return (
    <div className="grid gap-2">
      {verified ? (
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-ink font-semibold break-all">{verified}</span>
          <Badge tone="success">{t.verified}</Badge>
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted">{t.none}</span>
          {pending ? <Badge tone="warning">{t.unverified}</Badge> : null}
        </p>
      )}
      {pending ? (
        <div className="text-small">
          <p className="text-ink font-medium break-all">{t.pending(pending)}</p>
          <p className="text-ink-muted mt-1">{t.pendingHint}</p>
        </div>
      ) : null}
    </div>
  );
}

function EmailForm({
  id,
  initial,
  send,
  onSent,
  onCancel,
}: {
  id: string;
  initial: string;
  send: (email: string) => Promise<EmailChallenge>;
  onSent: (email: string, challenge: EmailChallenge) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(initial);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wait = useCountdown();
  const inputRef = useRef<HTMLInputElement>(null);
  const blocked = wait.remaining > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function invalid(message: string) {
    setFieldError(message);
    inputRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || blocked) return;
    setError(null);
    setFieldError(null);
    const value = email.trim();
    if (!value) return invalid(t.required);
    if (!EMAIL.test(value)) return invalid(t.invalid);
    setBusy(true);
    try {
      const challenge = await send(value);
      onSent(challenge.pendingEmail, challenge);
    } catch (caught) {
      const view = describeAccountError(caught);
      if (view.retryAfterSeconds) wait.start(view.retryAfterSeconds);
      if (view.field === 'email') invalid(view.message);
      else setError(view.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <TextField
        id={`${id}-adresse`}
        inputRef={inputRef}
        label={t.field}
        hint={t.fieldHint}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldError}
      />
      <FormMessage>{error}</FormMessage>
      {blocked ? (
        <p className="text-small text-ink-muted -mt-2">
          {getDictionary().login.retryIn(getDictionary().login.delay(wait.remaining))}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={blocked} aria-busy={busy || undefined}>
          {busy ? t.sending : t.send}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

function CodeForm({
  id,
  email,
  challenge: initialChallenge,
  send,
  confirm,
  onConfirmed,
  onOtherAddress,
  onCancel,
}: {
  id: string;
  email: string;
  /** `null` : code envoyé lors d'une visite précédente (adresse en attente), délai inconnu. */
  challenge: EmailChallenge | null;
  send: (email: string) => Promise<EmailChallenge>;
  confirm: (code: string) => Promise<string | null>;
  onConfirmed: (email: string | null) => void;
  onOtherAddress: () => void;
  onCancel: () => void;
}) {
  const login = getDictionary().login;
  const [challenge, setChallenge] = useState(initialChallenge);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [newCodeNeeded, setNewCodeNeeded] = useState(false);
  const [busy, setBusy] = useState<'confirm' | 'resend' | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const resend = useCountdown();
  const { start } = resend;
  const codeId = `${id}-code`;
  const sentId = `${codeId}-envoi`;

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialChallenge) start(initialChallenge.resendAfterSeconds);
  }, [initialChallenge, start]);

  function fail(caught: unknown) {
    const view = describeAccountError(caught);
    if (view.retryAfterSeconds) resend.start(view.retryAfterSeconds);
    if (view.newCodeNeeded) {
      setNewCodeNeeded(true);
      resend.start(0);
    }
    if (view.field === 'code') {
      setCodeError(view.message);
      setCode('');
      codeRef.current?.focus();
    } else {
      setError(view.message);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || newCodeNeeded) return;
    setError(null);
    setInfo(null);
    setCodeError(null);
    if (!isCodeComplete(code)) {
      setCodeError(t.codeInvalid);
      codeRef.current?.focus();
      return;
    }
    setBusy('confirm');
    try {
      onConfirmed(await confirm(code));
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(null);
    }
  }

  async function sendAgain() {
    if (busy || resend.remaining > 0) return;
    setError(null);
    setInfo(null);
    setCodeError(null);
    setBusy('resend');
    try {
      const next = await send(email);
      setChallenge(next);
      setCode('');
      setNewCodeNeeded(false);
      resend.start(next.resendAfterSeconds);
      setInfo(t.resent);
      codeRef.current?.focus();
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(null);
    }
  }

  const canResend = resend.remaining === 0;
  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <p id={sentId} className="text-ink-muted break-words">
        {challenge
          ? `${t.codeSent(email)} ${t.codeValidity(Math.max(1, Math.round(challenge.expiresInSeconds / 60)))}`
          : t.codeSent(email)}
      </p>
      <TextField
        id={codeId}
        inputRef={codeRef}
        label={t.codeLabel}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={8}
        value={code}
        onChange={(event) => setCode(cleanCode(event.target.value))}
        aria-describedby={sentId}
        error={codeError}
        inputClassName="max-w-56 text-center text-xl tracking-[0.3em] tabular-nums"
      />
      <FormMessage>{error}</FormMessage>
      <FormMessage tone="info">{info}</FormMessage>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="submit" disabled={newCodeNeeded} aria-busy={busy === 'confirm' || undefined}>
          {busy === 'confirm' ? t.confirming : t.confirm}
        </Button>
        <Button
          variant={newCodeNeeded ? 'primary' : 'secondary'}
          onClick={sendAgain}
          disabled={!canResend}
          aria-busy={busy === 'resend' || undefined}
        >
          {canResend ? t.resend : t.resendIn(login.delay(resend.remaining))}
        </Button>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
        <Button variant="ghost" onClick={onOtherAddress} className="justify-self-start">
          {t.otherAddress}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="justify-self-start">
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
