'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { session, useSession } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { changeEmail, confirmEmail, getProfile } from '@/features/identity/api';
import { describeAccountError } from '@/features/identity/account-errors';
import { accountTexts } from '@/features/identity/texts';
import { EmailVerification } from './email-verification';
import { ProfileForm } from './profile-form';
import { Fact, Section } from './space-parts';

const t = accountTexts;

/**
 * « Mon profil » : nom (modifiable), numéro de connexion, e-mail vérifié ou en attente de son code
 * (ADR-026). Le profil est relu à l'ouverture pour connaître l'adresse en attente (`pendingEmail`).
 */
export function ProfileSpace() {
  const current = useSession();
  const profile = useResource(useCallback(() => getProfile(), []));
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null | undefined>(undefined);

  if (!current) return null;
  const { user } = current;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const pending =
    pendingEmail !== undefined
      ? pendingEmail
      : profile.state.status === 'ready'
        ? profile.state.data.pendingEmail
        : null;

  return (
    <div className="grid gap-8">
      <Section id="identite-titre" title={t.profile.identityTitle}>
        {editing ? (
          <ProfileForm
            mode="edit"
            autoFocus
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              setSaved(true);
            }}
          />
        ) : (
          <div className="grid gap-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label={t.profile.name} value={name || '—'} />
              <Fact label={t.profile.phone} value={user.phone ?? '—'} hint={t.profile.phoneHint} numeric />
            </dl>
            <FormMessage tone="info">{saved ? t.profile.nameSaved : null}</FormMessage>
            <Button
              variant="secondary"
              className="justify-self-start"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              {t.profile.editName}
            </Button>
          </div>
        )}
      </Section>

      <Section id="email-titre" title={t.email.title} lead={t.email.lead}>
        {profile.state.status === 'loading' ? (
          <p role="status" className="text-ink-muted">
            {t.common.loading}
          </p>
        ) : profile.state.status === 'error' ? (
          <div className="grid justify-items-start gap-3">
            <FormMessage>{describeAccountError(profile.state.error).message}</FormMessage>
            <Button variant="secondary" onClick={profile.reload}>
              {t.common.retry}
            </Button>
          </div>
        ) : (
          <EmailVerification
            id="profil-email"
            verified={user.emailVerified ? user.email : null}
            pending={pending}
            send={changeEmail}
            onPending={setPendingEmail}
            confirm={async (code) => {
              const next = await confirmEmail(code);
              session.updateProfile(next);
              setPendingEmail(next.pendingEmail);
              return next.user.email;
            }}
          />
        )}
      </Section>
    </div>
  );
}
