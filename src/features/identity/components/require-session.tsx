'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { ButtonLink, Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { navigation } from '@/config/navigation';
import { getDictionary } from '@/i18n';
import { session, useSession } from '@/lib/api';
import { describeError } from '@/features/identity/errors';
import { loginHref } from '@/features/identity/return-path';
import { ProfileForm } from './profile-form';

type Phase = 'checking' | 'unavailable' | 'ready';

/** Page demandée, recherche comprise, pour y revenir après la connexion. */
function currentPath(pathname: string): string {
  return typeof window === 'undefined' ? pathname : `${pathname}${window.location.search}`;
}

/**
 * Garde des pages connectées. Au chargement : session en mémoire, sinon renouvellement silencieux
 * (cookie posé par la gateway). Sans session : direction la connexion, avec retour ici ensuite.
 * Profil incomplet : « Compléter mon profil » avant tout le reste. Le backend reste seul juge des
 * droits : cette garde n'évite que d'afficher un espace vide.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const t = getDictionary();
  const { replace } = useRouter();
  const pathname = usePathname();
  const current = useSession();
  const [phase, setPhase] = useState<Phase>('checking');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    session.restore().then((result) => {
      if (!active) return;
      if (result.status === 'anonymous') {
        replace(loginHref(currentPath(pathname)));
      } else if (result.status === 'unavailable') {
        setError(describeError(result.error).message);
        setPhase('unavailable');
      } else {
        setPhase('ready');
      }
    });
    return () => {
      active = false;
    };
  }, [attempt, pathname, replace]);

  if (current) {
    return current.profileIncomplete ? <ProfileForm autoFocus /> : <>{children}</>;
  }

  if (phase === 'unavailable') {
    return (
      <div className="grid justify-items-start gap-5">
        <FormMessage>{`${t.account.unavailable} ${error ?? ''}`.trim()}</FormMessage>
        <Button
          onClick={() => {
            setPhase('checking');
            setAttempt((value) => value + 1);
          }}
        >
          {t.common.retry}
        </Button>
      </div>
    );
  }

  // Session terminée pendant la visite (déconnexion ailleurs, renouvellement refusé).
  if (phase === 'ready') {
    return (
      <div>
        <Heading as="h1" size="h2">
          {t.account.endedTitle}
        </Heading>
        <p className="text-ink-muted mt-3">{t.account.endedText}</p>
        <ButtonLink href={loginHref(currentPath(pathname))} className="mt-6">
          {navigation.login.label}
        </ButtonLink>
      </div>
    );
  }

  return (
    <p role="status" className="text-ink-muted">
      {t.account.loading}
    </p>
  );
}
