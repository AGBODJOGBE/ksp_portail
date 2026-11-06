'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { Heading } from '@/components/ui/heading';
import { ApiError, session, useSession } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { frenchSpacing } from '@/lib/typography';
import { useResource } from '@/lib/use-resource';
import { describeAccountError } from '@/features/identity/account-errors';
import { cancelAccountDeletion, getProfile, logout } from '@/features/identity/api';
import { loginHref } from '@/features/identity/return-path';
import type { CancelDeletionResponse } from '@/features/identity/schemas';
import { accountTexts, identityPaths } from '@/features/identity/texts';
import { ObstacleList } from './account-deletion';

const t = accountTexts.deletion;

/**
 * Session restreinte d'un compte en cours de suppression (ADR-036), affichée par la garde à la place de
 * toute page de l'espace : la gateway refuserait tout le reste (403). Date prévue lue dans
 * `GET /identity/me` (seule lecture permise), raisons d'un report, puis « Annuler la suppression »
 * (`DELETE /identity/me/deletion`, nouveau jeton complet) ou « Se déconnecter ».
 */
export function PendingDeletion() {
  const { replace } = useRouter();
  const current = useSession();
  const profile = useResource(useCallback(() => getProfile(), []));
  const [busy, setBusy] = useState<'cancel' | 'signOut' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<CancelDeletionResponse | null>(null);

  async function cancel() {
    if (busy) return;
    setBusy('cancel');
    setError(null);
    try {
      setRestored(await cancelAccountDeletion());
    } catch (caught) {
      setError(describeAccountError(caught).message);
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy('signOut');
    setError(null);
    try {
      await logout();
    } catch (caught) {
      // 401 : session déjà close côté gateway ; sinon on garde la session pour réessayer.
      if (!(caught instanceof ApiError && caught.status === 401)) {
        setError(describeAccountError(caught).message);
        setBusy(null);
        return;
      }
    }
    replace('/');
    session.clear();
  }

  // Annulée : le message est lu avant de rendre l'espace (le jeton complet remplace le jeton restreint).
  if (restored) {
    return (
      <div className="grid justify-items-start gap-5">
        <FormMessage tone="success">{t.cancelled}</FormMessage>
        <Button
          variant="action"
          autoFocus
          onClick={() => {
            if (current) session.set({ ...current, ...restored });
          }}
        >
          {t.continue}
        </Button>
      </div>
    );
  }

  const deletion = profile.state.status === 'ready' ? profile.state.data.deletion : null;
  const title = deletion
    ? t.pendingTitle(formatDate(deletion.scheduledFor))
    : profile.state.status === 'loading'
      ? null
      : t.pendingTitleUnknown;

  return (
    <div className="grid gap-6">
      <div className="grid justify-items-start gap-3">
        <Badge tone="danger" dot>
          {t.pendingEyebrow}
        </Badge>
        {title ? (
          <Heading as="h1" size="h2">
            {title}
          </Heading>
        ) : (
          <p role="status" className="text-ink-muted">
            {accountTexts.common.loading}
          </p>
        )}
        {profile.state.status === 'error' ? <p className="text-small text-ink-muted">{t.readError}</p> : null}
        <p className="text-ink-muted max-w-reading">{frenchSpacing(t.pendingText)}</p>
      </div>

      {deletion?.postponedBy.length ? (
        <section aria-labelledby="suppression-report" className="grid gap-2">
          <h2 id="suppression-report" className="font-display text-ink text-lg font-semibold">
            {t.postponedTitle}
          </h2>
          <p className="text-small text-ink-muted">{t.postponedText}</p>
          <ObstacleList obstacles={deletion.postponedBy} />
        </section>
      ) : null}

      <div className="rounded-card border-line bg-surface grid gap-4 border p-5 sm:p-6">
        <p className="text-ink">{frenchSpacing(t.pendingCancelHint)}</p>
        <FormMessage>{error}</FormMessage>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="action"
            onClick={cancel}
            disabled={!!busy}
            aria-busy={busy === 'cancel' || undefined}
          >
            {busy === 'cancel' ? t.cancelling : t.cancel}
          </Button>
          <Button
            variant="secondary"
            onClick={signOut}
            disabled={!!busy}
            aria-busy={busy === 'signOut' || undefined}
          >
            {busy === 'signOut' ? t.signingOut : t.signOut}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation après la demande de suppression : la gateway a fermé toutes les sessions, l'onglet n'a
 * plus de session. Date prévue et façon d'annuler (se reconnecter avant cette date).
 */
export function DeletionRequested({ scheduledFor }: { scheduledFor: string }) {
  return (
    <div className="grid justify-items-start gap-4">
      <Heading as="h1" size="h2">
        {t.requestedTitle(formatDate(scheduledFor))}
      </Heading>
      <p role="status" className="text-ink max-w-reading">
        {frenchSpacing(t.requestedText)}
      </p>
      <p className="text-ink-muted max-w-reading">{frenchSpacing(t.requestedCancel)}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/" variant="primary">
          {t.home}
        </ButtonLink>
        <ButtonLink href={loginHref(identityPaths.settings)} variant="secondary">
          {t.signInAgain}
        </ButtonLink>
      </div>
    </div>
  );
}
