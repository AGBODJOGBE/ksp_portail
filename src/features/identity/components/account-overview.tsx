'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { getDictionary } from '@/i18n';
import { ApiError, session, useSession } from '@/lib/api';
import { logout } from '@/features/identity/api';
import { describeError } from '@/features/identity/errors';

/** En-tête de « Mon espace KSP » : salutation, numéro de connexion et déconnexion. */
export function AccountOverview() {
  const t = getDictionary();
  const { replace } = useRouter();
  const current = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await logout();
    } catch (caught) {
      // 401 : la session était déjà close côté gateway ; sinon on garde la session pour réessayer.
      if (!(caught instanceof ApiError && caught.status === 401)) {
        setError(describeError(caught).message);
        setPending(false);
        return;
      }
    }
    replace('/');
    session.clear();
  }

  if (!current) return null;
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Heading as="h1" size="h1">
          {t.account.greeting(current.user.firstName)}
        </Heading>
        {current.user.phone ? (
          <p className="text-ink-muted mt-3">
            {t.account.phone} :{' '}
            <span className="text-ink font-medium tabular-nums">{current.user.phone}</span>
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:justify-items-end">
        <Button variant="secondary" onClick={signOut} aria-busy={pending || undefined}>
          {pending ? t.account.signingOut : t.account.signOut}
        </Button>
        <FormMessage>{error}</FormMessage>
      </div>
    </div>
  );
}
