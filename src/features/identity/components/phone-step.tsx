'use client';

import { type FormEvent, type RefObject, useState } from 'react';
import { IconAlert, IconArrowRight, IconChevronRight } from '@/components/ui/icons';
import { Button, ButtonArrow } from '@/components/ui/button';
import { fieldIds, FieldError, FormMessage, inputClasses } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { cn } from '@/lib/cn';
import { getDictionary } from '@/i18n';
import { requestOtp } from '@/features/identity/api';
import { useCountdown } from '@/features/identity/countdown';
import { describeError } from '@/features/identity/errors';
import { DEFAULT_COUNTRY_CODE, toE164 } from '@/features/identity/phone';
import type { OtpChallenge } from '@/features/identity/schemas';
import { LoginCardHeader } from './login-card-header';

const PHONE_ID = 'connexion-numero';

/** Étape 1 : numéro de téléphone (indicatif +229 par défaut, tout pays accepté), puis demande du code. */
export function PhoneStep({
  initialPhone,
  numberRef,
  onSent,
  headingLevel = 'h1',
  layout = 'inline',
}: {
  /** `h2` quand l'étape est intégrée à une autre page (demande de devis du Nettoyage). */
  headingLevel?: 'h1' | 'h2' | 'h3';
  /** `card` : carte de la page de connexion (avatar, titre centré, grand bouton or) ; `inline` : intégrée. */
  layout?: 'card' | 'inline';
  /** Numéro déjà saisi (retour depuis l'écran du code) : on repart de l'indicatif par défaut. */
  initialPhone?: string;
  numberRef: RefObject<HTMLInputElement | null>;
  onSent: (phone: string, challenge: OtpChallenge) => void;
}) {
  const t = getDictionary();
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [number, setNumber] = useState(initialPhone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const wait = useCountdown();
  const ids = fieldIds(PHONE_ID);
  const blocked = wait.remaining > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || blocked) return;
    setError(null);
    setPhoneError(null);
    const phone = toE164(countryCode, number);
    if (!phone) {
      setPhoneError(t.login.phoneInvalid);
      numberRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      onSent(phone, await requestOtp(phone));
    } catch (caught) {
      const view = describeError(caught);
      if (view.retryAfterSeconds) wait.start(view.retryAfterSeconds);
      if (view.field === 'phone') {
        setPhoneError(view.message);
        numberRef.current?.focus();
      } else {
        setError(view.message);
      }
    } finally {
      setPending(false);
    }
  }

  const describedBy = [ids.hint, phoneError ? ids.error : null].filter(Boolean).join(' ');
  const card = layout === 'card';

  return (
    <section aria-labelledby="connexion-titre">
      {card ? (
        <LoginCardHeader id="connexion-titre" as={headingLevel} title={t.login.cardTitle}>
          {t.login.cardSubtitle}
        </LoginCardHeader>
      ) : (
        <Heading as={headingLevel} size="h2" id="connexion-titre">
          {t.login.title}
        </Heading>
      )}
      <p className={cn('text-ink-muted', card ? 'text-small mt-6' : 'mt-3')}>{t.login.intro}</p>
      <p className={cn('text-ink mt-2 font-medium', card && 'text-small')}>{t.login.newAccount}</p>
      <form noValidate onSubmit={submit} className={cn('grid gap-5', card ? 'mt-6' : 'mt-8')}>
        <fieldset>
          <legend className={cn('text-ink', card ? 'font-display text-lg font-bold' : 'font-semibold')}>
            {t.login.phoneLegend}
          </legend>
          <p id={ids.hint} className="text-small text-ink-muted mt-1">
            {t.login.phoneHint}
          </p>
          <div className="mt-2 flex gap-2">
            <div className="w-24 shrink-0">
              <label htmlFor="connexion-indicatif" className="sr-only">
                {t.login.countryCode}
              </label>
              <input
                id="connexion-indicatif"
                type="tel"
                inputMode="tel"
                autoComplete="tel-country-code"
                maxLength={6}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={describedBy}
                className={inputClasses({ invalid: !!phoneError, className: 'text-center tabular-nums' })}
              />
            </div>
            <div className="relative min-w-0 flex-1">
              <label htmlFor={PHONE_ID} className="sr-only">
                {t.login.phoneNumber}
              </label>
              <input
                id={PHONE_ID}
                ref={numberRef}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                maxLength={20}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={describedBy}
                className={inputClasses({ invalid: !!phoneError, className: 'tabular-nums' })}
              />
              {phoneError ? (
                <IconAlert className="text-danger pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
              ) : null}
            </div>
          </div>
          {phoneError ? <FieldError id={ids.error}>{phoneError}</FieldError> : null}
        </fieldset>
        <FormMessage>{error}</FormMessage>
        {/* Hors de la zone d'alerte : le décompte change chaque seconde et ne doit pas être relu. */}
        {blocked ? (
          <p className="text-small text-ink-muted -mt-2">{t.login.retryIn(t.login.delay(wait.remaining))}</p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          variant={card ? 'accent' : 'primary'}
          className={card ? 'w-full' : 'w-full sm:w-auto'}
          disabled={blocked}
          aria-busy={pending || undefined}
        >
          {pending ? t.login.sending : t.login.sendCode}
          <ButtonArrow>{card ? <IconChevronRight /> : <IconArrowRight />}</ButtonArrow>
        </Button>
      </form>
    </section>
  );
}
