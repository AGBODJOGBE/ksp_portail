'use client';

import { type FormEvent, type Ref, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage, TextField } from '@/components/ui/field';
import { IconAlert, IconRecouvrement } from '@/components/ui/icons';
import {
  LinkSheet,
  LinkSheetEyebrow,
  LinkSheetFacts,
  LinkSheetOutcome,
  LinkSheetSection,
} from '@/components/ui/link-sheet';
import { formatDateTime, formatTime } from '@/lib/format';
import { useCountdown } from '@/lib/use-countdown';
import { cleanDebtorCode, describeDebtorError, isDebtorCodeComplete } from '@/features/recovery/debtor';
import { sendDebtorCode, verifyDebtorCode } from '@/features/recovery/debtor-api';
import type { DebtorAccess, DebtorCodeSent, DebtorSession } from '@/features/recovery/debtor-schemas';
import { codeChannelLabel, debtorTexts as t } from '@/features/recovery/debtor-texts';
import { useFocusOnMount } from './debtor-parts';

/** Coordonnée masquée affichée d'un bloc : « +229 •• •• 45 » ne se coupe pas en fin de ligne. */
const unbreakable = (value: string) => value.replace(/ /g, '\u00a0');

/** En-tête commun des écrans d'accès : qui contacte, pour le compte de qui. */
function GateHead({
  access,
  title,
  titleRef,
}: {
  access: DebtorAccess;
  title: string;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="grid gap-4">
      <LinkSheetEyebrow>{t.eyebrow}</LinkSheetEyebrow>
      <h1
        id="debiteur-titre"
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-h2 text-ink font-bold focus:outline-none"
      >
        {title}
      </h1>
      <p className="text-ink text-lg">
        {access.creditorName ? (
          <>
            {t.contactFor} <strong className="font-semibold">{access.creditorName}</strong>.
          </>
        ) : (
          t.contactForUnknown
        )}
      </p>
    </div>
  );
}

/**
 * Accès au dossier (ADR-061) : D1 accueil (créancier, coordonnée masquée, validité du lien, « Recevoir mon
 * code »), puis D2 code (6 chiffres, essais restants, renvoi avec compte à rebours, blocage d'une heure).
 * Le code n'est gardé que dans le champ, vidé après chaque essai ; la session reçue est remise à l'écran
 * parent, qui la garde en mémoire. `notice` : session terminée, l'écran s'ouvre sur la demande d'un code.
 */
