'use client';

import { useEffect, useRef, useState } from 'react';
import { type Session, session, useSession } from '@/lib/api';
import type { OtpChallenge } from '@/features/identity/schemas';
import { CodeStep } from './code-step';
import { PhoneStep } from './phone-step';
import { ProfileForm } from './profile-form';

type Step = { name: 'phone'; phone?: string } | { name: 'code'; phone: string; challenge: OtpChallenge };

/**
 * Connexion par téléphone intégrée à une autre page (demande de devis du Nettoyage) : mêmes étapes que
 * `/connexion` (numéro, code, puis profil si le nom manque), sans changer de page, pour que la saisie
 * en cours ne soit pas perdue. La session ouverte est mise en mémoire ; la page qui l'accueille suit
 * `useSession()`. Titres en `h2` ou `h3` : la page garde son propre `h1`.
 */
export function InlineLogin({
  onDone,
  headingLevel = 'h2',
}: {
  onDone?: () => void;
  /** Niveau des titres des étapes, selon la page qui accueille la connexion. */
  headingLevel?: 'h2' | 'h3';
}) {
  const [step, setStep] = useState<Step>({ name: 'phone' });
  const current = useSession();
  const numberRef = useRef<HTMLInputElement>(null);
  const backToPhone = useRef(false);

  useEffect(() => {
    if (step.name === 'phone' && backToPhone.current) {
      backToPhone.current = false;
      numberRef.current?.focus();
    }
  }, [step]);

  function verified(opened: Session) {
    session.set(opened);
    if (!opened.profileIncomplete) onDone?.();
  }

  if (current?.profileIncomplete) {
    return <ProfileForm autoFocus headingLevel={headingLevel} onDone={onDone} />;
  }
  if (step.name === 'code') {
    return (
      <CodeStep
        headingLevel={headingLevel}
        phone={step.phone}
        challenge={step.challenge}
        onVerified={verified}
        onChangeNumber={() => {
          backToPhone.current = true;
          setStep({ name: 'phone', phone: step.phone });
        }}
      />
    );
  }
  return (
    <PhoneStep
      headingLevel={headingLevel}
      initialPhone={step.phone}
      numberRef={numberRef}
      onSent={(phone, challenge) => setStep({ name: 'code', phone, challenge })}
    />
  );
}
