'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { ButtonLink, Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { Skeleton } from '@/components/ui/skeleton';
import { navigation } from '@/config/navigation';
import { getDictionary } from '@/i18n';
import { isDeletionPending, session, useSession } from '@/lib/api';
import { deletionNotice } from '@/features/identity/deletion-notice';
import { describeError } from '@/features/identity/errors';
import { loginHref } from '@/features/identity/return-path';
import { DeletionRequested, PendingDeletion } from './lazy';
import { ProfileForm } from './profile-form';

type Phase = 'checking' | 'unavailable' | 'ready';

/** Page demandée, recherche comprise, pour y revenir après la connexion. */
function currentPath(pathname: string): string {
  return typeof window === 'undefined' ? pathname : `${pathname}${window.location.search}`;
}

/**
 * Garde des pages connectées. Au chargement : session en mémoire, sinon renouvellement silencieux
 * (cookie posé par la gateway). Sans session : direction la connexion, avec retour ici ensuite.
 * Profil incomplet : « Compléter mon profil » avant tout le reste. Compte en cours de suppression
 * (session restreinte, ADR-036) : l'écran de la suppression prévue, à la place de toute page (la gateway
 * refuserait ses appels). Le backend reste seul juge des droits : cette garde n'évite que d'afficher un
 * espace vide ou en erreur.
 */
export function RequireSession({
  children,
  fallbackClassName,
}: {
  children: ReactNode;
  /**
   * Cadre des écrans de la garde (attente, erreur, profil à compléter…) quand la page place ses
   * propres blocs pleine largeur (bande héros) : la garde y reprend les marges de la page.
   */
  fallbackClassName?: string;
}) {
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

  const frame = (node: ReactNode) =>
    fallbackClassName ? <div className={fallbackClassName}>{node}</div> : node;

  if (current) {
    if (isDeletionPending(current)) return frame(<PendingDeletion />);
    return current.profileIncomplete ? frame(<ProfileForm autoFocus />) : <>{children}</>;
  }

  if (phase === 'unavailable') {
    return frame(
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
      </div>,
    );
  }

  // Session terminée pendant la visite : suppression du compte demandée ici, ou déconnexion ailleurs.
  if (phase === 'ready') {
    const scheduledFor = deletionNotice.get();
    if (scheduledFor) return frame(<DeletionRequested scheduledFor={scheduledFor} />);
    return frame(
      <div>
        <Heading as="h1" size="h2">
          {t.account.endedTitle}
        </Heading>
        <p className="text-ink-muted mt-3">{t.account.endedText}</p>
        <ButtonLink href={loginHref(currentPath(pathname))} className="mt-6">
          {navigation.login.label}
        </ButtonLink>
      </div>,
    );
  }

  // Attente de la session : squelette de l'en-tête et d'un panneau, annoncé une seule fois.
  return frame(
    <div role="status" className="grid gap-4">
      <span className="sr-only">{t.account.loading}</span>
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="rounded-card mt-4 h-28 w-full" />
    </div>,
  );
}