export function DebtorGate({
  token,
  access,
  notice,
  onOpened,
  onInvalid,
}: {
  token: string;
  access: DebtorAccess;
  /** Message affiché en tête (session expirée ou fermée) : l'écran s'ouvre sur la demande d'un nouveau code. */
  notice: string | null;
  onOpened: (session: DebtorSession) => void;
  onInvalid: () => void;
}) {
  const [step, setStep] = useState<'welcome' | 'code'>(notice ? 'code' : 'welcome');
  const [sent, setSent] = useState<DebtorCodeSent | null>(null);
  const [alreadySent, setAlreadySent] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [pending, setPending] = useState<'request' | 'verify' | null>(null);
  const wait = useCountdown();
  const codeRef = useRef<HTMLInputElement>(null);
  const [focusCode, setFocusCode] = useState(false);
  const titleRef = useFocusOnMount<HTMLHeadingElement>(notice !== null);

  // Blocage levé à la fin du compte à rebours : une nouvelle demande de code est possible.
  const locked = lockedUntil !== null && wait.remaining > 0;

  // Code envoyé : le clavier numérique s'ouvre sur le champ (pas au premier affichage de la page).
  useEffect(() => {
    if (step === 'code' && focusCode) codeRef.current?.focus();
  }, [step, focusCode, sent, alreadySent]);

  function lock(retryAfterSeconds: number | undefined) {
    const seconds = retryAfterSeconds ?? 3600;
    setLockedUntil(new Date(Date.now() + seconds * 1000).toISOString());
    wait.start(seconds);
    setCode('');
    setCodeError(null);
    setError(null);
  }

  async function request() {
    if (pending || wait.remaining > 0) return;
    setPending('request');
    setError(null);
    setCodeError(null);
    try {
      const delivery = await sendDebtorCode(token);
      setSent(delivery);
      setAlreadySent(false);
      setLockedUntil(null);
      setCode('');
      wait.start(delivery.retryAfterSeconds);
      setStep('code');
      setFocusCode(true);
    } catch (caught) {
      const view = describeDebtorError(caught);
      if (view.kind === 'linkInvalid') return onInvalid();
      if (view.kind === 'locked') {
        lock(view.retryAfterSeconds);
        setStep('code');
        return;
      }
      if (view.kind === 'wait') wait.start(view.retryAfterSeconds ?? 60);
      if (view.code === 'RECOVERY_DEBTOR_CODE_TOO_SOON' && !sent) {
        // Un code est déjà parti il y a moins d'une minute (page rouverte) : il reste valable.
        setAlreadySent(true);
        setStep('code');
        setFocusCode(true);
        return;
      }
      setError(view.message);
    } finally {
      setPending(null);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || locked) return;
    setError(null);
    setCodeError(null);
    if (!isDebtorCodeComplete(code)) {
      setCodeError(t.codeIncomplete);
      codeRef.current?.focus();
      return;
    }
    setPending('verify');
    try {
      const session = await verifyDebtorCode(token, code);
      setCode('');
      onOpened(session);
    } catch (caught) {
      setCode('');
      const view = describeDebtorError(caught);
      if (view.kind === 'linkInvalid') return onInvalid();
      if (view.kind === 'locked') return lock(view.retryAfterSeconds);
      if (view.kind === 'code' || view.kind === 'codeExpired' || view.kind === 'fields') {
        setCodeError(view.kind === 'fields' ? t.codeIncomplete : view.message);
        if (view.kind === 'codeExpired') wait.start(0);
        codeRef.current?.focus();
        return;
      }
      if (view.kind === 'wait') wait.start(view.retryAfterSeconds ?? 60);
      setError(view.message);
    } finally {
      setPending(null);
    }
  }

  if (step === 'welcome') {
    return (
      <LinkSheet labelledBy="debiteur-titre" head={<GateHead access={access} title={t.title} />}>
        <LinkSheetSection>
          <p className="text-ink-muted">{t.welcomeLead}</p>
          <LinkSheetFacts
            rows={[
              [t.codeTo, unbreakable(access.phoneMasked)],
              [t.linkValidUntil, formatDateTime(access.linkExpiresAt)],
            ]}
          />
        </LinkSheetSection>
        <LinkSheetSection className="pb-8">
          <Button
            variant="action"
            size="lg"
            className="w-full"
            onClick={request}
            disabled={wait.remaining > 0}
            aria-busy={pending === 'request' || undefined}
          >
            {pending === 'request'
              ? t.requesting
              : wait.remaining > 0
                ? t.resendIn(wait.remaining)
                : t.requestCode}
          </Button>
          <FormMessage>{error}</FormMessage>
          <p className="text-small text-ink-muted flex items-start gap-2">
            <IconRecouvrement className="text-brand-ink mt-0.5 size-4 shrink-0" />
            {t.disagree}
          </p>
        </LinkSheetSection>
      </LinkSheet>
    );
  }

  const canResend = wait.remaining === 0;
  const resendLabel =
    pending === 'request' ? t.requesting : canResend ? t.resend : t.resendIn(wait.remaining);
  const codeKnown = sent !== null || alreadySent;
  const masked = unbreakable(access.phoneMasked);
  const sentText = sent
    ? t.codeSent(codeChannelLabel(sent.channel), masked, formatTime(sent.codeExpiresAt))
    : alreadySent
      ? t.codeAlreadySent(masked)
      : null;

  return (
    <LinkSheet
      labelledBy="debiteur-titre"
      head={<GateHead access={access} title={t.codeTitle} titleRef={titleRef} />}
    >
      <LinkSheetSection className="pb-8">
        <FormMessage tone="info">{notice}</FormMessage>
        {locked && lockedUntil ? (
          // Blocage : seulement l'heure de fin ; la demande d'un code revient d'elle-même ensuite.
          <LinkSheetOutcome tone="warning" icon={<IconAlert className="size-6" />} title={t.lockedTitle}>
            <p>{t.lockedText(formatTime(lockedUntil))}</p>
          </LinkSheetOutcome>
        ) : codeKnown ? (
          <form noValidate onSubmit={verify} className="grid gap-5">
            <p id="debiteur-envoi" className="text-ink-muted">
              {sentText}
            </p>
            <TextField
              id="debiteur-code"
              inputRef={codeRef}
              label={t.codeLabel}
              hint={t.codeHint}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(cleanDebtorCode(event.target.value))}
              aria-describedby="debiteur-envoi"
              error={codeError}
              inputClassName="max-w-56 text-center text-xl tracking-[0.3em] tabular-nums"
            />
            <FormMessage>{error}</FormMessage>
            <div className="grid gap-3">
              <Button
                type="submit"
                variant="action"
                size="lg"
                className="w-full"
                aria-busy={pending === 'verify' || undefined}
              >
                {pending === 'verify' ? t.verifying : t.verify}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={request}
                disabled={!canResend}
                aria-busy={pending === 'request' || undefined}
              >
                {resendLabel}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4">
            <LinkSheetFacts rows={[[t.codeTo, masked]]} />
            <Button
              variant="action"
              size="lg"
              className="w-full"
              onClick={request}
              disabled={!canResend}
              aria-busy={pending === 'request' || undefined}
            >
              {resendLabel}
            </Button>
            <FormMessage>{error}</FormMessage>
          </div>
        )}
      </LinkSheetSection>
    </LinkSheet>
  );
}
