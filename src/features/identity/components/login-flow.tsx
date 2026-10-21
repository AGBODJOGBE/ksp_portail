'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getDictionary } from '@/i18n';
import { type Session, session } from '@/lib/api';
import { RETURN_PARAM, safeReturnPath } from '@/features/identity/return-path';
import type { OtpChallenge } from '@/features/identity/schemas';
import { CodeStep } from './code-step';
import { PhoneStep } from './phone-step';
import { ProfileForm } from './profile-form';

type Step =
  | { name: 'checking' }
  | { name: 'phone'; phone?: string }
  | { name: 'code'; phone: string; challenge: OtpChallenge }
  | { name: 'profile' };

/**
 * Parcours de connexion par téléphone : numéro, code, puis profil si le nom manque ; ensuite retour
 * à la page demandée (`?retour=`, chemin interne uniquement).
 *
 * Au chargement, une session encore valide (cookie de renouvellement) est reprise sans rien demander.
 */
export function LoginFlow() {
  const t = getDictionary();
  const { replace } = useRouter();
  const returnPath = safeReturnPath(useSearchParams().get(RETURN_PARAM));
  const [step, setStep] = useState<Step>({ name: 'checking' });
  const numberRef = useRef<HTMLInputElement>(null);
  const backToPhone = useRef(false);

  useEffect(() => {
    let active = true;
    session.restore().then((result) => {
      if (!active) return;
      if (result.status !== 'authenticated') return setStep({ name: 'phone' });
      if (result.session.profileIncomplete) return setStep({ name: 'profile' });
      replace(returnPath);
    });
    return () => {
      active = false;
    };
  }, [replace, returnPath]);

  // Retour depuis l'écran du code : le focus revient sur le numéro à corriger.
  useEffect(() => {
    if (step.name === 'phone' && backToPhone.current) {
      backToPhone.current = false;
      numberRef.current?.focus();
    }
  }, [step]);

  function verified(opened: Session) {
    session.set(opened);
    if (opened.profileIncomplete) setStep({ name: 'profile' });
    else replace(returnPath);
  }

  switch (step.name) {
    case 'checking':
      return (
        <p role="status" className="text-ink-muted">
          {t.login.checking}
        </p>
      );
    case 'phone':
      return (
        <PhoneStep
          initialPhone={step.phone}
          numberRef={numberRef}
          onSent={(phone, challenge) => setStep({ name: 'code', phone, challenge })}
        />
      );
    case 'code':
      return (
        <CodeStep
          phone={step.phone}
          challenge={step.challenge}
          onVerified={verified}
          onChangeNumber={() => {
            backToPhone.current = true;
            setStep({ name: 'phone', phone: step.phone });
          }}
        />
      );
    case 'profile':
      return <ProfileForm autoFocus onDone={() => replace(returnPath)} />;
  }
}
